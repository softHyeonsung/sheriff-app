// 경로: app/post/[id].tsx
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Pressable,
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
import { savePinToFirestore, unsavePinFromFirestore } from '../../src/api/savedPlaces';
import { savePostToFirestore, unsavePostFromFirestore } from '../../src/api/savedPosts';
import {
  FirestoreComment,
  FirestorePost,
  addComment,
  deletePost,
  fetchPostById,
  formatTimeAgo,
  incrementShareCount,
  subscribeComments,
  toggleLike as toggleLikeFS,
} from '../../src/api/posts';
import { promptAndReport } from '../../src/api/reports';
import { fetchMyProfile, followUser, unfollowUser } from '../../src/api/users';
import { useAuthStore } from '../../src/store/authStore';
import { useMapStore } from '../../src/store/mapStore';
import { usePostStore } from '../../src/store/postStore';
import MiniMap from '../../src/components/MiniMap';
import ShareModal from '../../src/components/ShareModal';

function LassoIcon({ size = 20, color = '#1A1108' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M7 22a5 5 0 0 1-2-4" />
      <Path d="M3.3 14A6.8 6.8 0 0 1 2 10c0-4.4 4.5-8 10-8s10 3.6 10 8-4.5 8-10 8a12 12 0 0 1-5-1" />
      <Path d="M5 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
    </Svg>
  );
}

