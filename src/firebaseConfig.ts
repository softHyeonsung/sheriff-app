// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
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

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// 외부에서 쓸 수 있도록 각각 export
export const db = getFirestore(app);
export const auth = getAuth(app)
export const storage = getStorage(app);

export default app;