import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  CheckSquare, 
  Square, 
  FileText, 
  Check, 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  Layers,
  Settings2,
  Sparkles,
  Info,
  Palette,
  Sun,
  Moon,
  Coffee,
  Zap
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Lesson, LessonSlide, ThemeMode } from '../types';
import { useTheme } from '../context/ThemeContext';

interface LessonPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: Lesson | null;
  topicTitle?: string;
}

export type PrintThemeOption = 'sepia' | 'light' | 'dark' | 'oled';

interface ThemeColorPalette {
  id: PrintThemeOption;
  name: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  bg: string;
  text: string;
  textMuted: string;
  border: string;
  headerBorder: string;
  accent: string;
  accentTitle: string;
  cardBg: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  formulaBoxBg: string;
  formulaBoxBorder: string;
  tableHeaderBg: string;
  tableBorder: string;
  swatchBg: string;
  swatchBorder: string;
}

const PRINT_THEMES: Record<PrintThemeOption, ThemeColorPalette> = {
  sepia: {
    id: 'sepia',
    name: 'Giấy Ấm (Sepia)',
    desc: 'Màu giấy ngà thư tịch vintage, chống mỏi mắt',
    icon: Coffee,
    bg: '#fcf8ec',
    text: '#2c2419',
    textMuted: '#6e5d48',
    border: '#d9caa9',
    headerBorder: '#8d5b2c',
    accent: '#8d5b2c',
    accentTitle: '#78461b',
    cardBg: '#f5ede0',
    badgeBg: '#ebdcc5',
    badgeText: '#5c3a17',
    badgeBorder: '#d4c09e',
    formulaBoxBg: '#f8f2e2',
    formulaBoxBorder: '#caa673',
    tableHeaderBg: '#ebdcc5',
    tableBorder: '#d9caa9',
    swatchBg: '#fcf8ec',
    swatchBorder: '#caa673',
  },
  light: {
    id: 'light',
    name: 'Sáng Tinh Giản (Light)',
    desc: 'Nền trắng thanh lịch, độ tương phản sắc nét',
    icon: Sun,
    bg: '#ffffff',
    text: '#0f172a',
    textMuted: '#475569',
    border: '#e2e8f0',
    headerBorder: '#0f172a',
    accent: '#059669',
    accentTitle: '#047857',
    cardBg: '#f8fafc',
    badgeBg: '#d1fae5',
    badgeText: '#065f46',
    badgeBorder: '#a7f3d0',
    formulaBoxBg: '#f0fdf4',
    formulaBoxBorder: '#86efac',
    tableHeaderBg: '#f1f5f9',
    tableBorder: '#cbd5e1',
    swatchBg: '#ffffff',
    swatchBorder: '#cbd5e1',
  },
  dark: {
    id: 'dark',
    name: 'Tối Dịu Mắt (Dark)',
    desc: 'Nền xám xanh Slate dịu mắt, huyền bí',
    icon: Moon,
    bg: '#0f172a',
    text: '#f8fafc',
    textMuted: '#94a3b8',
    border: '#334155',
    headerBorder: '#38bdf8',
    accent: '#38bdf8',
    accentTitle: '#38bdf8',
    cardBg: '#1e293b',
    badgeBg: '#1e293b',
    badgeText: '#38bdf8',
    badgeBorder: '#0284c7',
    formulaBoxBg: '#1e293b',
    formulaBoxBorder: '#475569',
    tableHeaderBg: '#1e293b',
    tableBorder: '#334155',
    swatchBg: '#0f172a',
    swatchBorder: '#38bdf8',
  },
  oled: {
    id: 'oled',
    name: 'Đen Neon (Cyber/OLED)',
    desc: 'Nền đen sâu tuyệt đối cùng sắc Neon nổi bật',
    icon: Zap,
    bg: '#030712',
    text: '#f9fafb',
    textMuted: '#9ca3af',
    border: '#06b6d4',
    headerBorder: '#22d3ee',
    accent: '#22d3ee',
    accentTitle: '#06b6d4',
    cardBg: '#090d1a',
    badgeBg: '#083344',
    badgeText: '#22d3ee',
    badgeBorder: '#06b6d4',
    formulaBoxBg: '#0b1329',
    formulaBoxBorder: '#0891b2',
    tableHeaderBg: '#0d1a33',
    tableBorder: '#0e7490',
    swatchBg: '#030712',
    swatchBorder: '#22d3ee',
  }
};

