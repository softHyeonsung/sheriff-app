// 경로: app/(tabs)/profile.tsx
import { Ionicons, Octicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { logout } from '../../src/api/auth';
import { clearKakaoSession } from '../../src/api/kakaoAuth';
import ShieldIcon from '../../src/components/ShieldIcon';
import { useAuthStore } from '../../src/store/authStore';
import { usePostStore } from '../../src/store/postStore';

const STAT_ITEMS = [
  { label: '포인트', value: '0', icon: 'star' as const },
  { label: '게시물', value: '0', icon: 'chatbox' as const },
  { label: '모임', value: '0', icon: 'people' as const },
];

const PLACE_MENU_ITEMS = [
  { icon: 'location' as const, label: '저장한 장소', chevron: true },
  { icon: 'trophy' as const, label: '내 뱃지', chevron: true },
  { icon: 'settings' as const, label: '설정', chevron: true },
  { icon: 'log-out' as const, label: '로그아웃', chevron: false },
];

export default function ProfileScreen() {
  const insets        = useSafeAreaInsets();
  const router        = useRouter();
  const setUser       = useAuthStore((s) => s.setUser);
  const setKakaoUser  = useAuthStore((s) => s.setKakaoUser);
  const savedPostIds  = usePostStore((s) => s.savedPostIds);

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();            // Firebase sign-out
            await clearKakaoSession(); // clear AsyncStorage
          } catch (e) {
            console.warn('[auth] logout error:', e);
          } finally {
            setKakaoUser(null);        // clear Zustand regardless
            setUser(null);
            router.replace('/login');
          }
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 96 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile card */}
      <View style={styles.profileCard}>
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={36} color="#B89060" />
          </View>
          <TouchableOpacity style={styles.avatarEditBtn} accessibilityLabel="프로필 사진 변경" accessibilityRole="button">
            <Ionicons name="camera" size={14} color="#1A1108" />
          </TouchableOpacity>
        </View>

        <Text style={styles.nickname}>닉네임 없음</Text>
        <Text style={styles.email}>이메일 미설정</Text>

        {/* Sheriff rank badge */}
        <View style={styles.rankBadge}>
          <ShieldIcon size={20} />
          <Text style={styles.rankText}>새내기 보안관</Text>
        </View>

        <TouchableOpacity style={styles.editProfileBtn} accessibilityRole="button" accessibilityLabel="프로필 수정">
          <Text style={styles.editProfileBtnText}>프로필 수정</Text>
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        {STAT_ITEMS.map((item, idx) => (
          <View key={item.label} style={[styles.statItem, idx < STAT_ITEMS.length - 1 && styles.statDivider]}>
            <Ionicons name={item.icon} size={18} color="#FFAC30" style={styles.statIcon} />
            <Text style={styles.statValue}>{item.value}</Text>
            <Text style={styles.statLabel}>{item.label}</Text>
          </View>
        ))}
        <View style={styles.statItem}>
          <Octicons name="bookmark-fill" size={18} color="#FFAC30" style={styles.statIcon} />
          <Text style={styles.statValue}>{savedPostIds.length}</Text>
          <Text style={styles.statLabel}>저장</Text>
        </View>
      </View>

      {/* Home verification teaser */}
      <View style={styles.verifyBanner}>
        <Ionicons name="home" size={20} color="#FFAC30" />
        <View style={styles.verifyText}>
          <Text style={styles.verifyTitle}>주거지를 인증해보세요</Text>
          <Text style={styles.verifySub}>동네 인증 시 지역 모임 우선 노출</Text>
        </View>
        <TouchableOpacity style={styles.verifyBtn} accessibilityRole="button" accessibilityLabel="주거지 인증하기">
          <Text style={styles.verifyBtnText}>인증하기</Text>
        </TouchableOpacity>
      </View>

      {/* Menu list */}
      <View style={styles.menuList}>
        {/* 저장한 게시물 */}
        <TouchableOpacity style={[styles.menuItem, styles.menuItemBorder]} accessibilityRole="button" accessibilityLabel="저장한 게시물">
          <Octicons name="bookmark-fill" size={20} color="#A36E1D" />
          <Text style={styles.menuLabel}>저장한 게시물</Text>
          {savedPostIds.length > 0 && (
            <View style={styles.menuBadge}>
              <Text style={styles.menuBadgeText}>{savedPostIds.length}</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={16} color="#B89060" style={styles.menuChevron} />
        </TouchableOpacity>

        {PLACE_MENU_ITEMS.map((item, idx) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.menuItem, idx < PLACE_MENU_ITEMS.length - 1 && styles.menuItemBorder]}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            onPress={item.label === '로그아웃' ? handleLogout : undefined}
          >
            <Ionicons name={item.icon} size={20} color={item.label === '로그아웃' ? '#E05252' : '#A36E1D'} />
            <Text style={[styles.menuLabel, item.label === '로그아웃' && styles.menuLabelDanger]}>
              {item.label}
            </Text>
            {item.chevron && <Ionicons name="chevron-forward" size={16} color="#B89060" style={styles.menuChevron} />}
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  // Profile card
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EFE0C4',
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 14,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#EFE0C4',
  },
  avatarEditBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFAC30',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F5F5F5',
  },
  nickname: {
    fontSize: 20,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
    marginBottom: 4,
  },
  email: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#B89060',
    marginBottom: 12,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EFE0C4',
  },
  rankText: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#A36E1D',
  },
  editProfileBtn: {
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EFE0C4',
    backgroundColor: '#FFFFFF',
  },
  editProfileBtnText: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Medium',
    color: '#7A5C38',
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EFE0C4',
    overflow: 'hidden',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  statDivider: {
    borderRightWidth: 1,
    borderRightColor: '#E5E5E5',
  },
  statIcon: {
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'AppleSDGothicNeo-Heavy',
    color: '#1A1108',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#7A5C38',
    marginTop: 2,
  },
  // Home verification banner
  verifyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EFE0C4',
  },
  verifyText: {
    flex: 1,
  },
  verifyTitle: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },
  verifySub: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#7A5C38',
    marginTop: 2,
  },
  verifyBtn: {
    backgroundColor: '#FFAC30',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  verifyBtnText: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#1A1108',
  },
  // Menu
  menuList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFE0C4',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-Medium',
    color: '#1A1108',
  },
  menuLabelDanger: {
    color: '#E05252',
  },
  menuChevron: {
    marginLeft: 'auto',
  },
  menuBadge: {
    backgroundColor: '#FFAC30',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: 'auto',
    marginRight: 6,
  },
  menuBadgeText: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#1A1108',
  },
});
