// 경로: app/(tabs)/_layout.tsx
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { savePinToFirestore, unsavePinFromFirestore } from '../../src/api/savedPlaces';
import { useAuthStore } from '../../src/store/authStore';
import { MapPin, PlaceResult, useMapStore } from '../../src/store/mapStore';

// ── Icon map ───────────────────────────────────────────────────────────────────

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { focused: IoniconName; unfocused: IoniconName }> = {
  index:     { focused: 'map',    unfocused: 'map-outline' },
  feed:      { focused: 'chatbox', unfocused: 'chatbox-outline' },
  community: { focused: 'people', unfocused: 'people-outline' },
  chat:      { focused: 'send',   unfocused: 'send-outline' },
  profile:   { focused: 'person', unfocused: 'person-outline' },
};

const TAB_LABELS: Record<string, string> = {
  index:     '지도 탭',
  feed:      '피드 탭',
  community: '모임 탭',
  chat:      '채팅 탭',
  profile:   '프로필 탭',
};

// ── Pin / place display helpers ────────────────────────────────────────────────

const PIN_COLORS: Record<MapPin['type'], string> = {
  gathering: '#FFAC30',
  quest:     '#A36E1D',
  saved:     '#4CAF6A',
};

const PIN_LABELS: Record<MapPin['type'], string> = {
  gathering: '모임',
  quest:     '퀘스트',
  saved:     '저장',
};

// ── Floating tab bar ───────────────────────────────────────────────────────────

function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBarOuter, { bottom: insets.bottom + 8 }]}>
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const icons = TAB_ICONS[route.name];

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={TAB_LABELS[route.name]}
            >
              <Ionicons
                name={isFocused ? icons?.focused : icons?.unfocused}
                size={24}
                color={isFocused ? '#FFAC30' : '#8A6030'}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Map overlay sheets (rendered above Tabs + tab bar, no Modal) ───────────────

