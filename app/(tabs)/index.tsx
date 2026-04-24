// 경로: app/(tabs)/index.tsx
// Map Screen — Kakao Map WebView + search + place search + mode circles

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { loadSavedPins } from '../../src/api/savedPlaces';
import { fetchNearbyTourSpots } from '../../src/api/tourApi';
import KOREA_DISTRICTS from '../../src/constants/koreaDistricts';
import { useAuthStore } from '../../src/store/authStore';
import { MapPin, PlaceResult, useMapStore } from '../../src/store/mapStore';

// ── Types ──────────────────────────────────────────────────────────────────────

type MapMode = 'basic' | 'my_map' | 'gathering_quest';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// ── Constants ──────────────────────────────────────────────────────────────────

const KAKAO_JS_KEY   = '589395258866fe7786bd8cbb6e152b1f';
const KAKAO_REST_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY ?? '6d840fb987f5a8ffac05946ef5e9b00c';

const PIN_COLORS: Record<MapPin['type'], string> = {
  gathering: '#FFAC30',
  quest:     '#A36E1D',
  saved:     '#4CAF6A',
};

const MODE_CONFIG: { mode: MapMode; icon: IoniconName; color: string; iconColor: string; label: string }[] = [
  { mode: 'basic',           icon: 'map',      color: '#4285F4', iconColor: '#FFFFFF',  label: '기본'        },
  { mode: 'my_map',          icon: 'bookmark', color: '#FFD700', iconColor: '#1A1108',  label: '내 지도'     },
  { mode: 'gathering_quest', icon: 'compass',  color: '#FFAC30', iconColor: '#1A1108',  label: '모임·퀘스트' },
];

const PLACE_CATEGORIES: { key: string; label: string; code: string }[] = [
  { key: 'food',     label: '음식점', code: 'FD6' },
  { key: 'cafe',     label: '카페',   code: 'CE7' },
  { key: 'conv',     label: '편의점', code: 'CS2' },
  { key: 'subway',   label: '지하철', code: 'SW8' },
  { key: 'pharmacy', label: '약국',   code: 'PM9' },
];

const SEOUL = { lat: 37.5665, lng: 126.9780 };

const MOCK_PINS: MapPin[] = [];

// ── WebView message type guards ────────────────────────────────────────────────

function isMapPin(x: unknown): x is MapPin {
  return typeof x === 'object' && x !== null
    && typeof (x as MapPin).id === 'string'
    && typeof (x as MapPin).lat === 'number'
    && typeof (x as MapPin).lng === 'number'
    && typeof (x as MapPin).title === 'string';
}

function isPlaceResult(x: unknown): x is PlaceResult {
  return typeof x === 'object' && x !== null
    && typeof (x as PlaceResult).id === 'string'
    && typeof (x as PlaceResult).place_name === 'string'
    && typeof (x as PlaceResult).x === 'string'
    && typeof (x as PlaceResult).y === 'string';
}

// ── Kakao Map HTML ─────────────────────────────────────────────────────────────

