// src/utils/postAggregation.ts
// 동네 연대기 — 방문(게시물) 기반 랜드마크 집계 + 코스 빌더.
// index.tsx와 shared-map/[uid].tsx 양쪽에서 import하는 공유 모듈 (엔지니어링 리뷰 확정).

import type { FirestorePost } from '../api/posts';
import { haversineM } from '../constants/mockGatherings';

export type LandmarkTier = 'flag' | 'signpost' | 'house' | 'hotel' | 'building';

// 방문 횟수 → 등급. 내림차순으로 첫 매치 채택.
const TIER_THRESHOLDS: { tier: LandmarkTier; min: number }[] = [
  { tier: 'building', min: 30 },
  { tier: 'hotel',     min: 15 },
  { tier: 'house',     min: 7 },
  { tier: 'signpost',  min: 3 },
  { tier: 'flag',      min: 1 },
];

export function getLandmarkTier(visitCount: number): LandmarkTier | null {
  for (const { tier, min } of TIER_THRESHOLDS) {
    if (visitCount >= min) return tier;
  }
  return null;
}

export interface Landmark {
  locationPinId: string;
  placeName: string;
  lat: number;
  lng: number;
  count: number;
  tier: LandmarkTier;
}

// author_id로 필터 후 location_pin.id로 그룹핑 — myPosts(profile.tsx) 패턴과 동일하게
// 이미 구독 중인 posts 배열을 클라이언트에서 집계한다. 신규 Firestore 쿼리 없음.
export function groupPostsByLandmark(posts: FirestorePost[], authorId: string): Landmark[] {
  const groups = new Map<string, { placeName: string; lat: number; lng: number; count: number }>();

  for (const post of posts) {
    if (post.author_id !== authorId) continue;
    const pin = post.location_pin;
    if (!pin) continue;

    const lat = parseFloat(pin.y);
    const lng = parseFloat(pin.x);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue; // 잘못된 좌표는 집계에서 제외

    const existing = groups.get(pin.id);
    if (existing) {
      existing.count += 1;
    } else {
      groups.set(pin.id, { placeName: pin.place_name, lat, lng, count: 1 });
    }
  }

  const landmarks: Landmark[] = [];
  for (const [locationPinId, g] of groups) {
    const tier = getLandmarkTier(g.count);
    if (!tier) continue;
    landmarks.push({ locationPinId, placeName: g.placeName, lat: g.lat, lng: g.lng, count: g.count, tier });
  }
  return landmarks;
}

export interface CourseCandidate {
  id: string;
  name: string;
  lat: number;
  lng: number;
  visited: boolean; // 이미 랜드마크(방문 기록 있음)인지 — "빈칸 채우기" 우선순위 기준
}

// nearest-neighbor 순서화 + 미방문 우선순위("빈칸 채우기"). MVP 기본값 — 시간/거리 예산 최적화는 스트레치.
export function buildCourse(
  origin: { lat: number; lng: number },
  candidates: CourseCandidate[],
  maxStops = 4,
): CourseCandidate[] {
  if (candidates.length === 0) return [];

  const remaining = [...candidates];
  const course: CourseCandidate[] = [];
  let current = origin;

  while (remaining.length > 0 && course.length < maxStops) {
    remaining.sort((a, b) => {
      if (a.visited !== b.visited) return a.visited ? 1 : -1; // 미방문 우선
      const da = haversineM(current.lat, current.lng, a.lat, a.lng);
      const db = haversineM(current.lat, current.lng, b.lat, b.lng);
      return da - db;
    });
    const next = remaining.shift()!;
    course.push(next);
    current = { lat: next.lat, lng: next.lng };
  }
  return course;
}
