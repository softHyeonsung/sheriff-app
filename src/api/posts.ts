import {
  Timestamp,
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../firebaseConfig';
import { notifyComment } from './notifications';
import { addScore, checkAndAwardBadge, checkAndIncrementDaily } from './scoring';

export interface FirestorePost {
  id: string;
  author_id: string;
  author_nickname: string;
  author_is_sheriff: boolean;
  type: 'feed' | 'story';
  content: string;
  media_urls: string[];
  location: { name: string };
  location_pin?: {
    id: string;
    place_name: string;
    category_name: string;
    address_name: string;
    road_address_name: string;
    x: string;
    y: string;
  };
  tags: string[];
  likes: string[];
  comment_count: number;
  share_count: number;
  timestamp: Timestamp | null;
}

export interface FirestoreComment {
  id: string;
  author_id: string;
  author_nickname: string;
  author_is_sheriff: boolean;
  text: string;
  timestamp: Timestamp | null;
}

export function formatTimeAgo(ts: Timestamp | null): string {
  if (!ts) return '';
  const diff = Date.now() - ts.seconds * 1000;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

async function uploadImage(localUri: string, postId: string, index: number): Promise<string> {
  const res = await fetch(localUri);
  const blob = await res.blob();
  const storageRef = ref(storage, `posts/${postId}/${index}.jpg`);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

export async function createPost(params: {
  authorId: string;
  authorNickname: string;
  authorIsSheriff: boolean;
  type: 'feed' | 'story';
  content: string;
  localImageUris: string[];
  locationName: string;
  locationPin?: FirestorePost['location_pin'];
  tags: string[];
}): Promise<string> {
  const docRef = await addDoc(collection(db, 'posts'), {
    author_id: params.authorId,
    author_nickname: params.authorNickname,
    author_is_sheriff: params.authorIsSheriff,
    type: params.type,
    content: params.content,
    media_urls: [],
    location: { name: params.locationName },
    location_pin: params.locationPin ?? null,
    tags: params.tags,
    likes: [],
    comment_count: 0,
    share_count: 0,
    timestamp: serverTimestamp(),
  });

  if (params.localImageUris.length > 0) {
    const urls = await Promise.all(
      params.localImageUris.map((uri, i) => uploadImage(uri, docRef.id, i))
    );
    await updateDoc(docRef, { media_urls: urls });
  }

  // +10 게시물 작성 (하루 최대 3회)
  const withinLimit = await checkAndIncrementDaily(params.authorId, 'posts_created', 3);
  if (withinLimit) {
    await addScore(params.authorId, 10);
    if (params.locationPin) {
      await addScore(params.authorId, 5);
    }
  }

  // 첫 게시물 뱃지 (이미 있으면 no-op)
  await checkAndAwardBadge(params.authorId, 'first_post');

  return docRef.id;
}

export function subscribeFeedPosts(
  callback: (posts: FirestorePost[]) => void
): () => void {
  const q = query(collection(db, 'posts'), orderBy('timestamp', 'desc'));
  return onSnapshot(q, (snap) => {
    const posts: FirestorePost[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        author_id: data.author_id ?? '',
        author_nickname: data.author_nickname ?? '',
        author_is_sheriff: data.author_is_sheriff ?? false,
        type: data.type ?? 'feed',
        content: data.content ?? '',
        media_urls: data.media_urls ?? [],
        location: data.location ?? { name: '' },
        location_pin: data.location_pin ?? undefined,
        tags: data.tags ?? [],
        likes: data.likes ?? [],
        comment_count: data.comment_count ?? 0,
        share_count: data.share_count ?? 0,
        timestamp: data.timestamp ?? null,
      };
    });
    callback(posts);
  }, () => callback([]));
}

export async function fetchPostById(postId: string): Promise<FirestorePost | null> {
  const snap = await getDoc(doc(db, 'posts', postId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    author_id: data.author_id ?? '',
    author_nickname: data.author_nickname ?? '',
    author_is_sheriff: data.author_is_sheriff ?? false,
    type: data.type ?? 'feed',
    content: data.content ?? '',
    media_urls: data.media_urls ?? [],
    location: data.location ?? { name: '' },
    location_pin: data.location_pin ?? undefined,
    tags: data.tags ?? [],
    likes: data.likes ?? [],
    comment_count: data.comment_count ?? 0,
    share_count: data.share_count ?? 0,
    timestamp: data.timestamp ?? null,
  };
}

export async function toggleLike(
  postId: string,
  uid: string,
  currentlyLiked: boolean
): Promise<void> {
  const postRef = doc(db, 'posts', postId);
  if (currentlyLiked) {
    await updateDoc(postRef, { likes: arrayRemove(uid) });
  } else {
    await updateDoc(postRef, { likes: arrayUnion(uid) });
    // +2 좋아요 받기 (본인 게시물 제외)
    const snap = await getDoc(postRef).catch(() => null);
    if (snap?.exists()) {
      const authorId: string = snap.data().author_id;
      if (authorId && authorId !== uid) {
        await addScore(authorId, 2);
      }
    }
  }
}

export async function deletePost(postId: string, authorId: string): Promise<void> {
  await deleteDoc(doc(db, 'posts', postId));
  await addScore(authorId, -10); // -10 게시물 삭제 패널티
}

export function subscribeComments(
  postId: string,
  callback: (comments: FirestoreComment[]) => void
): () => void {
  const q = query(
    collection(db, 'posts', postId, 'comments'),
    orderBy('timestamp', 'asc')
  );
  return onSnapshot(q, (snap) => {
    const comments: FirestoreComment[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        author_id: data.author_id ?? '',
        author_nickname: data.author_nickname ?? '',
        author_is_sheriff: data.author_is_sheriff ?? false,
        text: data.text ?? '',
        timestamp: data.timestamp ?? null,
      };
    });
    callback(comments);
  }, () => callback([]));
}

export async function incrementShareCount(postId: string): Promise<void> {
  await updateDoc(doc(db, 'posts', postId), { share_count: increment(1) }).catch(() => {});
}

export async function addComment(
  postId: string,
  authorId: string,
  authorNickname: string,
  authorIsSheriff: boolean,
  text: string,
  postAuthorId: string,
): Promise<void> {
  await addDoc(collection(db, 'posts', postId, 'comments'), {
    author_id: authorId,
    author_nickname: authorNickname,
    author_is_sheriff: authorIsSheriff,
    text,
    timestamp: serverTimestamp(),
  });
  await updateDoc(doc(db, 'posts', postId), {
    comment_count: increment(1),
  }).catch(() => {});

  // +3 댓글 받기 (본인 댓글 제외)
  if (postAuthorId && postAuthorId !== authorId) {
    await addScore(postAuthorId, 3);
    await notifyComment(postAuthorId, authorNickname, postId);
  }
}
