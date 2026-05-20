// src/api/kakaoAuth.ts
// Kakao OAuth — authorization code → Kakao access token → Firebase Custom Token
// → signInWithCustomToken (gives real Firebase Auth session for Firestore rules)

import * as SecureStore from 'expo-secure-store';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { app } from '../firebaseConfig';

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

// Step 1: Exchange authorization code → Kakao access token
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

// Step 3: Send Kakao access token to Cloud Function → get Firebase Custom Token
// → signInWithCustomToken so Firestore rules see a real request.auth.uid
const getFirebaseCustomToken = async (accessToken: string): Promise<void> => {
  const functions = getFunctions(app, 'asia-northeast3');
  const kakaoCustomToken = httpsCallable<{ accessToken: string }, { customToken: string }>(
    functions,
    'kakaoCustomToken',
  );
  const result = await kakaoCustomToken({ accessToken });
  const auth = getAuth(app);
  await signInWithCustomToken(auth, result.data.customToken);
};

// Session persistence — OS keychain/keystore via SecureStore (not AsyncStorage)
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

// Convenience: code → Kakao user → Firebase Auth → persist session
export const loginWithKakao = async (
  code: string,
  redirectUri: string,
): Promise<KakaoUser> => {
  const accessToken = await exchangeKakaoCode(code, redirectUri);
  const kakaoUser   = await getKakaoUserInfo(accessToken);
  // Cloud Function이 Firestore upsert + Custom Token 발급을 모두 처리함
  await getFirebaseCustomToken(accessToken);
  await persistKakaoSession(kakaoUser);
  return kakaoUser;
};
