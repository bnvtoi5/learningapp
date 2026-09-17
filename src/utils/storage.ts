import { 
  Topic, 
  Lesson, 
  Exercise, 
  ErrorLog, 
  UserStats, 
  AppSettings, 
  SkillCategory,
  User,
  Classroom,
  StudentPermissions,
  MediaAsset,
  MediaFolder
} from '../types';

import {
  defaultStudentPermissions,
  initialClassrooms,
  initialUsers,
  initialTopics,
  initialLessons,
  initialExercises,
  initialErrors,
} from './initialData';

import {
  syncDocToCloud,
  deleteDocFromCloud,
  syncAllToCloud,
  fetchAllFromCloud,
  clearCloudDatabase,
  testFirestoreConnection,
} from '../lib/firebase';
import defaultConfig from '../../firebase-applet-config.json';

export { defaultStudentPermissions, syncDocToCloud, deleteDocFromCloud };

const STORAGE_KEYS = {
  TOPICS: 'study_app_topics',
  LESSONS: 'study_app_lessons',
  EXERCISES: 'study_app_exercises',
  ERRORS: 'study_app_errors',
  STATS: 'study_app_stats',
  SETTINGS: 'study_app_settings',
  LAST_LESSON_ID: 'study_app_last_lesson_id',
  USERS: 'study_app_users',
  CURRENT_USER: 'study_app_current_user',
  CLASSROOMS: 'study_app_classrooms',
  MEDIA: 'study_app_media_assets',
  MEDIA_FOLDERS: 'study_app_media_folders',
  CLEAN_TAG: 'study_app_clean_tag',
};

export const defaultSettings: AppSettings = {
  theme: 'dark', // Optimized for mobile & eye comfort by default as requested
  fontSize: 'large', // Readable and clear on mobile
  lineSpacing: 'relaxed',
  soundEnabled: true,
  hapticEnabled: true,
  autoSpeak: false,
  voiceGender: 'female', // Mặc định: Giọng Nữ dễ nghe, tự nhiên nhất
  voiceSpeed: 0.9, // Tốc độ chuẩn 0.9x cho người học tiếng Anh
  defaultPenaltyCount: 2, // Mặc định phải làm đúng 2 lần để gỡ lỗi sai
  mascotType: 'owl', // Linh vật Cú Học Giả mặc định
  mascotFloatingEnabled: true,
  aiProvider: 'custom',
  aiProviderType: 'gemini',
  aiModel: 'gemini-3.8-flash',
};

export const initialStats: UserStats = {
  totalCompleted: 0,
  totalCorrect: 0,
  streakDays: 1,
  lastActiveDate: new Date().toISOString().split('T')[0],
  skillProficiency: {
    vocabulary: { completed: 0, correct: 0 },
    grammar: { completed: 0, correct: 0 },
    reading: { completed: 0, correct: 0 },
    listening: { completed: 0, correct: 0 },
    speaking: { completed: 0, correct: 0 },
    writing: { completed: 0, correct: 0 },
    mixed: { completed: 0, correct: 0 },
  },
};

// Safe JSON parser
function safeParse<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item || item === 'undefined' || item === 'null') return fallback;
    const parsed = JSON.parse(item);
    if (parsed === null || parsed === undefined) return fallback;
    if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
    return parsed as T;
  } catch (e) {
    console.error(`Error reading ${key} from storage:`, e);
    return fallback;
  }
}

// -------------------------------------------------------------
// Core Storage Accessors with Self-Healing Defaults
// -------------------------------------------------------------

