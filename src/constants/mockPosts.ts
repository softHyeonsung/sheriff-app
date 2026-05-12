// src/constants/mockPosts.ts
import { PlaceResult } from '../store/mapStore';

export interface MockPost {
  id: string;
  author: { nickname: string; isSheriff: boolean };
  type: 'feed' | 'story';
  content: string;
  imageUri?: string;
  location: { name: string; distance: string };
  locationPin?: PlaceResult;
  tags: string[];
  likes: number;
  comments: number;
  timeAgo: string;
  contentType: string;
}

export interface MockComment {
  id: string;
  author: { nickname: string; isSheriff: boolean };
  text: string;
  timeAgo: string;
  likes: number;
}

export const MOCK_POSTS: MockPost[] = [
  {
    id: '1',
    author: { nickname: '동네탐험가', isSheriff: true },
    type: 'feed',
    content: '경복궁 야간 개장 다녀왔어요! 조명이 진짜 너무 예뻤고 한복 입고 가면 입장료 무료에요 🏯 주말엔 사람이 많으니까 평일 추천!\n#경복궁 #야간개장 #서울관광 #한복',
    imageUri: 'https://picsum.photos/seed/palace/400/300',
    location: { name: '경복궁', distance: '1.2km' },
    locationPin: { id: 'place-gyeongbokgung', place_name: '경복궁', category_name: '관광지', address_name: '서울 종로구 사직로 161', road_address_name: '서울 종로구 사직로 161', x: '126.9770', y: '37.5796' },
    tags: ['#경복궁', '#야간개장', '#서울관광', '#한복'],
    likes: 42,
    comments: 3,
    timeAgo: '2시간 전',
    contentType: '관광지',
  },
  {
    id: '2',
    author: { nickname: '맛집헌터', isSheriff: false },
    type: 'feed',
    content: '광장시장 빈대떡이 너무 맛있어서 두 판 먹었어요 😋 육회도 신선하고 가격도 착해서 자주 오는 편인데 오늘따라 더 맛있는 느낌? 점심시간 피해서 오면 자리도 잘 나요.\n#광장시장 #빈대떡 #육회 #서울맛집',
    imageUri: 'https://picsum.photos/seed/market/400/300',
    location: { name: '광장시장', distance: '850m' },
    locationPin: { id: 'place-gwangjang', place_name: '광장시장', category_name: '음식점', address_name: '서울 종로구 창경궁로 88', road_address_name: '서울 종로구 창경궁로 88', x: '126.9998', y: '37.5702' },
    tags: ['#광장시장', '#빈대떡', '#서울맛집'],
    likes: 31,
    comments: 2,
    timeAgo: '4시간 전',
    contentType: '음식점',
  },
  {
    id: '3',
    author: { nickname: '주말산책러', isSheriff: true },
    type: 'feed',
    content: '한강공원 여의도 쪽 벚꽃이 이번 주가 절정이에요 🌸 아침 일찍 오면 사람 적고 조용히 즐길 수 있어요. 자전거 대여소도 바로 옆에 있으니 자전거 타면서 구경하는 것도 좋아요!\n#한강공원 #여의도벚꽃 #봄나들이',
    imageUri: 'https://picsum.photos/seed/river/400/300',
    location: { name: '한강공원 여의도지구', distance: '2.3km' },
    locationPin: { id: 'place-hangang-yeouido', place_name: '한강공원 여의도지구', category_name: '관광지', address_name: '서울 영등포구 여의도동', road_address_name: '서울 영등포구 여의도동', x: '126.9337', y: '37.5285' },
    tags: ['#한강공원', '#여의도벚꽃', '#봄나들이'],
    likes: 87,
    comments: 3,
    timeAgo: '6시간 전',
    contentType: '관광지',
  },
  {
    id: '4',
    author: { nickname: '문화인', isSheriff: false },
    type: 'feed',
    content: '국립중앙박물관 상설전시 처음 가봤는데 무료인 게 믿기지 않을 정도로 규모가 어마어마해요. 청자·백자 특별전도 같이 열리고 있으니 지금 가보시길 추천! 주차도 무료\n#국립중앙박물관 #문화생활 #무료전시',
    imageUri: 'https://picsum.photos/seed/museum/400/300',
    location: { name: '국립중앙박물관', distance: '3.1km' },
    locationPin: { id: 'place-national-museum', place_name: '국립중앙박물관', category_name: '문화시설', address_name: '서울 용산구 서빙고로 137', road_address_name: '서울 용산구 서빙고로 137', x: '126.9802', y: '37.5234' },
    tags: ['#국립중앙박물관', '#무료전시', '#문화생활'],
    likes: 56,
    comments: 2,
    timeAgo: '어제',
    contentType: '문화시설',
  },
  {
    id: '5',
    author: { nickname: '야경수집가', isSheriff: true },
    type: 'feed',
    content: 'N서울타워 야경 보러 케이블카 타고 올라갔어요 🌃 맑은 날이라 서울 전경이 다 보였고 커플 자물쇠 달아두고 왔어요 ㅎㅎ 올라가기 전에 이태원 맛집에서 저녁 먹고 오는 루트 추천!\n#남산타워 #서울야경 #데이트코스',
    imageUri: 'https://picsum.photos/seed/tower/400/300',
    location: { name: 'N서울타워', distance: '1.8km' },
    locationPin: { id: 'place-n-seoul-tower', place_name: 'N서울타워', category_name: '관광지', address_name: '서울 용산구 남산공원길 105', road_address_name: '서울 용산구 남산공원길 105', x: '126.9882', y: '37.5512' },
    tags: ['#남산타워', '#서울야경', '#데이트코스'],
    likes: 103,
    comments: 3,
    timeAgo: '어제',
    contentType: '관광지',
  },
];

