// 경로: app/signup.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
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
import { signUp } from '../src/api/auth';

// Korean-friendly Firebase error messages
const getErrorMessage = (code: string): string => {
  switch (code) {
    case 'auth/email-already-in-use':   return '이미 사용 중인 이메일이에요.';
    case 'auth/invalid-email':          return '올바른 이메일 형식이 아니에요.';
    case 'auth/weak-password':          return '비밀번호는 6자리 이상이어야 해요.';
    default:                            return '회원가입에 실패했어요. 다시 시도해주세요.';
  }
};

export default function SignupScreen() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);

  const emailRef    = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef  = useRef<TextInput>(null);

  const handleSignUp = async () => {
    if (!nickname.trim()) {
      Alert.alert('닉네임 입력', '닉네임을 입력해주세요.');
      return;
    }
    if (!email || !password) {
      Alert.alert('입력 오류', '이메일과 비밀번호를 입력해주세요.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('비밀번호 불일치', '비밀번호가 일치하지 않아요.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('비밀번호 오류', '비밀번호는 6자리 이상이어야 해요.');
      return;
    }

    setLoading(true);
    try {
      await signUp(email.trim(), password, nickname.trim());
      // onAuthStateChanged in _layout.tsx will redirect to (tabs) automatically
    } catch (error: any) {
      Alert.alert('회원가입 실패', getErrorMessage(error.code));
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
        {/* Back button */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityLabel="뒤로 가기"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color="#A36E1D" />
        </TouchableOpacity>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.title}>회원가입</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>닉네임</Text>
          <TextInput
            style={styles.input}
            placeholder="동네에서 불릴 이름"
            placeholderTextColor="#B89060"
            value={nickname}
            onChangeText={setNickname}
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            maxLength={20}
            accessibilityLabel="닉네임 입력"
          />

          <Text style={styles.label}>이메일</Text>
          <TextInput
            ref={emailRef}
            style={styles.input}
            placeholder="example@email.com"
            placeholderTextColor="#B89060"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            accessibilityLabel="이메일 입력"
          />

          <Text style={styles.label}>비밀번호</Text>
          <TextInput
            ref={passwordRef}
            style={styles.input}
            placeholder="6자리 이상"
            placeholderTextColor="#B89060"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
            accessibilityLabel="비밀번호 입력"
          />

          <Text style={styles.label}>비밀번호 확인</Text>
          <TextInput
            ref={confirmRef}
            style={[
              styles.input,
              confirm.length > 0 && confirm !== password && styles.inputError,
            ]}
            placeholder="비밀번호 재입력"
            placeholderTextColor="#B89060"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleSignUp}
            accessibilityLabel="비밀번호 확인 입력"
          />
          {confirm.length > 0 && confirm !== password && (
            <Text style={styles.errorText}>비밀번호가 일치하지 않아요</Text>
          )}

          <TouchableOpacity
            style={[styles.signupBtn, loading && styles.disabledBtn]}
            onPress={handleSignUp}
            disabled={loading}
            accessibilityLabel="회원가입"
            accessibilityRole="button"
          >
            <Text style={styles.signupBtnText}>{loading ? '가입 중...' : '가입하기'}</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>이미 계정이 있으신가요? </Text>
          <TouchableOpacity onPress={() => router.back()} accessibilityRole="button">
            <Text style={styles.footerLink}>로그인</Text>
          </TouchableOpacity>
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
    paddingHorizontal: 28,
    paddingTop: 56,
    paddingBottom: 40,
    backgroundColor: '#FFFDF7',
  },
  backBtn: {
    position: 'absolute',
    top: 56,
    left: 0,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 36,
    marginTop: 16,
  },
  title: {
    fontSize: 26,
    fontFamily: 'AppleSDGothicNeo-Heavy',
    color: '#1A1108',
    marginTop: 12,
  },
  form: {
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#7A5C38',
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#EFE0C4',
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFF8EC',
    color: '#1A1108',
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-Regular',
  },
  inputError: {
    borderColor: '#E05252',
    backgroundColor: '#FFF5F5',
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#E05252',
    marginTop: -12,
    marginBottom: 12,
    marginLeft: 4,
  },
  signupBtn: {
    height: 52,
    backgroundColor: '#FFAC30',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#A36E1D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  signupBtnText: {
    fontSize: 16,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#7A5C38',
  },
  footerLink: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#FFAC30',
  },
});
