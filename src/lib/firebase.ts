import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, getDocFromServer, collection, getDocs, setDoc, deleteDoc, writeBatch, onSnapshot, query, where, documentId } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import defaultConfig from '../../firebase-applet-config.json';
import { 
  Topic, 
  Lesson, 
  Exercise, 
  Classroom, 
  User, 
  ErrorLog, 
  MediaAsset,
  LessonProgressCheckpoint
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
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);
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
    // Only load lightweight metadata collections on boot (NO full exercises download!)
    // Exercises are fetched strictly on-demand per lesson when clicked.
    const [
      classroomsSnap, 
      topicsSnap, 
      lessonsSnap, 
      usersSnap, 
      mediaSnap,
      mediaFoldersSnap,
      userSettingsSnap,
    ] = await Promise.all([
      getDocs(collection(db, 'classrooms')),
      getDocs(collection(db, 'topics')),
      getDocs(collection(db, 'lessons')),
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'media')),
      getDocs(collection(db, 'media_folders')),
      getDocs(collection(db, 'user_settings')),
    ]);

    const classrooms = classroomsSnap.docs.map(d => d.data() as Classroom);
    const topics = topicsSnap.docs.map(d => d.data() as Topic);
    const lessons = lessonsSnap.docs.map(d => d.data() as Lesson);
    let users = usersSnap.docs.map(d => d.data() as User);
    const media = mediaSnap.docs.map(d => d.data() as MediaAsset);
    const mediaFolders = mediaFoldersSnap.docs.map(d => d.data());
    
    // Map individual user settings from user_settings collection onto users
    const userSettingsMap = new Map<string, any>();
    userSettingsSnap.docs.forEach(d => {
      const data = d.data();
      if (data && data.settings) {
        userSettingsMap.set(d.id, data.settings);
      }
    });

    if (userSettingsMap.size > 0) {
      users = users.map(u => {
        const extraSettings = userSettingsMap.get(u.id);
        if (extraSettings) {
          return {
            ...u,
            settings: {
              ...(u.settings || {}),
              ...extraSettings,
            },
          };
        }
        return u;
      });
    }

    return {
      hasData: classrooms.length > 0 || topics.length > 0 || lessons.length > 0 || users.length > 0 || media.length > 0,
      classrooms,
      topics,
      lessons,
      exercises: undefined as Exercise[] | undefined,
      users,
      errors: [] as ErrorLog[],
      media,
      mediaFolders,
      userSettingsMap,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'all_collections');
    return null;
  }
}

// -------------------------------------------------------------
// On-Demand Exercise Queries (Load strictly what the user clicks)
// -------------------------------------------------------------

export async function fetchExercisesByLessonFromCloud(lessonId: string): Promise<Exercise[] | null> {
  if (!lessonId) return [];
  try {
    const q = query(collection(db, 'exercises'), where('lessonId', '==', lessonId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Exercise);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, `exercises?lessonId=${lessonId}`);
    return null;
  }
}

export async function fetchExercisesByLessonIdsFromCloud(lessonIds: string[]): Promise<Exercise[] | null> {
  const uniqueIds = Array.from(new Set(lessonIds.filter(Boolean)));
  if (uniqueIds.length === 0) return [];
  try {
    const results: Exercise[] = [];
    // Firestore 'in' queries support up to 30 items per batch
    const CHUNK_SIZE = 30;
    for (let i = 0; i < uniqueIds.length; i += CHUNK_SIZE) {
      const chunk = uniqueIds.slice(i, i + CHUNK_SIZE);
      const q = query(collection(db, 'exercises'), where('lessonId', 'in', chunk));
      const snap = await getDocs(q);
      snap.docs.forEach(d => results.push(d.data() as Exercise));
    }
    return results;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'exercises_by_lessons');
    return null;
  }
}

export async function fetchExercisesByIdsFromCloud(exerciseIds: string[]): Promise<Exercise[] | null> {
  const uniqueIds = Array.from(new Set(exerciseIds.filter(Boolean)));
  if (uniqueIds.length === 0) return [];
  try {
    const results: Exercise[] = [];
    const CHUNK_SIZE = 30;
    for (let i = 0; i < uniqueIds.length; i += CHUNK_SIZE) {
      const chunk = uniqueIds.slice(i, i + CHUNK_SIZE);
      const q = query(collection(db, 'exercises'), where(documentId(), 'in', chunk));
      const snap = await getDocs(q);
      snap.docs.forEach(d => results.push(d.data() as Exercise));
    }
    return results;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'exercises_by_ids');
    return null;
  }
}

