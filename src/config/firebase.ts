import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { browserLocalPersistence, getAuth, setPersistence, type Auth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';

const firebaseOptions: FirebaseOptions = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

const requiredVariables = {
  REACT_APP_FIREBASE_API_KEY: firebaseOptions.apiKey,
  REACT_APP_FIREBASE_AUTH_DOMAIN: firebaseOptions.authDomain,
  REACT_APP_FIREBASE_PROJECT_ID: firebaseOptions.projectId,
  REACT_APP_FIREBASE_MESSAGING_SENDER_ID: firebaseOptions.messagingSenderId,
  REACT_APP_FIREBASE_APP_ID: firebaseOptions.appId,
};

export const missingFirebaseVariables = Object.entries(requiredVariables)
  .filter(([, value]) => !value)
  .map(([name]) => name);

export const isFirebaseConfigured = missingFirebaseVariables.length === 0;

export interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  persistentCache: boolean;
}

let servicesPromise: Promise<FirebaseServices | null> | null = null;

function initializeDatabase(app: FirebaseApp): { db: Firestore; persistentCache: boolean } {
  const canPersist = typeof window !== 'undefined' && 'indexedDB' in window;
  try {
    const db = initializeFirestore(app, {
      localCache: canPersist
        ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
        : memoryLocalCache(),
    });
    return { db, persistentCache: canPersist };
  } catch {
    return { db: getFirestore(app), persistentCache: false };
  }
}

export function getFirebaseServices(): Promise<FirebaseServices | null> {
  if (!isFirebaseConfigured) return Promise.resolve(null);
  if (servicesPromise) return servicesPromise;

  servicesPromise = (async () => {
    const app = getApps().length ? getApp() : initializeApp(firebaseOptions);
    const auth = getAuth(app);
    await setPersistence(auth, browserLocalPersistence);
    const { db, persistentCache } = initializeDatabase(app);
    return { app, auth, db, persistentCache };
  })();

  return servicesPromise;
}
