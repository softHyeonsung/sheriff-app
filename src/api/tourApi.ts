// src/api/tourApi.ts
// 한국관광공사 TourAPI v2 — 위치 기반 관광정보 조회 (locationBasedList2)

import { PlaceResult } from '../store/mapStore';

const SERVICE_KEY = process.env.EXPO_PUBLIC_TOUR_API_KEY ?? '';

const CONTENT_TYPE_LABELS: Record<string, string> = {
  '12': '관광지',
  '14': '문화시설',
  '15': '행사',
  '25': '여행코스',
  '28': '레포츠',
  '32': '숙박',
  '38': '쇼핑',
  '39': '음식점',
};

interface TourItem {
  contentid:     string;
  contenttypeid: string;
  title:         string;
  addr1:         string;
  addr2?:        string;
  mapx:          string; // 경도(lng)
  mapy:          string; // 위도(lat)
  dist?:         string;
  firstimage?:   string;
  firstimage2?:  string;
}

interface TourApiResponse {
  response: {
    header: { resultCode: string; resultMsg: string };
    body: {
      items: { item: TourItem[] } | '';
      totalCount: number;
    };
  };
}

function normalizeItem(item: TourItem): PlaceResult {
  return {
    id:               item.contentid,
    place_name:       item.title,
    category_name:    CONTENT_TYPE_LABELS[item.contenttypeid] ?? '관광정보',
    address_name:     item.addr1,
    road_address_name: item.addr2 ?? '',
    x:                item.mapx,  // lng
    y:                item.mapy,  // lat
    distance:         item.dist,
  };
}

export async function fetchNearbyTourSpots(
  lat: number,
  lng: number,
  radiusMeters = 2000,
  numOfRows    = 15,
): Promise<PlaceResult[]> {
  if (!SERVICE_KEY || SERVICE_KEY.startsWith('여기에')) {
    console.warn('[tourApi] EXPO_PUBLIC_TOUR_API_KEY not set');
    return [];
  }

  // serviceKey must NOT be re-encoded by URLSearchParams (it's already encoded)
  const params = new URLSearchParams({
    numOfRows:  String(numOfRows),
    pageNo:     '1',
    MobileOS:   'ETC',
    MobileApp:  'Sheriff',
    _type:      'json',
    mapX:       String(lng),
    mapY:       String(lat),
    radius:     String(radiusMeters),
    arrange:    'E',
  });

  const BASE = 'https://apis.data.go.kr/B551011/KorService2/locationBasedList2';

  const url = `${BASE}?serviceKey=${SERVICE_KEY}&${params}`;
  if (__DEV__) console.log('[tourApi] request: (key hidden in prod)', `${BASE}?${params}`);

  try {
    const res = await fetch(url);
    const text = await res.text();
    if (__DEV__) console.log('[tourApi] raw response:', text.slice(0, 500));

    if (!res.ok) return [];

    const json: TourApiResponse = JSON.parse(text);
    const { resultCode } = json.response.header;
    if (resultCode !== '0000' && resultCode !== '00') {
      console.warn('[tourApi] API error:', json.response.header.resultMsg);
      return [];
    }

    const items = json.response.body.items;
    if (!items || typeof items === 'string') return [];

    const raw = Array.isArray(items.item) ? items.item : [items.item];
    return raw
      .filter((it) => it.mapx && it.mapy)
      .map(normalizeItem);
  } catch (e) {
    console.warn('[tourApi] fetch failed:', e);
    return [];
  }
}
