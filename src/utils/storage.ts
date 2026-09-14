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
  MediaAsset
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

export { defaultStudentPermissions };

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
  CLEAN_TAG: 'study_app_clean_tag',
};

export const defaultSettings: AppSettings = {
  theme: 'dark', // Optimized for mobile & eye comfort by default as requested
  fontSize: 'large', // Readable and clear on mobile
  lineSpacing: 'relaxed',
  soundEnabled: true,
  hapticEnabled: true,
  autoSpeak: false,
  defaultPenaltyCount: 2, // Mặc định phải làm đúng 2 lần để gỡ lỗi sai
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
  topics?.forEach(t => syncDocToCloud('topics', t.id, t));
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
  lessons?.forEach(l => syncDocToCloud('lessons', l.id, l));
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
  exercises?.forEach(e => syncDocToCloud('exercises', e.id, e));
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
  errors?.forEach(err => syncDocToCloud('errors', err.id, err));
}

export function loadStats(): UserStats {
  const raw = safeParse<UserStats>(STORAGE_KEYS.STATS, initialStats);
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
    saveStats(stats);
  }
  return stats;
}

export function saveStats(stats: UserStats) {
  localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
}

export function loadSettings(): AppSettings {
  return safeParse<AppSettings>(STORAGE_KEYS.SETTINGS, defaultSettings);
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
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
  return next;
}

export function deleteExercise(exerciseId: string) {
  return deleteExerciseCascade(exerciseId);
}

// Record exercise result to update statistics
export function recordExerciseResult(skill: SkillCategory, isCorrect: boolean) {
  const stats = loadStats();
  stats.totalCompleted += 1;
  if (isCorrect) stats.totalCorrect += 1;

  if (!stats.skillProficiency[skill]) {
    stats.skillProficiency[skill] = { completed: 0, correct: 0 };
  }
  stats.skillProficiency[skill].completed += 1;
  if (isCorrect) {
    stats.skillProficiency[skill].correct += 1;
  }

  saveStats(stats);
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
  users?.forEach(u => syncDocToCloud('users', u.id, u));
}

export function updateUser(updatedUser: User) {
  const users = loadUsers();
  const next = users.map(u => (u.id === updatedUser.id ? updatedUser : u));
  saveUsers(next);
  
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
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }
}

export function loadClassrooms(): Classroom[] {
  const raw = safeParse<Classroom[]>(STORAGE_KEYS.CLASSROOMS, initialClassrooms);
  const classrooms = Array.isArray(raw) ? raw : initialClassrooms;
  return classrooms;
}

export function saveClassrooms(classrooms: Classroom[]) {
  localStorage.setItem(STORAGE_KEYS.CLASSROOMS, JSON.stringify(classrooms || []));
  classrooms?.forEach(c => syncDocToCloud('classrooms', c.id, c));
}

export function createClassroom(newClassroom: Classroom) {
  const classrooms = loadClassrooms();
  saveClassrooms([...classrooms, newClassroom]);
}

export function updateClassroom(updatedClassroom: Classroom) {
  const classrooms = loadClassrooms();
  const next = classrooms.map(c => (c.id === updatedClassroom.id ? updatedClassroom : c));
  saveClassrooms(next);
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
// Database Reset & Self-Healing Cloud Migration
// -------------------------------------------------------------

export function clearAllDatabase(clearCloud = false) {
  localStorage.removeItem(STORAGE_KEYS.TOPICS);
  localStorage.removeItem(STORAGE_KEYS.LESSONS);
  localStorage.removeItem(STORAGE_KEYS.EXERCISES);
  localStorage.removeItem(STORAGE_KEYS.ERRORS);
  localStorage.removeItem(STORAGE_KEYS.STATS);
  localStorage.removeItem(STORAGE_KEYS.LAST_LESSON_ID);
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  localStorage.removeItem(STORAGE_KEYS.CLASSROOMS);
  localStorage.removeItem(STORAGE_KEYS.MEDIA);
  saveUsers(initialUsers);
  saveClassrooms(initialClassrooms);
  saveTopics(initialTopics);
  saveLessons(initialLessons);
  saveExercises(initialExercises);
  saveErrors(initialErrors);
  saveStats(initialStats);
  if (initialUsers[0]) {
    setCurrentUser(initialUsers[0]);
  }
  if (clearCloud) {
    clearCloudDatabase();
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

const DB_VERSION_TAG = 'clean_system_v10_firebase_cloud_ready';
export function checkAndMigrateCleanDatabase() {
  const cur = localStorage.getItem(STORAGE_KEYS.CLEAN_TAG);
  if (cur !== DB_VERSION_TAG) {
    clearAllDatabase(false);
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
    assets?.forEach(m => syncDocToCloud('media', m.id, m));
  } catch (err) {
    console.warn('LocalStorage saveMediaAssets error:', err);
  }
}

export function addMediaAsset(asset: MediaAsset): MediaAsset[] {
  const assets = loadMediaAssets();
  const next = [asset, ...assets];
  saveMediaAssets(next);
  return next;
}

export function deleteMediaAsset(assetId: string): MediaAsset[] {
  const assets = loadMediaAssets();
  const next = assets.filter(a => a.id !== assetId);
  saveMediaAssets(next);
  deleteDocFromCloud('media', assetId);
  return next;
}

