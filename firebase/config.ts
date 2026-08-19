import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  browserLocalPersistence,
  type Auth,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { Platform } from 'react-native';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export const firebaseConfig: FirebaseConfig = {
  apiKey: 'AIzaSyAOHTJlisxngswCvlVfqvGySO8UTbXOK-g',
  authDomain: 'shareplus-22263.firebaseapp.com',
  projectId: 'shareplus-22263',
  storageBucket: 'shareplus-22263.firebasestorage.app',
  messagingSenderId: '216194676243',
  appId: '1:216194676243:web:8407174a793138bd93b1e6',
};

export const isFirebaseConfigured = (): boolean =>
  Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (app) return app;
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase is not configured. Add EXPO_PUBLIC_FIREBASE_* values to your .env file.',
    );
  }
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  return app;
}

export function getFirebaseAuth(): Auth {
  if (authInstance) return authInstance;
  const firebaseApp = getFirebaseApp();
  if (Platform.OS === 'web') {
    authInstance = getAuth(firebaseApp);
  } else {
    authInstance = initializeAuth(firebaseApp, {
      persistence: browserLocalPersistence,
    });
  }
  return authInstance;
}

export function getDb(): Firestore {
  if (dbInstance) return dbInstance;
  dbInstance = getFirestore(getFirebaseApp());
  return dbInstance;
}

export const firebaseApp = (() => {
  try {
    return getFirebaseApp();
  } catch {
    return null;
  }
})();

export const auth: Auth = (() => {
  try {
    return getFirebaseAuth();
  } catch {
    return null as any; // Safe: getFirebaseAuth() will throw before we reach this
  }
})() as Auth;

export const db: Firestore = (() => {
  try {
    return getDb();
  } catch {
    return null as any; // Safe: getDb() will throw before we reach this
  }
})() as Firestore;