export function loadTopics(): Topic[] {
  const item = localStorage.getItem(STORAGE_KEYS.TOPICS);
  if (item === null) {
    saveTopics(initialTopics);
    return initialTopics;
  }
  try {
    const parsed = JSON.parse(item);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTopics(topics: Topic[]) {
  localStorage.setItem(STORAGE_KEYS.TOPICS, JSON.stringify(topics || []));
}

export function loadLessons(): Lesson[] {
  const item = localStorage.getItem(STORAGE_KEYS.LESSONS);
  if (item === null) {
    saveLessons(initialLessons);
    return initialLessons;
  }
  try {
    const parsed = JSON.parse(item);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLessons(lessons: Lesson[]) {
  localStorage.setItem(STORAGE_KEYS.LESSONS, JSON.stringify(lessons || []));
}

export function loadExercises(): Exercise[] {
  const item = localStorage.getItem(STORAGE_KEYS.EXERCISES);
  if (item === null) {
    saveExercises(initialExercises);
    return initialExercises;
  }
  try {
    const parsed = JSON.parse(item);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveExercises(exercises: Exercise[]) {
  localStorage.setItem(STORAGE_KEYS.EXERCISES, JSON.stringify(exercises || []));
}

export function loadErrors(): ErrorLog[] {
  const item = localStorage.getItem(STORAGE_KEYS.ERRORS);
  if (item === null) {
    saveErrors(initialErrors);
    return initialErrors;
  }
  try {
    const parsed = JSON.parse(item);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveErrors(errors: ErrorLog[]) {
  localStorage.setItem(STORAGE_KEYS.ERRORS, JSON.stringify(errors || []));
}

export function loadStats(userId?: string): UserStats {
  const key = userId ? `${STORAGE_KEYS.STATS}_${userId}` : STORAGE_KEYS.STATS;
  const raw = safeParse<UserStats>(key, initialStats);
  const stats: UserStats = (raw && raw.skillProficiency) ? raw : { ...initialStats };
  if (!stats.skillProficiency.mixed) {
    stats.skillProficiency.mixed = { completed: 0, correct: 0 };
  }
  
  // check streak
  const today = new Date().toISOString().split('T')[0];
  if (!stats.lastActiveDate || stats.lastActiveDate !== today) {
    const last = stats.lastActiveDate ? new Date(stats.lastActiveDate).getTime() : 0;
    const curr = new Date(today).getTime();
    const diffDays = Math.round((curr - last) / (1000 * 3600 * 24));
    if (diffDays === 1) {
      stats.streakDays = (stats.streakDays || 0) + 1;
    } else if (diffDays > 1) {
      stats.streakDays = 1;
    }
    stats.lastActiveDate = today;
    saveStats(stats, userId);
  }
  return stats;
}

export function saveStats(stats: UserStats, userId?: string) {
  const key = userId ? `${STORAGE_KEYS.STATS}_${userId}` : STORAGE_KEYS.STATS;
  localStorage.setItem(key, JSON.stringify(stats));
  if (!userId) {
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
  }
}

export function loadSettings(userId?: string): AppSettings {
  const activeUserId = userId || getCurrentUser()?.id;
  if (activeUserId) {
    const userSettingsKey = `${STORAGE_KEYS.SETTINGS}_${activeUserId}`;
    const userSpecific = safeParse<AppSettings | null>(userSettingsKey, null);
    if (userSpecific) {
      return { ...defaultSettings, ...userSpecific };
    }
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.id === activeUserId && currentUser.settings) {
      localStorage.setItem(userSettingsKey, JSON.stringify(currentUser.settings));
      return { ...defaultSettings, ...currentUser.settings };
    }
    // Also check all loaded users (e.g. synced from cloud)
    const allUsers = safeParse<User[]>(STORAGE_KEYS.USERS, []);
    const found = allUsers.find(u => u.id === activeUserId);
    if (found && found.settings) {
      localStorage.setItem(userSettingsKey, JSON.stringify(found.settings));
      return { ...defaultSettings, ...found.settings };
    }
    // Return pristine default settings for this account without leaking other accounts' keys/models
    return { ...defaultSettings };
  }
  return safeParse<AppSettings>(STORAGE_KEYS.SETTINGS, defaultSettings);
}

export function saveSettings(settings: AppSettings, userId?: string) {
  const activeUserId = userId || getCurrentUser()?.id;
  if (activeUserId) {
    const userSettingsKey = `${STORAGE_KEYS.SETTINGS}_${activeUserId}`;
    localStorage.setItem(userSettingsKey, JSON.stringify(settings));

    // Update currentUser object with new settings & sync to cloud
    const currentUser = getCurrentUser();
    let updatedUser: User | null = null;
    if (currentUser && currentUser.id === activeUserId) {
      currentUser.settings = settings;
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
      updatedUser = currentUser;
    }
    const allUsers = loadUsers();
    const updatedUsers = allUsers.map(u => {
      if (u.id === activeUserId) {
        const uWithSettings = { ...u, settings };
        if (!updatedUser) updatedUser = uWithSettings;
        return uWithSettings;
      }
      return u;
    });
    saveUsers(updatedUsers);

    // Explicitly sync to user_settings in Firestore for guaranteed multi-device persistence
    syncDocToCloud('user_settings', activeUserId, {
      userId: activeUserId,
      settings,
      updatedAt: Date.now(),
    });
    if (updatedUser) {
      syncDocToCloud('users', activeUserId, updatedUser);
    }
  } else {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    syncDocToCloud('system_settings', 'global', {
      settings,
      updatedAt: Date.now(),
    });
  }
}

export function getLastActiveLessonId(): string | null {
  return localStorage.getItem(STORAGE_KEYS.LAST_LESSON_ID);
}

export function setLastActiveLessonId(id: string) {
  localStorage.setItem(STORAGE_KEYS.LAST_LESSON_ID, id);
}

// -------------------------------------------------------------
// Student Error Notebook & Penalty/Mastery Tracking
// -------------------------------------------------------------

export function recordError(
  exercise: Exercise,
  userAnswer: string,
  correctAnswer: string,
  currentUser?: User | null
) {
  const errors = loadErrors();
  const activeUser = currentUser || getCurrentUser();
  const studentId = activeUser?.id || (activeUser?.role === 'admin' ? 'admin_preview' : 'hs_guest');
  const studentName = activeUser?.fullName || (activeUser?.role === 'admin' ? 'Giáo viên (Admin)' : 'Học sinh');
  const classroomId = activeUser?.classroomId || '';
  const defaultPenalty = loadSettings().defaultPenaltyCount || 2;

  // Match existing error for this exercise and user
  const existingIdx = errors.findIndex(
    e => e.exerciseId === exercise.id && (
      e.userId === studentId ||
      (activeUser?.role === 'student' && e.studentName && (e.studentName === activeUser.fullName || e.studentName === activeUser.username)) ||
      (!e.userId && activeUser?.role === 'admin') ||
      (e.userId === 'admin_preview' && activeUser?.role === 'admin')
    )
  );

  if (existingIdx >= 0) {
    const target = errors[existingIdx];
    target.failedCount = (target.failedCount || 0) + 1;
    target.retryAttempts = (target.retryAttempts || 0) + 1;
    // Penalty streak resets to 0 if answered wrong!
    target.currentSuccessCount = 0;
    target.lastFailedAt = Date.now();
    target.userAnswer = userAnswer;
    target.resolved = false;
    target.resolvedAt = undefined;
    target.userId = studentId;
    target.classroomId = classroomId || target.classroomId;
    target.studentName = studentName || target.studentName;
  } else {
    const newError: ErrorLog = {
      id: 'err_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      exerciseId: exercise.id,
      userId: studentId,
      studentName,
      classroomId,
      exerciseType: exercise.type,
      skill: exercise.skill,
      question: exercise.question,
      userAnswer,
      correctAnswer,
      errorType: exercise.errorType || (exercise.skill === 'grammar' ? 'Quy tắc ngữ pháp' : exercise.skill === 'mixed' ? 'Lỗi tổng hợp' : 'Kiến thức chung'),
      explanation: exercise.explanation || 'Xem lại kiến thức và công thức trong phần lý thuyết.',
      failedCount: 1,
      lastFailedAt: Date.now(),
      resolved: false,
      retryAttempts: 0,
      currentSuccessCount: 0,
      requiredSuccessCount: defaultPenalty,
    };
    errors.unshift(newError);
  }

  saveErrors(errors);
  const errorToSync = existingIdx >= 0 ? errors[existingIdx] : errors[0];
  if (errorToSync) {
    syncDocToCloud('errors', errorToSync.id, errorToSync);
  }
}

/**
 * Called when a student answers an exercise correctly.
 * If this exercise was in the student's error notebook, update the retry count and penalty streak.
 */
export function recordErrorRetrySuccess(
  exerciseId: string,
  user?: User | null
): { isErrorRetry: boolean; resolved: boolean; currentSuccessCount: number; requiredSuccessCount: number } | null {
  const errors = loadErrors();
  const activeUser = user || getCurrentUser();
  const studentId = activeUser?.id;

  // 1. Search for an UNRESOLVED error for this exercise first
  let errIdx = -1;

  if (activeUser?.role === 'student') {
    // Check by student ID or student name
    errIdx = errors.findIndex(
      e => !e.resolved && e.exerciseId === exerciseId && (
        e.userId === studentId ||
        (e.studentName && (e.studentName === activeUser.fullName || e.studentName === activeUser.username))
      )
    );

    // If not found, adopt any unassigned / guest error for this exercise
    if (errIdx === -1) {
      errIdx = errors.findIndex(
        e => !e.resolved && e.exerciseId === exerciseId && (!e.userId || e.userId === 'hs_guest')
      );
      if (errIdx >= 0) {
        errors[errIdx].userId = studentId;
        errors[errIdx].studentName = activeUser.fullName;
        errors[errIdx].classroomId = activeUser.classroomId || errors[errIdx].classroomId;
      }
    }
  } else if (activeUser?.role === 'admin') {
    // Admin reviewing or practicing
    errIdx = errors.findIndex(
      e => !e.resolved && e.exerciseId === exerciseId && (
        e.userId === 'admin_preview' ||
        e.userId === studentId ||
        !e.userId
      )
    );
    if (errIdx === -1) {
      // Admin practicing any unresolved error
      errIdx = errors.findIndex(e => !e.resolved && e.exerciseId === exerciseId);
    }
  } else {
    // Fallback: any unresolved error for this exercise
    errIdx = errors.findIndex(e => !e.resolved && e.exerciseId === exerciseId);
  }

  // If still no unresolved error found, find the most recent resolved error to count additional retries
  if (errIdx === -1) {
    errIdx = errors.findIndex(e => e.exerciseId === exerciseId);
  }

  if (errIdx === -1) return null;

  const err = errors[errIdx];
  const required = err.requiredSuccessCount || loadSettings().defaultPenaltyCount || 2;
  err.retryAttempts = (err.retryAttempts || 0) + 1;
  err.currentSuccessCount = (err.currentSuccessCount || 0) + 1;

  if (err.currentSuccessCount >= required) {
    err.resolved = true;
    err.resolvedAt = Date.now();
  }

  saveErrors(errors);
  syncDocToCloud('errors', err.id, err);
  return {
    isErrorRetry: true,
    resolved: err.resolved,
    currentSuccessCount: err.currentSuccessCount,
    requiredSuccessCount: required,
  };
}

export function updateErrorPenalty(errorId: string, requiredCount: number) {
  const errors = loadErrors();
  const count = Math.max(1, Math.min(10, requiredCount));
  const updated = errors.map(e => {
    if (e.id !== errorId) return e;
    const isNowResolved = (e.currentSuccessCount || 0) >= count;
    return {
      ...e,
      requiredSuccessCount: count,
      resolved: isNowResolved,
      resolvedAt: isNowResolved ? (e.resolvedAt || Date.now()) : undefined,
    };
  });
  saveErrors(updated);
  const changed = updated.find(e => e.id === errorId);
  if (changed) {
    syncDocToCloud('errors', errorId, changed);
  }
  return updated;
}

export function resetErrorProgress(errorId: string) {
  const errors = loadErrors();
  const updated = errors.map(e => {
    if (e.id !== errorId) return e;
    return {
      ...e,
      currentSuccessCount: 0,
      resolved: false,
      resolvedAt: undefined,
    };
  });
  saveErrors(updated);
  return updated;
}

export function resolveError(errorId: string) {
  const errors = loadErrors();
  const updated = errors.map(e => {
    if (e.id !== errorId) return e;
    const req = e.requiredSuccessCount || 2;
    return {
      ...e,
      resolved: true,
      currentSuccessCount: req,
      resolvedAt: Date.now(),
    };
  });
  saveErrors(updated);
}

export function deleteError(errorId: string) {
  const errors = loadErrors().filter(e => e.id !== errorId);
  saveErrors(errors);
  deleteDocFromCloud('errors', errorId);
}

export function bulkDeleteErrors(errorIds: string[]): ErrorLog[] {
  const idSet = new Set(errorIds);
  const updated = loadErrors().filter(e => !idSet.has(e.id));
  saveErrors(updated);
  errorIds.forEach(id => deleteDocFromCloud('errors', id));
  return updated;
}

export function bulkResetResolvedErrors(errorIds: string[]): ErrorLog[] {
  const idSet = new Set(errorIds);
  const updated = loadErrors().map(e => {
    // Only reset items that are in the target list AND are completed (resolved)
    if (idSet.has(e.id) && e.resolved) {
      return {
        ...e,
        currentSuccessCount: 0,
        resolved: false,
        resolvedAt: undefined,
      };
    }
    return e;
  });
  saveErrors(updated);
  return updated;
}

// -------------------------------------------------------------
// CRUD Helpers for Topics, Lessons, Exercises
// -------------------------------------------------------------

export function updateTopic(updatedTopic: Topic): Topic[] {
  const topics = loadTopics();
  const exists = topics.some(t => t.id === updatedTopic.id);
  const next = exists
    ? topics.map(t => t.id === updatedTopic.id ? updatedTopic : t)
    : [...topics, updatedTopic];
  saveTopics(next);
  syncDocToCloud('topics', updatedTopic.id, updatedTopic);
  return next;
}

export function deleteTopic(topicId: string) {
  return deleteTopicCascade(topicId);
}

export function updateLesson(updatedLesson: Lesson): Lesson[] {
  const lessons = loadLessons();
  const exists = lessons.some(l => l.id === updatedLesson.id);
  const next = exists
    ? lessons.map(l => l.id === updatedLesson.id ? updatedLesson : l)
    : [...lessons, updatedLesson];
  saveLessons(next);
  syncDocToCloud('lessons', updatedLesson.id, updatedLesson);
  return next;
}

export function deleteLesson(lessonId: string) {
  return deleteLessonCascade(lessonId);
}

export function updateExercise(updatedExercise: Exercise): Exercise[] {
  const exercises = loadExercises();
  const exists = exercises.some(e => e.id === updatedExercise.id);
  const next = exists
    ? exercises.map(e => e.id === updatedExercise.id ? updatedExercise : e)
    : [...exercises, updatedExercise];
  saveExercises(next);
  syncDocToCloud('exercises', updatedExercise.id, updatedExercise);
  return next;
}

export function deleteExercise(exerciseId: string) {
  return deleteExerciseCascade(exerciseId);
}

export function reorderTopics(orderedTopics: Topic[]): Topic[] {
  const currentTopics = loadTopics();
  const orderMap = new Map<string, number>();
  orderedTopics.forEach((t, idx) => orderMap.set(t.id, idx));

  const next = currentTopics.map(t => {
    if (orderMap.has(t.id)) {
      return { ...t, order: orderMap.get(t.id)! };
    }
    return t;
  });

  saveTopics(next);
  return next;
}

export function reorderLessons(orderedLessons: Lesson[]): Lesson[] {
  const currentLessons = loadLessons();
  const orderMap = new Map<string, number>();
  orderedLessons.forEach((l, idx) => orderMap.set(l.id, idx));

  const next = currentLessons.map(l => {
    if (orderMap.has(l.id)) {
      return { ...l, order: orderMap.get(l.id)! };
    }
    return l;
  });

  saveLessons(next);
  return next;
}

export function reorderExercises(orderedExercises: Exercise[]): Exercise[] {
  const currentExercises = loadExercises();
  const orderMap = new Map<string, number>();
  orderedExercises.forEach((e, idx) => orderMap.set(e.id, idx));

  const next = currentExercises.map(e => {
    if (orderMap.has(e.id)) {
      return { ...e, order: orderMap.get(e.id)! };
    }
    return e;
  });

  saveExercises(next);
  return next;
}

// Record exercise result to update statistics
export function recordExerciseResult(skill: SkillCategory, isCorrect: boolean, currentUser?: User | null) {
  const activeUser = currentUser || getCurrentUser();
  const userId = activeUser?.id;
  const stats = loadStats(userId);
  stats.totalCompleted += 1;
  if (isCorrect) stats.totalCorrect += 1;

  if (!stats.skillProficiency[skill]) {
    stats.skillProficiency[skill] = { completed: 0, correct: 0 };
  }
  stats.skillProficiency[skill].completed += 1;
  if (isCorrect) {
    stats.skillProficiency[skill].correct += 1;
  }

  saveStats(stats, userId);
  // Also keep general fallback stats updated if admin or guest
  if (!userId) {
    saveStats(stats);
  }
}

export function getClassroomOverviewStats(
  classroomId: string,
  users: User[],
  topics: Topic[],
  lessons: Lesson[],
  exercises: Exercise[],
  errors: ErrorLog[]
) {
  const classStudents = users.filter(u => u.role === 'student' && u.classroomId === classroomId);
  const classTopics = topics.filter(t => t.classroomId === classroomId);
  const classTopicIds = new Set(classTopics.map(t => t.id));
  const classLessons = lessons.filter(l => classTopicIds.has(l.topicId));
  const classLessonIds = new Set(classLessons.map(l => l.id));
  const classExercises = exercises.filter(e => classLessonIds.has(e.lessonId));

  const classErrors = errors.filter(e => {
    if (e.classroomId === classroomId) return true;
    const student = classStudents.find(s => s.id === e.userId || (e.studentName && (s.fullName === e.studentName || s.username === e.studentName)));
    return !!student;
  });

  const activeErrors = classErrors.filter(e => !e.resolved);
  const resolvedErrors = classErrors.filter(e => e.resolved);

  let totalCompleted = 0;
  let totalCorrect = 0;

  classStudents.forEach(student => {
    const sStats = loadStats(student.id);
    totalCompleted += sStats.totalCompleted;
    totalCorrect += sStats.totalCorrect;
  });

  const accuracyRate = totalCompleted > 0 ? Math.round((totalCorrect / totalCompleted) * 100) : 0;

  return {
    totalStudents: classStudents.length,
    totalTopics: classTopics.length,
    totalLessons: classLessons.length,
    totalExercises: classExercises.length,
    totalCompleted,
    totalCorrect,
    accuracyRate,
    activeErrorsCount: activeErrors.length,
    resolvedErrorsCount: resolvedErrors.length,
  };
}

// -------------------------------------------------------------
// User & Classroom Management
// -------------------------------------------------------------

export function loadUsers(): User[] {
  const raw = safeParse<User[]>(STORAGE_KEYS.USERS, initialUsers);
  const users = Array.isArray(raw) && raw.length > 0 ? raw : initialUsers;
  // Ensure at least 1 admin exists
  const hasAdmin = users.some(u => u && u.role === 'admin');
  if (!hasAdmin) {
    const withAdmin = [initialUsers[0], ...users];
    saveUsers(withAdmin);
    return withAdmin;
  }
  return users;
}

export function saveUsers(users: User[]) {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users || []));
}

export function updateUser(updatedUser: User) {
  const users = loadUsers();
  const next = users.map(u => (u.id === updatedUser.id ? updatedUser : u));
  saveUsers(next);
  syncDocToCloud('users', updatedUser.id, updatedUser);
  
  const cur = getCurrentUser();
  if (cur && cur.id === updatedUser.id) {
    setCurrentUser(updatedUser);
  }
}

export function deleteUser(userId: string) {
  return deleteUserCascade(userId);
}

export function deleteUserCascade(userId: string): {
  users: User[];
  errors: ErrorLog[];
} {
  // 1. Remove user
  const users = loadUsers().filter(u => u.id !== userId);
  saveUsers(users);
  deleteDocFromCloud('users', userId);

  // 2. Cascade: remove all errors logged by this user (hs)
  const allErrors = loadErrors();
  const remainingErrors = allErrors.filter(e => e.userId !== userId);
  const deletedErrors = allErrors.filter(e => e.userId === userId);
  saveErrors(remainingErrors);
  deletedErrors.forEach(e => deleteDocFromCloud('errors', e.id));

  return { users, errors: remainingErrors };
}

export function getCurrentUser(): User | null {
  return safeParse<User | null>(STORAGE_KEYS.CURRENT_USER, null);
}

export function setCurrentUser(user: User | null) {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    if (user.settings) {
      localStorage.setItem(`${STORAGE_KEYS.SETTINGS}_${user.id}`, JSON.stringify(user.settings));
    }
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app_user_changed', { detail: user }));
  }
}

export function loadClassrooms(): Classroom[] {
  const raw = safeParse<Classroom[]>(STORAGE_KEYS.CLASSROOMS, initialClassrooms);
  const classrooms = Array.isArray(raw) ? raw : initialClassrooms;
  return classrooms;
}

export function saveClassrooms(classrooms: Classroom[]) {
  localStorage.setItem(STORAGE_KEYS.CLASSROOMS, JSON.stringify(classrooms || []));
}

export function createClassroom(newClassroom: Classroom) {
  const classrooms = loadClassrooms();
  const cleanCode = newClassroom.code.trim().toLowerCase();
  const exists = classrooms.some(c => c.code.trim().toLowerCase() === cleanCode);
  if (exists) {
    throw new Error(`Mã lớp "${newClassroom.code}" đã tồn tại trên hệ thống. Không thể tạo trùng mã lớp.`);
  }
  saveClassrooms([...classrooms, newClassroom]);
  syncDocToCloud('classrooms', newClassroom.id, newClassroom);
}

export function updateClassroom(updatedClassroom: Classroom) {
  const classrooms = loadClassrooms();
  const cleanCode = updatedClassroom.code.trim().toLowerCase();
  const duplicate = classrooms.some(c => c.id !== updatedClassroom.id && c.code.trim().toLowerCase() === cleanCode);
  if (duplicate) {
    throw new Error(`Mã lớp "${updatedClassroom.code}" đã được sử dụng bởi lớp khác.`);
  }
  const next = classrooms.map(c => (c.id === updatedClassroom.id ? updatedClassroom : c));
  saveClassrooms(next);
  syncDocToCloud('classrooms', updatedClassroom.id, updatedClassroom);
}

export function deleteClassroom(classroomId: string) {
  return deleteClassroomCascade(classroomId);
}

export function deleteClassroomCascade(classroomId: string): {
  classrooms: Classroom[];
  topics: Topic[];
  lessons: Lesson[];
  exercises: Exercise[];
  users: User[];
  errors: ErrorLog[];
} {
  // 1. Remove classroom
  const classrooms = loadClassrooms().filter(c => c.id !== classroomId);
  saveClassrooms(classrooms);
  deleteDocFromCloud('classrooms', classroomId);

  // 2. Cascade: delete all topics belonging to this class
  const allTopics = loadTopics();
  const topicsToDelete = allTopics.filter(t => t.classroomId === classroomId);
  const topicIdsToDelete = new Set(topicsToDelete.map(t => t.id));
  const remainingTopics = allTopics.filter(t => t.classroomId !== classroomId);
  saveTopics(remainingTopics);
  topicsToDelete.forEach(t => deleteDocFromCloud('topics', t.id));

  // 3. Cascade: delete all lessons belonging to those topics
  const allLessons = loadLessons();
  const lessonsToDelete = allLessons.filter(l => topicIdsToDelete.has(l.topicId));
  const lessonIdsToDelete = new Set(lessonsToDelete.map(l => l.id));
  const remainingLessons = allLessons.filter(l => !topicIdsToDelete.has(l.topicId));
  saveLessons(remainingLessons);
  lessonsToDelete.forEach(l => deleteDocFromCloud('lessons', l.id));

  // 4. Cascade: delete all exercises belonging to those lessons
  const allExercises = loadExercises();
  const exercisesToDelete = allExercises.filter(e => lessonIdsToDelete.has(e.lessonId));
  const exerciseIdsToDelete = new Set(exercisesToDelete.map(e => e.id));
  const remainingExercises = allExercises.filter(e => !lessonIdsToDelete.has(e.lessonId));
  saveExercises(remainingExercises);
  exercisesToDelete.forEach(e => deleteDocFromCloud('exercises', e.id));

  // 5. Cascade: delete all student accounts belonging to this class
  const allUsers = loadUsers();
  const usersToDelete = allUsers.filter(u => u.classroomId === classroomId);
  const deletedUserIds = new Set(usersToDelete.map(u => u.id));
  const remainingUsers = allUsers.filter(u => u.classroomId !== classroomId);
  saveUsers(remainingUsers);
  usersToDelete.forEach(u => deleteDocFromCloud('users', u.id));

  // 6. Cascade: delete all error logs belonging to: this classroom OR deleted students OR deleted exercises
  const allErrors = loadErrors();
  const remainingErrors = allErrors.filter(err => {
    if (err.classroomId === classroomId) return false;
    if (err.userId && deletedUserIds.has(err.userId)) return false;
    if (exerciseIdsToDelete.has(err.exerciseId)) return false;
    return true;
  });
  const errorsToDelete = allErrors.filter(err => !remainingErrors.includes(err));
  saveErrors(remainingErrors);
  errorsToDelete.forEach(e => deleteDocFromCloud('errors', e.id));

  return {
    classrooms,
    topics: remainingTopics,
    lessons: remainingLessons,
    exercises: remainingExercises,
    users: remainingUsers,
    errors: remainingErrors,
  };
}

export function deleteTopicCascade(topicId: string): {
  topics: Topic[];
  lessons: Lesson[];
  exercises: Exercise[];
  errors: ErrorLog[];
} {
  const topics = loadTopics().filter(t => t.id !== topicId);
  saveTopics(topics);
  deleteDocFromCloud('topics', topicId);

  const allLessons = loadLessons();
  const childLessons = allLessons.filter(l => l.topicId === topicId);
  const childLessonIds = new Set(childLessons.map(l => l.id));
  const remainingLessons = allLessons.filter(l => l.topicId !== topicId);
  saveLessons(remainingLessons);
  childLessons.forEach(l => deleteDocFromCloud('lessons', l.id));

  const allExercises = loadExercises();
  const exercisesToDelete = allExercises.filter(e => childLessonIds.has(e.lessonId));
  const exerciseIdsToDelete = new Set(exercisesToDelete.map(e => e.id));
  const remainingExercises = allExercises.filter(e => !childLessonIds.has(e.lessonId));
  saveExercises(remainingExercises);
  exercisesToDelete.forEach(e => deleteDocFromCloud('exercises', e.id));

  const remainingErrors = loadErrors().filter(e => !exerciseIdsToDelete.has(e.exerciseId));
  const errorsToDelete = loadErrors().filter(e => exerciseIdsToDelete.has(e.exerciseId));
  saveErrors(remainingErrors);
  errorsToDelete.forEach(e => deleteDocFromCloud('errors', e.id));

  return {
    topics,
    lessons: remainingLessons,
    exercises: remainingExercises,
    errors: remainingErrors,
  };
}

export function deleteLessonCascade(lessonId: string): {
  lessons: Lesson[];
  exercises: Exercise[];
  errors: ErrorLog[];
} {
  const lessons = loadLessons().filter(l => l.id !== lessonId);
  saveLessons(lessons);
  deleteDocFromCloud('lessons', lessonId);

  const allExercises = loadExercises();
  const exercisesToDelete = allExercises.filter(e => e.lessonId === lessonId);
  const exerciseIdsToDelete = new Set(exercisesToDelete.map(e => e.id));
  const remainingExercises = allExercises.filter(e => e.lessonId !== lessonId);
  saveExercises(remainingExercises);
  exercisesToDelete.forEach(e => deleteDocFromCloud('exercises', e.id));

  const remainingErrors = loadErrors().filter(e => !exerciseIdsToDelete.has(e.exerciseId));
  const errorsToDelete = loadErrors().filter(e => exerciseIdsToDelete.has(e.exerciseId));
  saveErrors(remainingErrors);
  errorsToDelete.forEach(e => deleteDocFromCloud('errors', e.id));

  return {
    lessons,
    exercises: remainingExercises,
    errors: remainingErrors,
  };
}

export function deleteExerciseCascade(exerciseId: string): {
  exercises: Exercise[];
  errors: ErrorLog[];
} {
  const exercises = loadExercises().filter(e => e.id !== exerciseId);
  saveExercises(exercises);
  deleteDocFromCloud('exercises', exerciseId);

  const remainingErrors = loadErrors().filter(e => e.exerciseId !== exerciseId);
  const errorsToDelete = loadErrors().filter(e => e.exerciseId === exerciseId);
  saveErrors(remainingErrors);
  errorsToDelete.forEach(e => deleteDocFromCloud('errors', e.id));

  return {
    exercises,
    errors: remainingErrors,
  };
}

// -------------------------------------------------------------
// Bulk Operations: Topics, Lessons, Exercises (Move, Duplicate, Delete)
// -------------------------------------------------------------

export function bulkDeleteTopics(topicIds: string[]): {
  topics: Topic[];
  lessons: Lesson[];
  exercises: Exercise[];
  errors: ErrorLog[];
} {
  const topicIdSet = new Set(topicIds);
  const allTopics = loadTopics();
  const topics = allTopics.filter(t => !topicIdSet.has(t.id));
  saveTopics(topics);
  topicIds.forEach(id => deleteDocFromCloud('topics', id));

  const allLessons = loadLessons();
  const lessonsToDelete = allLessons.filter(l => topicIdSet.has(l.topicId));
  const lessonIdsToDelete = new Set(lessonsToDelete.map(l => l.id));
  const remainingLessons = allLessons.filter(l => !topicIdSet.has(l.topicId));
  saveLessons(remainingLessons);
  lessonsToDelete.forEach(l => deleteDocFromCloud('lessons', l.id));

  const allExercises = loadExercises();
  const exercisesToDelete = allExercises.filter(e => lessonIdsToDelete.has(e.lessonId));
  const exerciseIdsToDelete = new Set(exercisesToDelete.map(e => e.id));
  const remainingExercises = allExercises.filter(e => !lessonIdsToDelete.has(e.lessonId));
  saveExercises(remainingExercises);
  exercisesToDelete.forEach(e => deleteDocFromCloud('exercises', e.id));

  const allErrors = loadErrors();
  const remainingErrors = allErrors.filter(e => !exerciseIdsToDelete.has(e.exerciseId));
  const errorsToDelete = allErrors.filter(e => exerciseIdsToDelete.has(e.exerciseId));
  saveErrors(remainingErrors);
  errorsToDelete.forEach(e => deleteDocFromCloud('errors', e.id));

  return {
    topics,
    lessons: remainingLessons,
    exercises: remainingExercises,
    errors: remainingErrors,
  };
}

export function bulkMoveTopics(topicIds: string[], targetClassroomId: string): Topic[] {
  const topicIdSet = new Set(topicIds);
  const topics = loadTopics().map(t => {
    if (topicIdSet.has(t.id)) {
      return { ...t, classroomId: targetClassroomId };
    }
    return t;
  });
  saveTopics(topics);
  return topics;
}

export function bulkDuplicateTopics(
  topicIds: string[],
  targetClassroomIds: string[]
): {
  topics: Topic[];
  lessons: Lesson[];
  exercises: Exercise[];
} {
  const allTopics = loadTopics();
  const allLessons = loadLessons();
  const allExercises = loadExercises();

  const selectedTopics = allTopics.filter(t => topicIds.includes(t.id));
  const newTopics: Topic[] = [];
  const newLessons: Lesson[] = [];
  const newExercises: Exercise[] = [];

  targetClassroomIds.forEach(classroomId => {
    selectedTopics.forEach(topic => {
      const isSameClass = topic.classroomId === classroomId;
      const newTopicId = 'topic_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const clonedTopic: Topic = {
        ...topic,
        id: newTopicId,
        classroomId,
        title: isSameClass ? `${topic.title} (Bản sao)` : topic.title,
        createdAt: Date.now(),
      };
      newTopics.push(clonedTopic);

      // Clone child lessons
      const childLessons = allLessons.filter(l => l.topicId === topic.id);
      childLessons.forEach(lesson => {
        const newLessonId = 'lesson_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const clonedLesson: Lesson = {
          ...lesson,
          id: newLessonId,
          topicId: newTopicId,
        };
        newLessons.push(clonedLesson);

        // Clone child exercises
        const childExercises = allExercises.filter(e => e.lessonId === lesson.id);
        childExercises.forEach(exercise => {
          const newExerciseId = 'ex_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
          const clonedExercise: Exercise = {
            ...exercise,
            id: newExerciseId,
            lessonId: newLessonId,
          };
          newExercises.push(clonedExercise);
        });
      });
    });
  });

  const updatedTopics = [...allTopics, ...newTopics];
  const updatedLessons = [...allLessons, ...newLessons];
  const updatedExercises = [...allExercises, ...newExercises];

  saveTopics(updatedTopics);
  saveLessons(updatedLessons);
  saveExercises(updatedExercises);

  return {
    topics: updatedTopics,
    lessons: updatedLessons,
    exercises: updatedExercises,
  };
}

export function bulkDeleteLessons(lessonIds: string[]): {
  lessons: Lesson[];
  exercises: Exercise[];
  errors: ErrorLog[];
} {
  const lessonIdSet = new Set(lessonIds);
  const allLessons = loadLessons();
  const lessons = allLessons.filter(l => !lessonIdSet.has(l.id));
  saveLessons(lessons);
  lessonIds.forEach(id => deleteDocFromCloud('lessons', id));

  const allExercises = loadExercises();
  const exercisesToDelete = allExercises.filter(e => lessonIdSet.has(e.lessonId));
  const exerciseIdsToDelete = new Set(exercisesToDelete.map(e => e.id));
  const remainingExercises = allExercises.filter(e => !lessonIdSet.has(e.lessonId));
  saveExercises(remainingExercises);
  exercisesToDelete.forEach(e => deleteDocFromCloud('exercises', e.id));

  const allErrors = loadErrors();
  const remainingErrors = allErrors.filter(e => !exerciseIdsToDelete.has(e.exerciseId));
  const errorsToDelete = allErrors.filter(e => exerciseIdsToDelete.has(e.exerciseId));
  saveErrors(remainingErrors);
  errorsToDelete.forEach(e => deleteDocFromCloud('errors', e.id));

  return {
    lessons,
    exercises: remainingExercises,
    errors: remainingErrors,
  };
}

export function bulkMoveLessons(lessonIds: string[], targetTopicId: string): Lesson[] {
  const lessonIdSet = new Set(lessonIds);
  const lessons = loadLessons().map(l => {
    if (lessonIdSet.has(l.id)) {
      return { ...l, topicId: targetTopicId };
    }
    return l;
  });
  saveLessons(lessons);
  return lessons;
}

export function bulkDuplicateLessons(
  lessonIds: string[],
  targetTopicIds: string[]
): {
  lessons: Lesson[];
  exercises: Exercise[];
} {
  const allLessons = loadLessons();
  const allExercises = loadExercises();

  const selectedLessons = allLessons.filter(l => lessonIds.includes(l.id));
  const newLessons: Lesson[] = [];
  const newExercises: Exercise[] = [];

  targetTopicIds.forEach(topicId => {
    selectedLessons.forEach(lesson => {
      const isSameTopic = lesson.topicId === topicId;
      const newLessonId = 'lesson_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const clonedLesson: Lesson = {
        ...lesson,
        id: newLessonId,
        topicId,
        title: isSameTopic ? `${lesson.title} (Bản sao)` : lesson.title,
      };
      newLessons.push(clonedLesson);

      const childExercises = allExercises.filter(e => e.lessonId === lesson.id);
      childExercises.forEach(exercise => {
        const newExerciseId = 'ex_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const clonedExercise: Exercise = {
          ...exercise,
          id: newExerciseId,
          lessonId: newLessonId,
        };
        newExercises.push(clonedExercise);
      });
    });
  });

  const updatedLessons = [...allLessons, ...newLessons];
  const updatedExercises = [...allExercises, ...newExercises];

  saveLessons(updatedLessons);
  saveExercises(updatedExercises);

  return {
    lessons: updatedLessons,
    exercises: updatedExercises,
  };
}

