import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore, doc, getDocFromServer, enableMultiTabIndexedDbPersistence, enableIndexedDbPersistence, Firestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfigRaw from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || firebaseConfigRaw.apiKey,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || firebaseConfigRaw.authDomain,
  projectId: process.env.FIREBASE_PROJECT_ID || firebaseConfigRaw.projectId,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || firebaseConfigRaw.storageBucket,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || firebaseConfigRaw.messagingSenderId,
  appId: process.env.FIREBASE_APP_ID || firebaseConfigRaw.appId,
};

const databaseId = process.env.FIREBASE_DATABASE_ID || firebaseConfigRaw.firestoreDatabaseId;

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

function initSafeFirestore(): Firestore {
  try {
    return initializeFirestore(app, {
      experimentalForceLongPolling: true,
      host: 'firestore.googleapis.com',
      ssl: true,
      experimentalLongPollingOptions: { timeoutSeconds: 30 },
    }, databaseId);
  } catch (e) {
    return databaseId ? getFirestore(app, databaseId) : getFirestore(app);
  }
}

export const db = initSafeFirestore();

// Enable offline persistence immediately to prevent blocking and error screens on network delay
if (typeof window !== 'undefined') {
  enableMultiTabIndexedDbPersistence(db)
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        // Multiple tabs open, enable in single tab mode
        return enableIndexedDbPersistence(db);
      }
    })
    .catch((err) => {
      console.warn('Firestore offline persistence is inactive or unsupported in this browser environment:', err.message || err);
    });
}

export const auth = getAuth(app);
export const storage = getStorage(app);

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
// testConnection(); // Commented out to prevent unnecessary startup errors if internet is slow

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const message = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: message,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  
  if (message.includes('the client is offline') || message.includes('offline')) {
    console.warn('Firestore offline:', JSON.stringify(errInfo));
    return;
  }

  console.warn('Firestore Non-Fatal Error handled gracefully: ', JSON.stringify(errInfo));
}
