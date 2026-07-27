/**
 * postAggregation unit tests — src/utils/postAggregation.ts
 *
 * Pure functions, no Firebase mocking needed.
 */

import {
  getLandmarkTier,
  groupPostsByLandmark,
  buildCourse,
  CourseCandidate,
} from '../src/utils/postAggregation';
import type { FirestorePost } from '../src/api/posts';

function makePost(overrides: Partial<FirestorePost> & { author_id: string }): FirestorePost {
  return {
    id: 'post-' + Math.random(),
    author_nickname: 'tester',
    author_is_sheriff: false,
    type: 'feed',
    content: '',
    media_urls: [],
    location: { name: '' },
    tags: [],
    likes: [],
    comment_count: 0,
    share_count: 0,
    timestamp: null,
    ...overrides,
  };
}

describe('getLandmarkTier', () => {
  it('returns null below the first threshold', () => {
    expect(getLandmarkTier(0)).toBeNull();
  });

  it('returns flag at the lower boundary (1)', () => {
    expect(getLandmarkTier(1)).toBe('flag');
  });

  it('returns flag just below signpost (2)', () => {
    expect(getLandmarkTier(2)).toBe('flag');
  });

  it('returns signpost at its boundary (3)', () => {
    expect(getLandmarkTier(3)).toBe('signpost');
  });

  it('returns house at its boundary (7)', () => {
    expect(getLandmarkTier(7)).toBe('house');
  });

  it('returns house just below hotel (14)', () => {
    expect(getLandmarkTier(14)).toBe('house');
  });

  it('returns hotel at its boundary (15)', () => {
    expect(getLandmarkTier(15)).toBe('hotel');
  });

  it('returns hotel just below building (29)', () => {
    expect(getLandmarkTier(29)).toBe('hotel');
  });

  it('returns building at its boundary and beyond (30)', () => {
    expect(getLandmarkTier(30)).toBe('building');
  });
});

describe('groupPostsByLandmark', () => {
  const pinA = { id: 'pin-a', place_name: '카페 A', category_name: '', address_name: '', road_address_name: '', x: '127.0', y: '37.5' };
  const pinB = { id: 'pin-b', place_name: '식당 B', category_name: '', address_name: '', road_address_name: '', x: '127.1', y: '37.6' };

  it('excludes posts with no location_pin (optional field)', () => {
    const posts = [
      makePost({ author_id: 'u1' }), // no location_pin
      makePost({ author_id: 'u1' }), // no location_pin
    ];
    const result = groupPostsByLandmark(posts, 'u1');
    expect(result).toHaveLength(0);
  });

  it('excludes posts from other authors', () => {
    const posts = [
      makePost({ author_id: 'other', location_pin: pinA }),
      makePost({ author_id: 'other', location_pin: pinA }),
      makePost({ author_id: 'other', location_pin: pinA }),
    ];
    const result = groupPostsByLandmark(posts, 'me');
    expect(result).toHaveLength(0);
  });

  it('groups by location_pin.id and assigns the correct tier', () => {
    const posts = [
      makePost({ author_id: 'u1', location_pin: pinA }),
      makePost({ author_id: 'u1', location_pin: pinA }),
      makePost({ author_id: 'u1', location_pin: pinA }),
      makePost({ author_id: 'u1', location_pin: pinB }),
    ];
    const result = groupPostsByLandmark(posts, 'u1');
    const a = result.find((l) => l.locationPinId === 'pin-a');
    const b = result.find((l) => l.locationPinId === 'pin-b');
    expect(a?.count).toBe(3);
    expect(a?.tier).toBe('signpost');
    expect(b?.count).toBe(1);
    expect(b?.tier).toBe('flag');
  });

  it('excludes posts with malformed (non-numeric) location_pin coordinates', () => {
    const badPin = { ...pinA, id: 'pin-bad', x: 'not-a-number', y: 'also-not-a-number' };
    const posts = [makePost({ author_id: 'u1', location_pin: badPin })];
    const result = groupPostsByLandmark(posts, 'u1');
    expect(result).toHaveLength(0);
  });
});

describe('buildCourse', () => {
  const origin = { lat: 37.5, lng: 127.0 };

  it('returns empty array for zero candidates', () => {
    expect(buildCourse(origin, [])).toEqual([]);
  });

  it('prioritizes unvisited candidates over visited ones regardless of distance', () => {
    const candidates: CourseCandidate[] = [
      { id: 'near-visited', name: 'A', lat: 37.501, lng: 127.001, visited: true },
      { id: 'far-unvisited', name: 'B', lat: 37.6, lng: 127.1, visited: false },
    ];
    const result = buildCourse(origin, candidates, 2);
    expect(result[0].id).toBe('far-unvisited');
    expect(result[1].id).toBe('near-visited');
  });

  it('falls back to nearest-neighbor when all candidates share visited status', () => {
    const candidates: CourseCandidate[] = [
      { id: 'far', name: 'A', lat: 37.6, lng: 127.1, visited: false },
      { id: 'near', name: 'B', lat: 37.501, lng: 127.001, visited: false },
    ];
    const result = buildCourse(origin, candidates, 2);
    expect(result[0].id).toBe('near');
    expect(result[1].id).toBe('far');
  });

  it('caps the result at maxStops', () => {
    const candidates: CourseCandidate[] = Array.from({ length: 10 }, (_, i) => ({
      id: `c${i}`,
      name: `place ${i}`,
      lat: 37.5 + i * 0.01,
      lng: 127.0 + i * 0.01,
      visited: false,
    }));
    const result = buildCourse(origin, candidates, 4);
    expect(result).toHaveLength(4);
  });

  it('returns empty array when maxStops is zero or negative', () => {
    const candidates: CourseCandidate[] = [
      { id: 'a', name: 'A', lat: 37.501, lng: 127.001, visited: false },
    ];
    expect(buildCourse(origin, candidates, 0)).toEqual([]);
    expect(buildCourse(origin, candidates, -1)).toEqual([]);
  });
});
