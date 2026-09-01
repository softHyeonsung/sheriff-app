// 경로: app/create-gathering.tsx
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
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
import { createGathering } from '../src/api/gatherings';
import { useAuthStore } from '../src/store/authStore';

// ── Constants ──────────────────────────────────────────────────────────────────

const MAX_DESC_CHARS  = 300;
const MAX_TITLE_CHARS = 40;
const KAKAO_REST_KEY  = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY ?? '';

const AMPM_ITEMS  = ['오전', '오후'];
const HOUR_ITEMS  = ['1','2','3','4','5','6','7','8','9','10','11','12'];
const MIN_ITEMS   = ['00','05','10','15','20','25','30','35','40','45','50','55'];
const WEEK_DAYS   = ['월','화','수','목','금','토','일'];
const CAL_HEADERS = ['일','월','화','수','목','금','토'];
const ITEM_H      = 52;

const { width: SCREEN_W } = Dimensions.get('window');
const CAL_CELL = Math.floor((SCREEN_W - 48) / 7);

// ── DrumPicker ─────────────────────────────────────────────────────────────────

interface DrumPickerProps {
  items: string[];
  selectedIndex: number;
  onChange: (i: number) => void;
  width?: number;
}

function DrumPicker({ items, selectedIndex, onChange, width = 80 }: DrumPickerProps) {
  const scrollRef = useRef<ScrollView>(null);

  const snapTo = useCallback((idx: number, animated = true) => {
    scrollRef.current?.scrollTo({ y: idx * ITEM_H, animated });
  }, []);

  const handleEnd = useCallback((y: number) => {
    const i = Math.max(0, Math.min(items.length - 1, Math.round(y / ITEM_H)));
    onChange(i);
    snapTo(i);
  }, [items.length, onChange, snapTo]);

  return (
    <View style={{ width, height: ITEM_H * 5, overflow: 'hidden' }}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        onLayout={() => snapTo(selectedIndex, false)}
        onMomentumScrollEnd={(e) => handleEnd(e.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(e) => handleEnd(e.nativeEvent.contentOffset.y)}
        contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
      >
        {items.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={{ height: ITEM_H, justifyContent: 'center', alignItems: 'center' }}
            activeOpacity={0.7}
            onPress={() => { onChange(i); snapTo(i); }}
          >
            <Text style={[drumSt.item, i === selectedIndex && drumSt.itemSel]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { justifyContent: 'center' }]}>
        <View style={drumSt.selBar} />
      </View>
    </View>
  );
}

const drumSt = StyleSheet.create({
  item:   { fontSize: 20, fontFamily: 'AppleSDGothicNeo-Regular', color: '#B89060' },
  itemSel:{ fontSize: 22, fontFamily: 'AppleSDGothicNeo-Bold',    color: '#1A1108' },
  selBar: { height: ITEM_H, borderTopWidth: 1.5, borderBottomWidth: 1.5, borderColor: '#FFAC30' },
});

// ── Calendar helpers ───────────────────────────────────────────────────────────

function buildCalendarCells(year: number, month: number): (number | null)[] {
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// ── Types ──────────────────────────────────────────────────────────────────────

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
  lat: number;
  lng: number;
}

const CATEGORIES = [
  { icon: 'walk' as const,            label: '산책·운동' },
  { icon: 'restaurant' as const,      label: '맛집' },
  { icon: 'musical-notes' as const,   label: '문화·예술' },
  { icon: 'book' as const,            label: '스터디' },
  { icon: 'game-controller' as const, label: '취미' },
  { icon: 'heart' as const,           label: '봉사' },
];

const DEADLINE_OPTIONS = [
  { label: '1시간 후',  hours: 1  },
  { label: '2시간 후',  hours: 2  },
  { label: '3시간 후',  hours: 3  },
  { label: '6시간 후',  hours: 6  },
  { label: '오늘 자정', hours: -1 },
];

function parseHashtags(text: string): string[] {
  const matches = text.match(/#[\w가-힣]+/g) ?? [];
  return [...new Set(matches)];
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function CreateGatheringScreen() {
  const insets         = useSafeAreaInsets();
  const router         = useRouter();
  const firebaseUser   = useAuthStore((s) => s.user);
  const kakaoUser      = useAuthStore((s) => s.kakaoUser);
  const storedNickname = useAuthStore((s) => s.nickname);

  const [meetingType,   setMeetingType]   = useState<'regular' | 'flash'>('regular');
  const [deadline,      setDeadline]      = useState('');
  const [category,      setCategory]      = useState('');
  const [title,         setTitle]         = useState('');
  const [description,   setDescription]   = useState('');
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null);
  const [meetingAt,     setMeetingAt]     = useState('');
  const [maxMembers,    setMaxMembers]    = useState(4);
  const [submitting,    setSubmitting]    = useState(false);

  // Place search
  const [placeModal,   setPlaceModal]   = useState(false);
  const [placeQuery,   setPlaceQuery]   = useState('');
  const [placeResults, setPlaceResults] = useState<KakaoPlaceItem[]>([]);
  const [placeLoading, setPlaceLoading] = useState(false);

  // Date/time picker
  const [datePickerModal, setDatePickerModal] = useState(false);
  const [pickerStep,      setPickerStep]      = useState<'date' | 'time'>('date');
  const [calMonth,        setCalMonth]        = useState(() => new Date());
  const [selectedDate,    setSelectedDate]    = useState<Date | null>(null);
  const [selectedDays,    setSelectedDays]    = useState<string[]>([]);
  const [selAmPm,         setSelAmPm]         = useState(0);
  const [selHour,         setSelHour]         = useState(8);  // index → hour = selHour+1
  const [selMinute,       setSelMinute]       = useState(0);  // index → min  = selMinute*5

  const hashtags = parseHashtags(description);

  const adjustMembers = (delta: number) =>
    setMaxMembers((n) => Math.min(20, Math.max(2, n + delta)));

  const handleMeetingTypeChange = (type: 'regular' | 'flash') => {
    setMeetingType(type);
    setMeetingAt('');
    setSelectedDate(null);
    setSelectedDays([]);
    if (type !== 'flash') setDeadline('');
  };

  const openDatePicker = () => {
    setPickerStep(meetingType === 'flash' ? 'date' : 'time');
    setDatePickerModal(true);
  };

  const toggleDay = (day: string) =>
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );

  const confirmPicker = () => {
    const timeStr = `${AMPM_ITEMS[selAmPm]} ${HOUR_ITEMS[selHour]}:${MIN_ITEMS[selMinute]}`;
    if (meetingType === 'regular') {
      if (selectedDays.length === 0) { Alert.alert('요일을 하나 이상 선택해주세요'); return; }
      const sorted = WEEK_DAYS.filter((d) => selectedDays.includes(d));
      setMeetingAt(`매주 ${sorted.join('·')} ${timeStr}`);
    } else {
      if (!selectedDate) { Alert.alert('날짜를 선택해주세요'); return; }
      const mo = selectedDate.getMonth() + 1;
      const d  = selectedDate.getDate();
      setMeetingAt(`${mo}월 ${d}일 ${timeStr}`);
    }
    setDatePickerModal(false);
  };

  // Calendar
  const calYear = calMonth.getFullYear();
  const calMo   = calMonth.getMonth();
  const cells   = buildCalendarCells(calYear, calMo);
  const todayMs = (() => { const t = new Date(); t.setHours(0,0,0,0); return t.getTime(); })();

  const isDisabled  = (d: number) => new Date(calYear, calMo, d).getTime() < todayMs;
  const isSelected  = (d: number) =>
    !!selectedDate &&
    selectedDate.getFullYear() === calYear &&
    selectedDate.getMonth()    === calMo &&
    selectedDate.getDate()     === d;
  const isTodayCell = (d: number) => {
    const t = new Date();
    return t.getFullYear() === calYear && t.getMonth() === calMo && t.getDate() === d;
  };

  const searchPlaces = async (q: string) => {
    if (!q.trim()) { setPlaceResults([]); return; }
    setPlaceLoading(true);
    try {
      const res = await fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(q)}&size=15`,
        { headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` } },
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPlaceResults(data.documents ?? []);
    } catch {
      setPlaceResults([]);
    } finally {
      setPlaceLoading(false);
    }
  };

  const selectPlace = (item: KakaoPlaceItem) => {
    setSelectedPlace({
      id: item.id, name: item.place_name,
      address: item.road_address_name || item.address_name,
      lat: parseFloat(item.y), lng: parseFloat(item.x),
    });
    setPlaceModal(false);
    setPlaceQuery('');
    setPlaceResults([]);
  };

  const closePlaceModal = () => {
    setPlaceModal(false);
    setPlaceQuery('');
    setPlaceResults([]);
  };

  const handleSubmit = async () => {
    if (!category)          { Alert.alert('카테고리를 선택해주세요'); return; }
    if (!title.trim())       { Alert.alert('제목을 입력해주세요');    return; }
    if (!description.trim()) { Alert.alert('모임 소개를 입력해주세요'); return; }
    if (!meetingAt) {
      Alert.alert(meetingType === 'regular' ? '요일과 시간을 선택해주세요' : '날짜와 시간을 선택해주세요');
      return;
    }
    if (meetingType === 'flash' && !deadline) { Alert.alert('마감 시간을 선택해주세요'); return; }

    const uid = firebaseUser?.uid ?? (kakaoUser ? `kakao_${kakaoUser.id}` : null);
    if (!uid) { Alert.alert('로그인이 필요해요'); return; }
    const nickname = storedNickname ?? kakaoUser?.nickname ?? firebaseUser?.displayName ?? '익명';

    setSubmitting(true);
    try {
      let lat = 37.5665, lng = 126.9780, locName = '장소 미정';
      if (selectedPlace) {
        lat = selectedPlace.lat; lng = selectedPlace.lng; locName = selectedPlace.name;
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync().catch(() => ({ status: 'denied' as const }));
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null);
          if (pos) { lat = pos.coords.latitude; lng = pos.coords.longitude; }
        }
      }
      await createGathering({
        hostId: uid, hostNickname: nickname, hostIsSheriff: false,
        type: meetingType, deadlineLabel: deadline || undefined,
        title: title.trim(), description: description.trim(), category,
        locationName: locName, locationLat: lat, locationLng: lng,
        tags: parseHashtags(description), maxMembers, meetingAt,
      });
      Alert.alert('모임이 만들어졌어요!', '', [{ text: '확인', onPress: () => router.back() }]);
    } catch {
      Alert.alert('오류가 발생했어요', '다시 시도해주세요');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
          <Ionicons name="close" size={24} color="#1A1108" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>모임 만들기</Text>
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
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
        {/* 모임 유형 */}
        <Text style={styles.fieldLabel}>모임 유형</Text>
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[styles.typeChip, meetingType === 'regular' && styles.typeChipActive]}
            onPress={() => handleMeetingTypeChange('regular')}
          >
            <Ionicons name="calendar-outline" size={15} color="#1A1108" />
            <Text style={[styles.typeChipText, meetingType === 'regular' && styles.typeChipTextActive]}>정기 모임</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeChip, meetingType === 'flash' && styles.typeChipFlashActive]}
            onPress={() => handleMeetingTypeChange('flash')}
          >
            <Ionicons name="flash" size={15} color="#1A1108" />
            <Text style={[styles.typeChipText, meetingType === 'flash' && styles.typeChipTextActive]}>번개 모임</Text>
          </TouchableOpacity>
        </View>

        {/* 마감 시간 (번개) */}
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
                    <Ionicons name="flash" size={13} color="#1A1108" />
                    <Text style={[styles.deadlineChipText, active && styles.deadlineChipTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.flashNote}>
              <Ionicons name="information-circle-outline" size={15} color="#1A1108" />
              <Text style={styles.flashNoteText}>마감 시간이 지나면 모임이 자동으로 삭제돼요</Text>
            </View>
          </>
        )}

        {/* 카테고리 */}
        <Text style={styles.fieldLabel}>카테고리</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catStrip} contentContainerStyle={styles.catStripContent}>
          {CATEGORIES.map((c) => {
            const active = category === c.label;
            return (
              <TouchableOpacity
                key={c.label}
                style={[styles.catChip, active && styles.catChipActive]}
                onPress={() => setCategory(c.label)}
              >
                <Ionicons name={c.icon} size={15} color="#1A1108" />
                <Text style={[styles.catChipText, active && styles.catChipTextActive]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 제목 */}
        <Text style={styles.fieldLabel}>제목</Text>
        <View style={styles.inputBox}>
          <TextInput
            style={styles.titleInput}
            placeholder="모임 제목을 입력해주세요"
            placeholderTextColor="#7A5C38"
            value={title}
            onChangeText={(t) => t.length <= MAX_TITLE_CHARS && setTitle(t)}
            returnKeyType="next"
          />
          <Text style={[styles.charCount, title.length >= MAX_TITLE_CHARS && styles.charCountMax]}>
            {title.length}/{MAX_TITLE_CHARS}
          </Text>
        </View>

        {/* 모임 소개 */}
        <Text style={styles.fieldLabel}>모임 소개</Text>
        <View style={styles.inputBox}>
          <TextInput
            style={styles.descInput}
            placeholder={`모임을 소개해주세요.\n#해시태그를 입력하면 자동으로 추가돼요`}
            placeholderTextColor="#7A5C38"
            value={description}
            onChangeText={(t) => t.length <= MAX_DESC_CHARS && setDescription(t)}
            multiline
            textAlignVertical="top"
          />
          <Text style={[styles.charCount, description.length >= MAX_DESC_CHARS && styles.charCountMax]}>
            {description.length}/{MAX_DESC_CHARS}
          </Text>
        </View>

        {hashtags.length > 0 && (
          <View style={styles.hashtagRow}>
            {hashtags.map((tag) => (
              <View key={tag} style={styles.hashtagChip}>
                <Text style={styles.hashtagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 장소 */}
        <Text style={styles.fieldLabel}>장소</Text>
        <TouchableOpacity style={styles.rowCard} onPress={() => setPlaceModal(true)} activeOpacity={0.8}>
          <Ionicons name="location-outline" size={20} color="#FFAC30" />
          <View style={{ flex: 1 }}>
            {selectedPlace ? (
              <>
                <Text style={styles.rowCardTitle}>{selectedPlace.name}</Text>
                <Text style={styles.rowCardSub}>{selectedPlace.address}</Text>
              </>
            ) : (
              <Text style={styles.rowCardPlaceholder}>장소 검색 (예: 한강공원 여의도)</Text>
            )}
          </View>
          {selectedPlace ? (
            <TouchableOpacity onPress={() => setSelectedPlace(null)} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
              <Ionicons name="close-circle-outline" size={18} color="#1A1108" />
            </TouchableOpacity>
          ) : (
            <Ionicons name="chevron-forward" size={16} color="#7A5C38" />
          )}
        </TouchableOpacity>

        {/* 날짜·시간 */}
        <Text style={styles.fieldLabel}>
          {meetingType === 'regular' ? '요일 및 시간' : '날짜 및 시간'}
        </Text>
        <TouchableOpacity style={styles.rowCard} onPress={openDatePicker} activeOpacity={0.8}>
          <Ionicons name="calendar-outline" size={20} color="#FFAC30" />
          <Text style={[styles.rowCardTitle, { flex: 1 }, !meetingAt && styles.rowCardPlaceholder]}>
            {meetingAt || (meetingType === 'regular' ? '요일과 시간을 선택해주세요' : '날짜와 시간을 선택해주세요')}
          </Text>
          {meetingAt ? (
            <TouchableOpacity onPress={() => setMeetingAt('')} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
              <Ionicons name="close-circle-outline" size={18} color="#1A1108" />
            </TouchableOpacity>
          ) : (
            <Ionicons name="chevron-forward" size={16} color="#7A5C38" />
          )}
        </TouchableOpacity>

        {/* 최대 인원 */}
        <Text style={styles.fieldLabel}>최대 인원</Text>
        <View style={styles.rowCard}>
          <Ionicons name="people-outline" size={20} color="#FFAC30" />
          <Text style={styles.rowCardTitle}>최대 인원</Text>
          <View style={styles.memberCounter}>
            <TouchableOpacity
              style={[styles.counterBtn, maxMembers <= 2 && styles.counterBtnDisabled]}
              onPress={() => adjustMembers(-1)} disabled={maxMembers <= 2}
              hitSlop={{ top:8, bottom:8, left:8, right:8 }}
            >
              <Ionicons name="remove" size={18} color={maxMembers <= 2 ? '#D4D4D4' : '#1A1108'} />
            </TouchableOpacity>
            <Text style={styles.counterValue}>{maxMembers}</Text>
            <TouchableOpacity
              style={[styles.counterBtn, maxMembers >= 20 && styles.counterBtnDisabled]}
              onPress={() => adjustMembers(1)} disabled={maxMembers >= 20}
              hitSlop={{ top:8, bottom:8, left:8, right:8 }}
            >
              <Ionicons name="add" size={18} color={maxMembers >= 20 ? '#D4D4D4' : '#1A1108'} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tipsBox}>
          <Ionicons name="information-circle-outline" size={16} color="#1A1108" />
          <Text style={styles.tipsText}>모임을 생성하면 보안관 점수 +15점이 적립돼요</Text>
        </View>
      </ScrollView>

      {/* ── Date/Time Picker Modal ────────────────────────────────────────────── */}
      <Modal visible={datePickerModal} animationType="slide" onRequestClose={() => setDatePickerModal(false)}>
        <View style={[styles.modalRoot, { paddingTop: insets.top }]}>

          {/* Modal header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                if (meetingType === 'flash' && pickerStep === 'time') {
                  setPickerStep('date');
                } else {
                  setDatePickerModal(false);
                }
              }}
              hitSlop={{ top:8, bottom:8, left:8, right:8 }}
            >
              <Ionicons name="arrow-back" size={24} color="#1A1108" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {meetingType === 'regular'
                ? '요일 및 시간 설정'
                : pickerStep === 'date' ? '날짜 선택' : '시간 선택'}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {/* ── 번개: 달력 (step=date) ── */}
          {meetingType === 'flash' && pickerStep === 'date' && (
            <ScrollView contentContainerStyle={styles.pickerBody} showsVerticalScrollIndicator={false}>
              {/* Month navigation */}
              <View style={styles.calNavRow}>
                <TouchableOpacity onPress={() => setCalMonth(new Date(calYear, calMo - 1, 1))} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
                  <Ionicons name="chevron-back" size={22} color="#1A1108" />
                </TouchableOpacity>
                <Text style={styles.calMonthLabel}>{calYear}년 {calMo + 1}월</Text>
                <TouchableOpacity onPress={() => setCalMonth(new Date(calYear, calMo + 1, 1))} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
                  <Ionicons name="chevron-forward" size={22} color="#1A1108" />
                </TouchableOpacity>
              </View>

              {/* Weekday headers */}
              <View style={styles.calWeekRow}>
                {CAL_HEADERS.map((h, i) => (
                  <View key={h} style={styles.calHeaderCell}>
                    <Text style={[styles.calWeekLabel, i === 0 && styles.calSunLabel]}>{h}</Text>
                  </View>
                ))}
              </View>

              {/* Date grid */}
              <View style={styles.calGrid}>
                {cells.map((cell, idx) => {
                  if (!cell) return <View key={`e-${idx}`} style={styles.calCell} />;
                  const disabled = isDisabled(cell);
                  const selected = isSelected(cell);
                  const todayCell = isTodayCell(cell);
                  return (
                    <TouchableOpacity
                      key={`d-${cell}`}
                      style={[
                        styles.calCell,
                        selected  && styles.calCellSelected,
                        todayCell && !selected && styles.calCellToday,
                      ]}
                      onPress={() => !disabled && setSelectedDate(new Date(calYear, calMo, cell))}
                      activeOpacity={disabled ? 1 : 0.7}
                      disabled={disabled}
                    >
                      <Text style={[
                        styles.calDayText,
                        selected  && styles.calDayTextSelected,
                        disabled  && styles.calDayTextDisabled,
                        idx % 7 === 0 && !disabled && !selected && styles.calSunText,
                      ]}>
                        {cell}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[styles.pickerNextBtn, !selectedDate && styles.pickerNextBtnDisabled]}
                onPress={() => selectedDate && setPickerStep('time')}
                disabled={!selectedDate}
              >
                <Text style={styles.pickerNextBtnText}>다음 — 시간 선택</Text>
                <Ionicons name="arrow-forward" size={18} color="#1A1108" />
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* ── 번개: 시간 드럼 (step=time) ── */}
          {meetingType === 'flash' && pickerStep === 'time' && (
            <View style={[styles.pickerBody, { flex: 1 }]}>
              {selectedDate && (
                <Text style={styles.selectedDateBadge}>
                  {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일
                </Text>
              )}
              <Text style={styles.pickerSectionLabel}>시간</Text>
              <View style={styles.drumRow}>
                <DrumPicker items={AMPM_ITEMS} selectedIndex={selAmPm} onChange={setSelAmPm} width={72} />
                <DrumPicker items={HOUR_ITEMS} selectedIndex={selHour} onChange={setSelHour} width={64} />
                <Text style={styles.drumColon}>:</Text>
                <DrumPicker items={MIN_ITEMS}  selectedIndex={selMinute} onChange={setSelMinute} width={64} />
              </View>
              <TouchableOpacity style={styles.pickerConfirmBtn} onPress={confirmPicker}>
                <Text style={styles.pickerConfirmBtnText}>확인</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── 정기: 요일 + 시간 (single screen) ── */}
          {meetingType === 'regular' && (
            <ScrollView contentContainerStyle={styles.pickerBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.pickerSectionLabel}>반복 요일 <Text style={styles.pickerSectionHint}>(중복 선택 가능)</Text></Text>
              <View style={styles.dayChipsRow}>
                {WEEK_DAYS.map((day) => {
                  const active = selectedDays.includes(day);
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[styles.dayChip, active && styles.dayChipActive]}
                      onPress={() => toggleDay(day)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>{day}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.pickerSectionLabel, { marginTop: 32 }]}>시간</Text>
              <View style={styles.drumRow}>
                <DrumPicker items={AMPM_ITEMS} selectedIndex={selAmPm} onChange={setSelAmPm} width={72} />
                <DrumPicker items={HOUR_ITEMS} selectedIndex={selHour} onChange={setSelHour} width={64} />
                <Text style={styles.drumColon}>:</Text>
                <DrumPicker items={MIN_ITEMS}  selectedIndex={selMinute} onChange={setSelMinute} width={64} />
              </View>

              <TouchableOpacity style={styles.pickerConfirmBtn} onPress={confirmPicker}>
                <Text style={styles.pickerConfirmBtnText}>확인</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

        </View>
      </Modal>

      {/* ── Place search modal ────────────────────────────────────────────────── */}
      <Modal visible={placeModal} animationType="slide" onRequestClose={closePlaceModal}>
        <View style={[styles.modalRoot, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closePlaceModal} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
              <Ionicons name="arrow-back" size={24} color="#1A1108" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>장소 검색</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.placeSearchBar}>
            <TextInput
              style={styles.placeSearchInput}
              placeholder="장소명, 주소를 입력하세요"
              placeholderTextColor="#B89060"
              value={placeQuery}
              onChangeText={setPlaceQuery}
              onSubmitEditing={() => searchPlaces(placeQuery)}
              returnKeyType="search"
              autoFocus
            />
            <TouchableOpacity style={styles.placeSearchBtn} onPress={() => searchPlaces(placeQuery)}>
              <Ionicons name="search" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {placeLoading ? (
            <ActivityIndicator size="large" color="#FFAC30" style={{ marginTop: 48 }} />
          ) : (
            <FlatList
              data={placeResults}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.placeResultItem} onPress={() => selectPlace(item)} activeOpacity={0.75}>
                  <Ionicons name="location" size={20} color="#FFAC30" style={styles.placeResultIcon} />
                  <View style={styles.placeResultInfo}>
                    <Text style={styles.placeResultName}>{item.place_name}</Text>
                    <Text style={styles.placeResultAddr} numberOfLines={1}>{item.road_address_name || item.address_name}</Text>
                    {item.category_name ? <Text style={styles.placeResultCat} numberOfLines={1}>{item.category_name}</Text> : null}
                  </View>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.placeResultSep} />}
              ListEmptyComponent={
                <View style={styles.placeEmptyBox}>
                  <Text style={styles.placeEmptyText}>{placeQuery.trim() ? '검색 결과가 없어요' : '장소 이름을 검색해보세요'}</Text>
                </View>
              }
            />
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#D4D4D4',
  },
  headerTitle: { fontSize: 17, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108' },
  submitBtn: { backgroundColor: '#FFAC30', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: 14, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108' },

  scroll: { flex: 1 },
  content: { padding: 16, gap: 10 },

  fieldLabel: {
    fontSize: 13, fontFamily: 'AppleSDGothicNeo-SemiBold', color: '#8A6030',
    letterSpacing: 0.4, marginTop: 6, marginBottom: 2,
  },

  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 22,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D4D4D4',
  },
  typeChipActive:      { backgroundColor: '#FFAC30', borderColor: '#FFAC30' },
  typeChipFlashActive: { backgroundColor: '#FF8C00', borderColor: '#FF8C00' },
  typeChipText:        { fontSize: 14, fontFamily: 'AppleSDGothicNeo-Medium', color: '#1A1108' },
  typeChipTextActive:  { fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108' },

  deadlineRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  deadlineChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 20, borderWidth: 1, borderColor: '#D4D4D4', backgroundColor: '#FFFFFF',
  },
  deadlineChipActive:    { backgroundColor: '#FF8C00', borderColor: '#FF8C00' },
  deadlineChipText:      { fontSize: 13, fontFamily: 'AppleSDGothicNeo-Medium', color: '#1A1108' },
  deadlineChipTextActive:{ color: '#1A1108', fontFamily: 'AppleSDGothicNeo-Bold' },

  flashNote: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#FFD580',
  },
  flashNoteText: { flex: 1, fontSize: 12, fontFamily: 'AppleSDGothicNeo-Regular', color: '#1A1108', lineHeight: 18 },

  catStrip: { marginHorizontal: -16 },
  catStripContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 20, borderWidth: 1, borderColor: '#D4D4D4', backgroundColor: '#FFFFFF',
  },
  catChipActive:    { backgroundColor: '#FFAC30', borderColor: '#FFAC30' },
  catChipText:      { fontSize: 13, fontFamily: 'AppleSDGothicNeo-Medium', color: '#1A1108' },
  catChipTextActive:{ color: '#1A1108', fontFamily: 'AppleSDGothicNeo-Bold' },

  inputBox: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#D4D4D4',
  },
  titleInput: { fontSize: 15, fontFamily: 'AppleSDGothicNeo-Regular', color: '#1A1108' },
  descInput:  {
    fontSize: 15, fontFamily: 'AppleSDGothicNeo-Regular', color: '#1A1108',
    lineHeight: 24, minHeight: 110,
  },
  charCount:    { fontSize: 12, fontFamily: 'AppleSDGothicNeo-Regular', color: '#1A1108', textAlign: 'right', marginTop: 8 },
  charCountMax: { color: '#E05252' },

  hashtagRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hashtagChip: {
    backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 12, borderWidth: 1, borderColor: '#D4D4D4',
  },
  hashtagText: { fontSize: 13, fontFamily: 'AppleSDGothicNeo-Medium', color: '#1A1108' },

  rowCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#D4D4D4',
  },
  rowCardTitle:      { fontSize: 14, fontFamily: 'AppleSDGothicNeo-SemiBold', color: '#1A1108' },
  rowCardSub:        { fontSize: 12, fontFamily: 'AppleSDGothicNeo-Regular', color: '#1A1108', marginTop: 2 },
  rowCardPlaceholder:{ fontSize: 14, fontFamily: 'AppleSDGothicNeo-Regular', color: '#7A5C38' },

  memberCounter: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto', gap: 4 },
  counterBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D4D4D4',
    justifyContent: 'center', alignItems: 'center',
  },
  counterBtnDisabled: { borderColor: '#F5F5F5' },
  counterValue: {
    fontSize: 16, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108',
    minWidth: 28, textAlign: 'center',
  },

  tipsBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#D4D4D4', marginTop: 6,
  },
  tipsText: { flex: 1, fontSize: 13, fontFamily: 'AppleSDGothicNeo-Regular', color: '#1A1108', lineHeight: 20 },

  // ── Modals ──
  modalRoot: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#D4D4D4',
  },
  modalTitle: { fontSize: 17, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108' },

  pickerBody: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 40 },

  // Calendar
  calNavRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  calMonthLabel:{ fontSize: 18, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108' },
  calWeekRow:   { flexDirection: 'row', marginBottom: 6 },
  calHeaderCell:{ width: CAL_CELL, alignItems: 'center' },
  calWeekLabel: { fontSize: 13, fontFamily: 'AppleSDGothicNeo-SemiBold', color: '#7A5C38' },
  calSunLabel:  { color: '#E05252' },
  calGrid:      { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: {
    width: CAL_CELL, height: CAL_CELL,
    justifyContent: 'center', alignItems: 'center',
    marginVertical: 2,
  },
  calCellSelected: { backgroundColor: '#FFAC30', borderRadius: CAL_CELL / 2 },
  calCellToday:    { borderRadius: CAL_CELL / 2, borderWidth: 1.5, borderColor: '#FFAC30' },
  calDayText:         { fontSize: 15, fontFamily: 'AppleSDGothicNeo-Regular', color: '#1A1108' },
  calDayTextSelected: { fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108' },
  calDayTextDisabled: { color: '#D4D4D4' },
  calSunText:         { color: '#E05252' },

  pickerNextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 28, backgroundColor: '#FFAC30', borderRadius: 14, paddingVertical: 14,
  },
  pickerNextBtnDisabled: { opacity: 0.4 },
  pickerNextBtnText: { fontSize: 16, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108' },

  // Drum picker row
  pickerSectionLabel: { fontSize: 14, fontFamily: 'AppleSDGothicNeo-SemiBold', color: '#8A6030', marginBottom: 16 },
  pickerSectionHint:  { fontSize: 12, fontFamily: 'AppleSDGothicNeo-Regular', color: '#7A5C38' },
  drumRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  drumColon: { fontSize: 26, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108', marginHorizontal: 2, marginBottom: 4 },

  selectedDateBadge: {
    alignSelf: 'center', marginBottom: 24,
    fontSize: 16, fontFamily: 'AppleSDGothicNeo-Bold', color: '#FFAC30',
    backgroundColor: '#FFF8EC', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20,
  },

  // Day chips (regular)
  dayChipsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayChip: {
    width: 42, height: 42, borderRadius: 21,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#D4D4D4', backgroundColor: '#FFFFFF',
  },
  dayChipActive:    { backgroundColor: '#FFAC30', borderColor: '#FFAC30' },
  dayChipText:      { fontSize: 14, fontFamily: 'AppleSDGothicNeo-SemiBold', color: '#7A5C38' },
  dayChipTextActive:{ color: '#1A1108', fontFamily: 'AppleSDGothicNeo-Bold' },

  pickerConfirmBtn: {
    marginTop: 36, backgroundColor: '#FFAC30', borderRadius: 14, paddingVertical: 14,
    alignItems: 'center',
  },
  pickerConfirmBtnText: { fontSize: 16, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108' },

  // Place search
  placeSearchBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 10,
    borderBottomWidth: 1, borderBottomColor: '#D4D4D4',
  },
  placeSearchInput: {
    flex: 1, height: 44, backgroundColor: '#F5F5F5', borderRadius: 12,
    paddingHorizontal: 14, fontSize: 15, fontFamily: 'AppleSDGothicNeo-Regular', color: '#1A1108',
  },
  placeSearchBtn: {
    width: 44, height: 44, backgroundColor: '#FFAC30', borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  placeResultItem:  { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14 },
  placeResultIcon:  { marginRight: 12, marginTop: 2 },
  placeResultInfo:  { flex: 1 },
  placeResultName:  { fontSize: 15, fontFamily: 'AppleSDGothicNeo-SemiBold', color: '#1A1108', marginBottom: 3 },
  placeResultAddr:  { fontSize: 13, fontFamily: 'AppleSDGothicNeo-Regular', color: '#7A5C38', marginBottom: 2 },
  placeResultCat:   { fontSize: 12, fontFamily: 'AppleSDGothicNeo-Regular', color: '#B89060' },
  placeResultSep:   { height: 1, backgroundColor: '#F5F5F5', marginHorizontal: 16 },
  placeEmptyBox:    { alignItems: 'center', paddingTop: 64 },
  placeEmptyText:   { fontSize: 14, fontFamily: 'AppleSDGothicNeo-Regular', color: '#B89060' },
});