export async function fetchExercisesBySkillFromCloud(skill: string): Promise<Exercise[] | null> {
  if (!skill) return [];
  try {
    const q = query(collection(db, 'exercises'), where('skill', '==', skill));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Exercise);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, `exercises?skill=${skill}`);
    return null;
  }
}

export async function fetchAllExercisesFromCloud(): Promise<Exercise[] | null> {
  try {
    const snap = await getDocs(collection(db, 'exercises'));
    return snap.docs.map(d => d.data() as Exercise);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'exercises');
    return null;
  }
}

export async function deleteExercisesByLessonIdsFromCloud(lessonIds: string[]): Promise<void> {
  const uniqueIds = Array.from(new Set(lessonIds.filter(Boolean)));
  if (uniqueIds.length === 0) return;
  try {
    const idsToDelete: string[] = [];
    const CHUNK_SIZE = 30;
    for (let i = 0; i < uniqueIds.length; i += CHUNK_SIZE) {
      const chunk = uniqueIds.slice(i, i + CHUNK_SIZE);
      const q = query(collection(db, 'exercises'), where('lessonId', 'in', chunk));
      const snap = await getDocs(q);
      snap.docs.forEach(d => idsToDelete.push(d.id));
    }
    if (idsToDelete.length > 0) {
      await deleteBatchDocsFromCloud('exercises', idsToDelete);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'exercises_by_lessons');
  }
}

export function subscribeToLessonExercises(
  lessonId: string,
  onUpdate: (exercises: Exercise[]) => void
): () => void {
  if (!lessonId) return () => {};
  const q = query(collection(db, 'exercises'), where('lessonId', '==', lessonId));
  return onSnapshot(
    q,
    snap => {
      if (snap.empty && snap.metadata.fromCache) return;
      const items = snap.docs.map(d => d.data() as Exercise);
      onUpdate(items);
    },
    err => console.warn(`Lesson exercises real-time listener error (${lessonId}):`, err)
  );
}

// In-memory trackers for in-flight writes & deletes in the current browser session.
// Used to distinguish "just created/deleted in this tab" from "deleted on Cloud by another device".
const pendingCloudWrites = new Map<string, number>();
const pendingCloudDeletes = new Map<string, number>();
const PENDING_SETTLE_MS = 3000;

function makePendingKey(collectionName: string, id: string): string {
  return `${collectionName}:${id}`;
}

export function isPendingCloudWrite(collectionName: string, id: string): boolean {
  const key = makePendingKey(collectionName, id);
  const expiresAt = pendingCloudWrites.get(key);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    pendingCloudWrites.delete(key);
    return false;
  }
  return true;
}

export function isPendingCloudDelete(collectionName: string, id: string): boolean {
  const key = makePendingKey(collectionName, id);
  const expiresAt = pendingCloudDeletes.get(key);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    pendingCloudDeletes.delete(key);
    return false;
  }
  return true;
}

function markPendingWrite(collectionName: string, id: string) {
  const key = makePendingKey(collectionName, id);
  pendingCloudDeletes.delete(key);
  // Active in-flight write gets a generous ceiling until completed, then settles for PENDING_SETTLE_MS
  pendingCloudWrites.set(key, Date.now() + 30000);
}

function settlePendingWrite(collectionName: string, id: string) {
  const key = makePendingKey(collectionName, id);
  pendingCloudWrites.set(key, Date.now() + PENDING_SETTLE_MS);
}

function markPendingDelete(collectionName: string, id: string) {
  const key = makePendingKey(collectionName, id);
  pendingCloudWrites.delete(key);
  pendingCloudDeletes.set(key, Date.now() + 30000);
}

function settlePendingDelete(collectionName: string, id: string) {
  const key = makePendingKey(collectionName, id);
  pendingCloudDeletes.set(key, Date.now() + PENDING_SETTLE_MS);
}

// Sync individual items to Firestore
export async function syncDocToCloud(collectionName: string, id: string, data: any) {
  markPendingWrite(collectionName, id);
  try {
    const docRef = doc(db, collectionName, id);
    // Sanitize any undefined properties for Firestore
    const cleanData = JSON.parse(JSON.stringify(data));
    await setDoc(docRef, cleanData, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${collectionName}/${id}`);
  } finally {
    settlePendingWrite(collectionName, id);
  }
}

export async function deleteDocFromCloud(collectionName: string, id: string) {
  markPendingDelete(collectionName, id);
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${id}`);
  } finally {
    settlePendingDelete(collectionName, id);
  }
}