function MapOverlaySheets() {
  const insets = useSafeAreaInsets();

  const {
    placeResults,
    selectedPlace,
    selectedPin,
    showResults,
    _sendToMap,
    setSelectedPlace,
    setShowResults,
    clearPlaces,
    hideCard,
    savedPlaces,
    savePlace,
    unsavePlace,
  } = useMapStore();

  const firebaseUser = useAuthStore((s) => s.user);
  const kakaoUser    = useAuthStore((s) => s.kakaoUser);
  const currentUid   = firebaseUser?.uid ?? (kakaoUser ? `kakao_${kakaoUser.id}` : null);

  const handleSavePlace = useCallback((place: PlaceResult) => {
    savePlace(place);
    if (currentUid) {
      const pin = savedPlaces.find((p) => p.id === place.id)
        ?? { id: place.id, type: 'saved' as const,
             lat: parseFloat(place.y), lng: parseFloat(place.x),
             title: place.place_name,
             subtitle: place.road_address_name || place.address_name };
      savePinToFirestore(currentUid, pin).catch((e) =>
        console.warn('[savedPlaces] Firestore save failed:', e));
    }
  }, [savePlace, savedPlaces, currentUid]);

  const handleUnsavePlace = useCallback((id: string) => {
    unsavePlace(id);
    if (currentUid) {
      unsavePinFromFirestore(currentUid, id).catch((e) =>
        console.warn('[savedPlaces] Firestore unsave failed:', e));
    }
  }, [unsavePlace, currentUid]);

  const isSaved = React.useMemo(
    () => selectedPlace ? savedPlaces.some((p) => p.id === selectedPlace.id) : false,
    [selectedPlace, savedPlaces],
  );

  const cardAnim    = useRef(new Animated.Value(0)).current;
  const resultsAnim = useRef(new Animated.Value(0)).current;

  // Mounted flags — keep in tree during animate-out so the animation plays
  const [resultsMounted, setResultsMounted] = useState(false);
  const [cardMounted,    setCardMounted]    = useState(false);

  // Animate results sheet in/out
  useEffect(() => {
    if (showResults) {
      setResultsMounted(true);
      Animated.spring(resultsAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 12 }).start();
    } else if (resultsMounted) {
      Animated.timing(resultsAnim, { toValue: 0, duration: 220, useNativeDriver: true })
        .start(() => setResultsMounted(false));
    }
  }, [showResults, resultsMounted]);

  // Animate card in/out
  const hasCard = !!(selectedPin || selectedPlace);
  useEffect(() => {
    if (hasCard) {
      setCardMounted(true);
      Animated.spring(cardAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 12 }).start();
    } else if (cardMounted) {
      Animated.timing(cardAnim, { toValue: 0, duration: 220, useNativeDriver: true })
        .start(() => setCardMounted(false));
    }
  }, [hasCard, cardMounted]);

  const cardSheetY    = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [500, 0] });
  const resultsSheetY = resultsAnim.interpolate({ inputRange: [0, 1], outputRange: [500, 0] });

  const handleCloseResults = useCallback(() => {
    _sendToMap?.({ type: 'CLEAR_PLACES' });
    clearPlaces();
  }, [_sendToMap, clearPlaces]);

  const selectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSelectResult = useCallback((item: PlaceResult) => {
    setShowResults(false);
    if (selectTimerRef.current) clearTimeout(selectTimerRef.current);
    // brief delay so results animate out before card appears
    selectTimerRef.current = setTimeout(() => {
      setSelectedPlace(item);
      _sendToMap?.({ type: 'CENTER', lat: parseFloat(item.y), lng: parseFloat(item.x) });
    }, 240);
  }, [_sendToMap, setSelectedPlace, setShowResults]);

  useEffect(() => () => {
    if (selectTimerRef.current) clearTimeout(selectTimerRef.current);
  }, []);

  const bottomPad = insets.bottom + 16;

  return (
    <View
      style={StyleSheet.absoluteFillObject}
      pointerEvents="box-none"
    >
      {/* ── Results sheet ── */}
      {resultsMounted && (
        <View style={styles.sheetWrap} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.overlaySheet,
              { paddingBottom: bottomPad, transform: [{ translateY: resultsSheetY }] },
            ]}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>검색 결과 {placeResults.length}개</Text>
              <TouchableOpacity onPress={handleCloseResults} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color="#7A5C38" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={placeResults}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={styles.resultsList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.resultItem}
                  onPress={() => handleSelectResult(item)}
                  activeOpacity={0.8}
                >
                  <View style={styles.resultItemIcon}>
                    <Ionicons name="location" size={16} color="#FFAC30" />
                  </View>
                  <View style={styles.resultItemInfo}>
                    <Text style={styles.resultItemName} numberOfLines={1}>{item.place_name}</Text>
                    <Text style={styles.resultItemAddr} numberOfLines={1}>
                      {item.road_address_name || item.address_name}
                      {item.distance ? `  ·  ${Number(item.distance) >= 1000
                        ? `${(Number(item.distance) / 1000).toFixed(1)}km`
                        : `${item.distance}m`}` : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#B89060" />
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.resultSep} />}
            />
          </Animated.View>
        </View>
      )}

      {/* ── Pin / place detail sheet ── */}
      {cardMounted && (
        <View style={styles.sheetWrap} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.overlaySheet,
              { paddingBottom: bottomPad, transform: [{ translateY: cardSheetY }] },
            ]}
          >
            <View style={styles.sheetHandle} />

            {selectedPin && (
              <>
                <View style={styles.sheetHeader}>
                  <View style={[styles.pinTypeBadge, { backgroundColor: PIN_COLORS[selectedPin.type] }]}>
                    <Text style={styles.pinTypeBadgeText}>{PIN_LABELS[selectedPin.type]}</Text>
                  </View>
                  <TouchableOpacity onPress={hideCard} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close" size={22} color="#7A5C38" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.detailTitle}>{selectedPin.title}</Text>
                {selectedPin.subtitle && (
                  <Text style={styles.detailSubtitle}>{selectedPin.subtitle}</Text>
                )}
                <View style={styles.detailActions}>
                  {selectedPin.type === 'saved' ? (
                    <TouchableOpacity
                      style={[styles.detailPrimaryBtn, { backgroundColor: '#E05252' }]}
                      onPress={() => { handleUnsavePlace(selectedPin.id); hideCard(); }}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="bookmark" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={[styles.detailPrimaryBtnText, { color: '#FFFFFF' }]}>저장 취소</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.detailPrimaryBtn} onPress={hideCard} activeOpacity={0.85}>
                      <Ionicons name="arrow-forward-circle" size={18} color="#1A1108" style={{ marginRight: 6 }} />
                      <Text style={styles.detailPrimaryBtnText}>자세히 보기</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.detailSecondaryBtn} onPress={hideCard} activeOpacity={0.7}>
                    <Text style={styles.detailSecondaryBtnText}>닫기</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {selectedPlace && (
              <>
                <View style={styles.sheetHeader}>
                  <View style={styles.placeIconWrap}>
                    <Ionicons name="location" size={18} color="#FFAC30" />
                  </View>
                  <TouchableOpacity onPress={hideCard} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close" size={22} color="#7A5C38" />
                  </TouchableOpacity>
                </View>
                <View style={styles.placeCardMeta}>
                  <Text style={styles.placeCategory}>
                    {selectedPlace.category_name.split(' > ').pop()}
                  </Text>
                  {selectedPlace.distance && <View style={styles.placeDot} />}
                  {selectedPlace.distance && (
                    <Text style={styles.placeDistance}>
                      {Number(selectedPlace.distance) >= 1000
                        ? `${(Number(selectedPlace.distance) / 1000).toFixed(1)}km`
                        : `${selectedPlace.distance}m`}
                    </Text>
                  )}
                </View>
                <Text style={styles.detailTitle}>{selectedPlace.place_name}</Text>
                <View style={styles.placeAddrRow}>
                  <Ionicons name="map-outline" size={14} color="#B89060" style={{ marginRight: 5 }} />
                  <Text style={styles.detailSubtitle} numberOfLines={2}>
                    {selectedPlace.road_address_name || selectedPlace.address_name}
                  </Text>
                </View>
                <View style={styles.detailActions}>
                  <TouchableOpacity
                    style={styles.detailPrimaryBtn}
                    onPress={() => isSaved ? handleUnsavePlace(selectedPlace.id) : handleSavePlace(selectedPlace)}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name={isSaved ? 'bookmark' : 'bookmark-outline'}
                      size={18}
                      color="#1A1108"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.detailPrimaryBtnText}>{isSaved ? '저장됨' : '저장하기'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.detailSecondaryBtn} onPress={hideCard} activeOpacity={0.7}>
                    <Text style={styles.detailSecondaryBtnText}>닫기</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Animated.View>
        </View>
      )}
    </View>
  );
}

