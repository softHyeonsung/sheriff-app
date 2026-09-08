import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

export interface UserProfile {
  uid: string;
  nickname: string;
  profile_img: string;
  sheriff_score: number;
  badge_list: string[];
  saved_places: string[];
  followers: string[];
  following: string[];
  blocked_users: string[];
  rank_level: string;
  is_home_verified: boolean;
  home_address?: string;
}

export interface LeaderboardEntry {
  uid: string;
  nickname: string;
  sheriff_score: number;
  rank_level: string;
}

export async function fetchMyProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    uid: snap.id,
    nickname: d.nickname ?? '',
    profile_img: d.profile_img ?? '',
    sheriff_score: d.sheriff_score ?? 0,
    badge_list: d.badge_list ?? [],
    saved_places: d.saved_places ?? [],
    followers: d.followers ?? [],
    following: d.following ?? [],
    blocked_users: d.blocked_users ?? [],
    rank_level: d.rank_level ?? 'rookie',
    is_home_verified: d.is_home_verified ?? false,
    home_address: d.home_address ?? undefined,
  };
}

export interface FollowUserProfile {
  uid: string;
  nickname: string;
  sheriff_score: number;
}

async function fetchProfilesByUids(uids: string[]): Promise<FollowUserProfile[]> {
  if (uids.length === 0) return [];
  const profiles = await Promise.all(
    uids.map(async (uid) => {
      const snap = await getDoc(doc(db, 'users', uid));
      if (!snap.exists()) return null;
      const d = snap.data();
      return { uid, nickname: d.nickname ?? uid, sheriff_score: d.sheriff_score ?? 0 };
    })
  );
  return profiles.filter(Boolean) as FollowUserProfile[];
}

export async function fetchFollowers(uid: string): Promise<FollowUserProfile[]> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return [];
  const uids: string[] = snap.data().followers ?? [];
  return fetchProfilesByUids(uids);
}

export async function fetchFollowing(uid: string): Promise<FollowUserProfile[]> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return [];
  const uids: string[] = snap.data().following ?? [];
  return fetchProfilesByUids(uids);
}

export async function followUser(myUid: string, targetUid: string): Promise<void> {
  await updateDoc(doc(db, 'users', myUid), { following: arrayUnion(targetUid) });
  await updateDoc(doc(db, 'users', targetUid), { followers: arrayUnion(myUid) });
}

export async function unfollowUser(myUid: string, targetUid: string): Promise<void> {
  await updateDoc(doc(db, 'users', myUid), { following: arrayRemove(targetUid) });
  await updateDoc(doc(db, 'users', targetUid), { followers: arrayRemove(myUid) });
}

export async function blockUser(myUid: string, targetUid: string): Promise<void> {
  await updateDoc(doc(db, 'users', myUid), { blocked_users: arrayUnion(targetUid) });
}

export async function unblockUser(myUid: string, targetUid: string): Promise<void> {
  await updateDoc(doc(db, 'users', myUid), { blocked_users: arrayRemove(targetUid) });
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const q = query(
    collection(db, 'users'),
    orderBy('sheriff_score', 'desc'),
    limit(10)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      uid: d.id,
      nickname: data.nickname ?? '',
      sheriff_score: data.sheriff_score ?? 0,
      rank_level: data.rank_level ?? 'rookie',
    };
  });
}
