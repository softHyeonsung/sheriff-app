// 경로: app/(tabs)/feed.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Image,
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
import { useAuthStore } from '../../src/store/authStore';
import { PlaceResult, useMapStore } from '../../src/store/mapStore';

// ── Types ──────────────────────────────────────────────────────────────────────

interface MockPost {
  id: string;
  author: { nickname: string; isSheriff: boolean };
  type: 'feed' | 'story';
  content: string;
  imageUri?: string;
  location: { name: string; distance: string };
  locationPin?: PlaceResult; // if set, enables lariat (save to my map) button
  tags: string[];
  likes: number;
  comments: number;
  timeAgo: string;
  contentType: string; // TourAPI contenttypeid label
}

// ── Mock data (TourAPI 카테고리 기반) ─────────────────────────────────────────

const MOCK_POSTS: MockPost[] = [
  {
    id: '1',
    author: { nickname: '동네탐험가', isSheriff: true },
    type: 'feed',
    content: '경복궁 야간 개장 다녀왔어요! 조명이 진짜 너무 예뻤고 한복 입고 가면 입장료 무료에요 🏯 주말엔 사람이 많으니까 평일 추천!\n#경복궁 #야간개장 #서울관광 #한복',
    imageUri: 'https://picsum.photos/seed/palace/400/300',
    location: { name: '경복궁', distance: '1.2km' },
    locationPin: { id: 'place-gyeongbokgung', place_name: '경복궁', category_name: '관광지', address_name: '서울 종로구 사직로 161', road_address_name: '서울 종로구 사직로 161', x: '126.9770', y: '37.5796' },
    tags: ['#경복궁', '#야간개장', '#서울관광', '#한복'],
    likes: 42,
    comments: 8,
    timeAgo: '2시간 전',
    contentType: '관광지',
  },
  {
    id: '2',
    author: { nickname: '맛집헌터', isSheriff: false },
    type: 'feed',
    content: '광장시장 빈대떡이 너무 맛있어서 두 판 먹었어요 😋 육회도 신선하고 가격도 착해서 자주 오는 편인데 오늘따라 더 맛있는 느낌? 점심시간 피해서 오면 자리도 잘 나요.\n#광장시장 #빈대떡 #육회 #서울맛집',
    imageUri: 'https://picsum.photos/seed/market/400/300',
    location: { name: '광장시장', distance: '850m' },
    locationPin: { id: 'place-gwangjang', place_name: '광장시장', category_name: '음식점', address_name: '서울 종로구 창경궁로 88', road_address_name: '서울 종로구 창경궁로 88', x: '126.9998', y: '37.5702' },
    tags: ['#광장시장', '#빈대떡', '#서울맛집'],
    likes: 31,
    comments: 5,
    timeAgo: '4시간 전',
    contentType: '음식점',
  },
  {
    id: '3',
    author: { nickname: '주말산책러', isSheriff: true },
    type: 'feed',
    content: '한강공원 여의도 쪽 벚꽃이 이번 주가 절정이에요 🌸 아침 일찍 오면 사람 적고 조용히 즐길 수 있어요. 자전거 대여소도 바로 옆에 있으니 자전거 타면서 구경하는 것도 좋아요!\n#한강공원 #여의도벚꽃 #봄나들이',
    imageUri: 'https://picsum.photos/seed/river/400/300',
    location: { name: '한강공원 여의도지구', distance: '2.3km' },
    locationPin: { id: 'place-hangang-yeouido', place_name: '한강공원 여의도지구', category_name: '관광지', address_name: '서울 영등포구 여의도동', road_address_name: '서울 영등포구 여의도동', x: '126.9337', y: '37.5285' },
    tags: ['#한강공원', '#여의도벚꽃', '#봄나들이'],
    likes: 87,
    comments: 14,
    timeAgo: '6시간 전',
    contentType: '관광지',
  },
  {
    id: '4',
    author: { nickname: '문화인', isSheriff: false },
    type: 'feed',
    content: '국립중앙박물관 상설전시 처음 가봤는데 무료인 게 믿기지 않을 정도로 규모가 어마어마해요. 청자·백자 특별전도 같이 열리고 있으니 지금 가보시길 추천! 주차도 무료\n#국립중앙박물관 #문화생활 #무료전시',
    imageUri: 'https://picsum.photos/seed/museum/400/300',
    location: { name: '국립중앙박물관', distance: '3.1km' },
    locationPin: { id: 'place-national-museum', place_name: '국립중앙박물관', category_name: '문화시설', address_name: '서울 용산구 서빙고로 137', road_address_name: '서울 용산구 서빙고로 137', x: '126.9802', y: '37.5234' },
    tags: ['#국립중앙박물관', '#무료전시', '#문화생활'],
    likes: 56,
    comments: 9,
    timeAgo: '어제',
    contentType: '문화시설',
  },
  {
    id: '5',
    author: { nickname: '야경수집가', isSheriff: true },
    type: 'feed',
    content: 'N서울타워 야경 보러 케이블카 타고 올라갔어요 🌃 맑은 날이라 서울 전경이 다 보였고 커플 자물쇠 달아두고 왔어요 ㅎㅎ 올라가기 전에 이태원 맛집에서 저녁 먹고 오는 루트 추천!\n#남산타워 #서울야경 #데이트코스',
    imageUri: 'https://picsum.photos/seed/tower/400/300',
    location: { name: 'N서울타워', distance: '1.8km' },
    locationPin: { id: 'place-n-seoul-tower', place_name: 'N서울타워', category_name: '관광지', address_name: '서울 용산구 남산공원길 105', road_address_name: '서울 용산구 남산공원길 105', x: '126.9882', y: '37.5512' },
    tags: ['#남산타워', '#서울야경', '#데이트코스'],
    likes: 103,
    comments: 22,
    timeAgo: '어제',
    contentType: '관광지',
  },
];

