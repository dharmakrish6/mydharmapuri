import { Platform } from 'react-native';
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import {
  getAuth,
  initializeAuth,
  // @ts-expect-error — exported only by the React Native build of firebase/auth
  getReactNativePersistence,
  type Auth,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Values come from app/.env (see .env.example). EXPO_PUBLIC_ vars must be read
// with dot access so Expo can inline them at build time.
const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

/** False until the Firebase keys are filled in; the app then runs on bundled seed data. */
export const firebaseConfigured = Boolean(config.apiKey && config.projectId);

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

if (firebaseConfigured) {
  app = initializeApp(config);
  db = getFirestore(app);
  auth = Platform.OS === 'web'
    ? getAuth(app)
    : initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
}

export { app, db, auth };
