// 경로: app/create-post.tsx
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
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

const MAX_IMAGES = 5;
const MAX_CHARS  = 500;

interface SelectedPlace {
  name: string;
  address: string;
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

  const [images,  setImages]  = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [place,   setPlace]   = useState<SelectedPlace | null>(null);
  const [type,    setType]    = useState<'feed' | 'story'>('feed');
  const [posting, setPosting] = useState(false);

  const hashtags = parseHashtags(content);

  // ── Image picker ──────────────────────────────────────────────────────────────
  const pickImages = async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert('최대 5장까지 첨부할 수 있어요');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handlePost = async () => {
    if (!content.trim()) {
      Alert.alert('내용을 입력해주세요');
      return;
    }
    setPosting(true);
    try {
      // TODO: Firebase Storage upload + Firestore write
      Alert.alert('게시물이 작성됐어요!', '', [{ text: '확인', onPress: () => router.back() }]);
    } catch {
      Alert.alert('게시 실패', '다시 시도해주세요');
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
        {/* ── 피드 / 스토리 type toggle ── */}
        <View style={styles.typeRow}>
          {(['feed', 'story'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typeChip, type === t && styles.typeChipActive]}
              onPress={() => setType(t)}
            >
              <Ionicons
                name={t === 'feed' ? 'newspaper-outline' : 'time-outline'}
                size={14}
                color={type === t ? '#1A1108' : '#7A5C38'}
              />
              <Text style={[styles.typeChipText, type === t && styles.typeChipTextActive]}>
                {t === 'feed' ? '피드' : '스토리 (24h)'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Image strip ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.imageStrip}
          contentContainerStyle={styles.imageStripContent}
        >
          {/* Add button */}
          <TouchableOpacity style={styles.addImageBtn} onPress={pickImages}>
            <Ionicons name="camera-outline" size={28} color="#B89060" />
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
            placeholderTextColor="#B89060"
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
          onPress={() => Alert.alert('장소 검색', '장소 검색 기능은 곧 추가될 예정이에요')}
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
            <TouchableOpacity onPress={() => setPlace(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle-outline" size={18} color="#B89060" />
            </TouchableOpacity>
          ) : (
            <Ionicons name="chevron-forward" size={16} color="#B89060" />
          )}
        </TouchableOpacity>

        {/* ── Tips ── */}
        <View style={styles.tipsBox}>
          <Ionicons name="information-circle-outline" size={16} color="#A36E1D" />
          <Text style={styles.tipsText}>
            게시물을 작성하면 보안관 점수 +10점이 적립돼요
          </Text>
        </View>
      </ScrollView>
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

  // Type toggle
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4D4D4',
  },
  typeChipActive: {
    backgroundColor: '#FFAC30',
    borderColor: '#FFAC30',
  },
  typeChipText: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-Medium',
    color: '#7A5C38',
  },
  typeChipTextActive: {
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },

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
    color: '#B89060',
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
    color: '#B89060',
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
    color: '#A36E1D',
  },

  // Place
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
    color: '#7A5C38',
    marginTop: 2,
  },
  placePlaceholder: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#B89060',
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
    color: '#A36E1D',
    lineHeight: 20,
  },
});
