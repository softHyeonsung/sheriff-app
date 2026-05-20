// src/api/savedPlaces.ts
// Firestore persistence for saved map pins.
// Subcollection: users/{uid}/savedPins/{pinId}

import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { MapPin } from '../store/mapStore';
import { addScore, checkAndAwardBadge, checkAndIncrementDaily, trackPlaceSave } from './scoring';

const savedPinsCol = (uid: string) => collection(db, 'users', uid, 'savedPins');
const savedPinDoc  = (uid: string, pinId: string) => doc(db, 'users', uid, 'savedPins', pinId);

export const loadSavedPins = async (uid: string): Promise<MapPin[]> => {
  const snap = await getDocs(savedPinsCol(uid));
  return snap.docs.map((d) => d.data() as MapPin);
};

export const savePinToFirestore = async (uid: string, pin: MapPin): Promise<void> => {
  await setDoc(savedPinDoc(uid, pin.id), pin);

  // +5 핀 저장 (하루 최대 5회)
  const withinLimit = await checkAndIncrementDaily(uid, 'places_saved', 5);
  if (withinLimit) {
    await addScore(uid, 5);
  }

  // 최초 저장 +15 / 영향력 보너스 +3
  await trackPlaceSave(uid, pin.id, pin.title);

  // 5곳 저장 시 동네 탐험가 뱃지
  const snap = await getDocs(savedPinsCol(uid));
  if (snap.size >= 5) {
    await checkAndAwardBadge(uid, 'neighborhood_explorer');
  }
};

export const unsavePinFromFirestore = async (uid: string, pinId: string): Promise<void> => {
  await deleteDoc(savedPinDoc(uid, pinId));
};
