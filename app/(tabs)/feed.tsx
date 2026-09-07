// 경로: app/(tabs)/feed.tsx
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Path, Svg } from 'react-native-svg';
import ShareModal from '../../src/components/ShareModal';
import { savePinToFirestore, unsavePinFromFirestore } from '../../src/api/savedPlaces';
import { savePostToFirestore, unsavePostFromFirestore } from '../../src/api/savedPosts';
import {
  FirestorePost,
  deletePost,
  formatTimeAgo,
  incrementShareCount,
  subscribeFeedPosts,
  subscribeComments,
  toggleLike as toggleLikeFS,
} from '../../src/api/posts';
import { useAuthStore } from '../../src/store/authStore';
import { PlaceResult, useMapStore } from '../../src/store/mapStore';
import { usePostStore } from '../../src/store/postStore';

// ── LassoIcon (Lucide lasso path, react-native-svg) ───────────────────────────

function LassoIcon({ size = 19, color = '#1A1108' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M7 22a5 5 0 0 1-2-4" />
      <Path d="M3.3 14A6.8 6.8 0 0 1 2 10c0-4.4 4.5-8 10-8s10 3.6 10 8-4.5 8-10 8a12 12 0 0 1-5-1" />
      <Path d="M5 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
    </Svg>
  );
}

// ── PostCard ───────────────────────────────────────────────────────────────────

