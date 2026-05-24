// 경로: app/create-post.tsx
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createPost } from '../src/api/posts';
import { useAuthStore } from '../src/store/authStore';

const MAX_IMAGES = 5;
const MAX_CHARS  = 500;
const KAKAO_REST_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY ?? '6d840fb987f5a8ffac05946ef5e9b00c';

interface KakaoPlaceItem {
  id: string;
  place_name: string;
  category_name: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
}

interface SelectedPlace {
  id: string;
  name: string;
  address: string;
  category: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
  lat: number;
  lng: number;
}

function parseHashtags(text: string): string[] {
  const matches = text.match(/#[\w가-힣]+/g) ?? [];
  return [...new Set(matches)];
}

export default function CreatePostScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const firebaseUser    = useAuthStore((s) => s.user);
  const kakaoUser       = useAuthStore((s) => s.kakaoUser);
  const storedNickname  = useAuthStore((s) => s.nickname);

  const [images,  setImages]  = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [place,   setPlace]   = useState<SelectedPlace | null>(null);
  const [posting, setPosting] = useState(false);

  // Place search modal state
  const [placeModalVisible, setPlaceModalVisible] = useState(false);
  const [placeSearchText,   setPlaceSearchText]   = useState('');
  const [placeResults,      setPlaceResults]      = useState<KakaoPlaceItem[]>([]);
  const [placeSearching,    setPlaceSearching]    = useState(false);

  const hashtags = parseHashtags(content);

  // ── Image picker ──────────────────────────────────────────────────────────────
  const pickImages = async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert('최대 5장까지 첨부할 수 있어요');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - images.length,
      quality: 0.85,
    });
    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setImages((prev) => [...prev, ...uris].slice(0, MAX_IMAGES));
    }
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Place search ──────────────────────────────────────────────────────────────
  const searchKakaoPlaces = async (query: string) => {
    if (!query.trim()) { setPlaceResults([]); return; }
    setPlaceSearching(true);
    try {
      const res = await fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=15`,
        { headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` } },
      );
      if (!res.ok) throw new Error(`검색 실패 (${res.status})`);
      const data = await res.json();
      setPlaceResults(data.documents ?? []);
    } catch {
      setPlaceResults([]);
    } finally {
      setPlaceSearching(false);
    }
  };

  const selectPlace = (item: KakaoPlaceItem) => {
    setPlace({
      id:                item.id,
      name:              item.place_name,
      address:           item.road_address_name || item.address_name,
      category:          item.category_name,
      address_name:      item.address_name,
      road_address_name: item.road_address_name,
      x:                 item.x,
      y:                 item.y,
      lat:               parseFloat(item.y),
      lng:               parseFloat(item.x),
    });
    setPlaceModalVisible(false);
    setPlaceSearchText('');
    setPlaceResults([]);
  };

  const closePlaceModal = () => {
    setPlaceModalVisible(false);
    setPlaceSearchText('');
    setPlaceResults([]);
  };

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handlePost = async () => {
    if (!content.trim()) {
      Alert.alert('내용을 입력해주세요');
      return;
    }
    const authorId = firebaseUser?.uid ?? (kakaoUser ? `kakao_${kakaoUser.id}` : null);
    if (!authorId) {
      Alert.alert('로그인이 필요해요');
      return;
    }
    const authorNickname = storedNickname ?? kakaoUser?.nickname ?? firebaseUser?.displayName ?? '익명';
    setPosting(true);
    try {
      await createPost({
        authorId,
        authorNickname,
        authorIsSheriff: false,
        type: 'feed',
        content,
        localImageUris: images,
        locationName: place?.name ?? '',
        locationPin: place ? {
          id:                place.id,
          place_name:        place.name,
          category_name:     place.category,
          address_name:      place.address_name,
          road_address_name: place.road_address_name,
          x:                 place.x,
          y:                 place.y,
        } : undefined,
        tags: parseHashtags(content),
      });
      Alert.alert('게시물이 작성됐어요!', '', [{ text: '확인', onPress: () => router.back() }]);
    } catch (e: any) {
      const msg = e?.code === 'permission-denied'
        ? '권한이 없어요. 로그아웃 후 다시 로그인해주세요.'
        : (e?.message ?? '다시 시도해주세요');
      Alert.alert('게시 실패', msg);
    } finally {
      setPosting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={24} color="#1A1108" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>게시물 작성</Text>
        <TouchableOpacity
          style={[styles.postBtn, posting && styles.postBtnDisabled]}
          onPress={handlePost}
          disabled={posting}
          accessibilityLabel="게시하기"
        >
          <Text style={styles.postBtnText}>{posting ? '게시 중…' : '게시하기'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Image strip ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.imageStrip}
          contentContainerStyle={styles.imageStripContent}
        >
          <TouchableOpacity style={styles.addImageBtn} onPress={pickImages}>
            <Ionicons name="camera-outline" size={28} color="#1A1108" />
            <Text style={styles.addImageCount}>{images.length}/{MAX_IMAGES}</Text>
          </TouchableOpacity>

          {images.map((uri, idx) => (
            <View key={uri} style={styles.imageTile}>
              <Image source={{ uri }} style={styles.imageTileImg} />
              <TouchableOpacity style={styles.imageTileRemove} onPress={() => removeImage(idx)}>
                <Ionicons name="close-circle" size={20} color="#E05252" />
              </TouchableOpacity>
              {idx === 0 && (
                <View style={styles.imageTileMain}>
                  <Text style={styles.imageTileMainText}>대표</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        {/* ── Content input ── */}
        <View style={styles.contentBox}>
          <TextInput
            style={styles.contentInput}
            placeholder={`동네 소식을 공유해보세요.\n#해시태그를 입력하면 자동으로 추가돼요`}
            placeholderTextColor="#9E9E9E"
            value={content}
            onChangeText={(t) => t.length <= MAX_CHARS && setContent(t)}
            multiline
            textAlignVertical="top"
            accessibilityLabel="게시물 내용"
          />
          <Text style={[styles.charCount, content.length >= MAX_CHARS && styles.charCountMax]}>
            {content.length}/{MAX_CHARS}
          </Text>
        </View>

        {/* ── Hashtag preview ── */}
        {hashtags.length > 0 && (
          <View style={styles.hashtagRow}>
            {hashtags.map((tag) => (
              <View key={tag} style={styles.hashtagChip}>
                <Text style={styles.hashtagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Place tag ── */}
        <TouchableOpacity
          style={styles.placeRow}
          onPress={() => setPlaceModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="location-outline" size={20} color="#FFAC30" />
          <View style={styles.placeInfo}>
            {place ? (
              <>
                <Text style={styles.placeName}>{place.name}</Text>
                <Text style={styles.placeAddr}>{place.address}</Text>
              </>
            ) : (
              <Text style={styles.placePlaceholder}>장소 태그하기</Text>
            )}
          </View>
          {place ? (
            <TouchableOpacity
              onPress={() => setPlace(null)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle-outline" size={18} color="#1A1108" />
            </TouchableOpacity>
          ) : (
            <Ionicons name="chevron-forward" size={16} color="#1A1108" />
          )}
        </TouchableOpacity>

        {/* ── Tips ── */}
        <View style={styles.tipsBox}>
          <Ionicons name="information-circle-outline" size={16} color="#1A1108" />
          <Text style={styles.tipsText}>
            게시물을 작성하면 보안관 점수 +10점이 적립돼요
          </Text>
        </View>
      </ScrollView>

      {/* ── Place search modal ── */}
      <Modal
        visible={placeModalVisible}
        animationType="slide"
        onRequestClose={closePlaceModal}
      >
        <View style={[styles.modalRoot, { paddingTop: insets.top }]}>
          {/* Modal header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={closePlaceModal}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={24} color="#1A1108" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>장소 검색</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Search bar */}
          <View style={styles.placeSearchBar}>
            <TextInput
              style={styles.placeSearchInput}
              placeholder="장소명, 주소를 입력하세요"
              placeholderTextColor="#9E9E9E"
              value={placeSearchText}
              onChangeText={setPlaceSearchText}
              onSubmitEditing={() => searchKakaoPlaces(placeSearchText)}
              returnKeyType="search"
              autoFocus
            />
            <TouchableOpacity
              style={styles.placeSearchBtn}
              onPress={() => searchKakaoPlaces(placeSearchText)}
            >
              <Ionicons name="search" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Results */}
          {placeSearching ? (
            <ActivityIndicator size="large" color="#FFAC30" style={{ marginTop: 48 }} />
          ) : (
            <FlatList
              data={placeResults}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.placeResultItem}
                  onPress={() => selectPlace(item)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="location" size={20} color="#FFAC30" style={styles.placeResultIcon} />
                  <View style={styles.placeResultInfo}>
                    <Text style={styles.placeResultName}>{item.place_name}</Text>
                    <Text style={styles.placeResultAddr} numberOfLines={1}>
                      {item.road_address_name || item.address_name}
                    </Text>
                    {item.category_name ? (
                      <Text style={styles.placeResultCat} numberOfLines={1}>{item.category_name}</Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => (
                <View style={styles.placeResultSep} />
              )}
              ListEmptyComponent={
                <View style={styles.placeEmptyBox}>
                  <Text style={styles.placeEmptyText}>
                    {placeSearchText.trim() ? '검색 결과가 없어요' : '장소 이름을 검색해보세요'}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#D4D4D4',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },
  postBtn: {
    backgroundColor: '#FFAC30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  postBtnDisabled: { opacity: 0.5 },
  postBtnText: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },

  scroll: { flex: 1 },
  content: { padding: 16, gap: 14 },

  // Image strip
  imageStrip: { marginHorizontal: -16 },
  imageStripContent: {
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 4,
  },
  addImageBtn: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4D4D4',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  addImageCount: {
    fontSize: 11,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#1A1108',
  },
  imageTile: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  imageTileImg: {
    width: '100%',
    height: '100%',
  },
  imageTileRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  imageTileMain: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  imageTileMainText: {
    fontSize: 10,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#FFFFFF',
  },

  // Content
  contentBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D4D4D4',
  },
  contentInput: {
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#1A1108',
    lineHeight: 24,
    minHeight: 140,
  },
  charCount: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#1A1108',
    textAlign: 'right',
    marginTop: 8,
  },
  charCountMax: { color: '#E05252' },

  // Hashtags
  hashtagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hashtagChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4D4D4',
  },
  hashtagText: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-Medium',
    color: '#1A1108',
  },

  // Place row
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D4D4D4',
  },
  placeInfo: { flex: 1 },
  placeName: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#1A1108',
  },
  placeAddr: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#6B6B6B',
    marginTop: 2,
  },
  placePlaceholder: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#9E9E9E',
  },

  // Tips
  tipsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D4D4D4',
  },
  tipsText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#1A1108',
    lineHeight: 20,
  },

  // Place search modal
  modalRoot: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#D4D4D4',
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },
  placeSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#D4D4D4',
  },
  placeSearchInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#1A1108',
  },
  placeSearchBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#FFAC30',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeResultItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  placeResultIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  placeResultInfo: { flex: 1 },
  placeResultName: {
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#1A1108',
    marginBottom: 3,
  },
  placeResultAddr: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#6B6B6B',
    marginBottom: 2,
  },
  placeResultCat: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#9E9E9E',
  },
  placeResultSep: {
    height: 1,
    backgroundColor: '#F5F5F5',
    marginHorizontal: 16,
  },
  placeEmptyBox: {
    alignItems: 'center',
    paddingTop: 64,
  },
  placeEmptyText: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#9E9E9E',
  },
});
