// 경로: app/(tabs)/feed.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface EmptyCardProps {
  icon: IoniconName;
  title: string;
  description: string;
  ctaLabel: string;
}

function EmptyCard({ icon, title, description, ctaLabel }: EmptyCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardIconWrap}>
        <Ionicons name={icon} size={32} color="#FFAC30" />
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDesc}>{description}</Text>
      <TouchableOpacity style={styles.cardCta} accessibilityRole="button" accessibilityLabel={ctaLabel}>
        <Text style={styles.cardCtaText}>{ctaLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function FeedScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 96 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Empty state hero */}
      <View style={styles.hero}>
        <View style={styles.heroBadge}>
          <Ionicons name="chatbox" size={40} color="#FFAC30" />
        </View>
        <Text style={styles.heroTitle}>동네 소식이 아직 없어요</Text>
        <Text style={styles.heroSub}>첫 번째 게시물을 작성하고{'\n'}보안관이 되어보세요</Text>
        <TouchableOpacity style={styles.heroCta} accessibilityRole="button" accessibilityLabel="게시물 작성하기">
          <Ionicons name="add" size={18} color="#1A1108" />
          <Text style={styles.heroCtaText}>게시물 작성하기</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>이런 것도 해보세요</Text>
      <EmptyCard
        icon="location"
        title="장소 태그하기"
        description="게시물에 장소를 태그하면 지도에도 함께 표시돼요"
        ctaLabel="장소 검색하기"
      />
      <EmptyCard
        icon="people"
        title="모임 참여하기"
        description="근처에서 열리는 모임을 찾고 이웃들을 만나보세요"
        ctaLabel="모임 둘러보기"
      />
      <EmptyCard
        icon="star"
        title="보안관 점수 쌓기"
        description="게시물 작성, 좋아요, 모임 참여로 보안관 뱃지를 받으세요"
        ctaLabel="점수 시스템 보기"
      />
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
    paddingTop: 24,
  },
  hero: {
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  heroBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  heroTitle: {
    fontSize: 18,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSub: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#7A5C38',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFAC30',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
    shadowColor: '#A36E1D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  heroCtaText: {
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#B89060',
    letterSpacing: 0.8,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  cardIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#7A5C38',
    lineHeight: 20,
    marginBottom: 14,
  },
  cardCta: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  cardCtaText: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#A36E1D',
  },
});
