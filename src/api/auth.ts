// src/api/auth.ts
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
} from 'firebase/auth';
import { auth } from '../firebaseConfig';

// 1. 회원가입
export const signUp = async (email: string, pass: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    return userCredential.user;
  } catch (error: any) {
    throw error.message;
  }
};

// 2. 로그인
export const login = async (email: string, pass: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    return userCredential.user;
  } catch (error: any) {
    throw error.message;
  }
};

// 3. 로그아웃
export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error: any) {
    console.error(error);
  }
};