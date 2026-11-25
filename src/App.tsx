import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { 
  Topic, 
  Lesson, 
  Exercise, 
  ErrorLog, 
  UserStats, 
  SkillCategory,
  User,
  Classroom
} from './types';
import { 
  loadTopics, 
  saveTopics, 
  updateTopic,
  loadLessons, 
  saveLessons, 
  updateLesson,
  loadExercises, 
  saveExercises, 
  updateExercise,
  deleteTopic,
  deleteLesson,
  deleteExercise,
  deleteTopicCascade,
  deleteLessonCascade,
  deleteExerciseCascade,
  bulkMoveTopics,
  bulkDuplicateTopics,
  bulkDeleteTopics,
  bulkMoveLessons,
  bulkDuplicateLessons,
  bulkDeleteLessons,
  bulkMoveExercises,
  bulkDuplicateExercises,
  bulkDeleteExercises,
  reorderTopics,
  reorderLessons,
  reorderExercises,
  mergeCollectionsWithTimestamp,
  mergeLessonExercises,
  mergeLessonGroupExercises,
  mergeFetchedExercises,
  syncLessonExerciseCount,
  loadErrors, 
  saveErrors, 
  loadStats, 
  saveStats, 
  recordError, 
  resolveError, 
  deleteError, 
  recordExerciseResult,
  recordErrorRetrySuccess,
  updateErrorPenalty,
  resetErrorProgress,
  bulkDeleteErrors,
  bulkResetResolvedErrors,
  getLastActiveLessonId,
  setLastActiveLessonId,
  loadUsers,
  saveUsers,
  updateUser as storageUpdateUser,
  deleteUser as storageDeleteUser,
  loadClassrooms,
  saveClassrooms,
  createClassroom as storageCreateClassroom,
  updateClassroom as storageUpdateClassroom,
  deleteClassroom as storageDeleteClassroom,
  getCurrentUser,
  setCurrentUser as storageSetCurrentUser,
  getLocalSessionId,
  setLocalSessionId,
  syncDatabaseWithCloud,
  checkAndMigrateCleanDatabase,
  syncDocToCloud,
} from './utils/storage';
import { 
  subscribeToAllCollections,
  fetchExercisesByLessonFromCloud,
  fetchExercisesByLessonIdsFromCloud,
  fetchExercisesByIdsFromCloud,
  fetchExercisesBySkillFromCloud,
  fetchAllExercisesFromCloud,
} from './lib/firebase';

import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { TopicList } from './components/TopicList';
import { PracticeSession } from './components/PracticeSession';
import { ErrorReview } from './components/ErrorReview';
import { ProgressView } from './components/ProgressView';
import { ExerciseBuilder } from './components/ExerciseBuilder';
import { ContentManager } from './components/ContentManager';
import { SettingsModal } from './components/SettingsModal';
import { FloatingMascot } from './components/FloatingMascot';
import { AuthScreen } from './components/AuthScreen';
import { PendingApprovalScreen } from './components/PendingApprovalScreen';
import { AdminPortal } from './components/AdminPortal';
import { AdminErrorManager } from './components/AdminErrorManager';
import { checkAndSyncDailyPendingErrors } from './utils/dailyPendingErrors';