export function bulkDeleteExercises(exerciseIds: string[]): {
  exercises: Exercise[];
  errors: ErrorLog[];
} {
  const exerciseIdSet = new Set(exerciseIds);
  const allExercises = loadExercises();
  const exercises = allExercises.filter(e => !exerciseIdSet.has(e.id));
  saveExercises(exercises);
  exerciseIds.forEach(id => deleteDocFromCloud('exercises', id));

  const allErrors = loadErrors();
  const remainingErrors = allErrors.filter(e => !exerciseIdSet.has(e.exerciseId));
  const errorsToDelete = allErrors.filter(e => exerciseIdSet.has(e.exerciseId));
  saveErrors(remainingErrors);
  errorsToDelete.forEach(e => deleteDocFromCloud('errors', e.id));

  return {
    exercises,
    errors: remainingErrors,
  };
}

export function bulkMoveExercises(exerciseIds: string[], targetLessonId: string): Exercise[] {
  const exerciseIdSet = new Set(exerciseIds);
  const exercises = loadExercises().map(e => {
    if (exerciseIdSet.has(e.id)) {
      return { ...e, lessonId: targetLessonId };
    }
    return e;
  });
  saveExercises(exercises);
  return exercises;
}

export function bulkDuplicateExercises(
  exerciseIds: string[],
  targetLessonIds: string[]
): Exercise[] {
  const allExercises = loadExercises();
  const selectedExercises = allExercises.filter(e => exerciseIds.includes(e.id));
  const newExercises: Exercise[] = [];

  targetLessonIds.forEach(lessonId => {
    selectedExercises.forEach(exercise => {
      const isSameLesson = exercise.lessonId === lessonId;
      const newExerciseId = 'ex_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const clonedExercise: Exercise = {
        ...exercise,
        id: newExerciseId,
        lessonId,
        question: isSameLesson ? `${exercise.question} (Bản sao)` : exercise.question,
      };
      newExercises.push(clonedExercise);
    });
  });

  const updatedExercises = [...allExercises, ...newExercises];
  saveExercises(updatedExercises);
  return updatedExercises;
}

