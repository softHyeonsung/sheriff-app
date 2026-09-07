import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
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
import { login, loginWithApple, loginWithGoogle } from '../src/api/auth';
import { KAKAO_REST_API_KEY, loginWithKakao } from '../src/api/kakaoAuth';
import { hasAgreedTermsLocally, markTermsAgreedLocally } from '../src/api/termsConsent';
import GoogleIcon from '../src/components/GoogleIcon';
import KakaoIcon from '../src/components/KakaoIcon';
import ShieldIcon from '../src/components/ShieldIcon';
import TermsAgreementSection, { TermsAgreementValues, isAllRequiredAgreed } from '../src/components/TermsAgreementSection';
import { useAuthStore } from '../src/store/authStore';

const KAKAO_REDIRECT_URI  = 'https://sheriff-app-dab41.web.app/kakao';
const GOOGLE_REDIRECT_URI = 'https://sheriff-app-dab41.web.app/google';
const GOOGLE_WEB_CLIENT_ID = '847237699912-bebdqk9u4eqf9188eu3bt9tppt3e1aqr.apps.googleusercontent.com';

export default function LoginScreen() {
  const router        = useRouter();
  const setKakaoUser  = useAuthStore((s) => s.setKakaoUser);
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [needsConsent, setNeedsConsent] = useState(false);
  const [terms, setTerms] = useState<TermsAgreementValues>({ terms: false, privacy: false, location: false });

  // 이 기기에서 이미 한 번 동의했으면(가입 여부와 무관하게) 소셜 버튼 매번 체크박스로
  // 막지 않는다 — 서버 측 진짜 신규 가입 동의 기록은 createUserDoc에서 별도로 남긴다.
  React.useEffect(() => {
    hasAgreedTermsLocally().then((agreed) => setNeedsConsent(!agreed));
  }, []);

  const requireConsent = (): boolean => {
    if (!needsConsent) return true;
    if (!isAllRequiredAgreed(terms)) {
      Alert.alert('약관 동의 필요', '처음 로그인하려면 필수 약관에 동의해야 해요.');
      return false;
    }
    return true;
  };

  // ── 이메일 로그인 ────────────────────────────────────────────────────────────
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
        Alert.alert('로그인 실패', '이메일 또는 비밀번호가 올바르지 않아요.\n계정이 없다면 회원가입을 먼저 해주세요.');
      } else if (code === 'auth/too-many-requests') {
        Alert.alert('로그인 실패', '잠시 후 다시 시도해주세요.');
      } else {
        Alert.alert('로그인 실패', err?.message ?? '알 수 없는 오류');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── 카카오 로그인 ────────────────────────────────────────────────────────────
  const handleKakaoLogin = async () => {
    if (!requireConsent()) return;
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
      const result = await WebBrowser.openAuthSessionAsync(authUrl, 'sheriffapp://');
      if (result.type !== 'success') return;

      const code = new URL(result.url).searchParams.get('code');
      if (!code) throw new Error('인증 코드를 받지 못했어요.');

      const kakaoUser = await loginWithKakao(code, KAKAO_REDIRECT_URI, needsConsent);
      setKakaoUser(kakaoUser);
      if (needsConsent) await markTermsAgreedLocally();
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('카카오 로그인 실패', String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  };

  // ── 구글 로그인 ──────────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    if (!requireConsent()) return;
    setLoading(true);
    try {
      // nonce: Google implicit flow에서 id_token 요청 시 필수
      const rawNonce    = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      );

      const authUrl =
        'https://accounts.google.com/o/oauth2/v2/auth?' +
        new URLSearchParams({
          client_id:     GOOGLE_WEB_CLIENT_ID,
          redirect_uri:  GOOGLE_REDIRECT_URI,
          response_type: 'id_token',
          scope:         'openid email profile',
          nonce:         hashedNonce,
        }).toString();

      const result = await WebBrowser.openAuthSessionAsync(authUrl, 'sheriffapp://');
      if (result.type !== 'success') return;

      const idToken = new URL(result.url).searchParams.get('id_token');
      if (!idToken) throw new Error('Google ID 토큰을 받지 못했어요.');

      await loginWithGoogle(idToken, needsConsent);
      if (needsConsent) await markTermsAgreedLocally();
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Google 로그인 실패', String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  };

  // ── 애플 로그인 ──────────────────────────────────────────────────────────────
  const handleAppleLogin = async () => {
    if (!requireConsent()) return;
    setLoading(true);
    try {
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      const rawNonce    = Array.from(randomBytes).map((b) => b.toString(16).padStart(2, '0')).join('');
      const nonce       = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce,
      });
      if (credential.identityToken) {
        await loginWithApple(credential.identityToken, rawNonce, needsConsent);
        if (needsConsent) await markTermsAgreedLocally();
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      if (error.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Apple 로그인 실패', String(error));
      }
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
            placeholderTextColor="#B89060"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
            accessibilityLabel="이메일 입력"
          />
          <TextInput
            style={styles.input}
            placeholder="비밀번호"
            placeholderTextColor="#B89060"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            accessibilityLabel="비밀번호 입력"
          />

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.disabledBtn]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.loginBtnText}>{loading ? '로그인 중...' : '로그인'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.signupBtn} onPress={() => router.push('/signup')}>
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

        {needsConsent && (
          <>
            <Text style={styles.consentNotice}>처음 로그인하려면 아래 약관에 동의해주세요.</Text>
            <TermsAgreementSection values={terms} onChange={setTerms} />
          </>
        )}

        {/* 소셜 버튼 */}
        <View style={styles.socialGroup}>
          {/* 카카오 */}
          <TouchableOpacity
            style={[styles.socialBtn, styles.kakaoBtn, loading && styles.disabledBtn]}
            onPress={handleKakaoLogin}
            disabled={loading || (needsConsent && !isAllRequiredAgreed(terms))}
          >
            <View style={styles.socialBtnIcon}><KakaoIcon size={22} /></View>
            <Text style={styles.kakaoBtnText}>카카오로 계속하기</Text>
          </TouchableOpacity>

          {/* 구글 */}
          <TouchableOpacity
            style={[styles.socialBtn, styles.googleBtn, loading && styles.disabledBtn]}
            onPress={handleGoogleLogin}
            disabled={loading || (needsConsent && !isAllRequiredAgreed(terms))}
          >
            <View style={styles.socialBtnIcon}><GoogleIcon size={22} /></View>
            <Text style={styles.googleBtnText}>Google로 계속하기</Text>
          </TouchableOpacity>

          {/* 애플 (iOS 전용) */}
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.socialBtn, styles.appleBtn, loading && styles.disabledBtn]}
              onPress={handleAppleLogin}
              disabled={loading || (needsConsent && !isAllRequiredAgreed(terms))}
            >
              <View style={styles.socialBtnIcon}>
                <Ionicons name="logo-apple" size={22} color="#FFFFFF" />
              </View>
              <Text style={styles.appleBtnText}>Apple로 계속하기</Text>
            </TouchableOpacity>
          )}
        </View>
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
    color: '#7A5C38',
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
  consentNotice: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#7A5C38',
    marginBottom: 8,
  },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  divider: { flex: 1, height: 1, backgroundColor: '#D4D4D4' },
  dividerText: {
    marginHorizontal: 12,
    color: '#B89060',
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Regular',
  },
  socialGroup: { gap: 10 },
  socialBtn: {
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  socialBtnIcon: { width: 28, alignItems: 'flex-start', justifyContent: 'center' },
  disabledBtn: { opacity: 0.5 },
  kakaoBtn: { backgroundColor: '#FEE500' },
  kakaoBtnText: {
    flex: 1,
    textAlign: 'center',
    color: '#3C1E1E',
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    marginRight: 28,
  },
  googleBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4D4D4',
  },
  googleBtnText: {
    flex: 1,
    textAlign: 'center',
    color: '#1A1108',
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    marginRight: 28,
  },
  appleBtn: { backgroundColor: '#000000' },
  appleBtnText: {
    flex: 1,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    marginRight: 28,
  },
});
