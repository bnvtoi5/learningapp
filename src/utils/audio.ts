import { VoiceGenderPreference } from '../types';
import { loadSettings } from './storage';

// Web Audio API and Speech API helpers

class SoundManager {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  playCorrect() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch {
      // Ignore audio failure
    }
  }

  playIncorrect() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now); // A3
      osc.frequency.exponentialRampToValueAtTime(164.81, now + 0.2); // E3

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch {
      // Ignore audio failure
    }
  }

  playMascotPoke() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.07); // G5
      osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.14); // C6

      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.28);
    } catch {
      // Ignore audio failure
    }
  }

  playClick() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {
      // Ignore audio failure
    }
  }
}

export const soundManager = new SoundManager();

export function triggerHaptic(type: 'light' | 'heavy' | boolean = true) {
  if (!type || typeof window === 'undefined') return;
  if ('vibrate' in navigator) {
    try {
      if (type === 'heavy') {
        navigator.vibrate([40, 40, 40]);
      } else {
        navigator.vibrate(30);
      }
    } catch {
      // Ignore vibration error
    }
  }
}

/**
 * Lấy danh sách giọng đọc TTS từ trình duyệt (Web Speech API)
 */
let cachedVoices: SpeechSynthesisVoice[] = [];

export function getAvailableSpeechVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length > 0) {
    cachedVoices = voices;
  }
  return cachedVoices.length > 0 ? cachedVoices : voices;
}

// Lắng nghe sự kiện nạp giọng nói bất đồng bộ từ Chrome / Android
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
}

/**
 * Tìm kiếm giọng đọc tiếng Anh tự nhiên, mượt mà và phổ biến nhất theo sở thích
 * Có cơ chế FALLBACK an toàn: Nếu không tìm thấy giọng chuyên biệt thì tự động dùng giọng mặc định
 */
export function getBestVoiceForPreference(
  preference: VoiceGenderPreference = 'female',
  customVoiceURI?: string
): SpeechSynthesisVoice | null {
  const voices = getAvailableSpeechVoices();
  if (!voices || voices.length === 0) return null;

  // 1. Nếu người dùng chọn đích danh 1 Voice qua URI
  if (customVoiceURI) {
    const directMatch = voices.find(v => v.voiceURI === customVoiceURI || v.name === customVoiceURI);
    if (directMatch) return directMatch;
  }

  // Nếu chọn 'auto' -> Dùng giọng mặc định của thiết bị (an toàn tuyệt đối)
  if (preference === 'auto') {
    const defaultVoice = voices.find(v => v.default && v.lang.toLowerCase().startsWith('en'));
    if (defaultVoice) return defaultVoice;
    const anyEn = voices.find(v => v.lang.toLowerCase().startsWith('en'));
    return anyEn || null;
  }

  // Danh sách các giọng hot/tự nhiên phổ biến trên Edge, Chrome, iOS (Siri/Samantha), Android
  const femaleKeywords = [
    'natural', 'neural', 'jenny', 'aria', 'samantha', 'karen', 'natasha', 'zira', 'siri',
    'female', 'woman', 'ava', 'allison', 'victoria', 'serena', 'stephanie', 'libby', 'sonia', 'en-us-x-sfg'
  ];

  const maleKeywords = [
    'natural', 'neural', 'guy', 'david', 'mark', 'alex', 'daniel', 'fred', 'oliver', 'george',
    'ryan', 'male', 'man', 'christopher', 'andrew', 'en-us-x-sfg#male', 'tom', 'lee'
  ];

  const englishVoices = voices.filter(v => v.lang.toLowerCase().startsWith('en'));
  if (englishVoices.length === 0) return null;

  // Lọc theo khu vực UK / US nếu có
  let candidateVoices = englishVoices;
  if (preference === 'uk_female' || preference === 'uk_male') {
    const ukVoices = englishVoices.filter(v => v.lang.toLowerCase().includes('gb') || v.lang.toLowerCase().includes('uk'));
    if (ukVoices.length > 0) candidateVoices = ukVoices;
  } else {
    // Ưu tiên US (Mỹ)
    const usVoices = englishVoices.filter(v => v.lang.toLowerCase().includes('us'));
    if (usVoices.length > 0) candidateVoices = usVoices;
  }

  // 2. Tìm giọng Nữ (Female)
  if (preference === 'female' || preference === 'uk_female') {
    // Ưu tiên 1: Giọng Natural / Neural / High Quality
    for (const kw of femaleKeywords) {
      const found = candidateVoices.find(v => v.name.toLowerCase().includes(kw) || v.voiceURI.toLowerCase().includes(kw));
      if (found) return found;
    }
    // Ưu tiên 2: Tìm trong toàn bộ englishVoices
    for (const kw of femaleKeywords) {
      const found = englishVoices.find(v => v.name.toLowerCase().includes(kw) || v.voiceURI.toLowerCase().includes(kw));
      if (found) return found;
    }
  }

  // 3. Tìm giọng Nam (Male)
  if (preference === 'male' || preference === 'uk_male') {
    for (const kw of maleKeywords) {
      const found = candidateVoices.find(v => v.name.toLowerCase().includes(kw) || v.voiceURI.toLowerCase().includes(kw));
      if (found) return found;
    }
    for (const kw of maleKeywords) {
      const found = englishVoices.find(v => v.name.toLowerCase().includes(kw) || v.voiceURI.toLowerCase().includes(kw));
      if (found) return found;
    }
  }

  // 4. FALLBACK an toàn: lấy giọng tiếng Anh đầu tiên hoặc giọng mặc định
  const fallbackDefault = candidateVoices.find(v => v.default) || candidateVoices[0] || englishVoices[0];
  return fallbackDefault || null;
}

