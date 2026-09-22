import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Save, 
  Plus, 
  Trash2, 
  Copy, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Edit3, 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify, 
  List, 
  ListOrdered, 
  Table as TableIcon, 
  Sparkles, 
  AlertCircle, 
  BookOpen, 
  CheckSquare, 
  Lightbulb, 
  HelpCircle,
  Type,
  Palette,
  Layers,
  ArrowRight,
  Image as ImageIcon,
  Volume2,
  FolderOpen,
  Maximize2,
  Minimize2,
  Rows,
  Columns,
  Check,
  Printer,
  Wand2,
  Bot,
  RotateCcw,
  Loader2,
  Send,
  FileText,
  LayoutGrid,
  Zap
} from 'lucide-react';
import { Lesson, LessonSlide, MediaAsset } from '../types';
import { useTheme } from '../context/ThemeContext';
import { MediaLibraryModal } from './MediaLibraryModal';
import { attachAudioBarListeners } from '../utils/audioBarController';
import { LessonPrintModal } from './LessonPrintModal';
import { generateLessonContentFromAI, LessonAiAssistantResult, ensureUniqueSlideIds } from '../utils/lessonAiAssistant';

interface LessonContentEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: Lesson | null;
  onSave: (updatedLesson: Lesson) => void;
}

// Quick Prompt presets for Gemini in Docs Assistant
const GEMINI_QUICK_PROMPTS = [
  {
    title: '🚀 Toàn bộ bài giảng 3 thể & ví dụ',
    desc: 'Tự động tạo 3 slide: Công thức & Bảng thể câu, Mẹo nhớ, Lưu ý & Ví dụ',
    prompt: 'Soạn bài giảng chuẩn hóa gồm 3 trang: Trang 1 là Công thức cốt lõi & Bảng phân loại thể câu (+, -, ?); Trang 2 là Dấu hiệu nhận biết & Mẹo ghi nhớ; Trang 3 là Lưu ý ngoại lệ & 3 Ví dụ thực tế có dịch nghĩa.',
    mode: 'full_lecture' as const,
  },
  {
    title: '📐 Khung công thức (+, -, ?)',
    desc: 'Chèn khung công thức chính và phân tích ký hiệu',
    prompt: 'Tạo khung công thức chính chuẩn đẹp, giải thích rõ các thành phần ký hiệu và quy tắc chia động từ.',
    mode: 'single_block' as const,
  },
  {
    title: '📊 Bảng phân loại 3 thể câu',
    desc: 'Tạo bảng so sánh thể câu, cấu trúc và ví dụ',
    prompt: 'Tạo bảng phân loại 3 thể câu (Khẳng định, Phủ định, Nghi vấn) với cột Thể câu, Cấu trúc và Ví dụ tiếng Anh minh họa in đậm từ khóa.',
    mode: 'single_block' as const,
  },
  {
    title: '💡 Khung mẹo nhớ & Dấu hiệu',
    desc: 'Chèn khung ghi nhớ các từ khóa hay gặp',
    prompt: 'Tạo khung mẹo nhớ màu tím với các từ khóa nhận biết quan trọng (dấu hiệu thời gian/ngữ cảnh) và quy tắc ghi nhớ dễ hiểu.',
    mode: 'single_block' as const,
  },
  {
    title: '⚠️ Khung cảnh báo bẫy ngữ pháp',
    desc: 'Chèn khung lưu ý các trường hợp ngoại lệ',
    prompt: 'Tạo khung lưu ý màu vàng cam cảnh báo các bẫy ngữ pháp thường gặp trong bài thi và lỗi học sinh hay mắc phải.',
    mode: 'single_block' as const,
  },
  {
    title: '💬 Bộ ví dụ thực tế kèm dịch',
    desc: 'Tạo 3 ví dụ câu có dịch nghĩa & phân tích',
    prompt: 'Tạo 3 khung ví dụ câu tiếng Anh thực tế trong đời sống, có câu tiếng Anh in đậm cấu trúc và bản dịch tiếng Việt giải thích rõ nghĩa.',
    mode: 'single_block' as const,
  },
  {
    title: '🪄 Chuẩn hóa & Làm đẹp trang này',
    desc: 'Format lại nội dung hiện có thành các khung hộp chuẩn',
    prompt: 'Đọc nội dung hiện có trên trang và format lại thành các khung hộp chuẩn (công thức, bảng, mẹo nhớ, ví dụ) đẹp mắt và trực quan.',
    mode: 'refine' as const,
  }
];

// Starter template for a grammar lesson slide
const DEFAULT_GRAMMAR_SLIDE_1: LessonSlide = {
  id: 'default_template_slide_1',
  title: 'Trang 1: Định nghĩa & Công thức cốt lõi',
  contentHtml: `
<div class="formula-box" data-block-type="box" style="width: 100%; margin: 12px 0;">
  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
    <span style="background-color: #10b981; color: white; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; text-transform: uppercase;">📐 CÔNG THỨC CHÍNH</span>
  </div>
  <p style="font-size: 18px; font-weight: 700; color: #10b981; margin: 4px 0 8px 0; text-align: center;">
    S + V(s/es) + O
  </p>
  <p style="font-size: 13px; opacity: 0.85; text-align: center; margin: 0;">
    Chủ ngữ (S) + Động từ thêm s/es với ngôi thứ 3 số ít (He/She/It) + Tân ngữ (O)
  </p>
</div>

<h3 style="font-size: 16px; font-weight: bold; margin-top: 16px; margin-bottom: 8px;">1. Bảng phân loại dạng câu</h3>
<table data-block-type="table" style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
  <thead>
    <tr style="background-color: rgba(16, 185, 129, 0.15);">
      <th style="padding: 8px 12px; border: 1px solid rgba(150, 150, 150, 0.3); text-align: left;">Thể câu</th>
      <th style="padding: 8px 12px; border: 1px solid rgba(150, 150, 150, 0.3); text-align: left;">Cấu trúc</th>
      <th style="padding: 8px 12px; border: 1px solid rgba(150, 150, 150, 0.3); text-align: left;">Ví dụ minh họa</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding: 8px 12px; border: 1px solid rgba(150, 150, 150, 0.3); font-weight: bold; color: #10b981;">Khẳng định (+)</td>
      <td style="padding: 8px 12px; border: 1px solid rgba(150, 150, 150, 0.3);">S + V(s/es)</td>
      <td style="padding: 8px 12px; border: 1px solid rgba(150, 150, 150, 0.3);">She <b>reads</b> books every night.</td>
    </tr>
    <tr>
      <td style="padding: 8px 12px; border: 1px solid rgba(150, 150, 150, 0.3); font-weight: bold; color: #f43f5e;">Phủ định (-)</td>
      <td style="padding: 8px 12px; border: 1px solid rgba(150, 150, 150, 0.3);">S + do/does + not + V_inf</td>
      <td style="padding: 8px 12px; border: 1px solid rgba(150, 150, 150, 0.3);">She <b>doesn't read</b> comic books.</td>
    </tr>
    <tr>
      <td style="padding: 8px 12px; border: 1px solid rgba(150, 150, 150, 0.3); font-weight: bold; color: #0284c7;">Nghi vấn (?)</td>
      <td style="padding: 8px 12px; border: 1px solid rgba(150, 150, 150, 0.3);">Do/Does + S + V_inf?</td>
      <td style="padding: 8px 12px; border: 1px solid rgba(150, 150, 150, 0.3);"><b>Does</b> she <b>read</b> books?</td>
    </tr>
  </tbody>
</table>
  `.trim(),
};

const DEFAULT_GRAMMAR_SLIDE_2: LessonSlide = {
  id: 'default_template_slide_2',
  title: 'Trang 2: Dấu hiệu nhận biết & Mẹo nhớ',
  contentHtml: `
<div class="tip-box" data-block-type="box" style="width: 100%; margin: 12px 0;">
  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
    <span style="background-color: #8b5cf6; color: white; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; text-transform: uppercase;">💡 DẤU HIỆU NHẬN BIẾT</span>
  </div>
  <p style="font-size: 14px; margin: 0 0 8px 0;">Khi nhìn thấy các trạng từ chỉ tần suất sau trong câu:</p>
  <ul style="padding-left: 20px; margin: 0; font-size: 14px; line-height: 1.6;">
    <li><b>Always, usually, often, frequently</b>: Thường xuyên, luôn luôn</li>
    <li><b>Sometimes, occasionally, seldom, rarely</b>: Thỉnh thoảng, hiếm khi</li>
    <li><b>Every day / every week / every month</b>: Hàng ngày, hàng tuần</li>
    <li><b>Once / twice a week</b>: Một / hai lần mỗi tuần</li>
  </ul>
</div>

<div class="caution-box" data-block-type="box" style="width: 100%; margin: 12px 0;">
  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
    <span style="background-color: #f59e0b; color: white; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; text-transform: uppercase;">⚠️ LƯU Ý NGOẠI LỆ</span>
  </div>
  <p style="font-size: 14px; margin: 0;">
    Động từ tận cùng là <b>-o, -s, -ch, -x, -sh, -z</b> thì thêm <b>-es</b>:
  </p>
  <p style="font-size: 14px; font-weight: 600; color: #f59e0b; margin: 6px 0 0 0;">
    go ➔ goes • watch ➔ watches • pass ➔ passes • fix ➔ fixes • wash ➔ washes
  </p>
</div>
  `.trim(),
};

