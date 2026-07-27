// src/store/mapStore.ts
// Shared overlay state between the map screen and the tab layout overlay renderer.

import { create } from 'zustand';

// ── Shared types (imported by both index.tsx and _layout.tsx) ─────────────────

export interface MapPin {
  id: string;
  type: 'gathering' | 'saved' | 'post' | 'landmark';
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  flash?: boolean;
  tier?: import('../utils/postAggregation').LandmarkTier; // 'landmark' 타입에서만 사용
  count?: number; // 'landmark' 타입에서만 사용 — 방문(게시물) 횟수
}

export interface PlaceResult {
  id: string;
  place_name: string;
  category_name: string;
  address_name: string;
  road_address_name: string;
  x: string; // lng
  y: string; // lat
  distance?: string;
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface MapOverlayState {
  placeResults:    PlaceResult[];
  selectedPlace:   PlaceResult | null;
  selectedPin:     MapPin      | null;
  showResults:     boolean;
  activeCategory:  string | null;
  savedPlaces:     MapPin[];
  feedSearchQuery: string | null; // 지도 → 피드 탭 검색어 전달

  // Registered by the map screen so the overlay can send WebView commands
  _sendToMap: ((msg: object) => void) | null;
  // Registered by the map screen so the "코스 추천" bottom sheet button (rendered in
  // _layout.tsx) can trigger the course builder, which needs index.tsx's local
  // state (userLoc, landmarkPins) — same pattern as _sendToMap/registerSend.
  _buildCourse:  ((landmarkPinId: string) => void) | null;
  courseLoading: boolean;

  // Actions
  setPlaceResults:    (r: PlaceResult[])          => void;
  setSelectedPlace:   (p: PlaceResult | null)      => void;
  setSelectedPin:     (p: MapPin      | null)      => void;
  setShowResults:     (v: boolean)                 => void;
  setActiveCategory:  (v: string | null)           => void;
  setFeedSearchQuery: (q: string | null)           => void;
  registerSend:       (fn: (msg: object) => void)  => void;
  registerBuildCourse: (fn: (landmarkPinId: string) => void) => void;
  setCourseLoading:   (v: boolean)                 => void;
  clearPlaces:        ()                           => void;
  hideCard:           ()                           => void;
  savePlace:          (place: PlaceResult)         => void;
  unsavePlace:        (id: string)                 => void;
  loadSavedPlaces:    (pins: MapPin[])             => void;
}

export const useMapStore = create<MapOverlayState>((set) => ({
  placeResults:    [],
  selectedPlace:   null,
  selectedPin:     null,
  showResults:     false,
  activeCategory:  null,
  savedPlaces:     [], // TODO: persist via zustand-persist + AsyncStorage (Firestore sync: MAP-03)
  feedSearchQuery: null,
  _sendToMap:      null,
  _buildCourse:    null,
  courseLoading:   false,

  setPlaceResults:    (placeResults)    => set({ placeResults }),
  setSelectedPlace:   (selectedPlace)   => set({ selectedPlace, selectedPin: null }),
  setSelectedPin:     (selectedPin)     => set({ selectedPin, selectedPlace: null }),
  setShowResults:     (showResults)     => set({ showResults }),
  setActiveCategory:  (activeCategory)  => set({ activeCategory }),
  setFeedSearchQuery: (feedSearchQuery) => set({ feedSearchQuery }),
  registerSend:       (fn)              => set({ _sendToMap: fn }),
  registerBuildCourse: (fn)             => set({ _buildCourse: fn }),
  setCourseLoading:   (courseLoading)   => set({ courseLoading }),

  clearPlaces: () => set({
    placeResults:   [],
    showResults:    false,
    activeCategory: null,
  }),

  hideCard: () => set({ selectedPin: null, selectedPlace: null }),

  savePlace: (place) => set((state) => {
    if (state.savedPlaces.some((p) => p.id === place.id)) return state;
    const pin: MapPin = {
      id:       place.id,
      type:     'saved',
      lat:      parseFloat(place.y),
      lng:      parseFloat(place.x),
      title:    place.place_name,
      subtitle: place.road_address_name || place.address_name,
    };
    return { savedPlaces: [...state.savedPlaces, pin] };
  }),

  unsavePlace: (id) => set((state) => ({
    savedPlaces: state.savedPlaces.filter((p) => p.id !== id),
  })),

  loadSavedPlaces: (pins) => set({ savedPlaces: pins }),
}));
