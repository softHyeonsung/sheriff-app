// 기기 단위 약관 동의 여부 로컬 저장 — 같은 기기에서 매번 재동의를 요구하지 않기 위함.
// 서버 측 진짜 기록은 Firestore users/{uid}.terms_agreed_at (신규 가입 시 1회 기록)이 원본이며,
// 이 값은 UX용 캐시일 뿐이다.
import * as SecureStore from 'expo-secure-store';

const TERMS_AGREED_KEY = 'terms_agreed_locally';

export const hasAgreedTermsLocally = async (): Promise<boolean> => {
  try {
    return (await SecureStore.getItemAsync(TERMS_AGREED_KEY)) === 'true';
  } catch {
    return false;
  }
};

export const markTermsAgreedLocally = async (): Promise<void> => {
  await SecureStore.setItemAsync(TERMS_AGREED_KEY, 'true');
};