function MainApp() {
  const { getThemeClasses } = useTheme();
  const theme = getThemeClasses();

  // Authentication & Classrooms
  const [currentUser, setCurrentUserState] = useState<User | null>(() => getCurrentUser());
  const [users, setUsers] = useState<User[]>(() => loadUsers());
  const [classrooms, setClassrooms] = useState<Classroom[]>(() => loadClassrooms());

  // Navigation tab: dashboard | topics | admin | manager | builder | errors | progress
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Core Data
  const [topics, setTopics] = useState<Topic[]>(() => loadTopics());
  const [lessons, setLessons] = useState<Lesson[]>(() => loadLessons());
  const [exercises, setExercises] = useState<Exercise[]>(() => loadExercises());
  const [errors, setErrors] = useState<ErrorLog[]>(() => loadErrors());
  const [stats, setStats] = useState<UserStats>(() => loadStats());

  // Active Practice State
  const [activePracticeExercises, setActivePracticeExercises] = useState<Exercise[] | null>(null);
  const [practiceTitle, setPracticeTitle] = useState('Phiên luyện tập');
  const [isLoadingPractice, setIsLoadingPractice] = useState(false);

  // On-demand per-lesson exercise loading state
  const [loadedLessonIds, setLoadedLessonIds] = useState<Set<string>>(() => new Set());
  const loadedLessonIdsRef = useRef<Set<string>>(new Set());
  const inFlightLessonFetchesRef = useRef<Map<string, Promise<Exercise[]>>>(new Map());
  const [loadingLessonId, setLoadingLessonId] = useState<string | null>(null);

  // Selected Topic for browsing
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

  // Context passed to Builder modal/tab
  const [builderContext, setBuilderContext] = useState<{
    type: 'topic' | 'lesson' | 'exercise';
    targetId?: string;
  } | undefined>(undefined);

  // App-wide toast notification
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'error' | 'success' } | null>(null);

  const showToast = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 3500);
  };

  // Reload data from local storage
  const reloadAllData = () => {
    setTopics(loadTopics());
    setLessons(loadLessons());
    setExercises(loadExercises());
    setErrors(loadErrors());
    setStats(loadStats(currentUser?.id));
    setUsers(loadUsers());
    setClassrooms(loadClassrooms());
  };

  const syncCountForLesson = useCallback((lessonId: string, allExs: Exercise[]) => {
    if (!lessonId) return;
    const count = allExs.filter(e => e.lessonId === lessonId).length;
    const isAdminUser = getCurrentUser()?.role === 'admin';
    const updatedLessons = syncLessonExerciseCount(lessonId, count, isAdminUser);
    if (updatedLessons) {
      setLessons(updatedLessons);
    }
  }, []);

  // Load exercises strictly for 1 lesson on-demand from Cloud Firestore
  const ensureLessonExercisesLoaded = useCallback(async (lessonId: string, forceRefresh = false): Promise<Exercise[]> => {
    if (!lessonId) return loadExercises();
    if (!forceRefresh && loadedLessonIdsRef.current.has(lessonId)) {
      return loadExercises();
    }
    const existingPromise = inFlightLessonFetchesRef.current.get(lessonId);
    if (existingPromise) {
      return existingPromise;
    }

    const fetchPromise = (async () => {
      setLoadingLessonId(lessonId);
      try {
        const cloudExs = await fetchExercisesByLessonFromCloud(lessonId);
        if (cloudExs !== null) {
          const { allExercises } = mergeLessonExercises(lessonId, cloudExs);
          setExercises(allExercises);
          const nextLoaded = new Set(loadedLessonIdsRef.current);
          nextLoaded.add(lessonId);
          loadedLessonIdsRef.current = nextLoaded;
          setLoadedLessonIds(nextLoaded);
          syncCountForLesson(lessonId, allExercises);
          return allExercises;
        }
        return loadExercises();
      } finally {
        inFlightLessonFetchesRef.current.delete(lessonId);
        setLoadingLessonId(prev => (prev === lessonId ? null : prev));
      }
    })();

    inFlightLessonFetchesRef.current.set(lessonId, fetchPromise);
    return fetchPromise;
  }, [syncCountForLesson]);

  // Apply scoped real-time snapshot update for a single actively-opened lesson
  const handleLessonExercisesRealtime = useCallback((lessonId: string, cloudLessonExercises: Exercise[]) => {
    const { allExercises } = mergeLessonExercises(lessonId, cloudLessonExercises);
    setExercises(allExercises);
    if (!loadedLessonIdsRef.current.has(lessonId)) {
      const nextLoaded = new Set(loadedLessonIdsRef.current);
      nextLoaded.add(lessonId);
      loadedLessonIdsRef.current = nextLoaded;
      setLoadedLessonIds(nextLoaded);
    }
    syncCountForLesson(lessonId, allExercises);
  }, [syncCountForLesson]);

  // Load exercises on-demand for a specific list of lessons (e.g. duplicate topic or student class quick practice)
  const ensureLessonsExercisesLoaded = useCallback(async (lessonIds: string[]): Promise<Exercise[]> => {
    const missing = Array.from(new Set(lessonIds.filter(id => id && !loadedLessonIdsRef.current.has(id))));
    if (missing.length === 0) return loadExercises();
    const fetched = await fetchExercisesByLessonIdsFromCloud(missing);
    if (fetched !== null) {
      const allExercises = mergeLessonGroupExercises(missing, fetched);
      setExercises(allExercises);
      const nextLoaded = new Set(loadedLessonIdsRef.current);
      missing.forEach(id => nextLoaded.add(id));
      loadedLessonIdsRef.current = nextLoaded;
      setLoadedLessonIds(nextLoaded);
      return allExercises;
    }
    return loadExercises();
  }, []);

  useEffect(() => {
    setStats(loadStats(currentUser?.id));
  }, [currentUser?.id]);

  useEffect(() => {
    // 1. Initial local load
    reloadAllData();

    // 2. Perform clean migration if DB version updated
    checkAndMigrateCleanDatabase().then(() => {
      setCurrentUserState(getCurrentUser());
      reloadAllData();
    }).catch(e => console.warn('Clean migration error:', e));

    // 3. Initial Cloud sync
    syncDatabaseWithCloud(() => {
      reloadAllData();
    }).catch(err => console.warn('Cloud sync on launch:', err));

    // 4. Real-time live listener from Firestore across all devices and tabs
    const unsubscribe = subscribeToAllCollections((cloudData) => {
      if (cloudData.classrooms !== undefined) {
        setClassrooms(prev => {
          const { merged } = mergeCollectionsWithTimestamp(prev, cloudData.classrooms!, 'classrooms');
          localStorage.setItem('study_app_classrooms', JSON.stringify(merged));
          return merged;
        });
      }
      if (cloudData.topics !== undefined) {
        setTopics(prev => {
          const { merged } = mergeCollectionsWithTimestamp(prev, cloudData.topics!, 'topics');
          localStorage.setItem('study_app_topics', JSON.stringify(merged));
          return merged;
        });
      }
      if (cloudData.lessons !== undefined) {
        setLessons(prev => {
          const { merged } = mergeCollectionsWithTimestamp(prev, cloudData.lessons!, 'lessons');
          localStorage.setItem('study_app_lessons', JSON.stringify(merged));
          return merged;
        });
      }
      if (cloudData.exercises !== undefined) {
        setExercises(prev => {
          const { merged } = mergeCollectionsWithTimestamp(prev, cloudData.exercises!, 'exercises');
          localStorage.setItem('study_app_exercises', JSON.stringify(merged));
          return merged;
        });
      }
      // Keep errors local to prevent cloud overwriting and eliminate Firestore read/writes
      if (cloudData.users && cloudData.users.length > 0) {
        setUsers(cloudData.users);
        localStorage.setItem('study_app_users', JSON.stringify(cloudData.users));

        // Check if current user is logged in
        const cur = getCurrentUser();
        if (cur) {
          const freshUser = cloudData.users.find(u => u.id === cur.id);
          if (freshUser) {
            // Single Active Session check:
            // If the user document on cloud has a newer currentSessionId than our local sessionId,
            // this account has logged in on another device -> Kick out of this device!
            const localSessionId = getLocalSessionId();
            if (freshUser.currentSessionId && localSessionId && freshUser.currentSessionId !== localSessionId) {
              storageSetCurrentUser(null);
              setCurrentUserState(null);
              showToast('Tài khoản của bạn vừa đăng nhập ở một thiết bị khác. Thiết bị này đã tự động đăng xuất.', 'error');
              return;
            }

            // Keep settings local, do not let cloud overwrite locally stored user settings/API keys
            const localSettings = cur.settings;
            const updated = { ...freshUser, settings: localSettings };
            setCurrentUserState(updated);
            storageSetCurrentUser(updated);
          }
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Sync current user status if changed in users list
  useEffect(() => {
    if (currentUser) {
      const refreshed = users.find(u => u.id === currentUser.id);
      if (refreshed) {
        // Single Active Session check in local users state
        const localSessionId = getLocalSessionId();
        if (refreshed.currentSessionId && localSessionId && refreshed.currentSessionId !== localSessionId) {
          storageSetCurrentUser(null);
          setCurrentUserState(null);
          showToast('Tài khoản của bạn vừa đăng nhập ở một thiết bị khác. Thiết bị này đã tự động đăng xuất.', 'error');
          return;
        }

        const localSettings = currentUser.settings;
        const updated = { ...refreshed, settings: localSettings };
        if (JSON.stringify(refreshed) !== JSON.stringify(currentUser)) {
          setCurrentUserState(updated);
          storageSetCurrentUser(updated);
        }
      }
    }
  }, [users]);

  // Restrict student access to prohibited tabs
  useEffect(() => {
    if (currentUser?.role === 'student') {
      const perms = currentUser.permissions;
      if (['admin', 'manager', 'builder'].includes(currentTab)) {
        setCurrentTab('dashboard');
      }
      if (currentTab === 'errors' && perms?.canAccessErrorNotebook === false) {
        setCurrentTab('dashboard');
      }
      if (currentTab === 'progress' && perms?.canViewProgress === false) {
        setCurrentTab('dashboard');
      }
    }
  }, [currentTab, currentUser]);

  // Check and sync daily pending error reports past 23:59 VN cutoff
  useEffect(() => {
    if (currentUser && currentUser.role === 'student') {
      checkAndSyncDailyPendingErrors(currentUser, errors);
    }
  }, [currentUser?.id, errors]);

  // Auth Handlers
  const handleLoginSuccess = (user: User) => {
    // Generate unique session ID for this device session
    const sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    setLocalSessionId(sessionId);
    const userWithSession = { ...user, currentSessionId: sessionId };

    // Update cloud users so other devices will detect this new session and get kicked out
    const updatedUsers = users.map(u => (u.id === user.id ? userWithSession : u));
    saveUsers(updatedUsers);
    setUsers(updatedUsers);
    syncDocToCloud('users', user.id, userWithSession);

    storageSetCurrentUser(userWithSession, sessionId);
    setCurrentUserState(userWithSession);
    setCurrentTab('dashboard');
  };

  const handleRegisterUser = (newUser: User) => {
    const nextUsers = [...users, newUser];
    saveUsers(nextUsers);
    syncDocToCloud('users', newUser.id, newUser);
    setUsers(nextUsers);
  };

  const handleLogout = () => {
    storageSetCurrentUser(null);
    setCurrentUserState(null);
    setCurrentTab('dashboard');
  };

  const handleRefreshUserStatus = () => {
    const updatedUsers = loadUsers();
    setUsers(updatedUsers);
    if (currentUser) {
      const refreshed = updatedUsers.find(u => u.id === currentUser.id);
      if (refreshed) {
        setCurrentUserState(refreshed);
        storageSetCurrentUser(refreshed);
      }
    }
  };

  // Test helper: Switch to Admin and approve student
  const handleSwitchToAdminToApprove = (studentId: string) => {
    const adminUser = users.find(u => u.role === 'admin');
    if (adminUser) {
      // Approve this student
      let approvedUser: User | null = null;
      const nextUsers = users.map(u => {
        if (u.id === studentId) {
          approvedUser = { ...u, status: 'approved' as const, approvedAt: Date.now() };
          return approvedUser;
        }
        return u;
      });
      saveUsers(nextUsers);
      if (approvedUser) {
        syncDocToCloud('users', studentId, approvedUser);
      }
      setUsers(nextUsers);

      // Switch to admin and navigate to admin portal
      storageSetCurrentUser(adminUser);
      setCurrentUserState(adminUser);
      setCurrentTab('admin');
    }
  };

  // User & Classroom Admin Handlers
  const handleUpdateUser = (updatedUser: User) => {
    storageUpdateUser(updatedUser);
    const updatedUsers = loadUsers();
    setUsers(updatedUsers);
    if (currentUser?.id === updatedUser.id) {
      setCurrentUserState(updatedUser);
    }
  };

  const handleDeleteUser = (userId: string) => {
    const res = storageDeleteUser(userId);
    setUsers(res.users);
    setErrors(res.errors);
  };

  const handleCreateClassroom = (classroom: Classroom) => {
    storageCreateClassroom(classroom);
    setClassrooms(loadClassrooms());
  };

  const handleUpdateClassroom = (classroom: Classroom) => {
    storageUpdateClassroom(classroom);
    setClassrooms(loadClassrooms());
  };

  const handleDeleteClassroom = (classroomId: string) => {
    const res = storageDeleteClassroom(classroomId);
    setClassrooms(res.classrooms);
    setTopics(res.topics);
    setLessons(res.lessons);
    setExercises(res.exercises);
    setUsers(res.users);
    setErrors(res.errors);
  };

  // Last active lesson
  const lastLessonId = getLastActiveLessonId();
  const lastActiveLesson = lessons.find(l => l.id === lastLessonId) || null;

  // Handler: Start practice (supports single question testing & on-demand per-lesson fetching)
  const handleStartPractice = async (
    lessonId?: string, 
    isQuick?: boolean, 
    isErrorReview?: boolean, 
    singleExercise?: Exercise
  ) => {
    // Check student permission
    if (currentUser?.role === 'student' && currentUser.permissions?.canPractice === false) {
      showToast('Giáo viên tạm thời khóa phần luyện tập bài tập của bạn.', 'error');
      return;
    }

    if (singleExercise) {
      setActivePracticeExercises([singleExercise]);
      setPracticeTitle('Kiểm thử câu hỏi');
      return;
    }

    const isStudent = currentUser?.role === 'student';
    const studentTopicIds = isStudent 
      ? new Set(topics.filter(t => !t.isHidden && (!currentUser?.classroomId || t.classroomId === currentUser.classroomId)).map(t => t.id))
      : null;
    const studentLessonIds = isStudent && studentTopicIds
      ? new Set(lessons.filter(l => studentTopicIds.has(l.topicId) && !l.isHidden).map(l => l.id))
      : null;

    setIsLoadingPractice(true);
    let workingExercises = exercises;
    try {
      if (lessonId) {
        // Fetch ONLY this single clicked lesson's exercises from Firestore
        workingExercises = await ensureLessonExercisesLoaded(lessonId);
      } else if (isErrorReview) {
        const studentErrors = isStudent
          ? errors.filter(e => 
              !e.resolved && 
              (e.userId === currentUser?.id || (
                e.studentName && (
                  e.studentName.toLowerCase() === currentUser?.fullName.toLowerCase() || 
                  e.studentName.toLowerCase() === currentUser?.username.toLowerCase()
                )
              )) &&
              (!e.classroomId || e.classroomId === currentUser?.classroomId)
            )
          : errors.filter(e => !e.resolved);
        const neededIds = studentErrors.map(e => e.exerciseId).filter(Boolean);
        const missingIds = neededIds.filter(id => !workingExercises.some(ex => ex.id === id));
        if (missingIds.length > 0) {
          const fetched = await fetchExercisesByIdsFromCloud(missingIds);
          if (fetched && fetched.length > 0) {
            workingExercises = mergeFetchedExercises(fetched);
            setExercises(workingExercises);
          }
        }
      } else {
        if (isStudent && studentLessonIds) {
          workingExercises = await ensureLessonsExercisesLoaded(Array.from(studentLessonIds));
        } else {
          const allCloud = await fetchAllExercisesFromCloud();
          if (allCloud !== null) {
            const allLessonIds = lessons.map(l => l.id);
            workingExercises = mergeLessonGroupExercises(allLessonIds, allCloud);
            setExercises(workingExercises);
            const nextLoaded = new Set(loadedLessonIdsRef.current);
            allLessonIds.forEach(id => nextLoaded.add(id));
            loadedLessonIdsRef.current = nextLoaded;
            setLoadedLessonIds(nextLoaded);
          }
        }
      }
    } finally {
      setIsLoadingPractice(false);
    }

    const studentClassExercises = isStudent && studentLessonIds
      ? workingExercises.filter(e => studentLessonIds.has(e.lessonId) && !e.isHidden)
      : isStudent ? workingExercises.filter(e => !e.isHidden) : workingExercises;
    const studentExerciseIds = new Set(studentClassExercises.map(e => e.id));

    let targetExercises: Exercise[] = [];

    if (isErrorReview) {
      const studentErrors = isStudent
        ? errors.filter(e => 
            !e.resolved && 
            (e.userId === currentUser?.id || (
              e.studentName && (
                e.studentName.toLowerCase() === currentUser?.fullName.toLowerCase() || 
                e.studentName.toLowerCase() === currentUser?.username.toLowerCase()
              )
            )) &&
            (e.classroomId ? e.classroomId === currentUser?.classroomId : studentExerciseIds.has(e.exerciseId))
          )
        : errors.filter(e => !e.resolved);
      const unresolvedErrorIds = studentErrors.map(e => e.exerciseId);
      targetExercises = (isStudent ? studentClassExercises : workingExercises).filter(e => unresolvedErrorIds.includes(e.id));
      setPracticeTitle('Ôn tập câu làm sai');
    } else if (lessonId) {
      targetExercises = workingExercises.filter(e => e.lessonId === lessonId && (isStudent ? !e.isHidden : true));
      const targetLesson = lessons.find(l => l.id === lessonId);
      setPracticeTitle(targetLesson ? `Luyện tập: ${targetLesson.title}` : 'Phiên luyện tập');
      setLastActiveLessonId(lessonId);
    } else if (isQuick) {
      // Quick mixed practice strictly from student's own class pool
      targetExercises = [...studentClassExercises].sort(() => Math.random() - 0.5).slice(0, 10);
      setPracticeTitle('Luyện tập ngẫu nhiên nhanh');
    } else {
      targetExercises = studentClassExercises.slice(0, 10);
      setPracticeTitle('Phiên luyện tập');
    }

    // Order when practice is in a specific lesson
    if (lessonId) {
      const targetLesson = lessons.find(l => l.id === lessonId);
      if (targetLesson?.shuffleExercises) {
        // Teacher configured shuffle: randomize question order uniformly using Fisher-Yates
        const shuffled = [...targetExercises];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        targetExercises = shuffled;
      } else {
        // Default: strictly maintain designed order
        targetExercises.sort((a, b) => {
          if (a.order !== undefined && b.order !== undefined) {
            return a.order - b.order;
          }
          if (a.order !== undefined) return 1;
          if (b.order !== undefined) return -1;
          return 0;
        });
      }
    }

    if (targetExercises.length === 0) {
      showToast(isStudent 
        ? 'Chưa có câu hỏi nào trong bài học này. Vui lòng liên hệ Thầy/Cô!' 
        : 'Chưa có câu hỏi nào trong mục này. Vui lòng thêm câu hỏi mới!', 'info');
      return;
    }

    setActivePracticeExercises(targetExercises);
  };

  const handleErrorOccurred = (exercise: Exercise, userAnswer: string, correctAnswer: string) => {
    recordError(exercise, userAnswer, correctAnswer, currentUser);
    setErrors(loadErrors());
  };

  const handleSuccessExercise = (exercise: Exercise) => {
    recordExerciseResult(exercise.skill, true, currentUser);
    recordErrorRetrySuccess(exercise.id, currentUser);
    setStats(loadStats(currentUser?.id));
    const freshErrors = loadErrors();
    setErrors(freshErrors);
    if (currentUser && currentUser.role === 'student') {
      checkAndSyncDailyPendingErrors(currentUser, freshErrors);
    }
  };

  const handleUpdateErrorPenalty = (errorId: string, penaltyCount: number) => {
    updateErrorPenalty(errorId, penaltyCount);
    setErrors(loadErrors());
  };

  const handleResetErrorProgress = (errorId: string) => {
    resetErrorProgress(errorId);
    setErrors(loadErrors());
  };

  // Topic Handlers
  const handleSaveTopic = (topic: Topic) => {
    const updated = updateTopic(topic);
    setTopics(updated);
  };

  const handleDeleteTopic = (topicId: string) => {
    const result = deleteTopicCascade(topicId);
    setTopics(result.topics);
    setLessons(result.lessons);
    setExercises(result.exercises);
    setErrors(result.errors);

    if (selectedTopicId === topicId) {
      setSelectedTopicId(null);
    }
  };

  const handleUpdateTopic = (topic: Topic) => {
    const updated = updateTopic(topic);
    setTopics(updated);
  };

  // Lesson Handlers
  const handleSaveLesson = (lesson: Lesson) => {
    const updated = updateLesson(lesson);
    setLessons(updated);
  };

  const handleDeleteLesson = (lessonId: string) => {
    const result = deleteLessonCascade(lessonId);
    setLessons(result.lessons);
    setExercises(result.exercises);
    setErrors(result.errors);
  };

  const handleUpdateLesson = (lesson: Lesson) => {
    const updated = updateLesson(lesson);
    setLessons(updated);
  };

  // Exercise Handlers
  const handleSaveExercise = (exercise: Exercise) => {
    const updated = updateExercise(exercise);
    setExercises(updated);
    if (loadedLessonIdsRef.current.has(exercise.lessonId)) {
      syncCountForLesson(exercise.lessonId, updated);
    }
  };

  const handleUpdateExercise = (exercise: Exercise) => {
    const prevEx = exercises.find(e => e.id === exercise.id);
    const updated = updateExercise(exercise);
    setExercises(updated);
    if (loadedLessonIdsRef.current.has(exercise.lessonId)) {
      syncCountForLesson(exercise.lessonId, updated);
    }
    if (prevEx && prevEx.lessonId !== exercise.lessonId && loadedLessonIdsRef.current.has(prevEx.lessonId)) {
      syncCountForLesson(prevEx.lessonId, updated);
    }
  };

  const handleDeleteExercise = (exerciseId: string) => {
    const prevEx = exercises.find(e => e.id === exerciseId);
    const result = deleteExerciseCascade(exerciseId);
    setExercises(result.exercises);
    setErrors(result.errors);
    if (prevEx && loadedLessonIdsRef.current.has(prevEx.lessonId)) {
      syncCountForLesson(prevEx.lessonId, result.exercises);
    }
  };

  // Bulk Content Handlers
  const handleBulkMoveTopics = (topicIds: string[], targetClassroomId: string) => {
    const result = bulkMoveTopics(topicIds, targetClassroomId);
    setTopics(result);
    showToast(`Đã chuyển thành công ${topicIds.length} chủ đề sang lớp học mới!`, 'success');
  };

  const handleBulkDuplicateTopics = async (topicIds: string[], targetClassroomIds: string[]) => {
    // Ensure exercises of all lessons inside duplicated topics are loaded before cloning
    const topicIdSet = new Set(topicIds);
    const childLessonIds = lessons.filter(l => topicIdSet.has(l.topicId)).map(l => l.id);
    await ensureLessonsExercisesLoaded(childLessonIds);
    const result = bulkDuplicateTopics(topicIds, targetClassroomIds);
    setTopics(result.topics);
    setLessons(result.lessons);
    setExercises(result.exercises);
    showToast(`Đã nhân bản ${topicIds.length} chủ đề sang ${targetClassroomIds.length} lớp học!`, 'success');
  };

  const handleBulkDeleteTopics = (topicIds: string[]) => {
    const result = bulkDeleteTopics(topicIds);
    setTopics(result.topics);
    setLessons(result.lessons);
    setExercises(result.exercises);
    setErrors(result.errors);
    showToast(`Đã xóa thành công ${topicIds.length} chủ đề và các bài liên quan!`, 'info');
  };

  const handleBulkMoveLessons = (lessonIds: string[], targetTopicId: string) => {
    const result = bulkMoveLessons(lessonIds, targetTopicId);
    setLessons(result);
    showToast(`Đã chuyển thành công ${lessonIds.length} bài học sang chủ đề mới!`, 'success');
  };

  const handleBulkDuplicateLessons = async (lessonIds: string[], targetTopicIds: string[]) => {
    // Ensure exercises of all duplicated lessons are loaded before cloning
    await ensureLessonsExercisesLoaded(lessonIds);
    const result = bulkDuplicateLessons(lessonIds, targetTopicIds);
    setLessons(result.lessons);
    setExercises(result.exercises);
    showToast(`Đã nhân bản ${lessonIds.length} bài học sang ${targetTopicIds.length} chủ đề!`, 'success');
  };

  const handleBulkDeleteLessons = (lessonIds: string[]) => {
    const result = bulkDeleteLessons(lessonIds);
    setLessons(result.lessons);
    setExercises(result.exercises);
    setErrors(result.errors);
    showToast(`Đã xóa thành công ${lessonIds.length} bài học và câu hỏi liên quan!`, 'info');
  };

  const handleBulkMoveExercises = async (exerciseIds: string[], targetLessonId: string) => {
    const affectedLessonIds = new Set<string>([targetLessonId]);
    exercises.forEach(e => {
      if (exerciseIds.includes(e.id)) affectedLessonIds.add(e.lessonId);
    });
    await ensureLessonExercisesLoaded(targetLessonId);
    const result = bulkMoveExercises(exerciseIds, targetLessonId);
    setExercises(result);
    affectedLessonIds.forEach(lid => {
      if (loadedLessonIdsRef.current.has(lid)) {
        syncCountForLesson(lid, result);
      }
    });
    showToast(`Đã chuyển thành công ${exerciseIds.length} câu hỏi sang bài học mới!`, 'success');
  };

  const handleBulkDuplicateExercises = async (exerciseIds: string[], targetLessonIds: string[]) => {
    await ensureLessonsExercisesLoaded(targetLessonIds);
    const result = bulkDuplicateExercises(exerciseIds, targetLessonIds);
    setExercises(result);
    targetLessonIds.forEach(lid => {
      if (loadedLessonIdsRef.current.has(lid)) {
        syncCountForLesson(lid, result);
      }
    });
    showToast(`Đã sao chép ${exerciseIds.length} câu hỏi sang ${targetLessonIds.length} bài học!`, 'success');
  };

  const handleBulkDeleteExercises = (exerciseIds: string[]) => {
    const affectedLessonIds = new Set<string>();
    exercises.forEach(e => {
      if (exerciseIds.includes(e.id)) affectedLessonIds.add(e.lessonId);
    });
    const result = bulkDeleteExercises(exerciseIds);
    setExercises(result.exercises);
    setErrors(result.errors);
    affectedLessonIds.forEach(lid => {
      if (loadedLessonIdsRef.current.has(lid)) {
        syncCountForLesson(lid, result.exercises);
      }
    });
    showToast(`Đã xóa thành công ${exerciseIds.length} câu hỏi!`, 'info');
  };

  // Reorder Handlers
  const handleReorderTopics = (orderedTopics: Topic[]) => {
    const updated = reorderTopics(orderedTopics);
    setTopics(updated);
    showToast('Đã lưu thứ tự hiển thị Chủ đề mới!', 'success');
  };

  const handleReorderLessons = (orderedLessons: Lesson[]) => {
    const updated = reorderLessons(orderedLessons);
    setLessons(updated);
    showToast('Đã lưu thứ tự hiển thị Bài học mới!', 'success');
  };

  const handleReorderExercises = (orderedExercises: Exercise[]) => {
    const updated = reorderExercises(orderedExercises);
    setExercises(updated);
    showToast('Đã lưu thứ tự hiển thị Câu hỏi mới!', 'success');
  };

  // Error Handlers
  const handleResolveError = (errorId: string) => {
    resolveError(errorId);
    const fresh = loadErrors();
    setErrors(fresh);
    if (currentUser && currentUser.role === 'student') {
      checkAndSyncDailyPendingErrors(currentUser, fresh);
    }
  };

  const handleDeleteError = (errorId: string) => {
    deleteError(errorId);
    const fresh = loadErrors();
    setErrors(fresh);
    if (currentUser && currentUser.role === 'student') {
      checkAndSyncDailyPendingErrors(currentUser, fresh);
    }
  };

  const handleBulkDeleteErrors = (errorIds: string[]) => {
    bulkDeleteErrors(errorIds);
    setErrors(loadErrors());
  };

  const handleBulkResetErrors = (errorIds: string[]) => {
    bulkResetResolvedErrors(errorIds);
    setErrors(loadErrors());
  };

  const handleStartReviewSession = async (targetIds?: string[]) => {
    let targetExs: Exercise[] = [];
    const isStudent = currentUser?.role === 'student';
    const studentTopicIds = isStudent 
      ? new Set(topics.filter(t => currentUser?.classroomId && t.classroomId === currentUser.classroomId).map(t => t.id))
      : null;
    const studentLessonIds = isStudent && studentTopicIds
      ? new Set(lessons.filter(l => studentTopicIds.has(l.topicId)).map(l => l.id))
      : null;

    // Resolve exercise IDs we need from errors/targetIds and fetch ONLY those missing ones
    const neededExerciseIds = new Set<string>();
    if (targetIds && targetIds.length > 0) {
      targetIds.forEach(id => {
        neededExerciseIds.add(id);
        const err = errors.find(e => e.id === id || e.exerciseId === id);
        if (err) neededExerciseIds.add(err.exerciseId);
      });
    } else {
      const studentErrors = isStudent
        ? errors.filter(e => 
            !e.resolved && 
            (e.userId === currentUser.id || (
              e.studentName && (
                e.studentName.toLowerCase() === currentUser.fullName.toLowerCase() || 
                e.studentName.toLowerCase() === currentUser.username.toLowerCase()
              )
            )) &&
            (!e.classroomId || e.classroomId === currentUser?.classroomId)
          )
        : errors.filter(e => !e.resolved);
      studentErrors.forEach(e => {
        if (e.exerciseId) neededExerciseIds.add(e.exerciseId);
      });
    }

    let workingExercises = exercises;
    const missingIds = Array.from(neededExerciseIds).filter(id => !workingExercises.some(ex => ex.id === id));
    if (missingIds.length > 0) {
      setIsLoadingPractice(true);
      try {
        const fetched = await fetchExercisesByIdsFromCloud(missingIds);
        if (fetched && fetched.length > 0) {
          workingExercises = mergeFetchedExercises(fetched);
          setExercises(workingExercises);
        }
      } finally {
        setIsLoadingPractice(false);
      }
    }

    const studentClassExercises = isStudent && studentLessonIds
      ? workingExercises.filter(e => studentLessonIds.has(e.lessonId))
      : workingExercises;
    const studentExerciseIds = new Set(studentClassExercises.map(e => e.id));

    if (targetIds && targetIds.length > 0) {
      const resolvedExerciseIds = new Set<string>();
      targetIds.forEach(id => {
        if (workingExercises.some(e => e.id === id)) {
          resolvedExerciseIds.add(id);
        }
        const err = errors.find(e => e.id === id || e.exerciseId === id);
        if (err) {
          resolvedExerciseIds.add(err.exerciseId);
        }
      });
      targetExs = (isStudent ? studentClassExercises : workingExercises).filter(e => resolvedExerciseIds.has(e.id));
    } else {
      const studentErrors = isStudent
        ? errors.filter(e => 
            !e.resolved && 
            (e.userId === currentUser.id || (
              e.studentName && (
                e.studentName.toLowerCase() === currentUser.fullName.toLowerCase() || 
                e.studentName.toLowerCase() === currentUser.username.toLowerCase()
              )
            )) &&
            (e.classroomId ? e.classroomId === currentUser?.classroomId : studentExerciseIds.has(e.exerciseId))
          )
        : errors.filter(e => !e.resolved);
      const activeIds = studentErrors.map(e => e.exerciseId);
      targetExs = (isStudent ? studentClassExercises : workingExercises).filter(e => activeIds.includes(e.id));
    }

    // Fallback: If exercises were not in catalog, reconstruct cleanly from error log
    if (targetExs.length === 0 && targetIds && targetIds.length > 0) {
      const matchedErrors = errors.filter(e => targetIds.includes(e.id) || targetIds.includes(e.exerciseId));
      if (matchedErrors.length > 0) {
        targetExs = matchedErrors.map(err => ({
          id: err.exerciseId,
          lessonId: 'review',
          skill: err.skill,
          difficulty: 'guided' as const,
          type: (err.exerciseType || 'fill_blank') as any,
          question: err.question,
          correctText: err.correctAnswer,
          explanation: err.explanation,
        }));
      }
    }

    if (targetExs.length === 0) {
      showToast('Không tìm thấy bài tập tương ứng trong kho dữ liệu.', 'info');
      return;
    }

    setActivePracticeExercises(targetExs);
    setPracticeTitle('Luyện tập sửa lỗi sai');
  };

  const handleStartSkillPractice = async (skill: SkillCategory, targetClassroomId?: string) => {
    const classId = currentUser?.role === 'student' ? currentUser?.classroomId : targetClassroomId;
    setIsLoadingPractice(true);
    let workingExercises = exercises;
    try {
      const fetched = await fetchExercisesBySkillFromCloud(skill);
      if (fetched && fetched.length > 0) {
        workingExercises = mergeFetchedExercises(fetched);
        setExercises(workingExercises);
      }
    } finally {
      setIsLoadingPractice(false);
    }

    let skillExs: Exercise[] = [];

    if (classId) {
      const classTopicIds = new Set(topics.filter(t => t.classroomId === classId).map(t => t.id));
      const classLessonIds = new Set(lessons.filter(l => classTopicIds.has(l.topicId)).map(l => l.id));
      skillExs = workingExercises.filter(e => e.skill === skill && classLessonIds.has(e.lessonId));
    } else {
      skillExs = workingExercises.filter(e => e.skill === skill);
    }

    if (skillExs.length === 0) {
      showToast(`Chưa có câu hỏi nào thuộc kỹ năng ${skill} trong lớp học này. Bạn có thể tạo thêm ở mục Soạn bài!`, 'info');
      return;
    }
    setActivePracticeExercises(skillExs);
    setPracticeTitle(`Luyện tập kỹ năng: ${skill}`);
  };

  // Pending count for admin badge
  const pendingCount = users.filter(u => u.role === 'student' && u.status === 'pending').length;
  const currentClassroom = classrooms.find(c => c.id === currentUser?.classroomId);

  // =========================================================================
  // VIEW ROUTING: AUTH -> PENDING APPROVAL -> MAIN APPLICATION
  // =========================================================================

  // 1. If not logged in -> Display Auth Screen
  if (!currentUser) {
    return (
      <AuthScreen
        classrooms={classrooms}
        users={users}
        onLoginSuccess={handleLoginSuccess}
        onRegisterUser={handleRegisterUser}
      />
    );
  }

  // 2. If student is pending approval or blocked -> Display Waiting Approval Screen
  if (currentUser.role === 'student' && currentUser.status !== 'approved') {
    return (
      <PendingApprovalScreen
        user={currentUser}
        classrooms={classrooms}
        onRefreshUserStatus={handleRefreshUserStatus}
        onLogout={handleLogout}
        onSwitchToAdminToApprove={handleSwitchToAdminToApprove}
      />
    );
  }

  // 3. Approved User (Admin or Approved Student) -> Display Full App
  return (
    <div className={`min-h-screen ${theme.bg} transition-colors duration-200`}>
      {/* Active Practice Session (Immersion Mode) */}
      {activePracticeExercises ? (
        <main className="min-h-screen p-4 sm:p-6 flex flex-col justify-start">
          <PracticeSession
            exercises={activePracticeExercises}
            errors={errors}
            currentUser={currentUser}
            title={practiceTitle}
            canViewExplanations={
              currentUser.role === 'admin' || 
              currentUser.permissions?.canViewExplanations !== false
            }
            onExit={() => setActivePracticeExercises(null)}
            onComplete={() => {
              setActivePracticeExercises(null);
              const freshErrors = loadErrors();
              setErrors(freshErrors);
              if (currentUser && currentUser.role === 'student') {
                checkAndSyncDailyPendingErrors(currentUser, freshErrors);
              }
              reloadAllData();
            }}
            onErrorOccurred={handleErrorOccurred}
            onSuccessExercise={handleSuccessExercise}
          />
        </main>
      ) : (
        <>
          <Navbar
            currentTab={currentTab}
            setCurrentTab={tab => setCurrentTab(tab)}
            openSettings={() => setIsSettingsOpen(true)}
            errorCount={
              currentUser.role === 'student'
                ? errors.filter(e => !e.resolved && (e.userId === currentUser.id || (e.studentName && (e.studentName === currentUser.fullName || e.studentName === currentUser.username)))).length
                : errors.filter(e => !e.resolved).length
            }
            currentUser={currentUser}
            currentClassroom={currentClassroom}
            pendingCount={pendingCount}
            onLogout={handleLogout}
          />

          <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
            {currentTab === 'dashboard' && (
              <Dashboard
                topics={topics}
                lessons={lessons}
                exercises={exercises}
                errors={errors}
                stats={stats}
                lastActiveLesson={lastActiveLesson}
                onStartPractice={handleStartPractice}
                onNavigateTab={tab => setCurrentTab(tab)}
                onSelectTopic={topicId => {
                  setSelectedTopicId(topicId);
                  setCurrentTab('topics');
                }}
                currentUser={currentUser}
                classrooms={classrooms}
                users={users}
                pendingStudentsCount={pendingCount}
              />
            )}

            {currentTab === 'topics' && (
              <TopicList
                topics={topics}
                lessons={lessons}
                exercises={exercises}
                loadedLessonIds={loadedLessonIds}
                onLoadLessonExercises={ensureLessonExercisesLoaded}
                selectedTopicId={selectedTopicId}
                onSelectTopic={setSelectedTopicId}
                onStartPractice={handleStartPractice}
                onOpenCreateModal={(type, contextId) => {
                  setBuilderContext({ type, targetId: contextId });
                  setCurrentTab('builder');
                }}
                onSaveTopic={handleSaveTopic}
                onSaveLesson={handleSaveLesson}
                onDeleteTopic={handleDeleteTopic}
                onDeleteLesson={handleDeleteLesson}
                currentUser={currentUser}
                classrooms={classrooms}
                onNavigateToClassManager={() => setCurrentTab('admin')}
              />
            )}

            {/* Admin Portal (Only visible to Admin) */}
            {currentTab === 'admin' && currentUser.role === 'admin' && (
              <AdminPortal
                users={users}
                classrooms={classrooms}
                topics={topics}
                errors={errors}
                onUpdateUser={handleUpdateUser}
                onDeleteUser={handleDeleteUser}
                onCreateClassroom={handleCreateClassroom}
                onUpdateClassroom={handleUpdateClassroom}
                onDeleteClassroom={handleDeleteClassroom}
                onUpdateTopic={handleUpdateTopic}
                onUpdateErrorPenalty={handleUpdateErrorPenalty}
                onResetErrorProgress={handleResetErrorProgress}
                onResolveError={handleResolveError}
                onDeleteError={handleDeleteError}
              />
            )}

            {/* Content Manager (Only visible to Admin) */}
            {currentTab === 'manager' && currentUser.role === 'admin' && (
              <ContentManager
                topics={topics}
                lessons={lessons}
                exercises={exercises}
                loadedLessonIds={loadedLessonIds}
                loadingLessonId={loadingLessonId}
                onLoadLessonExercises={ensureLessonExercisesLoaded}
                onLessonExercisesRealtime={handleLessonExercisesRealtime}
                classrooms={classrooms}
                onNavigateToClassManager={() => setCurrentTab('admin')}
                onStartPractice={handleStartPractice}
                onOpenCreateModal={(type, contextId) => {
                  setBuilderContext({ type, targetId: contextId });
                  setCurrentTab('builder');
                }}
                onUpdateTopic={handleUpdateTopic}
                onDeleteTopic={handleDeleteTopic}
                onUpdateLesson={handleUpdateLesson}
                onDeleteLesson={handleDeleteLesson}
                onUpdateExercise={handleUpdateExercise}
                onDeleteExercise={handleDeleteExercise}
                onBulkMoveTopics={handleBulkMoveTopics}
                onBulkDuplicateTopics={handleBulkDuplicateTopics}
                onBulkDeleteTopics={handleBulkDeleteTopics}
                onBulkMoveLessons={handleBulkMoveLessons}
                onBulkDuplicateLessons={handleBulkDuplicateLessons}
                onBulkDeleteLessons={handleBulkDeleteLessons}
                onBulkMoveExercises={handleBulkMoveExercises}
                onBulkDuplicateExercises={handleBulkDuplicateExercises}
                onBulkDeleteExercises={handleBulkDeleteExercises}
                onReorderTopics={handleReorderTopics}
                onReorderLessons={handleReorderLessons}
                onReorderExercises={handleReorderExercises}
              />
            )}

            {/* Error Notebook / Admin Error Management */}
            {currentTab === 'errors' && (
              currentUser.role === 'admin' ? (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-1">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold tracking-tight">Sổ lỗi học sinh & Phạt làm lại</h2>
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                          {errors.filter(e => !e.resolved).length} lỗi đang phạt
                        </span>
                      </div>
                      <p className={`text-xs ${theme.textMuted} mt-0.5`}>
                        Theo dõi danh sách bài làm sai của toàn bộ học sinh theo lớp, điều chỉnh mức phạt và quản lý tiến độ hoàn thành.
                      </p>
                    </div>
                  </div>

                  <AdminErrorManager
                    errors={errors}
                    users={users}
                    classrooms={classrooms}
                    onUpdateErrorPenalty={handleUpdateErrorPenalty}
                    onResetErrorProgress={handleResetErrorProgress}
                    onResolveError={handleResolveError}
                    onDeleteError={handleDeleteError}
                    onBulkDeleteErrors={handleBulkDeleteErrors}
                    onBulkResetErrors={handleBulkResetErrors}
                  />
                </div>
              ) : currentUser.permissions?.canAccessErrorNotebook !== false ? (
                <ErrorReview
                  errors={errors}
                  topics={topics}
                  lessons={lessons}
                  exercises={exercises}
                  currentUser={currentUser}
                  onNavigateToAdminErrors={() => setCurrentTab('admin')}
                  onStartReviewSession={handleStartReviewSession}
                  onResolveError={handleResolveError}
                  onDeleteError={handleDeleteError}
                />
              ) : null
            )}

            {/* Progress View (Filtered by student permissions) */}
            {currentTab === 'progress' && (currentUser.role === 'admin' || currentUser.permissions?.canViewProgress !== false) && (
              <ProgressView
                stats={stats}
                topics={topics}
                lessons={lessons}
                exercises={exercises}
                errors={errors}
                currentUser={currentUser}
                classrooms={classrooms}
                users={users}
                onStartSkillPractice={handleStartSkillPractice}
                onNavigateToErrors={() => setCurrentTab('errors')}
              />
            )}

            {/* Exercise Builder (Only visible to Admin) */}
            {currentTab === 'builder' && currentUser.role === 'admin' && (
              <ExerciseBuilder
                topics={topics}
                lessons={lessons}
                classrooms={classrooms}
                onNavigateToClassManager={() => setCurrentTab('admin')}
                initialContext={builderContext}
                onLoadLessonExercises={ensureLessonExercisesLoaded}
                onSaveTopic={handleSaveTopic}
                onSaveLesson={handleSaveLesson}
                onSaveExercise={handleSaveExercise}
                onFinished={() => setCurrentTab('manager')}
              />
            )}
          </main>

          {/* Subtle On-Demand Practice Loader Overlay */}
          {isLoadingPractice && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center">
              <div className={`${theme.card} border ${theme.border} px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3`}>
                <div className="w-5 h-5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                <span className="text-sm font-semibold">Đang tải câu hỏi bài học...</span>
              </div>
            </div>
          )}

          {/* Floating Study Mascot Companion (powered by page-mascot with AI Chatbot) */}
          <FloatingMascot 
            currentTab={currentTab} 
            onNavigateTab={tab => setCurrentTab(tab)} 
            currentUser={currentUser}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />

          {/* Settings Modal */}
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            onDataReload={reloadAllData}
            currentUser={currentUser}
          />
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}
