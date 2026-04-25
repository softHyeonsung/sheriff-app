// src/api/savedPosts.ts
// Firestore persistence for bookmarked posts.
// Subcollection: users/{uid}/savedPosts/{postId}

import { collection, deleteDoc, doc, getDocs, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const savedPostsCol = (uid: string) => collection(db, 'users', uid, 'savedPosts');
const savedPostDoc  = (uid: string, postId: string) => doc(db, 'users', uid, 'savedPosts', postId);

export const loadSavedPosts = async (uid: string): Promise<string[]> => {
  const snap = await getDocs(savedPostsCol(uid));
  return snap.docs.map((d) => d.id);
};

export const savePostToFirestore = async (uid: string, postId: string): Promise<void> => {
  await setDoc(savedPostDoc(uid, postId), { postId, savedAt: Timestamp.now() });
};

export const unsavePostFromFirestore = async (uid: string, postId: string): Promise<void> => {
  await deleteDoc(savedPostDoc(uid, postId));
};
