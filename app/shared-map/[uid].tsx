import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUserProfile } from '../../src/api/chat';
import { loadSavedPins } from '../../src/api/savedPlaces';
import { MapPin } from '../../src/store/mapStore';
import { subscribeFeedPosts } from '../../src/api/posts';
import { Landmark, LandmarkTier, groupPostsByLandmark } from '../../src/utils/postAggregation';

const KAKAO_JS_KEY = '589395258866fe7786bd8cbb6e152b1f';

const PIN_COLOR = '#4CAF6A';
const LANDMARK_COLOR = '#FFAC30';

// 등급별 마커 실루엣 — 색은 앰버 하나로 고정, 모양/크기로 등급 구분 (CEO 리뷰 Section 11 확정).
// index.tsx의 buildMapHTML에도 동일한 정의가 중복된다 — 둘 다 WebView에 주입되는 별개의 JS 문자열이라
// 공유 모듈로 뺄 수 없음을 인정하고 그대로 둔다 (엔지니어링 리뷰 outside voice 확인 사항).
const LANDMARK_SIZE: Record<LandmarkTier, number> = {
  flag: 24, signpost: 28, house: 32, hotel: 36, building: 40,
};

function landmarkGlyphPath(tier: LandmarkTier): string {
  switch (tier) {
    case 'flag':
      return "<path d='M8 4v28' stroke='white' stroke-width='2'/><path d='M8 4 L22 9 L8 14 Z' fill='white'/>";
    case 'signpost':
      return "<path d='M14 8v24' stroke='white' stroke-width='2'/><rect x='6' y='10' width='16' height='7' rx='1' fill='white'/>";
    case 'house':
      return "<path d='M7 20 L14 12 L21 20 V30 H7 Z' fill='white'/>";
    case 'hotel':
      return "<path d='M6 30V13 L14 8 L22 13V30 Z' fill='white'/><rect x='10' y='17' width='3' height='3' fill='" + LANDMARK_COLOR + "'/><rect x='15' y='17' width='3' height='3' fill='" + LANDMARK_COLOR + "'/>";
    case 'building':
      return "<rect x='7' y='8' width='14' height='24' fill='white'/><rect x='10' y='12' width='2.5' height='2.5' fill='" + LANDMARK_COLOR + "'/><rect x='15.5' y='12' width='2.5' height='2.5' fill='" + LANDMARK_COLOR + "'/><rect x='10' y='18' width='2.5' height='2.5' fill='" + LANDMARK_COLOR + "'/><rect x='15.5' y='18' width='2.5' height='2.5' fill='" + LANDMARK_COLOR + "'/><rect x='10' y='24' width='2.5' height='2.5' fill='" + LANDMARK_COLOR + "'/><rect x='15.5' y='24' width='2.5' height='2.5' fill='" + LANDMARK_COLOR + "'/>";
  }
}

function makeLandmarkMarkerSrc(tier: LandmarkTier): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='36' viewBox='0 0 28 36'>`
    + `<path d='M14 0C6.27 0 0 6.27 0 14c0 10.5 14 22 14 22S28 24.5 28 14C28 6.27 21.73 0 14 0z' fill='${LANDMARK_COLOR}' stroke='white' stroke-width='1.5'/>`
    + landmarkGlyphPath(tier)
    + `</svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// JSON을 <script> 태그 안에 그대로 주입하면 값 안의 "</script>"가 태그를 조기 종료시켜 스크립트
