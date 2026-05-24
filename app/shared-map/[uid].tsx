import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUserProfile } from '../../src/api/chat';
import { loadSavedPins } from '../../src/api/savedPlaces';
import { MapPin } from '../../src/store/mapStore';

const KAKAO_JS_KEY = '589395258866fe7786bd8cbb6e152b1f';

const PIN_COLOR = '#4CAF6A';

const buildSharedMapHTML = (apiKey: string, pins: MapPin[], nickname: string) => {
  const pinsSrc = JSON.stringify(pins);
  const markerSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='36' viewBox='0 0 28 36'><path d='M14 0C6.27 0 0 6.27 0 14c0 10.5 14 22 14 22S28 24.5 28 14C28 6.27 21.73 0 14 0z' fill='${PIN_COLOR}' stroke='white' stroke-width='1.5'/><circle cx='14' cy='14' r='5' fill='white'/></svg>`;

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
    kakao.maps.load(function() {
      var PINS = ${pinsSrc};
      var map = new kakao.maps.Map(document.getElementById('map'), {
        center: new kakao.maps.LatLng(37.5665, 126.9780),
        level: 7
      });
      if (PINS.length === 0) return;
      var bounds = new kakao.maps.LatLngBounds();
      var markerSrc = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('${markerSvg}');
      PINS.forEach(function(pin) {
        var pos = new kakao.maps.LatLng(pin.lat, pin.lng);
        bounds.extend(pos);
        var img = new kakao.maps.MarkerImage(markerSrc, new kakao.maps.Size(28, 36));
        var marker = new kakao.maps.Marker({ position: pos, map: map, image: img, title: pin.title });
        var infoWindow = null;
        kakao.maps.event.addListener(marker, 'click', function() {
          if (infoWindow) { infoWindow.close(); infoWindow = null; return; }
          infoWindow = new kakao.maps.InfoWindow({
            content: '<div style="padding:8px 12px;font-size:13px;white-space:nowrap;font-family:sans-serif;">' + pin.title + '</div>',
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const [profile, savedPins] = await Promise.all([
        getUserProfile(uid),
        loadSavedPins(uid),
      ]);
      setNickname(profile?.nickname ?? '알 수 없음');
      setPins(savedPins);
      setLoading(false);
    })();
  }, [uid]);

  const mapHtml = React.useMemo(
    () => buildSharedMapHTML(KAKAO_JS_KEY, pins, nickname),
    [pins, nickname],
  );

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
          {!loading && (
            <Text style={styles.headerSub}>저장된 장소 {pins.length}곳</Text>
          )}
        </View>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>지도 불러오는 중…</Text>
        </View>
      ) : pins.length === 0 ? (
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
    color: '#9A9A9A',
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
    color: '#9A9A9A',
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
    color: '#9A9A9A',
  },
});
