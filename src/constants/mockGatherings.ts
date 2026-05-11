export interface MockGathering {
  id: string;
  host: { nickname: string; isSheriff: boolean };
  isOwn?: boolean;
  type: 'regular' | 'flash';
  deadlineMs?: number;
  title: string;
  description: string;
  category: string;
  location: { name: string; lat: number; lng: number };
  tags: string[];
  maxMembers: number;
  meetingAt: string;
  timeAgo: string;
}

export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistanceM(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`;
}

export function formatTimeLeft(deadlineMs: number): string {
  const diff = deadlineMs - Date.now();
  if (diff <= 0) return '마감';
  const totalMin = Math.floor(diff / 60_000);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours > 0 && mins > 0) return `${hours}시간 ${mins}분`;
  if (hours > 0) return `${hours}시간`;
  return `${mins}분`;
}

export const MOCK_GATHERINGS: MockGathering[] = [
  {
    id: 'g0',
    host: { nickname: '번개대장', isSheriff: false },
    type: 'flash',
    deadlineMs: Date.now() + 90 * 60 * 1000,
    title: '지금 당장 한강 치킨 먹을 분?',
    description: '치킨 시켜서 한강에서 먹어요 🍗 지금 바로 나오실 수 있는 분만요!',
    category: '맛집',
    location: { name: '한강공원 반포지구', lat: 37.5085, lng: 126.9946 },
    tags: ['#번개', '#한강치킨', '#즉흥모임'],
    maxMembers: 5,
    meetingAt: '오늘 19:30',
    timeAgo: '방금 전',
  },
  {
    id: 'g1',
    host: { nickname: '나', isSheriff: true },
    isOwn: true,
    type: 'regular',
    title: '이번 주말 남산 산책하실 분?',
    description: '남산 둘레길 같이 걷고 근처 카페에서 커피 한잔 해요 ☕ 초보도 환영!',
    category: '산책·운동',
    location: { name: 'N서울타워', lat: 37.5512, lng: 126.9882 },
    tags: ['#남산산책', '#주말모임', '#운동'],
    maxMembers: 8,
    meetingAt: '5/17 토 10:00',
    timeAgo: '1시간 전',
  },
  {
    id: 'g2',
    host: { nickname: '맛집헌터', isSheriff: false },
    type: 'regular',
    title: '광장시장 야식 투어 같이 가요!',
    description: '빈대떡에 막걸리 🍺 저녁 7시에 광장시장 입구에서 만나요. 맛있는 거 많이 먹어봐요.',
    category: '맛집',
    location: { name: '광장시장', lat: 37.5702, lng: 126.9998 },
    tags: ['#맛집투어', '#광장시장', '#야식'],
    maxMembers: 4,
    meetingAt: '5/13 화 19:00',
    timeAgo: '3시간 전',
  },
  {
    id: 'g3',
    host: { nickname: '문화인', isSheriff: false },
    type: 'regular',
    title: '국립박물관 청자 특별전 같이 봐요',
    description: '무료 입장에 특별전까지 있어요. 조용히 문화생활 즐기고 싶은 분 환영합니다.',
    category: '문화·예술',
    location: { name: '국립중앙박물관', lat: 37.5234, lng: 126.9802 },
    tags: ['#박물관', '#문화생활', '#무료전시'],
    maxMembers: 3,
    meetingAt: '5/14 수 14:00',
    timeAgo: '5시간 전',
  },
];
