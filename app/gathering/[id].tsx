// 경로: app/gathering/[id].tsx
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  FirestoreGathering,
  GatheringParticipant,
  approveJoin,
  cancelGathering,
  cancelJoin,
  completeGathering,
  deleteGathering,
  openChatRoom,
  rejectJoin,
  requestJoin as apiRequestJoin,
  subscribeGathering,
} from '../../src/api/gatherings';
import { formatTimeAgo } from '../../src/api/posts';
import { fetchMyProfile, followUser, unfollowUser } from '../../src/api/users';
import { useAuthStore } from '../../src/store/authStore';
import { formatTimeLeft } from '../../src/constants/mockGatherings';
import MiniMap from '../../src/components/MiniMap';
import ShareModal from '../../src/components/ShareModal';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const CATEGORY_ICONS: Record<string, IoniconName> = {
  '산책·운동': 'walk',
  '맛집': 'restaurant',
  '문화·예술': 'musical-notes',
  '독서': 'book',
  '게임': 'game-controller',
  '봉사': 'heart',
  '스터디': 'book',
  '취미': 'game-controller',
};

// ── 참여자 프로필 미니 모달 ────────────────────────────────────────────────────

function MemberProfileModal({
  member,
  myUid,
  myFollowing,
  onFollowToggle,
  onClose,
}: {
  member: GatheringParticipant | null;
  myUid: string;
  myFollowing: string[];
  onFollowToggle: (targetUid: string) => void;
  onClose: () => void;
}) {
  if (!member) return null;
  const isOwnProfile = member.uid === myUid;
  const isFollowing = myFollowing.includes(member.uid);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={modal.backdrop} onPress={onClose}>
        <Pressable style={modal.card} onPress={() => {}}>
          <View style={modal.avatar}>
            <Ionicons name="person" size={36} color="#1A1108" />
          </View>
          <Text style={modal.nickname}>{member.nickname}</Text>

          {!isOwnProfile && (
            <TouchableOpacity
              style={[modal.followBtn, isFollowing && modal.followBtnActive]}
              onPress={() => onFollowToggle(member.uid)}
              activeOpacity={0.85}
            >
              <Text style={[modal.followBtnText, isFollowing && modal.followBtnTextActive]}>
                {isFollowing ? '팔로잉' : '팔로우'}
              </Text>
            </TouchableOpacity>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────────

export default function GatheringDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();

  const [gathering, setGathering] = useState<FirestoreGathering | null | undefined>(undefined);
  const [myFollowing, setMyFollowing] = useState<string[]>([]);
  const [showShare, setShowShare] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [rejectingUid,  setRejectingUid]  = useState<string | null>(null);
  const [rejectReason,  setRejectReason]  = useState('');
  const [selectedMember, setSelectedMember] = useState<GatheringParticipant | null>(null);

  const uid = useAuthStore(
    (s) => s.user?.uid ?? (s.kakaoUser ? `kakao_${s.kakaoUser.id}` : 'guest'),
  );
  const nickname = useAuthStore((s) => s.kakaoUser?.nickname ?? s.user?.displayName ?? '나');

  useEffect(() => {
    if (!id) return;
    const unsub = subscribeGathering(id, (g) => setGathering(g ?? null));
    return unsub;
  }, [id]);

  useEffect(() => {
    if (!uid || uid === 'guest') return;
    fetchMyProfile(uid).then((p) => setMyFollowing(p?.following ?? []));
  }, [uid]);

  const handleFollowToggle = async (targetUid: string) => {
    const isFollowing = myFollowing.includes(targetUid);
    setMyFollowing((prev) =>
      isFollowing ? prev.filter((id) => id !== targetUid) : [...prev, targetUid]
    );
    try {
      if (isFollowing) {
        await unfollowUser(uid, targetUid);
      } else {
        await followUser(uid, targetUid);
      }
    } catch {
      setMyFollowing((prev) =>
        isFollowing ? [...prev, targetUid] : prev.filter((id) => id !== targetUid)
      );
    }
  };

  if (gathering === undefined) {
    return (
      <View style={[styles.notFound, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#FFAC30" />
      </View>
    );
  }

  if (!gathering) {
    return (
      <View style={[styles.notFound, { paddingTop: insets.top }]}>
        <Ionicons name="alert-circle-outline" size={48} color="#1A1108" />
        <Text style={styles.notFoundText}>모임을 찾을 수 없어요</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>돌아가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isOwn          = gathering.host_id === uid;
  const participantCnt = gathering.participants.length;
  const maxMembers     = gathering.max_members;
  const isFull         = participantCnt >= maxMembers;
  const isPending      = gathering.pending_requests.some((r) => r.uid === uid);
  const isApproved     = !isOwn && gathering.participants.some((p) => p.uid === uid);
  const rejectionReason = gathering.rejections[uid];
  const isRejected     = !!rejectionReason;
  const hasChatRoom    = gathering.has_chat_room;
  const canCreateChat  = participantCnt >= 2 && !hasChatRoom;

  const handleJoinPress = async () => {
    if (isPending) {
      await cancelJoin(gathering.id, uid).catch(() => {});
    } else if (!isFull && !isApproved && !isRejected) {
      await apiRequestJoin(gathering.id, uid, nickname).catch(() => {});
    }
  };

  const handleApprove = async (reqUid: string, reqNickname: string) => {
    await approveJoin(gathering.id, reqUid, reqNickname).catch(() => {});
    if (hasChatRoom) {
      Alert.alert('참여 완료', `${reqNickname}님이 채팅방에 자동으로 추가됐어요`);
    }
    setRejectingUid(null);
  };

  const confirmReject = async (reqUid: string) => {
    await rejectJoin(gathering.id, reqUid, rejectReason).catch(() => {});
    setRejectingUid(null);
    setRejectReason('');
  };

  const handleOpenChat = async () => {
    if (!hasChatRoom && canCreateChat) {
      await openChatRoom(gathering.id).catch(() => {});
      Alert.alert('채팅방이 만들어졌어요!', '승인된 멤버들에게 알림이 발송됩니다');
    }
  };

  const handleComplete = () => {
    Alert.alert('모임 완료', '모임을 완료 처리할까요? +10점이 적립됩니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '완료',
        onPress: async () => {
          await completeGathering(gathering.id, uid).catch(() => {});
        },
      },
    ]);
  };

  const handleCancelGathering = () => {
    Alert.alert('모임 취소', '모임을 취소할까요? -20점 패널티가 있습니다.', [
      { text: '아니요', style: 'cancel' },
      {
        text: '취소하기',
        style: 'destructive',
        onPress: async () => {
          await cancelGathering(gathering.id, uid).catch(() => {});
          router.back();
        },
      },
    ]);
  };

  const handleDeleteGathering = () => {
    setShowMenu(false);
    Alert.alert('모임 삭제', '이 모임을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await deleteGathering(gathering.id).catch(() => {});
          router.back();
        },
      },
    ]);
  };

  type Variant = 'default' | 'pending' | 'approved' | 'rejected' | 'full';
  let variant: Variant = 'default';
  if (isFull && !isPending && !isApproved) variant = 'full';
  else if (isApproved) variant = 'approved';
  else if (isRejected) variant = 'rejected';
  else if (isPending)  variant = 'pending';
  const joinDisabled = variant === 'full' || variant === 'approved' || variant === 'rejected';

  const ctaLabel = isOwn
    ? (hasChatRoom ? '채팅방 입장' : canCreateChat ? '채팅방 만들기' : '모임 관리 중')
    : ({ default: '참여 신청', pending: '신청 취소', approved: '참여 확정 ✓', rejected: '거절됨', full: '모집완료' } as Record<Variant, string>)[variant];

  const isFlash  = gathering.type === 'flash';
  const heroBg   = isFlash ? '#FFF3E0' : '#FFFBF3';
  const categoryIcon: IoniconName = CATEGORY_ICONS[gathering.category] ?? 'people';
  const progressPct  = Math.min(participantCnt / maxMembers, 1);
  const statusLabel  = isFull ? '모집완료' : isFlash ? '번개모임' : '모집중';
  const statusColor  = isFull ? '#1A1108' : isFlash ? '#FF8C00' : '#4CAF6A';

  return (
    <View style={styles.root}>
      <MemberProfileModal
        member={selectedMember}
        myUid={uid}
        myFollowing={myFollowing}
        onFollowToggle={handleFollowToggle}
        onClose={() => setSelectedMember(null)}
      />

      <ShareModal
        visible={showShare}
        onClose={() => setShowShare(false)}
        myUid={uid}
        shareText={`[모임 공유] ${gathering?.title ?? ''}\n📍 ${gathering?.location.name ?? ''}\n🗓 ${gathering?.meeting_at ?? ''}\n\n보안관 앱에서 확인하세요!`}
      />

      {/* 3-dot 삭제 메뉴 */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <Pressable style={menuStyles.backdrop} onPress={() => setShowMenu(false)}>
          <View style={menuStyles.sheet}>
            <TouchableOpacity style={menuStyles.item} onPress={handleDeleteGathering} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={20} color="#E05252" />
              <Text style={menuStyles.itemDanger}>삭제하기</Text>
            </TouchableOpacity>
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
        <Text style={styles.headerTitle}>모임 상세</Text>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => isOwn ? setShowMenu(true) : setShowShare(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name={isOwn ? 'ellipsis-vertical' : 'share-outline'} size={24} color="#1A1108" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero banner */}
        <View style={[styles.heroBanner, { backgroundColor: heroBg }]}>
          <View style={styles.heroBannerTop}>
            <View style={[styles.typeBadge, { backgroundColor: isFlash ? '#FF8C00' : '#FFAC30' }]}>
              {isFlash && <Ionicons name="flash" size={12} color="#FFFFFF" style={{ marginRight: 3 }} />}
              <Text style={styles.typeBadgeText}>{isFlash ? '번개 모임' : '정기 모임'}</Text>
            </View>
            <View style={styles.categoryBadge}>
              <Ionicons name={categoryIcon} size={12} color="#1A1108" style={{ marginRight: 3 }} />
              <Text style={styles.categoryBadgeText}>{gathering.category}</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>{gathering.title}</Text>
          {isFlash && gathering.deadline_ms && (
            <View style={styles.deadlineRow}>
              <Ionicons name="time-outline" size={14} color="#FF8C00" />
              <Text style={styles.deadlineText}>
                {formatTimeLeft(gathering.deadline_ms)} 후 · 마감 시 자동 삭제
              </Text>
            </View>
          )}
        </View>

        {/* Host row */}
        <View style={styles.section}>
          <View style={styles.hostRow}>
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/user/[uid]', params: { uid: gathering.host_id } })}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <View style={[styles.hostAvatar, gathering.host_is_sheriff && styles.hostAvatarSheriff]}>
                <Ionicons name="person" size={22} color="#1A1108" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.hostInfo}
              onPress={() => router.push({ pathname: '/user/[uid]', params: { uid: gathering.host_id } })}
            >
              <View style={styles.nameRow}>
                <Text style={styles.hostName}>{gathering.host_nickname}</Text>
                {gathering.host_is_sheriff && (
                  <Image
                    source={require('../../assets/images/sheriff_verified.jpg')}
                    style={styles.sheriffBadge}
                  />
                )}
                {isOwn && (
                  <View style={styles.myBadge}>
                    <Text style={styles.myBadgeText}>내 모임</Text>
                  </View>
                )}
              </View>
              <Text style={styles.hostMeta}>{formatTimeAgo(gathering.created_at)} · {gathering.category}</Text>
            </TouchableOpacity>
            {!isOwn && (
              <TouchableOpacity
                style={[styles.followBtn, myFollowing.includes(gathering.host_id) && styles.followBtnActive]}
                onPress={() => handleFollowToggle(gathering.host_id)}
              >
                <Text style={[styles.followBtnText, myFollowing.includes(gathering.host_id) && styles.followBtnTextActive]}>
                  {myFollowing.includes(gathering.host_id) ? '팔로잉' : '팔로우'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Info chips */}
          <View style={styles.infoChips}>
            <View style={styles.infoChip}>
              <Ionicons name="calendar-outline" size={15} color="#1A1108" />
              <Text style={styles.infoChipText}>{gathering.meeting_at}</Text>
            </View>
            <View style={styles.infoChip}>
              <Ionicons name="people-outline" size={15} color="#1A1108" />
              <Text style={styles.infoChipText}>{participantCnt}/{maxMembers}명</Text>
            </View>
            <View style={styles.infoChip}>
              <Ionicons name="location-outline" size={15} color="#1A1108" />
              <Text style={styles.infoChipText} numberOfLines={1}>{gathering.location.name}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Description */}
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

        {/* 참여 인원 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>참여 인원</Text>

          <View style={styles.participationHeader}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '22', borderColor: statusColor + '66' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
            <Text style={styles.participantCount}>{participantCnt}명 참여 중</Text>
          </View>

          <View style={styles.progressBarWrap}>
            <View style={[styles.progressBarFill, { width: `${progressPct * 100}%` as any }]} />
          </View>
          <Text style={styles.progressLabel}>{participantCnt}/{maxMembers}명</Text>

          {/* 참여자 아바타 스트립 */}
          {gathering.participants.length > 0 && (
            <>
              <Text style={styles.subSectionLabel}>참여자 {gathering.participants.length}명</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.memberStripContent}
                style={styles.memberStrip}
              >
                {gathering.participants.map((m) => (
                  <TouchableOpacity
                    key={m.uid}
                    style={styles.memberItem}
                    onPress={() => setSelectedMember(m)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.memberAvatar}>
                      <Ionicons name="person" size={20} color="#1A1108" />
                    </View>
                    <Text style={styles.memberName} numberOfLines={1}>{m.nickname}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {/* 호스트: 신청 대기 관리 */}
          {isOwn && (
            <>
              <Text style={[styles.subSectionLabel, { marginTop: gathering.participants.length > 0 ? 20 : 0 }]}>
                신청 대기 ({gathering.pending_requests.length}명)
              </Text>
              {gathering.pending_requests.length === 0 ? (
                <Text style={styles.emptyText}>대기 중인 신청이 없어요</Text>
              ) : (
                gathering.pending_requests.map((req) => (
                  <View key={req.uid} style={styles.requestCard}>
                    <View style={styles.requestRow}>
                      <View style={styles.reqAvatar}>
                        <Ionicons name="person" size={16} color="#1A1108" />
                      </View>
                      <View style={styles.reqInfo}>
                        <Text style={styles.reqName}>{req.nickname}</Text>
                        <Text style={styles.reqTime}>{req.requested_at}</Text>
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
                          rejectingUid === req.uid
                            ? confirmReject(req.uid)
                            : (() => { setRejectingUid(req.uid); setRejectReason(''); })()
                        }
                      >
                        <Text style={[styles.rejectBtnText, rejectingUid === req.uid && styles.rejectBtnTextOpen]}>
                          {rejectingUid === req.uid ? '확인' : '거절'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {rejectingUid === req.uid && (
                      <KeyboardAvoidingView behavior="padding">
                        <View style={styles.reasonRow}>
                          <TextInput
                            style={styles.reasonInput}
                            placeholder="거절 이유 (선택)"
                            placeholderTextColor="#1A1108"
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
                            <Ionicons name="close" size={16} color="#1A1108" />
                          </TouchableOpacity>
                        </View>
                      </KeyboardAvoidingView>
                    )}
                  </View>
                ))
              )}
            </>
          )}

          {/* 비호스트: 거절 사유 */}
          {!isOwn && isRejected && (
            <View style={styles.rejectionRow}>
              <Ionicons name="close-circle" size={14} color="#E05252" />
              <Text style={styles.rejectionText}>거절 이유: {rejectionReason}</Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        {/* 장소 안내 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>장소 안내</Text>
          <MiniMap
            lat={gathering.location.lat}
            lng={gathering.location.lng}
            title={gathering.location.name}
            height={210}
            onExpand={() => router.replace('/(tabs)')}
          />
          <View style={styles.locationMeta}>
            <Ionicons name="location" size={15} color="#FFAC30" />
            <Text style={styles.locationName}>{gathering.location.name}</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky CTA */}
      <View style={[styles.stickyBottom, { paddingBottom: insets.bottom + 12 }]}>
        {isOwn ? (
          <View style={styles.hostBtnRow}>
            <TouchableOpacity
              style={[styles.ctaBtn, styles.hostChatBtn, hasChatRoom && styles.ctaBtnChat]}
              onPress={handleOpenChat}
              activeOpacity={hasChatRoom && !canCreateChat ? 1 : 0.85}
            >
              <Ionicons
                name={hasChatRoom ? 'chatbubbles' : 'chatbubbles-outline'}
                size={18}
                color={hasChatRoom ? '#FFFFFF' : '#1A1108'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.ctaBtnText, hasChatRoom && { color: '#FFFFFF' }]}>{ctaLabel}</Text>
            </TouchableOpacity>
            {(gathering.status === 'recruiting' || gathering.status === 'full') && (
              <>
                <TouchableOpacity style={[styles.ctaBtn, styles.hostCompleteBtn]} onPress={handleComplete} activeOpacity={0.85}>
                  <Text style={[styles.ctaBtnText, { color: '#4CAF6A' }]}>완료</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.ctaBtn, styles.hostCancelBtn]} onPress={handleCancelGathering} activeOpacity={0.85}>
                  <Text style={[styles.ctaBtnText, { color: '#E05252' }]}>취소</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
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
  notFoundText: { fontSize: 16, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108' },
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

  heroBanner: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 },
  heroBannerTop: { flexDirection: 'row', gap: 8, marginBottom: 10 },
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
  categoryBadgeText: { fontSize: 12, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108' },
  heroTitle: {
    fontSize: 22,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
    lineHeight: 30,
    marginBottom: 8,
  },
  deadlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  deadlineText: { fontSize: 13, fontFamily: 'AppleSDGothicNeo-SemiBold', color: '#FF8C00' },

  section: { paddingHorizontal: 16, paddingVertical: 18 },
  sectionLabel: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#8A6030',
    letterSpacing: 0.4,
    marginBottom: 14,
  },

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
  myBadgeText: { fontSize: 10, fontFamily: 'AppleSDGothicNeo-SemiBold', color: '#1A1108' },
  hostMeta: { fontSize: 12, fontFamily: 'AppleSDGothicNeo-Regular', color: '#1A1108' },
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
  infoChipText: { fontSize: 13, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108' },

  divider: { height: 8, backgroundColor: '#F5F5F5' },

  description: {
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#1A1108',
    lineHeight: 24,
    marginBottom: 12,
  },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { fontSize: 13, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108' },

  participationHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
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
  participantCount: { fontSize: 13, fontFamily: 'AppleSDGothicNeo-Regular', color: '#1A1108' },
  progressBarWrap: {
    height: 6,
    backgroundColor: '#F5F5F5',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: { height: '100%', backgroundColor: '#FFAC30', borderRadius: 3 },
  progressLabel: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#1A1108',
    marginBottom: 20,
    textAlign: 'right',
  },

  memberStrip: { marginHorizontal: -16 },
  memberStripContent: { paddingHorizontal: 16, gap: 12, paddingBottom: 4 },
  memberItem: { alignItems: 'center', width: 76 },
  memberAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#D4D4D4',
    overflow: 'hidden',
    marginBottom: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  memberName: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#1A1108',
    textAlign: 'center',
  },

  subSectionLabel: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#1A1108',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#1A1108',
    paddingVertical: 12,
  },

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
  rejectBtnText: { fontSize: 13, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108' },
  rejectBtnTextOpen: { color: '#E05252' },
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
  rejectionText: { fontSize: 13, fontFamily: 'AppleSDGothicNeo-Regular', color: '#E05252', flex: 1 },

  locationMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 12 },
  locationName: { fontSize: 14, fontFamily: 'AppleSDGothicNeo-SemiBold', color: '#1A1108', flex: 1 },

  stickyBottom: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#D4D4D4',
    backgroundColor: '#FFFFFF',
  },
  hostBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  hostChatBtn: { flex: 1 },
  hostCompleteBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#4CAF6A',
    paddingHorizontal: 16,
  },
  hostCancelBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E05252',
    paddingHorizontal: 16,
  },
  ctaBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFAC30',
    borderRadius: 16,
    paddingVertical: 16,
  },
  ctaBtnChat:     { backgroundColor: '#1A1108' },
  ctaBtnPending:  { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#FFAC30' },
  ctaBtnApproved: { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#4CAF6A' },
  ctaBtnMuted:    { backgroundColor: '#F5F5F5' },
  ctaBtnText:     { fontSize: 16, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108' },
  ctaBtnTextPending:  { color: '#FFAC30' },
  ctaBtnTextApproved: { color: '#4CAF6A' },
  ctaBtnTextMuted:    { color: '#1A1108' },
});

const modal = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 32,
    paddingVertical: 28,
    alignItems: 'center',
    width: 280,
    gap: 10,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2.5,
    borderColor: '#D4D4D4',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    marginBottom: 4,
  },
  nickname: { fontSize: 18, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108' },
  followBtn: {
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#FFAC30',
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  followBtnActive: { backgroundColor: '#FFAC30' },
  followBtnText: { fontSize: 14, fontFamily: 'AppleSDGothicNeo-Bold', color: '#FFAC30' },
  followBtnTextActive: { color: '#1A1108' },
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
  itemCancel: { fontSize: 16, fontFamily: 'AppleSDGothicNeo-Regular', color: '#9E9E9E' },
});
