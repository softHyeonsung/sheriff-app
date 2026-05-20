import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

export type Message = {
  id: string;
  sender_id: string;
  text: string;
  timestamp: Timestamp | null;
};

export type ChatRoom = {
  room_id: string;
  room_type: 'dm' | 'gathering';
  members: string[];
  last_message: string;
  last_message_at: Timestamp | null;
};

export type UserProfile = {
  uid: string;
  nickname: string;
  profile_img: string;
};

export const getOrCreateDMRoom = async (myUid: string, otherUid: string): Promise<string> => {
  const roomId = 'dm_' + [myUid, otherUid].sort().join('_');
  const roomRef = doc(db, 'chats', roomId);
  const snap = await getDoc(roomRef);
  if (!snap.exists()) {
    await setDoc(roomRef, {
      room_id: roomId,
      room_type: 'dm',
      members: [myUid, otherUid],
      last_message: '',
      last_message_at: serverTimestamp(),
    });
  }
  return roomId;
};

export const sendMessage = async (roomId: string, senderId: string, text: string): Promise<void> => {
  const trimmed = text.trim();
  await addDoc(collection(db, 'chats', roomId, 'messages'), {
    sender_id: senderId,
    text: trimmed,
    timestamp: serverTimestamp(),
  });
  await setDoc(
    doc(db, 'chats', roomId),
    { last_message: trimmed, last_message_at: serverTimestamp() },
    { merge: true }
  );
};

export const subscribeToMessages = (
  roomId: string,
  cb: (msgs: Message[]) => void
): (() => void) => {
  const q = query(
    collection(db, 'chats', roomId, 'messages'),
    orderBy('timestamp', 'asc')
  );
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message)))
  );
};

export const subscribeToRooms = (
  uid: string,
  cb: (rooms: ChatRoom[]) => void
): (() => void) => {
  const q = query(collection(db, 'chats'), where('members', 'array-contains', uid));
  return onSnapshot(q, (snap) => {
    const rooms = snap.docs
      .map((d) => ({ room_id: d.id, ...d.data() } as ChatRoom))
      .sort((a, b) => (b.last_message_at?.seconds ?? 0) - (a.last_message_at?.seconds ?? 0));
    cb(rooms);
  });
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return { uid, nickname: data.nickname ?? '알 수 없음', profile_img: data.profile_img ?? '' };
};

const HIGH_SUFFIX = '';

export const searchUsers = async (nickname: string, myUid: string): Promise<UserProfile[]> => {
  if (!nickname.trim()) return [];
  const q = query(
    collection(db, 'users'),
    where('nickname', '>=', nickname),
    where('nickname', '<=', nickname + HIGH_SUFFIX)
  );
  const snap = await getDocs(q);
  return snap.docs
    .filter((d) => d.id !== myUid)
    .map((d) => {
      const data = d.data();
      return { uid: d.id, nickname: data.nickname ?? '', profile_img: data.profile_img ?? '' };
    });
};
