export type SkillCategory = 
  | 'vocabulary' 
  | 'grammar' 
  | 'reading' 
  | 'listening' 
  | 'speaking' 
  | 'writing' 
  | 'mixed';

export type DifficultyLevel = 
  | 'scaffolded'   // 🟢 Có nhiều gợi ý
  | 'guided'       // 🟡 Có keyword / cấu trúc
  | 'controlled'   // 🟠 Có tình huống, ít gợi ý
  | 'independent'  // 🔴 Tự làm
  | 'challenge';   // ⚫ Trộn kiến thức, thách thức

export type MasteryStatus = 'not_started' | 'learning' | 'mastered' | 'needs_review';

export type ExerciseType = 
  | 'multiple_choice'    // Chọn đáp án (1 hoặc nhiều)
  | 'true_false'          // Đúng / Sai
  | 'matching'            // Nối cặp (từ - nghĩa, từ - ảnh, câu - đáp án)
  | 'image_identify'      // Nhận diện hình ảnh / từ vựng
  | 'fill_blank'          // Điền từ vào chỗ trống
  | 'vocab_cloze'         // Active Recall: Điền khuyết ký tự trong từ (Spelling Cloze)
  | 'flashcard_recall'    // Active Recall: Lật thẻ ghi nhớ & tự đánh giá (Anki/Quizlet style)
  | 'listen_spell'        // Nghe phát âm & gõ lại từ (Dictation / Spelling)
  | 'anagram'             // Xếp chữ cái xáo trộn thành từ vựng đúng
  | 'collocation'         // Ghép cụm từ cố định (make/do/take...)
  | 'sentence_builder'    // Sắp xếp từ thành câu đúng
  | 'error_correction'    // Tìm và sửa lỗi sai trong câu
  | 'translation'         // Dịch câu (Việt -> Anh / Anh -> Việt)
  | 'speaking'            // Luyện nói (Đọc, dịch nói, tình huống, role-play)
  | 'writing'             // Viết (câu/đoạn văn với tiêu chí)
  | 'reading'             // Bài đọc hiểu / Đọc thi (tìm keyword & thông tin)
  | 'listening'           // Bài nghe (before / while / after listening)
  | 'mixed_practice';     // Bài tập tổng hợp nhận diện tình huống

export interface MatchingPair {
  id: string;
  left: string;
  right: string;
}

export interface WritingRequirement {
  label: string;
  met?: boolean;
}

export interface Exercise {
  id: string;
  lessonId: string;
  type: ExerciseType;
  skill: SkillCategory;
  difficulty: DifficultyLevel;
  question: string; // Nội dung câu hỏi / đề bài
  instruction?: string; // Hướng dẫn làm bài
  context?: string; // Đoạn văn bài đọc (CHỈ dùng cho bài Reading hoặc kịch bản hội thoại)
  audioUrl?: string; // URL hoặc data:audio của file âm thanh đính kèm
  audioText?: string; // Đoạn văn bản cho bài nghe (dùng TTS đọc)
  audioPredictionHint?: string; // Gợi ý dự đoán trước khi nghe
  transcript?: string; // Transcript sau khi nghe

  // Active Recall & Từ vựng:
  vocabWord?: string; // Từ vựng mục tiêu (VD: friendly)
  vocabMeaning?: string; // Nghĩa tiếng Việt
  phonetic?: string; // Phiên âm (VD: /ˈfrend.li/)
  clozeLetters?: string; // Ký tự khuyết hoặc mẫu (VD: f _ _ e n d l y)

  // Dữ liệu đáp án tùy theo loại bài:
  options?: string[]; // Cho multiple choice, image identify, collocation
  correctOptions?: number[]; // Chỉ số đáp án đúng (0-indexed, hỗ trợ 1 hoặc nhiều đáp án)
  correctText?: string; // Cho fill blank, sentence builder, translation, error correction
  explanation?: string; // Giải thích chi tiết tại sao đúng/sai
  errorType?: string; // Loại lỗi ngữ pháp (VD: Subject-verb agreement, Past Simple,...)
  wrongSentence?: string; // Cho error correction (câu chứa lỗi)
  matchingPairs?: MatchingPair[]; // Cho matching
  scrambledWords?: string[]; // Cho sentence builder
  keywords?: string[]; // Cho writing / translation hints
  grammarHint?: string; // Gợi ý ngữ pháp
  writingRequirements?: string[]; // Cho writing: các yêu cầu bắt buộc
  modelSample?: string; // Bài mẫu tham khảo
  readingQuestionType?: string; // Main idea, Detail, Inference, Reason,...
  evidenceRegion?: string; // Vùng thông tin trong bài đọc giải thích câu trả lời
}