export const LessonPrintModal: React.FC<LessonPrintModalProps> = ({
  isOpen,
  onClose,
  lesson,
  topicTitle
}) => {
  const { settings, getThemeClasses } = useTheme();
  const theme = getThemeClasses();

  // Print Theme (defaults to current app theme: sepia, light, dark, or oled)
  const [printTheme, setPrintTheme] = useState<PrintThemeOption>(() => {
    if (settings.theme === 'light' || settings.theme === 'sepia' || settings.theme === 'dark' || settings.theme === 'oled') {
      return settings.theme as PrintThemeOption;
    }
    return 'sepia';
  });

  // Keep printTheme in sync with settings.theme when modal opens
  useEffect(() => {
    if (isOpen) {
      const currentUiTheme = (settings.theme || 'sepia') as PrintThemeOption;
      if (PRINT_THEMES[currentUiTheme]) {
        setPrintTheme(currentUiTheme);
      }
    }
  }, [isOpen, settings.theme]);

  const activeTheme = PRINT_THEMES[printTheme] || PRINT_THEMES.sepia;

  // Selected slide IDs to print
  const [selectedSlideIds, setSelectedSlideIds] = useState<string[]>([]);
  // Preview active page index among selected
  const [previewIndex, setPreviewIndex] = useState<number>(0);
  
  // Options
  const [includeHeader, setIncludeHeader] = useState<boolean>(true);
  const [includeFooter, setIncludeFooter] = useState<boolean>(true);
  
  // Export states
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<string>('');

  // Hidden print container for high-res off-screen rendering
  const printContainerRef = useRef<HTMLDivElement>(null);

  // Prepare slides list
  const slides: LessonSlide[] = React.useMemo(() => {
    if (!lesson) return [];
    if (lesson.slides && lesson.slides.length > 0) {
      return lesson.slides;
    }
    if (lesson.knowledgeSummary) {
      return [
        {
          id: 'summary_slide',
          title: 'Tóm tắt kiến thức trọng tâm',
          contentHtml: `
<div class="formula-box" style="background:#f0fdf4; border:1.5px solid #86efac; border-radius:8px; padding:16px; margin:12px 0;">
  <p style="font-size:16px; font-weight:bold; margin-bottom:8px; color:#10b981;">📌 Lý thuyết cốt lõi</p>
  <p style="font-size:14px; line-height:1.7; white-space:pre-line; margin:0; color:#1f2937;">${lesson.knowledgeSummary}</p>
</div>
          `.trim()
        }
      ];
    }
    return [];
  }, [lesson]);

  // When modal opens or lesson changes, default to selecting all slides
  useEffect(() => {
    if (isOpen && slides.length > 0) {
      setSelectedSlideIds(slides.map(s => s.id));
      setPreviewIndex(0);
    }
  }, [isOpen, slides]);

  if (!isOpen || !lesson) return null;

  const selectedSlides = slides.filter(s => selectedSlideIds.includes(s.id));
  const isAllSelected = slides.length > 0 && selectedSlideIds.length === slides.length;

  const handleToggleSlide = (slideId: string) => {
    setSelectedSlideIds(prev => {
      if (prev.includes(slideId)) {
        // Must keep at least 1 or allow 0 with validation
        return prev.filter(id => id !== slideId);
      } else {
        return [...prev, slideId];
      }
    });
  };

  const handleSelectAll = () => {
    setSelectedSlideIds(slides.map(s => s.id));
  };

  const handleDeselectAll = () => {
    setSelectedSlideIds([]);
  };

  // 1. Direct PDF Export using jsPDF + html2canvas (Guarantees exact 1 page per slide)
  const handleExportPdf = async () => {
    if (selectedSlides.length === 0) {
      alert('Vui lòng chọn ít nhất 1 trang để xuất PDF.');
      return;
    }

    try {
      setIsExportingPdf(true);
      setExportProgress('Khởi tạo tài liệu PDF...');

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = 210;
      const pdfHeight = 297;

      // Access hidden render container
      const container = printContainerRef.current;
      if (!container) throw new Error('Không tìm thấy container in');

      const pageElements = container.querySelectorAll<HTMLElement>('.pdf-export-sheet');

      for (let i = 0; i < pageElements.length; i++) {
        setExportProgress(`Đang chuyển đổi trang ${i + 1} / ${pageElements.length}...`);
        
        if (i > 0) {
          pdf.addPage('a4', 'portrait');
        }

        const el = pageElements[i];
        
        // Render element to canvas with high resolution and active theme background
        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: activeTheme.bg,
          windowWidth: 794, // Standard 96 DPI A4 width in pixels
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;
        
        // Add image to page
        pdf.addImage(
          imgData, 
          'JPEG', 
          0, 
          0, 
          pdfWidth, 
          Math.min(pdfHeight, imgHeight)
        );
      }

      setExportProgress('Đang tải file PDF xuống...');
      const cleanFileName = (lesson.title || 'Bai_hoc')
        .replace(/[/\\?%*:|"<>]/g, '_')
        .replace(/\s+/g, '_');
      const cleanTheme = activeTheme.name.replace(/[/\\?%*:|"<>]/g, '_').replace(/\s+/g, '_');
      
      pdf.save(`${cleanFileName}_${cleanTheme}.pdf`);
      setExportProgress('');
    } catch (error) {
      console.error('Lỗi khi xuất PDF:', error);
      alert('Có lỗi xảy ra khi tạo file PDF. Vui lòng thử lại hoặc sử dụng tính năng In trình duyệt.');
    } finally {
      setIsExportingPdf(false);
      setExportProgress('');
    }
  };

  // 2. Native Browser Print to PDF via hidden iframe (Vector crisp text & OS printer dialog)
  const handleNativePrint = () => {
    if (selectedSlides.length === 0) {
      alert('Vui lòng chọn ít nhất 1 trang để in.');
      return;
    }

    const container = printContainerRef.current;
    if (!container) return;

    // Create a hidden printing iframe to avoid disturbing main page
    let printIframe = document.getElementById('lesson-print-iframe') as HTMLIFrameElement;
    if (!printIframe) {
      printIframe = document.createElement('iframe');
      printIframe.id = 'lesson-print-iframe';
      printIframe.style.position = 'fixed';
      printIframe.style.right = '0';
      printIframe.style.bottom = '0';
      printIframe.style.width = '0';
      printIframe.style.height = '0';
      printIframe.style.border = '0';
      document.body.appendChild(printIframe);
    }

    const iframeDoc = printIframe.contentDocument || printIframe.contentWindow?.document;
    if (!iframeDoc) return;

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${lesson.title} - In nội dung bài học (${activeTheme.name})</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm 12mm 12mm 12mm;
            }
            * {
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 0;
              background: ${activeTheme.bg} !important;
              color: ${activeTheme.text} !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .pdf-export-sheet {
              page-break-after: always !important;
              break-after: page !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              min-height: 260mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              padding: 10mm 12mm;
              box-sizing: border-box;
              background: ${activeTheme.bg} !important;
              color: ${activeTheme.text} !important;
            }
            .pdf-export-sheet:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
            }
            /* Styling elements */
            .formula-box, .grammar-box {
              background: ${activeTheme.formulaBoxBg} !important;
              border: 1.5px solid ${activeTheme.formulaBoxBorder} !important;
              border-radius: 8px;
              padding: 12px 16px;
              margin: 12px 0;
              color: ${activeTheme.text} !important;
            }
            .tip-box, .example-box, .caution-box, .note-box {
              background: ${activeTheme.formulaBoxBg} !important;
              border: 1.5px solid ${activeTheme.border} !important;
              border-radius: 8px;
              padding: 12px 16px;
              margin: 12px 0;
              color: ${activeTheme.text} !important;
            }
            table {
              width: 100% !important;
              border-collapse: collapse !important;
              margin: 12px 0 !important;
              font-size: 13px !important;
              border: 1px solid ${activeTheme.tableBorder} !important;
            }
            th, td {
              border: 1px solid ${activeTheme.tableBorder} !important;
              padding: 8px 12px !important;
              text-align: left !important;
              color: ${activeTheme.text} !important;
            }
            th {
              background: ${activeTheme.tableHeaderBg} !important;
              font-weight: 600 !important;
            }
            h1, h2, h3, h4 {
              margin-top: 8px;
              margin-bottom: 6px;
              color: ${activeTheme.text} !important;
            }
            p {
              line-height: 1.65;
              margin: 6px 0;
              color: ${activeTheme.text} !important;
            }
            .lecture-audio-bar, .lecture-audio-widget {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              padding: 6px 12px;
              background: ${activeTheme.badgeBg} !important;
              border: 1px solid ${activeTheme.badgeBorder} !important;
              border-radius: 6px;
              font-size: 12px;
              color: ${activeTheme.badgeText} !important;
              margin: 6px 0;
            }
          </style>
        </head>
        <body>
          ${container.innerHTML}
        </body>
      </html>
    `);
    iframeDoc.close();

    // Trigger print after iframe renders
    setTimeout(() => {
      printIframe.contentWindow?.focus();
      printIframe.contentWindow?.print();
    }, 400);
  };

  const currentPreviewSlide = selectedSlides[previewIndex] || selectedSlides[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
      <div className={`${theme.card} w-full max-w-5xl h-[92vh] rounded-2xl border ${theme.border} flex flex-col overflow-hidden shadow-2xl`}>
        
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-inherit flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center font-bold">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base leading-tight">In / Xuất PDF nội dung bài học</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {selectedSlides.length} / {slides.length} trang đã chọn
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border" style={{ backgroundColor: activeTheme.badgeBg, color: activeTheme.badgeText, borderColor: activeTheme.badgeBorder }}>
                  <Palette className="w-3 h-3" />
                  Nền: {activeTheme.name}
                </span>
              </div>
              <p className={`text-xs ${theme.textMuted} mt-0.5`}>
                {lesson.title} {topicTitle ? `• ${topicTitle}` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg hover:${theme.highlight} ${theme.textMuted}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Left sidebar (Slide selection & Options) + Right side (A4 Preview) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Panel: Slide Selection Checklist & Settings */}
          <div className={`w-full md:w-84 border-b md:border-b-0 md:border-r border-inherit p-4 overflow-y-auto flex flex-col justify-between shrink-0 ${theme.badgeBg}`}>
            <div className="space-y-4">
              
              {/* Theme Selector for PDF */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Màu nền PDF (Ăn theo UI)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const currentUiTheme = (settings.theme || 'sepia') as PrintThemeOption;
                      if (PRINT_THEMES[currentUiTheme]) {
                        setPrintTheme(currentUiTheme);
                      }
                    }}
                    className="text-[10px] text-indigo-400 hover:underline cursor-pointer"
                    title="Đồng bộ theo giao diện trang web đang dùng"
                  >
                    Đồng bộ UI ({settings.theme})
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {(Object.keys(PRINT_THEMES) as PrintThemeOption[]).map(themeKey => {
                    const item = PRINT_THEMES[themeKey];
                    const Icon = item.icon;
                    const isSelected = printTheme === themeKey;
                    return (
                      <button
                        key={themeKey}
                        type="button"
                        id={`btn-print-theme-${themeKey}`}
                        onClick={() => setPrintTheme(themeKey)}
                        className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                          isSelected 
                            ? 'border-indigo-500 bg-indigo-500/15 font-semibold ring-2 ring-indigo-500/30' 
                            : 'border-neutral-500/20 hover:border-neutral-500/40 bg-neutral-500/5'
                        }`}
                      >
                        <div 
                          className="w-4 h-4 rounded-full border shrink-0 flex items-center justify-center"
                          style={{ backgroundColor: item.swatchBg, borderColor: item.swatchBorder }}
                        >
                          <Icon className="w-2.5 h-2.5" style={{ color: item.accent }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[11px] block truncate font-medium">{item.name}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Slide Selection Header */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                    Chọn trang muốn in ({selectedSlideIds.length}/{slides.length})
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-[11px] font-semibold text-indigo-400 hover:underline cursor-pointer"
                    >
                      Tất cả
                    </button>
                    <span className="text-neutral-500">•</span>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="text-[11px] font-semibold text-neutral-400 hover:underline cursor-pointer"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                </div>

                {/* Slides List with Checkboxes */}
                {slides.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-neutral-500/30 text-center text-xs text-neutral-400">
                    Bài học này chưa có trang bài giảng nào.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-56 md:max-h-72 overflow-y-auto pr-1">
                    {slides.map((slide, idx) => {
                      const isChecked = selectedSlideIds.includes(slide.id);
                      return (
                        <div
                          key={slide.id}
                          onClick={() => handleToggleSlide(slide.id)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                            isChecked
                              ? 'border-indigo-500/40 bg-indigo-500/10'
                              : 'border-neutral-500/20 bg-neutral-500/5 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <div className="pt-0.5 shrink-0 text-indigo-400">
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 fill-indigo-500/20 text-indigo-400" />
                            ) : (
                              <Square className="w-4 h-4 text-neutral-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-semibold block truncate">
                              {slide.title || `Trang ${idx + 1}`}
                            </span>
                            <span className="text-[10px] text-neutral-400 block">
                              Trang {idx + 1}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Layout Options */}
              <div className="pt-2 border-t border-inherit/40 space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">
                  Tùy chọn trang in
                </span>

                <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeHeader}
                    onChange={e => setIncludeHeader(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Tiêu đề & Tên bài học đầu mỗi trang</span>
                </label>

                <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeFooter}
                    onChange={e => setIncludeFooter(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Đánh số trang (Trang X / Y) ở chân trang</span>
                </label>

                <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-[11px] text-sky-400 flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    Mỗi trang được chọn sẽ tự động căn chỉnh thành <strong>1 trang A4 chuẩn trong file PDF</strong>.
                  </span>
                </div>
              </div>

            </div>

            {/* Print & Download Action Buttons */}
            <div className="pt-4 border-t border-inherit/60 space-y-2 mt-4">
              <button
                id="btn-confirm-download-pdf"
                type="button"
                disabled={selectedSlides.length === 0 || isExportingPdf}
                onClick={handleExportPdf}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isExportingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{exportProgress || 'Đang xuất PDF...'}</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Tải PDF nền {activeTheme.name}</span>
                  </>
                )}
              </button>

              <button
                id="btn-confirm-browser-print"
                type="button"
                disabled={selectedSlides.length === 0 || isExportingPdf}
                onClick={handleNativePrint}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold border border-neutral-500/30 hover:border-indigo-400 hover:bg-neutral-500/10 text-inherit disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all cursor-pointer"
                title="Mở hộp thoại in của trình duyệt để in hoặc lưu PDF"
              >
                <Printer className="w-4 h-4 text-neutral-400" />
                <span>In qua máy in / Trình duyệt</span>
              </button>
            </div>
          </div>

          {/* Right Panel: Interactive A4 Paper Preview */}
          <div className="flex-1 bg-neutral-950/60 p-4 sm:p-6 overflow-y-auto flex flex-col items-center">
            
            {selectedSlides.length === 0 ? (
              <div className="m-auto text-center p-8 max-w-sm space-y-2">
                <FileText className="w-12 h-12 mx-auto text-neutral-500 opacity-40" />
                <h4 className="text-sm font-bold text-neutral-300">Chưa chọn trang nào</h4>
                <p className="text-xs text-neutral-500">
                  Vui lòng tích chọn các trang bài giảng bạn muốn in ở danh sách bên trái.
                </p>
              </div>
            ) : (
              <div className="w-full max-w-[700px] flex flex-col items-center space-y-3">
                
                {/* Preview Navigation Bar */}
                <div className="w-full flex items-center justify-between px-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-300">Xem trước A4:</span>
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                      Trang {previewIndex + 1} / {selectedSlides.length}
                    </span>
                    <span className="text-[11px] font-mono text-neutral-400">
                      [{activeTheme.name}]
                    </span>
                  </div>

                  {selectedSlides.length > 1 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={previewIndex === 0}
                        onClick={() => setPreviewIndex(prev => Math.max(0, prev - 1))}
                        className="p-1 rounded-lg border border-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-800 text-neutral-300 cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-[11px] text-neutral-400 font-mono">
                        {previewIndex + 1}/{selectedSlides.length}
                      </span>
                      <button
                        type="button"
                        disabled={previewIndex === selectedSlides.length - 1}
                        onClick={() => setPreviewIndex(prev => Math.min(selectedSlides.length - 1, prev + 1))}
                        className="p-1 rounded-lg border border-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-800 text-neutral-300 cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Simulated A4 Paper Sheet with dynamically selected Theme */}
                <div 
                  className="w-full rounded-lg shadow-2xl border p-8 sm:p-10 flex flex-col justify-between min-h-[820px] transition-all"
                  style={{
                    backgroundColor: activeTheme.bg,
                    color: activeTheme.text,
                    borderColor: activeTheme.border
                  }}
                >
                  
                  {/* Top Sheet Header */}
                  <div>
                    {includeHeader && (
                      <div 
                        className="pb-3 mb-6 flex items-start justify-between gap-4 border-b-2"
                        style={{ borderColor: activeTheme.headerBorder }}
                      >
                        <div>
                          <span 
                            className="text-[10px] font-bold tracking-wider uppercase block"
                            style={{ color: activeTheme.accentTitle }}
                          >
                            {topicTitle || 'TÀI LIỆU BÀI HỌC'}
                          </span>
                          <h2 
                            className="text-lg sm:text-xl font-bold leading-tight"
                            style={{ color: activeTheme.text }}
                          >
                            {lesson.title}
                          </h2>
                          {lesson.description && (
                            <p 
                              className="text-xs mt-0.5"
                              style={{ color: activeTheme.textMuted }}
                            >
                              {lesson.description}
                            </p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span 
                            className="text-[11px] font-bold px-2 py-0.5 rounded border block"
                            style={{
                              backgroundColor: activeTheme.badgeBg,
                              color: activeTheme.badgeText,
                              borderColor: activeTheme.badgeBorder
                            }}
                          >
                            Trang {previewIndex + 1} / {selectedSlides.length}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Slide Title */}
                    <div className="mb-4">
                      <h3 
                        className="text-base sm:text-lg font-bold pl-3 border-l-4"
                        style={{
                          color: activeTheme.accentTitle,
                          borderColor: activeTheme.accent
                        }}
                      >
                        {currentPreviewSlide?.title || `Nội dung trang ${previewIndex + 1}`}
                      </h3>
                    </div>

                    {/* Slide Content Rendered with Theme styling */}
                    <div 
                      className="lecture-content text-sm leading-relaxed"
                      style={{ color: activeTheme.text }}
                      dangerouslySetInnerHTML={{ 
                        __html: currentPreviewSlide?.contentHtml || '<p style="font-style:italic; opacity:0.6;">Trang này chưa có nội dung.</p>' 
                      }}
                    />
                  </div>

                  {/* Bottom Sheet Footer */}
                  {includeFooter && (
                    <div 
                      className="pt-3 mt-8 flex items-center justify-between text-[11px] border-t"
                      style={{
                        borderColor: activeTheme.border,
                        color: activeTheme.textMuted
                      }}
                    >
                      <span>{lesson.title} • Tài liệu học tập ({activeTheme.name})</span>
                      <span className="font-semibold">
                        Trang {previewIndex + 1} / {selectedSlides.length}
                      </span>
                    </div>
                  )}

                </div>

              </div>
            )}

          </div>

        </div>

      </div>

      {/* ========================================================= */}
      {/* HIDDEN OFF-SCREEN CONTAINER FOR PDF GENERATION & PRINTING */}
      {/* ========================================================= */}
      <div 
        style={{ position: 'fixed', top: '-10000px', left: '-10000px', width: '794px' }}
        aria-hidden="true"
      >
        <div ref={printContainerRef}>
          {selectedSlides.map((slide, idx) => (
            <div 
              key={slide.id || idx}
              className="pdf-export-sheet"
              style={{
                width: '794px',
                minHeight: '1120px',
                padding: '40px 48px',
                backgroundColor: activeTheme.bg,
                color: activeTheme.text,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxSizing: 'border-box'
              }}
            >
              {/* Page Top Content */}
              <div>
                {includeHeader && (
                  <div style={{ borderBottom: `2px solid ${activeTheme.headerBorder}`, paddingBottom: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase', color: activeTheme.accentTitle }}>
                        {topicTitle || 'TÀI LIỆU BÀI HỌC'}
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: activeTheme.text, marginTop: '2px' }}>
                        {lesson.title}
                      </div>
                      {lesson.description && (
                        <div style={{ fontSize: '11px', color: activeTheme.textMuted, marginTop: '2px' }}>
                          {lesson.description}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '4px', backgroundColor: activeTheme.badgeBg, color: activeTheme.badgeText, border: `1px solid ${activeTheme.badgeBorder}` }}>
                        Trang {idx + 1} / {selectedSlides.length}
                      </span>
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: activeTheme.accentTitle, borderLeft: `4px solid ${activeTheme.accent}`, paddingLeft: '12px' }}>
                    {slide.title || `Trang ${idx + 1}`}
                  </div>
                </div>

                <div 
                  className="lecture-content"
                  style={{ fontSize: '14px', lineHeight: '1.7', color: activeTheme.text }}
                  dangerouslySetInnerHTML={{ __html: slide.contentHtml || '' }}
                />
              </div>

              {/* Page Bottom Footer */}
              {includeFooter && (
                <div style={{ borderTop: `1px solid ${activeTheme.border}`, paddingTop: '12px', marginTop: '28px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: activeTheme.textMuted }}>
                  <span>{lesson.title} • Tài liệu học tập ({activeTheme.name})</span>
                  <span style={{ fontWeight: 'bold' }}>
                    Trang {idx + 1} / {selectedSlides.length}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
