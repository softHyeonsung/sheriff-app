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
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { AuthProvider } from '../types/user';

// Firestore 유저 문서 생성 헬퍼 (소셜 로그인에서도 재사용)
// New users get a full document with createdAt.
// Existing users only update mutable fields — createdAt is never overwritten.
// opts.agreedToTerms: 신규 가입 시 필수 약관(이용약관/개인정보처리방침/위치정보 수집·이용) 동의 여부.
// 미동의 상태로는 계정을 생성하지 않는다 (원스토어 상품 검증 — 위치정보 고지·동의 절차 요건).
const createUserDoc = async (
  uid: string,
  email: string,
  provider: AuthProvider,
  opts: { nickname?: string; agreedToTerms?: boolean } = {},
) => {
  const { nickname, agreedToTerms } = opts;
  const userRef = doc(db, 'users', uid);
  const snap    = await getDoc(userRef);

  if (snap.exists()) {
    // Re-login: update only fields that may change between sessions
    await setDoc(userRef, { email, provider }, { merge: true });
  } else {
    if (!agreedToTerms) {
      throw { code: 'terms/not-agreed', message: '약관에 동의해야 가입할 수 있어요.' };
    }
    // First sign-up: write full document
    await setDoc(userRef, {
      uid,
      email,
      nickname: nickname ?? email.split('@')[0],
      provider,
      profile_img: '',
      points: 0,
      sheriff_score: 0,
      badge_list: [],
      saved_places: [],
      followers: [],
      following: [],
      blocked_users: [],
      rank_level: 'rookie',
      is_home_verified: false,
      profile_complete: false,
      terms_agreed_at: serverTimestamp(),
      location_consent: true,
      createdAt: serverTimestamp(),
    });
  }
};

// 1. 회원가입
export const signUp = async (email: string, pass: string, nickname?: string, agreedToTerms?: boolean) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    await createUserDoc(userCredential.user.uid, email, 'email', { nickname, agreedToTerms });
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
export const loginWithGoogle = async (idToken: string, agreedToTerms?: boolean) => {
  try {
    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);
    const { uid, email } = userCredential.user;
    await createUserDoc(uid, email ?? '', 'google', { agreedToTerms });
    return userCredential.user;
  } catch (error: any) {
    throw { code: error.code ?? 'unknown', message: error.message ?? String(error) };
  }
};

// 4. 애플 로그인
export const loginWithApple = async (identityToken: string, rawNonce: string, agreedToTerms?: boolean) => {
  try {
    const provider = new OAuthProvider('apple.com');
    const credential = provider.credential({ idToken: identityToken, rawNonce });
    const userCredential = await signInWithCredential(auth, credential);
    const { uid, email } = userCredential.user;
    await createUserDoc(uid, email ?? '', 'apple', { agreedToTerms });
    return userCredential.user;
  } catch (error: any) {
    throw { code: error.code ?? 'unknown', message: error.message ?? String(error) };
  }
};

// 5. 카카오 로그인 (Firebase Custom Token — Cloud Function에서 발급)
export const loginWithKakaoCustomToken = async (customToken: string, agreedToTerms?: boolean) => {
  try {
    const userCredential = await signInWithCustomToken(auth, customToken);
    const { uid, email } = userCredential.user;
    await createUserDoc(uid, email ?? '', 'kakao', { agreedToTerms });
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