import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
// import { login, signUp } from '../src/api/auth'; // 아까 만든 함수 호출

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = () => {
    Alert.alert("테스트", "연결 없이 화면만 띄워봅니다.");
  };

  const handleSignUp = () => {
    Alert.alert("테스트", "연결 없이 화면만 띄워봅니다.");
  };

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

      <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
        <Text style={styles.btnText}>로그인</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.signupBtn} onPress={handleSignUp}>
        <Text style={styles.signupText}>계정이 없으신가요? 회원가입</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 30, backgroundColor: '#fff' },
  title: { fontSize: 40, fontWeight: 'bold', textAlign: 'center', marginBottom: 50 },
  input: { height: 50, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 15, marginBottom: 15 },
  loginBtn: { height: 50, backgroundColor: '#2f95dc', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  signupBtn: { marginTop: 20, alignItems: 'center' },
  signupText: { color: '#666' }
});