export const LessonContentEditorModal: React.FC<LessonContentEditorModalProps> = ({
  isOpen,
  onClose,
  lesson,
  onSave,
}) => {
  const { settings, getThemeClasses } = useTheme();
  const theme = getThemeClasses();

  const [slides, setSlides] = useState<LessonSlide[]>([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [activeSlideTitle, setActiveSlideTitle] = useState<string>('');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Gemini in Docs State
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState(false);
  const [geminiPrompt, setGeminiPrompt] = useState('');
  const [geminiMode, setGeminiMode] = useState<'full_lecture' | 'single_block' | 'refine'>('full_lecture');
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);
  const [geminiResult, setGeminiResult] = useState<LessonAiAssistantResult | null>(null);
  const [geminiError, setGeminiError] = useState<string | null>(null);
  const [geminiPreviewSlideIdx, setGeminiPreviewSlideIdx] = useState(0);
  const geminiAbortRef = useRef<AbortController | null>(null);

  // Media Library Modal
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [mediaInitialTab, setMediaInitialTab] = useState<'all' | 'image' | 'audio'>('all');

  // Custom Table Creator Modal
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [tableHasHeader, setTableHasHeader] = useState(true);
  const [tableWidth, setTableWidth] = useState<'100%' | '75%' | '50%'>('100%');
  const [tableDensity, setTableDensity] = useState<'normal' | 'compact' | 'spacious'>('normal');

  // Active Block for Word-like Handle & Actions
  const [activeBlock, setActiveBlock] = useState<{
    element: HTMLElement;
    type: 'table' | 'box' | 'image' | 'audio' | 'unknown';
    width: string;
  } | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const isUpdatingFromState = useRef(false);
  const savedRangeRef = useRef<Range | null>(null);

  // Initialize slides when modal opens
  useEffect(() => {
    if (!isOpen || !lesson) return;

    if (lesson.slides && lesson.slides.length > 0) {
      const sanitized = ensureUniqueSlideIds(lesson.slides);
      setSlides(sanitized);
      setActiveSlideIndex(0);
      setActiveSlideTitle(sanitized[0].title);
    } else {
      const baseTime = Date.now();
      if (lesson.knowledgeSummary) {
        const initialSlide: LessonSlide = {
          id: `slide_${baseTime}_1_${Math.random().toString(36).substring(2, 7)}`,
          title: 'Trang 1: Kiến thức cốt lõi',
          contentHtml: `
<h2 style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">${lesson.title}</h2>
<p style="font-size: 14px; margin-bottom: 12px;">${lesson.knowledgeSummary}</p>
          `.trim(),
        };
        setSlides([initialSlide]);
        setActiveSlideIndex(0);
        setActiveSlideTitle(initialSlide.title);
      } else {
        const defaultSlides = [
          { ...DEFAULT_GRAMMAR_SLIDE_1, id: `slide_${baseTime}_1_${Math.random().toString(36).substring(2, 7)}` },
          { ...DEFAULT_GRAMMAR_SLIDE_2, id: `slide_${baseTime}_2_${Math.random().toString(36).substring(2, 7)}` }
        ];
        setSlides(defaultSlides);
        setActiveSlideIndex(0);
        setActiveSlideTitle(defaultSlides[0].title);
      }
    }
  }, [isOpen, lesson]);

  // Sync active slide HTML into the contentEditable editor
  useEffect(() => {
    if (editorRef.current && slides[activeSlideIndex]) {
      isUpdatingFromState.current = true;
      editorRef.current.innerHTML = slides[activeSlideIndex].contentHtml || '';
      setActiveSlideTitle(slides[activeSlideIndex].title || `Trang ${activeSlideIndex + 1}`);
      setActiveBlock(null);
      isUpdatingFromState.current = false;
    }
  }, [activeSlideIndex, slides.length]);

  // Save current selection / cursor position accurately
  const saveCurrentSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current) {
      const range = sel.getRangeAt(0);
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
      }
    }

    // Detect if cursor is inside a block (table, box, image, audio)
    detectActiveBlock();
  };

  // Detect closest block for Word-like handle
  const detectActiveBlock = () => {
    if (!editorRef.current) return;
    const sel = window.getSelection();
    let targetNode: Node | null = null;
    if (sel && sel.rangeCount > 0) {
      targetNode = sel.getRangeAt(0).startContainer;
    }

    if (targetNode) {
      const el = targetNode.nodeType === Node.ELEMENT_NODE ? (targetNode as HTMLElement) : targetNode.parentElement;
      const blockEl = el?.closest(
        'table, .formula-box, .tip-box, .caution-box, .example-box, .lecture-image-container, .lecture-audio-widget, .lecture-audio-bar'
      ) as HTMLElement | null;

      if (blockEl && editorRef.current.contains(blockEl)) {
        let type: 'table' | 'box' | 'image' | 'audio' | 'unknown' = 'unknown';
        if (blockEl.tagName === 'TABLE') type = 'table';
        else if (blockEl.classList.contains('lecture-image-container')) type = 'image';
        else if (blockEl.classList.contains('lecture-audio-widget') || blockEl.classList.contains('lecture-audio-bar')) type = 'audio';
        else type = 'box';

        const curWidth = blockEl.style.width || (blockEl.classList.contains('w-1/2') ? '50%' : '100%');
        setActiveBlock({
          element: blockEl,
          type,
          width: curWidth,
        });
        return;
      }
    }
    setActiveBlock(null);
  };

  // Restore Selection when executing toolbar action
  const restoreSelection = () => {
    const sel = window.getSelection();
    if (sel && savedRangeRef.current && editorRef.current) {
      editorRef.current.focus();
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
      return true;
    }
    return false;
  };

  // Sync content back to state
  const handleEditorInput = () => {
    if (isUpdatingFromState.current || !editorRef.current) return;
    const newHtml = editorRef.current.innerHTML;
    setSlides(prev => {
      const updated = [...prev];
      if (updated[activeSlideIndex]) {
        updated[activeSlideIndex] = {
          ...updated[activeSlideIndex],
          contentHtml: newHtml,
        };
      }
      return updated;
    });
  };

  const handleTitleChange = (newTitle: string) => {
    setActiveSlideTitle(newTitle);
    setSlides(prev => {
      const updated = [...prev];
      if (updated[activeSlideIndex]) {
        updated[activeSlideIndex] = {
          ...updated[activeSlideIndex],
          title: newTitle,
        };
      }
      return updated;
    });
  };

  // Slide CRUD Actions
  const handleAddSlide = () => {
    const newSlideNumber = slides.length + 1;
    const newSlide: LessonSlide = {
      id: `slide_${Date.now()}_${newSlideNumber}_${Math.random().toString(36).substring(2, 7)}`,
      title: `Trang ${newSlideNumber}: Nội dung bài giảng`,
      contentHtml: `
<h2 style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">Tiêu đề mục học phần ${newSlideNumber}</h2>
<p style="font-size: 14px; margin-bottom: 12px;">Nhập nội dung giải thích, quy tắc hoặc hướng dẫn chi tiết tại đây...</p>
      `.trim(),
    };
    const nextSlides = [...slides, newSlide];
    setSlides(nextSlides);
    setActiveSlideIndex(nextSlides.length - 1);
  };

  const handleDuplicateSlide = () => {
    const current = slides[activeSlideIndex];
    if (!current) return;
    const duplicate: LessonSlide = {
      id: `slide_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: `${current.title} (Bản sao)`,
      contentHtml: current.contentHtml,
    };
    const nextSlides = [...slides];
    nextSlides.splice(activeSlideIndex + 1, 0, duplicate);
    setSlides(nextSlides);
    setActiveSlideIndex(activeSlideIndex + 1);
  };

  const handleDeleteSlide = (indexToDelete: number) => {
    if (slides.length <= 1) {
      alert('Bài giảng cần có ít nhất 1 trang nội dung.');
      return;
    }
    const nextSlides = slides.filter((_, i) => i !== indexToDelete);
    setSlides(nextSlides);
    setActiveSlideIndex(Math.max(0, Math.min(activeSlideIndex, nextSlides.length - 1)));
  };

  const handleMoveSlide = (direction: 'left' | 'right') => {
    const targetIdx = direction === 'left' ? activeSlideIndex - 1 : activeSlideIndex + 1;
    if (targetIdx < 0 || targetIdx >= slides.length) return;
    const nextSlides = [...slides];
    const temp = nextSlides[activeSlideIndex];
    nextSlides[activeSlideIndex] = nextSlides[targetIdx];
    nextSlides[targetIdx] = temp;
    setSlides(nextSlides);
    setActiveSlideIndex(targetIdx);
  };

  // Rich Text Exec Commands
  const executeCommand = (command: string, value: string | undefined = undefined) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    restoreSelection();
    document.execCommand(command, false, value);
    saveCurrentSelection();
    handleEditorInput();
  };

  // Insert HTML Snippet at cursor position
  const insertHtmlSnippet = (html: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    restoreSelection();

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        range.deleteContents();
        const temp = document.createElement('div');
        temp.innerHTML = html;
        const frag = document.createDocumentFragment();
        let node;
        let lastNode: Node | null = null;
        while ((node = temp.firstChild)) {
          lastNode = frag.appendChild(node);
        }
        range.insertNode(frag);
        if (lastNode) {
          range.setStartAfter(lastNode);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          savedRangeRef.current = range.cloneRange();
        }
        handleEditorInput();
        detectActiveBlock();
        return;
      }
    }
    // Fallback: append at end
    editorRef.current.innerHTML += html;
    handleEditorInput();
    detectActiveBlock();
  };

  // Quick Template Boxes
  const insertFormulaBox = () => {
    insertHtmlSnippet(`
<div class="formula-box" data-block-type="box" style="width: 100%; margin: 12px 0;">
  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
    <span style="background-color: #10b981; color: white; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; text-transform: uppercase;">📐 CÔNG THỨC NGỮ PHÁP</span>
  </div>
  <p style="font-size: 18px; font-weight: 700; color: #10b981; margin: 8px 0 4px 0; text-align: center;">
    S + [Động từ / Cấu trúc] + O
  </p>
  <p style="font-size: 13px; text-align: center; margin: 0; opacity: 0.85;">
    Giải thích các thành phần trong công thức (Ví dụ: S: Chủ ngữ, V: Động từ)...
  </p>
</div>
<p><br></p>
    `.trim());
  };

  const insertTipBox = () => {
    insertHtmlSnippet(`
<div class="tip-box" data-block-type="box" style="width: 100%; margin: 12px 0;">
  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
    <span style="background-color: #8b5cf6; color: white; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; text-transform: uppercase;">💡 MẸO GHI NHỚ / DẤU HIỆU</span>
  </div>
  <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
    <li><b>Dấu hiệu 1</b>: Từ khóa nhận biết quan trọng</li>
    <li><b>Dấu hiệu 2</b>: Mẹo phân biệt tránh nhầm lẫn</li>
  </ul>
</div>
<p><br></p>
    `.trim());
  };

  const insertCautionBox = () => {
    insertHtmlSnippet(`
<div class="caution-box" data-block-type="box" style="width: 100%; margin: 12px 0;">
  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
    <span style="background-color: #f59e0b; color: white; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; text-transform: uppercase;">⚠️ LƯU Ý & NGOẠI LỆ</span>
  </div>
  <p style="font-size: 14px; margin: 6px 0 0 0;">
    Ghi chú các trường hợp ngoại lệ hoặc những lỗi học sinh hay mắc phải tại đây.
  </p>
</div>
<p><br></p>
    `.trim());
  };

  const insertExampleBox = () => {
    insertHtmlSnippet(`
<div class="example-box" data-block-type="box" style="width: 100%; margin: 12px 0;">
  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
    <span style="background-color: #0284c7; color: white; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; text-transform: uppercase;">💬 VÍ DỤ MINH HỌA</span>
  </div>
  <p style="font-size: 15px; font-weight: 600; margin: 6px 0 2px 0; color: #0284c7;">
    English sentence goes here.
  </p>
  <p style="font-size: 13px; margin: 0; opacity: 0.85; font-style: italic;">
    ➔ Nghĩa dịch tiếng Việt và chú thích cách dùng từ.
  </p>
</div>
<p><br></p>
    `.trim());
  };

  const insertCheckmarkList = () => {
    insertHtmlSnippet(`
<ul style="list-style-type: none; padding-left: 4px; margin: 10px 0; font-size: 14px; line-height: 1.7;">
  <li style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px;">
    <span style="color: #10b981; font-weight: bold;">✓</span>
    <span>Điều kiện hoặc quy tắc số 1</span>
  </li>
  <li style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px;">
    <span style="color: #10b981; font-weight: bold;">✓</span>
    <span>Điều kiện hoặc quy tắc số 2</span>
  </li>
</ul>
<p><br></p>
    `.trim());
  };

  // Generate & Insert Custom Configured Table
  const handleInsertConfiguredTable = () => {
    let html = `<table class="${tableDensity === 'compact' ? 'lecture-table-compact' : tableDensity === 'spacious' ? 'lecture-table-spacious' : ''}" style="width: ${tableWidth}; border-collapse: collapse; margin: 1rem ${tableWidth !== '100%' ? 'auto' : '0'};" data-block-type="table">`;
    
    let startRow = 0;
    if (tableHasHeader && tableRows > 0) {
      html += `<thead><tr style="background-color: rgba(16, 185, 129, 0.15);">`;
      for (let c = 1; c <= tableCols; c++) {
        html += `<th style="padding: 8px 12px; border: 1px solid rgba(150, 150, 150, 0.3); text-align: left;">Cột ${c}</th>`;
      }
      html += `</tr></thead>`;
      startRow = 1;
    }

    html += `<tbody>`;
    for (let r = startRow; r < tableRows; r++) {
      html += `<tr>`;
      for (let c = 1; c <= tableCols; c++) {
        html += `<td style="padding: 8px 12px; border: 1px solid rgba(150, 150, 150, 0.3);">Nội dung ô ${r + 1}.${c}</td>`;
      }
      html += `</tr>`;
    }
    html += `</tbody></table><p><br></p>`;

    insertHtmlSnippet(html);
    setIsTableModalOpen(false);
  };

  // Gemini in Docs Assistant Actions
  const handleOpenGeminiModal = (mode?: 'full_lecture' | 'single_block' | 'refine') => {
    if (mode) setGeminiMode(mode);
    if (!geminiPrompt) {
      if (lesson?.title) {
        setGeminiPrompt(`Soạn bài giảng chuẩn hóa về "${lesson.title}" với bảng 3 thể (+, -, ?), các ví dụ thực tế kèm dịch nghĩa và mẹo nhớ quan trọng.`);
      } else {
        setGeminiPrompt('Soạn bài giảng ngữ pháp tiếng Anh với công thức 3 thể, bảng phân loại, mẹo nhớ và ví dụ minh họa.');
      }
    }
    setGeminiError(null);
    setIsGeminiModalOpen(true);
  };

  const handleRunGeminiAssistant = async (customPromptToRun?: string, customModeToRun?: 'full_lecture' | 'single_block' | 'refine') => {
    const promptToUse = (customPromptToRun || geminiPrompt).trim();
    const modeToUse = customModeToRun || geminiMode;
    
    if (!promptToUse) return;
    setIsGeminiLoading(true);
    setGeminiError(null);
    setGeminiResult(null);

    const controller = new AbortController();
    geminiAbortRef.current = controller;

    try {
      const currentHtml = editorRef.current?.innerHTML || slides[activeSlideIndex]?.contentHtml || '';
      const geminiApiKey = settings.providerApiKeys?.gemini || settings.customApiKey || settings.customGeminiApiKey;
      const model = settings.aiModel || 'gemini-3.1-flash-lite';

      const result = await generateLessonContentFromAI({
        prompt: promptToUse,
        mode: modeToUse,
        lessonTitle: lesson?.title || '',
        topicContext: lesson?.knowledgeSummary || '',
        currentContent: modeToUse === 'refine' ? currentHtml : undefined,
        customApiKey: geminiApiKey,
        model,
        signal: controller.signal,
      });

      if (result.status === 'success') {
        setGeminiResult(result);
        setGeminiPreviewSlideIdx(0);
      } else {
        setGeminiError(result.error || 'Không thể tạo nội dung từ AI.');
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setGeminiError(err.message || 'Lỗi kết nối AI.');
      }
    } finally {
      setIsGeminiLoading(false);
      geminiAbortRef.current = null;
    }
  };

  const handleStopGemini = () => {
    if (geminiAbortRef.current) {
      geminiAbortRef.current.abort();
      geminiAbortRef.current = null;
    }
    setIsGeminiLoading(false);
  };

  const handleApplyGeminiResult = (action: 'replace_all' | 'append_slides' | 'insert_cursor' | 'replace_current') => {
    if (!geminiResult) return;

    if (geminiResult.mode === 'full_lecture' && geminiResult.slides && geminiResult.slides.length > 0) {
      if (action === 'replace_all') {
        const uniqueSlides = ensureUniqueSlideIds(geminiResult.slides);
        setSlides(uniqueSlides);
        setActiveSlideIndex(0);
        setActiveSlideTitle(uniqueSlides[0].title);
        if (editorRef.current) {
          isUpdatingFromState.current = true;
          editorRef.current.innerHTML = uniqueSlides[0].contentHtml;
          isUpdatingFromState.current = false;
        }
      } else if (action === 'append_slides') {
        const newSlidesToAppend = geminiResult.slides.map((s, idx) => ({
          ...s,
          id: `slide_${Date.now()}_${slides.length + idx + 1}_${Math.random().toString(36).substring(2, 7)}`,
        }));
        const combined = ensureUniqueSlideIds([...slides, ...newSlidesToAppend]);
        setSlides(combined);
      }
    } else if (geminiResult.contentHtml) {
      if (action === 'insert_cursor') {
        insertHtmlSnippet(geminiResult.contentHtml);
      } else if (action === 'replace_current') {
        if (editorRef.current) {
          editorRef.current.innerHTML = geminiResult.contentHtml;
          handleEditorInput();
        }
      }
    }

    setIsGeminiModalOpen(false);
  };

  // Media Library Asset Selection
  const handleSelectMediaAsset = (asset: MediaAsset) => {
    if (asset.type === 'image') {
      const imgHtml = `
<figure class="lecture-image-container align-center" style="width: 100%; margin: 1rem auto;" data-block-type="image">
  <img src="${asset.url}" alt="${asset.name}" class="lecture-image-img" style="width: 100%; border-radius: 12px;" />
  ${asset.name ? `<figcaption class="lecture-image-caption">${asset.name}</figcaption>` : ''}
</figure>
<p><br></p>
      `.trim();
      insertHtmlSnippet(imgHtml);
    } else {
      // Clean minimalist audio bar with seek slider, play/pause and speed controls
      const audioHtml = `
<div class="lecture-audio-bar" data-block-type="audio" data-audio-src="${asset.url || ''}" data-audio-text="${asset.url ? '' : asset.name}">
  <button type="button" class="lecture-audio-play-btn" title="Phát / Tạm dừng">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
  </button>
  <span class="lecture-audio-time current-time">00:00</span>
  <input type="range" class="lecture-audio-slider" min="0" max="100" value="0" />
  <span class="lecture-audio-time duration-time">--:--</span>
  <button type="button" class="lecture-audio-speed-btn" data-speed="1.0" title="Tốc độ">1.0x</button>
</div>
<p><br></p>
      `.trim();
      insertHtmlSnippet(audioHtml);
    }
  };

  // Word-like Block Manipulation Actions
  const handleSelectEntireBlock = () => {
    if (!activeBlock?.element) return;
    const sel = window.getSelection();
    if (sel) {
      const range = document.createRange();
      range.selectNode(activeBlock.element);
      sel.removeAllRanges();
      sel.addRange(range);
      savedRangeRef.current = range.cloneRange();
    }
  };

  const handleDeleteActiveBlock = () => {
    if (!activeBlock?.element) return;
    activeBlock.element.remove();
    setActiveBlock(null);
    handleEditorInput();
  };

  const handleSetBlockWidth = (width: '100%' | '75%' | '50%') => {
    if (!activeBlock?.element) return;
    activeBlock.element.style.width = width;
    if (width !== '100%') {
      activeBlock.element.style.margin = '1rem auto';
    } else {
      activeBlock.element.style.margin = '1rem 0';
    }
    setActiveBlock(prev => prev ? { ...prev, width } : null);
    handleEditorInput();
  };

  // Table Row / Col Manipulation
  const handleAddTableRow = () => {
    if (!activeBlock?.element || activeBlock.type !== 'table') return;
    const table = activeBlock.element as HTMLTableElement;
    const tbody = table.querySelector('tbody') || table;
    const colsCount = table.rows[0]?.cells.length || 3;
    const newRow = document.createElement('tr');
    for (let i = 0; i < colsCount; i++) {
      const td = document.createElement('td');
      td.style.padding = '8px 12px';
      td.style.border = '1px solid rgba(150, 150, 150, 0.3)';
      td.textContent = `Ô mới`;
      newRow.appendChild(td);
    }
    tbody.appendChild(newRow);
    handleEditorInput();
  };

  const handleDeleteTableRow = () => {
    if (!activeBlock?.element || activeBlock.type !== 'table') return;
    const table = activeBlock.element as HTMLTableElement;
    if (table.rows.length <= 1) {
      table.remove();
      setActiveBlock(null);
    } else {
      table.rows[table.rows.length - 1].remove();
    }
    handleEditorInput();
  };

  const handleAddTableColumn = () => {
    if (!activeBlock?.element || activeBlock.type !== 'table') return;
    const table = activeBlock.element as HTMLTableElement;
    for (let i = 0; i < table.rows.length; i++) {
      const row = table.rows[i];
      const isHeader = row.parentElement?.tagName === 'THEAD' || row.cells[0]?.tagName === 'TH';
      const cell = document.createElement(isHeader ? 'th' : 'td');
      cell.style.padding = '8px 12px';
      cell.style.border = '1px solid rgba(150, 150, 150, 0.3)';
      cell.textContent = isHeader ? `Cột mới` : `Nội dung`;
      row.appendChild(cell);
    }
    handleEditorInput();
  };

  const handleDeleteTableColumn = () => {
    if (!activeBlock?.element || activeBlock.type !== 'table') return;
    const table = activeBlock.element as HTMLTableElement;
    const colCount = table.rows[0]?.cells.length || 0;
    if (colCount <= 1) {
      table.remove();
      setActiveBlock(null);
    } else {
      const lastIndex = colCount - 1;
      for (let i = 0; i < table.rows.length; i++) {
        const row = table.rows[i];
        if (row.cells[lastIndex]) {
          row.cells[lastIndex].remove();
        }
      }
    }
    handleEditorInput();
  };

  // Final Save Handler
  const handleSaveAll = () => {
    if (!lesson) return;
    const sanitizedSlides = slides.map((s, idx) => ({
      ...s,
      title: s.title.trim() || `Trang ${idx + 1}`,
      contentHtml: s.contentHtml.trim(),
    }));

    const updatedLesson: Lesson = {
      ...lesson,
      slides: sanitizedSlides,
    };

    onSave(updatedLesson);
    onClose();
  };

  if (!isOpen || !lesson) return null;

  const currentSlide = slides[activeSlideIndex] || slides[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
      <div className={`${theme.card} w-full max-w-5xl h-[94vh] rounded-2xl border ${theme.border} flex flex-col overflow-hidden shadow-2xl`}>
        
        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-inherit flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base leading-tight">
                  Thiết kế nội dung bài học: {lesson.title}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  {slides.length} trang bài giảng
                </span>
              </div>
              <p className={`text-xs ${theme.textMuted} hidden sm:block`}>
                Soạn slide lý thuyết, bảng cấu trúc, chèn hình ảnh và nút loa phát âm thanh
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle: Edit / Preview */}
            <div className="flex items-center p-1 rounded-xl bg-neutral-500/10 border border-neutral-500/20">
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => setViewMode('edit')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'edit'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : `${theme.textMuted} hover:text-white`
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Soạn thảo</span>
              </button>
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'preview'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : `${theme.textMuted} hover:text-white`
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Xem trước</span>
              </button>
            </div>

            {/* Print / Export PDF button */}
            <button
              type="button"
              id="btn-print-lesson-content-from-editor"
              onClick={() => setIsPrintModalOpen(true)}
              className="px-3 py-1.5 rounded-xl border border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="In nội dung bài học ra file PDF (có thể chọn trang)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">In PDF</span>
            </button>

            {/* Save Button */}
            <button
              type="button"
              id="btn-save-lesson-content"
              onClick={handleSaveAll}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Lưu nội dung</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 rounded-lg hover:${theme.highlight} ${theme.textMuted} cursor-pointer`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Slide Selector & Navigation Bar */}
        <div className={`px-4 py-2 border-b border-inherit ${theme.badgeBg} flex items-center justify-between gap-2 overflow-x-auto shrink-0`}>
          <div className="flex items-center gap-1.5 min-w-0">
            {slides.map((slide, idx) => {
              const isActive = idx === activeSlideIndex;
              return (
                <div 
                  key={`editor_slide_tab_${slide.id || 'slide'}_${idx}`}
                  className={`flex items-center rounded-xl border transition-all shrink-0 ${
                    isActive 
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm' 
                      : `${theme.card} ${theme.border} hover:${theme.highlight}`
                  }`}
                >
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => setActiveSlideIndex(idx)}
                    className="px-3 py-1.5 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Trang {idx + 1}</span>
                  </button>

                  {slides.length > 1 && (
                    <button
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSlide(idx);
                      }}
                      className={`pr-2 pl-1 py-1.5 opacity-60 hover:opacity-100 transition-opacity cursor-pointer`}
                      title="Xóa trang này"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Add Slide Button */}
            <button
              type="button"
              id="btn-add-new-lecture-slide"
              onMouseDown={e => e.preventDefault()}
              onClick={handleAddSlide}
              className={`px-3 py-1.5 rounded-xl border border-dashed border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 text-xs font-medium flex items-center gap-1 shrink-0 cursor-pointer`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm trang mới</span>
            </button>
          </div>

          {/* Slide Actions: Reorder / Duplicate */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onMouseDown={e => e.preventDefault()}
              disabled={activeSlideIndex === 0}
              onClick={() => handleMoveSlide('left')}
              className={`p-1.5 rounded-lg border ${theme.border} disabled:opacity-30 cursor-pointer`}
              title="Dời trang sang trái"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={e => e.preventDefault()}
              disabled={activeSlideIndex === slides.length - 1}
              onClick={() => handleMoveSlide('right')}
              className={`p-1.5 rounded-lg border ${theme.border} disabled:opacity-30 cursor-pointer`}
              title="Dời trang sang phải"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={handleDuplicateSlide}
              className={`p-1.5 rounded-lg border ${theme.border} hover:${theme.highlight} cursor-pointer`}
              title="Nhân bản trang này"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Slide Title Bar */}
        <div className="px-4 py-2 border-b border-inherit flex items-center gap-3 shrink-0 bg-black/5">
          <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider shrink-0">
            Tiêu đề trang {activeSlideIndex + 1}:
          </span>
          <input
            type="text"
            value={activeSlideTitle}
            onChange={e => handleTitleChange(e.target.value)}
            placeholder="Ví dụ: Trang 1: Công thức & Dạng câu"
            className={`flex-1 px-3 py-1 text-xs sm:text-sm font-semibold rounded-lg ${theme.inputBg} border ${theme.border} focus:outline-none focus:border-emerald-500`}
          />
        </div>

        {/* Office Word-style Ribbon Toolbar (PINNED at top, never scrolls away) */}
        {viewMode === 'edit' && (
          <div className="shrink-0 border-b border-inherit bg-neutral-200/50 dark:bg-black/20 flex flex-col z-20 shadow-xs">
            {/* Ribbon Tab Header */}
            <div className="px-4 py-1 border-b border-inherit/40 flex items-center justify-between text-xs bg-neutral-300/40 dark:bg-black/10">
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 rounded-t-lg bg-emerald-600 text-white font-bold flex items-center gap-1.5 shadow-sm">
                  <span>📄</span>
                  <span>Trang đầu (Home)</span>
                </div>
                <span className={`text-[11px] ${theme.textMuted} hidden md:inline-flex items-center gap-1`}>
                  <span>📌</span>
                  <span>Thanh công cụ Office Home được ghim cố định – không bị trôi khi cuộn</span>
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-emerald-800 dark:text-emerald-400 font-bold">
                <span>Soạn thảo văn bản Word</span>
              </div>
            </div>

            {/* Ribbon Command Groups Bar */}
            <div className="p-2 overflow-x-auto flex items-stretch gap-2 text-xs select-none">
              {/* Group 1: Phông chữ & Kiểu chữ */}
              <div className="flex flex-col justify-between p-1.5 rounded-xl bg-white/80 dark:bg-black/20 border border-neutral-300 dark:border-neutral-700/60 shrink-0 shadow-xs">
                <div className="flex items-center gap-1">
                  {/* Headings */}
                  <div className="flex items-center gap-0.5 border-r border-neutral-300 dark:border-neutral-700 pr-1.5 mr-0.5">
                    <button
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => executeCommand('formatBlock', '<h2>')}
                      className={`px-2 py-1 rounded hover:${theme.highlight} font-bold text-xs`}
                      title="Tiêu đề lớn (H2)"
                    >
                      H2
                    </button>
                    <button
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => executeCommand('formatBlock', '<h3>')}
                      className={`px-2 py-1 rounded hover:${theme.highlight} font-bold text-xs`}
                      title="Tiêu đề vừa (H3)"
                    >
                      H3
                    </button>
                    <button
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => executeCommand('formatBlock', '<p>')}
                      className={`px-2 py-1 rounded hover:${theme.highlight} text-xs font-bold`}
                      title="Văn bản thường (P)"
                    >
                      <Type className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Bold, Italic, Underline */}
                  <div className="flex items-center gap-0.5 border-r border-neutral-300 dark:border-neutral-700 pr-1.5 mr-0.5">
                    <button
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => executeCommand('bold')}
                      className={`p-1.5 rounded hover:${theme.highlight} font-bold`}
                      title="In đậm (Ctrl+B)"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => executeCommand('italic')}
                      className={`p-1.5 rounded hover:${theme.highlight}`}
                      title="In nghiêng (Ctrl+I)"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => executeCommand('underline')}
                      className={`p-1.5 rounded hover:${theme.highlight}`}
                      title="Gạch chân (Ctrl+U)"
                    >
                      <Underline className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Color Palette */}
                  <div className="flex items-center gap-1 pl-0.5">
                    <button
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => executeCommand('foreColor', '#10b981')}
                      className="w-3.5 h-3.5 rounded-full bg-emerald-500 hover:scale-125 transition-transform"
                      title="Màu xanh ngọc (Emerald)"
                    />
                    <button
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => executeCommand('foreColor', '#0284c7')}
                      className="w-3.5 h-3.5 rounded-full bg-sky-500 hover:scale-125 transition-transform"
                      title="Màu xanh lam (Sky)"
                    />
                    <button
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => executeCommand('foreColor', '#8b5cf6')}
                      className="w-3.5 h-3.5 rounded-full bg-violet-500 hover:scale-125 transition-transform"
                      title="Màu tím (Violet)"
                    />
                    <button
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => executeCommand('foreColor', '#f59e0b')}
                      className="w-3.5 h-3.5 rounded-full bg-amber-500 hover:scale-125 transition-transform"
                      title="Màu cam hổ phách"
                    />
                    <button
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => executeCommand('foreColor', '#f43f5e')}
                      className="w-3.5 h-3.5 rounded-full bg-rose-500 hover:scale-125 transition-transform"
                      title="Màu đỏ hồng"
                    />
                  </div>
                </div>
                <div className="text-[10px] text-center text-neutral-700 dark:text-neutral-400 font-bold tracking-wider uppercase mt-1 pt-0.5 border-t border-neutral-300 dark:border-neutral-700/60">
                  Phông chữ
                </div>
              </div>

              {/* Group 2: Đoạn văn (Căn lề & Danh sách) */}
              <div className="flex flex-col justify-between p-1.5 rounded-xl bg-white/80 dark:bg-black/20 border border-neutral-300 dark:border-neutral-700/60 shrink-0 shadow-xs">
                <div className="flex items-center gap-1">
                  {/* Alignment */}
                  <div className="flex items-center gap-0.5 border-r border-neutral-300 dark:border-neutral-700 pr-1.5 mr-0.5">
                    <button
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => executeCommand('justifyLeft')}
                      className={`p-1.5 rounded hover:${theme.highlight}`}
                      title="Căn trái"
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => executeCommand('justifyCenter')}
                      className={`p-1.5 rounded hover:${theme.highlight}`}
                      title="Căn giữa"
                    >
                      <AlignCenter className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => executeCommand('justifyRight')}
                      className={`p-1.5 rounded hover:${theme.highlight}`}
                      title="Căn phải"
                    >
                      <AlignRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => executeCommand('justifyFull')}
                      className={`p-1.5 rounded hover:${theme.highlight}`}
                      title="Căn đều 2 bên"
                    >
                      <AlignJustify className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Lists */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => executeCommand('insertUnorderedList')}
                      className={`p-1.5 rounded hover:${theme.highlight}`}
                      title="Danh sách dấu chấm"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => executeCommand('insertOrderedList')}
                      className={`p-1.5 rounded hover:${theme.highlight}`}
                      title="Danh sách số"
                    >
                      <ListOrdered className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={insertCheckmarkList}
                      className={`px-2 py-1 rounded hover:${theme.highlight} text-emerald-800 dark:text-emerald-400 font-bold flex items-center gap-1`}
                      title="Danh sách tích xanh"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span className="text-[11px]">List ✓</span>
                    </button>
                  </div>
                </div>
                <div className="text-[10px] text-center text-neutral-700 dark:text-neutral-400 font-bold tracking-wider uppercase mt-1 pt-0.5 border-t border-neutral-300 dark:border-neutral-700/60">
                  Đoạn văn
                </div>
              </div>

              {/* Group 3: Chèn (Bảng, Ảnh, Nút loa, Kho) */}
              <div className="flex flex-col justify-between p-1.5 rounded-xl bg-white/80 dark:bg-black/20 border border-neutral-300 dark:border-neutral-700/60 shrink-0 shadow-xs">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => setIsTableModalOpen(true)}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-600/20 text-emerald-900 dark:text-emerald-300 hover:bg-emerald-200 font-bold flex items-center gap-1 border border-emerald-400/60 dark:border-emerald-500/30 cursor-pointer"
                    title="Tạo bảng tùy chỉnh số dòng, cột & độ rộng"
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    <span>Tạo bảng</span>
                  </button>

                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => {
                      setMediaInitialTab('image');
                      setIsMediaLibraryOpen(true);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-sky-100 dark:bg-sky-600/20 text-sky-900 dark:text-sky-300 hover:bg-sky-200 border border-sky-400/60 dark:border-sky-500/30 font-bold flex items-center gap-1 cursor-pointer"
                    title="Chèn hình ảnh vào vị trí con trỏ"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Hình ảnh</span>
                  </button>

                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => {
                      setMediaInitialTab('audio');
                      setIsMediaLibraryOpen(true);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-teal-100 dark:bg-teal-600/20 text-teal-900 dark:text-teal-300 hover:bg-teal-200 border border-teal-400/60 dark:border-teal-500/30 font-bold flex items-center gap-1 cursor-pointer"
                    title="Chèn thanh phát âm thanh có tua và điều chỉnh tốc độ"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Thanh âm thanh</span>
                  </button>

                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => {
                      setMediaInitialTab('all');
                      setIsMediaLibraryOpen(true);
                    }}
                    className={`p-1.5 rounded-lg border border-amber-400/60 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 cursor-pointer`}
                    title="Mở kho quản lý hình ảnh & âm thanh"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                  </button>
                </div>
                <div className="text-[10px] text-center text-neutral-700 dark:text-neutral-400 font-bold tracking-wider uppercase mt-1 pt-0.5 border-t border-neutral-300 dark:border-neutral-700/60">
                  Chèn (Insert)
                </div>
              </div>

              {/* Group 4: Khung mẫu Ngữ pháp */}
              <div className="flex flex-col justify-between p-1.5 rounded-xl bg-white/80 dark:bg-black/20 border border-neutral-300 dark:border-neutral-700/60 shrink-0 shadow-xs">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={insertFormulaBox}
                    className="px-2 py-1 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-500/10 text-emerald-950 dark:text-emerald-300 border border-emerald-400/60 dark:border-emerald-500/30 hover:bg-emerald-200"
                    title="Chèn khung Công thức"
                  >
                    📐 Công thức
                  </button>
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={insertTipBox}
                    className="px-2 py-1 rounded text-[11px] font-bold bg-purple-100 dark:bg-purple-500/10 text-purple-950 dark:text-purple-300 border border-purple-400/60 dark:border-purple-500/30 hover:bg-purple-200"
                    title="Chèn khung Mẹo nhớ"
                  >
                    💡 Mẹo nhớ
                  </button>
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={insertCautionBox}
                    className="px-2 py-1 rounded text-[11px] font-bold bg-amber-100 dark:bg-amber-500/10 text-amber-950 dark:text-amber-300 border border-amber-400/60 dark:border-amber-500/30 hover:bg-amber-200"
                    title="Chèn khung Lưu ý"
                  >
                    ⚠️ Lưu ý
                  </button>
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={insertExampleBox}
                    className="px-2 py-1 rounded text-[11px] font-bold bg-sky-100 dark:bg-sky-500/10 text-sky-950 dark:text-sky-300 border border-sky-400/60 dark:border-sky-500/30 hover:bg-sky-200"
                    title="Chèn khung Ví dụ"
                  >
                    💬 Ví dụ
                  </button>
                </div>
                <div className="text-[10px] text-center text-neutral-700 dark:text-neutral-400 font-bold tracking-wider uppercase mt-1 pt-0.5 border-t border-neutral-300 dark:border-neutral-700/60">
                  Mẫu khung học tập
                </div>
              </div>

              {/* Group 5: Gemini AI Help Me Write (Google Docs Style) */}
              <div className="flex flex-col justify-between p-1.5 rounded-xl bg-linear-to-r from-purple-500/15 via-indigo-500/15 to-emerald-500/15 border border-purple-500/40 shrink-0 shadow-sm">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => handleOpenGeminiModal('full_lecture')}
                    className="px-3 py-1.5 rounded-lg bg-linear-to-r from-purple-600 via-indigo-600 to-emerald-600 hover:opacity-90 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-500/20 cursor-pointer transition-all active:scale-95"
                    title="Mở Trợ lý AI Gemini Soạn bài thông minh phong cách Google Docs (Help me write)"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                    <span>✨ Gemini Soạn bài</span>
                  </button>
                </div>
                <div className="text-[10px] text-center text-purple-700 dark:text-purple-300 font-bold tracking-wider uppercase mt-1 pt-0.5 border-t border-purple-500/30">
                  Gemini in Docs
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Word-like Block Handle Floating Bar (PINNED under the ribbon when a Table, Box, Image, or Audio is clicked) */}
        {activeBlock && viewMode === 'edit' && (
          <div className="px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/30 flex flex-wrap items-center justify-between gap-2 shrink-0 z-10 animate-fadeIn">
            <div className="flex items-center gap-2">
              {/* Word Handle [+] icon */}
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={handleSelectEntireBlock}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm cursor-pointer"
                title="Bôi đen toàn bộ khối (giống nút [+] trong Word)"
              >
                <span>✢</span>
                <span>Chọn toàn bộ</span>
              </button>

              <span className="text-xs font-bold uppercase text-emerald-500 dark:text-emerald-400">
                {activeBlock.type === 'table' && '📊 Bảng dữ liệu'}
                {activeBlock.type === 'box' && '📐 Khung học tập'}
                {activeBlock.type === 'image' && '🖼 Hình ảnh'}
                {activeBlock.type === 'audio' && '🎵 Thanh âm thanh'}
              </span>

              {/* Width Selector */}
              <div className="flex items-center gap-1 ml-2 text-xs">
                <span className={theme.textMuted}>Độ rộng:</span>
                {(['100%', '75%', '50%'] as const).map(w => (
                  <button
                    key={w}
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => handleSetBlockWidth(w)}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                      activeBlock.width === w 
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500' 
                        : `${theme.border} ${theme.textMuted}`
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>

              {/* Table specific controls: add/del row & col */}
              {activeBlock.type === 'table' && (
                <div className="flex items-center gap-1 ml-2 border-l border-inherit pl-2">
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={handleAddTableRow}
                    className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                    title="Thêm 1 hàng mới phía dưới"
                  >
                    + Hàng
                  </button>
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={handleDeleteTableRow}
                    className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20"
                    title="Xóa hàng cuối"
                  >
                    - Hàng
                  </button>
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={handleAddTableColumn}
                    className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                    title="Thêm 1 cột mới bên phải"
                  >
                    + Cột
                  </button>
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={handleDeleteTableColumn}
                    className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20"
                    title="Xóa cột cuối"
                  >
                    - Cột
                  </button>
                </div>
              )}
            </div>

            {/* Easy Delete Button with trash icon */}
            <button
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={handleDeleteActiveBlock}
              className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/40 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              title="Xóa toàn bộ khối này"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa khối</span>
            </button>
          </div>
        )}

        {/* Scrollable Document Canvas (ONLY THIS SCROLLS underneath the pinned Home Ribbon) */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-black/20 p-4 sm:p-6 relative">
          {viewMode === 'edit' ? (
            <div className="w-full flex flex-col items-center">
              {/* Word Document Sheet Page */}
              <div 
                className={`w-full max-w-4xl min-h-[580px] p-6 sm:p-10 rounded-2xl border ${theme.border} ${theme.card} shadow-xl focus:outline-none lecture-content leading-relaxed`}
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleEditorInput}
                onKeyUp={saveCurrentSelection}
                onMouseUp={saveCurrentSelection}
                onPointerUp={saveCurrentSelection}
                onSelect={saveCurrentSelection}
                onClick={saveCurrentSelection}
              />

              {/* Floating Gemini AI Prompt Trigger */}
              <div className="sticky bottom-4 right-4 self-end mt-4 z-20">
                <button
                  type="button"
                  onClick={() => handleOpenGeminiModal('full_lecture')}
                  className="px-3.5 py-2 rounded-2xl bg-linear-to-r from-purple-600 via-indigo-600 to-emerald-600 hover:opacity-95 text-white font-bold text-xs flex items-center gap-2 shadow-xl shadow-purple-900/30 border border-white/20 cursor-pointer transition-all active:scale-95"
                  title="Mở Trợ lý AI Gemini Soạn bài thông minh (Help me write)"
                >
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span>✨ Trợ lý Gemini Soạn bài</span>
                </button>
              </div>
            </div>
          ) : (
            /* Student View Preview Mode */
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="border-b border-inherit pb-3">
                <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">
                  Chế độ xem trước của học sinh (Trang {activeSlideIndex + 1}/{slides.length})
                </span>
                <h2 className="text-2xl font-bold mt-1 tracking-tight">
                  {activeSlideTitle || `Trang ${activeSlideIndex + 1}`}
                </h2>
              </div>

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

        {/* Footer Navigation info */}
        <div className="px-4 py-2 border-t border-inherit flex items-center justify-between text-xs text-neutral-400 shrink-0">
          <div className="flex items-center gap-2">
            <span>Trang {activeSlideIndex + 1} trên {slides.length}</span>
            <span>•</span>
            <span>Click vào bảng hoặc khung để hiển thị thanh công cụ chỉnh sửa hoặc xóa nhanh</span>
          </div>
          <button
            type="button"
            id="btn-save-bottom"
            onClick={handleSaveAll}
            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Lưu bài học</span>
          </button>
        </div>
      </div>

      {/* Media Library Modal */}
      <MediaLibraryModal
        isOpen={isMediaLibraryOpen}
        onClose={() => setIsMediaLibraryOpen(false)}
        initialTab={mediaInitialTab}
        onSelectAsset={handleSelectMediaAsset}
      />

      {/* Custom Table Creator Popover / Modal */}
      {isTableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className={`${theme.card} w-full max-w-md rounded-2xl border ${theme.border} p-5 space-y-4 shadow-2xl`}>
            <div className="flex items-center justify-between border-b border-inherit pb-3">
              <div className="flex items-center gap-2">
                <TableIcon className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-sm">Tạo bảng cấu trúc tùy chỉnh</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTableModalOpen(false)}
                className={`p-1 rounded-lg ${theme.textMuted} hover:text-white`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Rows & Cols Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block font-semibold mb-1 ${theme.textMuted}`}>
                    Số hàng (Dòng):
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTableRows(r => Math.max(1, r - 1))}
                      className={`px-2.5 py-1 rounded-lg border ${theme.border} font-bold`}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={tableRows}
                      onChange={e => setTableRows(Math.max(1, parseInt(e.target.value) || 1))}
                      className={`w-full text-center py-1 rounded-lg ${theme.inputBg} border ${theme.border} font-bold`}
                    />
                    <button
                      type="button"
                      onClick={() => setTableRows(r => Math.min(20, r + 1))}
                      className={`px-2.5 py-1 rounded-lg border ${theme.border} font-bold`}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className={`block font-semibold mb-1 ${theme.textMuted}`}>
                    Số cột:
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTableCols(c => Math.max(1, c - 1))}
                      className={`px-2.5 py-1 rounded-lg border ${theme.border} font-bold`}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={8}
                      value={tableCols}
                      onChange={e => setTableCols(Math.max(1, Math.min(8, parseInt(e.target.value) || 1)))}
                      className={`w-full text-center py-1 rounded-lg ${theme.inputBg} border ${theme.border} font-bold`}
                    />
                    <button
                      type="button"
                      onClick={() => setTableCols(c => Math.min(8, c + 1))}
                      className={`px-2.5 py-1 rounded-lg border ${theme.border} font-bold`}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Header row toggle */}
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-neutral-500/10 border border-neutral-500/20">
                <input
                  type="checkbox"
                  checked={tableHasHeader}
                  onChange={e => setTableHasHeader(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-semibold">Hàng đầu tiên là Dòng tiêu đề (Header)</span>
              </label>

              {/* Table Width */}
              <div>
                <label className={`block font-semibold mb-1 ${theme.textMuted}`}>
                  Độ rộng bảng:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['100%', '75%', '50%'] as const).map(w => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setTableWidth(w)}
                      className={`py-1.5 rounded-xl border font-semibold text-center transition-all ${
                        tableWidth === w 
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm' 
                          : `${theme.border} ${theme.textMuted}`
                      }`}
                    >
                      {w === '100%' ? '100% (Toàn dòng)' : w === '75%' ? '75% (Lớn)' : '50% (Vừa)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cell Density */}
              <div>
                <label className={`block font-semibold mb-1 ${theme.textMuted}`}>
                  Độ thoáng ô bảng:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['compact', 'normal', 'spacious'] as const).map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setTableDensity(d)}
                      className={`py-1.5 rounded-xl border font-semibold text-center transition-all ${
                        tableDensity === d 
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm' 
                          : `${theme.border} ${theme.textMuted}`
                      }`}
                    >
                      {d === 'compact' ? 'Gọn gàng' : d === 'normal' ? 'Tiêu chuẩn' : 'Thoáng đãng'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-inherit">
              <button
                type="button"
                onClick={() => setIsTableModalOpen(false)}
                className={`px-3 py-1.5 rounded-xl border ${theme.border} text-xs`}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleInsertConfiguredTable}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Chèn bảng vào bài</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print PDF Modal */}
      <LessonPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        lesson={lesson ? { ...lesson, slides } : null}
      />

      {/* Gemini in Docs AI Assistant Modal (Help Me Write / Structure Lesson Content) */}
      {isGeminiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className={`${theme.card} w-full max-w-3xl max-h-[92vh] rounded-3xl border border-purple-500/40 shadow-2xl flex flex-col overflow-hidden animate-scaleUp`}>
            {/* Header with Gemini Gradient Accent */}
            <div className="p-4 sm:px-6 border-b border-inherit bg-linear-to-r from-purple-900/40 via-indigo-900/30 to-emerald-900/30 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-linear-to-tr from-purple-600 via-indigo-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-purple-500/30 text-white font-bold">
                  <Sparkles className="w-5 h-5 text-amber-200 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base tracking-tight bg-linear-to-r from-purple-300 via-indigo-200 to-emerald-300 bg-clip-text text-transparent">
                      Trợ lý AI Soạn bài (Gemini in Docs)
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      Help me write
                    </span>
                  </div>
                  <p className={`text-xs ${theme.textMuted}`}>
                    Tự động tạo bài giảng chuẩn hóa với khung công thức, bảng 3 thể (+, -, ?), mẹo nhớ & ví dụ
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (isGeminiLoading) handleStopGemini();
                  setIsGeminiModalOpen(false);
                }}
                className={`p-2 rounded-xl ${theme.textMuted} hover:text-white hover:bg-white/10 transition-colors cursor-pointer`}
                title="Đóng trợ lý"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {/* Mode Selection Tabs */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${theme.textMuted}`}>
                  Chọn định dạng bạn muốn Gemini hỗ trợ:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setGeminiMode('full_lecture')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      geminiMode === 'full_lecture'
                        ? 'bg-linear-to-r from-purple-600/20 to-indigo-600/20 border-purple-500 text-purple-300 shadow-md shadow-purple-500/10'
                        : `${theme.border} ${theme.textMuted} hover:bg-white/5`
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <span>📑</span>
                      <span>1. Toàn bộ bài giảng (2-4 Slide)</span>
                    </div>
                    <p className="text-[11px] opacity-80 mt-1">
                      Phân chia khoa học các trang: Công thức & Bảng thể câu, Mẹo nhớ, Lưu ý & Ví dụ
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGeminiMode('single_block')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      geminiMode === 'single_block'
                        ? 'bg-linear-to-r from-emerald-600/20 to-teal-600/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10'
                        : `${theme.border} ${theme.textMuted} hover:bg-white/5`
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <span>🧩</span>
                      <span>2. Chèn 1 khối nội dung</span>
                    </div>
                    <p className="text-[11px] opacity-80 mt-1">
                      Tạo công thức, bảng so sánh hoặc mẹo nhớ để chèn ngay vào vị trí con trỏ
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGeminiMode('refine')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      geminiMode === 'refine'
                        ? 'bg-linear-to-r from-amber-600/20 to-orange-600/20 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10'
                        : `${theme.border} ${theme.textMuted} hover:bg-white/5`
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <span>🪄</span>
                      <span>3. Chuẩn hóa trang hiện tại</span>
                    </div>
                    <p className="text-[11px] opacity-80 mt-1">
                      Format lại nội dung đang có trên trang thành các khung hộp và bảng mẫu đẹp mắt
                    </p>
                  </button>
                </div>
              </div>

              {/* Prompt Input Box */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`text-xs font-bold ${theme.textMuted}`}>
                    Yêu cầu soạn thảo cho Gemini:
                  </label>
                  <span className="text-[11px] text-purple-400 font-medium">
                    {lesson?.title ? `Chủ đề: ${lesson.title}` : ''}
                  </span>
                </div>
                <div className="relative">
                  <textarea
                    rows={3}
                    value={geminiPrompt}
                    onChange={e => setGeminiPrompt(e.target.value)}
                    placeholder="Ví dụ: Soạn bài giảng Thì Quá khứ hoàn thành với bảng 3 thể (+, -, ?), 3 ví dụ thực tế kèm dịch nghĩa và mẹo nhớ dấu hiệu by the time, before, after..."
                    className={`w-full p-3.5 pr-12 rounded-2xl ${theme.inputBg} border border-purple-500/40 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/60 leading-relaxed`}
                  />
                  <div className="absolute right-3 bottom-3 flex items-center gap-1.5">
                    {isGeminiLoading ? (
                      <button
                        type="button"
                        onClick={handleStopGemini}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm cursor-pointer"
                        title="Dừng tạo"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Dừng</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRunGeminiAssistant()}
                        disabled={!geminiPrompt.trim()}
                        className="px-4 py-1.5 rounded-xl bg-linear-to-r from-purple-600 to-indigo-600 hover:opacity-90 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-500/20 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                        <span>Soạn thảo</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Prompt Chips */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${theme.textMuted}`}>
                  Gợi ý yêu cầu nhanh (1 Click):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {GEMINI_QUICK_PROMPTS.map((qp, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setGeminiPrompt(qp.prompt);
                        setGeminiMode(qp.mode);
                        handleRunGeminiAssistant(qp.prompt, qp.mode);
                      }}
                      className={`p-2.5 rounded-xl border ${theme.border} hover:border-purple-500/50 bg-purple-500/5 hover:bg-purple-500/10 text-left transition-all flex flex-col justify-center cursor-pointer`}
                    >
                      <div className="font-bold text-xs text-purple-400 flex items-center justify-between">
                        <span>{qp.title}</span>
                        <ArrowRight className="w-3 h-3 opacity-60" />
                      </div>
                      <p className="text-[11px] opacity-75 mt-0.5 line-clamp-1">{qp.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Error Message */}
              {geminiError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{geminiError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRunGeminiAssistant()}
                    className="px-3 py-1 rounded-lg bg-rose-600/30 hover:bg-rose-600/40 font-bold"
                  >
                    Thử lại
                  </button>
                </div>
              )}

              {/* Loading Shimmer State */}
              {isGeminiLoading && (
                <div className="p-6 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-center space-y-3 animate-pulse">
                  <div className="flex items-center justify-center gap-2 text-purple-300 font-bold text-sm">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Gemini đang phân tích và thiết kế nội dung bài học...</span>
                  </div>
                  <p className={`text-xs ${theme.textMuted}`}>
                    Đang tạo các khung công thức chuẩn, cấu trúc bảng 3 thể và bộ ví dụ ngữ cảnh sinh động...
                  </p>
                </div>
              )}

              {/* Result Live Preview */}
              {geminiResult && !isGeminiLoading && (
                <div className="space-y-4 pt-2 border-t border-inherit">
                  {/* Summary Banner */}
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                      <Check className="w-4 h-4" />
                      <span>{geminiResult.summary || 'Đã tạo thành công nội dung bài học từ Gemini'}</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                      {geminiResult.mode === 'full_lecture' ? `${geminiResult.slides?.length || 0} Trang Slide` : 'Khối nội dung'}
                    </span>
                  </div>

                  {/* Multi-Slide Tab Selector (If full_lecture) */}
                  {geminiResult.mode === 'full_lecture' && geminiResult.slides && geminiResult.slides.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {geminiResult.slides.map((s, sIdx) => (
                          <button
                            key={`gemini_slide_preview_${s.id || 'slide'}_${sIdx}`}
                            type="button"
                            onClick={() => setGeminiPreviewSlideIdx(sIdx)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                              geminiPreviewSlideIdx === sIdx
                                ? 'bg-purple-600 text-white shadow-md'
                                : `${theme.inputBg} border ${theme.border} ${theme.textMuted} hover:text-white`
                            }`}
                          >
                            <span>Trang {sIdx + 1}: </span>
                            <span className="font-normal opacity-90">{s.title.replace(/^Trang \d+:\s*/i, '')}</span>
                          </button>
                        ))}
                      </div>

                      {/* Rendered Preview of Active Slide */}
                      <div className={`p-5 rounded-2xl border ${theme.border} bg-white dark:bg-neutral-900 shadow-inner max-h-[360px] overflow-y-auto lecture-content`}>
                        <div className="text-xs font-bold text-purple-500 uppercase tracking-wider mb-2 border-b border-inherit pb-1">
                          {geminiResult.slides[geminiPreviewSlideIdx]?.title}
                        </div>
                        <div 
                          dangerouslySetInnerHTML={{ 
                            __html: geminiResult.slides[geminiPreviewSlideIdx]?.contentHtml || '' 
                          }} 
                        />
                      </div>
                    </div>
                  )}

                  {/* Single Block or Refine Preview */}
                  {(geminiResult.mode === 'single_block' || geminiResult.mode === 'refine') && geminiResult.contentHtml && (
                    <div className={`p-5 rounded-2xl border ${theme.border} bg-white dark:bg-neutral-900 shadow-inner max-h-[360px] overflow-y-auto lecture-content`}>
                      <div 
                        dangerouslySetInnerHTML={{ 
                          __html: geminiResult.contentHtml 
                        }} 
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 sm:px-6 border-t border-inherit bg-black/20 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <span>Model: <b>{settings.aiModel || 'gemini-3.1-flash-lite'}</b></span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsGeminiModalOpen(false)}
                  className={`px-4 py-2 rounded-xl border ${theme.border} text-xs font-semibold hover:bg-white/5 cursor-pointer`}
                >
                  Đóng
                </button>

                {geminiResult && geminiResult.mode === 'full_lecture' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleApplyGeminiResult('append_slides')}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                      title="Thêm các trang này vào sau các trang hiện có"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm vào sau</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApplyGeminiResult('replace_all')}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                      title="Thay thế toàn bộ bài giảng bằng nội dung mới này"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Áp dụng toàn bộ ({geminiResult.slides?.length || 0} trang)</span>
                    </button>
                  </>
                )}

                {geminiResult && geminiResult.mode === 'single_block' && (
                  <button
                    type="button"
                    onClick={() => handleApplyGeminiResult('insert_cursor')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Chèn vào vị trí con trỏ</span>
                  </button>
                )}

                {geminiResult && geminiResult.mode === 'refine' && (
                  <button
                    type="button"
                    onClick={() => handleApplyGeminiResult('replace_current')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Cập nhật lên trang hiện tại</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