const buildMapHTML = (apiKey: string, pins: MapPin[]) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; overflow: hidden; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var PINS = ${JSON.stringify(pins)};
    var PIN_COLORS = ${JSON.stringify(PIN_COLORS)};
    var currentMode = 'basic';
    var markers = [];
    var placeMarkers = [];
    var map;

    // ── My location dot ───────────────────────────────────────────────────────
    var myLocationMarker = null;

    function makeMyLocationSrc() {
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">'
        + '<circle cx="12" cy="12" r="10" fill="rgba(66,133,244,0.18)"/>'
        + '<circle cx="12" cy="12" r="6" fill="#4285F4" stroke="white" stroke-width="2"/>'
        + '</svg>';
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }

    function updateMyLocation(lat, lng) {
      var pos = new kakao.maps.LatLng(lat, lng);
      if (!myLocationMarker) {
        var img = new kakao.maps.MarkerImage(makeMyLocationSrc(), new kakao.maps.Size(24, 24),
          { offset: new kakao.maps.Point(12, 12) });
        myLocationMarker = new kakao.maps.Marker({ position: pos, map: map, image: img, zIndex: 10 });
      } else {
        myLocationMarker.setPosition(pos);
      }
    }

    function makeMarkerSrc(color) {
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">'
        + '<path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 22 14 22S28 24.5 28 14C28 6.27 21.73 0 14 0z"'
        + ' fill="' + color + '" stroke="white" stroke-width="1.5"/>'
        + '<circle cx="14" cy="14" r="5" fill="white"/>'
        + '</svg>';
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }

    function makePlaceMarkerSrc(color) {
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="28" viewBox="0 0 22 28">'
        + '<path d="M11 0C4.92 0 0 4.92 0 11c0 8.25 11 17 11 17S22 19.25 22 11C22 4.92 17.08 0 11 0z"'
        + ' fill="' + color + '" stroke="white" stroke-width="1.2"/>'
        + '<circle cx="11" cy="11" r="4" fill="white"/>'
        + '</svg>';
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }

    // ── App pins ──────────────────────────────────────────────────────────────
    function renderPins(mode) {
      markers.forEach(function(m) { m.setMap(null); });
      markers = [];
      var filtered = PINS.filter(function(pin) {
        if (mode === 'my_map')          return pin.type === 'saved';
        if (mode === 'gathering_quest') return pin.type === 'gathering' || pin.type === 'quest';
        return pin.type === 'gathering' || pin.type === 'quest'; // basic: no saved pins
      });
      filtered.forEach(function(pin) {
        var img = new kakao.maps.MarkerImage(makeMarkerSrc(PIN_COLORS[pin.type]), new kakao.maps.Size(28, 36));
        var marker = new kakao.maps.Marker({
          position: new kakao.maps.LatLng(pin.lat, pin.lng),
          map: map, image: img, title: pin.title,
        });
        (function(p) {
          kakao.maps.event.addListener(marker, 'click', function() { send('PIN_PRESS', p); });
        })(pin);
        markers.push(marker);
      });
    }

    // ── Place markers ─────────────────────────────────────────────────────────
    function clearPlaceMarkers() {
      placeMarkers.forEach(function(m) { m.setMap(null); });
      placeMarkers = [];
    }

    function showPlaceMarkers(places) {
      clearPlaceMarkers();
      if (!places || places.length === 0) return;
      var bounds = new kakao.maps.LatLngBounds();
      places.forEach(function(place) {
        var img = new kakao.maps.MarkerImage(makePlaceMarkerSrc('#5B82DB'), new kakao.maps.Size(22, 28));
        var marker = new kakao.maps.Marker({
          position: new kakao.maps.LatLng(parseFloat(place.y), parseFloat(place.x)),
          map: map, image: img, title: place.place_name,
        });
        bounds.extend(new kakao.maps.LatLng(parseFloat(place.y), parseFloat(place.x)));
        (function(p) {
          kakao.maps.event.addListener(marker, 'click', function() { send('PLACE_PRESS', p); });
        })(place);
        placeMarkers.push(marker);
      });
      if (placeMarkers.length > 0) map.setBounds(bounds, 80, 80, 80, 80);
    }

    // ── RN ↔ WebView ─────────────────────────────────────────────────────────
    function send(type, data) {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, data: data }));
    }

    function handleRNMessage(raw) {
      try {
        var msg = JSON.parse(raw);
        if      (msg.type === 'SET_LOCATION')      { map.setCenter(new kakao.maps.LatLng(msg.lat, msg.lng)); updateMyLocation(msg.lat, msg.lng); }
        else if (msg.type === 'MY_LOCATION')        { updateMyLocation(msg.lat, msg.lng); }
        else if (msg.type === 'CENTER')             { map.panTo(new kakao.maps.LatLng(msg.lat, msg.lng)); }
        else if (msg.type === 'SET_MODE')           { currentMode = msg.mode; renderPins(currentMode); }
        else if (msg.type === 'SHOW_PLACE_MARKERS') { showPlaceMarkers(msg.places); }
        else if (msg.type === 'CLEAR_PLACES')       { clearPlaceMarkers(); }
        else if (msg.type === 'UPDATE_APP_PINS')    { PINS = msg.pins; renderPins(currentMode); }
      } catch (e) {}
    }

    document.addEventListener('message', function(e) { handleRNMessage(e.data); });
    window.addEventListener('message',   function(e) { handleRNMessage(e.data); });

    // ── Map init ──────────────────────────────────────────────────────────────
    function initMap() {
      var container = document.getElementById('map');
      map = new kakao.maps.Map(container, {
        center: new kakao.maps.LatLng(${SEOUL.lat}, ${SEOUL.lng}),
        level: 5,
      });
      kakao.maps.event.addListener(map, 'click', function() { send('MAP_PRESS', null); });
      kakao.maps.event.addListener(map, 'idle', function() {
        var c = map.getCenter();
        send('MAP_CENTER', { lat: c.getLat(), lng: c.getLng() });
      });
      renderPins(currentMode);
      send('MAP_READY', null);
    }
  </script>
  <script type="text/javascript"
    src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false">
  </script>
  <script>kakao.maps.load(initMap);</script>
