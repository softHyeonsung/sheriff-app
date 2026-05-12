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
  MockGathering,
  MOCK_GATHERINGS,
  haversineM,
  formatDistanceM,
  formatTimeLeft,
} from '../../src/constants/mockGatherings';
import { useAuthStore } from '../../src/store/authStore';
import { useGatheringStore } from '../../src/store/gatheringStore';

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
            <Ionicons name={c.icon} size={15} color={active ? '#1A1108' : '#A36E1D'} />
            <Text style={[cat.label, active && cat.labelActive]}>{c.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ── ManageModal ───────────────────────────────────────────────────────────────

function ManageModal({
  gatheringId,
  visible,
  onClose,
}: {
  gatheringId: string;
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { gatherings, approveRequest, rejectRequest } = useGatheringStore();
  const entry = gatherings[gatheringId];

  const [rejectingUid, setRejectingUid] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  if (!entry) return null;

  const handleApprove = (uid: string, nickname: string) => {
    approveRequest(gatheringId, uid);
    if (entry.hasChatRoom) {
      Alert.alert('승인 완료', `${nickname}님이 채팅방에 자동으로 초대됐어요 ✓`);
    }
    setRejectingUid(null);
  };

  const startReject = (uid: string) => {
    setRejectingUid(uid);
    setRejectReason('');
  };

  const confirmReject = (uid: string) => {
    rejectRequest(gatheringId, uid, rejectReason);
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
          <Text style={modal.sectionLabel}>신청 중 ({entry.pendingRequests.length}명)</Text>

          {entry.pendingRequests.length === 0 ? (
            <View style={modal.emptyRow}>
              <Text style={modal.emptyText}>대기 중인 신청이 없어요</Text>
            </View>
          ) : (
            entry.pendingRequests.map((req) => (
              <View key={req.uid} style={modal.requestCard}>
                {/* Request row */}
                <View style={modal.requestRow}>
                  <View style={modal.reqAvatar}>
                    <Ionicons name="person" size={18} color="#B89060" />
                  </View>
                  <View style={modal.reqInfo}>
                    <Text style={modal.reqName}>{req.nickname}</Text>
                    <Text style={modal.reqTime}>{req.requestedAt}</Text>
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

                {/* Rejection reason input */}
                {rejectingUid === req.uid && (
                  <View style={modal.reasonRow}>
                    <TextInput
                      style={modal.reasonInput}
                      placeholder="거절 사유 (선택)"
                      placeholderTextColor="#B89060"
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
                      <Ionicons name="close" size={16} color="#B89060" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}

          {/* ── 승인된 멤버 ── */}
          {entry.approvedMembers.length > 0 && (
            <>
              <Text style={[modal.sectionLabel, { marginTop: 28 }]}>
                승인된 멤버 ({entry.approvedMembers.length}명)
              </Text>
              {entry.approvedMembers.map((m) => (
                <View key={m.uid} style={modal.approvedRow}>
                  <View style={[modal.reqAvatar, modal.reqAvatarApproved]}>
                    <Ionicons name="person" size={18} color="#A36E1D" />
                  </View>
                  <Text style={modal.approvedName}>{m.nickname}</Text>
                  {entry.hasChatRoom && (
                    <View style={modal.chatBadge}>
                      <Ionicons name="chatbubble" size={11} color="#FFAC30" />
                      <Text style={modal.chatBadgeText}>채팅 초대됨</Text>
                    </View>
                  )}
                </View>
              ))}
            </>
          )}

          {/* ── 채팅 안내 ── (when chat exists, new approvals are auto-added) */}
          {entry.hasChatRoom && entry.pendingRequests.length > 0 && (
            <View style={modal.chatNotice}>
              <Ionicons name="information-circle-outline" size={16} color="#A36E1D" />
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
  onManage,
}: {
  gathering: MockGathering;
  distanceM: number | null;
  onManage: () => void;
}) {
  const router = useRouter();
  const entry = useGatheringStore((s) => s.gatherings[gathering.id]);
  const { requestJoin, cancelRequest, createChatRoom } = useGatheringStore();
  const uid = useAuthStore(
    (s) => s.user?.uid ?? (s.kakaoUser ? `kakao_${s.kakaoUser.id}` : 'guest'),
  );

  const participantCount = entry?.participantCount ?? 0;
  const maxMembers = gathering.maxMembers;
  const isFull = participantCount >= maxMembers;
  const pendingCount = entry?.pendingRequests.length ?? 0;
  const hasChatRoom = entry?.hasChatRoom ?? false;
  const canCreateChat = participantCount >= 2 && !hasChatRoom;

  // Non-host status
  const isPending = entry?.pendingRequests.some((r) => r.uid === uid) ?? false;
  const isApproved = entry?.approvedMembers.some((m) => m.uid === uid) ?? false;
  const rejectionReason = entry?.rejections[uid];
  const isRejected = !!rejectionReason;

  const handleJoinPress = () => {
    if (isPending) {
      cancelRequest(gathering.id, uid);
    } else if (!isFull && !isApproved && !isRejected) {
      requestJoin(gathering.id, uid, '나');
    }
  };

  // Derive join button appearance
  type JoinVariant = 'default' | 'pending' | 'approved' | 'rejected' | 'full';
  let variant: JoinVariant = 'default';
  let joinLabel = '참여 신청';
  if (isFull && !isPending && !isApproved) { variant = 'full'; joinLabel = '모집완료'; }
  else if (isApproved) { variant = 'approved'; joinLabel = '참여확정 ✓'; }
  else if (isRejected) { variant = 'rejected'; joinLabel = '거절됨'; }
  else if (isPending)  { variant = 'pending';  joinLabel = '신청중'; }
  const joinDisabled = variant === 'full' || variant === 'approved' || variant === 'rejected';

  return (
    <View style={[gcard.wrap, gathering.host.isSheriff && gcard.wrapSheriff]}>
      {/* Tappable content area → gathering detail */}
      <TouchableOpacity activeOpacity={0.97} onPress={() => router.push({ pathname: '/gathering/[id]', params: { id: gathering.id } })}>
        {/* Author row */}
        <View style={gcard.authorRow}>
          <View style={[gcard.avatar, gathering.host.isSheriff && gcard.avatarSheriff]}>
            <Ionicons name="person" size={18} color={gathering.host.isSheriff ? '#A36E1D' : '#B89060'} />
          </View>
          <View style={gcard.authorInfo}>
            <View style={gcard.authorNameRow}>
              <Text style={gcard.authorName}>{gathering.host.nickname}</Text>
              {gathering.host.isSheriff && (
                <Image
                  source={require('../../assets/images/sheriff_verified.jpg')}
                  style={gcard.sheriffBadge}
                />
              )}
              {gathering.isOwn && (
                <View style={gcard.myBadge}>
                  <Text style={gcard.myBadgeText}>내 모임</Text>
                </View>
              )}
            </View>
            <Text style={gcard.meta}>{gathering.timeAgo} · {gathering.category}</Text>
          </View>
          <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="ellipsis-horizontal" size={18} color="#B89060" />
          </TouchableOpacity>
        </View>

        {/* Title (flash: ⚡ icon prefix) */}
        <View style={gcard.titleRow}>
          {gathering.type === 'flash' && (
            <Ionicons name="flash" size={15} color="#FF8C00" style={{ marginTop: 2 }} />
          )}
          <Text style={[gcard.title, gathering.type === 'flash' && gcard.titleFlash]}>
            {gathering.title}
          </Text>
        </View>

        {/* Flash deadline countdown */}
        {gathering.type === 'flash' && gathering.deadlineMs && (
          <View style={gcard.deadlineRow}>
            <Ionicons name="time-outline" size={13} color="#FF8C00" />
            <Text style={gcard.deadlineText}>
              {formatTimeLeft(gathering.deadlineMs)} 남음 · 마감 시 자동 삭제
            </Text>
          </View>
        )}

        <Text style={gcard.content}>{gathering.description}</Text>

        {/* Tags */}
        <View style={gcard.tagRow}>
          {gathering.tags.map((t) => (
            <Text key={t} style={gcard.tag}>{t}</Text>
          ))}
        </View>

        {/* Location */}
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
          <Ionicons name="calendar-outline" size={16} color="#B89060" />
          <Text style={gcard.actionText}>{gathering.meetingAt}</Text>
        </View>
        <View style={gcard.actionBtn}>
          <Ionicons name="people-outline" size={17} color="#B89060" />
          <Text style={gcard.actionText}>{participantCount}/{maxMembers}</Text>
        </View>

        <View style={gcard.actionsRight}>
          {gathering.isOwn ? (
            // Host: manage button
            <TouchableOpacity
              style={[gcard.manageBtn, pendingCount > 0 && gcard.manageBtnAlert]}
              onPress={onManage}
            >
              <Ionicons
                name="people"
                size={14}
                color={pendingCount > 0 ? '#FFFFFF' : '#A36E1D'}
                style={{ marginRight: 4 }}
              />
              <Text style={[gcard.manageBtnText, pendingCount > 0 && gcard.manageBtnTextAlert]}>
                참여 관리{pendingCount > 0 ? ` (${pendingCount})` : ''}
              </Text>
            </TouchableOpacity>
          ) : (
            // Non-host: join button
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

      {/* Host: chat button (below actions) */}
      {gathering.isOwn && (canCreateChat || hasChatRoom) && (
        <TouchableOpacity
          style={[gcard.chatBtn, hasChatRoom && gcard.chatBtnActive]}
          onPress={() => {
            if (!hasChatRoom) {
              createChatRoom(gathering.id);
              Alert.alert('채팅방이 만들어졌어요!', '승인된 멤버들에게 알림이 전송됩니다 ✓');
            }
          }}
          activeOpacity={hasChatRoom ? 1 : 0.8}
        >
          <Ionicons
            name={hasChatRoom ? 'chatbubbles' : 'chatbubbles-outline'}
            size={16}
            color={hasChatRoom ? '#FFFFFF' : '#1A1108'}
            style={{ marginRight: 6 }}
          />
          <Text style={[gcard.chatBtnText, hasChatRoom && gcard.chatBtnTextActive]}>
            {hasChatRoom ? '채팅방 입장' : '채팅방 만들기'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Non-host: rejection reason */}
      {!gathering.isOwn && isRejected && (
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
  const [searchText,       setSearchText]       = useState('');
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [managingId,       setManagingId]       = useState<string | null>(null);
  const [tick,             setTick]             = useState(0);
  const [userCoords,       setUserCoords]       = useState<{ lat: number; lng: number } | null>(null);
  const [locStatus,        setLocStatus]        = useState<'loading' | 'ok' | 'denied'>('loading');

  // 1-minute tick: keeps flash countdowns accurate + re-filters expired gatherings
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Fetch current location once on mount
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

  // Filter + sort by distance (nearest first). Expired flash gatherings are excluded.
  const sorted = useMemo(() => {
    const now = Date.now();
    return MOCK_GATHERINGS
      .filter((g) => {
        if (g.type === 'flash' && g.deadlineMs && now > g.deadlineMs) return false;
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
  }, [userCoords, searchText, selectedCategory, tick]);

  const hasGatherings = MOCK_GATHERINGS.length > 0;

  return (
    <View style={styles.container}>
      {/* ── Search bar ── */}
      <View style={[styles.searchWrap, { paddingTop: insets.top + 12 }]}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={17} color="#B89060" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="모임 검색"
            placeholderTextColor="#B89060"
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
          color={locStatus === 'ok' ? '#FFAC30' : '#B89060'}
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
        {hasGatherings ? (
          sorted.length > 0 ? (
            sorted.map(({ gathering, distanceM }) => (
              <GatheringCard
                key={gathering.id}
                gathering={gathering}
                distanceM={distanceM}
                onManage={() => setManagingId(gathering.id)}
              />
            ))
          ) : (
            <View style={styles.noResult}>
              <Ionicons name="search" size={36} color="#B89060" />
              <Text style={styles.noResultText}>검색 결과가 없어요</Text>
            </View>
          )
        ) : (
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
        )}

        {/* Quest teaser */}
        <View style={styles.questBanner}>
          <View style={styles.questBannerLeft}>
            <Ionicons name="flash" size={24} color="#FFAC30" />
            <View>
              <Text style={styles.questBannerTitle}>퀘스트도 있어요</Text>
              <Text style={styles.questBannerSub}>도움 요청하고 포인트 받기</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#A36E1D" />
        </View>
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
      {managingId && (
        <ManageModal
          gatheringId={managingId}
          visible
          onClose={() => setManagingId(null)}
        />
      )}
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
    width: 40,
    height: 40,
    borderRadius: 20,
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
    color: '#A36E1D',
  },
  meta: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#B89060',
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
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#B89060' },
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
    color: '#B89060',
  },

  // ── Manage button (host) ──
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
  manageBtnAlert: {
    backgroundColor: '#FFAC30',
    borderColor: '#FFAC30',
  },
  manageBtnText: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#A36E1D',
  },
  manageBtnTextAlert: { color: '#FFFFFF' },

  // ── Join button (non-host) ──
  joinBtn: {
    backgroundColor: '#FFAC30',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinBtnPending: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FFAC30',
  },
  joinBtnApproved: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#4CAF6A',
  },
  joinBtnMuted: {
    backgroundColor: '#F5F5F5',
  },
  joinBtnText: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },
  joinBtnTextPending:  { color: '#FFAC30' },
  joinBtnTextApproved: { color: '#4CAF6A' },
  joinBtnTextMuted:    { color: '#B89060' },

  // ── Chat button (host, below actions) ──
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
  chatBtnActive: {
    backgroundColor: '#FFAC30',
    borderColor: '#FFAC30',
  },
  chatBtnText: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },
  chatBtnTextActive: { color: '#1A1108' },

  // ── Rejection reason ──
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
  headerTitle: {
    fontSize: 17,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },
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
  emptyText: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#B89060',
  },

  // Request card
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D4D4D4',
    padding: 14,
    gap: 10,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
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
  reqName: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },
  reqTime: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#B89060',
    marginTop: 2,
  },
  approveBtn: {
    backgroundColor: '#FFAC30',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 9,
  },
  approveBtnText: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },
  rejectBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4D4D4',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 9,
  },
  rejectBtnOpen: { borderColor: '#E05252' },
  rejectBtnText: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-Medium',
    color: '#7A5C38',
  },
  rejectBtnTextOpen: { color: '#E05252', fontFamily: 'AppleSDGothicNeo-Bold' },

  // Rejection reason input row
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
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

  // Approved members
  approvedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  approvedName: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#1A1108',
    flex: 1,
  },
  chatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF0D4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  chatBadgeText: {
    fontSize: 11,
    fontFamily: 'AppleSDGothicNeo-Medium',
    color: '#A36E1D',
  },

  // Chat notice
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
    color: '#A36E1D',
    lineHeight: 20,
  },
});

// ── Category strip styles ─────────────────────────────────────────────────────

const cat = StyleSheet.create({
  strip: {
    flexShrink: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#D4D4D4',
  },
  stripContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D4D4D4',
    backgroundColor: '#FFFFFF',
  },
  chipActive: { backgroundColor: '#FFAC30', borderColor: '#FFAC30' },
  label: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-Medium',
    color: '#A36E1D',
  },
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
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  locText: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#B89060',
  },
  locTextOk: {
    color: '#A36E1D',
    fontFamily: 'AppleSDGothicNeo-Medium',
  },

  content: { padding: 14 },
  noResult: { alignItems: 'center', paddingTop: 80, gap: 12 },
  noResultText: {
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-Medium',
    color: '#B89060',
  },
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
  questBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#D4D4D4',
    marginTop: 4,
  },
  questBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  questBannerTitle: {
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },
  questBannerSub: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#7A5C38',
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
