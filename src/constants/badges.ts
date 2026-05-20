import { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: IoniconName;
  color: string;
}

// 클라이언트에서 자동 부여 (점수 마일스톤)
export const SCORE_MILESTONE_BADGES: Array<{ threshold: number; badgeId: string }> = [
  { threshold: 100,  badgeId: 'neighborhood_resident' },
  { threshold: 300,  badgeId: 'regular_visitor' },
  { threshold: 600,  badgeId: 'local_legend' },
  { threshold: 1000, badgeId: 'local_influencer' },
  { threshold: 2000, badgeId: 'sheriff_candidate' },
];

export const BADGE_CATALOG: Record<string, BadgeDefinition> = {
  // ── 점수 마일스톤 ───────────────────────────────────────────────────────
  neighborhood_resident: {
    id: 'neighborhood_resident',
    name: '동네 주민',
    description: '보안관 점수 100점 달성',
    icon: 'home-outline',
    color: '#4CAF6A',
  },
  regular_visitor: {
    id: 'regular_visitor',
    name: '단골손님',
    description: '보안관 점수 300점 달성',
    icon: 'star-outline',
    color: '#FFAC30',
  },
  local_legend: {
    id: 'local_legend',
    name: '동네 터줏대감',
    description: '보안관 점수 600점 달성',
    icon: 'shield-outline',
    color: '#E05252',
  },
  local_influencer: {
    id: 'local_influencer',
    name: '지역 인플루언서',
    description: '보안관 점수 1000점 달성',
    icon: 'megaphone-outline',
    color: '#9C27B0',
  },
  sheriff_candidate: {
    id: 'sheriff_candidate',
    name: '보안관 후보',
    description: '보안관 점수 2000점 달성',
    icon: 'star',
    color: '#FFAC30',
  },

  // ── 활동 기반 (특정 행동 시 1회 부여) ─────────────────────────────────
  first_post: {
    id: 'first_post',
    name: '첫 이야기',
    description: '첫 게시물 작성',
    icon: 'create-outline',
    color: '#2196F3',
  },
  neighborhood_explorer: {
    id: 'neighborhood_explorer',
    name: '동네 탐험가',
    description: '장소 5곳 저장',
    icon: 'compass-outline',
    color: '#FFAC30',
  },
  gathering_host: {
    id: 'gathering_host',
    name: '모임장',
    description: '첫 모임 개최',
    icon: 'people-outline',
    color: '#4CAF6A',
  },
  gathering_member: {
    id: 'gathering_member',
    name: '모임 참여자',
    description: '첫 모임 참여 승인',
    icon: 'person-add-outline',
    color: '#4CAF6A',
  },
  home_verified: {
    id: 'home_verified',
    name: '동네 인증',
    description: '주거지 GPS 인증 완료',
    icon: 'location-outline',
    color: '#E05252',
  },
};

// 동적 뱃지 ID (Cloud Functions에서 부여하는 월간 보안관)
// 형식: sheriff_{YYYY}_{MM}  예) sheriff_2026_05
function isSherliffBadge(id: string): boolean {
  return /^sheriff_\d{4}_\d{2}$/.test(id);
}

export function getBadge(id: string): BadgeDefinition | undefined {
  if (isSherliffBadge(id)) {
    const [, year, month] = id.split('_');
    return {
      id,
      name: '지역 보안관',
      description: `${year}년 ${Number(month)}월 지역 TOP 10`,
      icon: 'shield',
      color: '#FFAC30',
    };
  }
  return BADGE_CATALOG[id];
}