</body>
</html>
`;

// ── Component ──────────────────────────────────────────────────────────────────

export default function MapScreen() {
  const insets  = useSafeAreaInsets();
  const webRef           = useRef<WebView>(null);
  const modeAnim         = useRef(new Animated.Value(0)).current;
  const hasLoadedNearby  = useRef(false);
  const nearbyTourSpots  = useRef<PlaceResult[]>([]);
  const mapHtml          = React.useMemo(() => buildMapHTML(KAKAO_JS_KEY, MOCK_PINS), []);

  const router = useRouter();

  const [mode,       setMode]       = useState<MapMode>('basic');
  const modeRef = useRef<MapMode>('basic');
  const [userLoc,    setUserLoc]    = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter,  setMapCenter]  = useState<{ lat: number; lng: number } | null>(null);
  const [mapReady,   setMapReady]   = useState(false);
  const [searchText, setSearchText] = useState('');
  const [modeOpen,   setModeOpen]   = useState(false);
  const [selectedDo,      setSelectedDo]      = useState<string | null>(null);
  const [selectedSiGunGu, setSelectedSiGunGu] = useState<string | null>(null);
  const [selectedEupMyeonDong, setSelectedEupMyeonDong] = useState<string | null>(null);
  const [openDrop, setOpenDrop] = useState<'do' | 'sigungu' | 'eupMyeonDong' | null>(null);

  const DO_LIST      = Object.keys(KOREA_DISTRICTS);
  const SI_GUN_GU_LIST = selectedDo ? Object.keys(KOREA_DISTRICTS[selectedDo] ?? {}) : [];
  const EUP_MYEON_DONG_LIST = (selectedDo && selectedSiGunGu)
    ? (KOREA_DISTRICTS[selectedDo]?.[selectedSiGunGu] ?? [])
    : [];

  // Auth
  const firebaseUser = useAuthStore((s) => s.user);
  const kakaoUser    = useAuthStore((s) => s.kakaoUser);
  const currentUid   = firebaseUser?.uid ?? (kakaoUser ? `kakao_${kakaoUser.id}` : null);

  // Store actions
  const {
    activeCategory,
    selectedPin,
    selectedPlace,
    setPlaceResults,
    setSelectedPin,
    setSelectedPlace,
    setShowResults,
    setActiveCategory,
    registerSend,
    clearPlaces,
    hideCard,
    savedPlaces,
    loadSavedPlaces,
  } = useMapStore();

  const send = useCallback((msg: object) => {
    webRef.current?.injectJavaScript(
      `handleRNMessage(${JSON.stringify(JSON.stringify(msg))}); true;`
    );
  }, []);

  // Register send callback with store so overlay can send WebView commands
  useEffect(() => {
    registerSend(send);
  }, [send, registerSend]);

  // Load saved places from Firestore on mount
  useEffect(() => {
    if (!currentUid) return;
    loadSavedPins(currentUid)
      .then(loadSavedPlaces)
      .catch((e) => console.warn('[savedPlaces] Firestore load failed:', e));
  }, [currentUid]);

  // Location tracking
  useEffect(() => {
    let subscriber: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      let firstPos = SEOUL;
      try {
        const first = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        firstPos = { lat: first.coords.latitude, lng: first.coords.longitude };
      } catch {
        console.warn('[location] getCurrentPositionAsync failed, using Seoul fallback');
      }
      setUserLoc(firstPos);
      if (mapReady) send({ type: 'SET_LOCATION', ...firstPos });

      subscriber = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 10, timeInterval: 5000 },
        (loc) => {
          const pos = { lat: loc.coords.latitude, lng: loc.coords.longitude };
          setUserLoc(pos);
          send({ type: 'MY_LOCATION', ...pos });
        }
      );
    })();

    return () => { subscriber?.remove(); };
  }, [mapReady]);

  // Keep modeRef in sync for use inside effects that shouldn't re-run on mode changes
  useEffect(() => { modeRef.current = mode; }, [mode]);

  // Mode sync — sync PINS then switch mode, clear place markers on non-basic
  useEffect(() => {
    if (!mapReady) return;
    // Send up-to-date pins BEFORE SET_MODE so renderPins always has fresh saved places
    const { savedPlaces: latestSaved } = useMapStore.getState();
    send({ type: 'UPDATE_APP_PINS', pins: [...MOCK_PINS, ...latestSaved] });
    send({ type: 'SET_MODE', mode });
    if (mode !== 'basic') {
      send({ type: 'CLEAR_PLACES' });
      clearPlaces();
    } else if (nearbyTourSpots.current.length > 0) {
      send({ type: 'SHOW_PLACE_MARKERS', places: nearbyTourSpots.current });
    }
  }, [mode, mapReady, send, clearPlaces]);

  // Sync savedPlaces to WebView whenever they change
  useEffect(() => {
    if (!mapReady) return;
    send({ type: 'UPDATE_APP_PINS', pins: [...MOCK_PINS, ...savedPlaces] });
  }, [mapReady, savedPlaces, send]);

  // Auto-load nearby TourAPI recommended spots on first open
  useEffect(() => {
    if (!mapReady || !userLoc || hasLoadedNearby.current) return;
    hasLoadedNearby.current = true;

    const { lat, lng } = userLoc;
    (async () => {
      const places = await fetchNearbyTourSpots(lat, lng);
      if (places.length === 0) return;

      nearbyTourSpots.current = places;
      setPlaceResults(places);
      if (modeRef.current === 'basic') {
        send({ type: 'SHOW_PLACE_MARKERS', places });
      }
    })();
  }, [mapReady, userLoc, send]);

  // WebView messages
  const onMessage = useCallback((e: WebViewMessageEvent) => {
    try {
      const { type, data } = JSON.parse(e.nativeEvent.data);
      if      (type === 'MAP_READY')   setMapReady(true);
      else if (type === 'MAP_CENTER')  setMapCenter(data as { lat: number; lng: number });
      else if (type === 'PIN_PRESS'   && isMapPin(data))      setSelectedPin(data);
      else if (type === 'PLACE_PRESS' && isPlaceResult(data)) setSelectedPlace(data);
      else if (type === 'MAP_PRESS')   {
        hideCard();
      }
    } catch {}
  }, [hideCard, clearPlaces, send, setSelectedPin, setSelectedPlace]);

  // ── Kakao Local REST API ────────────────────────────────────────────────────
  const kakaoLocalSearch = async (url: string): Promise<PlaceResult[]> => {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` },
      });
      if (!res.ok) return [];
      const json = await res.json();
      return (json.documents ?? []) as PlaceResult[];
    } catch {
      return [];
    }
  };

  // Mode dropdown
  const toggleModeDropdown = () => {
    const toValue = modeOpen ? 0 : 1;
    setModeOpen(!modeOpen);
    Animated.spring(modeAnim, { toValue, useNativeDriver: false, tension: 60, friction: 10 }).start();
  };

  const selectMode = (m: MapMode) => {
    // Stop any in-flight animation and snap closed immediately so the
    // item list doesn't reshuffle while animating (wrong-button bug).
    modeAnim.stopAnimation();
    modeAnim.setValue(0);
    setModeOpen(false);
    setMode(m);
    hideCard();
  };

  // Category tap
  const handleCategoryPress = async (cat: typeof PLACE_CATEGORIES[number]) => {
    if (activeCategory === cat.key) {
      setActiveCategory(null);
      setPlaceResults([]);
      setShowResults(false);
      send({ type: 'CLEAR_PLACES' });
      return;
    }
    setActiveCategory(cat.key);
    setShowResults(false);
    const loc = userLoc ?? SEOUL;
    const url = `https://dapi.kakao.com/v2/local/search/category.json`
      + `?category_group_code=${cat.code}&x=${loc.lng}&y=${loc.lat}&radius=1000&sort=distance&size=15`;
    const results = await kakaoLocalSearch(url);
    setPlaceResults(results);
    if (results.length > 0) setShowResults(true);
    if (modeRef.current === 'basic') send({ type: 'SHOW_PLACE_MARKERS', places: results });
  };

  // Keyword search
  const handleSearch = async () => {
    const q = searchText.trim();
    if (!q) return;
    setActiveCategory(null);
    const loc = userLoc ?? SEOUL;
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json`
      + `?query=${encodeURIComponent(q)}&x=${loc.lng}&y=${loc.lat}&radius=5000&sort=distance&size=15`;
    const results = await kakaoLocalSearch(url);
    setPlaceResults(results);
    if (results.length > 0) setShowResults(true);
    if (modeRef.current === 'basic') send({ type: 'SHOW_PLACE_MARKERS', places: results });
  };

  const handleReSearch = async () => {
    const loc = mapCenter ?? userLoc ?? SEOUL;
    if (activeCategory) {
      const cat = PLACE_CATEGORIES.find((c) => c.key === activeCategory);
      if (cat) {
        const url = `https://dapi.kakao.com/v2/local/search/category.json`
          + `?category_group_code=${cat.code}&x=${loc.lng}&y=${loc.lat}&radius=1000&sort=distance&size=15`;
        const results = await kakaoLocalSearch(url);
        setPlaceResults(results);
        if (results.length > 0) setShowResults(true);
        send({ type: 'SHOW_PLACE_MARKERS', places: results });
      }
    } else if (searchText.trim()) {
      const url = `https://dapi.kakao.com/v2/local/search/keyword.json`
        + `?query=${encodeURIComponent(searchText.trim())}&x=${loc.lng}&y=${loc.lat}&radius=5000&sort=distance&size=15`;
      const results = await kakaoLocalSearch(url);
      setPlaceResults(results);
      if (results.length > 0) setShowResults(true);
      send({ type: 'SHOW_PLACE_MARKERS', places: results });
    } else {
      const places = await fetchNearbyTourSpots(loc.lat, loc.lng);
      nearbyTourSpots.current = places;
      setPlaceResults(places);
      send({ type: 'SHOW_PLACE_MARKERS', places });
    }
  };

  const visiblePinCount = mode === 'my_map'
    ? savedPlaces.length
    : MOCK_PINS.filter((p) => {
        if (mode === 'gathering_quest') return p.type === 'gathering' || p.type === 'quest';
        return true;
      }).length;

  const center     = userLoc ?? SEOUL;
  const bottomRowY = insets.bottom + 100;

  return (
    <View style={styles.container}>
      {/* Kakao Map WebView */}
      <WebView
        ref={webRef}
        style={StyleSheet.absoluteFillObject}
        source={{ html: mapHtml }}
        originWhitelist={['https://*', 'about:blank']}
        javaScriptEnabled
        domStorageEnabled
        onMessage={onMessage}
        scrollEnabled={false}
      />

      {/* Amber gradient wash */}
      <LinearGradient
        colors={['transparent', 'rgba(255,172,48,0.10)', 'rgba(255,172,48,0.20)']}
        style={styles.gradient}
        pointerEvents="none"
      />

      {/* ── Search bar + directions button ── */}
      <View style={[styles.searchRow, { top: insets.top + 12 }]}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#B89060" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="장소, 모임 검색"
            placeholderTextColor="#B89060"
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
            clearButtonMode="while-editing"
            accessibilityLabel="지도 검색"
          />
        </View>
        <TouchableOpacity
          style={styles.directionsBtn}
          activeOpacity={0.85}
          accessibilityLabel="길찾기"
        >
          <Ionicons name="navigate" size={20} color="#FFFFFF" />
          <Text style={styles.directionsBtnText}>길찾기</Text>
        </TouchableOpacity>
      </View>

      {/* ── Category chips ── */}
      <View style={[styles.categoryRow, { top: insets.top + 120 }]}>
        {PLACE_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.categoryChip, activeCategory === cat.key && styles.categoryChipActive]}
            onPress={() => handleCategoryPress(cat)}
            activeOpacity={0.8}
            accessibilityLabel={cat.label}
          >
            <Text style={[styles.categoryChipText, activeCategory === cat.key && styles.categoryChipTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Area selector + 게시물 보기 (basic mode only) ── */}
      {mode === 'basic' && (
        <View style={[styles.areaRow, { top: insets.top + 72 }]}>

          {/* 도 dropdown */}
          <View style={styles.areaDropWrap}>
            <TouchableOpacity
              style={styles.areaDropBtn}
              onPress={() => setOpenDrop(openDrop === 'do' ? null : 'do')}
              activeOpacity={0.85}
            >
              <Text style={styles.areaDropBtnText} numberOfLines={1}>{selectedDo ?? '도'}</Text>
              <Ionicons name={openDrop === 'do' ? 'chevron-up' : 'chevron-down'} size={12} color="#7A5C38" />
            </TouchableOpacity>
            {openDrop === 'do' && (
              <ScrollView style={styles.areaDropMenu} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                {DO_LIST.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.areaDropItem, item === selectedDo && styles.areaDropItemActive]}
                    onPress={() => {
                      setSelectedDo(item);
                      setSelectedSiGunGu(null);
                      setSelectedEupMyeonDong(null);
                      setOpenDrop(null);
                    }}
                  >
                    <Text style={[styles.areaDropItemText, item === selectedDo && styles.areaDropItemTextActive]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* 시·군·구 dropdown */}
          <View style={styles.areaDropWrap}>
            <TouchableOpacity
              style={[styles.areaDropBtn, !selectedDo && styles.areaDropBtnDisabled]}
              onPress={() => selectedDo && setOpenDrop(openDrop === 'sigungu' ? null : 'sigungu')}
              activeOpacity={0.85}
            >
              <Text style={styles.areaDropBtnText} numberOfLines={1}>{selectedSiGunGu ?? '시·군·구'}</Text>
              <Ionicons name={openDrop === 'sigungu' ? 'chevron-up' : 'chevron-down'} size={12} color="#7A5C38" />
            </TouchableOpacity>
            {openDrop === 'sigungu' && (
              <ScrollView style={styles.areaDropMenu} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                {SI_GUN_GU_LIST.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.areaDropItem, item === selectedSiGunGu && styles.areaDropItemActive]}
                    onPress={() => {
                      setSelectedSiGunGu(item);
                      setSelectedEupMyeonDong(null);
                      setOpenDrop(null);
                    }}
                  >
                    <Text style={[styles.areaDropItemText, item === selectedSiGunGu && styles.areaDropItemTextActive]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* 읍·면·동 dropdown */}
          <View style={styles.areaDropWrap}>
            <TouchableOpacity
              style={[styles.areaDropBtn, !selectedSiGunGu && styles.areaDropBtnDisabled]}
              onPress={() => selectedSiGunGu && setOpenDrop(openDrop === 'eupMyeonDong' ? null : 'eupMyeonDong')}
              activeOpacity={0.85}
            >
              <Text style={styles.areaDropBtnText} numberOfLines={1}>{selectedEupMyeonDong ?? '읍·면·동'}</Text>
              <Ionicons name={openDrop === 'eupMyeonDong' ? 'chevron-up' : 'chevron-down'} size={12} color="#7A5C38" />
            </TouchableOpacity>
            {openDrop === 'eupMyeonDong' && (
              <ScrollView style={styles.areaDropMenu} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                {EUP_MYEON_DONG_LIST.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.areaDropItem, item === selectedEupMyeonDong && styles.areaDropItemActive]}
                    onPress={() => { setSelectedEupMyeonDong(item); setOpenDrop(null); }}
                  >
                    <Text style={[styles.areaDropItemText, item === selectedEupMyeonDong && styles.areaDropItemTextActive]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* 게시물 보기 */}
          <TouchableOpacity
            style={styles.viewPostsBtn}
            onPress={() => router.push('/(tabs)/feed')}
            activeOpacity={0.85}
            accessibilityLabel="이 지역 게시물 보기"
          >
            <Ionicons name="chatbox-outline" size={14} color="#1A1108" />
            <Text style={styles.viewPostsBtnText}>게시물 보기</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Re-search button (basic mode only) ── */}
      {mode === 'basic' && mapReady && (
        <View style={[styles.reSearchRow, { bottom: bottomRowY }]}>
          <TouchableOpacity
            style={styles.reSearchBtn}
            onPress={handleReSearch}
            activeOpacity={0.85}
            accessibilityLabel="이 지역에서 재검색"
          >
            <Ionicons name="refresh" size={14} color="#1A1108" />
            <Text style={styles.reSearchBtnText}>이 지역에서 재검색</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Bottom row: mode dropdown (left) + locate (right) ── */}
      <View style={[styles.bottomRow, { bottom: bottomRowY }]}>

        {/* Mode dropdown */}
        <View style={styles.modeDropdownWrap}>
          {MODE_CONFIG.filter((c) => c.mode !== mode).map((cfg, idx) => {
            const translateY = modeAnim.interpolate({
              inputRange:  [0, 1],
              outputRange: [0, -((idx + 1) * 56)],
            });
            const opacity = modeAnim.interpolate({
              inputRange:  [0, 0.4, 1],
              outputRange: [0, 0,   1],
            });
            const scale = modeAnim.interpolate({
              inputRange:  [0, 1],
              outputRange: [0.7, 1],
            });
            return (
              <Animated.View
                key={cfg.mode}
                pointerEvents={modeOpen ? 'auto' : 'none'}
                style={[
                  styles.modeCircleAbsolute,
                  { transform: [{ translateY }, { scale }], opacity },
                ]}
              >
                <TouchableOpacity
                  style={[styles.modeCircle, styles.modeCircleInactive]}
                  onPress={() => selectMode(cfg.mode)}
                  activeOpacity={0.8}
                  accessibilityLabel={cfg.label}
                >
                  <Ionicons name={cfg.icon} size={26} color="#8A6030" />
                </TouchableOpacity>
              </Animated.View>
            );
          })}

          {/* Current mode circle */}
          {(() => {
            const cfg = MODE_CONFIG.find((c) => c.mode === mode)!;
            return (
              <TouchableOpacity
                style={[styles.modeCircle, { backgroundColor: cfg.color }]}
                onPress={toggleModeDropdown}
                activeOpacity={0.85}
                accessibilityLabel={`${cfg.label} 모드 선택`}
              >
                <Ionicons name={cfg.icon} size={26} color={cfg.iconColor} />
              </TouchableOpacity>
            );
          })()}
        </View>

        {/* Locate FAB */}
        <TouchableOpacity
          style={styles.locationFab}
          onPress={() => send({ type: 'CENTER', ...center })}
          activeOpacity={0.8}
          accessibilityLabel="현재 위치로 이동"
        >
          <Ionicons name="locate" size={26} color="#FFAC30" />
        </TouchableOpacity>
      </View>

      {/* 내 지도 empty state */}
      {mode === 'my_map' && visiblePinCount === 0 && !selectedPin && !selectedPlace && (
        <View style={[styles.myMapEmpty, { bottom: bottomRowY + 60 }]}>
          <Text style={styles.myMapEmptyText}>아직 저장한 장소가 없어요</Text>
          <Text style={styles.myMapEmptyHint}>지도에서 핀을 탭하면 저장할 수 있어요</Text>
        </View>
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    height: '35%',
  },

  // Search
  searchRow: {
    position: 'absolute',
    left: 16, right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 60,
  },
  searchBar: {
    flex: 1,
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#1A1108',
    paddingVertical: 0,
  },
  directionsBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FFAC30',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
    shadowColor: '#A36E1D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  directionsBtnText: {
    fontSize: 10,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#FFFFFF',
  },

  // Area selector row
  areaRow: {
    position: 'absolute',
    left: 16, right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 70,
  },
  areaDropWrap: {
    position: 'relative',
  },
  areaDropBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EFE0C4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 3,
  },
  areaDropBtnText: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#1A1108',
    maxWidth: 72,
  },
  areaDropBtnDisabled: {
    opacity: 0.4,
  },
  areaDropMenu: {
    position: 'absolute',
    top: 40,
    left: 0,
    maxHeight: 220,
    minWidth: 110,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFE0C4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
  areaDropItem: {
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  areaDropItemActive: {
    backgroundColor: '#FFF0D4',
  },
  areaDropItemText: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-Medium',
    color: '#1A1108',
  },
  areaDropItemTextActive: {
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#A36E1D',
  },
  viewPostsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFAC30',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#A36E1D',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  viewPostsBtnText: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#1A1108',
  },

  // Re-search button
  reSearchRow: {
    position: 'absolute',
    left: 0, right: 0,
    alignItems: 'center',
    zIndex: 60,
  },
  reSearchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#EFE0C4',
  },
  reSearchBtnText: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#1A1108',
  },

  // Category chips
  categoryRow: {
    position: 'absolute',
    left: 0, right: 0,
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    zIndex: 60,
  },
  categoryChip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryChipActive: { backgroundColor: '#FFAC30' },
  categoryChipText: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-Medium',
    color: '#7A5C38',
  },
  categoryChipTextActive: {
    color: '#1A1108',
    fontFamily: 'AppleSDGothicNeo-SemiBold',
  },

  // Bottom row
  bottomRow: {
    position: 'absolute',
    left: 28, right: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 60,
  },
  modeDropdownWrap: {
    width: 48,
    height: 48,
  },
  modeCircleAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  modeCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.20,
    shadowRadius: 8,
    elevation: 6,
  },
  modeCircleInactive: {
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#EFE0C4',
  },
  locationFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 3,
  },

  // My map empty
  myMapEmpty: {
    position: 'absolute',
    left: 16, right: 16,
    backgroundColor: '#F0F0F0',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFE0C4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  myMapEmptyText: {
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#1A1108',
    marginBottom: 4,
  },
  myMapEmptyHint: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#7A5C38',
  },
});