export const MOCK_COMMENTS_MAP: Record<string, MockComment[]> = {
  '1': [
    { id: 'c1', author: { nickname: '여행좋아', isSheriff: false }, text: '저도 거기 가봤는데 진짜 좋더라고요! 다음에 또 가고 싶어요 😊', timeAgo: '30분 전', likes: 5 },
    { id: 'c2', author: { nickname: '카메라여행', isSheriff: true }, text: '야간개장 시간이 몇 시까지예요? 주말에 가보려고요', timeAgo: '1시간 전', likes: 2 },
    { id: 'c3', author: { nickname: '서울탐방러', isSheriff: false }, text: '한복 대여는 어디서 하셨나요? 근처 한복 대여점이 많던데 어디가 제일 좋아요?', timeAgo: '2시간 전', likes: 1 },
  ],
  '2': [
    { id: 'c1', author: { nickname: '빈대떡러버', isSheriff: false }, text: '광장시장 빈대떡 최고죠!! 육회도 꼭 드세요 🥩', timeAgo: '1시간 전', likes: 8 },
    { id: 'c2', author: { nickname: '푸드파이터', isSheriff: false }, text: '몇 시쯤 가셨어요? 자리 잡기 어렵지 않던가요?', timeAgo: '3시간 전', likes: 3 },
  ],
  '3': [
    { id: 'c1', author: { nickname: '봄나들이', isSheriff: true }, text: '여의도 벚꽃 이번 주가 절정이죠! 저도 갔다 왔어요 🌸 아침 일찍 오길 잘했네요', timeAgo: '2시간 전', likes: 12 },
    { id: 'c2', author: { nickname: '자전거여행', isSheriff: false }, text: '자전거 대여 요금이 얼마예요? 한 시간 기준으로요', timeAgo: '4시간 전', likes: 4 },
    { id: 'c3', author: { nickname: '피크닉러', isSheriff: false }, text: '돗자리 가져가면 앉을 자리 있나요? 저번에 갔을 때 너무 붐볐던 기억이...', timeAgo: '5시간 전', likes: 6 },
  ],
  '4': [
    { id: 'c1', author: { nickname: '문화생활', isSheriff: false }, text: '상설전시 정말 규모가 어마어마하죠! 하루 다 보려면 점심도 거기서 먹어야 해요', timeAgo: '1시간 전', likes: 9 },
    { id: 'c2', author: { nickname: '박물관탐방', isSheriff: true }, text: '청자 특별전 언제까지 하는지 아시나요? 꼭 가보고 싶어서요', timeAgo: '6시간 전', likes: 5 },
  ],
  '5': [
    { id: 'c1', author: { nickname: '야경수집', isSheriff: false }, text: '이태원 맛집 어디 가셨어요? 루트 공유해 주시면 감사해요! 🙏', timeAgo: '30분 전', likes: 7 },
    { id: 'c2', author: { nickname: '커플여행', isSheriff: false }, text: '케이블카 대기 시간이 얼마나 됐나요? 주말엔 줄이 엄청나던데', timeAgo: '1시간 전', likes: 3 },
    { id: 'c3', author: { nickname: '남산뷰', isSheriff: true }, text: '맑은 날 선택하신 게 최고예요 ✨ 흐린 날엔 진짜 아무것도 안 보여요', timeAgo: '3시간 전', likes: 11 },
  ],
};
