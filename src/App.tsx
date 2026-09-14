import React, { useState, useEffect } from 'react';
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
  deleteExercise,
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
  syncDatabaseWithCloud
} from './utils/storage';

import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { TopicList } from './components/TopicList';
import { PracticeSession } from './components/PracticeSession';
import { ErrorReview } from './components/ErrorReview';
import { ProgressView } from './components/ProgressView';
import { ExerciseBuilder } from './components/ExerciseBuilder';
import { ContentManager } from './components/ContentManager';
import { SettingsModal } from './components/SettingsModal';
import { AuthScreen } from './components/AuthScreen';
import { PendingApprovalScreen } from './components/PendingApprovalScreen';
import { AdminPortal } from './components/AdminPortal';
import { AdminErrorManager } from './components/AdminErrorManager';

function MainApp() {
  const { getThemeClasses } = useTheme();
  const theme = getThemeClasses();

  // Authentication & Classrooms
  const [currentUser, setCurrentUserState] = useState<User | null>(getCurrentUser());
  const [users, setUsers] = useState<User[]>(loadUsers());
  const [classrooms, setClassrooms] = useState<Classroom[]>(loadClassrooms());

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
    setStats(loadStats());
    setUsers(loadUsers());
    setClassrooms(loadClassrooms());
  };

  useEffect(() => {
    reloadAllData();
    // Sync with Firebase Cloud Database
    syncDatabaseWithCloud(() => {
      reloadAllData();
    }).catch(err => console.warn('Cloud sync on launch:', err));
  }, []);

  // Sync current user status if changed in users list
  useEffect(() => {
    if (currentUser) {
      const refreshed = users.find(u => u.id === currentUser.id);
      if (refreshed && JSON.stringify(refreshed) !== JSON.stringify(currentUser)) {
        setCurrentUserState(refreshed);
        storageSetCurrentUser(refreshed);
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

  // Auth Handlers
  const handleLoginSuccess = (user: User) => {
    storageSetCurrentUser(user);
    setCurrentUserState(user);
    setCurrentTab('dashboard');
  };

  const handleRegisterUser = (newUser: User) => {
    const nextUsers = [...users, newUser];
    saveUsers(nextUsers);
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
      const nextUsers = users.map(u => 
        u.id === studentId ? { ...u, status: 'approved' as const, approvedAt: Date.now() } : u
      );
      saveUsers(nextUsers);
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
    storageDeleteUser(userId);
    setUsers(loadUsers());
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
    storageDeleteClassroom(classroomId);
    setClassrooms(loadClassrooms());
  };

  // Last active lesson
  const lastLessonId = getLastActiveLessonId();
  const lastActiveLesson = lessons.find(l => l.id === lastLessonId) || null;

  // Handler: Start practice (supports single question testing)
  const handleStartPractice = (
    lessonId?: string, 
    isQuick?: boolean, 
    isErrorReview?: boolean, 
    singleExercise?: Exercise
  ) => {
    // Check student permission
    if (currentUser?.role === 'student' && currentUser.permissions?.canPractice === false) {
      alert('Giáo viên tạm thời khóa phần luyện tập bài tập của bạn.');
      return;
    }

    if (singleExercise) {
      setActivePracticeExercises([singleExercise]);
      setPracticeTitle('Kiểm thử câu hỏi');
      return;
    }

    let targetExercises: Exercise[] = [];

    if (isErrorReview) {
      const studentErrors = currentUser?.role === 'student'
        ? errors.filter(e => !e.resolved && (e.userId === currentUser.id || (e.studentName && (e.studentName === currentUser.fullName || e.studentName === currentUser.username))))
        : errors.filter(e => !e.resolved);
      const unresolvedErrorIds = studentErrors.map(e => e.exerciseId);
      targetExercises = exercises.filter(e => unresolvedErrorIds.includes(e.id));
      setPracticeTitle('Ôn tập câu làm sai');
    } else if (lessonId) {
      targetExercises = exercises.filter(e => e.lessonId === lessonId);
      const targetLesson = lessons.find(l => l.id === lessonId);
      setPracticeTitle(targetLesson ? `Luyện tập: ${targetLesson.title}` : 'Phiên luyện tập');
      setLastActiveLessonId(lessonId);
    } else if (isQuick) {
      // Quick mixed practice
      targetExercises = [...exercises].sort(() => Math.random() - 0.5).slice(0, 10);
      setPracticeTitle('Luyện tập ngẫu nhiên nhanh');
    } else {
      targetExercises = exercises.slice(0, 10);
      setPracticeTitle('Phiên luyện tập');
    }

    if (targetExercises.length === 0) {
      alert('Chưa có câu hỏi nào trong mục này. Vui lòng thêm câu hỏi mới!');
      return;
    }

    setActivePracticeExercises(targetExercises);
  };

  const handleErrorOccurred = (exercise: Exercise, userAnswer: string, correctAnswer: string) => {
    recordError(exercise, userAnswer, correctAnswer, currentUser);
    setErrors(loadErrors());
  };

  const handleSuccessExercise = (exercise: Exercise) => {
    recordExerciseResult(exercise.skill, true);
    recordErrorRetrySuccess(exercise.id, currentUser);
    setStats(loadStats());
    setErrors(loadErrors());
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
    const updatedTopics = topics.filter(t => t.id !== topicId);
    saveTopics(updatedTopics);
    setTopics(updatedTopics);

    // Also delete associated lessons and exercises
    const childLessons = lessons.filter(l => l.topicId === topicId);
    const childLessonIds = childLessons.map(l => l.id);
    const updatedLessons = lessons.filter(l => l.topicId !== topicId);
    saveLessons(updatedLessons);
    setLessons(updatedLessons);

    const updatedExercises = exercises.filter(e => !childLessonIds.includes(e.lessonId));
    saveExercises(updatedExercises);
    setExercises(updatedExercises);

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
    const updatedLessons = lessons.filter(l => l.id !== lessonId);
    saveLessons(updatedLessons);
    setLessons(updatedLessons);

    const updatedExercises = exercises.filter(e => e.lessonId !== lessonId);
    saveExercises(updatedExercises);
    setExercises(updatedExercises);
  };

  const handleUpdateLesson = (lesson: Lesson) => {
    const updated = updateLesson(lesson);
    setLessons(updated);
  };

  // Exercise Handlers
  const handleSaveExercise = (exercise: Exercise) => {
    const updated = updateExercise(exercise);
    setExercises(updated);
  };

  const handleUpdateExercise = (exercise: Exercise) => {
    const updated = updateExercise(exercise);
    setExercises(updated);
  };

  const handleDeleteExercise = (exerciseId: string) => {
    const updated = deleteExercise(exerciseId);
    setExercises(updated);
  };

  // Error Handlers
  const handleResolveError = (errorId: string) => {
    resolveError(errorId);
    setErrors(loadErrors());
  };

  const handleDeleteError = (errorId: string) => {
    deleteError(errorId);
    setErrors(loadErrors());
  };

  const handleBulkDeleteErrors = (errorIds: string[]) => {
    bulkDeleteErrors(errorIds);
    setErrors(loadErrors());
  };

  const handleBulkResetErrors = (errorIds: string[]) => {
    bulkResetResolvedErrors(errorIds);
    setErrors(loadErrors());
  };

  const handleStartReviewSession = (targetIds?: string[]) => {
    let targetExs: Exercise[] = [];
    if (targetIds && targetIds.length > 0) {
      const resolvedExerciseIds = new Set<string>();
      targetIds.forEach(id => {
        if (exercises.some(e => e.id === id)) {
          resolvedExerciseIds.add(id);
        }
        const err = errors.find(e => e.id === id || e.exerciseId === id);
        if (err) {
          resolvedExerciseIds.add(err.exerciseId);
        }
      });
      targetExs = exercises.filter(e => resolvedExerciseIds.has(e.id));
    } else {
      const studentErrors = currentUser?.role === 'student'
        ? errors.filter(e => !e.resolved && (e.userId === currentUser.id || (e.studentName && (e.studentName === currentUser.fullName || e.studentName === currentUser.username))))
        : errors.filter(e => !e.resolved);
      const activeIds = studentErrors.map(e => e.exerciseId);
      targetExs = exercises.filter(e => activeIds.includes(e.id));
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
      alert('Không tìm thấy bài tập tương ứng trong kho dữ liệu.');
      return;
    }

    setActivePracticeExercises(targetExs);
    setPracticeTitle('Luyện tập sửa lỗi sai');
  };

  const handleStartSkillPractice = (skill: SkillCategory) => {
    const skillExs = exercises.filter(e => e.skill === skill);
    if (skillExs.length === 0) {
      alert(`Chưa có câu hỏi nào thuộc kỹ năng ${skill}. Bạn có thể tạo thêm ở mục Soạn bài!`);
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

          <main className="max-w-4xl mx-auto px-4 pt-4 sm:pt-6">
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
                pendingStudentsCount={pendingCount}
              />
            )}

            {currentTab === 'topics' && (
              <TopicList
                topics={topics}
                lessons={lessons}
                exercises={exercises}
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
                onSaveTopic={handleSaveTopic}
                onSaveLesson={handleSaveLesson}
                onSaveExercise={handleSaveExercise}
                onFinished={() => setCurrentTab('manager')}
              />
            )}
          </main>

          {/* Settings Modal */}
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            onDataReload={reloadAllData}
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
