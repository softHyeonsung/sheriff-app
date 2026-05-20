import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { logout } from '../../src/api/auth';
import { clearKakaoSession } from '../../src/api/kakaoAuth';
import { FirestorePost, subscribeFeedPosts } from '../../src/api/posts';
import { loadSavedPins } from '../../src/api/savedPlaces';
import { FollowUserProfile, LeaderboardEntry, UserProfile, fetchFollowers, fetchFollowing, fetchLeaderboard, fetchMyProfile, followUser, unfollowUser } from '../../src/api/users';
import { MapPin } from '../../src/store/mapStore';
import { BadgeDefinition, getBadge } from '../../src/constants/badges';
import ShieldIcon from '../../src/components/ShieldIcon';
import { useAuthStore } from '../../src/store/authStore';

const SCREEN_W = Dimensions.get('window').width;
const CELL = SCREEN_W / 3;


type ListModalType = 'places' | 'followers' | 'following' | null;

// ─────────────────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const insets       = useSafeAreaInsets();
  const router       = useRouter();
  const setUser      = useAuthStore((s) => s.setUser);
  const setKakaoUser = useAuthStore((s) => s.setKakaoUser);
  const kakaoUser    = useAuthStore((s) => s.kakaoUser);
  const firebaseUser = useAuthStore((s) => s.user);

  const [activeTab, setActiveTab]           = useState<'posts' | 'badges'>('posts');
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [scoreTab, setScoreTab]             = useState<'activity' | 'ranking'>('activity');
  const [listModal, setListModal]           = useState<ListModalType>(null);
  const [profile, setProfile]               = useState<UserProfile | null>(null);
  const [myPosts, setMyPosts]               = useState<FirestorePost[]>([]);
  const [followersList, setFollowersList]   = useState<FollowUserProfile[]>([]);
  const [followingList, setFollowingList]   = useState<FollowUserProfile[]>([]);
  const [savedPinsList, setSavedPinsList]   = useState<MapPin[]>([]);
  const [listLoading, setListLoading]       = useState(false);
  const [leaderboard, setLeaderboard]       = useState<LeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  const uid      = firebaseUser?.uid ?? (kakaoUser ? `kakao_${kakaoUser.id}` : null);
  const nickname = kakaoUser?.nickname ?? firebaseUser?.displayName ?? '닉네임 없음';

  useEffect(() => {
    if (!uid) return;
    fetchMyProfile(uid).then(setProfile).catch(() => {});
    loadSavedPins(uid).then(setSavedPinsList).catch(() => {});
    const unsub = subscribeFeedPosts((all) => {
      setMyPosts(all.filter((p) => p.author_id === uid));
    });
    return unsub;
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    if (listModal === 'followers') {
      setListLoading(true);
      fetchFollowers(uid)
        .then(setFollowersList)
        .catch(() => setFollowersList([]))
        .finally(() => setListLoading(false));
    } else if (listModal === 'following') {
      setListLoading(true);
      fetchFollowing(uid)
        .then(setFollowingList)
        .catch(() => setFollowingList([]))
        .finally(() => setListLoading(false));
    }
  }, [listModal, uid]);

  // 다음 등급까지의 진행도
  const RANK_THRESHOLDS = [0, 100, 300, 600, 1000, 2000, Infinity];
  const myScore = profile?.sheriff_score ?? 0;
  const nextThreshold = RANK_THRESHOLDS.find((t) => t > myScore) ?? Infinity;
  const prevThreshold = [...RANK_THRESHOLDS].reverse().find((t) => t <= myScore) ?? 0;
  const rankProgress = nextThreshold === Infinity
    ? 1
    : (myScore - prevThreshold) / (nextThreshold - prevThreshold);

  useEffect(() => {
    if (!showScoreModal || scoreTab !== 'ranking') return;
    setLoadingLeaderboard(true);
    fetchLeaderboard()
      .then(setLeaderboard)
      .catch(() => setLeaderboard([]))
      .finally(() => setLoadingLeaderboard(false));
  }, [showScoreModal, scoreTab]);

  const closeScoreModal = () => { setShowScoreModal(false); setScoreTab('activity'); };

  const handleFollowInModal = async (targetUid: string, isCurrentlyFollowing: boolean) => {
    if (!uid) return;
    if (isCurrentlyFollowing) {
      setFollowingList((prev) => prev.filter((u) => u.uid !== targetUid));
      setProfile((p) => p ? { ...p, following: p.following.filter((id) => id !== targetUid) } : p);
      try { await unfollowUser(uid, targetUid); } catch {
        fetchMyProfile(uid).then(setProfile).catch(() => {});
        fetchFollowing(uid).then(setFollowingList).catch(() => {});
      }
    } else {
      setProfile((p) => p ? { ...p, following: [...p.following, targetUid] } : p);
      try { await followUser(uid, targetUid); } catch {
        fetchMyProfile(uid).then(setProfile).catch(() => {});
      }
    }
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            await clearKakaoSession();
          } catch (e) {
            console.warn('[auth] logout error:', e);
          } finally {
            setKakaoUser(null);
            setUser(null);
            router.replace('/login');
          }
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 96 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Profile header ────────────────────────────────────────────── */}
      <View style={styles.header}>
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={36} color="#1A1108" />
          </View>
          <TouchableOpacity style={styles.cameraBtn} accessibilityLabel="프로필 사진 변경">
            <Ionicons name="camera" size={11} color="#1A1108" />
          </TouchableOpacity>
        </View>

        {/* Nickname + stats */}
        <View style={styles.headerRight}>
          <View style={styles.nicknameRow}>
            <Text style={styles.nickname}>{nickname}</Text>
            <ShieldIcon size={18} />
          </View>
          <TouchableOpacity style={styles.rankChip} onPress={() => setShowScoreModal(true)} activeOpacity={0.75}>
            <Ionicons name="trophy" size={12} color="#FFAC30" />
            <Text style={styles.rankChipText}>{profile?.rank_level ?? '새내기'}</Text>
            <Text style={styles.rankChipSub}> · {(profile?.sheriff_score ?? 0).toLocaleString()}점</Text>
          </TouchableOpacity>
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statItem} onPress={() => setListModal('places')}>
              <Text style={styles.statValue}>{savedPinsList.length}</Text>
              <Text style={styles.statLabel}>장소</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem} onPress={() => setListModal('followers')}>
              <Text style={styles.statValue}>{profile?.followers.length ?? 0}</Text>
              <Text style={styles.statLabel}>팔로워</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem} onPress={() => setListModal('following')}>
              <Text style={styles.statValue}>{profile?.following.length ?? 0}</Text>
              <Text style={styles.statLabel}>팔로잉</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Settings */}
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => Alert.alert('설정', '준비 중이에요.', [
            { text: '로그아웃', style: 'destructive', onPress: handleLogout },
            { text: '닫기', style: 'cancel' },
          ])}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="settings-outline" size={22} color="#1A1108" />
        </TouchableOpacity>
      </View>

      {/* ── Sheriff Score ──────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.scoreSection}
        onPress={() => setShowScoreModal(true)}
        activeOpacity={0.75}
      >
        <View style={styles.scoreTopRow}>
          <Text style={styles.scoreLabel}>Sheriff Score</Text>
          <Text style={styles.scoreRankText}>{profile?.rank_level ?? '새내기'}</Text>
          <Ionicons name="chevron-forward" size={14} color="#9A9A9A" style={{ marginLeft: 2 }} />
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(rankProgress * 100)}%` }]} />
        </View>
      </TouchableOpacity>

      <View style={styles.divider} />

      {/* ── Content tabs ──────────────────────────────────────────────── */}
      <View style={styles.tabBar}>
        {(['posts', 'badges'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab === 'posts' ? '게시물' : '뱃지'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Post grid ─────────────────────────────────────────────────── */}
      {activeTab === 'posts' && (
        myPosts.length > 0 ? (
          <View style={styles.grid}>
            {myPosts.map((post) => (
              <TouchableOpacity key={post.id} activeOpacity={0.85} style={styles.gridCell}>
                {post.media_urls?.[0] ? (
                  <Image source={{ uri: post.media_urls[0] }} style={styles.gridImage} />
                ) : (
                  <View style={[styles.gridImage, styles.gridPlaceholder]}>
                    <Ionicons name="image-outline" size={22} color="#D4D4D4" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="image-outline" size={40} color="#D4D4D4" />
            <Text style={styles.emptyText}>아직 게시물이 없어요</Text>
          </View>
        )
      )}

      {activeTab === 'badges' && (() => {
        const myBadges = (profile?.badge_list ?? [])
          .map((id) => getBadge(id))
          .filter((b): b is BadgeDefinition => !!b);
        return myBadges.length > 0 ? (
          <View style={styles.badgeGrid}>
            {myBadges.map((badge) => (
              <View key={badge.id} style={styles.badgeItem}>
                <View style={[styles.badgeIconWrap, { backgroundColor: badge.color + '22' }]}>
                  <Ionicons name={badge.icon} size={30} color={badge.color} />
                </View>
                <Text style={styles.badgeName} numberOfLines={1}>{badge.name}</Text>
                <Text style={styles.badgeDesc} numberOfLines={1}>{badge.description}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <ShieldIcon size={40} />
            <Text style={styles.emptyText}>아직 획득한 뱃지가 없어요</Text>
            <Text style={styles.emptySubText}>활동하면 뱃지가 쌓여요!</Text>
          </View>
        );
      })()}

      {/* ── List Modal (장소 / 팔로워 / 팔로잉) ──────────────────────────── */}
      <Modal
        visible={listModal !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setListModal(null)}
      >
        <TouchableOpacity
          style={styles.modalBg}
          activeOpacity={1}
          onPress={() => setListModal(null)}
        />
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {listModal === 'places' ? '저장한 장소' : listModal === 'followers' ? '팔로워' : '팔로잉'}
            </Text>
            <TouchableOpacity onPress={() => setListModal(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color="#1A1108" />
            </TouchableOpacity>
          </View>

          {/* 장소 목록 */}
          {listModal === 'places' && (
            <FlatList
              data={savedPinsList}
              keyExtractor={(item) => item.id}
              style={styles.listScroll}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.listSep} />}
              ListEmptyComponent={
                <View style={styles.listEmptyWrap}>
                  <Ionicons name="location-outline" size={36} color="#D4D4D4" />
                  <Text style={styles.listEmptyText}>저장한 장소가 없어요</Text>
                </View>
              }
              renderItem={({ item }) => (
                <View style={styles.placeRow}>
                  <View style={styles.placeIconWrap}>
                    <Ionicons name="location" size={18} color="#FFAC30" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.placeRowName}>{item.title}</Text>
                    {item.subtitle ? (
                      <Text style={styles.placeRowAddr} numberOfLines={1}>{item.subtitle}</Text>
                    ) : null}
                  </View>
                </View>
              )}
            />
          )}

          {/* 팔로워 / 팔로잉 목록 */}
          {(listModal === 'followers' || listModal === 'following') && (
            listLoading ? (
              <View style={styles.listLoadingWrap}>
                <ActivityIndicator color="#FFAC30" />
              </View>
            ) : (
              <FlatList
                data={listModal === 'followers' ? followersList : followingList}
                keyExtractor={(item) => item.uid}
                style={styles.listScroll}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={styles.listSep} />}
                ListEmptyComponent={
                  <View style={styles.listEmptyWrap}>
                    <Ionicons name="people-outline" size={36} color="#D4D4D4" />
                    <Text style={styles.listEmptyText}>
                      {listModal === 'followers' ? '팔로워가 없어요' : '팔로잉하는 사람이 없어요'}
                    </Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const amFollowing = profile?.following.includes(item.uid) ?? false;
                  const isOwnAccount = item.uid === uid;
                  return (
                    <View style={styles.userRow}>
                      <View style={styles.userAvatar}>
                        <Ionicons name="person" size={20} color="#1A1108" />
                      </View>
                      <Text style={styles.userNickname}>{item.nickname}</Text>
                      {!isOwnAccount && (
                        <TouchableOpacity
                          style={amFollowing ? styles.unfollowBtn : styles.followBtn}
                          activeOpacity={0.75}
                          onPress={() => handleFollowInModal(item.uid, amFollowing)}
                        >
                          <Text style={amFollowing ? styles.unfollowBtnText : styles.followBtnText}>
                            {amFollowing ? '팔로잉' : '팔로우'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                }}
              />
            )
          )}
        </View>
      </Modal>

      {/* ── Sheriff Score Modal ────────────────────────────────────────── */}
      <Modal
        visible={showScoreModal}
        animationType="slide"
        transparent
        onRequestClose={closeScoreModal}
      >
        <TouchableOpacity
          style={styles.modalBg}
          activeOpacity={1}
          onPress={closeScoreModal}
        />
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 28 }]}>
          <View style={styles.sheetHandle} />

          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sheriff Score</Text>
            <TouchableOpacity
              onPress={closeScoreModal}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={22} color="#1A1108" />
            </TouchableOpacity>
          </View>

          {/* Current score card */}
          <View style={styles.scoreCard}>
            <ShieldIcon size={36} />
            <View style={{ marginLeft: 14, flex: 1 }}>
              <Text style={styles.scoreCardValue}>{(profile?.sheriff_score ?? 0).toLocaleString()}점</Text>
              <Text style={styles.scoreCardSub}>현재 보유 점수</Text>
            </View>
            <View style={styles.rankPill}>
              <Text style={styles.rankPillText}>{profile?.rank_level ?? '새내기'}</Text>
            </View>
          </View>

          {/* Tab switcher */}
          <View style={styles.scoreTabBar}>
            {(['activity', 'ranking'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.scoreTab, scoreTab === tab && styles.scoreTabActive]}
                onPress={() => setScoreTab(tab)}
              >
                <Text style={[styles.scoreTabLabel, scoreTab === tab && styles.scoreTabLabelActive]}>
                  {tab === 'activity' ? '내 활동' : '지역 랭킹'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Activity tab */}
          {scoreTab === 'activity' && (
            <>
              <View style={styles.rankSection}>
                <Text style={styles.rankSectionTitle}>지역 내 순위</Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.round(rankProgress * 100)}%` }]} />
                </View>
                <Text style={styles.rankSectionSub}>
                  현재 등급:{' '}
                  <Text style={{ color: '#FFAC30', fontFamily: 'AppleSDGothicNeo-Bold' }}>
                    {profile?.rank_level ?? '새내기'}
                  </Text>
                </Text>
              </View>

              <Text style={styles.historyTitle}>활동 내역</Text>
              <View style={[styles.historyRow, { justifyContent: 'center' }]}>
                <Text style={{ color: '#9A9A9A', fontSize: 14, fontFamily: 'AppleSDGothicNeo-Regular' }}>
                  활동 내역 기능을 준비 중이에요
                </Text>
              </View>
            </>
          )}

          {/* Ranking tab */}
          {scoreTab === 'ranking' && (
            <ScrollView style={styles.rankingScroll} showsVerticalScrollIndicator={false}>
              {loadingLeaderboard ? (
                <ActivityIndicator color="#FFAC30" style={{ marginTop: 24 }} />
              ) : leaderboard.length === 0 ? (
                <Text style={{ color: '#9A9A9A', fontSize: 14, fontFamily: 'AppleSDGothicNeo-Regular', textAlign: 'center', marginTop: 24 }}>
                  순위 데이터가 없어요
                </Text>
              ) : (
                <>
                  {leaderboard.map((item, idx) => {
                    const rank = idx + 1;
                    const isMe = item.uid === uid;
                    return (
                      <View key={item.uid} style={[styles.rankingRow, isMe && styles.rankingRowMe]}>
                        <View style={styles.rankingRankWrap}>
                          {rank <= 3 ? (
                            <Text style={styles.medalEmoji}>
                              {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                            </Text>
                          ) : (
                            <Text style={styles.rankingNumber}>{rank}</Text>
                          )}
                        </View>
                        <View style={styles.rankingAvatar}>
                          <Ionicons name="person" size={18} color="#1A1108" />
                        </View>
                        <Text style={styles.rankingNickname} numberOfLines={1}>{item.nickname}</Text>
                        <Text style={styles.rankingScore}>{item.sheriff_score.toLocaleString()}점</Text>
                      </View>
                    );
                  })}
                  {uid && !leaderboard.some((e) => e.uid === uid) && profile && (
                    <>
                      <View style={styles.rankingEllipsisRow}>
                        <Text style={styles.rankingEllipsisText}>···</Text>
                      </View>
                      <View style={[styles.rankingRow, styles.rankingRowMe]}>
                        <View style={styles.rankingRankWrap}>
                          <Text style={[styles.rankingNumber, { color: '#FFAC30' }]}>-</Text>
                        </View>
                        <View style={styles.rankingAvatar}>
                          <Ionicons name="person" size={18} color="#1A1108" />
                        </View>
                        <Text style={styles.rankingNickname} numberOfLines={1}>{nickname}</Text>
                        <Text style={styles.rankingScore}>{profile.sheriff_score.toLocaleString()}점</Text>
                      </View>
                    </>
                  )}
                </>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // ── Header ──────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 18,
  },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D4D4D4',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFAC30',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerRight: {
    flex: 1,
  },
  nicknameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  nickname: {
    fontSize: 18,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },
  rankChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: '#FFF8EC',
    borderWidth: 1,
    borderColor: '#FFAC30',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginBottom: 10,
  },
  rankChipText: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },
  rankChipSub: {
    fontSize: 11,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#9A9A9A',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'AppleSDGothicNeo-Heavy',
    color: '#1A1108',
    lineHeight: 22,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#1A1108',
    marginTop: 2,
  },
  settingsBtn: {
    marginLeft: 8,
    padding: 4,
  },

  // ── Sheriff Score ──────────────────────────────────────────────────
  scoreSection: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  scoreTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreLabel: {
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
    marginRight: 8,
  },
  scoreRankText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#9A9A9A',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFAC30',
    borderRadius: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginTop: 8,
  },

  // ── Tab bar ────────────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#1A1108',
  },
  tabLabel: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Medium',
    color: '#9A9A9A',
  },
  tabLabelActive: {
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },

  // ── Photo grid ────────────────────────────────────────────────────
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridCell: {
    width: CELL,
    height: CELL,
    borderWidth: 0.5,
    borderColor: '#FFFFFF',
    backgroundColor: '#F5F5F5',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },

  // ── Badge grid ────────────────────────────────────────────────────
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: 16,
  },
  badgeItem: {
    width: (SCREEN_W - 64) / 3,
    alignItems: 'center',
  },
  badgeIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeName: {
    fontSize: 11,
    fontFamily: 'AppleSDGothicNeo-Medium',
    color: '#1A1108',
    textAlign: 'center',
  },
  badgeDesc: {
    fontSize: 10,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#9A9A9A',
    textAlign: 'center',
    marginTop: 2,
  },

  // ── Empty state ───────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#9A9A9A',
  },
  emptySubText: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#D4D4D4',
    marginTop: -4,
  },

  // ── Modal ────────────────────────────────────────────────────────
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 24,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D4D4D4',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBF2',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFAC30',
    marginBottom: 20,
  },
  scoreCardValue: {
    fontSize: 22,
    fontFamily: 'AppleSDGothicNeo-Heavy',
    color: '#1A1108',
  },
  scoreCardSub: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#9A9A9A',
    marginTop: 2,
  },
  rankPill: {
    backgroundColor: '#FFAC30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  rankPillText: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },
  rankSection: {
    marginBottom: 20,
  },
  rankSectionTitle: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#1A1108',
    marginBottom: 8,
  },
  rankSectionSub: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#9A9A9A',
    marginTop: 6,
  },
  historyTitle: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#1A1108',
    marginBottom: 10,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    gap: 10,
  },
  historyBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  historyIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFF8EC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#1A1108',
  },
  historyPoints: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#FFAC30',
  },

  // ── List modal ────────────────────────────────────────────────────
  listScroll: {
    maxHeight: 380,
  },
  listSep: {
    height: 1,
    backgroundColor: '#F5F5F5',
  },
  listLoadingWrap: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  listEmptyWrap: {
    paddingVertical: 36,
    alignItems: 'center',
    gap: 10,
  },
  listEmptyText: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#9A9A9A',
  },
  // 장소
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    gap: 12,
  },
  placeIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF8EC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeRowName: {
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#1A1108',
    marginBottom: 2,
  },
  placeRowAddr: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#9A9A9A',
  },
  categoryChip: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D4D4D4',
  },
  categoryChipText: {
    fontSize: 11,
    fontFamily: 'AppleSDGothicNeo-Medium',
    color: '#1A1108',
  },
  // 유저
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D4D4D4',
  },
  userAvatarSheriff: {
    borderColor: '#FFAC30',
    borderWidth: 2,
  },
  userNickname: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#1A1108',
  },
  sheriffBadge: {
    marginRight: 2,
  },
  followBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#FFAC30',
  },
  followBtnText: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },
  unfollowBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D4D4D4',
    backgroundColor: '#FFFFFF',
  },
  unfollowBtnText: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-Medium',
    color: '#1A1108',
  },

  // ── Score modal tabs ─────────────────────────────────────────────
  scoreTabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 16,
  },
  scoreTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  scoreTabActive: {
    borderBottomColor: '#1A1108',
  },
  scoreTabLabel: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Medium',
    color: '#9A9A9A',
  },
  scoreTabLabelActive: {
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },

  // ── Ranking list ─────────────────────────────────────────────────
  rankingScroll: {
    maxHeight: 360,
  },
  rankingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  rankingRowMe: {
    backgroundColor: '#FFF8EC',
    borderRadius: 10,
    paddingHorizontal: 8,
    marginHorizontal: -8,
    borderBottomWidth: 0,
    marginTop: 2,
    marginBottom: 2,
  },
  rankingRankWrap: {
    width: 32,
    alignItems: 'center',
  },
  medalEmoji: {
    fontSize: 20,
  },
  rankingNumber: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#9A9A9A',
    textAlign: 'center',
  },
  rankingAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D4D4D4',
  },
  rankingAvatarSheriff: {
    borderColor: '#FFAC30',
    borderWidth: 2,
  },
  rankingNickname: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#1A1108',
  },
  rankingScore: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#FFAC30',
  },
  rankingEllipsisRow: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  rankingEllipsisText: {
    fontSize: 16,
    color: '#D4D4D4',
    fontFamily: 'AppleSDGothicNeo-Regular',
    letterSpacing: 4,
  },
});
