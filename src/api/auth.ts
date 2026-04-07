// src/api/auth.ts
import {
    GoogleAuthProvider,
    OAuthProvider,
    createUserWithEmailAndPassword,
    signInWithCredential,
    signInWithCustomToken,
    signInWithEmailAndPassword,
    signOut
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { AuthProvider } from '../types/user';

// Firestore 유저 문서 생성 헬퍼 (소셜 로그인에서도 재사용)
const createUserDoc = async (uid: string, email: string, provider: AuthProvider) => {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    uid,
    email,
    nickname: email.split('@')[0],
    provider,
    profile_img: '',
    points: 0,
    sheriff_score: 0,
    badge_list: [],
    saved_places: [],
    followers: [],
    following: [],
    rank_level: 'rookie',
    is_home_verified: false,
    createdAt: serverTimestamp(),
  }, { merge: true }); // merge: true → 소셜 재로그인 시 기존 데이터 보존
};

// 1. 회원가입
export const signUp = async (email: string, pass: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    await createUserDoc(userCredential.user.uid, email, 'email');
    return userCredential.user;
  } catch (error: any) {
    throw { code: error.code ?? 'unknown', message: error.message ?? String(error) };
  }
};

// 2. 로그인
export const login = async (email: string, pass: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    return userCredential.user;
  } catch (error: any) {
    throw { code: error.code ?? 'unknown', message: error.message ?? String(error) };
  }
};

// 3. 구글 로그인 (idToken은 OAuth 흐름에서 받음)
export const loginWithGoogle = async (idToken: string) => {
  try {
    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);
    const { uid, email } = userCredential.user;
    await createUserDoc(uid, email ?? '', 'google');
    return userCredential.user;
  } catch (error: any) {
    throw { code: error.code ?? 'unknown', message: error.message ?? String(error) };
  }
};

// 4. 애플 로그인
export const loginWithApple = async (identityToken: string, rawNonce: string) => {
  try {
    const provider = new OAuthProvider('apple.com');
    const credential = provider.credential({ idToken: identityToken, rawNonce });
    const userCredential = await signInWithCredential(auth, credential);
    const { uid, email } = userCredential.user;
    await createUserDoc(uid, email ?? '', 'apple');
    return userCredential.user;
  } catch (error: any) {
    throw { code: error.code ?? 'unknown', message: error.message ?? String(error) };
  }
};

// 5. 카카오 로그인 (Firebase Custom Token — Cloud Function에서 발급)
export const loginWithKakaoCustomToken = async (customToken: string) => {
  try {
    const userCredential = await signInWithCustomToken(auth, customToken);
    const { uid, email } = userCredential.user;
    await createUserDoc(uid, email ?? '', 'kakao');
    return userCredential.user;
  } catch (error: any) {
    throw { code: error.code ?? 'unknown', message: error.message ?? String(error) };
  }
};

// 6. 로그아웃
export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error: any) {
    console.error(error);
  }
};