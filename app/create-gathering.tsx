// 경로: app/create-gathering.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
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

const MAX_DESC_CHARS  = 300;
const MAX_TITLE_CHARS = 40;

const CATEGORIES = [
  { icon: 'walk' as const,            label: '산책·운동' },
  { icon: 'restaurant' as const,      label: '맛집' },
  { icon: 'musical-notes' as const,   label: '문화·예술' },
  { icon: 'book' as const,            label: '스터디' },
  { icon: 'game-controller' as const, label: '취미' },
  { icon: 'heart' as const,           label: '봉사' },
];

const DEADLINE_OPTIONS = [
  { label: '1시간 후',  hours: 1 },
  { label: '2시간 후',  hours: 2 },
  { label: '3시간 후',  hours: 3 },
  { label: '6시간 후',  hours: 6 },
  { label: '오늘 자정', hours: -1 },
];

function parseHashtags(text: string): string[] {
  const matches = text.match(/#[\w가-힣]+/g) ?? [];
  return [...new Set(matches)];
}

interface SelectedPlace { name: string; address: string; }

export default function CreateGatheringScreen() {
  const insets    = useSafeAreaInsets();
  const router    = useRouter();

  const [meetingType,  setMeetingType]  = useState<'regular' | 'flash'>('regular');
  const [deadline,     setDeadline]     = useState('');
  const [category,     setCategory]     = useState('');
  const [title,        setTitle]        = useState('');
  const [description,  setDescription]  = useState('');
  const [place,        setPlace]        = useState<SelectedPlace | null>(null);
  const [meetingAt,    setMeetingAt]    = useState('');
  const [maxMembers,   setMaxMembers]   = useState(4);
  const [submitting,   setSubmitting]   = useState(false);

  const hashtags = parseHashtags(description);

  const adjustMembers = (delta: number) =>
    setMaxMembers((n) => Math.min(20, Math.max(2, n + delta)));

  const handleSubmit = async () => {
    if (!category)          { Alert.alert('카테고리를 선택해주세요');          return; }
    if (!title.trim())       { Alert.alert('제목을 입력해주세요');              return; }
    if (!description.trim()) { Alert.alert('모임 소개를 입력해주세요');         return; }
    if (!meetingAt)          { Alert.alert('모임 날짜와 시간을 선택해주세요');   return; }
    if (meetingType === 'flash' && !deadline) {
      Alert.alert('마감 시간을 선택해주세요');
      return;
    }
    setSubmitting(true);
    try {
      // TODO: Firestore write
      Alert.alert('모임이 만들어졌어요!', '', [{ text: '확인', onPress: () => router.back() }]);
    } catch {
      Alert.alert('오류가 발생했어요', '다시 시도해주세요');
    } finally {
      setSubmitting(false);
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
        <Text style={styles.headerTitle}>모임 만들기</Text>
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          accessibilityLabel="모임 만들기"
        >
          <Text style={styles.submitBtnText}>{submitting ? '만드는 중…' : '만들기'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── 모임 유형 ── */}
        <Text style={styles.fieldLabel}>모임 유형</Text>
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[styles.typeChip, meetingType === 'regular' && styles.typeChipActive]}
            onPress={() => { setMeetingType('regular'); setDeadline(''); }}
          >
            <Ionicons
              name="calendar-outline"
              size={15}
              color={meetingType === 'regular' ? '#1A1108' : '#7A5C38'}
            />
            <Text style={[styles.typeChipText, meetingType === 'regular' && styles.typeChipTextActive]}>
              정기 모임
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.typeChip, meetingType === 'flash' && styles.typeChipFlashActive]}
            onPress={() => setMeetingType('flash')}
          >
            <Ionicons
              name="flash"
              size={15}
              color={meetingType === 'flash' ? '#1A1108' : '#7A5C38'}
            />
            <Text style={[styles.typeChipText, meetingType === 'flash' && styles.typeChipTextActive]}>
              번개 모임
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── 마감 시간 (번개모임 전용) ── */}
        {meetingType === 'flash' && (
          <>
            <Text style={styles.fieldLabel}>마감 시간</Text>
            <View style={styles.deadlineRow}>
              {DEADLINE_OPTIONS.map((opt) => {
                const active = deadline === opt.label;
                return (
                  <TouchableOpacity
                    key={opt.label}
                    style={[styles.deadlineChip, active && styles.deadlineChipActive]}
                    onPress={() => setDeadline(opt.label)}
                  >
                    <Ionicons name="flash" size={13} color={active ? '#1A1108' : '#A36E1D'} />
                    <Text style={[styles.deadlineChipText, active && styles.deadlineChipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.flashNote}>
              <Ionicons name="information-circle-outline" size={15} color="#A36E1D" />
              <Text style={styles.flashNoteText}>
                마감 시간이 지나면 모임이 자동으로 삭제돼요
              </Text>
            </View>
          </>
        )}

        {/* ── 카테고리 ── */}
        <Text style={styles.fieldLabel}>카테고리</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.catStrip}
          contentContainerStyle={styles.catStripContent}
        >
          {CATEGORIES.map((c) => {
            const active = category === c.label;
            return (
              <TouchableOpacity
                key={c.label}
                style={[styles.catChip, active && styles.catChipActive]}
                onPress={() => setCategory(c.label)}
                accessibilityLabel={c.label}
              >
                <Ionicons name={c.icon} size={15} color={active ? '#1A1108' : '#A36E1D'} />
                <Text style={[styles.catChipText, active && styles.catChipTextActive]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── 제목 ── */}
        <Text style={styles.fieldLabel}>제목</Text>
        <View style={styles.inputBox}>
          <TextInput
            style={styles.titleInput}
            placeholder="모임 제목을 입력해주세요"
            placeholderTextColor="#B89060"
            value={title}
            onChangeText={(t) => t.length <= MAX_TITLE_CHARS && setTitle(t)}
            returnKeyType="next"
            accessibilityLabel="모임 제목"
          />
          <Text style={[styles.charCount, title.length >= MAX_TITLE_CHARS && styles.charCountMax]}>
            {title.length}/{MAX_TITLE_CHARS}
          </Text>
        </View>

        {/* ── 모임 소개 ── */}
        <Text style={styles.fieldLabel}>모임 소개</Text>
        <View style={styles.inputBox}>
          <TextInput
            style={styles.descInput}
            placeholder={`모임을 소개해주세요.\n#해시태그를 입력하면 자동으로 추가돼요`}
            placeholderTextColor="#B89060"
            value={description}
            onChangeText={(t) => t.length <= MAX_DESC_CHARS && setDescription(t)}
            multiline
            textAlignVertical="top"
            accessibilityLabel="모임 소개"
          />
          <Text style={[styles.charCount, description.length >= MAX_DESC_CHARS && styles.charCountMax]}>
            {description.length}/{MAX_DESC_CHARS}
          </Text>
        </View>

        {/* ── 해시태그 미리보기 ── */}
        {hashtags.length > 0 && (
          <View style={styles.hashtagRow}>
            {hashtags.map((tag) => (
              <View key={tag} style={styles.hashtagChip}>
                <Text style={styles.hashtagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── 장소 ── */}
        <Text style={styles.fieldLabel}>장소</Text>
        <TouchableOpacity
          style={styles.rowCard}
          onPress={() => Alert.alert('장소 검색', '장소 검색 기능은 곧 추가될 예정이에요')}
          activeOpacity={0.8}
        >
          <Ionicons name="location-outline" size={20} color="#FFAC30" />
          <View style={styles.rowCardInfo}>
            {place ? (
              <>
                <Text style={styles.rowCardTitle}>{place.name}</Text>
                <Text style={styles.rowCardSub}>{place.address}</Text>
              </>
            ) : (
              <Text style={styles.rowCardPlaceholder}>장소 태그하기</Text>
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

        {/* ── 날짜·시간 ── */}
        <Text style={styles.fieldLabel}>날짜 및 시간</Text>
        <TouchableOpacity
          style={styles.rowCard}
          onPress={() => Alert.alert('날짜 선택', '날짜 선택 기능은 곧 추가될 예정이에요')}
          activeOpacity={0.8}
        >
          <Ionicons name="calendar-outline" size={20} color="#FFAC30" />
          <View style={styles.rowCardInfo}>
            {meetingAt ? (
              <Text style={styles.rowCardTitle}>{meetingAt}</Text>
            ) : (
              <Text style={styles.rowCardPlaceholder}>날짜와 시간을 선택해주세요</Text>
            )}
          </View>
          {meetingAt ? (
            <TouchableOpacity onPress={() => setMeetingAt('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle-outline" size={18} color="#B89060" />
            </TouchableOpacity>
          ) : (
            <Ionicons name="chevron-forward" size={16} color="#B89060" />
          )}
        </TouchableOpacity>

        {/* ── 최대 인원 ── */}
        <Text style={styles.fieldLabel}>최대 인원</Text>
        <View style={styles.rowCard}>
          <Ionicons name="people-outline" size={20} color="#FFAC30" />
          <Text style={styles.rowCardTitle}>최대 인원</Text>
          <View style={styles.memberCounter}>
            <TouchableOpacity
              style={[styles.counterBtn, maxMembers <= 2 && styles.counterBtnDisabled]}
              onPress={() => adjustMembers(-1)}
              disabled={maxMembers <= 2}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="remove" size={18} color={maxMembers <= 2 ? '#D4D4D4' : '#1A1108'} />
            </TouchableOpacity>
            <Text style={styles.counterValue}>{maxMembers}</Text>
            <TouchableOpacity
              style={[styles.counterBtn, maxMembers >= 20 && styles.counterBtnDisabled]}
              onPress={() => adjustMembers(1)}
              disabled={maxMembers >= 20}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="add" size={18} color={maxMembers >= 20 ? '#D4D4D4' : '#1A1108'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Tips ── */}
        <View style={styles.tipsBox}>
          <Ionicons name="information-circle-outline" size={16} color="#A36E1D" />
          <Text style={styles.tipsText}>
            모임을 생성하면 보안관 점수 +15점이 적립돼요
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFE0C4',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },
  submitBtn: {
    backgroundColor: '#FFAC30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },

  scroll: { flex: 1 },
  content: { padding: 16, gap: 10 },

  fieldLabel: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#8A6030',
    letterSpacing: 0.4,
    marginTop: 6,
    marginBottom: 2,
  },

  // ── Type toggle ──
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE0C4',
  },
  typeChipActive: {
    backgroundColor: '#FFAC30',
    borderColor: '#FFAC30',
  },
  typeChipFlashActive: {
    backgroundColor: '#FF8C00',
    borderColor: '#FF8C00',
  },
  typeChipText: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Medium',
    color: '#7A5C38',
  },
  typeChipTextActive: {
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },

  // ── Deadline chips ──
  deadlineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  deadlineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EFE0C4',
    backgroundColor: '#FFFFFF',
  },
  deadlineChipActive: {
    backgroundColor: '#FF8C00',
    borderColor: '#FF8C00',
  },
  deadlineChipText: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-Medium',
    color: '#A36E1D',
  },
  deadlineChipTextActive: {
    color: '#1A1108',
    fontFamily: 'AppleSDGothicNeo-Bold',
  },

  // ── Flash note ──
  flashNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#FFD580',
  },
  flashNoteText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#A36E1D',
    lineHeight: 18,
  },

  // ── Category strip ──
  catStrip: { marginHorizontal: -16 },
  catStripContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EFE0C4',
    backgroundColor: '#FFFFFF',
  },
  catChipActive: { backgroundColor: '#FFAC30', borderColor: '#FFAC30' },
  catChipText: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-Medium',
    color: '#A36E1D',
  },
  catChipTextActive: { color: '#1A1108', fontFamily: 'AppleSDGothicNeo-Bold' },

  // ── Input boxes ──
  inputBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFE0C4',
  },
  titleInput: {
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#1A1108',
  },
  descInput: {
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#1A1108',
    lineHeight: 24,
    minHeight: 110,
  },
  charCount: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#B89060',
    textAlign: 'right',
    marginTop: 8,
  },
  charCountMax: { color: '#E05252' },

  // ── Hashtag preview ──
  hashtagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hashtagChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFE0C4',
  },
  hashtagText: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-Medium',
    color: '#A36E1D',
  },

  // ── Row cards ──
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFE0C4',
  },
  rowCardInfo: { flex: 1 },
  rowCardTitle: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#1A1108',
  },
  rowCardSub: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#7A5C38',
    marginTop: 2,
  },
  rowCardPlaceholder: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#B89060',
  },

  // ── Member counter ──
  memberCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 4,
  },
  counterBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE0C4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterBtnDisabled: { borderColor: '#F0F0F0' },
  counterValue: {
    fontSize: 16,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
    minWidth: 28,
    textAlign: 'center',
  },

  // ── Tips ──
  tipsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFE0C4',
    marginTop: 6,
  },
  tipsText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#A36E1D',
    lineHeight: 20,
  },
});
