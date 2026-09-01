// 경로: app/(tabs)/community.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
import {
  FirestoreGathering,
  approveJoin,
  cancelJoin,
  deleteGathering,
  openChatRoom,
  rejectJoin,
  requestJoin as apiRequestJoin,
  subscribeGatherings,
} from '../../src/api/gatherings';
import { formatTimeAgo } from '../../src/api/posts';
import { useAuthStore } from '../../src/store/authStore';
import {
  formatDistanceM,
  formatTimeLeft,
  haversineM,
} from '../../src/constants/mockGatherings';

const CATEGORIES = [
  { icon: 'apps' as const,            label: '전체' },
  { icon: 'walk' as const,            label: '산책·운동' },
  { icon: 'restaurant' as const,      label: '맛집' },
  { icon: 'musical-notes' as const,   label: '문화·예술' },
  { icon: 'book' as const,            label: '스터디' },
  { icon: 'game-controller' as const, label: '취미' },
  { icon: 'heart' as const,           label: '봉사' },
];

// ── CategoryStrip ─────────────────────────────────────────────────────────────

function CategoryStrip({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (label: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={cat.strip}
      contentContainerStyle={cat.stripContent}
    >
      {CATEGORIES.map((c) => {
        const active = selected === c.label;
        return (
          <TouchableOpacity
            key={c.label}
            style={[cat.chip, active && cat.chipActive]}
            onPress={() => onSelect(c.label)}
            accessibilityLabel={c.label}
          >
            <Ionicons name={c.icon} size={15} color="#1A1108" />
            <Text style={[cat.label, active && cat.labelActive]}>{c.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ── ManageModal ───────────────────────────────────────────────────────────────

function ManageModal({
  gathering,
  visible,
  onClose,
}: {
  gathering: FirestoreGathering | null;
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [rejectingUid, setRejectingUid] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  if (!gathering) return null;

  const pending   = gathering.pending_requests;
  const approved  = gathering.participants;
  const hasChatRm = gathering.has_chat_room;

  const handleApprove = async (uid: string, nickname: string) => {
    await approveJoin(gathering.id, uid, nickname).catch(() => {});
    if (hasChatRm) {
      Alert.alert('승인 완료', `${nickname}님이 채팅방에 자동으로 초대됐어요 ✓`);
    }
    setRejectingUid(null);
  };

  const startReject = (uid: string) => {
    setRejectingUid(uid);
    setRejectReason('');
  };

  const confirmReject = async (uid: string) => {
    await rejectJoin(gathering.id, uid, rejectReason).catch(() => {});
    setRejectingUid(null);
    setRejectReason('');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={modal.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[modal.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={24} color="#1A1108" />
          </TouchableOpacity>
          <Text style={modal.headerTitle}>참여 관리</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={modal.scroll}
          contentContainerStyle={[modal.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── 신청 중 ── */}
          <Text style={modal.sectionLabel}>신청 중 ({pending.length}명)</Text>

          {pending.length === 0 ? (
            <View style={modal.emptyRow}>
              <Text style={modal.emptyText}>대기 중인 신청이 없어요</Text>
            </View>
          ) : (
            pending.map((req) => (
              <View key={req.uid} style={modal.requestCard}>
                <View style={modal.requestRow}>
                  <View style={modal.reqAvatar}>
                    <Ionicons name="person" size={18} color="#1A1108" />
                  </View>
                  <View style={modal.reqInfo}>
                    <Text style={modal.reqName}>{req.nickname}</Text>
                    <Text style={modal.reqTime}>{req.requested_at}</Text>
                  </View>
                  <TouchableOpacity
                    style={modal.approveBtn}
                    onPress={() => handleApprove(req.uid, req.nickname)}
                  >
                    <Text style={modal.approveBtnText}>승인</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[modal.rejectBtn, rejectingUid === req.uid && modal.rejectBtnOpen]}
                    onPress={() =>
                      rejectingUid === req.uid ? confirmReject(req.uid) : startReject(req.uid)
                    }
                  >
                    <Text
                      style={[
                        modal.rejectBtnText,
                        rejectingUid === req.uid && modal.rejectBtnTextOpen,
                      ]}
                    >
                      {rejectingUid === req.uid ? '확인' : '거절'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {rejectingUid === req.uid && (
                  <View style={modal.reasonRow}>
                    <TextInput
                      style={modal.reasonInput}
                      placeholder="거절 사유 (선택)"
                      placeholderTextColor="#1A1108"
                      value={rejectReason}
                      onChangeText={setRejectReason}
                      returnKeyType="done"
                      onSubmitEditing={() => confirmReject(req.uid)}
                      autoFocus
                    />
                    <TouchableOpacity
                      style={modal.cancelRejectBtn}
                      onPress={() => setRejectingUid(null)}
                    >
                      <Ionicons name="close" size={16} color="#1A1108" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}

          {/* ── 참여 확정 멤버 ── */}
          {approved.length > 0 && (
            <>
              <Text style={[modal.sectionLabel, { marginTop: 28 }]}>
                참여 확정 ({approved.length}명)
              </Text>
              {approved.map((m) => (
                <View key={m.uid} style={modal.approvedRow}>
                  <View style={[modal.reqAvatar, modal.reqAvatarApproved]}>
                    <Ionicons name="person" size={18} color="#1A1108" />
                  </View>
                  <Text style={modal.approvedName}>{m.nickname}</Text>
                  {hasChatRm && (
                    <View style={modal.chatBadge}>
                      <Ionicons name="chatbubble" size={11} color="#FFAC30" />
                      <Text style={modal.chatBadgeText}>채팅 초대됨</Text>
                    </View>
                  )}
                </View>
              ))}
            </>
          )}

          {hasChatRm && pending.length > 0 && (
            <View style={modal.chatNotice}>
              <Ionicons name="information-circle-outline" size={16} color="#1A1108" />
              <Text style={modal.chatNoticeText}>
                채팅방이 열려 있어요. 승인하면 자동으로 초대됩니다.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── GatheringCard ─────────────────────────────────────────────────────────────

function GatheringCard({
  gathering,
  distanceM,
  myUid,
  myNick,
  onManage,
}: {
  gathering: FirestoreGathering;
  distanceM: number | null;
  myUid: string;
  myNick: string;
  onManage: () => void;
}) {
  const router = useRouter();

  const isOwn          = gathering.host_id === myUid;
  const participantCnt = gathering.participants.length;
  const maxMembers     = gathering.max_members;
  const isFull         = participantCnt >= maxMembers;
  const pendingCount   = gathering.pending_requests.length;
  const hasChatRoom    = gathering.has_chat_room;
  const canCreateChat  = participantCnt >= 2 && !hasChatRoom;

  const isPending        = gathering.pending_requests.some((r) => r.uid === myUid);
  const isApproved       = !isOwn && gathering.participants.some((p) => p.uid === myUid);
  const rejectionReason  = gathering.rejections[myUid];
  const isRejected       = !!rejectionReason;

  const handleJoinPress = async () => {
    if (myUid === 'guest') return;
    if (isPending) {
      await cancelJoin(gathering.id, myUid).catch(() => {});
    } else if (!isFull && !isApproved && !isRejected) {
      await apiRequestJoin(gathering.id, myUid, myNick).catch(() => {});
    }
  };

  const handleOpenChat = async () => {
    if (hasChatRoom) {
      router.push({ pathname: '/dm/[roomId]', params: { roomId: gathering.id } });
      return;
    }
    await openChatRoom(gathering.id).catch(() => {});
    Alert.alert('채팅방이 만들어졌어요!', '승인된 멤버들에게 알림이 전송됩니다 ✓');
  };

  type JoinVariant = 'default' | 'pending' | 'approved' | 'rejected' | 'full';
  let variant: JoinVariant = 'default';
  let joinLabel = '참여 신청';
  if (isFull && !isPending && !isApproved) { variant = 'full'; joinLabel = '모집완료'; }
  else if (isApproved) { variant = 'approved'; joinLabel = '참여확정 ✓'; }
  else if (isRejected) { variant = 'rejected'; joinLabel = '거절됨'; }
  else if (isPending)  { variant = 'pending';  joinLabel = '신청중'; }
  const joinDisabled = variant === 'full' || variant === 'approved' || variant === 'rejected';

  return (
    <View style={[gcard.wrap, gathering.host_is_sheriff && gcard.wrapSheriff]}>
      <TouchableOpacity activeOpacity={0.97} onPress={() => router.push({ pathname: '/gathering/[id]', params: { id: gathering.id } })}>
        {/* Author row */}
        <View style={gcard.authorRow}>
          <View style={[gcard.avatar, gathering.host_is_sheriff && gcard.avatarSheriff]}>
            <Ionicons name="person" size={18} color="#1A1108" />
          </View>
          <View style={gcard.authorInfo}>
            <View style={gcard.authorNameRow}>
              <Text style={gcard.authorName}>{gathering.host_nickname}</Text>
              {gathering.host_is_sheriff && (
                <Image
                  source={require('../../assets/images/sheriff_verified.jpg')}
                  style={gcard.sheriffBadge}
                />
              )}
              {isOwn && (
                <View style={gcard.myBadge}>
                  <Text style={gcard.myBadgeText}>내 모임</Text>
                </View>
              )}
            </View>
            <Text style={gcard.meta}>{formatTimeAgo(gathering.created_at)} · {gathering.category}</Text>
          </View>
          {isOwn && (
            <TouchableOpacity
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() =>
                Alert.alert('모임 관리', undefined, [
                  {
                    text: '삭제',
                    style: 'destructive',
                    onPress: () =>
                      Alert.alert(
                        '모임 삭제',
                        `'${gathering.title}' 모임을 삭제할까요?${gathering.has_chat_room ? '\n채팅방 멤버들에게 알림이 전송됩니다.' : ''}`,
                        [
                          { text: '취소', style: 'cancel' },
                          {
                            text: '삭제',
                            style: 'destructive',
                            onPress: () => deleteGathering(gathering.id).catch(() => {}),
                          },
                        ]
                      ),
                  },
                  { text: '취소', style: 'cancel' },
                ])
              }
            >
              <Ionicons name="ellipsis-horizontal" size={18} color="#1A1108" />
            </TouchableOpacity>
          )}
        </View>

        {/* Title */}
        <View style={gcard.titleRow}>
          {gathering.type === 'flash' && (
            <Ionicons name="flash" size={15} color="#FF8C00" style={{ marginTop: 2 }} />
          )}
          <Text style={[gcard.title, gathering.type === 'flash' && gcard.titleFlash]}>
            {gathering.title}
          </Text>
        </View>

        {/* Flash deadline */}
        {gathering.type === 'flash' && gathering.deadline_ms && (
          <View style={gcard.deadlineRow}>
            <Ionicons name="time-outline" size={13} color="#FF8C00" />
            <Text style={gcard.deadlineText}>
              {formatTimeLeft(gathering.deadline_ms)} 남음 · 마감 시 자동 삭제
            </Text>
          </View>
        )}

        <Text style={gcard.content}>{gathering.description}</Text>

        <View style={gcard.tagRow}>
          {gathering.tags.map((t) => (
            <Text key={t} style={gcard.tag}>{t}</Text>
          ))}
        </View>

        <View style={gcard.locationRow}>
          <Ionicons name="location" size={13} color="#FFAC30" />
          <Text style={gcard.locationName}>{gathering.location.name}</Text>
          {distanceM !== null && (
            <>
              <View style={gcard.dot} />
              <Text style={gcard.locationDist}>{formatDistanceM(distanceM)}</Text>
            </>
          )}
        </View>
      </TouchableOpacity>

      {/* Actions row */}
      <View style={gcard.actions}>
        <View style={gcard.actionBtn}>
          <Ionicons name="calendar-outline" size={16} color="#1A1108" />
          <Text style={gcard.actionText}>{gathering.meeting_at}</Text>
        </View>
        <View style={gcard.actionBtn}>
          <Ionicons name="people-outline" size={17} color="#1A1108" />
          <Text style={gcard.actionText}>{participantCnt}/{maxMembers}</Text>
        </View>

        <View style={gcard.actionsRight}>
          {isOwn ? (
            <TouchableOpacity
              style={[gcard.manageBtn, pendingCount > 0 && gcard.manageBtnAlert]}
              onPress={onManage}
            >
              <Ionicons
                name="people"
                size={14}
                color={pendingCount > 0 ? '#FFFFFF' : '#1A1108'}
                style={{ marginRight: 4 }}
              />
              <Text style={[gcard.manageBtnText, pendingCount > 0 && gcard.manageBtnTextAlert]}>
                참여 관리{pendingCount > 0 ? ` (${pendingCount})` : ''}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                gcard.joinBtn,
                variant === 'pending'  && gcard.joinBtnPending,
                variant === 'approved' && gcard.joinBtnApproved,
                variant === 'rejected' && gcard.joinBtnMuted,
                variant === 'full'     && gcard.joinBtnMuted,
              ]}
              onPress={handleJoinPress}
              disabled={joinDisabled}
            >
              <Text
                style={[
                  gcard.joinBtnText,
                  variant === 'pending'  && gcard.joinBtnTextPending,
                  variant === 'approved' && gcard.joinBtnTextApproved,
                  (variant === 'rejected' || variant === 'full') && gcard.joinBtnTextMuted,
                ]}
              >
                {joinLabel}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Chat button: host can create/enter, approved members can enter */}
      {((isOwn && (canCreateChat || hasChatRoom)) || (!isOwn && isApproved && hasChatRoom)) && (
        <TouchableOpacity
          style={[gcard.chatBtn, hasChatRoom && gcard.chatBtnActive]}
          onPress={handleOpenChat}
        >
          <Ionicons
            name={hasChatRoom ? 'chatbubbles' : 'chatbubbles-outline'}
            size={16}
            color="#1A1108"
            style={{ marginRight: 6 }}
          />
          <Text style={gcard.chatBtnText}>
            {hasChatRoom ? '채팅방 입장' : '채팅방 만들기'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Non-host: rejection reason */}
      {!isOwn && isRejected && (
        <View style={gcard.rejectionRow}>
          <Ionicons name="close-circle" size={13} color="#E05252" />
          <Text style={gcard.rejectionText}>거절 사유: {rejectionReason}</Text>
        </View>
      )}
    </View>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [gatherings,      setGatherings]      = useState<FirestoreGathering[]>([]);
  const [searchText,       setSearchText]       = useState('');
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [managingId,       setManagingId]       = useState<string | null>(null);
  const [tick,             setTick]             = useState(0);
  const [userCoords,       setUserCoords]       = useState<{ lat: number; lng: number } | null>(null);
  const [locStatus,        setLocStatus]        = useState<'loading' | 'ok' | 'denied'>('loading');

  const uid = useAuthStore((s) => s.user?.uid ?? (s.kakaoUser ? `kakao_${s.kakaoUser.id}` : 'guest'));
  const myNick = useAuthStore((s) => s.kakaoUser?.nickname ?? s.user?.displayName ?? '사용자');

  useEffect(() => {
    const unsub = subscribeGatherings(setGatherings);
    return unsub;
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') { setLocStatus('denied'); return; }
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        .then((loc) => {
          setUserCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
          setLocStatus('ok');
        })
        .catch(() => setLocStatus('denied'));
    }).catch(() => setLocStatus('denied'));
  }, []);

  const sorted = useMemo(() => {
    const now = Date.now();
    return gatherings
      .filter((g) => {
        if (g.type === 'flash' && g.deadline_ms && now > g.deadline_ms) return false;
        const matchesCat  = selectedCategory === '전체' || g.category === selectedCategory;
        const matchesText = !searchText.trim() ||
          g.title.includes(searchText) ||
          g.description.includes(searchText) ||
          g.location.name.includes(searchText) ||
          g.tags.some((t) => t.includes(searchText));
        return matchesCat && matchesText;
      })
      .map((g) => ({
        gathering: g,
        distanceM: userCoords
          ? haversineM(userCoords.lat, userCoords.lng, g.location.lat, g.location.lng)
          : null,
      }))
      .sort((a, b) => {
        if (a.distanceM === null || b.distanceM === null) return 0;
        return a.distanceM - b.distanceM;
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gatherings, userCoords, searchText, selectedCategory, tick]);

  const managingGathering = managingId
    ? gatherings.find((g) => g.id === managingId) ?? null
    : null;

  return (
    <View style={styles.container}>
      {/* ── Search bar ── */}
      <View style={[styles.searchWrap, { paddingTop: insets.top + 12 }]}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={17} color="#1A1108" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="모임 검색"
            placeholderTextColor="#1A1108"
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel="모임 검색"
          />
        </View>
      </View>

      {/* ── Category strip ── */}
      <CategoryStrip selected={selectedCategory} onSelect={setSelectedCategory} />

      {/* ── Location indicator ── */}
      <View style={styles.locRow}>
        <Ionicons
          name={locStatus === 'ok' ? 'location' : locStatus === 'loading' ? 'locate-outline' : 'location-outline'}
          size={13}
          color={locStatus === 'ok' ? '#FFAC30' : '#1A1108'}
        />
        <Text style={[styles.locText, locStatus === 'ok' && styles.locTextOk]}>
          {locStatus === 'loading' ? '위치 확인 중…' :
           locStatus === 'ok'      ? '현재 위치 기준 가까운 순' :
                                     '위치 권한 없음 · 기본 순서'}
        </Text>
      </View>

      {/* ── Content ── */}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 96 }]}
        showsVerticalScrollIndicator={false}
      >
        {sorted.length > 0 ? (
          sorted.map(({ gathering, distanceM }) => (
            <GatheringCard
              key={gathering.id}
              gathering={gathering}
              distanceM={distanceM}
              myUid={uid}
              myNick={myNick}
              onManage={() => setManagingId(gathering.id)}
            />
          ))
        ) : gatherings.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="people" size={44} color="#FFAC30" />
            </View>
            <Text style={styles.emptyTitle}>근처 모임이 아직 없어요</Text>
            <Text style={styles.emptySub}>직접 모임을 만들고{'\n'}이웃들을 초대해보세요</Text>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => router.push('/create-gathering')}
              accessibilityRole="button"
              accessibilityLabel="모임 만들기"
            >
              <Ionicons name="add-circle-outline" size={18} color="#1A1108" style={{ marginRight: 6 }} />
              <Text style={styles.createBtnText}>첫 모임 만들기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.noResult}>
            <Ionicons name="search" size={36} color="#1A1108" />
            <Text style={styles.noResultText}>검색 결과가 없어요</Text>
          </View>
        )}


      </ScrollView>

      {/* ── FAB ── */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 104 }]}
        onPress={() => router.push('/create-gathering')}
        accessibilityLabel="모임 만들기"
      >
        <Ionicons name="add" size={26} color="#1A1108" />
      </TouchableOpacity>

      {/* ── Manage modal ── */}
      <ManageModal
        gathering={managingGathering}
        visible={managingId !== null}
        onClose={() => setManagingId(null)}
      />
    </View>
  );
}

// ── GatheringCard styles ───────────────────────────────────────────────────────

const gcard = StyleSheet.create({
  wrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#D4D4D4',
    overflow: 'hidden',
  },
  wrapSheriff: { borderColor: '#FFAC30' },
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
  avatarSheriff: { borderColor: '#FFAC30', borderWidth: 2 },
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
  sheriffBadge: { width: 60, height: 20, resizeMode: 'contain' },
  myBadge: {
    backgroundColor: '#FFF0D4',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFAC30',
  },
  myBadgeText: {
    fontSize: 10,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#1A1108',
  },
  meta: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#1A1108',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    paddingHorizontal: 14,
    paddingBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
    lineHeight: 22,
  },
  titleFlash: { color: '#1A1108' },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingBottom: 6,
  },
  deadlineText: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#FF8C00',
  },
  content: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#1A1108',
    lineHeight: 22,
    paddingHorizontal: 14,
    paddingTop: 2,
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
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#1A1108' },
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
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D4D4D4',
    backgroundColor: '#FFFFFF',
  },
  manageBtnAlert: { backgroundColor: '#FFAC30', borderColor: '#FFAC30' },
  manageBtnText: { fontSize: 13, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108' },
  manageBtnTextAlert: { color: '#FFFFFF' },
  joinBtn: {
    backgroundColor: '#FFAC30',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinBtnPending:  { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#FFAC30' },
  joinBtnApproved: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#4CAF6A' },
  joinBtnMuted:    { backgroundColor: '#F5F5F5' },
  joinBtnText:     { fontSize: 13, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108' },
  joinBtnTextPending:  { color: '#FFAC30' },
  joinBtnTextApproved: { color: '#4CAF6A' },
  joinBtnTextMuted:    { color: '#1A1108' },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 14,
    marginBottom: 14,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4D4D4',
    backgroundColor: '#FFFFFF',
  },
  chatBtnActive: { backgroundColor: '#FFAC30', borderColor: '#FFAC30' },
  chatBtnText: { fontSize: 14, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108' },
  chatBtnTextActive: { color: '#1A1108' },
  rejectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  rejectionText: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#E05252',
    flex: 1,
  },
});

// ── ManageModal styles ────────────────────────────────────────────────────────

const modal = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
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
  headerTitle: { fontSize: 17, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108' },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 10 },
  sectionLabel: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#8A6030',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  emptyRow: { paddingVertical: 20, alignItems: 'center' },
  emptyText: { fontSize: 14, fontFamily: 'AppleSDGothicNeo-Regular', color: '#1A1108' },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D4D4D4',
    padding: 14,
    gap: 10,
  },
  requestRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reqAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D4D4D4',
  },
  reqAvatarApproved: { borderColor: '#FFAC30' },
  reqInfo: { flex: 1 },
  reqName: { fontSize: 14, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108' },
  reqTime: { fontSize: 12, fontFamily: 'AppleSDGothicNeo-Regular', color: '#1A1108', marginTop: 2 },
  approveBtn: { backgroundColor: '#FFAC30', paddingHorizontal: 13, paddingVertical: 8, borderRadius: 9 },
  approveBtnText: { fontSize: 13, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108' },
  rejectBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4D4D4',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 9,
  },
  rejectBtnOpen: { borderColor: '#E05252' },
  rejectBtnText: { fontSize: 13, fontFamily: 'AppleSDGothicNeo-Medium', color: '#1A1108' },
  rejectBtnTextOpen: { color: '#E05252', fontFamily: 'AppleSDGothicNeo-Bold' },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reasonInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#D4D4D4',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#1A1108',
    backgroundColor: '#FFFFFF',
  },
  cancelRejectBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D4D4D4',
  },
  approvedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  approvedName: { fontSize: 14, fontFamily: 'AppleSDGothicNeo-SemiBold', color: '#1A1108', flex: 1 },
  chatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF0D4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  chatBadgeText: { fontSize: 11, fontFamily: 'AppleSDGothicNeo-Medium', color: '#1A1108' },
  chatNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D4D4D4',
    marginTop: 8,
  },
  chatNoticeText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#1A1108',
    lineHeight: 20,
  },
});

// ── Category strip styles ─────────────────────────────────────────────────────

const cat = StyleSheet.create({
  strip: { flexShrink: 0, flexGrow: 0, borderBottomWidth: 1, borderBottomColor: '#D4D4D4' },
  stripContent: { paddingHorizontal: 12, paddingVertical: 6, gap: 8, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D4D4D4',
    backgroundColor: '#FFFFFF',
  },
  chipActive: { backgroundColor: '#FFAC30', borderColor: '#FFAC30' },
  label: { fontSize: 13, lineHeight: 18, fontFamily: 'AppleSDGothicNeo-Medium', color: '#1A1108' },
  labelActive: { color: '#1A1108', fontFamily: 'AppleSDGothicNeo-Bold' },
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
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  locText: { fontSize: 12, fontFamily: 'AppleSDGothicNeo-Regular', color: '#1A1108' },
  locTextOk: { color: '#1A1108', fontFamily: 'AppleSDGothicNeo-Medium' },
  content: { padding: 14 },
  noResult: { alignItems: 'center', paddingTop: 80, gap: 12 },
  noResultText: { fontSize: 15, fontFamily: 'AppleSDGothicNeo-Medium', color: '#1A1108' },
  emptyWrap: { alignItems: 'center', paddingTop: 60 },
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
  createBtnText: { fontSize: 15, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108' },
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
