// 경로: app/_layout.tsx
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { auth } from '../src/firebaseConfig';
import { useAuthStore } from '../src/store/authStore';

export default function RootLayout() {
  const segments = useSegments();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const setUser = useAuthStore((state) => state.setUser);

  const [fontsLoaded] = useFonts({
    'AppleSDGothicNeo-Regular':  require('../assets/fonts/Apple_산돌고딕_Neo/AppleSDGothicNeoR.ttf'),
    'AppleSDGothicNeo-Medium':   require('../assets/fonts/Apple_산돌고딕_Neo/AppleSDGothicNeoM.ttf'),
    'AppleSDGothicNeo-SemiBold': require('../assets/fonts/Apple_산돌고딕_Neo/AppleSDGothicNeoSB.ttf'),
    'AppleSDGothicNeo-Bold':     require('../assets/fonts/Apple_산돌고딕_Neo/AppleSDGothicNeoB.ttf'),
    'AppleSDGothicNeo-Heavy':    require('../assets/fonts/Apple_산돌고딕_Neo/AppleSDGothicNeoH.ttf'),
  });

  // ref로 segments를 추적 — onAuthStateChanged 콜백에서 최신 값 참조 (stale closure 방지)
  const segmentsRef = useRef(segments);
  useEffect(() => {
    segmentsRef.current = segments;
  });

  useEffect(() => {
    // 🛡️ 실시간 로그인 상태 감시 — 한 번만 등록, 탭 전환 시 재등록 없음
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);  // Zustand store 업데이트
      const currentSegments = segmentsRef.current;
      const inAuthGroup = currentSegments[0] === '(tabs)';

      if (!user && inAuthGroup) {
        router.replace('/login');
      } else if (user && currentSegments[0] === 'login') {
        router.replace('/(tabs)');
      }
      setIsReady(true);
    });

    return unsubscribe;
  }, []);

  // 폰트 로딩 + 인증 상태 확인이 모두 완료될 때까지 스피너 표시
  if (!isReady || !fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFDF7' }}>
        <ActivityIndicator size="large" color="#FFAC30" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* 로그인 화면 등록 */}
      <Stack.Screen name="login" options={{ headerShown: false }} />
      {/* 메인 탭 그룹 등록 */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}