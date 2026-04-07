// 경로: app/(tabs)/index.tsx
// Map Screen — Hybrid layout: full-bleed map + amber gradient wash + floating mode toggle + sliding pin card
// TODO (MAP-01): Replace react-native-maps (Google/Apple) with Kakao Map WebView for KR production.
//   Pattern: mapProvider = userCountry === 'KR' ? KakaoMapWebView : <MapView provider={PROVIDER_GOOGLE} />

import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ── Types ──────────────────────────────────────────────────────────────────────

type MapMode = 'basic' | 'my_map' | 'gathering_quest';

interface MapPin {
  id: string;
  type: 'gathering' | 'quest' | 'saved';
  coordinate: { latitude: number; longitude: number };
  title: string;
  subtitle?: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const PIN_COLORS: Record<MapPin['type'], string> = {
  gathering: '#FFAC30',  // amber — DESIGN.md § Pin colors
  quest: '#A36E1D',       // leather brown
  saved: '#4CAF6A',       // success green
};

const PIN_LABELS: Record<MapPin['type'], string> = {
  gathering: '모임',
  quest: '퀘스트',
  saved: '저장',
};

// Mode FAB config — colors match Figma (blue/yellow/orange)
const MODE_CONFIG: { mode: MapMode; label: string; icon: string; color: string }[] = [
  { mode: 'basic',            label: '기본',       icon: '🗺',  color: '#4285F4' },
  { mode: 'my_map',           label: '내 지도',    icon: '🔖',  color: '#FFD700' },
  { mode: 'gathering_quest',  label: '모임·퀘스트', icon: '🧭', color: '#FFAC30' },
];

// Fallback center: Seoul (when location permission denied — DESIGN.md § Location)
const SEOUL = { latitude: 37.5665, longitude: 126.9780 };

// TODO (MAP-01 cold-start): Replace with KTO (한국관광공사) API pins fetched on mount.
// These are mock pins until Firestore queries (gatherings, quests, saved_places) are wired up.
const MOCK_PINS: MapPin[] = [
  {
    id: '1',
    type: 'gathering',
    coordinate: { latitude: 37.5665, longitude: 126.9800 },
    title: '남산 산책 모임',
    subtitle: '일요일 오전 10시 · 5/8명',
  },
  {
    id: '2',
    type: 'quest',
    coordinate: { latitude: 37.5690, longitude: 126.9750 },
    title: '강아지 산책 도움',
    subtitle: '난이도 Easy · 50P',
  },
  {
    id: '3',
    type: 'saved',
    coordinate: { latitude: 37.5640, longitude: 126.9820 },
    title: '서울역',
    subtitle: '내가 저장한 장소',
  },
];

// ── Component ──────────────────────────────────────────────────────────────────

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<MapMode>('basic');
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const cardAnim = useRef(new Animated.Value(0)).current;
  const mapRef = useRef<MapView>(null);

  // Request location on mount; fall back to Seoul if denied
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    })();
  }, []);

  const showCard = (pin: MapPin) => {
    setSelectedPin(pin);
    Animated.spring(cardAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  const hideCard = () => {
    Animated.timing(cardAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setSelectedPin(null));
  };

  const visiblePins = MOCK_PINS.filter((pin) => {
    if (mode === 'my_map') return pin.type === 'saved';
    if (mode === 'gathering_quest') return pin.type === 'gathering' || pin.type === 'quest';
    return true;
  });

  const cardTranslateY = cardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [240, 0],
  });

  const center = userLocation ?? SEOUL;

  return (
    <View style={styles.container}>
      {/* Full-bleed map */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_GOOGLE}
        showsUserLocation
        showsMyLocationButton={false}
        initialRegion={{ ...center, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
        onPress={hideCard}
      >
        {visiblePins.map((pin) => (
          <Marker
            key={pin.id}
            coordinate={pin.coordinate}
            pinColor={PIN_COLORS[pin.type]}
            onPress={() => showCard(pin)}
          />
        ))}
      </MapView>

      {/* Amber gradient wash — bottom 35% (Hybrid variant C element) */}
      <LinearGradient
        colors={['transparent', 'rgba(255,172,48,0.10)', 'rgba(255,172,48,0.20)']}
        style={styles.gradient}
        pointerEvents="none"
      />

      {/* Mode FAB stack (vertical, right side) — active on top, inactive below */}
      <View style={[styles.fabStack, { top: insets.top + 80 }]}>
        {[
          MODE_CONFIG.find((c) => c.mode === mode)!,
          ...MODE_CONFIG.filter((c) => c.mode !== mode),
        ].map((cfg, idx) => {
          const isActive = idx === 0;
          return (
            <TouchableOpacity
              key={cfg.mode}
              style={[
                styles.fabBtn,
                isActive
                  ? { backgroundColor: cfg.color }
                  : styles.fabBtnInactive,
              ]}
              onPress={() => {
                setMode(cfg.mode);
                hideCard();
              }}
              activeOpacity={0.8}
              accessibilityLabel={cfg.label}
            >
              <Text style={styles.fabIcon}>{cfg.icon}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Current location FAB */}
      <TouchableOpacity
        style={[styles.locationFab, { bottom: insets.bottom + 96 }]}
        onPress={() => {
          mapRef.current?.animateToRegion(
            { ...center, latitudeDelta: 0.015, longitudeDelta: 0.015 },
            400,
          );
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.locationFabIcon}>⊙</Text>
      </TouchableOpacity>

      {/* Pin detail card — slides up from bottom */}
      {selectedPin && (
        <Animated.View
          style={[
            styles.pinCard,
            { bottom: insets.bottom + 16, transform: [{ translateY: cardTranslateY }] },
          ]}
        >
          {/* Type badge */}
          <View
            style={[styles.pinTypeBadge, { backgroundColor: PIN_COLORS[selectedPin.type] }]}
          >
            <Text style={styles.pinTypeBadgeText}>{PIN_LABELS[selectedPin.type]}</Text>
          </View>

          <Text style={styles.pinCardTitle}>{selectedPin.title}</Text>
          {selectedPin.subtitle && (
            <Text style={styles.pinCardSubtitle}>{selectedPin.subtitle}</Text>
          )}

          <View style={styles.pinCardActions}>
            <TouchableOpacity style={styles.pinCardPrimaryBtn} onPress={hideCard}>
              <Text style={styles.pinCardPrimaryBtnText}>자세히 보기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pinCardSecondaryBtn} onPress={hideCard}>
              <Text style={styles.pinCardSecondaryBtnText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '35%',
  },
  fabStack: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    gap: 10,
  },
  fabBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },
  fabBtnInactive: {
    backgroundColor: '#FFFDF7',
    borderWidth: 1,
    borderColor: '#EFE0C4',
  },
  fabIcon: {
    fontSize: 20,
  },
  locationFab: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFDF7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#A36E1D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  locationFabIcon: {
    fontSize: 18,
    color: '#FFAC30',
  },
  pinCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#FFF8EC',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#A36E1D',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  pinTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    marginBottom: 10,
  },
  pinTypeBadgeText: {
    fontSize: 11,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#1A1108',
  },
  pinCardTitle: {
    fontSize: 17,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
    marginBottom: 4,
  },
  pinCardSubtitle: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#7A5C38',
    marginBottom: 16,
  },
  pinCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  pinCardPrimaryBtn: {
    flex: 1,
    backgroundColor: '#FFAC30',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  pinCardPrimaryBtnText: {
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },
  pinCardSecondaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFE0C4',
    alignItems: 'center',
  },
  pinCardSecondaryBtnText: {
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-Medium',
    color: '#7A5C38',
  },
});
