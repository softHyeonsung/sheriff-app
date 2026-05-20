// src/constants/mockPosts.ts
import { PlaceResult } from '../store/mapStore';

export interface MockPost {
  id: string;
  author: { nickname: string; isSheriff: boolean };
  type: 'feed' | 'story';
  content: string;
  imageUris?: string[];
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
    imageUris: [
      'https://picsum.photos/seed/palace/400/300',
      'https://picsum.photos/seed/palace2/400/300',
    ],
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
    imageUris: [
      'https://picsum.photos/seed/market/400/300',
      'https://picsum.photos/seed/market2/400/300',
    ],
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
    imageUris: [
      'https://picsum.photos/seed/river/400/300',
      'https://picsum.photos/seed/river2/400/300',
      'https://picsum.photos/seed/river3/400/300',
    ],
    location: { name: '한강공원 여의도지구', distance: '2.3km' },
    locationPin: { id: 'place-hangang-yeouido', place_name: '한강공원 여의도지구', category_name: '관광지', address_name: '서울 영등포구 여의도동', road_address_name: '서울 영등포구 여의도동', x: '126.9337', y: '37.5285' },
    tags: ['#한강공원', '#여의도벚꽃', '#봄나들이'],
    likes: 87,
    comments: 3,
    timeAgo: '6시간 전',
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
};
