// 경로: app/_layout.tsx
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { getPersistedKakaoSession } from '../src/api/kakaoAuth';
import { auth } from '../src/firebaseConfig';
import { useAuthStore } from '../src/store/authStore';

export default function RootLayout() {
  const segments = useSegments();
  const router   = useRouter();
  const [isReady, setIsReady] = useState(false);

  const setUser      = useAuthStore((state) => state.setUser);
  const setKakaoUser = useAuthStore((state) => state.setKakaoUser);
  const isLoggedIn   = useAuthStore((state) => state.isLoggedIn);
  // Subscribe so the navigation guard re-runs when either auth source changes
  const firebaseUser = useAuthStore((state) => state.user);
  const kakaoUser    = useAuthStore((state) => state.kakaoUser);

  const [fontsLoaded] = useFonts({
    'AppleSDGothicNeo-Regular':  require('../assets/fonts/Apple_산돌고딕_Neo/AppleSDGothicNeoR.ttf'),
    'AppleSDGothicNeo-Medium':   require('../assets/fonts/Apple_산돌고딕_Neo/AppleSDGothicNeoM.ttf'),
    'AppleSDGothicNeo-SemiBold': require('../assets/fonts/Apple_산돌고딕_Neo/AppleSDGothicNeoSB.ttf'),
    'AppleSDGothicNeo-Bold':     require('../assets/fonts/Apple_산돌고딕_Neo/AppleSDGothicNeoB.ttf'),
    'AppleSDGothicNeo-Heavy':    require('../assets/fonts/Apple_산돌고딕_Neo/AppleSDGothicNeoH.ttf'),
  });

  // Gate isReady on BOTH Firebase auth AND Kakao session restore.
  // If Firebase fires before AsyncStorage resolves (common), the guard would
  // wrongly kick a Kakao user to /login — so we wait for both before rendering.
  useEffect(() => {
    let kakaoResolved   = false;
    let firebaseResolved = false;

    const trySetReady = () => {
      if (kakaoResolved && firebaseResolved) setIsReady(true);
    };

    // 1. Restore persisted Kakao session
    getPersistedKakaoSession()
      .then((stored) => { if (stored) setKakaoUser(stored); })
      .catch((e) => console.warn('[auth] Kakao session restore failed:', e))
      .finally(() => { kakaoResolved = true; trySetReady(); });

    // 2. Firebase auth state (email / Google / Apple)
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      firebaseResolved = true;
      trySetReady();
    });

    return unsubscribe;
  }, []);

  // Navigation guard — runs once both auth sources are resolved, and again
  // whenever auth state changes (login, logout, token expiry).
  useEffect(() => {
    if (!isReady) return;
    const inAuthGroup    = segments[0] === '(tabs)';
    const inPublicScreen = segments[0] === 'login' || segments[0] === 'signup';

    if (!isLoggedIn() && inAuthGroup) {
      router.replace('/login');
    } else if (isLoggedIn() && inPublicScreen) {
      router.replace('/(tabs)');
    }
  }, [isReady, firebaseUser, kakaoUser, segments]);

  // 폰트 로딩 + 인증 상태 확인이 모두 완료될 때까지 스피너 표시
  if (!isReady || !fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F0F0' }}>
        <ActivityIndicator size="large" color="#FFAC30" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="signup" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}