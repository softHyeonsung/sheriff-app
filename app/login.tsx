import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { login } from '../src/api/auth';
import { KAKAO_REST_API_KEY, loginWithKakao } from '../src/api/kakaoAuth';
import KakaoIcon from '../src/components/KakaoIcon';
import ShieldIcon from '../src/components/ShieldIcon';
import { useAuthStore } from '../src/store/authStore';

// 카카오 OAuth → Firebase Hosting 중계 → sheriffapp:// 딥링크
const KAKAO_REDIRECT_URI = 'https://sheriff-app-dab41.web.app/kakao';

export default function LoginScreen() {
  const router       = useRouter();
  const setKakaoUser = useAuthStore((s) => s.setKakaoUser);
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);

  // ── 이메일 로그인 ──────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('오류', '이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (err: any) {
      const code = err?.code ?? '';
      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/user-not-found' ||
        code === 'auth/wrong-password'
      ) {
        Alert.alert('로그인 실패', '이메일 또는 비밀번호가 올바르지 않아요.');
      } else if (code === 'auth/too-many-requests') {
        Alert.alert('로그인 실패', '잠시 후 다시 시도해주세요.');
      } else {
        Alert.alert('로그인 실패', err?.message ?? '알 수 없는 오류');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── 카카오 로그인 ──────────────────────────────────────────────────────────
  const handleKakaoLogin = async () => {
    if (!KAKAO_REST_API_KEY || KAKAO_REST_API_KEY === 'YOUR_KAKAO_REST_API_KEY') {
      Alert.alert('설정 오류', '카카오 API 키가 설정되지 않았어요.');
      return;
    }

    const authUrl =
      'https://kauth.kakao.com/oauth/authorize?' +
      new URLSearchParams({
        client_id:     KAKAO_REST_API_KEY,
        redirect_uri:  KAKAO_REDIRECT_URI,
        response_type: 'code',
        scope:         'profile_nickname,profile_image',
      }).toString();

    setLoading(true);
    try {
      // 시스템 브라우저로 카카오 로그인 → Firebase Hosting → sheriffapp://
      const result = await WebBrowser.openAuthSessionAsync(authUrl, 'sheriffapp://');

      if (result.type !== 'success') return;

      const code = new URL(result.url).searchParams.get('code');
      if (!code) throw new Error('인증 코드를 받지 못했어요.');

      const kakaoUser = await loginWithKakao(code, KAKAO_REDIRECT_URI);
      setKakaoUser(kakaoUser);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('카카오 로그인 실패', String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <ShieldIcon size={72} />
          <Text style={styles.appName}>보안관</Text>
          <Text style={styles.tagline}>우리 동네 진짜 이야기</Text>
        </View>

        {/* 이메일 / 비밀번호 */}
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="이메일"
            placeholderTextColor="#9E9E9E"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
          />
          <TextInput
            style={styles.input}
            placeholder="비밀번호"
            placeholderTextColor="#9E9E9E"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.disabledBtn]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.loginBtnText}>{loading ? '로그인 중...' : '로그인'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signupBtn}
            onPress={() => router.push('/signup')}
          >
            <Text style={styles.signupText}>
              계정이 없으신가요? <Text style={styles.signupLink}>회원가입</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* 구분선 */}
        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>소셜 로그인</Text>
          <View style={styles.divider} />
        </View>

        {/* 카카오 */}
        <TouchableOpacity
          style={[styles.kakaoBtn, loading && styles.disabledBtn]}
          onPress={handleKakaoLogin}
          disabled={loading}
        >
          <View style={styles.socialBtnIcon}><KakaoIcon size={22} /></View>
          <Text style={styles.kakaoBtnText}>카카오로 계속하기</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FFFFFF' },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 48,
    backgroundColor: '#FFFFFF',
  },
  hero: { alignItems: 'center', marginBottom: 40 },
  appName: {
    fontSize: 32,
    fontFamily: 'AppleSDGothicNeo-Heavy',
    color: '#1A1108',
    marginTop: 12,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#6B6B6B',
    marginTop: 6,
  },
  form: { marginBottom: 8 },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#D4D4D4',
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#F5F5F5',
    color: '#1A1108',
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-Regular',
  },
  loginBtn: {
    height: 52,
    backgroundColor: '#FFAC30',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#1A1108',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  loginBtnText: {
    color: '#1A1108',
    fontSize: 16,
    fontFamily: 'AppleSDGothicNeo-Bold',
  },
  signupBtn: { marginTop: 16, alignItems: 'center', paddingVertical: 4 },
  signupText: {
    color: '#1A1108',
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Regular',
  },
  signupLink: {
    color: '#FFAC30',
    fontFamily: 'AppleSDGothicNeo-SemiBold',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: { flex: 1, height: 1, backgroundColor: '#D4D4D4' },
  dividerText: {
    marginHorizontal: 12,
    color: '#9E9E9E',
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Regular',
  },
  kakaoBtn: {
    height: 52,
    backgroundColor: '#FEE500',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  socialBtnIcon: { width: 28, alignItems: 'flex-start', justifyContent: 'center' },
  kakaoBtnText: {
    flex: 1,
    textAlign: 'center',
    color: '#3C1E1E',
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    marginRight: 28,
  },
  disabledBtn: { opacity: 0.5 },
});
