// 경로: app/_layout.tsx
import { Stack, useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { auth } from '../src/firebaseConfig'; // Firebase 설정 불러오기

export default function RootLayout() {
  const segments = useSegments();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // 🛡️ 실시간 로그인 상태 감시
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const inAuthGroup = segments[0] === '(tabs)';

      if (!user && inAuthGroup) {
        // 로그인 안 됐는데 메인탭에 있으면 로그인으로 강제 이동
        router.replace('/login');
      } else if (user && segments[0] === 'login') {
        // 로그인 됐는데 로그인 페이지에 있으면 메인탭으로 이동
        router.replace('/(tabs)');
      }
      setIsReady(true);
    });

    return unsubscribe;
  }, [segments, auth]);

  // 로딩 중일 때 스피너 표시 (하얀 화면 방지)
  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2f95dc" />
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