// 삽입이 가능해진다 (보안 리뷰에서 발견·확인됨). '<'를 이스케이프해 원천 차단한다.
function jsonForScriptTag(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

const buildSharedMapHTML = (apiKey: string, pins: MapPin[], landmarks: Landmark[], nickname: string) => {
  const pinsSrc = jsonForScriptTag(pins);
  const landmarksSrc = jsonForScriptTag(landmarks);
  const markerSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='36' viewBox='0 0 28 36'><path d='M14 0C6.27 0 0 6.27 0 14c0 10.5 14 22 14 22S28 24.5 28 14C28 6.27 21.73 0 14 0z' fill='${PIN_COLOR}' stroke='white' stroke-width='1.5'/><circle cx='14' cy='14' r='5' fill='white'/></svg>`;
  const landmarkMarkerSrcs = JSON.stringify({
    flag: makeLandmarkMarkerSrc('flag'),
    signpost: makeLandmarkMarkerSrc('signpost'),
    house: makeLandmarkMarkerSrc('house'),
    hotel: makeLandmarkMarkerSrc('hotel'),
    building: makeLandmarkMarkerSrc('building'),
  });
  const landmarkSizes = JSON.stringify(LANDMARK_SIZE);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body, #map { width:100%; height:100%; overflow:hidden; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false"></script>
  <script>
    // 장소명은 게시물 작성 시 Kakao Local API에서 채워지지만, Firestore SDK로 직접 문서를 쓰면
    // 임의 문자열이 들어올 수 있다 — InfoWindow가 이 값을 innerHTML로 렌더링하므로 반드시 이스케이프한다
    // (보안 리뷰에서 발견·확인됨).
    function escapeHtml(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    kakao.maps.load(function() {
      var PINS = ${pinsSrc};
      var LANDMARKS = ${landmarksSrc};
      var LANDMARK_SRCS = ${landmarkMarkerSrcs};
      var LANDMARK_SIZES = ${landmarkSizes};
      var map = new kakao.maps.Map(document.getElementById('map'), {
        center: new kakao.maps.LatLng(37.5665, 126.9780),
        level: 7
      });
      if (PINS.length === 0 && LANDMARKS.length === 0) return;
      var bounds = new kakao.maps.LatLngBounds();
      var markerSrc = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('${markerSvg}');
      PINS.forEach(function(pin) {
        var pos = new kakao.maps.LatLng(pin.lat, pin.lng);
        bounds.extend(pos);
        var img = new kakao.maps.MarkerImage(markerSrc, new kakao.maps.Size(28, 36));
        var safeTitle = escapeHtml(pin.title);
        var marker = new kakao.maps.Marker({ position: pos, map: map, image: img, title: safeTitle });
        var infoWindow = null;
        kakao.maps.event.addListener(marker, 'click', function() {
          if (infoWindow) { infoWindow.close(); infoWindow = null; return; }
          infoWindow = new kakao.maps.InfoWindow({
            content: '<div style="padding:8px 12px;font-size:13px;white-space:nowrap;font-family:sans-serif;">' + safeTitle + '</div>',
            removable: true
          });
          infoWindow.open(map, marker);
        });
      });
      LANDMARKS.forEach(function(lm) {
        var pos = new kakao.maps.LatLng(lm.lat, lm.lng);
        bounds.extend(pos);
        var size = LANDMARK_SIZES[lm.tier];
        var img = new kakao.maps.MarkerImage(LANDMARK_SRCS[lm.tier], new kakao.maps.Size(size, size * 36 / 28));
        var safeName = escapeHtml(lm.placeName);
        var marker = new kakao.maps.Marker({ position: pos, map: map, image: img, title: safeName + ' (' + lm.count + '회 방문)' });
        var infoWindow = null;
        kakao.maps.event.addListener(marker, 'click', function() {
          if (infoWindow) { infoWindow.close(); infoWindow = null; return; }
          infoWindow = new kakao.maps.InfoWindow({
            content: '<div style="padding:8px 12px;font-size:13px;white-space:nowrap;font-family:sans-serif;">' + safeName + ' · ' + lm.count + '회 방문</div>',
            removable: true
          });
          infoWindow.open(map, marker);
        });
      });
      map.setBounds(bounds, 80, 80, 80, 80);
    });
  </script>
</body>
</html>`;
};

export default function SharedMapScreen() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const webRef = useRef<WebView>(null);

  const [nickname, setNickname] = useState<string>('');
  const [pins, setPins] = useState<MapPin[]>([]);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadProfileAndPins = React.useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    setLoadError(false);
    try {
      const [profile, savedPins] = await Promise.all([
        getUserProfile(uid),
        loadSavedPins(uid),
      ]);
      setNickname(profile?.nickname ?? '알 수 없음');
      setPins(savedPins);
    } catch (e) {
      console.warn('[shared-map] load failed:', e);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    loadProfileAndPins();

    // 상대방 uid로 서버 필터링해 구독 — 전역 posts를 받지 않는다.
    if (!uid) return;
    const unsub = subscribeFeedPosts(
      (all) => setLandmarks(groupPostsByLandmark(all, uid)),
      () => setLoadError(true),
      uid,
    );
    return unsub;
  }, [uid, loadProfileAndPins]);

  const mapHtml = React.useMemo(
    () => buildSharedMapHTML(KAKAO_JS_KEY, pins, landmarks, nickname),
    [pins, landmarks, nickname],
  );

  const isEmpty = pins.length === 0 && landmarks.length === 0;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color="#1A1108" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {nickname}님의 My Own 지도
          </Text>
          {!loading && !loadError && (
            <Text style={styles.headerSub}>저장된 장소 {pins.length}곳 · 랜드마크 {landmarks.length}곳</Text>
          )}
        </View>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>지도 불러오는 중…</Text>
        </View>
      ) : loadError ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="alert-circle-outline" size={40} color="#D4D4D4" />
          <Text style={styles.emptyText}>지도를 불러올 수 없어요</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={loadProfileAndPins}
            activeOpacity={0.85}
            accessibilityLabel="지도 다시 불러오기"
          >
            <Text style={styles.retryBtnText}>재시도</Text>
          </TouchableOpacity>
        </View>
      ) : isEmpty ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="bookmark-outline" size={40} color="#D4D4D4" />
          <Text style={styles.emptyText}>저장된 장소가 없어요</Text>
        </View>
      ) : (
        <WebView
          ref={webRef}
          style={StyleSheet.absoluteFillObject}
          source={{ html: mapHtml, baseUrl: 'https://sheriff-app-dab41.web.app' }}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          allowUniversalAccessFromFileURLs
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#D4D4D4',
    backgroundColor: '#FFFFFF',
    zIndex: 10,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },
  headerSub: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#7A5C38',
    marginTop: 2,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#7A5C38',
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#7A5C38',
  },
  retryBtn: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#FFAC30',
  },
  retryBtnText: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },
});