// -------------------------------------------------------------
// Database Reset & Self-Healing Cloud Migration
// -------------------------------------------------------------

export async function clearAllDatabase(clearCloud = false) {
  // Clear all structured storage items
  localStorage.removeItem(STORAGE_KEYS.TOPICS);
  localStorage.removeItem(STORAGE_KEYS.LESSONS);
  localStorage.removeItem(STORAGE_KEYS.EXERCISES);
  localStorage.removeItem(STORAGE_KEYS.ERRORS);
  localStorage.removeItem(STORAGE_KEYS.STATS);
  localStorage.removeItem(STORAGE_KEYS.LAST_LESSON_ID);
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  localStorage.removeItem(STORAGE_KEYS.CLASSROOMS);
  localStorage.removeItem(STORAGE_KEYS.MEDIA);
  localStorage.removeItem(STORAGE_KEYS.MEDIA_FOLDERS);

  // Clear all user-specific settings and chat history keys
  if (typeof window !== 'undefined' && window.localStorage) {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (
        k.startsWith(`${STORAGE_KEYS.SETTINGS}_`) || 
        k.startsWith('study_app_chat_') || 
        k.startsWith('study_app_ai_key_')
      )) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  }

  // Clear cloud database if requested
  if (clearCloud) {
    await clearCloudDatabase();
  }

  // Set pristine initial state
  saveUsers(initialUsers);
  saveClassrooms(initialClassrooms);
  saveTopics(initialTopics);
  saveLessons(initialLessons);
  saveExercises(initialExercises);
  saveErrors(initialErrors);
  saveStats(initialStats);

  // Ensure NO user is logged in by default - visitor must explicitly log in via AuthScreen
  setCurrentUser(null);

  if (clearCloud && initialUsers[0]) {
    await syncDocToCloud('users', initialUsers[0].id, initialUsers[0]);
  }
}

