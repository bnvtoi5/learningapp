import { Exercise, DifficultyLevel } from '../types';
import { loadSettings } from './storage';
import { ParsedPronunciationItem, convertPronunciationItemToExercise } from './pronunciationUtils';

export interface SingleVocabAIAnalysis {
  word: string;
  phonetic: string;
  meaning: string;
  pronunciationTips?: string;
  exampleSentence?: string;
}

export interface EnrichedPronunciationLine {
  targetText: string;
  phonetic?: string;
  meaning?: string;
  isSingleWord: boolean;
  pronunciationTips?: string;
}

/**
 * Gọi AI phân tích chuyên sâu cho 1 từ vựng đơn lẻ: lấy IPA, dịch nghĩa tiếng Việt, mẹo phát âm & ví dụ.
 */
export async function analyzeSingleVocabWithAI(word: string): Promise<SingleVocabAIAnalysis | null> {
  const cleanWord = word.trim();
  if (!cleanWord) return null;

  const settings = loadSettings();
  const apiKey = settings.providerApiKeys?.gemini || settings.customApiKey || settings.customGeminiApiKey;
  const model = settings.aiModel || 'gemini-3.1-flash-lite';

  try {
    const res = await fetch('/api/pronunciation-ai-analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: cleanWord,
        mode: 'single_word',
        customApiKey: apiKey,
        model,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success' && data.data) {
        return data.data as SingleVocabAIAnalysis;
      }
    }
  } catch (err) {
    console.error('Lỗi khi gọi AI phân tích từ vựng đơn lẻ:', err);
  }

  return null;
}

/**
 * Gọi AI phân tích và bổ sung IPA + nghĩa tiếng Việt cho toàn bộ danh sách các dòng (từ vựng hoặc câu).
 */
export async function enrichPronunciationLinesWithAI(
  linesText: string,
  signal?: AbortSignal
): Promise<EnrichedPronunciationLine[]> {
  const trimmed = linesText.trim();
  if (!trimmed) return [];

  const settings = loadSettings();
  const apiKey = settings.providerApiKeys?.gemini || settings.customApiKey || settings.customGeminiApiKey;
  const model = settings.aiModel || 'gemini-3.1-flash-lite';

  try {
    const res = await fetch('/api/pronunciation-ai-analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        text: trimmed,
        mode: 'lines_enrich',
        customApiKey: apiKey,
        model,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success' && Array.isArray(data.items)) {
        return data.items as EnrichedPronunciationLine[];
      }
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw err;
    }
    console.error('Lỗi khi gọi AI bổ sung dữ liệu dòng phát âm:', err);
  }

  return [];
}
