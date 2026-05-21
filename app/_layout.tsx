import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { getPersistedKakaoSession } from '../src/api/kakaoAuth';
import { auth, db } from '../src/firebaseConfig';
import { useAuthStore } from '../src/store/authStore';

export default function RootLayout() {
  const segments = useSegments();
  const router   = useRouter();

  const setUser           = useAuthStore((s) => s.setUser);
  const setKakaoUser      = useAuthStore((s) => s.setKakaoUser);
  const setProfileComplete = useAuthStore((s) => s.setProfileComplete);
  const isLoggedIn        = useAuthStore((s) => s.isLoggedIn);
  const firebaseUser      = useAuthStore((s) => s.user);
  const kakaoUser         = useAuthStore((s) => s.kakaoUser);
  const profileComplete   = useAuthStore((s) => s.profileComplete);

  const [fontsLoaded] = useFonts({
    'AppleSDGothicNeo-Regular':  require('../assets/fonts/Apple_산돌고딕_Neo/AppleSDGothicNeoR.ttf'),
    'AppleSDGothicNeo-Medium':   require('../assets/fonts/Apple_산돌고딕_Neo/AppleSDGothicNeoM.ttf'),
    'AppleSDGothicNeo-SemiBold': require('../assets/fonts/Apple_산돌고딕_Neo/AppleSDGothicNeoSB.ttf'),
    'AppleSDGothicNeo-Bold':     require('../assets/fonts/Apple_산돌고딕_Neo/AppleSDGothicNeoB.ttf'),
    'AppleSDGothicNeo-Heavy':    require('../assets/fonts/Apple_산돌고딕_Neo/AppleSDGothicNeoH.ttf'),
  });

  // 1. Firebase + Kakao 세션 복원
  useEffect(() => {
    getPersistedKakaoSession()
      .then((stored) => { if (stored) setKakaoUser(stored); })
      .catch((e) => console.warn('[auth] Kakao session restore failed:', e));

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });

    return unsubscribe;
  }, []);

  // 2. 로그인 확정 시 profile_complete 조회
  //    firebaseUser / kakaoUser 중 하나라도 바뀌면 재조회
  useEffect(() => {
    if (!isLoggedIn()) {
      // 비로그인 상태 → profileComplete false로 확정 (가드가 login으로 보냄)
      setProfileComplete(false);
      return;
    }
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    getDoc(doc(db, 'users', uid))
      .then((snap) => setProfileComplete(snap.data()?.profile_complete ?? false))
      .catch(() => setProfileComplete(false));
  }, [firebaseUser, kakaoUser]);

  // profileComplete가 null이 아닌 시점 = auth + profile 체크 모두 완료
  const isReady = profileComplete !== null && fontsLoaded;

  // 3. 네비게이션 가드
  useEffect(() => {
    if (!isReady) return;

    const seg            = segments[0] as string;
    const inTabs         = seg === '(tabs)';
    const inPublic       = seg === 'login' || seg === 'signup';
    const inProfileSetup = seg === 'profile-setup';
    const loggedIn       = isLoggedIn();

    if (!loggedIn && inTabs) {
      router.replace('/login');
    } else if (loggedIn && inPublic) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace((profileComplete ? '/(tabs)' : '/profile-setup') as any);
    } else if (loggedIn && !profileComplete && !inProfileSetup) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace('/profile-setup' as any);
    } else if (loggedIn && profileComplete && inProfileSetup) {
      router.replace('/(tabs)');
    }
  }, [isReady, firebaseUser, kakaoUser, profileComplete, segments]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#FFAC30" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login"         options={{ headerShown: false }} />
      <Stack.Screen name="signup"        options={{ headerShown: false }} />
      <Stack.Screen name="profile-setup" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)"        options={{ headerShown: false }} />
    </Stack>
  );
}
