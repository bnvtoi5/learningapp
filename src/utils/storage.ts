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
  StudentPermissions
} from '../types';

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
};

export const defaultStudentPermissions: StudentPermissions = {
  canViewTheory: true,
  canPractice: true,
  canViewExplanations: true,
  canAccessErrorNotebook: true,
  canViewProgress: true,
};

const defaultAdminUser: User = {
  id: 'admin_root',
  username: 'admin',
  password: '123',
  fullName: 'Giáo viên Quản trị',
  role: 'admin',
  status: 'approved',
  registeredAt: 1700000000000,
  approvedAt: 1700000000000,
};

const initialClassrooms: Classroom[] = [
  {
    id: 'class_lop9',
    name: 'Lớp 9',
    code: 'LOP9',
    description: 'Lớp học kiến thức khối 9',
    createdAt: 1700000000000,
  },
];

export const defaultSettings: AppSettings = {
  theme: 'dark', // Optimized for mobile & eye comfort by default as requested
  fontSize: 'large', // Readable and clear on mobile
  lineSpacing: 'relaxed',
  soundEnabled: true,
  hapticEnabled: true,
  autoSpeak: false,
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

// Strictly NO pre-seeded bloated sample data as requested:
export function loadTopics(): Topic[] {
  const topics = safeParse<Topic[]>(STORAGE_KEYS.TOPICS, []);
  return Array.isArray(topics) ? topics : [];
}

export function saveTopics(topics: Topic[]) {
  localStorage.setItem(STORAGE_KEYS.TOPICS, JSON.stringify(topics || []));
}

export function loadLessons(): Lesson[] {
  const lessons = safeParse<Lesson[]>(STORAGE_KEYS.LESSONS, []);
  return Array.isArray(lessons) ? lessons : [];
}

export function saveLessons(lessons: Lesson[]) {
  localStorage.setItem(STORAGE_KEYS.LESSONS, JSON.stringify(lessons || []));
}

export function loadExercises(): Exercise[] {
  const exercises = safeParse<Exercise[]>(STORAGE_KEYS.EXERCISES, []);
  return Array.isArray(exercises) ? exercises : [];
}

export function saveExercises(exercises: Exercise[]) {
  localStorage.setItem(STORAGE_KEYS.EXERCISES, JSON.stringify(exercises || []));
}

export function loadErrors(): ErrorLog[] {
  const errors = safeParse<ErrorLog[]>(STORAGE_KEYS.ERRORS, []);
  return Array.isArray(errors) ? errors : [];
}

export function saveErrors(errors: ErrorLog[]) {
  localStorage.setItem(STORAGE_KEYS.ERRORS, JSON.stringify(errors || []));
}

export function loadStats(): UserStats {
  const raw = safeParse<UserStats>(STORAGE_KEYS.STATS, initialStats);
  const stats: UserStats = (raw && raw.skillProficiency) ? raw : { ...initialStats };
  
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

// Log an error into the notebook
export function recordError(
  exercise: Exercise,
  userAnswer: string,
  correctAnswer: string
) {
  const errors = loadErrors();
  const existingIdx = errors.findIndex(e => e.exerciseId === exercise.id && !e.resolved);

  if (existingIdx >= 0) {
    errors[existingIdx].failedCount += 1;
    errors[existingIdx].lastFailedAt = Date.now();
    errors[existingIdx].userAnswer = userAnswer;
  } else {
    const newError: ErrorLog = {
      id: 'err_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      exerciseId: exercise.id,
      exerciseType: exercise.type,
      skill: exercise.skill,
      question: exercise.question,
      userAnswer,
      correctAnswer,
      errorType: exercise.errorType || (exercise.skill === 'grammar' ? 'Grammar rule' : 'Kiến thức chung'),
      explanation: exercise.explanation || 'Chưa có lời giải thích',
      failedCount: 1,
      lastFailedAt: Date.now(),
      resolved: false,
    };
    errors.unshift(newError);
  }

  saveErrors(errors);
}

export function resolveError(errorId: string) {
  const errors = loadErrors();
  const updated = errors.map(e => e.id === errorId ? { ...e, resolved: true } : e);
  saveErrors(updated);
}

export function deleteError(errorId: string) {
  const errors = loadErrors().filter(e => e.id !== errorId);
  saveErrors(errors);
}

// Full CRUD helper operations
export function updateTopic(updatedTopic: Topic): Topic[] {
  const topics = loadTopics();
  const exists = topics.some(t => t.id === updatedTopic.id);
  const next = exists
    ? topics.map(t => t.id === updatedTopic.id ? updatedTopic : t)
    : [...topics, updatedTopic];
  saveTopics(next);
  return next;
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

export function updateExercise(updatedExercise: Exercise): Exercise[] {
  const exercises = loadExercises();
  const exists = exercises.some(e => e.id === updatedExercise.id);
  const next = exists
    ? exercises.map(e => e.id === updatedExercise.id ? updatedExercise : e)
    : [...exercises, updatedExercise];
  saveExercises(next);
  return next;
}

export function deleteExercise(exerciseId: string): Exercise[] {
  const exercises = loadExercises().filter(e => e.id !== exerciseId);
  saveExercises(exercises);
  return exercises;
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

// Export all user-created content as a JSON file
export function exportAllData(): string {
  const data = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    topics: loadTopics(),
    lessons: loadLessons(),
    exercises: loadExercises(),
    errors: loadErrors(),
    stats: loadStats(),
    settings: loadSettings(),
  };
  return JSON.stringify(data, null, 2);
}

// Import JSON data with validation
export function importData(jsonString: string): { success: boolean; message: string } {
  try {
    const data = JSON.parse(jsonString);
    if (!data || typeof data !== 'object') {
      return { success: false, message: 'File dữ liệu không đúng định dạng JSON.' };
    }

    if (Array.isArray(data.topics)) saveTopics(data.topics);
    if (Array.isArray(data.lessons)) saveLessons(data.lessons);
    if (Array.isArray(data.exercises)) saveExercises(data.exercises);
    if (Array.isArray(data.errors)) saveErrors(data.errors);
    if (Array.isArray(data.classrooms)) saveClassrooms(data.classrooms);
    if (Array.isArray(data.users)) saveUsers(data.users);
    if (data.stats) saveStats(data.stats);
    if (data.settings) saveSettings(data.settings);

    return { success: true, message: 'Nhập dữ liệu thành công!' };
  } catch {
    return { success: false, message: 'Lỗi cú pháp khi đọc file JSON.' };
  }
}

// ==========================================
// USER & CLASSROOM MANAGEMENT HELPERS
// ==========================================

export function loadUsers(): User[] {
  const raw = safeParse<User[]>(STORAGE_KEYS.USERS, [defaultAdminUser]);
  const users = Array.isArray(raw) ? raw : [defaultAdminUser];
  if (users.length === 0) {
    saveUsers([defaultAdminUser]);
    return [defaultAdminUser];
  }
  // Ensure at least 1 admin exists
  const hasAdmin = users.some(u => u && u.role === 'admin');
  if (!hasAdmin) {
    const withAdmin = [defaultAdminUser, ...users];
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
  
  // If current logged-in user was updated, sync session
  const cur = getCurrentUser();
  if (cur && cur.id === updatedUser.id) {
    setCurrentUser(updatedUser);
  }
}

export function deleteUser(userId: string) {
  const users = loadUsers();
  const next = users.filter(u => u.id !== userId);
  saveUsers(next);
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
  if (classrooms.length === 0) {
    saveClassrooms(initialClassrooms);
    return initialClassrooms;
  }
  return classrooms;
}

export function saveClassrooms(classrooms: Classroom[]) {
  localStorage.setItem(STORAGE_KEYS.CLASSROOMS, JSON.stringify(classrooms || []));
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
  const classrooms = loadClassrooms();
  const next = classrooms.filter(c => c.id !== classroomId);
  saveClassrooms(next);
}

// Wipe entire database to clean state as requested
export function clearAllDatabase() {
  localStorage.removeItem(STORAGE_KEYS.TOPICS);
  localStorage.removeItem(STORAGE_KEYS.LESSONS);
  localStorage.removeItem(STORAGE_KEYS.EXERCISES);
  localStorage.removeItem(STORAGE_KEYS.ERRORS);
  localStorage.removeItem(STORAGE_KEYS.STATS);
  localStorage.removeItem(STORAGE_KEYS.LAST_LESSON_ID);
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  saveUsers([defaultAdminUser]);
  saveClassrooms(initialClassrooms);
}

// Auto-run once to ensure user's browser starts with a 100% clean database
const DB_VERSION_TAG = 'clean_system_v3';
export function checkAndMigrateCleanDatabase() {
  const cur = localStorage.getItem('study_app_clean_tag');
  if (cur !== DB_VERSION_TAG) {
    clearAllDatabase();
    localStorage.setItem('study_app_clean_tag', DB_VERSION_TAG);
  }
}