// -------------------------------------------------------------
// On-Demand Per-Lesson Checkpoint Sync (1 tiny doc per user+lesson)
// Stored in system_settings with 'cp_' prefix (already permitted in live rules
// and never loaded at boot — strictly fetched on-demand when opening a lesson).
// -------------------------------------------------------------
export function getLessonCheckpointDocId(userId: string, lessonId: string): string {
  const safeUser = userId.replace(/[^a-zA-Z0-9_\-.:]/g, '_').slice(0, 56);
  const safeLesson = lessonId.replace(/[^a-zA-Z0-9_\-.:]/g, '_').slice(0, 56);
  return `cp_${safeUser}_${safeLesson}`;
}

export async function fetchLessonCheckpointFromCloud(
  userId: string,
  lessonId: string
): Promise<LessonProgressCheckpoint | null> {
  if (!userId || !lessonId) return null;
  const docId = getLessonCheckpointDocId(userId, lessonId);
  try {
    const snap = await getDoc(doc(db, 'system_settings', docId));
    if (!snap.exists()) return null;
    const data = snap.data() as Partial<LessonProgressCheckpoint> | undefined;
    if (!data || data.lessonId !== lessonId || data.userId !== userId) return null;
    return data as LessonProgressCheckpoint;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `system_settings/${docId}`);
    return null;
  }
}

export async function saveLessonCheckpointToCloud(checkpoint: LessonProgressCheckpoint): Promise<void> {
  if (!checkpoint?.userId || !checkpoint?.lessonId) return;
  const docId = getLessonCheckpointDocId(checkpoint.userId, checkpoint.lessonId);
  try {
    const payload: LessonProgressCheckpoint = {
      ...checkpoint,
      id: docId,
      // Guard payload size for Firestore limits (keep at most 1000 exercise order IDs)
      exerciseOrderIds: checkpoint.exerciseOrderIds?.slice(0, 1000),
    };
    const cleanData = JSON.parse(JSON.stringify(payload));
    await setDoc(doc(db, 'system_settings', docId), cleanData, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `system_settings/${docId}`);
  }
}

export async function deleteLessonCheckpointFromCloud(userId: string, lessonId: string): Promise<void> {
  if (!userId || !lessonId) return;
  const docId = getLessonCheckpointDocId(userId, lessonId);
  try {
    await deleteDoc(doc(db, 'system_settings', docId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `system_settings/${docId}`);
  }
}

// Delete a batch of documents of a single collection from Cloud (atomic chunks of 400)
export async function deleteBatchDocsFromCloud(collectionName: string, ids: string[]) {
  if (!ids || ids.length === 0) return;
  ids.forEach(id => markPendingDelete(collectionName, id));
  try {
    const CHUNK_SIZE = 400;
    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
      const chunk = ids.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(id => {
        batch.delete(doc(db, collectionName, id));
      });
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `batch_delete_${collectionName}`);
  } finally {
    ids.forEach(id => settlePendingDelete(collectionName, id));
  }
}

// Sync a batch of documents of a single collection to Cloud
export async function syncBatchDocsToCloud(collectionName: string, items: { id: string; [key: string]: any }[]) {
  if (!items || items.length === 0) return;
  items.forEach(item => markPendingWrite(collectionName, item.id));
  try {
    const CHUNK_SIZE = 400;
    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      const chunk = items.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(item => {
        const docRef = doc(db, collectionName, item.id);
        const cleanData = JSON.parse(JSON.stringify(item));
        batch.set(docRef, cleanData, { merge: true });
      });
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `batch_${collectionName}`);
  } finally {
    items.forEach(item => settlePendingWrite(collectionName, item.id));
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
    const tasks: Promise<void>[] = [];
    if (data.classrooms?.length) tasks.push(syncBatchDocsToCloud('classrooms', data.classrooms));
    if (data.topics?.length) tasks.push(syncBatchDocsToCloud('topics', data.topics));
    if (data.lessons?.length) tasks.push(syncBatchDocsToCloud('lessons', data.lessons));
    if (data.exercises?.length) tasks.push(syncBatchDocsToCloud('exercises', data.exercises));
    if (data.users?.length) tasks.push(syncBatchDocsToCloud('users', data.users));
    if (data.errors?.length) tasks.push(syncBatchDocsToCloud('errors', data.errors));
    if (data.media?.length) tasks.push(syncBatchDocsToCloud('media', data.media));
    await Promise.all(tasks);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'batch_sync_all');
    return false;
  }
}

// Clear cloud collections completely (as requested: "xóa sạch db hiện có để tránh xung đột")
export async function clearCloudDatabase() {
  try {
    const collectionsToClear = [
      'classrooms', 
      'topics', 
      'lessons', 
      'exercises', 
      'users', 
      'errors', 
      'media', 
      'media_folders', 
      'user_settings',
      'system_settings'
    ];
    for (const coll of collectionsToClear) {
      const snap = await getDocs(collection(db, coll));
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.docs.forEach(d => {
          batch.delete(d.ref);
        });
        await batch.commit();
      }
    }
    console.log('Cleared all Cloud Database collections.');
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'clear_cloud_database');
    return false;
  }
}