function PostCard({
  post,
  onShare,
  onDelete,
}: {
  post: FirestorePost;
  onShare: (p: FirestorePost) => void;
  onDelete: (postId: string) => void;
}) {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = screenWidth - 28;
  const [imgIndex, setImgIndex] = useState(0);

  const { savedPlaces, savePlace, unsavePlace } = useMapStore();
  const { savedPostIds, savePost, unsavePost } = usePostStore();
  const uid = useAuthStore((s) => s.user?.uid ?? (s.kakaoUser ? `kakao_${s.kakaoUser.id}` : null));

  const [commentCount, setCommentCount] = useState(post.comment_count ?? 0);
  useEffect(() => {
    const unsub = subscribeComments(post.id, (comments) => setCommentCount(comments.length));
    return unsub;
  }, [post.id]);

  const liked = uid ? post.likes.includes(uid) : false;
  const likeCount = post.likes.length;
  const bookmarked = savedPostIds.includes(post.id);

  const handleToggleLike = async () => {
    if (!uid) return;
    await toggleLikeFS(post.id, uid, liked).catch(() => {});
  };

  const toggleBookmark = async () => {
    if (bookmarked) {
      unsavePost(post.id);
      if (uid) unsavePostFromFirestore(uid, post.id).catch(() => {});
    } else {
      savePost(post.id);
      if (uid) savePostToFirestore(uid, post.id).catch(() => {});
    }
  };

  const isSaved = post.location_pin
    ? savedPlaces.some((p) => p.id === post.location_pin!.id)
    : false;

  const toggleSavePlace = async () => {
    if (!post.location_pin) return;
    if (isSaved) {
      unsavePlace(post.location_pin.id);
      if (uid) await unsavePinFromFirestore(uid, post.location_pin.id).catch(() => {});
    } else {
      const pin: PlaceResult = {
        id: post.location_pin.id,
        place_name: post.location_pin.place_name,
        category_name: post.location_pin.category_name,
        address_name: post.location_pin.address_name,
        road_address_name: post.location_pin.road_address_name,
        x: post.location_pin.x,
        y: post.location_pin.y,
      };
      savePlace(pin);
      if (uid) {
        await savePinToFirestore(uid, {
          id: pin.id,
          type: 'saved',
          lat: parseFloat(pin.y),
          lng: parseFloat(pin.x),
          title: pin.place_name,
          subtitle: pin.road_address_name || pin.address_name,
        }).catch(() => {});
      }
    }
  };

  return (
    <View style={[card.wrap, post.author_is_sheriff && card.wrapSheriff]}>
      <TouchableOpacity
        activeOpacity={0.97}
        onPress={() => router.push({ pathname: '/post/[id]', params: { id: post.id } })}
      >
        {/* Author row */}
        <View style={card.authorRow}>
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/user/[uid]', params: { uid: post.author_id } })}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <View style={[card.avatar, post.author_is_sheriff && card.avatarSheriff]}>
              <Ionicons name="person" size={18} color="#1A1108" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={card.authorInfo}
            onPress={() => router.push({ pathname: '/user/[uid]', params: { uid: post.author_id } })}
          >
            <View style={card.authorNameRow}>
              <Text style={card.authorName}>{post.author_nickname}</Text>
              {post.author_is_sheriff && (
                <Image
                  source={require('../../assets/images/sheriff_verified.jpg')}
                  style={card.sheriffBadge}
                />
              )}
            </View>
            <Text style={card.meta}>{formatTimeAgo(post.timestamp)}</Text>
          </TouchableOpacity>
          {uid === post.author_id && (
            <TouchableOpacity
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() =>
                Alert.alert('게시물 관리', undefined, [
                  {
                    text: '삭제',
                    style: 'destructive',
                    onPress: () =>
                      Alert.alert('게시물 삭제', '이 게시물을 삭제할까요?', [
                        { text: '취소', style: 'cancel' },
                        {
                          text: '삭제',
                          style: 'destructive',
                          onPress: () => onDelete(post.id),
                        },
                      ]),
                  },
                  { text: '취소', style: 'cancel' },
                ])
              }
            >
              <Ionicons name="ellipsis-horizontal" size={18} color="#1A1108" />
            </TouchableOpacity>
          )}
        </View>

        {/* Images */}
        {post.media_urls.length > 0 &&
          (post.media_urls.length === 1 ? (
            <Image source={{ uri: post.media_urls[0] }} style={card.image} />
          ) : (
            <View>
              <FlatList
                data={post.media_urls}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(_, i) => String(i)}
                renderItem={({ item }) => (
                  <Image
                    source={{ uri: item }}
                    style={{ width: cardWidth, aspectRatio: 4 / 3, backgroundColor: '#F5F5F5' }}
                  />
                )}
                getItemLayout={(_, index) => ({
                  length: cardWidth,
                  offset: cardWidth * index,
                  index,
                })}
                onMomentumScrollEnd={(e) => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
                  setImgIndex(idx);
                }}
                scrollEventThrottle={16}
              />
              <View style={card.dotsRow}>
                {post.media_urls.map((_, i) => (
                  <View key={i} style={[card.imgDot, i === imgIndex && card.imgDotActive]} />
                ))}
              </View>
            </View>
          ))}

        {/* Content */}
        <Text style={card.content}>{post.content.replace(/#[\w가-힣]+/g, '').trim()}</Text>

        {/* Tags */}
        <View style={card.tagRow}>
          {post.tags.map((t) => (
            <Text key={t} style={card.tag}>{t}</Text>
          ))}
        </View>

        {/* Location */}
        {post.location.name ? (
          <View style={card.locationRow}>
            <Ionicons name="location" size={13} color="#FFAC30" />
            <Text style={card.locationName}>{post.location.name}</Text>
          </View>
        ) : null}
      </TouchableOpacity>

      {/* Actions */}
      <View style={card.actions}>
        <TouchableOpacity style={card.actionBtn} onPress={handleToggleLike}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={20}
            color={liked ? '#E05252' : '#1A1108'}
          />
          <Text style={[card.actionText, liked && card.actionTextLiked]}>{likeCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={card.actionBtn}
          onPress={() =>
            router.push({
              pathname: '/post/[id]',
              params: { id: post.id, scrollToComments: '1' },
            })
          }
        >
          <Ionicons name="chatbubble-outline" size={19} color="#1A1108" />
          <Text style={card.actionText}>{commentCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={card.actionBtn} onPress={() => onShare(post)}>
          <Ionicons name="paper-plane-outline" size={19} color="#1A1108" />
          {(post.share_count ?? 0) > 0 && <Text style={card.actionText}>{post.share_count}</Text>}
        </TouchableOpacity>

        <View style={card.actionsRight}>
          {post.location_pin && (
            <TouchableOpacity style={card.actionBtn} onPress={toggleSavePlace}>
              <LassoIcon size={19} color={isSaved ? '#FFAC30' : '#1A1108'} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={card.actionBtn} onPress={toggleBookmark}>
            <Ionicons
              name={bookmarked ? 'bookmark' : 'bookmark-outline'}
              size={19}
              color={bookmarked ? '#FFAC30' : '#1A1108'}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [posts, setPosts] = useState<FirestorePost[]>([]);
  const [sharePost, setSharePost] = useState<FirestorePost | null>(null);
  const uid = useAuthStore((s) => s.user?.uid ?? (s.kakaoUser ? `kakao_${s.kakaoUser.id}` : null));

  // 지도에서 장소를 선택한 경우 해당 장소명으로 자동 검색
  const feedSearchQuery    = useMapStore((s) => s.feedSearchQuery);
  const setFeedSearchQuery = useMapStore((s) => s.setFeedSearchQuery);

  useFocusEffect(
    useCallback(() => {
      if (feedSearchQuery) {
        setSearchText(feedSearchQuery);
        setFeedSearchQuery(null);
      }
    }, [feedSearchQuery, setFeedSearchQuery])
  );

  const handleDelete = async (postId: string) => {
    if (!uid) return;
    await deletePost(postId, uid).catch(() => {});
  };

  const blockedUsers = useAuthStore((s) => s.blockedUsers);

  useEffect(() => {
    const unsub = subscribeFeedPosts(setPosts, undefined, undefined, blockedUsers);
    return unsub;
  }, [blockedUsers]);

  const hasPosts = posts.length > 0;

  const filtered = searchText.trim()
    ? posts.filter((p) =>
        p.content.includes(searchText) ||
        p.location.name.includes(searchText) ||
        p.tags.some((t) => t.includes(searchText))
      )
    : posts;

  return (
    <View style={styles.container}>
      {/* ── Search bar ── */}
      <View style={[styles.searchWrap, { paddingTop: insets.top + 12 }]}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={17} color="#1A1108" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="게시물 검색"
            placeholderTextColor="#1A1108"
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel="게시물 검색"
          />
        </View>
      </View>

      {/* ── Content ── */}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 96 }]}
        showsVerticalScrollIndicator={false}
      >
        {hasPosts ? (
          filtered.length > 0
            ? filtered.map((post) => <PostCard key={post.id} post={post} onShare={setSharePost} onDelete={handleDelete} />)
            : (
              <View style={styles.noResult}>
                <Ionicons name="search" size={36} color="#1A1108" />
                <Text style={styles.noResultText}>검색 결과가 없어요</Text>
              </View>
            )
        ) : (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="chatbox" size={44} color="#FFAC30" />
            </View>
            <Text style={styles.emptyTitle}>동네 소식이 아직 없어요</Text>
            <Text style={styles.emptySub}>첫 번째 게시물을 작성하고{'\n'}보안관이 되어보세요</Text>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => router.push('/create-post')}
              accessibilityRole="button"
              accessibilityLabel="게시물 생성하기"
            >
              <Ionicons name="add-circle-outline" size={18} color="#1A1108" style={{ marginRight: 6 }} />
              <Text style={styles.createBtnText}>게시물 생성하기</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ── Write FAB ── */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 104 }]}
        onPress={() => router.push('/create-post')}
        accessibilityLabel="게시물 작성"
      >
        <Ionicons name="add" size={26} color="#1A1108" />
      </TouchableOpacity>

      {/* ── Share modal ── */}
      <ShareModal
        visible={sharePost !== null}
        myUid={uid ?? ''}
        shareText={sharePost
          ? `[게시물 공유] ${sharePost.author_nickname}의 게시물\n"${sharePost.content.slice(0, 80)}${sharePost.content.length > 80 ? '...' : ''}"`
          : ''}
        onClose={() => setSharePost(null)}
        onShare={() => sharePost && incrementShareCount(sharePost.id)}
      />
    </View>
  );
}