export interface LessonPhase {
  phase: 'learn' | 'recognize' | 'practice' | 'use' | 'challenge' | 'review';
  title: string;
  description: string;
}

export interface LessonSlide {
  id: string;
  title: string; // Tiêu đề trang bài giảng (VD: Trang 1: Công thức, Trang 2: Dấu hiệu nhận biết,...)
  contentHtml: string; // Nội dung rich HTML được thiết kế (bảng, căn chỉnh, font, màu, khung ngữ pháp,...)
}

export interface MediaFolder {
  id: string;
  name: string;
  color?: string;
  createdAt: number;
}

export interface MediaAsset {
  id: string;
  type: 'image' | 'audio';
  name: string;
  url: string; // Base64 data URL or audio/image URL
  folderId?: string; // ID thư mục phân loại trong kho tư liệu
  size?: number;
  createdAt: number;
}

export interface Lesson {
  id: string;
  topicId: string;
  title: string;
  description: string;
  knowledgeSummary?: string; // Tóm tắt kiến thức / công thức cốt lõi
  examples?: { original: string; meaning: string; note?: string }[];
  slides?: LessonSlide[]; // Danh sách các trang bài giảng nhiều slide
  order: number;
}

export interface Topic {
  id: string;
  classroomId: string; // BẮT BUỘC: Mỗi chủ đề phải thuộc về một lớp học cụ thể
  title: string;
  description: string;
  subject: string; // Môn học: Tiếng Anh, Toán, Ngữ Văn,...
  primarySkill: SkillCategory;
  createdAt: number;
}

export interface ErrorLog {
  id: string;
  exerciseId: string;
  userId?: string; // ID học sinh sở hữu lỗi này
  studentName?: string; // Tên học sinh
  classroomId?: string; // Lớp học của học sinh
  exerciseType: ExerciseType;
  skill: SkillCategory;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  errorType: string;
  explanation: string;
  failedCount: number; // Tổng số lần làm sai
  lastFailedAt: number;
  resolved: boolean;
  resolvedAt?: number;
  retryAttempts: number; // Tổng số lượt thử lại đã thực hiện
  currentSuccessCount: number; // Số lần làm đúng liên tiếp hiện tại
  requiredSuccessCount: number; // Số lần làm đúng bắt buộc (trừng phạt) để gỡ lỗi hoàn toàn
}

export interface UserStats {
  totalCompleted: number;
  totalCorrect: number;
  streakDays: number;
  lastActiveDate: string;
  skillProficiency: Record<SkillCategory, { completed: number; correct: number }>;
}

export type ThemeMode = 'light' | 'sepia' | 'dark' | 'oled';
export type FontSize = 'normal' | 'large' | 'xlarge';
export type LineSpacing = 'normal' | 'relaxed';

export type UserRole = 'admin' | 'student';
export type UserStatus = 'pending' | 'approved' | 'rejected' | 'blocked';

export interface StudentPermissions {
  canViewTheory: boolean; // Được xem lý thuyết
  canPractice: boolean; // Được làm bài tập
  canViewExplanations: boolean; // Được xem giải thích chi tiết đáp án
  canAccessErrorNotebook: boolean; // Được vào Sổ lỗi sai
  canViewProgress: boolean; // Được xem thống kê tiến độ
  canMarkErrorResolved?: boolean; // Được tự bấm 'Đánh dấu đã hiểu' trong Sổ lỗi (Mặc định: Khóa)
  canDeleteErrorLog?: boolean; // Được tự bấm 'Xóa khỏi sổ lỗi' (Mặc định: Khóa)
}

export interface User {
  id: string;
  username: string;
  password: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  classroomId?: string; // Lớp học đã đăng ký
  registeredAt: number;
  approvedAt?: number;
  permissions?: StudentPermissions;
}

export interface Classroom {
  id: string;
  name: string; // VD: Lớp 9A1 - Anh Văn
  code: string; // Mã lớp: 9A1
  description: string;
  createdAt: number;
  assignedTopicIds?: string[]; // Danh sách chủ đề được mở cho lớp
}

export type VoiceGenderPreference = 'auto' | 'female' | 'male' | 'uk_female' | 'uk_male';

export interface AppSettings {
  theme: ThemeMode;
  fontSize: FontSize;
  lineSpacing: LineSpacing;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  autoSpeak: boolean;
  voiceGender?: VoiceGenderPreference; // Tùy chọn giọng đọc (Mặc định: 'female' hoặc 'auto')
  voiceSpeed?: number; // Tốc độ đọc (0.8, 0.9, 1.0, 1.15)
  selectedVoiceURI?: string; // Tên voice URI cụ thể nếu người dùng chọn
  defaultPenaltyCount?: number; // Số lần làm đúng bắt buộc để hoàn thành lỗi sai (mặc định: 2)
}