export function exportAllData(): string {
  const data = {
    version: '3.0',
    exportedAt: new Date().toISOString(),
    topics: loadTopics(),
    lessons: loadLessons(),
    exercises: loadExercises(),
    errors: loadErrors(),
    stats: loadStats(),
    users: loadUsers(),
    classrooms: loadClassrooms(),
    settings: loadSettings(),
  };
  return JSON.stringify(data, null, 2);
}

export function importData(jsonString: string): { success: boolean; message?: string; error?: string } {
  try {
    const data = JSON.parse(jsonString);
    if (!data || typeof data !== 'object') {
      return { success: false, message: 'Dữ liệu JSON không đúng định dạng.', error: 'Dữ liệu JSON không đúng định dạng.' };
    }
    if (Array.isArray(data.topics)) saveTopics(data.topics);
    if (Array.isArray(data.lessons)) saveLessons(data.lessons);
    if (Array.isArray(data.exercises)) saveExercises(data.exercises);
    if (Array.isArray(data.errors)) saveErrors(data.errors);
    if (data.stats) saveStats(data.stats);
    if (Array.isArray(data.users)) saveUsers(data.users);
    if (Array.isArray(data.classrooms)) saveClassrooms(data.classrooms);
    if (data.settings) saveSettings(data.settings);
    return { success: true, message: 'Nhập dữ liệu thành công!' };
  } catch (e: any) {
    const msg = e.message || 'Lỗi xử lý dữ liệu JSON.';
    return { success: false, message: msg, error: msg };
  }
}

