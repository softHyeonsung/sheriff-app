import {
  Timestamp,
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import {
  notifyJoinApproved,
  notifyJoinRejected,
  notifyJoinRequest,
} from './notifications';
import { addScore, checkAndAwardBadge } from './scoring';

export interface GatheringParticipant {
  uid: string;
  nickname: string;
}

export interface GatheringRequest {
  uid: string;
  nickname: string;
  requested_at: string;
}

export interface FirestoreGathering {
  id: string;
  host_id: string;
  host_nickname: string;
  host_is_sheriff: boolean;
  type: 'regular' | 'flash';
  deadline_ms?: number;
  title: string;
  description: string;
  category: string;
  location: { name: string; lat: number; lng: number };
  tags: string[];
  max_members: number;
  participants: GatheringParticipant[];
  pending_requests: GatheringRequest[];
  rejections: Record<string, string>;
  meeting_at: string;
  status: 'recruiting' | 'full' | 'completed' | 'cancelled';
  has_chat_room: boolean;
  created_at: Timestamp | null;
}

const DEADLINE_HOURS: Record<string, number> = {
  '1시간 후': 1,
  '2시간 후': 2,
  '3시간 후': 3,
  '6시간 후': 6,
};

function mapGathering(id: string, data: ReturnType<typeof Object.create>): FirestoreGathering {
  return {
    id,
    host_id: data.host_id ?? '',
    host_nickname: data.host_nickname ?? '',
    host_is_sheriff: data.host_is_sheriff ?? false,
    type: data.type ?? 'regular',
    deadline_ms: data.deadline_ms,
    title: data.title ?? '',
    description: data.description ?? '',
    category: data.category ?? '',
    location: data.location ?? { name: '', lat: 0, lng: 0 },
    tags: data.tags ?? [],
    max_members: data.max_members ?? 4,
    participants: data.participants ?? [],
    pending_requests: data.pending_requests ?? [],
    rejections: data.rejections ?? {},
    meeting_at: data.meeting_at ?? '',
    status: data.status ?? 'recruiting',
    has_chat_room: data.has_chat_room ?? false,
    created_at: data.created_at ?? null,
  };
}

export async function createGathering(params: {
  hostId: string;
  hostNickname: string;
  hostIsSheriff: boolean;
  type: 'regular' | 'flash';
  deadlineLabel?: string;
  title: string;
  description: string;
  category: string;
  locationName: string;
  locationLat: number;
  locationLng: number;
  tags: string[];
  maxMembers: number;
  meetingAt: string;
}): Promise<string> {
  let deadlineMs: number | undefined;
  if (params.type === 'flash' && params.deadlineLabel) {
    const h = DEADLINE_HOURS[params.deadlineLabel];
    deadlineMs = h
      ? Date.now() + h * 3_600_000
      : new Date().setHours(23, 59, 59, 999);
  }

  const docRef = await addDoc(collection(db, 'gatherings'), {
    host_id: params.hostId,
    host_nickname: params.hostNickname,
    host_is_sheriff: params.hostIsSheriff,
    type: params.type,
    ...(deadlineMs !== undefined ? { deadline_ms: deadlineMs } : {}),
    title: params.title,
    description: params.description,
    category: params.category,
    location: {
      name: params.locationName,
      lat: params.locationLat,
      lng: params.locationLng,
    },
    tags: params.tags,
    max_members: params.maxMembers,
    participants: [{ uid: params.hostId, nickname: params.hostNickname }],
    pending_requests: [],
    rejections: {},
    meeting_at: params.meetingAt,
    status: 'recruiting',
    has_chat_room: false,
    created_at: serverTimestamp(),
  });

  await addScore(params.hostId, 20);
  await checkAndAwardBadge(params.hostId, 'gathering_host');

  return docRef.id;
}

export function subscribeGatherings(
  callback: (gatherings: FirestoreGathering[]) => void
): () => void {
  const q = query(collection(db, 'gatherings'), orderBy('created_at', 'desc'));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => mapGathering(d.id, d.data()));
    callback(list);
  }, () => callback([]));
}

