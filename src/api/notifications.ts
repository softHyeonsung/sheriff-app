import {
  Timestamp,
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

export type NotificationType = 'join_request' | 'join_approved' | 'join_rejected' | 'comment';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  related_id: string;
  read: boolean;
  created_at: Timestamp | null;
}

const notifCol = (uid: string) => collection(db, 'users', uid, 'notifications');

async function createNotification(
  uid: string,
  type: NotificationType,
  title: string,
  body: string,
  relatedId: string,
): Promise<void> {
  await addDoc(notifCol(uid), {
    type,
    title,
    body,
    related_id: relatedId,
    read: false,
    created_at: serverTimestamp(),
  }).catch(() => {});
}

export function subscribeNotifications(
  uid: string,
  callback: (notifs: AppNotification[]) => void,
): () => void {
  const q = query(notifCol(uid), orderBy('created_at', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        type: (data.type ?? 'comment') as NotificationType,
        title: data.title ?? '',
        body: data.body ?? '',
        related_id: data.related_id ?? '',
        read: data.read ?? false,
        created_at: data.created_at ?? null,
      };
    }));
  }, () => callback([]));
}

export async function markNotificationRead(uid: string, notifId: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'notifications', notifId), { read: true }).catch(() => {});
}

export async function notifyJoinRequest(
  hostUid: string,
  requesterNickname: string,
  gatheringTitle: string,
  gatheringId: string,
): Promise<void> {
  await createNotification(
    hostUid,
    'join_request',
    '새 참여 신청',
    `${requesterNickname}님이 "${gatheringTitle}" 모임에 참여 신청했어요`,
    gatheringId,
  );
}

export async function notifyJoinApproved(
  requesterUid: string,
  gatheringTitle: string,
  gatheringId: string,
): Promise<void> {
  await createNotification(
    requesterUid,
    'join_approved',
    '참여 승인',
    `"${gatheringTitle}" 모임 참여가 승인됐어요 🎉`,
    gatheringId,
  );
}

export async function notifyJoinRejected(
  requesterUid: string,
  gatheringTitle: string,
  reason: string,
  gatheringId: string,
): Promise<void> {
  await createNotification(
    requesterUid,
    'join_rejected',
    '참여 거절',
    `"${gatheringTitle}" 모임 참여가 거절됐어요${reason ? `: ${reason}` : ''}`,
    gatheringId,
  );
}

export async function notifyComment(
  authorUid: string,
  commenterNickname: string,
  postId: string,
): Promise<void> {
  await createNotification(
    authorUid,
    'comment',
    '새 댓글',
    `${commenterNickname}님이 게시물에 댓글을 달았어요`,
    postId,
  );
}
