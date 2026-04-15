// src/api/kakaoAuth.ts
// Kakao OAuth — client-side token exchange (no Cloud Function needed)
// Uses REST API 키 (different from JavaScript 키 used for the map)

import * as SecureStore from 'expo-secure-store';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const KAKAO_SESSION_KEY = 'kakao_session';

// Read from EXPO_PUBLIC_KAKAO_REST_API_KEY in .env (never commit the key to git)
export const KAKAO_REST_API_KEY =
  process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY ?? 'YOUR_KAKAO_REST_API_KEY';

export interface KakaoUser {
  id: string;
  nickname: string;
  email: string | null;
  profileImage: string;
  accessToken: string;
}

// Step 1: Exchange authorization code → access token
export const exchangeKakaoCode = async (
  code: string,
  redirectUri: string,
): Promise<string> => {
  const res = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams({
      grant_type:   'authorization_code',
      client_id:    KAKAO_REST_API_KEY,
      redirect_uri: redirectUri,
      code,
    }).toString(),
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error(data.error_description ?? '카카오 토큰 발급 실패');
  }
  return data.access_token as string;
};

// Step 2: Get Kakao user profile with access token
export const getKakaoUserInfo = async (accessToken: string): Promise<KakaoUser> => {
  const res = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      'Content-type': 'application/x-www-form-urlencoded;charset=utf-8',
    },
  });

  const data = await res.json();
  if (!data.id) throw new Error('카카오 사용자 정보를 가져올 수 없어요.');

  return {
    id:           String(data.id),
    nickname:     data.kakao_account?.profile?.nickname          ?? '카카오 사용자',
    email:        data.kakao_account?.email                      ?? null,
    profileImage: data.kakao_account?.profile?.profile_image_url ?? '',
    accessToken,
  };
};

// Step 3: Save Kakao user to Firestore (using Kakao ID as document key)
// New users get a full document with createdAt.
// Existing users only update mutable fields — createdAt is never overwritten.
export const saveKakaoUserToFirestore = async (kakaoUser: KakaoUser): Promise<void> => {
  const userRef = doc(db, 'users', `kakao_${kakaoUser.id}`);
  const snap    = await getDoc(userRef);

  if (snap.exists()) {
    await setDoc(
      userRef,
      { nickname: kakaoUser.nickname, email: kakaoUser.email ?? '', profile_img: kakaoUser.profileImage },
      { merge: true },
    );
  } else {
    await setDoc(userRef, {
      uid:              `kakao_${kakaoUser.id}`,
      nickname:         kakaoUser.nickname,
      email:            kakaoUser.email ?? '',
      provider:         'kakao',
      profile_img:      kakaoUser.profileImage,
      points:           0,
      sheriff_score:    0,
      badge_list:       [],
      saved_places:     [],
      followers:        [],
      following:        [],
      rank_level:       'rookie',
      is_home_verified: false,
      createdAt:        serverTimestamp(),
    });
  }
};

// Session persistence helpers — uses SecureStore (OS keychain/keystore, encrypted)
// instead of AsyncStorage so the access token isn't readable on rooted devices.
export const persistKakaoSession = async (user: KakaoUser): Promise<void> => {
  await SecureStore.setItemAsync(KAKAO_SESSION_KEY, JSON.stringify(user));
};

export const getPersistedKakaoSession = async (): Promise<KakaoUser | null> => {
  try {
    const stored = await SecureStore.getItemAsync(KAKAO_SESSION_KEY);
    return stored ? (JSON.parse(stored) as KakaoUser) : null;
  } catch {
    return null;
  }
};

export const clearKakaoSession = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(KAKAO_SESSION_KEY);
};

// Convenience: exchange code → get user info → save to Firestore → persist session
export const loginWithKakao = async (
  code: string,
  redirectUri: string,
): Promise<KakaoUser> => {
  const accessToken = await exchangeKakaoCode(code, redirectUri);
  const kakaoUser   = await getKakaoUserInfo(accessToken);
  await saveKakaoUserToFirestore(kakaoUser);
  await persistKakaoSession(kakaoUser);
  return kakaoUser;
};
