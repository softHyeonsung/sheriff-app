// src/components/MiniMap.tsx
// Embedded Kakao Map for use inside ScrollViews in detail screens.
import React from 'react';
import { StyleSheet, TouchableOpacity, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

const KAKAO_JS_KEY = '589395258866fe7786bd8cbb6e152b1f';

function buildHTML(lat: number, lng: number, title: string): string {
  const pinSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40"><path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 24 16 24S32 28 32 16C32 7.16 24.84 0 16 0z" fill="#FFAC30" stroke="white" stroke-width="2"/><circle cx="16" cy="16" r="5.5" fill="white"/></svg>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body, #map { width:100%; height:100%; overflow:hidden; }
  </style>
  <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}"></script>
</head>
<body>
  <div id="map"></div>
  <script>
    var LAT   = ${lat};
    var LNG   = ${lng};
    var TITLE = ${JSON.stringify(title)};
    var SVG   = ${JSON.stringify(pinSvg)};

    var map = new kakao.maps.Map(document.getElementById('map'), {
      center: new kakao.maps.LatLng(LAT, LNG),
      level: 4
    });
    map.setDraggable(false);
    map.setZoomable(false);

    var markerImg = new kakao.maps.MarkerImage(
      'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(SVG),
      new kakao.maps.Size(32, 40),
      { offset: new kakao.maps.Point(16, 40) }
    );
    new kakao.maps.Marker({ position: new kakao.maps.LatLng(LAT, LNG), map: map, image: markerImg });

    var labelEl = document.createElement('div');
    labelEl.style.cssText = [
      'background:white',
      'border:1.5px solid #FFAC30',
      'border-radius:10px',
      'padding:5px 10px',
      'font-size:12px',
      'font-family:-apple-system,BlinkMacSystemFont,sans-serif',
      'font-weight:600',
      'white-space:nowrap',
      'box-shadow:0 2px 8px rgba(0,0,0,0.15)',
      'transform:translateY(-60px)'
    ].join(';');
    labelEl.textContent = TITLE;
    new kakao.maps.CustomOverlay({
      position: new kakao.maps.LatLng(LAT, LNG),
      content: labelEl,
      yAnchor: 0,
      map: map
    });
  </script>
</body>
</html>`;
}

interface Props {
  lat: number;
  lng: number;
  title: string;
  height?: number;
  onExpand?: () => void;
}

export default function MiniMap({ lat, lng, title, height = 200, onExpand }: Props) {
  const html = buildHTML(lat, lng, title);

  return (
    <View style={[styles.wrap, { height }]}>
      <WebView
        source={{ html }}
        style={StyleSheet.absoluteFill}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
      />
      {onExpand && (
        <TouchableOpacity style={styles.expandBtn} onPress={onExpand} activeOpacity={0.85}>
          <Ionicons name="map-outline" size={13} color="#FFFFFF" />
          <Text style={styles.expandText}>전체 지도</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F0EDE8',
  },
  expandBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(26,17,8,0.72)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
  },
  expandText: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#FFFFFF',
  },
});
