import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { login, loginWithApple, loginWithGoogle } from '../src/api/auth';
import { KAKAO_REST_API_KEY, loginWithKakao } from '../src/api/kakaoAuth';
import GoogleIcon from '../src/components/GoogleIcon';
import KakaoIcon from '../src/components/KakaoIcon';
import ShieldIcon from '../src/components/ShieldIcon';
import { useAuthStore } from '../src/store/authStore';

WebBrowser.maybeCompleteAuthSession();

// Google 웹 클라이언트 ID — Firebase Console > Authentication > Google > 웹 클라이언트 ID
const GOOGLE_WEB_CLIENT_ID     = '847237699912-bebdqk9u4eqf9188eu3bt9tppt3e1aqr.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID     = '847237699912-q7o4uh29rsjl39i8en10jd00d3ensj89.apps.googleusercontent.com';
const GOOGLE_ANDROID_CLIENT_ID = 'YOUR_GOOGLE_ANDROID_CLIENT_ID';

const kakaoDiscovery = {
  authorizationEndpoint: 'https://kauth.kakao.com/oauth/authorize',
  tokenEndpoint:         'https://kauth.kakao.com/oauth/token',
};

export default function LoginScreen() {
  const router       = useRouter();
  const setKakaoUser = useAuthStore((s) => s.setKakaoUser);
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);

  const kakaoRedirectUri = useMemo(
    () => AuthSession.makeRedirectUri({ scheme: 'sheriffapp' }),
    []
  );

  // Google OAuth
  const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    iosClientId:     GOOGLE_IOS_CLIENT_ID,
    webClientId:     GOOGLE_WEB_CLIENT_ID,
  });

  // Kakao OAuth
  const [kakaoRequest, kakaoResponse, kakaoPromptAsync] = AuthSession.useAuthRequest(
    {
      clientId:    KAKAO_REST_API_KEY,
      redirectUri: kakaoRedirectUri,
      scopes:      ['profile_nickname', 'profile_image', 'account_email'],
    },
    kakaoDiscovery
  );

  // Google 응답 처리
  useEffect(() => {
    if (googleResponse?.type !== 'success') return;
    const { id_token } = googleResponse.params;
    if (!id_token) return;

    setLoading(true);
    loginWithGoogle(id_token)
      .catch((e) => Alert.alert('Google 로그인 실패', e.message))
      .finally(() => setLoading(false));
  }, [googleResponse]);

  // 카카오 응답 처리
  useEffect(() => {
    if (kakaoResponse?.type !== 'success') return;
    const { code } = kakaoResponse.params;
    if (!code) return;

    setLoading(true);
    loginWithKakao(code, kakaoRedirectUri)
      .then((kakaoUser) => {
        setKakaoUser(kakaoUser);
        router.replace('/(tabs)');
      })
      .catch((e) => Alert.alert('카카오 로그인 실패', String(e.message ?? e)))
      .finally(() => setLoading(false));
  }, [kakaoResponse]);

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
      if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        Alert.alert('로그인 실패', '이메일 또는 비밀번호가 올바르지 않아요.\n계정이 없다면 회원가입을 먼저 해주세요.');
      } else if (code === 'auth/too-many-requests') {
        Alert.alert('로그인 실패', '로그인 시도가 너무 많아요. 잠시 후 다시 시도해주세요.');
      } else {
        Alert.alert('로그인 실패', err?.message ?? '알 수 없는 오류가 발생했어요.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    try {
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      const rawNonce    = Array.from(randomBytes).map((b) => b.toString(16).padStart(2, '0')).join('');
      const nonce       = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
      const credential  = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce,
      });
      if (credential.identityToken) {
        await loginWithApple(credential.identityToken, rawNonce);
      }
    } catch (error: any) {
      if (error.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Apple 로그인 실패', String(error));
      }
    }
  };

  const kakaoReady  = !!kakaoRequest  && KAKAO_REST_API_KEY    !== 'YOUR_KAKAO_REST_API_KEY';
  const googleReady = !!googleRequest && !!GOOGLE_WEB_CLIENT_ID;

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

        {/* Email / Password */}
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="이메일"
            placeholderTextColor="#1A1108"
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
            placeholderTextColor="#1A1108"
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
            accessibilityLabel="로그인"
            accessibilityRole="button"
          >
            <Text style={styles.loginBtnText}>{loading ? '로그인 중...' : '로그인'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.signupBtn} onPress={() => router.push('/signup')} accessibilityRole="button">
            <Text style={styles.signupText}>계정이 없으신가요? <Text style={styles.signupLink}>회원가입</Text></Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>소셜 로그인</Text>
          <View style={styles.divider} />
        </View>

        {/* Social buttons */}
        <View style={styles.socialGroup}>
          {/* 카카오 */}
          <TouchableOpacity
            style={[styles.socialBtn, styles.kakaoBtn, !kakaoReady && styles.disabledBtn]}
            onPress={() => kakaoPromptAsync()}
            disabled={!kakaoReady}
            accessibilityLabel="카카오로 계속하기"
            accessibilityRole="button"
          >
            <View style={styles.socialBtnIcon}><KakaoIcon size={22} /></View>
            <Text style={styles.kakaoBtnText}>카카오로 계속하기</Text>
          </TouchableOpacity>

          {/* 구글 */}
          <TouchableOpacity
            style={[styles.socialBtn, styles.googleBtn, !googleReady && styles.disabledBtn]}
            onPress={() => googlePromptAsync()}
            disabled={!googleReady}
            accessibilityLabel="Google로 계속하기"
            accessibilityRole="button"
          >
            <View style={styles.socialBtnIcon}><GoogleIcon size={22} /></View>
            <Text style={styles.googleBtnText}>Google로 계속하기</Text>
          </TouchableOpacity>

          {/* 애플 (iOS 전용) */}
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.socialBtn, styles.appleBtn]}
              onPress={handleAppleLogin}
              accessibilityLabel="Apple로 계속하기"
              accessibilityRole="button"
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
  flex: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 48,
    backgroundColor: '#FFFFFF',
  },
  hero: {
    alignItems: 'center',
    marginBottom: 40,
  },
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
    color: '#1A1108',
    marginTop: 6,
  },
  form: {
    marginBottom: 8,
  },
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
  signupBtn: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 4,
  },
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
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#D4D4D4',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#1A1108',
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Medium',
  },
  socialGroup: {
    gap: 10,
  },
  socialBtn: {
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  socialBtnIcon: {
    width: 28,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  disabledBtn: {
    opacity: 0.4,
  },
  kakaoBtn: {
    backgroundColor: '#FEE500',
  },
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
  appleBtn: {
    backgroundColor: '#000000',
  },
  appleBtnText: {
    flex: 1,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    marginRight: 28,
  },
});
