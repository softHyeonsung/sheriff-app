// 경로: app/user/[uid].tsx
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FirestorePost, subscribeFeedPosts } from '../../src/api/posts';
import { promptAndReport } from '../../src/api/reports';
import { UserProfile, blockUser, fetchMyProfile, followUser, unblockUser, unfollowUser } from '../../src/api/users';
import { useAuthStore } from '../../src/store/authStore';

const SCREEN_W = Dimensions.get('window').width;
const CELL = SCREEN_W / 3;

export default function UserProfileScreen() {
  const { uid: targetUid } = useLocalSearchParams<{ uid: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const myFirebaseUser = useAuthStore((s) => s.user);
  const myKakaoUser    = useAuthStore((s) => s.kakaoUser);
  const myUid = myFirebaseUser?.uid ?? (myKakaoUser ? `kakao_${myKakaoUser.id}` : null);

  const [profile, setProfile]       = useState<UserProfile | null>(null);
  const [posts, setPosts]           = useState<FirestorePost[]>([]);
  const [loading, setLoading]       = useState(true);
  const [following, setFollowing]   = useState(false);
  const [activeTab, setActiveTab]   = useState<'posts' | 'badges'>('posts');
  const [showMenu, setShowMenu]     = useState(false);

  const blockedUsers  = useAuthStore((s) => s.blockedUsers);
  const setBlockedUsers = useAuthStore((s) => s.setBlockedUsers);
  const isBlocked = !!targetUid && blockedUsers.includes(targetUid);

  // 자기 자신이면 내 프로필 탭으로 이동
  useEffect(() => {
    if (myUid && targetUid && myUid === targetUid) {
      router.replace('/(tabs)/profile');
    }
  }, [myUid, targetUid]);

  useEffect(() => {
    if (!targetUid) return;
    fetchMyProfile(targetUid)
      .then((p) => {
        setProfile(p);
        if (p && myUid) setFollowing(p.followers.includes(myUid));
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    const unsub = subscribeFeedPosts(setPosts, undefined, targetUid);
    return unsub;
  }, [targetUid, myUid]);

  const handleFollow = async () => {
    if (!myUid || !targetUid) return;
    if (following) {
      setFollowing(false);
      setProfile((p) => p ? { ...p, followers: p.followers.filter((id) => id !== myUid) } : p);
      await unfollowUser(myUid, targetUid).catch(() => {
        setFollowing(true);
        setProfile((p) => p ? { ...p, followers: [...p.followers, myUid] } : p);
      });
    } else {
      setFollowing(true);
      setProfile((p) => p ? { ...p, followers: [...p.followers, myUid] } : p);
      await followUser(myUid, targetUid).catch(() => {
        setFollowing(false);
        setProfile((p) => p ? { ...p, followers: p.followers.filter((id) => id !== myUid) } : p);
      });
    }
  };

  const isSheriff = (profile?.badge_list ?? []).some((b) => /^sheriff_\d{4}_\d{2}$/.test(b));

  const handleToggleBlock = () => {
    if (!myUid || !targetUid) return;
    setShowMenu(false);
    if (isBlocked) {
      setBlockedUsers(blockedUsers.filter((id) => id !== targetUid));
      unblockUser(myUid, targetUid).catch(() => setBlockedUsers([...blockedUsers, targetUid]));
      return;
    }
    Alert.alert(
      '차단하기',
      `${profile?.nickname ?? '이 사용자'}님을 차단할까요? 차단하면 이 사용자의 게시물이 더 이상 보이지 않아요.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '차단',
          style: 'destructive',
          onPress: () => {
            setBlockedUsers([...blockedUsers, targetUid]);
            blockUser(myUid, targetUid).catch(() => setBlockedUsers(blockedUsers.filter((id) => id !== targetUid)));
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[s.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#FFAC30" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[s.center, { paddingTop: insets.top }]}>
        <Ionicons name="person-outline" size={48} color="#D4D4D4" />
        <Text style={s.emptyText}>유저를 찾을 수 없어요</Text>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backBtnText}>돌아가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity
          style={s.headerIconBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={26} color="#1A1108" />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{profile.nickname}</Text>
        {myUid && myUid !== targetUid ? (
          <TouchableOpacity
            style={s.headerIconBtn}
            onPress={() => setShowMenu(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="더보기"
          >
            <Ionicons name="ellipsis-vertical" size={22} color="#1A1108" />
          </TouchableOpacity>
        ) : (
          <View style={s.headerIconBtn} />
        )}
      </View>

      {/* 신고 / 차단 메뉴 */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <Pressable style={menuStyles.backdrop} onPress={() => setShowMenu(false)}>
          <View style={menuStyles.sheet}>
            <TouchableOpacity
              style={menuStyles.item}
              onPress={() => {
                setShowMenu(false);
                if (myUid && targetUid) promptAndReport(myUid, 'user', targetUid);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="flag-outline" size={20} color="#E05252" />
              <Text style={menuStyles.itemDanger}>신고하기</Text>
            </TouchableOpacity>
            <View style={menuStyles.sep} />
            <TouchableOpacity style={menuStyles.item} onPress={handleToggleBlock} activeOpacity={0.7}>
              <Ionicons name={isBlocked ? 'lock-open-outline' : 'ban-outline'} size={20} color="#E05252" />
              <Text style={menuStyles.itemDanger}>{isBlocked ? '차단 해제하기' : '차단하기'}</Text>
            </TouchableOpacity>
            <View style={menuStyles.sep} />
            <TouchableOpacity style={menuStyles.item} onPress={() => setShowMenu(false)} activeOpacity={0.7}>
              <Text style={menuStyles.itemCancel}>취소</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile info */}
        <View style={s.profileSection}>
          <View style={[s.avatar, isSheriff && s.avatarSheriff]}>
            {profile.profile_img ? (
              <Image source={{ uri: profile.profile_img }} style={s.avatarImg} />
            ) : (
              <Ionicons name="person" size={40} color="#1A1108" />
            )}
          </View>

          <View style={s.statsRow}>
            <View style={s.statItem}>
              <Text style={s.statNum}>{posts.length}</Text>
              <Text style={s.statLabel}>게시물</Text>
            </View>
            <View style={s.statItem}>
              <Text style={s.statNum}>{profile.followers.length}</Text>
              <Text style={s.statLabel}>팔로워</Text>
            </View>
            <View style={s.statItem}>
              <Text style={s.statNum}>{profile.following.length}</Text>
              <Text style={s.statLabel}>팔로잉</Text>
            </View>
          </View>
        </View>

        {/* Nickname + badge */}
        <View style={s.nicknameRow}>
          <Text style={s.nickname}>{profile.nickname}</Text>
          {isSheriff && (
            <Image
              source={require('../../assets/images/sheriff_verified.jpg')}
              style={s.sheriffBadge}
            />
          )}
        </View>

        {/* Follow + 지도 보기 */}
        {myUid && myUid !== targetUid && (
          <View style={[s.followWrap, s.actionRow]}>
            <TouchableOpacity
              style={[s.followBtn, following && s.followingBtn, s.actionBtnFlex]}
              onPress={handleFollow}
              activeOpacity={0.8}
              accessibilityLabel={following ? '팔로우 취소' : '팔로우'}
            >
              <Text style={[s.followBtnText, following && s.followingBtnText]}>
                {following ? '팔로잉' : '팔로우'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.mapBtn, s.actionBtnFlex]}
              onPress={() => router.push(`/shared-map/${targetUid}` as any)}
              activeOpacity={0.8}
              accessibilityLabel={`${profile.nickname}님의 지도 보기`}
            >
              <Ionicons name="map-outline" size={16} color="#1A1108" style={{ marginRight: 6 }} />
              <Text style={s.mapBtnText}>지도 보기</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Score chip */}
        <View style={s.scoreRow}>
          <Ionicons name="shield" size={16} color="#FFAC30" />
          <Text style={s.scoreText}>보안관 점수 {profile.sheriff_score}점</Text>
          {profile.rank_level ? (
            <View style={s.rankChip}>
              <Text style={s.rankChipText}>{profile.rank_level}</Text>
            </View>
          ) : null}
        </View>

        {/* Tab bar */}
        <View style={s.tabBar}>
          <TouchableOpacity
            style={[s.tab, activeTab === 'posts' && s.tabActive]}
            onPress={() => setActiveTab('posts')}
          >
            <Ionicons
              name="grid-outline"
              size={20}
              color={activeTab === 'posts' ? '#1A1108' : '#7A5C38'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tab, activeTab === 'badges' && s.tabActive]}
            onPress={() => setActiveTab('badges')}
          >
            <Ionicons
              name="ribbon-outline"
              size={20}
              color={activeTab === 'badges' ? '#1A1108' : '#7A5C38'}
            />
          </TouchableOpacity>
        </View>

        {/* Posts grid */}
        {activeTab === 'posts' && (
          posts.length === 0 ? (
            <View style={s.emptyPosts}>
              <Ionicons name="image-outline" size={40} color="#D4D4D4" />
              <Text style={s.emptyText}>게시물이 없어요</Text>
            </View>
          ) : (
            <FlatList
              data={posts}
              numColumns={3}
              scrollEnabled={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={s.gridCell}
                  onPress={() => router.push({ pathname: '/post/[id]', params: { id: item.id } })}
                  activeOpacity={0.85}
                >
                  {item.media_urls[0] ? (
                    <Image source={{ uri: item.media_urls[0] }} style={s.gridImg} />
                  ) : (
                    <View style={[s.gridImg, s.gridTextCell]}>
                      <Text style={s.gridText} numberOfLines={3}>{item.content}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            />
          )
        )}

        {/* Badges */}
        {activeTab === 'badges' && (
          profile.badge_list.length === 0 ? (
            <View style={s.emptyPosts}>
              <Ionicons name="ribbon-outline" size={40} color="#D4D4D4" />
              <Text style={s.emptyText}>아직 뱃지가 없어요</Text>
            </View>
          ) : (
            <View style={s.badgeGrid}>
              {profile.badge_list.map((badgeId) => (
                <View key={badgeId} style={s.badgeChip}>
                  <Text style={s.badgeChipText}>{badgeId}</Text>
                </View>
              ))}
            </View>
          )
        )}

        <View style={{ height: insets.bottom + 32 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', gap: 16 },

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
  headerTitle: { fontSize: 17, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108', flex: 1, textAlign: 'center' },

  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    gap: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D4D4D4',
    overflow: 'hidden',
  },
  avatarSheriff: { borderColor: '#FFAC30', borderWidth: 2.5 },
  avatarImg: { width: 80, height: 80 },

  statsRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', gap: 2 },
  statNum: { fontSize: 18, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108' },
  statLabel: { fontSize: 12, fontFamily: 'AppleSDGothicNeo-Regular', color: '#7A5C38' },

  nicknameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  nickname: { fontSize: 15, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108' },
  sheriffBadge: { width: 60, height: 20, resizeMode: 'contain' },

  followWrap: { paddingHorizontal: 20, marginBottom: 12 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtnFlex: { flex: 1 },
  followBtn: {
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFAC30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  followingBtn: { backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#D4D4D4' },
  followBtnText: { fontSize: 14, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108' },
  followingBtnText: { color: '#7A5C38', fontFamily: 'AppleSDGothicNeo-Regular' },
  mapBtn: {
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4D4D4',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapBtnText: { fontSize: 14, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108' },

  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  scoreText: { fontSize: 13, fontFamily: 'AppleSDGothicNeo-Regular', color: '#1A1108' },
  rankChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#FFF3DC',
    borderWidth: 1,
    borderColor: '#FFE0A0',
  },
  rankChipText: { fontSize: 11, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108' },

  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#D4D4D4',
    borderBottomWidth: 1,
    borderBottomColor: '#D4D4D4',
  },
  tab: { flex: 1, height: 44, justifyContent: 'center', alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#1A1108' },

  gridCell: { width: CELL, height: CELL, padding: 1 },
  gridImg: { flex: 1, backgroundColor: '#F5F5F5' },
  gridTextCell: { justifyContent: 'center', alignItems: 'center', padding: 8 },
  gridText: { fontSize: 11, fontFamily: 'AppleSDGothicNeo-Regular', color: '#1A1108' },

  emptyPosts: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: 'AppleSDGothicNeo-Regular', color: '#7A5C38' },

  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16 },
  badgeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFF3DC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE0A0',
  },
  badgeChipText: { fontSize: 12, fontFamily: 'AppleSDGothicNeo-Medium', color: '#1A1108' },

  backBtn: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#FFAC30', borderRadius: 14 },
  backBtnText: { fontSize: 15, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108' },
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
  itemCancel: { fontSize: 16, fontFamily: 'AppleSDGothicNeo-Regular', color: '#7A5C38' },
});
