import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBbDYO4f2szZwUupS2aCXQghd8gAhs9Ypo',
  authDomain: 'volleyball-d2c.firebaseapp.com',
  projectId: 'volleyball-d2c',
  storageBucket: 'volleyball-d2c.firebasestorage.app',
  messagingSenderId: '880881760876',
  appId: '1:880881760876:web:e00922adf7eb5347b63649',
  measurementId: 'G-FPS2B2X91T',
};

let app: FirebaseApp | undefined;
let auth: Auth;
let db: Firestore;

if (typeof window !== 'undefined') {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

export { auth, db };
export const googleProvider = new GoogleAuthProvider();
export { signInWithPopup, signOut, onAuthStateChanged };
