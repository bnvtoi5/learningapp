import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  BookOpen, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Sparkles, 
  CheckCircle2, 
  Layers, 
  Edit3,
  Bookmark,
  Share2,
  Maximize2
} from 'lucide-react';
import { Lesson, LessonSlide } from '../types';
import { useTheme } from '../context/ThemeContext';
import { attachAudioBarListeners } from '../utils/audioBarController';

interface LessonLectureModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: Lesson | null;
  isAdmin?: boolean;
  onEditContent?: (lesson: Lesson) => void;
  onStartPractice?: (lessonId: string) => void;
}

export const LessonLectureModal: React.FC<LessonLectureModalProps> = ({
  isOpen,
  onClose,
  lesson,
  isAdmin = false,
  onEditContent,
  onStartPractice,
}) => {
  const { getThemeClasses } = useTheme();
  const theme = getThemeClasses();

  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);

  // Reset slide index to 0 whenever a new lesson is viewed
  useEffect(() => {
    if (isOpen) {
      setCurrentSlideIndex(0);
    }
  }, [isOpen, lesson?.id]);

  if (!isOpen || !lesson) return null;

  const slides: LessonSlide[] = lesson.slides && lesson.slides.length > 0 
    ? lesson.slides 
    : (lesson.knowledgeSummary ? [
        {
          id: 'summary_slide',
          title: 'Trang 1: Tóm tắt kiến thức trọng tâm',
          contentHtml: `
<div class="formula-box">
  <p style="font-size: 16px; font-weight: bold; margin-bottom: 8px; color: #10b981;">📌 Lý thuyết cốt lõi</p>
  <p style="font-size: 14px; line-height: 1.7; white-space: pre-line; margin: 0;">${lesson.knowledgeSummary}</p>
</div>
          `.trim()
        }
      ] : []);

  const totalSlides = slides.length;
  const currentSlide = slides[currentSlideIndex];
  const isFirstSlide = currentSlideIndex === 0;
  const isLastSlide = currentSlideIndex === totalSlides - 1;
  const progressPercent = totalSlides > 0 ? Math.round(((currentSlideIndex + 1) / totalSlides) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
      <div className={`${theme.card} w-full max-w-4xl h-[90vh] rounded-2xl border ${theme.border} flex flex-col overflow-hidden shadow-2xl`}>
        
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3 border-b border-inherit flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base leading-tight">{lesson.title}</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  Bài giảng lý thuyết
                </span>
              </div>
              <p className={`text-xs ${theme.textMuted}`}>
                {lesson.description || 'Học kiến thức và cấu trúc trước khi làm bài tập'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Admin Edit Content Button */}
            {isAdmin && onEditContent && (
              <button
                id="btn-edit-lecture-from-modal"
                type="button"
                onClick={() => {
                  onClose();
                  onEditContent(lesson);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 flex items-center gap-1.5 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Sửa nội dung bài học</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 rounded-lg hover:${theme.highlight} ${theme.textMuted}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar & Quick Slide Pill Bar */}
        {totalSlides > 0 && (
          <div className={`px-4 sm:px-6 py-2 border-b border-inherit ${theme.badgeBg} flex flex-col gap-2 shrink-0`}>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-emerald-500">Trang {currentSlideIndex + 1}</span>
                <span className={theme.textMuted}>/ {totalSlides} trang</span>
              </div>
              <span className={`text-[11px] font-semibold ${theme.textMuted}`}>
                Tiến độ: {progressPercent}%
              </span>
            </div>

            {/* Progress line */}
            <div className="w-full bg-neutral-500/20 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Quick Slide Jump Tabs */}
            {totalSlides > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                {slides.map((slide, idx) => (
                  <button
                    key={slide.id || idx}
                    type="button"
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all shrink-0 ${
                      currentSlideIndex === idx
                        ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40'
                        : `text-neutral-400 hover:${theme.highlight}`
                    }`}
                  >
                    {idx + 1}. {slide.title ? slide.title.replace(/^Trang \d+:\s*/, '') : `Phần ${idx + 1}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Slide Content Area */}
        <div className="flex-1 p-4 sm:p-8 overflow-y-auto">
          {totalSlides === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <BookOpen className="w-7 h-7" />
              </div>
              <div className="max-w-md space-y-1">
                <h4 className="text-base font-bold">Chưa có nội dung bài giảng chi tiết</h4>
                <p className={`text-xs ${theme.textMuted}`}>
                  {isAdmin 
                    ? 'Giáo viên có thể bấm nút "Thiết kế nội dung bài học" bên dưới để tạo các trang bài giảng, chèn bảng ngữ pháp và công thức cho học sinh.' 
                    : 'Giáo viên đang hoàn thiện nội dung cho bài học này. Bạn có thể bắt đầu luyện tập câu hỏi ngay!'}
                </p>
              </div>

              {isAdmin && onEditContent ? (
                <button
                  id="btn-create-first-lecture-slide"
                  type="button"
                  onClick={() => {
                    onClose();
                    onEditContent(lesson);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Thiết kế nội dung bài học ngay</span>
                </button>
              ) : (
                onStartPractice && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onStartPractice(lesson.id);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md flex items-center gap-1.5"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Chuyển sang Luyện bài ngay</span>
                  </button>
                )
              )}
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              {/* Slide Title */}
              <div className="border-b border-inherit pb-3">
                <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">
                  Trang {currentSlideIndex + 1} của {totalSlides}
                </span>
                <h2 className="text-xl sm:text-2xl font-bold mt-1 tracking-tight">
                  {currentSlide.title || `Trang ${currentSlideIndex + 1}`}
                </h2>
              </div>

              {/* Rendered Slide Content */}
              <div 
                ref={el => {
                  if (el) {
                    attachAudioBarListeners(el);
                  }
                }}
                className="lecture-content leading-relaxed"
                dangerouslySetInnerHTML={{ __html: currentSlide.contentHtml || '<p class="text-neutral-400 italic">Trang này chưa có nội dung.</p>' }}
              />
            </div>
          )}
        </div>

        {/* Modal Bottom Footer Controls */}
        {totalSlides > 0 && (
          <div className="px-4 sm:px-6 py-3 border-t border-inherit flex items-center justify-between gap-3 shrink-0">
            {/* Previous button */}
            <button
              id="btn-lecture-prev-slide"
              type="button"
              disabled={isFirstSlide}
              onClick={() => setCurrentSlideIndex(prev => Math.max(0, prev - 1))}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border ${theme.border} disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Quay lại</span>
            </button>

            {/* Middle Status */}
            <div className="text-xs font-medium text-neutral-400 hidden sm:block">
              Bấm <span className="text-emerald-400 font-bold">Tiếp theo</span> để qua trang bài giảng mới
            </div>

            {/* Next or Finish Practice button */}
            {!isLastSlide ? (
              <button
                id="btn-lecture-next-slide"
                type="button"
                onClick={() => setCurrentSlideIndex(prev => Math.min(totalSlides - 1, prev + 1))}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md flex items-center gap-1.5 transition-transform active:scale-[0.98]"
              >
                <span>Tiếp theo</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                id="btn-finish-lecture-and-practice"
                type="button"
                onClick={() => {
                  onClose();
                  if (onStartPractice) {
                    onStartPractice(lesson.id);
                  }
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg flex items-center gap-2 transition-transform active:scale-[0.98]"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>Đã hiểu bài! Luyện bài ngay</span>
                <Play className="w-3.5 h-3.5 fill-current" />
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
