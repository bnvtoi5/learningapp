import { 
  Topic, 
  Lesson, 
  Exercise, 
  ErrorLog, 
  Classroom, 
  User, 
  StudentPermissions 
} from '../types';

export const defaultStudentPermissions: StudentPermissions = {
  canViewTheory: true,
  canPractice: true,
  canViewExplanations: true,
  canAccessErrorNotebook: true,
  canViewProgress: true,
  canMarkErrorResolved: false, // Mặc định KHÓA: Học sinh không tự ý đánh dấu đã hiểu trong Sổ lỗi
  canDeleteErrorLog: false, // Mặc định KHÓA: Học sinh không tự ý xóa lỗi sai trong Sổ lỗi
};

// Sạch hoàn toàn: Không có lớp học mặc định, người dùng tự tạo lớp
export const initialClassrooms: Classroom[] = [];

// Chỉ giữ duy nhất tài khoản Quản trị viên (Admin)
export const initialUsers: User[] = [
  {
    id: 'admin_root',
    username: 'admin',
    password: '123',
    fullName: 'Thầy Giáo Quản Trị (Admin)',
    role: 'admin',
    status: 'approved',
    registeredAt: Date.now(),
    approvedAt: Date.now(),
  },
];

// Sạch hoàn toàn: Không có chủ đề, bài học, câu hỏi và sổ lỗi nào ban đầu
export const initialTopics: Topic[] = [];
export const initialLessons: Lesson[] = [];
export const initialExercises: Exercise[] = [];
export const initialErrors: ErrorLog[] = [];