export interface SpeakOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  voiceGender?: VoiceGenderPreference;
  voiceURI?: string;
  onEnd?: () => void;
  onError?: () => void;
}

/**
 * Text to Speech đa năng, hỗ trợ chọn giọng và an toàn với fallback mặc định
 */
export function speakText(text: string, options?: SpeakOptions | string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (!text || !text.trim()) return;

  try {
    window.speechSynthesis.cancel();

    // Hỗ trợ truyền nhanh speakText('Hello', 'en-US')
    const opts: SpeakOptions = typeof options === 'string' ? { lang: options } : (options || {});

    // Lấy cài đặt đã lưu trong ứng dụng nếu không truyền riêng
    const settings = loadSettings();
    const voicePreference: VoiceGenderPreference = opts.voiceGender || settings.voiceGender || 'female';
    const chosenRate = opts.rate !== undefined ? opts.rate : (settings.voiceSpeed || 0.9);
    const chosenLang = opts.lang || 'en-US';

    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.lang = chosenLang;
    utterance.rate = chosenRate;
    utterance.pitch = opts.pitch !== undefined ? opts.pitch : 1.0;

    // Tìm và gán Voice tốt nhất
    const bestVoice = getBestVoiceForPreference(voicePreference, opts.voiceURI || settings.selectedVoiceURI);
    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    if (opts.onEnd) utterance.onend = opts.onEnd;
    if (opts.onError) utterance.onerror = opts.onError;

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis playback error, fallback silent:', err);
  }
}

// Speech Recognition wrapper for speaking tasks
export interface SpeechRecognitionResultState {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  start: () => void;
  stop: () => void;
}

export interface SpeechRecognitionHandlers {
  onStart?: () => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

/**
 * Khởi chạy nhận diện giọng nói Web Speech API (en-US)
 */
export function startSpeechRecognition(
  handlers: SpeechRecognitionHandlers,
  lang: string = 'en-US'
): { stop: () => void } | null {
  if (typeof window === 'undefined') return null;

  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    handlers.onError?.('Trình duyệt không hỗ trợ Web Speech API nhận diện giọng nói. Hãy dùng Chrome, Edge hoặc Safari.');
    return null;
  }

  try {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      handlers.onStart?.();
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      const combined = finalTranscript || interimTranscript;
      handlers.onResult?.(combined.trim(), !!finalTranscript);
    };

    recognition.onerror = (event: any) => {
      console.warn('SpeechRecognition error:', event.error);
      let msg = 'Lỗi nhận diện giọng nói: ' + event.error;
      if (event.error === 'not-allowed') {
        msg = 'Trình duyệt chưa được cấp quyền micro. Vui lòng bấm Cho Phép Micro để luyện phát âm.';
      } else if (event.error === 'no-speech') {
        msg = 'Không nhận diện được giọng nói. Vui lòng nói to và rõ hơn.';
      }
      handlers.onError?.(msg);
    };

    recognition.onend = () => {
      handlers.onEnd?.();
    };

    recognition.start();

    return {
      stop: () => {
        try {
          recognition.stop();
        } catch {
          // ignore
        }
      }
    };
  } catch (err: any) {
    handlers.onError?.(err?.message || 'Không thể khởi động micro.');
    return null;
  }
}