// ── Mock stories ──────────────────────────────────────────────────────────────

interface MockStory {
  id: string;
  nickname: string;
  avatarSeed: string;
  isSheriff: boolean;
  isOwn?: boolean;
}

const MOCK_STORIES: MockStory[] = [
  { id: 'own', nickname: '내 스토리', avatarSeed: 'me', isOwn: true, isSheriff: false },
  { id: 's1', nickname: '동네탐험가', avatarSeed: 'explorer', isSheriff: true },
  { id: 's2', nickname: '맛집헌터', avatarSeed: 'food', isSheriff: false },
  { id: 's3', nickname: '주말산책러', avatarSeed: 'walk', isSheriff: true },
  { id: 's4', nickname: '야경수집가', avatarSeed: 'night', isSheriff: true },
  { id: 's5', nickname: '문화인', avatarSeed: 'culture', isSheriff: false },
];

function StoryStrip() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={story.strip}
      contentContainerStyle={story.stripContent}
    >
      {MOCK_STORIES.map((s) => (
        <TouchableOpacity key={s.id} style={story.item} activeOpacity={0.8}>
          <View style={[story.avatarWrap, s.isSheriff && story.avatarSheriff]}>
            {s.isOwn ? (
              <View style={story.addWrap}>
                <Ionicons name="add" size={26} color="#FFAC30" />
              </View>
            ) : (
              <Image
                source={{ uri: `https://picsum.photos/seed/${s.avatarSeed}/80/80` }}
                style={story.avatar}
              />
            )}
          </View>
          <Text style={story.label} numberOfLines={1}>{s.nickname}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ── LassoIcon (Lucide lasso path, react-native-svg) ───────────────────────────

function LassoIcon({ size = 19, color = '#B89060' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M7 22a5 5 0 0 1-2-4" />
      <Path d="M3.3 14A6.8 6.8 0 0 1 2 10c0-4.4 4.5-8 10-8s10 3.6 10 8-4.5 8-10 8a12 12 0 0 1-5-1" />
      <Path d="M5 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
    </Svg>
  );
}

// ── PostCard ───────────────────────────────────────────────────────────────────

function PostCard({ post }: { post: MockPost }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes);

  const { savedPlaces, savePlace, unsavePlace } = useMapStore();
  const uid = useAuthStore((s) => s.user?.uid ?? s.kakaoUser?.id ?? null);

  const isSaved = post.locationPin
    ? savedPlaces.some((p) => p.id === post.locationPin!.id)
    : false;

  const toggleLike = () => {
    setLiked((v) => !v);
    setLikeCount((n) => n + (liked ? -1 : 1));
  };

  const toggleSavePlace = async () => {
    if (!post.locationPin) return;
    if (isSaved) {
      unsavePlace(post.locationPin.id);
      if (uid) await unsavePinFromFirestore(uid, post.locationPin.id).catch(() => {});
    } else {
      savePlace(post.locationPin);
      if (uid) {
        const pin = {
          id:       post.locationPin.id,
          type:     'saved' as const,
          lat:      parseFloat(post.locationPin.y),
          lng:      parseFloat(post.locationPin.x),
          title:    post.locationPin.place_name,
          subtitle: post.locationPin.road_address_name || post.locationPin.address_name,
        };
        await savePinToFirestore(uid, pin).catch(() => {});
      }
    }
  };

  return (
    <View style={[card.wrap, post.author.isSheriff && card.wrapSheriff]}>
      {/* Author row */}
      <View style={card.authorRow}>
        <View style={[card.avatar, post.author.isSheriff && card.avatarSheriff]}>
          <Ionicons name="person" size={18} color={post.author.isSheriff ? '#A36E1D' : '#B89060'} />
        </View>
        <View style={card.authorInfo}>
          <View style={card.authorNameRow}>
            <Text style={card.authorName}>{post.author.nickname}</Text>
            {post.author.isSheriff && (
              <View style={card.sheriffBadge}>
                <Ionicons name="shield-checkmark" size={11} color="#A36E1D" />
                <Text style={card.sheriffBadgeText}>보안관</Text>
              </View>
            )}
          </View>
          <Text style={card.meta}>{post.timeAgo} · {post.contentType}</Text>
        </View>
        <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="ellipsis-horizontal" size={18} color="#B89060" />
        </TouchableOpacity>
      </View>

      {/* Image */}
      {post.imageUri && (
        <Image source={{ uri: post.imageUri }} style={card.image} />
      )}

      {/* Content — hashtags stripped (shown as chips below) */}
      <Text style={card.content}>{post.content.replace(/#[\w가-힣]+/g, '').trim()}</Text>

      {/* Tags */}
      <View style={card.tagRow}>
        {post.tags.map((t) => (
          <Text key={t} style={card.tag}>{t}</Text>
        ))}
      </View>

      {/* Location */}
      <View style={card.locationRow}>
        <Ionicons name="location" size={13} color="#FFAC30" />
        <Text style={card.locationName}>{post.location.name}</Text>
        <View style={card.dot} />
        <Text style={card.locationDist}>{post.location.distance}</Text>
      </View>

      {/* Actions */}
      <View style={card.actions}>
        {/* Left — social */}
        <TouchableOpacity style={card.actionBtn} onPress={toggleLike}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? '#E05252' : '#B89060'} />
          <Text style={[card.actionText, liked && card.actionTextLiked]}>{likeCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={card.actionBtn}>
          <Ionicons name="chatbubble-outline" size={19} color="#B89060" />
          <Text style={card.actionText}>{post.comments}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={card.actionBtn} accessibilityLabel="공유">
          <Ionicons name="paper-plane-outline" size={19} color="#B89060" />
        </TouchableOpacity>

        {/* Right — save */}
        <View style={card.actionsRight}>
          {post.locationPin && (
            <TouchableOpacity
              style={card.actionBtn}
              onPress={toggleSavePlace}
              accessibilityLabel={isSaved ? '내 지도에서 제거' : '내 지도에 저장'}
            >
              <LassoIcon size={19} color={isSaved ? '#FFAC30' : '#B89060'} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={card.actionBtn} accessibilityLabel="북마크">
            <Ionicons name="bookmark-outline" size={19} color="#B89060" />
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

  const hasPosts = MOCK_POSTS.length > 0;

  const filtered = searchText.trim()
    ? MOCK_POSTS.filter((p) =>
        p.content.includes(searchText) ||
        p.location.name.includes(searchText) ||
        p.tags.some((t) => t.includes(searchText))
      )
    : MOCK_POSTS;

  return (
    <View style={styles.container}>
      {/* ── Search bar ── */}
      <View style={[styles.searchWrap, { paddingTop: insets.top + 12 }]}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={17} color="#B89060" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="게시물 검색"
            placeholderTextColor="#B89060"
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel="게시물 검색"
          />
        </View>
      </View>

      {/* ── Stories ── */}
      <StoryStrip />

      {/* ── Content ── */}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 96 }]}
        showsVerticalScrollIndicator={false}
      >
        {hasPosts ? (
          filtered.length > 0
            ? filtered.map((post) => <PostCard key={post.id} post={post} />)
            : (
              <View style={styles.noResult}>
                <Ionicons name="search" size={36} color="#B89060" />
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#EFE0C4',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EFE0C4',
  },
  sheriffBadgeText: {
    fontSize: 10,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#A36E1D',
  },
  meta: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#B89060',
  },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
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
    fontFamily: 'AppleSDGothicNeo-Medium',
    color: '#A36E1D',
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
    color: '#7A5C38',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#B89060',
  },
  locationDist: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#B89060',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#EFE0C4',
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
    color: '#B89060',
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
    backgroundColor: '#FFFFFF',
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
    color: '#B89060',
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
    borderColor: '#EFE0C4',
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
    color: '#7A5C38',
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
    shadowColor: '#A36E1D',
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
    shadowColor: '#A36E1D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
});

// ── Story styles ──────────────────────────────────────────────────────────────

const story = StyleSheet.create({
  strip: {
    borderBottomWidth: 1,
    borderBottomColor: '#D4D4D4',
  },
  stripContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },
  item: {
    alignItems: 'center',
    width: 64,
  },
  avatarWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#D4D4D4',
    overflow: 'hidden',
    marginBottom: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  avatarSheriff: {
    borderColor: '#FFAC30',
    borderWidth: 2.5,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  addWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#7A5C38',
    textAlign: 'center',
  },
});
