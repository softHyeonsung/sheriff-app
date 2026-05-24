// Import the functions you need from the SDKs you need
import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCSm6WkU2YZ99uQvrKSFlfaLDFD9PvnMRw",
  authDomain: "sheriff-app-dab41.firebaseapp.com",
  projectId: "sheriff-app-dab41",
  storageBucket: "sheriff-app-dab41.firebasestorage.app",
  messagingSenderId: "847237699912",
  appId: "1:847237699912:web:b384045b1735c473e9bb7d",
  measurementId: "G-1QLPRCEFZ5"
};

// Initialize Firebase — 앱이 이미 초기화된 경우 재사용 (Fast Refresh 대응)
export const app = getApps()[0] ?? initializeApp(firebaseConfig);

// Firestore — 이미 초기화된 경우 기존 인스턴스 반환
let _db: ReturnType<typeof getFirestore>;
try {
  _db = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
    localCache: persistentLocalCache(),
  });
} catch {
  _db = getFirestore(app);
}
export const db = _db;

export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;