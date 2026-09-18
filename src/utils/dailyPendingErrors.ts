import { collection, getDocs } from 'firebase/firestore';
import { db, syncDocToCloud, deleteDocFromCloud } from '../lib/firebase';
import { User, ErrorLog, Classroom, DailyPendingErrorReport, DailyPendingErrorSummary } from '../types';

const STORAGE_KEY_PENDING_REPORTS = 'study_app_pending_error_reports';

/**
 * Returns current Vietnam Time (UTC+7) components and formatted strings.
 */
export function getVietnamTime(timestamp: number = Date.now()): {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:mm:ss
  timestamp: number;
} {
  const date = new Date(timestamp);
  
  // Format specifically in Asia/Ho_Chi_Minh timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const getVal = (type: string) => parts.find(p => p.type === type)?.value || '0';

  const year = parseInt(getVal('year'), 10);
  const month = parseInt(getVal('month'), 10);
  const day = parseInt(getVal('day'), 10);
  const hours = parseInt(getVal('hour'), 10);
  const minutes = parseInt(getVal('minute'), 10);
  const seconds = parseInt(getVal('second'), 10);

  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return { year, month, day, hours, minutes, seconds, dateStr, timeStr, timestamp };
}

/**
 * Returns the Vietnam Date string (YYYY-MM-DD) for any timestamp.
 */
export function getVietnamDateString(timestamp: number): string {
  return getVietnamTime(timestamp).dateStr;
}

/**
 * Returns the Unix timestamp (ms) for the 23:59:59.999 Vietnam Cutoff for a given date.
 */
export function getVietnamCutoffTimestamp(dateStr: string): number {
  return new Date(`${dateStr}T23:59:59.999+07:00`).getTime();
}

/**
 * Returns true if current Vietnam time has passed 23:59 on the given dateStr,
 * or if dateStr belongs to a past day in Vietnam.
 */
export function isVietnamCutoffPassed(dateStr: string, currentTimestamp: number = Date.now()): boolean {
  const cutoffMs = getVietnamCutoffTimestamp(dateStr);
  return currentTimestamp > cutoffMs;
}

/**
 * Load cached pending reports from localStorage
 */
export function loadLocalPendingReports(): DailyPendingErrorReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PENDING_REPORTS);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Failed to parse local pending reports:', err);
    return [];
  }
}

/**
 * Save pending reports to localStorage
 */
export function saveLocalPendingReports(reports: DailyPendingErrorReport[]) {
  try {
    localStorage.setItem(STORAGE_KEY_PENDING_REPORTS, JSON.stringify(reports));
  } catch (err) {
    console.warn('Failed to save local pending reports:', err);
  }
}

/**
 * CORE LOGIC REQUESTED BY USER:
 * Mốc 23h59 Việt Nam:
 * - Sau 1 ngày (hoặc sau 23h59 của ngày có lỗi), kiểm tra sổ lỗi của học sinh.
 * - NẾU KHÔNG CÒN LỖI (resolved === true hoặc 0 lỗi): Tuyệt đối KHÔNG ĐẨY VỀ FIREBASE (0 write quota).
 *   Nếu trước đó đã có báo cáo nợ lỗi của ngày này trên Cloud, tiến hành xóa bản ghi nợ.
 * - NẾU CÒN LỖI CHƯA HOÀN THÀNH (resolved === false) và ĐÃ QUA 23h59:
 *   Đẩy duy nhất 1 bản ghi tổng hợp `pending_errors/${studentId}_${dateStr}` lên Cloud để giáo viên kiểm tra.
 */
