import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer, collection, getDocs, setDoc, deleteDoc, writeBatch, onSnapshot } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import defaultConfig from '../../firebase-applet-config.json';
import { 
  Topic, 
  Lesson, 
  Exercise, 
  Classroom, 
  User, 
  ErrorLog, 
  MediaAsset 
} from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
    },
    operationType,
    path
  };
  console.warn('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

// Support Vite env variables or firebase-applet-config.json for GitHub/Vercel deployment
const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || defaultConfig.projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || defaultConfig.appId,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || defaultConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || defaultConfig.authDomain,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || defaultConfig.firestoreDatabaseId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || defaultConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultConfig.messagingSenderId,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Test connection on boot
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase Cloud Database connected successfully!');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase is offline or connecting...');
    }
    // Still true if initialized
    return true;
  }
}

// -------------------------------------------------------------
// Cloud Sync Functions for Firebase Firestore
// -------------------------------------------------------------

export async function fetchAllFromCloud() {
  try {
    const [classroomsSnap, topicsSnap, lessonsSnap, exercisesSnap, usersSnap, errorsSnap, mediaSnap] = await Promise.all([
      getDocs(collection(db, 'classrooms')),
      getDocs(collection(db, 'topics')),
      getDocs(collection(db, 'lessons')),
      getDocs(collection(db, 'exercises')),
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'errors')),
      getDocs(collection(db, 'media')),
    ]);

    const classrooms = classroomsSnap.docs.map(d => d.data() as Classroom);
    const topics = topicsSnap.docs.map(d => d.data() as Topic);
    const lessons = lessonsSnap.docs.map(d => d.data() as Lesson);
    const exercises = exercisesSnap.docs.map(d => d.data() as Exercise);
    const users = usersSnap.docs.map(d => d.data() as User);
    const errors = errorsSnap.docs.map(d => d.data() as ErrorLog);
    const media = mediaSnap.docs.map(d => d.data() as MediaAsset);

    return {
      hasData: classrooms.length > 0 || topics.length > 0 || lessons.length > 0 || exercises.length > 0 || users.length > 0 || media.length > 0,
      classrooms,
      topics,
      lessons,
      exercises,
      users,
      errors,
      media,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'all_collections');
    return null;
  }
}

// Sync individual items to Firestore
export async function syncDocToCloud(collectionName: string, id: string, data: any) {
  try {
    const docRef = doc(db, collectionName, id);
    // Sanitize any undefined properties for Firestore
    const cleanData = JSON.parse(JSON.stringify(data));
    await setDoc(docRef, cleanData, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${collectionName}/${id}`);
  }
}

export async function deleteDocFromCloud(collectionName: string, id: string) {
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${id}`);
  }
}

// Push all local data up to Cloud in batches
export async function syncAllToCloud(data: {
  classrooms?: Classroom[];
  topics?: Topic[];
  lessons?: Lesson[];
  exercises?: Exercise[];
  users?: User[];
  errors?: ErrorLog[];
  media?: MediaAsset[];
}) {
  try {
    const batch = writeBatch(db);
    let count = 0;

    data.classrooms?.forEach(c => {
      batch.set(doc(db, 'classrooms', c.id), JSON.parse(JSON.stringify(c)), { merge: true });
      count++;
    });
    data.topics?.forEach(t => {
      batch.set(doc(db, 'topics', t.id), JSON.parse(JSON.stringify(t)), { merge: true });
      count++;
    });
    data.lessons?.forEach(l => {
      batch.set(doc(db, 'lessons', l.id), JSON.parse(JSON.stringify(l)), { merge: true });
      count++;
    });
    data.exercises?.forEach(e => {
      batch.set(doc(db, 'exercises', e.id), JSON.parse(JSON.stringify(e)), { merge: true });
      count++;
    });
    data.users?.forEach(u => {
      batch.set(doc(db, 'users', u.id), JSON.parse(JSON.stringify(u)), { merge: true });
      count++;
    });
    data.errors?.forEach(err => {
      batch.set(doc(db, 'errors', err.id), JSON.parse(JSON.stringify(err)), { merge: true });
      count++;
    });
    data.media?.forEach(m => {
      batch.set(doc(db, 'media', m.id), JSON.parse(JSON.stringify(m)), { merge: true });
      count++;
    });

    if (count > 0) {
      await batch.commit();
    }
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'batch_sync_all');
    return false;
  }
}

// Clear cloud collections completely (as requested: "xóa sạch db hiện có để tránh xung đột")
export async function clearCloudDatabase() {
  try {
    const collectionsToClear = ['classrooms', 'topics', 'lessons', 'exercises', 'users', 'errors', 'media'];
    for (const coll of collectionsToClear) {
      const snap = await getDocs(collection(db, coll));
      const batch = writeBatch(db);
      snap.docs.forEach(d => {
        batch.delete(d.ref);
      });
      await batch.commit();
    }
    console.log('Cleared all Cloud Database collections.');
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'clear_cloud_database');
    return false;
  }
}
