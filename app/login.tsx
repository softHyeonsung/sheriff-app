import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
    <View style={styles.container}>
      <Text style={styles.title}>🛡️ SHERIFF</Text>

      <TextInput
        style={styles.input}
        placeholder="이메일"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="비밀번호"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
        <Text style={styles.btnText}>{loading ? '로그인 중...' : '로그인'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.signupBtn} onPress={handleSignUp} disabled={loading}>
        <Text style={styles.signupText}>계정이 없으신가요? 회원가입</Text>
      </TouchableOpacity>

      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>또는</Text>
        <View style={styles.divider} />
      </View>

      {/* 카카오 로그인 */}
      <TouchableOpacity
        style={[styles.socialBtn, styles.kakaoBtn, !kakaoReady && styles.disabledBtn]}
        onPress={() => kakaoPromptAsync()}
        disabled={!kakaoReady}
      >
        <Text style={styles.kakaoBtnText}>카카오로 계속하기</Text>
      </TouchableOpacity>

      {/* 구글 로그인 */}
      <TouchableOpacity
        style={[styles.socialBtn, styles.googleBtn, !googleRequest && styles.disabledBtn]}
        onPress={() => googlePromptAsync()}
        disabled={!googleRequest}
      >
        <Text style={styles.googleBtnText}>Google로 계속하기</Text>
      </TouchableOpacity>

      {/* 애플 로그인 (iOS 전용) */}
      {Platform.OS === 'ios' && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={8}
          style={styles.appleBtn}
          onPress={handleAppleLogin}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 30, backgroundColor: '#FFFDF7' },
  title: { fontSize: 40, fontFamily: 'AppleSDGothicNeo-Heavy', textAlign: 'center', marginBottom: 50, color: '#1A1108' },
  input: { height: 50, borderWidth: 1, borderColor: '#EFE0C4', borderRadius: 12, paddingHorizontal: 15, marginBottom: 15, backgroundColor: '#FFF8EC', color: '#1A1108' },
  loginBtn: { height: 50, backgroundColor: '#FFAC30', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#1A1108', fontSize: 18, fontFamily: 'AppleSDGothicNeo-Bold' },
  signupBtn: { marginTop: 16, alignItems: 'center' },
  signupText: { color: '#7A5C38' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  divider: { flex: 1, height: 1, backgroundColor: '#ddd' },
  dividerText: { marginHorizontal: 12, color: '#999', fontSize: 13 },
  socialBtn: { height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  disabledBtn: { opacity: 0.4 },
  kakaoBtn: { backgroundColor: '#FEE500' },
  kakaoBtnText: { color: '#3C1E1E', fontSize: 16, fontFamily: 'AppleSDGothicNeo-SemiBold' },
  googleBtn: { backgroundColor: '#FFF8EC', borderWidth: 1, borderColor: '#EFE0C4' },
  googleBtnText: { color: '#1A1108', fontSize: 16, fontFamily: 'AppleSDGothicNeo-SemiBold' },
  appleBtn: { height: 50, width: '100%' },
});