const DB_VERSION_TAG = `clean_auth_required_proj_${defaultConfig.projectId || 'learning-3ac9a'}_v3`;
export async function checkAndMigrateCleanDatabase() {
  const cur = localStorage.getItem(STORAGE_KEYS.CLEAN_TAG);
  if (cur !== DB_VERSION_TAG) {
    console.log(`[Storage] Switched to Firebase project: ${defaultConfig.projectId}. Resetting local cache to pristine state (requiring login).`);
    await clearAllDatabase(false);
    localStorage.setItem(STORAGE_KEYS.CLEAN_TAG, DB_VERSION_TAG);
  }
}

// -------------------------------------------------------------
// Two-way Cloud Synchronization
// -------------------------------------------------------------

export async function syncDatabaseWithCloud(onDataChanged?: () => void): Promise<{
  connected: boolean;
  synced: boolean;
  message: string;
}> {
  try {
    const isOnline = await testFirestoreConnection();
    if (!isOnline) {
      return { connected: false, synced: false, message: 'Chế độ ngoại tuyến (Offline)' };
    }

    const cloudData = await fetchAllFromCloud();
    if (!cloudData) {
      return { connected: true, synced: false, message: 'Không thể tải dữ liệu đám mây' };
    }

    if (cloudData.hasData) {
      // Cloud has existing data -> update LocalStorage to perfectly mirror cloud
      localStorage.setItem(STORAGE_KEYS.CLASSROOMS, JSON.stringify(cloudData.classrooms || []));
      localStorage.setItem(STORAGE_KEYS.TOPICS, JSON.stringify(cloudData.topics || []));
      localStorage.setItem(STORAGE_KEYS.LESSONS, JSON.stringify(cloudData.lessons || []));
      localStorage.setItem(STORAGE_KEYS.EXERCISES, JSON.stringify(cloudData.exercises || []));
      if (cloudData.users && cloudData.users.length > 0) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(cloudData.users));
        
        // Sync individual user settings in LocalStorage for each user
        cloudData.users.forEach(u => {
          if (u.settings) {
            localStorage.setItem(`${STORAGE_KEYS.SETTINGS}_${u.id}`, JSON.stringify(u.settings));
          }
        });

        // If current user is logged in, refresh currentUser with latest cloud user info and fire event
        const cur = getCurrentUser();
        if (cur) {
          const freshUser = cloudData.users.find(u => u.id === cur.id);
          if (freshUser) {
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(freshUser));
            if (freshUser.settings) {
              localStorage.setItem(`${STORAGE_KEYS.SETTINGS}_${freshUser.id}`, JSON.stringify(freshUser.settings));
            }
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('app_user_changed', { detail: freshUser }));
            }
          }
        }
      }
      localStorage.setItem(STORAGE_KEYS.ERRORS, JSON.stringify(cloudData.errors || []));
      localStorage.setItem(STORAGE_KEYS.MEDIA, JSON.stringify(cloudData.media || []));
      if (onDataChanged) {
        onDataChanged();
      }
      return { connected: true, synced: true, message: 'Đã đồng bộ thời gian thực từ Cloud Firestore' };
    } else {
      // Cloud is empty -> Push local data (admin account & clean collections) to cloud
      await syncAllToCloud({
        users: loadUsers(),
        classrooms: loadClassrooms(),
        topics: loadTopics(),
        lessons: loadLessons(),
        exercises: loadExercises(),
        errors: loadErrors(),
        media: loadMediaAssets(),
      });
      return { connected: true, synced: true, message: 'Đã khởi tạo dữ liệu lên Cloud Firestore' };
    }
  } catch (err) {
    console.warn('Sync database with cloud failed:', err);
    return { connected: false, synced: false, message: 'Lỗi kết nối đám mây' };
  }
}