export default function PostDetailScreen() {
  const { id, scrollToComments } = useLocalSearchParams<{ id: string; scrollToComments?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const scrollRef       = useRef<ScrollView>(null);
  const commentInputRef = useRef<TextInput>(null);
  const bodyYRef        = useRef(0);
  const commentsYRef    = useRef(0);

  const [post,        setPost]        = useState<FirestorePost | null | undefined>(undefined);
  const [comments,    setComments]    = useState<FirestoreComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [myFollowing, setMyFollowing] = useState<string[]>([]);
  const [showShare, setShowShare] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [localShareCount, setLocalShareCount] = useState<number | null>(null);
  const { width: screenWidth } = useWindowDimensions();
  const [imgIndex, setImgIndex] = useState(0);

  const { savedPlaces, savePlace, unsavePlace } = useMapStore();
  const { savedPostIds, savePost, unsavePost }   = usePostStore();
  const uid       = useAuthStore((s) => s.user?.uid ?? (s.kakaoUser ? `kakao_${s.kakaoUser.id}` : null));
  const nickname  = useAuthStore((s) => s.kakaoUser?.nickname ?? s.user?.displayName ?? '익명');
  const [isSheriff, setIsSheriff] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchPostById(id).then(setPost).catch(() => setPost(null));
    const unsub = subscribeComments(id, setComments);
    return unsub;
  }, [id]);

  useEffect(() => {
    if (!uid) return;
    fetchMyProfile(uid).then((p) => {
      setMyFollowing(p?.following ?? []);
      setIsSheriff((p?.badge_list ?? []).some((b) => /^sheriff_\d{4}_\d{2}$/.test(b)));
    }).catch(() => {});
  }, [uid]);

  const isFollowingAuthor = post ? myFollowing.includes(post.author_id) : false;

  const handleFollowAuthor = async () => {
    if (!uid || !post || uid === post.author_id) return;
    if (isFollowingAuthor) {
      setMyFollowing((prev) => prev.filter((id) => id !== post.author_id));
      await unfollowUser(uid, post.author_id).catch(() =>
        setMyFollowing((prev) => [...prev, post.author_id])
      );
    } else {
      setMyFollowing((prev) => [...prev, post.author_id]);
      await followUser(uid, post.author_id).catch(() =>
        setMyFollowing((prev) => prev.filter((id) => id !== post.author_id))
      );
    }
  };

  useEffect(() => {
    if (scrollToComments !== '1') return;
    const t = setTimeout(() => {
      const y = bodyYRef.current + commentsYRef.current;
      scrollRef.current?.scrollTo({ y: y - 8, animated: true });
      commentInputRef.current?.focus();
    }, 350);
    return () => clearTimeout(t);
  }, [scrollToComments]);

  if (post === undefined) {
    return (
      <View style={[styles.notFound, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#FFAC30" />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.notFound, { paddingTop: insets.top }]}>
        <Ionicons name="alert-circle-outline" size={48} color="#1A1108" />
        <Text style={styles.notFoundText}>게시물을 찾을 수 없어요</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>돌아가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const liked      = uid ? post.likes.includes(uid) : false;
  const likeCount  = post.likes.length;
  const shareCount = localShareCount ?? post.share_count ?? 0;
  const bookmarked = savedPostIds.includes(post.id);
  const isSaved    = post.location_pin
    ? savedPlaces.some((p) => p.id === post.location_pin!.id)
    : false;
  const images = post.media_urls;
  const displayContent = post.content.replace(/#[\w가-힣]+/g, '').trim();

  const handleToggleLike = async () => {
    if (!uid) return;
    setPost((prev) => {
      if (!prev) return prev;
      const newLikes = liked
        ? prev.likes.filter((l) => l !== uid)
        : [...prev.likes, uid];
      return { ...prev, likes: newLikes };
    });
    await toggleLikeFS(post.id, uid, liked).catch(() => {
      fetchPostById(post.id).then(setPost).catch(() => {});
    });
  };

  const handleShare = () => {
    setLocalShareCount((prev) => (prev ?? shareCount) + 1);
    incrementShareCount(post.id);
  };

  const isMyPost = uid === post?.author_id;

  const handleDeletePost = () => {
    setShowMenu(false);
    Alert.alert('게시물 삭제', '이 게시물을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await deletePost(post!.id, uid!).catch(() => {});
          router.back();
        },
      },
    ]);
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

  const toggleSavePlace = async () => {
    if (!post.location_pin) return;
    if (isSaved) {
      unsavePlace(post.location_pin.id);
      if (uid) unsavePinFromFirestore(uid, post.location_pin.id).catch(() => {});
    } else {
      const pin = {
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
        savePinToFirestore(uid, {
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

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !uid || submitting) return;
    setSubmitting(true);
    try {
      await addComment(post.id, uid, nickname, isSheriff, commentText.trim(), post.author_id);
      setCommentText('');
    } finally {
      setSubmitting(false);
    }
  };

  const postShareText = post
    ? `[게시물 공유]\n\n${post.content.slice(0, 80)}${post.content.length > 80 ? '...' : ''}`
    : '';

  return (
    <View style={styles.root}>
      <ShareModal
        visible={showShare}
        onClose={() => setShowShare(false)}
        myUid={uid ?? ''}
        shareText={postShareText}
        onShare={handleShare}
      />

      {/* 3-dot 메뉴 — 본인 게시물: 삭제 / 타인 게시물: 공유·신고 */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <Pressable style={menuStyles.backdrop} onPress={() => setShowMenu(false)}>
          <View style={menuStyles.sheet}>
            {isMyPost ? (
              <TouchableOpacity style={menuStyles.item} onPress={handleDeletePost} activeOpacity={0.7}>
                <Ionicons name="trash-outline" size={20} color="#E05252" />
                <Text style={menuStyles.itemDanger}>삭제하기</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={menuStyles.item}
                  onPress={() => { setShowMenu(false); setShowShare(true); }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="share-outline" size={20} color="#1A1108" />
                  <Text style={menuStyles.itemLabel}>공유하기</Text>
                </TouchableOpacity>
                <View style={menuStyles.sep} />
                <TouchableOpacity
                  style={menuStyles.item}
                  onPress={() => {
                    setShowMenu(false);
                    if (uid) promptAndReport(uid, 'post', post!.id);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="flag-outline" size={20} color="#E05252" />
                  <Text style={menuStyles.itemDanger}>신고하기</Text>
                </TouchableOpacity>
              </>
            )}
            <View style={menuStyles.sep} />
            <TouchableOpacity style={menuStyles.item} onPress={() => setShowMenu(false)} activeOpacity={0.7}>
              <Text style={menuStyles.itemCancel}>취소</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={26} color="#1A1108" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>게시물</Text>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => setShowMenu(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="ellipsis-vertical" size={24} color="#1A1108" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.kav}
        behavior="padding"
      >
        <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>
          {/* Hero image carousel */}
          {images.length > 0 && (
            <View>
              <FlatList
                data={images}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(_, i) => String(i)}
                renderItem={({ item }) => (
                  <Image
                    source={{ uri: item }}
                    style={{ width: screenWidth, aspectRatio: 4 / 3, backgroundColor: '#F5F5F5' }}
                  />
                )}
                onMomentumScrollEnd={(e) => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
                  setImgIndex(idx);
                }}
              />
              {images.length > 1 && (
                <View style={styles.dotsRow}>
                  {images.map((_, i) => (
                    <View key={i} style={[styles.dot, i === imgIndex && styles.dotActive]} />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleToggleLike}>
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={23}
                color={liked ? '#E05252' : '#1A1108'}
              />
              <Text style={[styles.actionText, liked && styles.actionTextLiked]}>{likeCount}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                commentInputRef.current?.focus();
                scrollRef.current?.scrollToEnd({ animated: true });
              }}
            >
              <Ionicons name="chatbubble-outline" size={21} color="#1A1108" />
              <Text style={styles.actionText}>{comments.length}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setShowShare(true)}>
              <Ionicons name="paper-plane-outline" size={21} color="#1A1108" />
              {shareCount > 0 && <Text style={styles.actionText}>{shareCount}</Text>}
            </TouchableOpacity>
            <View style={styles.actionsRight}>
              {post.location_pin && (
                <TouchableOpacity style={styles.actionBtn} onPress={toggleSavePlace}>
                  <LassoIcon size={21} color={isSaved ? '#FFAC30' : '#1A1108'} />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.actionBtn} onPress={toggleBookmark}>
                <Ionicons
                  name={bookmarked ? 'bookmark' : 'bookmark-outline'}
                  size={21}
                  color={bookmarked ? '#FFAC30' : '#1A1108'}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.body} onLayout={(e) => { bodyYRef.current = e.nativeEvent.layout.y; }}>
            {/* Author row */}
            <View style={styles.authorRow}>
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/user/[uid]', params: { uid: post.author_id } })}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                <View style={[styles.authorAvatar, post.author_is_sheriff && styles.authorAvatarSheriff]}>
                  <Ionicons name="person" size={22} color="#1A1108" />
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.authorInfo}
                onPress={() => router.push({ pathname: '/user/[uid]', params: { uid: post.author_id } })}
              >
                <View style={styles.nameRow}>
                  <Text style={styles.authorName}>{post.author_nickname}</Text>
                  {post.author_is_sheriff && (
                    <Image
                      source={require('../../assets/images/sheriff_verified.jpg')}
                      style={styles.sheriffBadge}
                    />
                  )}
                </View>
                <Text style={styles.authorMeta}>{formatTimeAgo(post.timestamp)}</Text>
              </TouchableOpacity>
              {uid && post && uid !== post.author_id && (
                <TouchableOpacity
                  style={[styles.followBtn, isFollowingAuthor && styles.followBtnActive]}
                  onPress={handleFollowAuthor}
                >
                  <Text style={[styles.followBtnText, isFollowingAuthor && styles.followBtnTextActive]}>
                    {isFollowingAuthor ? '팔로잉' : '팔로우'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Content */}
            <Text style={styles.content}>{displayContent}</Text>

            {/* Tags */}
            {post.tags.length > 0 && (
              <View style={styles.tagRow}>
                {post.tags.map((t) => (
                  <Text key={t} style={styles.tag}>{t}</Text>
                ))}
              </View>
            )}

            {/* Location */}
            {post.location_pin ? (
              <View style={styles.locationWrap}>
                <MiniMap
                  lat={parseFloat(post.location_pin.y)}
                  lng={parseFloat(post.location_pin.x)}
                  title={post.location.name}
                  height={180}
                  onExpand={() => router.replace('/(tabs)')}
                />
                <View style={styles.locationMeta}>
                  <Ionicons name="location" size={14} color="#FFAC30" />
                  <View style={styles.locationMetaInfo}>
                    <Text style={styles.locationMetaName}>{post.location.name}</Text>
                    <Text style={styles.locationMetaAddr} numberOfLines={1}>
                      {post.location_pin.road_address_name || post.location_pin.address_name}
                    </Text>
                  </View>
                </View>
              </View>
            ) : post.location.name ? (
              <View style={styles.locationCard}>
                <Ionicons name="location" size={14} color="#FFAC30" />
                <Text style={styles.locationMetaName}>{post.location.name}</Text>
              </View>
            ) : null}

            {/* Comments */}
            {comments.length > 0 && (
              <View onLayout={(e) => { commentsYRef.current = e.nativeEvent.layout.y; }}>
                <View style={styles.divider} />
                <Text style={styles.commentsSectionTitle}>댓글 {comments.length}개</Text>
                {comments.map((c) => (
                  <View key={c.id} style={styles.commentItem}>
                    <View style={[styles.commentAvatar, c.author_is_sheriff && styles.commentAvatarSheriff]}>
                      <Ionicons name="person" size={15} color="#1A1108" />
                    </View>
                    <View style={styles.commentBody}>
                      <View style={styles.nameRow}>
                        <Text style={styles.commentName}>{c.author_nickname}</Text>
                        {c.author_is_sheriff && (
                          <Image
                            source={require('../../assets/images/sheriff_verified.jpg')}
                            style={styles.commentBadge}
                          />
                        )}
                      </View>
                      <Text style={styles.commentText}>{c.text}</Text>
                      <View style={styles.commentMeta}>
                        <Text style={styles.commentTime}>{formatTimeAgo(c.timestamp)}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={{ height: 80 }} />
        </ScrollView>

        {/* Comment input bar */}
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.inputAvatar}>
            <Ionicons name="person" size={15} color="#1A1108" />
          </View>
          <TextInput
            ref={commentInputRef}
            style={styles.commentInput}
            placeholder="댓글 달기..."
            placeholderTextColor="#1A1108"
            value={commentText}
            onChangeText={setCommentText}
            returnKeyType="send"
            onSubmitEditing={handleSubmitComment}
          />
          <TouchableOpacity
            style={styles.sendBtn}
            disabled={!commentText.trim() || submitting}
            onPress={handleSubmitComment}
          >
            <Ionicons
              name="send"
              size={20}
              color={commentText.trim() && !submitting ? '#FFAC30' : '#D4D4D4'}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  kav: { flex: 1 },

  notFound: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  notFoundText: { fontSize: 16, fontFamily: 'AppleSDGothicNeo-Medium', color: '#1A1108' },
  backBtn: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#FFAC30', borderRadius: 14 },
  backBtnText: { fontSize: 15, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#D4D4D4',
  },
  headerIconBtn: { width: 48, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108' },

  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D4D4D4' },
  dotActive: { backgroundColor: '#FFAC30', width: 8, height: 8, borderRadius: 4 },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  actionsRight: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto', gap: 2 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 6,
    paddingVertical: 8,
    minHeight: 44,
  },
  actionText: { fontSize: 14, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108' },
  actionTextLiked: { color: '#E05252' },

  body: { padding: 16 },

  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  authorAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D4D4D4',
    flexShrink: 0,
  },
  authorAvatarSheriff: { borderColor: '#FFAC30', borderWidth: 2 },
  authorInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  authorName: { fontSize: 15, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108' },
  sheriffBadge: { width: 60, height: 20, resizeMode: 'contain' },
  authorMeta: { fontSize: 12, fontFamily: 'AppleSDGothicNeo-Regular', color: '#1A1108' },
  followBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#FFAC30',
    backgroundColor: '#FFFFFF',
  },
  followBtnActive: { backgroundColor: '#FFAC30' },
  followBtnText: { fontSize: 13, fontFamily: 'AppleSDGothicNeo-Bold', color: '#FFAC30' },
  followBtnTextActive: { color: '#1A1108' },

  content: {
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#1A1108',
    lineHeight: 24,
    marginBottom: 12,
  },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  tag: { fontSize: 13, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108' },

  locationWrap: { marginBottom: 4 },
  locationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 2,
    paddingTop: 10,
    paddingBottom: 2,
  },
  locationMetaInfo: { flex: 1 },
  locationMetaName: { fontSize: 13, fontFamily: 'AppleSDGothicNeo-SemiBold', color: '#1A1108', marginBottom: 1 },
  locationMetaAddr: { fontSize: 12, fontFamily: 'AppleSDGothicNeo-Regular', color: '#1A1108' },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBF3',
    borderWidth: 1,
    borderColor: '#FFE0A0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
  },

  divider: { height: 1, backgroundColor: '#F5F5F5', marginVertical: 14 },

  commentsSectionTitle: {
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
    marginBottom: 18,
  },
  commentItem: { flexDirection: 'row', gap: 10, marginBottom: 20, alignItems: 'flex-start' },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D4D4D4',
    flexShrink: 0,
  },
  commentAvatarSheriff: { borderColor: '#FFAC30' },
  commentBody: { flex: 1 },
  commentName: { fontSize: 13, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108' },
  commentBadge: { width: 48, height: 16, resizeMode: 'contain' },
  commentText: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#1A1108',
    lineHeight: 21,
    marginBottom: 5,
  },
  commentMeta: { flexDirection: 'row', alignItems: 'center' },
  commentTime: { fontSize: 12, fontFamily: 'AppleSDGothicNeo-Regular', color: '#1A1108' },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#D4D4D4',
    backgroundColor: '#FFFFFF',
  },
  inputAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D4D4D4',
    flexShrink: 0,
  },
  commentInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#1A1108',
  },
  sendBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
});

const menuStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    paddingTop: 8,
  },
  sep: { height: 1, backgroundColor: '#F5F5F5' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  itemDanger: { fontSize: 16, fontFamily: 'AppleSDGothicNeo-SemiBold', color: '#E05252' },
  itemLabel: { fontSize: 16, fontFamily: 'AppleSDGothicNeo-SemiBold', color: '#1A1108' },
  itemCancel: { fontSize: 16, fontFamily: 'AppleSDGothicNeo-Regular', color: '#7A5C38' },
});
