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
  savedPlaces:    MapPin[];

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
  savePlace:         (place: PlaceResult)         => void;
  unsavePlace:       (id: string)                 => void;
  loadSavedPlaces:   (pins: MapPin[])             => void;
}

export const useMapStore = create<MapOverlayState>((set) => ({
  placeResults:   [],
  selectedPlace:  null,
  selectedPin:    null,
  showResults:    false,
  activeCategory: null,
  savedPlaces:    [], // TODO: persist via zustand-persist + AsyncStorage (Firestore sync: MAP-03)
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