// Media Assets Storage (Images & Audio files)
export function loadMediaAssets(): MediaAsset[] {
  const data = localStorage.getItem(STORAGE_KEYS.MEDIA);
  if (!data) {
    const sampleAssets: MediaAsset[] = [
      {
        id: 'media_sample_audio_1',
        type: 'audio',
        name: 'Phát âm mẫu: Present Simple (Thì HTĐ)',
        url: '',
        createdAt: Date.now() - 100000,
      },
      {
        id: 'media_sample_img_1',
        type: 'image',
        name: 'Sơ đồ thì hiện tại đơn (Timeline)',
        url: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
        createdAt: Date.now() - 200000,
      }
    ];
    saveMediaAssets(sampleAssets);
    return sampleAssets;
  }
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveMediaAssets(assets: MediaAsset[]): void {
  try {
    const safeAssets = (assets || []).map(a => {
      if (a.url && a.url.startsWith('data:') && a.url.length > 500) {
        return { ...a, url: `idb:${a.id}` };
      }
      return a;
    });
    localStorage.setItem(STORAGE_KEYS.MEDIA, JSON.stringify(safeAssets));
  } catch (err) {
    console.warn('LocalStorage saveMediaAssets error:', err);
  }
}

export function addMediaAsset(asset: MediaAsset): MediaAsset[] {
  const assets = loadMediaAssets();
  const next = [asset, ...assets];
  saveMediaAssets(next);
  syncDocToCloud('media', asset.id, asset);
  return next;
}

export function deleteMediaAsset(assetId: string): MediaAsset[] {
  const assets = loadMediaAssets();
  const next = assets.filter(a => a.id !== assetId);
  saveMediaAssets(next);
  deleteDocFromCloud('media', assetId);
  return next;
}

// Media Folder Management
export function loadMediaFolders(): MediaFolder[] {
  const data = localStorage.getItem(STORAGE_KEYS.MEDIA_FOLDERS);
  if (!data) {
    const defaultFolders: MediaFolder[] = [
      { id: 'folder_audio_dialogs', name: 'Hội thoại & Phát âm', color: '#10b981', createdAt: Date.now() - 300000 },
      { id: 'folder_vocab_images', name: 'Hình ảnh từ vựng', color: '#3b82f6', createdAt: Date.now() - 200000 },
      { id: 'folder_grammar_charts', name: 'Sơ đồ ngữ pháp', color: '#f59e0b', createdAt: Date.now() - 100000 },
    ];
    saveMediaFolders(defaultFolders);
    return defaultFolders;
  }
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveMediaFolders(folders: MediaFolder[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MEDIA_FOLDERS, JSON.stringify(folders || []));
  } catch (err) {
    console.warn('LocalStorage saveMediaFolders error:', err);
  }
}

export function createMediaFolder(name: string, color?: string): MediaFolder {
  const folders = loadMediaFolders();
  const newFolder: MediaFolder = {
    id: 'folder_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    name: name.trim() || 'Thư mục mới',
    color: color || '#10b981',
    createdAt: Date.now(),
  };
  const next = [...folders, newFolder];
  saveMediaFolders(next);
  syncDocToCloud('media_folders', newFolder.id, newFolder);
  return newFolder;
}

export function updateMediaAssetFolder(assetId: string, folderId?: string): MediaAsset[] {
  const assets = loadMediaAssets().map(a => {
    if (a.id === assetId) {
      return { ...a, folderId: folderId || undefined };
    }
    return a;
  });
  saveMediaAssets(assets);
  const updated = assets.find(a => a.id === assetId);
  if (updated) {
    syncDocToCloud('media', updated.id, updated);
  }
  return assets;
}

export function deleteMediaFolder(folderId: string, deleteFiles = false): {
  folders: MediaFolder[];
  assets: MediaAsset[];
} {
  const folders = loadMediaFolders().filter(f => f.id !== folderId);
  saveMediaFolders(folders);
  deleteDocFromCloud('media_folders', folderId);

  const allAssets = loadMediaAssets();
  let remainingAssets: MediaAsset[];

  if (deleteFiles) {
    // Delete files inside this folder
    const toDelete = allAssets.filter(a => a.folderId === folderId);
    remainingAssets = allAssets.filter(a => a.folderId !== folderId);
    saveMediaAssets(remainingAssets);
    toDelete.forEach(a => deleteDocFromCloud('media', a.id));
  } else {
    // Move files to root / unassigned folder
    remainingAssets = allAssets.map(a => {
      if (a.folderId === folderId) {
        return { ...a, folderId: undefined };
      }
      return a;
    });
    saveMediaAssets(remainingAssets);
  }

  return {
    folders,
    assets: remainingAssets,
  };
}