// ── Layout ─────────────────────────────────────────────────────────────────────

export default function TabLayout() {
  return (
    <View style={styles.root}>
      <Tabs
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#1A1108',
          headerTitleStyle: { fontFamily: 'AppleSDGothicNeo-Bold', fontSize: 18 },
          headerShadowVisible: false,
        }}
      >
        {/* 1. 지도 — full-bleed, no header */}
        <Tabs.Screen
          name="index"
          options={{ title: '지도', headerShown: false }}
        />

        {/* 2. 피드 */}
        <Tabs.Screen
          name="feed"
          options={{ title: '피드', headerShown: false }}
        />

        {/* 3. 모임 */}
        <Tabs.Screen
          name="community"
          options={{ title: '모임' }}
        />

        {/* 4. 채팅 */}
        <Tabs.Screen
          name="chat"
          options={{ title: '채팅' }}
        />

        {/* 5. 프로필 */}
        <Tabs.Screen
          name="profile"
          options={{ title: '프로필' }}
        />
      </Tabs>

      {/* Overlay sheets — rendered AFTER Tabs so they paint above tab bar.
          No Modal needed: sibling z-order puts this above everything. */}
      <MapOverlaySheets />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Tab bar
  tabBarOuter: {
    position: 'absolute',
    left: 20,
    right: 20,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    paddingVertical: 10,
    paddingHorizontal: 8,
    shadowColor: '#A36E1D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
  },

  // Sheet wrapper — fills screen, touches pass through transparent area
  sheetWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    justifyContent: 'flex-end',
  },

  // Shared sheet
  overlaySheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 30,
    maxHeight: '48%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E5E5',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 16,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },

  // Results list
  resultsList: { maxHeight: 400 },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  resultItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF8EC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultItemInfo: { flex: 1 },
  resultItemName: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#1A1108',
    marginBottom: 2,
  },
  resultItemAddr: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#7A5C38',
  },
  resultSep: {
    height: 1,
    backgroundColor: '#F5F5F5',
    marginLeft: 60,
  },

  // Pin badge
  pinTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  pinTypeBadgeText: {
    fontSize: 11,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#1A1108',
  },

  // Place card
  placeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF8EC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  placeDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#B89060',
  },
  placeCategory: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-Medium',
    color: '#7A5C38',
  },
  placeDistance: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#B89060',
  },
  placeAddrRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },

  // Detail card text / actions
  detailTitle: {
    fontSize: 20,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
    marginBottom: 6,
  },
  detailSubtitle: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#7A5C38',
    flex: 1,
    lineHeight: 18,
  },
  detailActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  detailPrimaryBtn: {
    flex: 1,
    backgroundColor: '#FFAC30',
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailPrimaryBtnText: {
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },
  detailSecondaryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailSecondaryBtnText: {
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-Medium',
    color: '#7A5C38',
  },
});
