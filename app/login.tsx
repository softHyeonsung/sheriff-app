import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import ShieldIcon from '../src/components/ShieldIcon';
import { login, loginWithApple, loginWithGoogle, loginWithKakaoCustomToken, signUp } from '../src/api/auth';

WebBrowser.maybeCompleteAuthSession();

// TODO: Firebase 콘솔 > Authentication > Google > 웹 클라이언트 ID 입력
const GOOGLE_WEB_CLIENT_ID = 'YOUR_GOOGLE_WEB_CLIENT_ID';
const GOOGLE_IOS_CLIENT_ID = 'YOUR_GOOGLE_IOS_CLIENT_ID';
const GOOGLE_ANDROID_CLIENT_ID = 'YOUR_GOOGLE_ANDROID_CLIENT_ID';

// TODO: https://developers.kakao.com > 앱 > REST API 키 입력
const KAKAO_REST_API_KEY = 'YOUR_KAKAO_REST_API_KEY';

// TODO: Firebase Cloud Functions 배포 후 URL 입력 (카카오 authorization code → custom token 교환)
const KAKAO_CLOUD_FUNCTION_URL = 'YOUR_FIREBASE_CLOUD_FUNCTION_URL';

const kakaoDiscovery = {
  authorizationEndpoint: 'https://kauth.kakao.com/oauth/authorize',
  tokenEndpoint: 'https://kauth.kakao.com/oauth/token',
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const kakaoRedirectUri = useMemo(
    () => AuthSession.makeRedirectUri({ scheme: 'sheriffapp' }),
    []
  );

  // Google OAuth
  // responseType 'id_token' only works on iOS/web. Android requires 'code' + PKCE.
  // TODO (P1): Switch to responseType:'code' + server-side token exchange for Android support.
  // For now, Google login is iOS/web only.
  const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
    responseType: 'id_token',
  });

  // Kakao OAuth
  const [kakaoRequest, kakaoResponse, kakaoPromptAsync] = AuthSession.useAuthRequest(
    {
      clientId: KAKAO_REST_API_KEY,
      redirectUri: kakaoRedirectUri,
      scopes: ['profile_nickname', 'profile_image', 'account_email'],
    },
    kakaoDiscovery
  );

  // Google 응답 처리
  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const { id_token } = googleResponse.params;
      if (id_token) {
        loginWithGoogle(id_token).catch((e) => Alert.alert('Google 로그인 실패', e.message));
      }
    }
  }, [googleResponse]);

  // 카카오 응답 처리 — authorization code를 Cloud Function으로 전송해 custom token 수령
  useEffect(() => {
    if (kakaoResponse?.type === 'success') {
      const { code } = kakaoResponse.params;
      fetch(KAKAO_CLOUD_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirectUri: kakaoRedirectUri }),
      })
        .then((res) => res.json())
        .then((data) => loginWithKakaoCustomToken(data.firebaseToken))
        .catch((e) => Alert.alert('카카오 로그인 실패', String(e)));
    }
  }, [kakaoResponse]);

  const validateEmailPassword = (): boolean => {
    if (!email || !password) {
      Alert.alert('오류', '이메일과 비밀번호를 입력해주세요.');
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    if (!validateEmailPassword()) return;
    setLoading(true);
    try {
      await login(email, password);
    } catch (error: any) {
      Alert.alert('로그인 실패', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!validateEmailPassword()) return;
    setLoading(true);
    try {
      await signUp(email, password);
    } catch (error: any) {
      Alert.alert('회원가입 실패', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    try {
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      const rawNonce = Array.from(randomBytes).map((b) => b.toString(16).padStart(2, '0')).join('');
      const nonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );
      const credential = await AppleAuthentication.signInAsync({
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

  const kakaoReady = !!kakaoRequest && KAKAO_CLOUD_FUNCTION_URL !== 'YOUR_FIREBASE_CLOUD_FUNCTION_URL';

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
            accessibilityLabel="로그인"
            accessibilityRole="button"
          >
            <Text style={styles.loginBtnText}>{loading ? '로그인 중...' : '로그인'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.signupBtn} onPress={handleSignUp} disabled={loading}>
            <Text style={styles.signupText}>계정이 없으신가요? <Text style={styles.signupLink}>회원가입</Text></Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>소셜 로그인</Text>
          <View style={styles.divider} />
        </View>

        {/* Social logins */}
        <View style={styles.socialGroup}>
          {/* 카카오 로그인 */}
          <TouchableOpacity
            style={[styles.socialBtn, styles.kakaoBtn, !kakaoReady && styles.disabledBtn]}
            onPress={() => kakaoPromptAsync()}
            disabled={!kakaoReady}
            accessibilityLabel="카카오로 계속하기"
            accessibilityRole="button"
          >
            <Text style={styles.kakaoBtnText}>카카오로 계속하기</Text>
          </TouchableOpacity>

          {/* 구글 로그인 */}
          <TouchableOpacity
            style={[styles.socialBtn, styles.googleBtn, !googleRequest && styles.disabledBtn]}
            onPress={() => googlePromptAsync()}
            disabled={!googleRequest}
            accessibilityLabel="Google로 계속하기"
            accessibilityRole="button"
          >
            <Text style={styles.googleBtnText}>Google로 계속하기</Text>
          </TouchableOpacity>

          {/* 애플 로그인 (iOS 전용) */}
          {Platform.OS === 'ios' && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={12}
              style={styles.appleBtn}
              onPress={handleAppleLogin}
            />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#FFFDF7',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 48,
    backgroundColor: '#FFFDF7',
  },
  // Hero
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
    color: '#7A5C38',
    marginTop: 6,
  },
  // Form
  form: {
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#EFE0C4',
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FFF8EC',
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
    shadowColor: '#A36E1D',
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
    color: '#7A5C38',
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Regular',
  },
  signupLink: {
    color: '#FFAC30',
    fontFamily: 'AppleSDGothicNeo-SemiBold',
  },
  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#EFE0C4',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#B89060',
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Medium',
  },
  // Social
  socialGroup: {
    gap: 10,
  },
  socialBtn: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledBtn: {
    opacity: 0.4,
  },
  kakaoBtn: {
    backgroundColor: '#FEE500',
  },
  kakaoBtnText: {
    color: '#3C1E1E',
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
  },
  googleBtn: {
    backgroundColor: '#FFF8EC',
    borderWidth: 1,
    borderColor: '#EFE0C4',
  },
  googleBtnText: {
    color: '#1A1108',
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
  },
  appleBtn: {
    height: 52,
    width: '100%',
  },
});
