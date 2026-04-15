// src/store/mapStore.ts
// Shared overlay state between the map screen and the tab layout overlay renderer.

import { create } from 'zustand';

// ── Shared types (imported by both index.tsx and _layout.tsx) ─────────────────

export interface MapPin {
  id: string;
  type: 'gathering' | 'quest' | 'saved';
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
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
  placeResults:   PlaceResult[];
  selectedPlace:  PlaceResult | null;
  selectedPin:    MapPin      | null;
  showResults:    boolean;
  activeCategory: string | null;

  // Registered by the map screen so the overlay can send WebView commands
  _sendToMap: ((msg: object) => void) | null;

  // Actions
  setPlaceResults:   (r: PlaceResult[])          => void;
  setSelectedPlace:  (p: PlaceResult | null)      => void;
  setSelectedPin:    (p: MapPin      | null)      => void;
  setShowResults:    (v: boolean)                 => void;
  setActiveCategory: (v: string | null)           => void;
  registerSend:      (fn: (msg: object) => void)  => void;
  clearPlaces:       ()                           => void;
  hideCard:          ()                           => void;
}

export const useMapStore = create<MapOverlayState>((set) => ({
  placeResults:   [],
  selectedPlace:  null,
  selectedPin:    null,
  showResults:    false,
  activeCategory: null,
  _sendToMap:     null,

  setPlaceResults:   (placeResults)   => set({ placeResults }),
  setSelectedPlace:  (selectedPlace)  => set({ selectedPlace, selectedPin: null }),
  setSelectedPin:    (selectedPin)    => set({ selectedPin, selectedPlace: null }),
  setShowResults:    (showResults)    => set({ showResults }),
  setActiveCategory: (activeCategory) => set({ activeCategory }),
  registerSend:      (fn)             => set({ _sendToMap: fn }),

  clearPlaces: () => set({
    placeResults:   [],
    showResults:    false,
    activeCategory: null,
  }),

  hideCard: () => set({ selectedPin: null, selectedPlace: null }),
}));
