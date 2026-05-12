// 경로: app/gathering/[id].tsx
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import {
  MOCK_GATHERINGS,
  formatTimeLeft,
} from '../../src/constants/mockGatherings';
import { useAuthStore } from '../../src/store/authStore';
import { useGatheringStore } from '../../src/store/gatheringStore';

// ── Category icon map ──────────────────────────────────────────────────────────

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const CATEGORY_ICONS: Record<string, IoniconName> = {
  '산책·운동': 'walk',
  '맛집': 'restaurant',
  '문화·예술': 'musical-notes',
  '스터디': 'book',
  '취미': 'game-controller',
  '봉사': 'heart',
};

export default function GatheringDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const gathering = MOCK_GATHERINGS.find((g) => g.id === id);
  const entry = useGatheringStore((s) => s.gatherings[id ?? '']);
  const { requestJoin, cancelRequest, approveRequest, rejectRequest, createChatRoom } = useGatheringStore();

  const uid = useAuthStore(
    (s) => s.user?.uid ?? (s.kakaoUser ? `kakao_${s.kakaoUser.id}` : 'guest'),
  );

  const [followed, setFollowed] = useState(false);
  const [rejectingUid, setRejectingUid] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  if (!gathering || !entry) {
    return (
      <View style={[styles.notFound, { paddingTop: insets.top }]}>
        <Ionicons name="alert-circle-outline" size={48} color="#B89060" />
        <Text style={styles.notFoundText}>모임을 찾을 수 없어요</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>돌아가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Participation state ──
  const participantCount = entry.participantCount;
  const maxMembers = gathering.maxMembers;
  const isFull = participantCount >= maxMembers;
  const isPending = entry.pendingRequests.some((r) => r.uid === uid);
  const isApproved = entry.approvedMembers.some((m) => m.uid === uid);
  const rejectionReason = entry.rejections[uid];
  const isRejected = !!rejectionReason;
  const hasChatRoom = entry.hasChatRoom;
  const canCreateChat = participantCount >= 2 && !hasChatRoom;

  const handleJoinPress = () => {
    if (isPending) {
      cancelRequest(gathering.id, uid);
    } else if (!isFull && !isApproved && !isRejected) {
      requestJoin(gathering.id, uid, '나');
    }
  };

  const handleApprove = (reqUid: string, nickname: string) => {
    approveRequest(gathering.id, reqUid);
    if (entry.hasChatRoom) {
      Alert.alert('승인 완료', `${nickname}님이 채팅방에 자동으로 초대됐어요 ✓`);
    }
    setRejectingUid(null);
  };

  const confirmReject = (reqUid: string) => {
    rejectRequest(gathering.id, reqUid, rejectReason);
    setRejectingUid(null);
    setRejectReason('');
  };

  // ── CTA button config ──
  type Variant = 'default' | 'pending' | 'approved' | 'rejected' | 'full';
  let variant: Variant = 'default';
  if (isFull && !isPending && !isApproved) variant = 'full';
  else if (isApproved) variant = 'approved';
  else if (isRejected) variant = 'rejected';
  else if (isPending) variant = 'pending';
  const joinDisabled = variant === 'full' || variant === 'approved' || variant === 'rejected';

  const ctaLabel = gathering.isOwn
    ? (hasChatRoom ? '채팅방 입장' : canCreateChat ? '채팅방 만들기' : '모임 관리 중')
    : ({ default: '참여 신청', pending: '신청 취소', approved: '참여 확정 ✓', rejected: '거절됨', full: '모집완료' } as Record<Variant, string>)[variant];

  const isFlash = gathering.type === 'flash';
  const heroBg = isFlash ? '#FFF3E0' : '#FFFBF3';
  const categoryIcon: IoniconName = CATEGORY_ICONS[gathering.category] ?? 'people';

  const progressPct = Math.min(participantCount / maxMembers, 1);
  const statusLabel = isFull ? '모집완료' : isFlash ? '번개모임' : '모집중';
  const statusColor = isFull ? '#B89060' : isFlash ? '#FF8C00' : '#4CAF6A';

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
        <Text style={styles.headerTitle}>모임 상세</Text>
        <View style={styles.headerIconBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Hero banner ── */}
        <View style={[styles.heroBanner, { backgroundColor: heroBg }]}>
          <View style={styles.heroBannerTop}>
            <View style={[styles.typeBadge, { backgroundColor: isFlash ? '#FF8C00' : '#FFAC30' }]}>
              {isFlash && <Ionicons name="flash" size={12} color="#FFFFFF" style={{ marginRight: 3 }} />}
              <Text style={styles.typeBadgeText}>{isFlash ? '번개 모임' : '정기 모임'}</Text>
            </View>
            <View style={[styles.categoryBadge]}>
              <Ionicons name={categoryIcon} size={12} color="#A36E1D" style={{ marginRight: 3 }} />
              <Text style={styles.categoryBadgeText}>{gathering.category}</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>{gathering.title}</Text>
          {isFlash && gathering.deadlineMs && (
            <View style={styles.deadlineRow}>
              <Ionicons name="time-outline" size={14} color="#FF8C00" />
              <Text style={styles.deadlineText}>
                {formatTimeLeft(gathering.deadlineMs)} 남음 · 마감 시 자동 삭제
              </Text>
            </View>
          )}
        </View>

        {/* ── Host row ── */}
        <View style={styles.section}>
          <View style={styles.hostRow}>
            <View style={[styles.hostAvatar, gathering.host.isSheriff && styles.hostAvatarSheriff]}>
              <Ionicons name="person" size={22} color={gathering.host.isSheriff ? '#A36E1D' : '#B89060'} />
            </View>
            <View style={styles.hostInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.hostName}>{gathering.host.nickname}</Text>
                {gathering.host.isSheriff && (
                  <Image
                    source={require('../../assets/images/sheriff_verified.jpg')}
                    style={styles.sheriffBadge}
                  />
                )}
                {gathering.isOwn && (
                  <View style={styles.myBadge}>
                    <Text style={styles.myBadgeText}>내 모임</Text>
                  </View>
                )}
              </View>
              <Text style={styles.hostMeta}>{gathering.timeAgo} · {gathering.category}</Text>
            </View>
            {!gathering.isOwn && (
              <TouchableOpacity
                style={[styles.followBtn, followed && styles.followBtnActive]}
                onPress={() => setFollowed((v) => !v)}
              >
                <Text style={[styles.followBtnText, followed && styles.followBtnTextActive]}>
                  {followed ? '팔로잉' : '팔로우'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Info chips */}
          <View style={styles.infoChips}>
            <View style={styles.infoChip}>
              <Ionicons name="calendar-outline" size={15} color="#A36E1D" />
              <Text style={styles.infoChipText}>{gathering.meetingAt}</Text>
            </View>
            <View style={styles.infoChip}>
              <Ionicons name="people-outline" size={15} color="#A36E1D" />
              <Text style={styles.infoChipText}>{participantCount}/{maxMembers}명</Text>
            </View>
            <View style={styles.infoChip}>
              <Ionicons name="location-outline" size={15} color="#A36E1D" />
              <Text style={styles.infoChipText} numberOfLines={1}>{gathering.location.name}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── Description ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>모임 소개</Text>
          <Text style={styles.description}>{gathering.description}</Text>
          {gathering.tags.length > 0 && (
            <View style={styles.tagRow}>
              {gathering.tags.map((t) => (
                <Text key={t} style={styles.tag}>{t}</Text>
              ))}
            </View>
          )}
        </View>

        <View style={styles.divider} />

        {/* ── 참여 현황 ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>참여 현황</Text>

          {/* Status + count */}
          <View style={styles.participationHeader}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '22', borderColor: statusColor + '66' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
            <Text style={styles.participantCount}>{participantCount}명 참여 중</Text>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBarWrap}>
            <View style={[styles.progressBarFill, { width: `${progressPct * 100}%` as any }]} />
          </View>
          <Text style={styles.progressLabel}>{participantCount}/{maxMembers}명</Text>

          {/* Own: pending request management */}
          {gathering.isOwn && (
            <>
              <Text style={styles.subSectionLabel}>
                신청 중 ({entry.pendingRequests.length}명)
              </Text>
              {entry.pendingRequests.length === 0 ? (
                <Text style={styles.emptyText}>대기 중인 신청이 없어요</Text>
              ) : (
                entry.pendingRequests.map((req) => (
                  <View key={req.uid} style={styles.requestCard}>
                    <View style={styles.requestRow}>
                      <View style={styles.reqAvatar}>
                        <Ionicons name="person" size={16} color="#B89060" />
                      </View>
                      <View style={styles.reqInfo}>
                        <Text style={styles.reqName}>{req.nickname}</Text>
                        <Text style={styles.reqTime}>{req.requestedAt}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.approveBtn}
                        onPress={() => handleApprove(req.uid, req.nickname)}
                      >
                        <Text style={styles.approveBtnText}>승인</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.rejectBtn, rejectingUid === req.uid && styles.rejectBtnOpen]}
                        onPress={() =>
                          rejectingUid === req.uid ? confirmReject(req.uid) : (() => { setRejectingUid(req.uid); setRejectReason(''); })()
                        }
                      >
                        <Text style={[styles.rejectBtnText, rejectingUid === req.uid && styles.rejectBtnTextOpen]}>
                          {rejectingUid === req.uid ? '확인' : '거절'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {rejectingUid === req.uid && (
                      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                        <View style={styles.reasonRow}>
                          <TextInput
                            style={styles.reasonInput}
                            placeholder="거절 사유 (선택)"
                            placeholderTextColor="#B89060"
                            value={rejectReason}
                            onChangeText={setRejectReason}
                            returnKeyType="done"
                            onSubmitEditing={() => confirmReject(req.uid)}
                            autoFocus
                          />
                          <TouchableOpacity
                            style={styles.cancelRejectBtn}
                            onPress={() => setRejectingUid(null)}
                          >
                            <Ionicons name="close" size={16} color="#B89060" />
                          </TouchableOpacity>
                        </View>
                      </KeyboardAvoidingView>
                    )}
                  </View>
                ))
              )}

              {entry.approvedMembers.length > 0 && (
                <>
                  <Text style={[styles.subSectionLabel, { marginTop: 20 }]}>
                    승인된 멤버 ({entry.approvedMembers.length}명)
                  </Text>
                  {entry.approvedMembers.map((m) => (
                    <View key={m.uid} style={styles.approvedRow}>
                      <View style={[styles.reqAvatar, styles.reqAvatarApproved]}>
                        <Ionicons name="person" size={16} color="#A36E1D" />
                      </View>
                      <Text style={styles.approvedName}>{m.nickname}</Text>
                      {entry.hasChatRoom && (
                        <View style={styles.chatBadge}>
                          <Ionicons name="chatbubble" size={11} color="#FFAC30" />
                          <Text style={styles.chatBadgeText}>채팅 초대됨</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </>
              )}
            </>
          )}

          {/* Non-own: show rejection reason if any */}
          {!gathering.isOwn && isRejected && (
            <View style={styles.rejectionRow}>
              <Ionicons name="close-circle" size={14} color="#E05252" />
              <Text style={styles.rejectionText}>거절 사유: {rejectionReason}</Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        {/* ── 장소 안내 ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>장소 안내</Text>
          <View style={styles.locationCard}>
            <View style={styles.locationIconWrap}>
              <Ionicons name="location" size={22} color="#FFAC30" />
            </View>
            <View style={styles.locationInfo}>
              <Text style={styles.locationName}>{gathering.location.name}</Text>
              <Text style={styles.locationCoords}>
                {gathering.location.lat.toFixed(4)}°N, {gathering.location.lng.toFixed(4)}°E
              </Text>
            </View>
            <TouchableOpacity
              style={styles.mapBtn}
              onPress={() => router.push('/(tabs)')}
            >
              <Ionicons name="map-outline" size={14} color="#FFAC30" style={{ marginRight: 4 }} />
              <Text style={styles.mapBtnText}>지도에서 보기</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom spacer for sticky CTA */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Sticky CTA ── */}
      <View style={[styles.stickyBottom, { paddingBottom: insets.bottom + 12 }]}>
        {gathering.isOwn ? (
          <TouchableOpacity
            style={[styles.ctaBtn, hasChatRoom && styles.ctaBtnChat]}
            onPress={() => {
              if (!hasChatRoom && canCreateChat) {
                createChatRoom(gathering.id);
                Alert.alert('채팅방이 만들어졌어요!', '승인된 멤버들에게 알림이 전송됩니다 ✓');
              }
            }}
            activeOpacity={hasChatRoom && !canCreateChat ? 1 : 0.85}
          >
            <Ionicons
              name={hasChatRoom ? 'chatbubbles' : 'chatbubbles-outline'}
              size={18}
              color="#1A1108"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.ctaBtnText}>{ctaLabel}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.ctaBtn,
              variant === 'pending'  && styles.ctaBtnPending,
              variant === 'approved' && styles.ctaBtnApproved,
              (variant === 'rejected' || variant === 'full') && styles.ctaBtnMuted,
            ]}
            onPress={handleJoinPress}
            disabled={joinDisabled}
            activeOpacity={joinDisabled ? 1 : 0.85}
          >
            <Text style={[
              styles.ctaBtnText,
              variant === 'pending'  && styles.ctaBtnTextPending,
              variant === 'approved' && styles.ctaBtnTextApproved,
              (variant === 'rejected' || variant === 'full') && styles.ctaBtnTextMuted,
            ]}>
              {ctaLabel}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  notFound: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  notFoundText: { fontSize: 16, fontFamily: 'AppleSDGothicNeo-Medium', color: '#7A5C38' },
  backBtn: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#FFAC30', borderRadius: 14 },
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
  headerTitle: { fontSize: 17, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108' },

  // Hero banner
  heroBanner: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  heroBannerTop: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  typeBadgeText: { fontSize: 12, fontFamily: 'AppleSDGothicNeo-Bold', color: '#FFFFFF' },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FFE0A0',
  },
  categoryBadgeText: { fontSize: 12, fontFamily: 'AppleSDGothicNeo-Medium', color: '#A36E1D' },
  heroTitle: {
    fontSize: 22,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
    lineHeight: 30,
    marginBottom: 8,
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  deadlineText: { fontSize: 13, fontFamily: 'AppleSDGothicNeo-SemiBold', color: '#FF8C00' },

  // Section
  section: { paddingHorizontal: 16, paddingVertical: 18 },
  sectionLabel: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#8A6030',
    letterSpacing: 0.4,
    marginBottom: 14,
  },

  // Host
  hostRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  hostAvatar: {
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
  hostAvatarSheriff: { borderColor: '#FFAC30', borderWidth: 2 },
  hostInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  hostName: { fontSize: 15, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108' },
  sheriffBadge: { width: 60, height: 20, resizeMode: 'contain' },
  myBadge: {
    backgroundColor: '#FFF0D4',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFAC30',
  },
  myBadgeText: { fontSize: 10, fontFamily: 'AppleSDGothicNeo-SemiBold', color: '#A36E1D' },
  hostMeta: { fontSize: 12, fontFamily: 'AppleSDGothicNeo-Regular', color: '#B89060' },
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

  // Info chips
  infoChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFBF3',
    borderWidth: 1,
    borderColor: '#FFE0A0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  infoChipText: { fontSize: 13, fontFamily: 'AppleSDGothicNeo-Medium', color: '#7A5C38' },

  // Divider
  divider: { height: 8, backgroundColor: '#F5F5F5' },

  // Description
  description: {
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#1A1108',
    lineHeight: 24,
    marginBottom: 12,
  },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { fontSize: 13, fontFamily: 'AppleSDGothicNeo-Medium', color: '#A36E1D' },

  // Participation
  participationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontFamily: 'AppleSDGothicNeo-SemiBold' },
  participantCount: { fontSize: 13, fontFamily: 'AppleSDGothicNeo-Regular', color: '#7A5C38' },
  progressBarWrap: {
    height: 6,
    backgroundColor: '#F5F5F5',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFAC30',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#B89060',
    marginBottom: 20,
    textAlign: 'right',
  },
  subSectionLabel: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#7A5C38',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#B89060',
    paddingVertical: 12,
  },

  // Request card
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D4D4D4',
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  requestRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reqAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D4D4D4',
    flexShrink: 0,
  },
  reqAvatarApproved: { borderColor: '#FFAC30' },
  reqInfo: { flex: 1 },
  reqName: { fontSize: 14, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108' },
  reqTime: { fontSize: 12, fontFamily: 'AppleSDGothicNeo-Regular', color: '#B89060', marginTop: 2 },
  approveBtn: {
    backgroundColor: '#FFAC30',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 9,
  },
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
  rejectBtnText: { fontSize: 13, fontFamily: 'AppleSDGothicNeo-Medium', color: '#7A5C38' },
  rejectBtnTextOpen: { color: '#E05252', fontFamily: 'AppleSDGothicNeo-Bold' },
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
    backgroundColor: '#F5F5F5',
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
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
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
  chatBadgeText: { fontSize: 11, fontFamily: 'AppleSDGothicNeo-Medium', color: '#A36E1D' },

  // Rejection
  rejectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    marginTop: 12,
  },
  rejectionText: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#E05252',
    flex: 1,
  },

  // Location
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFBF3',
    borderWidth: 1,
    borderColor: '#FFE0A0',
    borderRadius: 16,
    padding: 16,
  },
  locationIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE0A0',
    flexShrink: 0,
  },
  locationInfo: { flex: 1 },
  locationName: { fontSize: 15, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108', marginBottom: 3 },
  locationCoords: { fontSize: 12, fontFamily: 'AppleSDGothicNeo-Regular', color: '#B89060' },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FFE0A0',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  mapBtnText: { fontSize: 12, fontFamily: 'AppleSDGothicNeo-SemiBold', color: '#A36E1D' },

  // Sticky CTA
  stickyBottom: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#D4D4D4',
    backgroundColor: '#FFFFFF',
  },
  ctaBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFAC30',
    borderRadius: 16,
    paddingVertical: 16,
  },
  ctaBtnChat: { backgroundColor: '#1A1108' },
  ctaBtnPending: { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#FFAC30' },
  ctaBtnApproved: { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#4CAF6A' },
  ctaBtnMuted: { backgroundColor: '#F5F5F5' },
  ctaBtnText: { fontSize: 16, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108' },
  ctaBtnTextPending: { color: '#FFAC30' },
  ctaBtnTextApproved: { color: '#4CAF6A' },
  ctaBtnTextMuted: { color: '#B89060' },
});
