import { LessonSlide } from '../types';

export interface LessonAiAssistantParams {
  prompt: string;
  mode?: 'full_lecture' | 'single_block' | 'refine';
  lessonTitle?: string;
  topicContext?: string;
  currentContent?: string;
  customApiKey?: string;
  model?: string;
  signal?: AbortSignal;
}

export interface LessonAiAssistantResult {
  status: 'success' | 'error';
  mode: 'full_lecture' | 'single_block' | 'refine';
  summary?: string;
  contentHtml?: string;
  slides?: LessonSlide[];
  error?: string;
}

/**
 * Ensures all slides have strictly unique IDs to avoid duplicate key warnings in React
 */
export function ensureUniqueSlideIds(slides: LessonSlide[]): LessonSlide[] {
  const seen = new Set<string>();
  const baseTime = Date.now();
  return slides.map((slide, index) => {
    let uniqueId = slide.id && slide.id.trim() ? slide.id.trim() : `slide_${baseTime}_${index + 1}`;
    if (seen.has(uniqueId)) {
      uniqueId = `${uniqueId}_${baseTime}_${index + 1}_${Math.random().toString(36).substring(2, 7)}`;
    }
    seen.add(uniqueId);
    return {
      ...slide,
      id: uniqueId,
    };
  });
}

/**
 * Offline template generator in case network or backend fails
 */
export function generateOfflineLessonContent(params: LessonAiAssistantParams): LessonAiAssistantResult {
  const title = params.lessonTitle || 'Bài giảng ngữ pháp';
  const mode = params.mode || 'full_lecture';
  const now = Date.now();

  if (mode === 'single_block') {
    return {
      status: 'success',
      mode: 'single_block',
      summary: 'Khối công thức & ví dụ mẫu',
      contentHtml: `
<div class="formula-box" data-block-type="box" style="width: 100%; margin: 12px 0;">
  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
    <span style="background-color: #10b981; color: white; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; text-transform: uppercase;">📐 CÔNG THỨC CHÍNH</span>
  </div>
  <p style="font-size: 18px; font-weight: 700; color: #10b981; margin: 4px 0 8px 0; text-align: center;">
    S + [Cấu trúc ngữ pháp] + O
  </p>
  <p style="font-size: 13px; opacity: 0.85; text-align: center; margin: 0;">
    Chủ ngữ + Động từ chia theo quy tắc + Tân ngữ
  </p>
</div>

<div class="example-box" data-block-type="box" style="width: 100%; margin: 12px 0;">
  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
    <span style="background-color: #0284c7; color: white; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; text-transform: uppercase;">💬 VÍ DỤ MINH HỌA</span>
  </div>
  <p style="font-size: 15px; font-weight: 600; margin: 6px 0 2px 0; color: #0284c7;">
    She has lived in Hanoi since 2018.
  </p>
  <p style="font-size: 13px; margin: 0; opacity: 0.85; font-style: italic;">
    ➔ Cô ấy đã sống ở Hà Nội từ năm 2018 (hành động bắt đầu từ quá khứ và vẫn tiếp diễn).
  </p>
</div>
      `.trim()
    };
  }

  // Full lecture offline fallback slides
  return {
    status: 'success',
    mode: 'full_lecture',
    summary: `Bài giảng chuẩn hóa 2 slide về ${title}`,
    slides: [
      {
        id: `slide_${now}_1_${Math.random().toString(36).substring(2, 6)}`,
        title: 'Trang 1: Định nghĩa & Bảng thể câu',
        contentHtml: `
<div class="formula-box" data-block-type="box" style="width: 100%; margin: 12px 0;">
  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
    <span style="background-color: #10b981; color: white; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; text-transform: uppercase;">📐 CÔNG THỨC CỐT LÕI</span>
  </div>
  <p style="font-size: 18px; font-weight: 700; color: #10b981; margin: 4px 0 8px 0; text-align: center;">
    S + have/has + V3/ed + O
  </p>
  <p style="font-size: 13px; opacity: 0.85; text-align: center; margin: 0;">
    Chủ ngữ + Trợ động từ (have/has) + Quá khứ phân từ + Tân ngữ
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
      <td style="padding: 8px 12px; border: 1px solid rgba(150, 150, 150, 0.3);">S + have/has + V3/ed</td>
      <td style="padding: 8px 12px; border: 1px solid rgba(150, 150, 150, 0.3);">We <b>have finished</b> the project.</td>
    </tr>
    <tr>
      <td style="padding: 8px 12px; border: 1px solid rgba(150, 150, 150, 0.3); font-weight: bold; color: #f43f5e;">Phủ định (-)</td>
      <td style="padding: 8px 12px; border: 1px solid rgba(150, 150, 150, 0.3);">S + haven't/hasn't + V3/ed</td>
      <td style="padding: 8px 12px; border: 1px solid rgba(150, 150, 150, 0.3);">He <b>hasn't arrived</b> yet.</td>
    </tr>
    <tr>
      <td style="padding: 8px 12px; border: 1px solid rgba(150, 150, 150, 0.3); font-weight: bold; color: #0284c7;">Nghi vấn (?)</td>
      <td style="padding: 8px 12px; border: 1px solid rgba(150, 150, 150, 0.3);">Have/Has + S + V3/ed?</td>
      <td style="padding: 8px 12px; border: 1px solid rgba(150, 150, 150, 0.3);"><b>Have</b> you <b>seen</b> this movie?</td>
    </tr>
  </tbody>
</table>
        `.trim()
      },
      {
        id: `slide_${now}_2_${Math.random().toString(36).substring(2, 6)}`,
        title: 'Trang 2: Dấu hiệu nhận biết & Lưu ý',
        contentHtml: `
<div class="tip-box" data-block-type="box" style="width: 100%; margin: 12px 0;">
  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
    <span style="background-color: #8b5cf6; color: white; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; text-transform: uppercase;">💡 DẤU HIỆU NHẬN BIẾT</span>
  </div>
  <p style="font-size: 14px; margin: 0 0 8px 0;">Các từ khóa nhận diện thường xuyên xuất hiện:</p>
  <ul style="padding-left: 20px; margin: 0; font-size: 14px; line-height: 1.6;">
    <li><b>Since + mốc thời gian</b> (since 2020, since yesterday): Kể từ khi...</li>
    <li><b>For + khoảng thời gian</b> (for 3 years, for a long time): Trong khoảng...</li>
    <li><b>Already, just, never, ever, yet</b>: Đã, vừa mới, chưa bao giờ, từng, chưa...</li>
  </ul>
</div>

<div class="caution-box" data-block-type="box" style="width: 100%; margin: 12px 0;">
  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
    <span style="background-color: #f59e0b; color: white; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; text-transform: uppercase;">⚠️ LƯU Ý NGOẠI LỆ</span>
  </div>
  <p style="font-size: 14px; margin: 0;">
    Phân biệt rõ <b>Since</b> (đi với mốc thời gian cụ thể) và <b>For</b> (đi với độ dài khoảng thời gian).
  </p>
</div>
        `.trim()
      }
    ]
  };
}