export async function checkAndSyncDailyPendingErrors(
  student: User, 
  studentErrors: ErrorLog[]
): Promise<{ checkedCount: number; pushedReports: number; clearedReports: number }> {
  if (!student || student.role !== 'student') {
    return { checkedCount: 0, pushedReports: 0, clearedReports: 0 };
  }

  const now = Date.now();
  const myErrors = studentErrors.filter(e => e.userId === student.id || !e.userId);
  
  // Group student errors by Vietnam Date (YYYY-MM-DD)
  const errorsByDate = new Map<string, ErrorLog[]>();
  myErrors.forEach(err => {
    const errorDate = getVietnamDateString(err.lastFailedAt || now);
    if (!errorsByDate.has(errorDate)) {
      errorsByDate.set(errorDate, []);
    }
    errorsByDate.get(errorDate)!.push(err);
  });

  let pushedReports = 0;
  let clearedReports = 0;
  let localReports = loadLocalPendingReports().filter(r => r.userId !== student.id);

  for (const [dateStr, errorsForDate] of errorsByDate.entries()) {
    const reportId = `${student.id}_${dateStr}`;
    const unresolved = errorsForDate.filter(e => !e.resolved);
    const cutoffPassed = isVietnamCutoffPassed(dateStr, now);

    // Rule: "Nếu không có lỗi nữa thì khỏi đẩy về"
    if (unresolved.length === 0) {
      // Clean up any previously pushed pending error document for this date on Cloud
      try {
        await deleteDocFromCloud('pending_errors', reportId);
        clearedReports++;
      } catch (err) {
        // Ignored if not exists
      }
      continue;
    }

    // Rule: Chỉ đẩy về sau mốc 23h59 Việt Nam nếu vẫn còn lỗi chưa hoàn thành
    if (cutoffPassed) {
      const summaryList: DailyPendingErrorSummary[] = unresolved.map(e => ({
        id: e.id,
        exerciseId: e.exerciseId,
        question: e.question,
        skill: e.skill,
        exerciseType: e.exerciseType,
        failedCount: e.failedCount,
        lastFailedAt: e.lastFailedAt,
        userAnswer: e.userAnswer,
        correctAnswer: e.correctAnswer,
        errorType: e.errorType,
      }));

      const report: DailyPendingErrorReport = {
        id: reportId,
        userId: student.id,
        studentName: student.fullName || student.username,
        username: student.username,
        classroomId: student.classroomId || '',
        dateStr,
        cutoffTime: '23:59 (VN)',
        cutoffPassed: true,
        unresolvedCount: unresolved.length,
        unresolvedErrors: summaryList,
        updatedAt: now,
      };

      // Push 1 single summary document for the day to Firestore
      try {
        await syncDocToCloud('pending_errors', reportId, report);
        pushedReports++;
        localReports.push(report);
      } catch (err) {
        console.warn('Could not sync pending error report to cloud:', err);
      }
    }
  }

  saveLocalPendingReports(localReports);
  return { checkedCount: errorsByDate.size, pushedReports, clearedReports };
}

/**
 * Fetches all pending error reports stored in Firestore
 */
export async function fetchPendingErrorReportsFromCloud(): Promise<DailyPendingErrorReport[]> {
  try {
    const snap = await getDocs(collection(db, 'pending_errors'));
    const reports = snap.docs.map(d => d.data() as DailyPendingErrorReport);
    saveLocalPendingReports(reports);
    return reports;
  } catch (err) {
    console.warn('Failed to fetch pending error reports from cloud, using local cache:', err);
    return loadLocalPendingReports();
  }
}

/**
 * Computes pending error reports directly from provided users and error logs
 * (Useful for offline preview, real-time admin view, and instant calculation)
 */
export function computePendingReports(
  users: User[], 
  allErrors: ErrorLog[], 
  classrooms: Classroom[]
): DailyPendingErrorReport[] {
  const now = Date.now();
  const students = users.filter(u => u.role === 'student');
  const reports: DailyPendingErrorReport[] = [];

  students.forEach(student => {
    const studentErrors = allErrors.filter(e => 
      e.userId === student.id || 
      (e.studentName && (e.studentName === student.fullName || e.studentName === student.username))
    );

    // Group by Vietnam date
    const errorsByDate = new Map<string, ErrorLog[]>();
    studentErrors.forEach(err => {
      const errorDate = getVietnamDateString(err.lastFailedAt || now);
      if (!errorsByDate.has(errorDate)) {
        errorsByDate.set(errorDate, []);
      }
      errorsByDate.get(errorDate)!.push(err);
    });

    errorsByDate.forEach((dateErrors, dateStr) => {
      const cutoffPassed = isVietnamCutoffPassed(dateStr, now);
      const unresolved = dateErrors.filter(e => !e.resolved);

      // Only count as pending if cutoff has passed AND there are unresolved errors
      if (cutoffPassed && unresolved.length > 0) {
        const classroom = classrooms.find(c => c.id === student.classroomId);
        reports.push({
          id: `${student.id}_${dateStr}`,
          userId: student.id,
          studentName: student.fullName,
          username: student.username,
          classroomId: student.classroomId || '',
          dateStr,
          cutoffTime: '23:59 (VN)',
          cutoffPassed: true,
          unresolvedCount: unresolved.length,
          unresolvedErrors: unresolved.map(e => ({
            id: e.id,
            exerciseId: e.exerciseId,
            question: e.question,
            skill: e.skill,
            exerciseType: e.exerciseType,
            failedCount: e.failedCount,
            lastFailedAt: e.lastFailedAt,
            userAnswer: e.userAnswer,
            correctAnswer: e.correctAnswer,
            errorType: e.errorType,
          })),
          updatedAt: now,
        });
      }
    });
  });

  return reports.sort((a, b) => b.dateStr.localeCompare(a.dateStr) || b.unresolvedCount - a.unresolvedCount);
}