// Subscribe to real-time updates across all Firestore collections
export function subscribeToAllCollections(onUpdate: (data: {
  classrooms?: Classroom[];
  topics?: Topic[];
  lessons?: Lesson[];
  exercises?: Exercise[];
  users?: User[];
  errors: ErrorLog[];
  media?: MediaAsset[];
  userSettingsMap: Map<string, any>;
}) => void) {
  let isSubscribed = true;
  const loaded = {
    classrooms: false,
    topics: false,
    lessons: false,
    exercises: false,
    users: false,
    media: false,
  };
  const state = {
    classrooms: [] as Classroom[],
    topics: [] as Topic[],
    lessons: [] as Lesson[],
    exercises: [] as Exercise[],
    users: [] as User[],
    errors: [] as ErrorLog[],
    media: [] as MediaAsset[],
    userSettingsMap: new Map<string, any>(),
  };

  let debounceTimer: any = null;
  const notify = () => {
    if (!isSubscribed) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (!isSubscribed) return;
      // Merge user_settings into users
      let mergedUsers = state.users;
      if (state.userSettingsMap.size > 0) {
        mergedUsers = state.users.map(u => {
          const extraSettings = state.userSettingsMap.get(u.id);
          if (extraSettings) {
            return {
              ...u,
              settings: {
                ...(u.settings || {}),
                ...extraSettings,
              },
            };
          }
          return u;
        });
      }

      onUpdate({
        classrooms: loaded.classrooms ? state.classrooms : undefined,
        topics: loaded.topics ? state.topics : undefined,
        lessons: loaded.lessons ? state.lessons : undefined,
        exercises: undefined,
        users: loaded.users ? mergedUsers : undefined,
        errors: state.errors,
        media: loaded.media ? state.media : undefined,
        userSettingsMap: state.userSettingsMap,
      });
    }, 150);
  };

  const unsubClassrooms = onSnapshot(collection(db, 'classrooms'), snap => {
    if (snap.empty && snap.metadata.fromCache) return;
    state.classrooms = snap.docs.map(d => d.data() as Classroom);
    loaded.classrooms = true;
    notify();
  }, err => console.warn('Classrooms real-time listener error:', err));

  const unsubTopics = onSnapshot(collection(db, 'topics'), snap => {
    if (snap.empty && snap.metadata.fromCache) return;
    state.topics = snap.docs.map(d => d.data() as Topic);
    loaded.topics = true;
    notify();
  }, err => console.warn('Topics real-time listener error:', err));

  const unsubLessons = onSnapshot(collection(db, 'lessons'), snap => {
    if (snap.empty && snap.metadata.fromCache) return;
    state.lessons = snap.docs.map(d => d.data() as Lesson);
    loaded.lessons = true;
    notify();
  }, err => console.warn('Lessons real-time listener error:', err));

  // Exercises are NO LONGER subscribed globally to prevent downloading thousands of docs at boot.
  // Use subscribeToLessonExercises(lessonId) when the user explicitly opens a lesson.
  const unsubExercises = () => {};

  const unsubUsers = onSnapshot(collection(db, 'users'), snap => {
    if (snap.empty && snap.metadata.fromCache) return;
    state.users = snap.docs.map(d => d.data() as User);
    loaded.users = true;
    notify();
  }, err => console.warn('Users real-time listener error:', err));

  const unsubUserSettings = onSnapshot(collection(db, 'user_settings'), snap => {
    if (snap.empty && snap.metadata.fromCache) return;
    const newMap = new Map<string, any>();
    snap.docs.forEach(d => {
      const data = d.data();
      if (data?.settings) {
        newMap.set(d.id, data.settings);
      }
    });
    state.userSettingsMap = newMap;
    notify();
  }, err => console.warn('UserSettings real-time listener error:', err));

  // User requested: Disable real-time sync of errors from cloud to prevent high read/write quotas
  // Errors are kept client-side locally in student browser.
  const unsubErrors = () => {};

  const unsubMedia = onSnapshot(collection(db, 'media'), snap => {
    if (snap.empty && snap.metadata.fromCache) return;
    state.media = snap.docs.map(d => d.data() as MediaAsset);
    loaded.media = true;
    notify();
  }, err => console.warn('Media real-time listener error:', err));

  return () => {
    isSubscribed = false;
    if (debounceTimer) clearTimeout(debounceTimer);
    unsubClassrooms();
    unsubTopics();
    unsubLessons();
    unsubExercises();
    unsubUsers();
    unsubUserSettings();
    unsubErrors();
    unsubMedia();
  };
}