// ── PostCard styles ────────────────────────────────────────────────────────────

const card = StyleSheet.create({
  wrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#D4D4D4',
    overflow: 'hidden',
  },
  wrapSheriff: {
    borderColor: '#FFAC30',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D4D4D4',
  },
  avatarSheriff: {
    borderColor: '#FFAC30',
    borderWidth: 2,
  },
  authorInfo: { flex: 1 },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  authorName: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },
  sheriffBadge: {
    width: 60,
    height: 20,
    resizeMode: 'contain',
  },
  meta: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#1A1108',
  },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#FFFFFF',
  },
  dotsRow: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },
  imgDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  imgDotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  content: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#1A1108',
    lineHeight: 22,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  tag: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  locationName: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#1A1108',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#1A1108',
  },
  locationDist: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#1A1108',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#D4D4D4',
    marginTop: 10,
    gap: 4,
  },
  actionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 12,
    minHeight: 44,
  },
  actionText: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-Medium',
    color: '#1A1108',
  },
  actionTextLiked: { color: '#E05252' },
});

// ── Screen styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  searchWrap: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#D4D4D4',
  },
  searchBar: {
    height: 44,
    backgroundColor: '#F5F5F5',
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#D4D4D4',
  },
  searchIcon: { marginRight: 6 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#1A1108',
    paddingVertical: 0,
  },

  content: { padding: 14 },

  noResult: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  noResultText: {
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-Medium',
    color: '#1A1108',
  },

  emptyWrap: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#D4D4D4',
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#1A1108',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFAC30',
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 14,
    shadowColor: '#1A1108',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  createBtnText: {
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },

  fab: {
    position: 'absolute',
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFAC30',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1A1108',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
});

