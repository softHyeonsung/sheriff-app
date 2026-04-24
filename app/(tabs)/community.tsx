// 경로: app/(tabs)/community.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CATEGORIES = [
  { icon: 'walk' as const, label: '산책·운동' },
  { icon: 'restaurant' as const, label: '맛집' },
  { icon: 'musical-notes' as const, label: '문화·예술' },
  { icon: 'book' as const, label: '스터디' },
  { icon: 'game-controller' as const, label: '취미' },
  { icon: 'heart' as const, label: '봉사' },
];

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState('');

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
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={17} color="#B89060" />
            </TouchableOpacity>
          )}
        </View>
      </View>

    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 96 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header CTA */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>모임을 만들어보세요</Text>
          <Text style={styles.headerSub}>관심사가 같은 이웃을 만날 수 있어요</Text>
        </View>
        <TouchableOpacity style={styles.createBtn} accessibilityRole="button" accessibilityLabel="모임 만들기">
          <Ionicons name="add" size={20} color="#1A1108" />
        </TouchableOpacity>
      </View>

      {/* Category chips */}
      <Text style={styles.sectionLabel}>카테고리</Text>
      <View style={styles.categoryGrid}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.label}
            style={styles.categoryChip}
            accessibilityRole="button"
            accessibilityLabel={cat.label}
          >
            <Ionicons name={cat.icon} size={22} color="#A36E1D" />
            <Text style={styles.categoryLabel}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Empty state */}
      <View style={styles.emptyState}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="people" size={44} color="#FFAC30" />
        </View>
        <Text style={styles.emptyTitle}>근처 모임이 아직 없어요</Text>
        <Text style={styles.emptySub}>직접 모임을 만들고{'\n'}이웃들을 초대해보세요</Text>
        <TouchableOpacity style={styles.emptyCta} accessibilityRole="button" accessibilityLabel="모임 만들기">
          <Text style={styles.emptyCtaText}>첫 모임 만들기</Text>
        </TouchableOpacity>
      </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFE0C4',
  },
  searchBar: {
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#EFE0C4',
  },
  searchIcon: { marginRight: 6 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#1A1108',
    paddingVertical: 0,
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#EFE0C4',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#7A5C38',
  },
  createBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFAC30',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#A36E1D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#8A6030',
    letterSpacing: 0.8,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 28,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EFE0C4',
  },
  categoryLabel: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-Medium',
    color: '#A36E1D',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 20,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EFE0C4',
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#7A5C38',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  emptyCta: {
    backgroundColor: '#FFAC30',
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 12,
    shadowColor: '#A36E1D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyCtaText: {
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },
  questBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#EFE0C4',
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
});