export function subscribeGathering(
  gatheringId: string,
  callback: (g: FirestoreGathering | null) => void
): () => void {
  return onSnapshot(doc(db, 'gatherings', gatheringId), (snap) => {
    if (!snap.exists()) { callback(null); return; }
    callback(mapGathering(snap.id, snap.data()));
  }, () => callback(null));
}

export async function requestJoin(
  gatheringId: string,
  uid: string,
  nickname: string
): Promise<void> {
  const ref = doc(db, 'gatherings', gatheringId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  const pending: GatheringRequest[] = data.pending_requests ?? [];
  if (pending.some((r) => r.uid === uid)) return;
  await updateDoc(ref, {
    pending_requests: [...pending, { uid, nickname, requested_at: '방금 전' }],
  });
  await notifyJoinRequest(data.host_id, nickname, data.title, gatheringId);
}

export async function cancelJoin(gatheringId: string, uid: string): Promise<void> {
  const ref = doc(db, 'gatherings', gatheringId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  const pending: GatheringRequest[] = (data.pending_requests ?? []).filter(
    (r: GatheringRequest) => r.uid !== uid
  );
  await updateDoc(ref, { pending_requests: pending });
}

export async function approveJoin(
  gatheringId: string,
  uid: string,
  nickname: string
): Promise<void> {
  const ref = doc(db, 'gatherings', gatheringId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  const pending: GatheringRequest[] = (data.pending_requests ?? []).filter(
    (r: GatheringRequest) => r.uid !== uid
  );
  const participants: GatheringParticipant[] = [...(data.participants ?? [])];
  if (!participants.some((p) => p.uid === uid)) {
    participants.push({ uid, nickname });
  }
  const newStatus = participants.length >= data.max_members ? 'full' : 'recruiting';
  await updateDoc(ref, { pending_requests: pending, participants, status: newStatus });
  const chatRef = doc(db, 'chats', gatheringId);
  const chatSnap = await getDoc(chatRef);
  if (chatSnap.exists()) {
    await updateDoc(chatRef, { members: arrayUnion(uid) }).catch(() => {});
  }
  await addScore(uid, 15);
  await checkAndAwardBadge(uid, 'gathering_member');
  await notifyJoinApproved(uid, data.title, gatheringId);
}

export async function rejectJoin(
  gatheringId: string,
  uid: string,
  reason: string
): Promise<void> {
  const ref = doc(db, 'gatherings', gatheringId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  const pending: GatheringRequest[] = (data.pending_requests ?? []).filter(
    (r: GatheringRequest) => r.uid !== uid
  );
  const rejections = {
    ...(data.rejections ?? {}),
    [uid]: reason || '모임 조건에 맞지 않아요',
  };
  await updateDoc(ref, { pending_requests: pending, rejections });
  await notifyJoinRejected(uid, data.title, reason, gatheringId);
}

export async function completeGathering(
  gatheringId: string,
  hostId: string,
): Promise<void> {
  await updateDoc(doc(db, 'gatherings', gatheringId), { status: 'completed' });
  await addScore(hostId, 10); // +10 모임 실제 완료 (생성자 추가)
}

export async function cancelGathering(
  gatheringId: string,
  hostId: string,
): Promise<void> {
  await updateDoc(doc(db, 'gatherings', gatheringId), { status: 'cancelled' });
  await addScore(hostId, -20); // -20 모임 취소 패널티
}

export async function openChatRoom(gatheringId: string): Promise<void> {
  const gRef = doc(db, 'gatherings', gatheringId);
  const gSnap = await getDoc(gRef);
  const gData = gSnap.exists() ? gSnap.data() : null;
  const memberUids: string[] = gData
    ? [gData.host_id, ...(gData.participants as GatheringParticipant[]).map((p) => p.uid)]
    : [];
  await updateDoc(gRef, { has_chat_room: true });
  await setDoc(
    doc(db, 'chats', gatheringId),
    {
      room_id: gatheringId,
      room_type: 'gathering',
      related_id: gatheringId,
      members: memberUids,
      last_message: '',
      last_message_at: null,
    },
    { merge: true }
  ).catch(() => {});
}
