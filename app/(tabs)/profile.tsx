// 경로: app/(tabs)/profile.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ShieldIcon from '../../src/components/ShieldIcon';

const STAT_ITEMS = [
  { label: '포인트', value: '0', icon: 'star' as const },
  { label: '게시물', value: '0', icon: 'chatbox' as const },
  { label: '모임', value: '0', icon: 'people' as const },
];

const MENU_ITEMS = [
  { icon: 'bookmark' as const, label: '저장한 장소', chevron: true },
  { icon: 'trophy' as const, label: '내 뱃지', chevron: true },
  { icon: 'settings' as const, label: '설정', chevron: true },
  { icon: 'log-out' as const, label: '로그아웃', chevron: false },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 96 }]}
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
        {MENU_ITEMS.map((item, idx) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.menuItem, idx < MENU_ITEMS.length - 1 && styles.menuItemBorder]}
            accessibilityRole="button"
            accessibilityLabel={item.label}
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
    backgroundColor: '#FFFDF7',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  // Profile card
  profileCard: {
    backgroundColor: '#FFF8EC',
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
    backgroundColor: '#FFF0D4',
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
    borderColor: '#FFF8EC',
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
    backgroundColor: '#FFF0D4',
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
    backgroundColor: '#FFFDF7',
  },
  editProfileBtnText: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Medium',
    color: '#7A5C38',
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF8EC',
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
    borderRightColor: '#EFE0C4',
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
    backgroundColor: '#FFF8EC',
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
    backgroundColor: '#FFF8EC',
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
    borderBottomColor: '#EFE0C4',
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
});
