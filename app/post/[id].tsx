// 경로: app/post/[id].tsx
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Path, Svg } from 'react-native-svg';
import { savePinToFirestore, unsavePinFromFirestore } from '../../src/api/savedPlaces';
import { savePostToFirestore, unsavePostFromFirestore } from '../../src/api/savedPosts';
import { MOCK_COMMENTS_MAP, MOCK_POSTS } from '../../src/constants/mockPosts';
import { useAuthStore } from '../../src/store/authStore';
import { useMapStore } from '../../src/store/mapStore';
import { usePostStore } from '../../src/store/postStore';

function LassoIcon({ size = 20, color = '#B89060' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M7 22a5 5 0 0 1-2-4" />
      <Path d="M3.3 14A6.8 6.8 0 0 1 2 10c0-4.4 4.5-8 10-8s10 3.6 10 8-4.5 8-10 8a12 12 0 0 1-5-1" />
      <Path d="M5 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
    </Svg>
  );
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const post = MOCK_POSTS.find((p) => p.id === id);
  const comments = MOCK_COMMENTS_MAP[id ?? ''] ?? [];

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post?.likes ?? 0);
  const [followed, setFollowed] = useState(false);
  const [commentText, setCommentText] = useState('');

  const { savedPlaces, savePlace, unsavePlace } = useMapStore();
  const { savedPostIds, savePost, unsavePost } = usePostStore();
  const uid = useAuthStore((s) => s.user?.uid ?? (s.kakaoUser ? `kakao_${s.kakaoUser.id}` : null));

  if (!post) {
    return (
      <View style={[styles.notFound, { paddingTop: insets.top }]}>
        <Ionicons name="alert-circle-outline" size={48} color="#B89060" />
        <Text style={styles.notFoundText}>게시물을 찾을 수 없어요</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>돌아가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const bookmarked = savedPostIds.includes(post.id);
  const isSaved = post.locationPin
    ? savedPlaces.some((p) => p.id === post.locationPin!.id)
    : false;

  const toggleLike = () => {
    setLiked((v) => !v);
    setLikeCount((n) => n + (liked ? -1 : 1));
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
    if (!post.locationPin) return;
    if (isSaved) {
      unsavePlace(post.locationPin.id);
      if (uid) unsavePinFromFirestore(uid, post.locationPin.id).catch(() => {});
    } else {
      savePlace(post.locationPin);
      if (uid) {
        const pin = {
          id: post.locationPin.id,
          type: 'saved' as const,
          lat: parseFloat(post.locationPin.y),
          lng: parseFloat(post.locationPin.x),
          title: post.locationPin.place_name,
          subtitle: post.locationPin.road_address_name || post.locationPin.address_name,
        };
        savePinToFirestore(uid, pin).catch(() => {});
      }
    }
  };

  const displayContent = post.content.replace(/#[\w가-힣]+/g, '').trim();

  return (
    <View style={styles.root}>
      {/* ── Header ── */}
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
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="paper-plane-outline" size={22} color="#1A1108" />
        </TouchableOpacity>
      </View>

      {/* ── Content + Comment input ── */}
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Hero image */}
          {post.imageUri && (
            <Image source={{ uri: post.imageUri }} style={styles.heroImage} />
          )}

          <View style={styles.body}>
            {/* Author row */}
            <View style={styles.authorRow}>
              <View style={[styles.authorAvatar, post.author.isSheriff && styles.authorAvatarSheriff]}>
                <Ionicons name="person" size={22} color={post.author.isSheriff ? '#A36E1D' : '#B89060'} />
              </View>
              <View style={styles.authorInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.authorName}>{post.author.nickname}</Text>
                  {post.author.isSheriff && (
                    <Image
                      source={require('../../assets/images/sheriff_verified.jpg')}
                      style={styles.sheriffBadge}
                    />
                  )}
                </View>
                <Text style={styles.authorMeta}>{post.timeAgo} · {post.contentType}</Text>
              </View>
              <TouchableOpacity
                style={[styles.followBtn, followed && styles.followBtnActive]}
                onPress={() => setFollowed((v) => !v)}
              >
                <Text style={[styles.followBtnText, followed && styles.followBtnTextActive]}>
                  {followed ? '팔로잉' : '팔로우'}
                </Text>
              </TouchableOpacity>
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

            {/* Location card */}
            <View style={styles.locationCard}>
              <Ionicons name="location" size={16} color="#FFAC30" />
              <View style={styles.locationCardInfo}>
                <Text style={styles.locationCardName}>{post.location.name}</Text>
                {post.locationPin && (
                  <Text style={styles.locationCardAddr} numberOfLines={1}>
                    {post.locationPin.road_address_name || post.locationPin.address_name}
                  </Text>
                )}
              </View>
              <View style={styles.locationDistBadge}>
                <Text style={styles.locationDistText}>{post.location.distance}</Text>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionBtn} onPress={toggleLike}>
                <Ionicons
                  name={liked ? 'heart' : 'heart-outline'}
                  size={23}
                  color={liked ? '#E05252' : '#B89060'}
                />
                <Text style={[styles.actionText, liked && styles.actionTextLiked]}>{likeCount}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}>
                <Ionicons name="chatbubble-outline" size={21} color="#B89060" />
                <Text style={styles.actionText}>{comments.length}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}>
                <Ionicons name="paper-plane-outline" size={21} color="#B89060" />
              </TouchableOpacity>
              <View style={styles.actionsRight}>
                {post.locationPin && (
                  <TouchableOpacity style={styles.actionBtn} onPress={toggleSavePlace}>
                    <LassoIcon size={21} color={isSaved ? '#FFAC30' : '#B89060'} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.actionBtn} onPress={toggleBookmark}>
                  <Ionicons
                    name={bookmarked ? 'bookmark' : 'bookmark-outline'}
                    size={21}
                    color={bookmarked ? '#FFAC30' : '#B89060'}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Divider */}
            {comments.length > 0 && <View style={styles.divider} />}

            {/* Comments section */}
            {comments.length > 0 && (
              <View>
                <Text style={styles.commentsSectionTitle}>댓글 {comments.length}개</Text>
                {comments.map((c) => (
                  <View key={c.id} style={styles.commentItem}>
                    <View style={[styles.commentAvatar, c.author.isSheriff && styles.commentAvatarSheriff]}>
                      <Ionicons name="person" size={15} color={c.author.isSheriff ? '#A36E1D' : '#B89060'} />
                    </View>
                    <View style={styles.commentBody}>
                      <View style={styles.nameRow}>
                        <Text style={styles.commentName}>{c.author.nickname}</Text>
                        {c.author.isSheriff && (
                          <Image
                            source={require('../../assets/images/sheriff_verified.jpg')}
                            style={styles.commentBadge}
                          />
                        )}
                      </View>
                      <Text style={styles.commentText}>{c.text}</Text>
                      <View style={styles.commentMeta}>
                        <Text style={styles.commentTime}>{c.timeAgo}</Text>
                        {c.likes > 0 && (
                          <>
                            <View style={styles.metaDot} />
                            <Text style={styles.commentLikesText}>좋아요 {c.likes}개</Text>
                          </>
                        )}
                        <TouchableOpacity style={{ marginLeft: 10 }}>
                          <Text style={styles.replyBtn}>답글 달기</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.commentLikeBtn}>
                      <Ionicons name="heart-outline" size={14} color="#B89060" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Bottom spacer for input bar */}
          <View style={{ height: 80 }} />
        </ScrollView>

        {/* ── Comment input bar ── */}
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.inputAvatar}>
            <Ionicons name="person" size={15} color="#B89060" />
          </View>
          <TextInput
            style={styles.commentInput}
            placeholder="댓글 달기..."
            placeholderTextColor="#B89060"
            value={commentText}
            onChangeText={setCommentText}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={styles.sendBtn}
            disabled={!commentText.trim()}
          >
            <Ionicons
              name="send"
              size={20}
              color={commentText.trim() ? '#FFAC30' : '#D4D4D4'}
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
  notFoundText: { fontSize: 16, fontFamily: 'AppleSDGothicNeo-Medium', color: '#7A5C38' },
  backBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FFAC30',
    borderRadius: 14,
  },
  backBtnText: { fontSize: 15, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108' },

  // Header
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
  headerIconBtn: {
    width: 48,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },

  // Hero image
  heroImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#F5F5F5',
  },

  // Body
  body: { padding: 16 },

  // Author
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
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
  authorMeta: { fontSize: 12, fontFamily: 'AppleSDGothicNeo-Regular', color: '#B89060' },
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

  // Content
  content: {
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#1A1108',
    lineHeight: 24,
    marginBottom: 12,
  },

  // Tags
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  tag: { fontSize: 13, fontFamily: 'AppleSDGothicNeo-Medium', color: '#A36E1D' },

  // Location card
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFBF3',
    borderWidth: 1,
    borderColor: '#FFE0A0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
  },
  locationCardInfo: { flex: 1 },
  locationCardName: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#1A1108',
    marginBottom: 2,
  },
  locationCardAddr: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#7A5C38',
  },
  locationDistBadge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4D4D4',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  locationDistText: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#7A5C38',
  },

  // Divider
  divider: { height: 1, backgroundColor: '#F5F5F5', marginVertical: 14 },

  // Actions
  actions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  actionsRight: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto', gap: 2 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 6,
    paddingVertical: 8,
    minHeight: 44,
  },
  actionText: { fontSize: 14, fontFamily: 'AppleSDGothicNeo-Medium', color: '#B89060' },
  actionTextLiked: { color: '#E05252' },

  // Comments
  commentsSectionTitle: {
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
    marginBottom: 18,
  },
  commentItem: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
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
  commentMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  commentTime: { fontSize: 12, fontFamily: 'AppleSDGothicNeo-Regular', color: '#B89060' },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#D4D4D4', marginHorizontal: 5 },
  commentLikesText: { fontSize: 12, fontFamily: 'AppleSDGothicNeo-Regular', color: '#B89060' },
  replyBtn: { fontSize: 12, fontFamily: 'AppleSDGothicNeo-SemiBold', color: '#7A5C38' },
  commentLikeBtn: { paddingTop: 4, paddingLeft: 4 },

  // Input bar
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
  sendBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
});
