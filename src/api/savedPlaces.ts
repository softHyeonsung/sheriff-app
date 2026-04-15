// src/api/savedPlaces.ts
// Firestore persistence for saved map pins.
// Subcollection: users/{uid}/savedPins/{pinId}

import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { MapPin } from '../store/mapStore';

const savedPinsCol = (uid: string) => collection(db, 'users', uid, 'savedPins');
const savedPinDoc  = (uid: string, pinId: string) => doc(db, 'users', uid, 'savedPins', pinId);

export const loadSavedPins = async (uid: string): Promise<MapPin[]> => {
  const snap = await getDocs(savedPinsCol(uid));
  return snap.docs.map((d) => d.data() as MapPin);
};

export const savePinToFirestore = async (uid: string, pin: MapPin): Promise<void> => {
  await setDoc(savedPinDoc(uid, pin.id), pin);
};

export const unsavePinFromFirestore = async (uid: string, pinId: string): Promise<void> => {
  await deleteDoc(savedPinDoc(uid, pinId));
};