/**
 * Call Gemini AI Backend to generate structured lesson slides or HTML blocks
 */
export async function generateLessonContentFromAI(
  params: LessonAiAssistantParams
): Promise<LessonAiAssistantResult> {
  const { prompt, mode = 'full_lecture', lessonTitle, topicContext, currentContent, customApiKey, model, signal } = params;

  let resolvedApiKey = customApiKey;
  if (!resolvedApiKey) {
    try {
      const savedSettingsStr = localStorage.getItem('english_app_settings');
      if (savedSettingsStr) {
        const currentSettings = JSON.parse(savedSettingsStr);
        resolvedApiKey = currentSettings.providerApiKeys?.gemini || currentSettings.customApiKey || currentSettings.customGeminiApiKey;
      }
    } catch {
      // ignore
    }
  }

  try {
    const response = await fetch('/api/lesson-ai-assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal,
      body: JSON.stringify({
        prompt,
        mode,
        lessonTitle,
        topicContext,
        currentContent,
        customApiKey: resolvedApiKey,
        model: model || 'gemini-3.1-flash-lite',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.status === 'success') {
        if (data.slides && Array.isArray(data.slides)) {
          data.slides = ensureUniqueSlideIds(data.slides);
        }
        return data as LessonAiAssistantResult;
      }
      if (data && data.error) {
        throw new Error(data.error);
      }
    } else {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server error (${response.status})`);
    }
  } catch (err: any) {
    if (signal?.aborted) {
      throw err;
    }
    console.warn('[Lesson AI Assistant] Call failed, fallback to offline generator:', err);
  }

  return generateOfflineLessonContent(params);
}
