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
 * Nhận diện thiết bị di động & Chrome trên iOS (CriOS)
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export function isIOSChrome(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /CriOS/i.test(navigator.userAgent) && /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/**
 * Lấy danh sách giọng đọc TTS từ trình duyệt (Web Speech API)
 */
let cachedVoices: SpeechSynthesisVoice[] = [];
// Giữ tham chiếu utterance hiện tại ở cấp module để Chrome Android/Desktop không tự ý Garbage Collect giữa chừng
let activeUtterance: SpeechSynthesisUtterance | null = null;
let pendingSpeakTimer: ReturnType<typeof setTimeout> | null = null;

export function getAvailableSpeechVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length > 0) {
    cachedVoices = voices;
  }
  return cachedVoices.length > 0 ? cachedVoices : voices;
}

// Lắng nghe sự kiện nạp giọng nói bất đồng bộ từ Chrome, Android, iOS Safari
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const syncVoices = () => {
    try {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        cachedVoices = v;
      }
    } catch {}
  };
  syncVoices();
  try {
    window.speechSynthesis.addEventListener('voiceschanged', syncVoices);
  } catch {}
  window.speechSynthesis.onvoiceschanged = syncVoices;
}

/**
 * Danh sách từ khóa nhận diện giọng Nam chuẩn trên các nền tảng:
 * - Desktop: Edge Natural (Guy), Google Chrome, Mac (Alex, Fred), Windows SAPI (David, Mark)
 * - Android (Google Speech Services / Samsung TTS): #male, _male, male_1, male_2, en-us-x-iob, en-us-x-iom, en-us-x-tpd
 * - iOS / iPadOS (Safari / WebKit): Alex, Fred, Daniel, Oliver, Arthur, Aaron, Siri Voice 1, Siri Voice 3
 */
const MALE_NAME_KEYWORDS = [
  'guy', 'david', 'mark', 'alex', 'daniel', 'fred', 'oliver', 'george', 'ryan', 'christopher',
  'andrew', 'tom', 'lee', 'aaron', 'arthur', 'gordon', 'nicky', 'rishi', 'thomas', 'ralph',
  'albert', 'bruce', 'evan', 'nathan', 'noel', 'malcolm', 'james', 'john', 'michael', 'william'
];

const MALE_CODE_KEYWORDS = [
  '#male', '_male', 'male_1', 'male_2', 'male 1', 'male 2', 'voice 1', 'voice 3', 'voice 5',
  'voice i', 'voice iii', 'en-us-x-iob', 'en-us-x-iom', 'en-us-x-tpd', 'en-gb-x-rjs', 'uk english male'
];

const FEMALE_NAME_KEYWORDS = [
  'jenny', 'aria', 'samantha', 'karen', 'natasha', 'zira', 'ava', 'allison', 'victoria',
  'serena', 'stephanie', 'libby', 'sonia', 'moira', 'fiona', 'tessa', 'veena', 'susan', 'mary'
];

const FEMALE_CODE_KEYWORDS = [
  '#female', '_female', 'female_1', 'female_2', 'female 1', 'female 2', 'voice 2', 'voice 4',
  'voice ii', 'voice iv', 'en-us-x-sfg', 'en-us-x-tpf', 'en-us-x-tpc', 'en-us-x-iol', 'uk english female'
];

/**
 * Kiểm tra xem một SpeechSynthesisVoice có phải là giọng Nam thực thụ hay không
 */
export function isActualMaleVoice(voice?: SpeechSynthesisVoice | null): boolean {
  if (!voice) return false;
  const str = `${voice.name} ${voice.voiceURI}`.toLowerCase();
  
  // Nếu chứa từ khóa nữ rõ ràng mà không có thẻ đè nam
  const hasFemaleKw = FEMALE_NAME_KEYWORDS.some(k => str.includes(k)) ||
    FEMALE_CODE_KEYWORDS.some(k => str.includes(k)) ||
    (str.includes('female') && !str.includes('#male') && !str.includes('_male') && !str.includes('male_'));
  
  if (hasFemaleKw) return false;

  if (MALE_CODE_KEYWORDS.some(k => str.includes(k))) return true;
  if (str.includes(' male') || str.startsWith('male') || str.includes('(male)') || str.includes('[male]')) return true;
  if (MALE_NAME_KEYWORDS.some(k => str.includes(k))) return true;

  return false;
}

/**
 * Kiểm tra xem một SpeechSynthesisVoice có phải là giọng Nữ thực thụ hay không
 */
export function isActualFemaleVoice(voice?: SpeechSynthesisVoice | null): boolean {
  if (!voice) return false;
  const str = `${voice.name} ${voice.voiceURI}`.toLowerCase();

  const hasMaleKw = MALE_CODE_KEYWORDS.some(k => str.includes(k)) ||
    MALE_NAME_KEYWORDS.some(k => str.includes(k)) ||
    (str.includes('male') && !str.includes('female'));
  if (hasMaleKw) return false;

  if (FEMALE_CODE_KEYWORDS.some(k => str.includes(k))) return true;
  if (str.includes('female') || str.includes('woman') || str.includes('girl')) return true;
  if (FEMALE_NAME_KEYWORDS.some(k => str.includes(k))) return true;

  return false;
}

/**
 * TÍNH TOÁN CAO ĐỘ (PITCH SHIFT) THÔNG MINH CHO CẢ DESKTOP VÀ MOBILE:
 * - Trên điện thoại (Android / iOS): Phần lớn các dòng máy chỉ nạp sẵn 1 giọng nữ mặc định (Google US English / Samantha)
 *   mà không tải sẵn gói dữ liệu giọng nam offline trong cài đặt máy.
 * - Khi người dùng chọn Giọng Nam (male / uk_male):
 *   + Nếu thiết bị CÓ sẵn giọng nam tự nhiên: Đặt pitch 0.88 để giọng dày, ấm và đĩnh đạc.
 *   + Nếu thiết bị CHỈ CÓ giọng nữ/mặc định: Tự động kích hoạt công nghệ Pitch Shift hạ cao độ xuống 0.76!
 *     Cao độ 0.76 hạ tần số phát âm trung bình từ ~220Hz (âm vực nữ) xuống ~140Hz (âm vực nam chuẩn baritone/tenor).
 *     Kết quả: Giọng nói lập tức nghe thành giọng nam rõ ràng, trầm ấm, dứt khoát trên mọi điện thoại di động!
 */
export function getPitchForPreference(
  preference: VoiceGenderPreference = 'female',
  voice?: SpeechSynthesisVoice | null
): number {
  if (preference === 'male' || preference === 'uk_male') {
    return isActualMaleVoice(voice) ? 0.88 : 0.76;
  }
  if (preference === 'female' || preference === 'uk_female') {
    return 1.05;
  }
  return 1.0;
}

/**
 * Tìm kiếm giọng đọc tiếng Anh tự nhiên, mượt mà và phổ biến nhất theo sở thích
 * Có cơ chế phân tầng và FALLBACK an toàn:
 */
export function getBestVoiceForPreference(
  preference: VoiceGenderPreference = 'female',
  customVoiceURI?: string
): SpeechSynthesisVoice | null {
  const voices = getAvailableSpeechVoices();
  if (!voices || voices.length === 0) return null;

  // 1. Nếu người dùng chọn đích danh 1 Voice qua URI (chỉ áp dụng nếu thực sự tồn tại trên thiết bị này)
  if (customVoiceURI) {
    const directMatch = voices.find(v => v.voiceURI === customVoiceURI || v.name === customVoiceURI);
    if (directMatch) return directMatch;
  }

  const normalizeLang = (lang?: string) => (lang || '').replace(/_/g, '-').toLowerCase();
  const mobile = isMobileDevice();

  // Nếu chọn 'auto' -> Dùng giọng mặc định của thiết bị (an toàn tuyệt đối)
  if (preference === 'auto') {
    const defaultVoice = voices.find(v => v.default && normalizeLang(v.lang).startsWith('en'));
    if (defaultVoice) return defaultVoice;
    const localEn = voices.find(v => v.localService && normalizeLang(v.lang).startsWith('en'));
    if (mobile && localEn) return localEn;
    const anyEn = voices.find(v => normalizeLang(v.lang).startsWith('en'));
    return anyEn || null;
  }

  const englishVoices = voices.filter(v => normalizeLang(v.lang).startsWith('en'));
  if (englishVoices.length === 0) return null;

  const isUkPreference = preference === 'uk_female' || preference === 'uk_male';
  const isMalePreference = preference === 'male' || preference === 'uk_male';

  // Chấm điểm từng giọng theo độ phù hợp
  interface ScoredVoice {
    voice: SpeechSynthesisVoice;
    score: number;
  }

  const scored: ScoredVoice[] = englishVoices.map(v => {
    let score = 0;
    const str = `${v.name} ${v.voiceURI}`.toLowerCase();
    const lang = normalizeLang(v.lang);

    const isUkLang = lang.includes('gb') || lang.includes('uk');
    const isUsLang = lang.includes('us');
    const isRegionMatch = isUkPreference ? isUkLang : isUsLang;

    const male = isActualMaleVoice(v);
    const female = isActualFemaleVoice(v);
    const isHighQuality = str.includes('natural') || str.includes('neural') || str.includes('online') || str.includes('premium');

    if (isMalePreference) {
      if (male) score += 100;
      if (female) score -= 80;
    } else {
      if (female) score += 100;
      if (male) score -= 80;
    }

    if (isRegionMatch) score += 30;
    // Trên điện thoại (Android/iOS), ưu tiên giọng localService để tránh lỗi im tiếng do network voice bị treo
    if (mobile) {
      if (v.localService) score += 40;
      else score -= 25;
    } else if (isHighQuality) {
      score += 20;
    }
    if (v.default) score += 10;

    return { voice: v, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Nếu tìm thấy giọng đạt điểm cao (>= 50), ưu tiên sử dụng
  if (scored.length > 0 && scored[0].score >= 50) {
    return scored[0].voice;
  }

  // Fallback: Tìm giọng theo vùng UK / US (ưu tiên localService trên di động)
  const regionCandidates = englishVoices.filter(v => {
    const lang = normalizeLang(v.lang);
    return isUkPreference ? (lang.includes('gb') || lang.includes('uk')) : lang.includes('us');
  });

  const fallbackDefault =
    (mobile ? regionCandidates.find(v => v.localService && v.default) || regionCandidates.find(v => v.localService) : null) ||
    regionCandidates.find(v => v.default) ||
    regionCandidates[0] ||
    (mobile ? englishVoices.find(v => v.localService) : null) ||
    englishVoices.find(v => v.default) ||
    englishVoices[0];
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
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (typeof options === 'object') options.onError?.();
    return;
  }
  const cleanText = (text || '').trim();
  if (!cleanText) return;

  try {
    const synth = window.speechSynthesis;
    if (pendingSpeakTimer) {
      clearTimeout(pendingSpeakTimer);
      pendingSpeakTimer = null;
    }

    // Hỗ trợ truyền nhanh speakText('Hello', 'en-US')
    const opts: SpeakOptions = typeof options === 'string' ? { lang: options } : (options || {});

    // Lấy cài đặt đã lưu trong ứng dụng nếu không truyền riêng
    const settings = loadSettings();
    const voicePreference: VoiceGenderPreference = opts.voiceGender || settings.voiceGender || 'female';
    const chosenRate = opts.rate !== undefined ? opts.rate : (settings.voiceSpeed || 0.9);
    const chosenLang = opts.lang || 'en-US';
    const bestVoice = getBestVoiceForPreference(voicePreference, opts.voiceURI || settings.selectedVoiceURI);

    const createUtterance = (useCustomVoice: boolean) => {
      const u = new SpeechSynthesisUtterance(cleanText);
      u.lang = chosenLang;
      u.rate = Math.max(0.5, Math.min(2, chosenRate));
      u.volume = 1;

      if (useCustomVoice && bestVoice) {
        u.voice = bestVoice;
        u.pitch = opts.pitch !== undefined ? opts.pitch : getPitchForPreference(voicePreference, bestVoice);
      } else {
        u.pitch = opts.pitch !== undefined ? opts.pitch : 1.0;
      }
      return u;
    };

    const dispatchSpeak = (useCustomVoice: boolean) => {
      const utterance = createUtterance(useCustomVoice);
      activeUtterance = utterance;

      let settled = false;
      const finishEnd = () => {
        if (settled) return;
        settled = true;
        if (activeUtterance === utterance) activeUtterance = null;
        opts.onEnd?.();
      };

      utterance.onend = finishEnd;
      utterance.onerror = (ev: any) => {
        if (settled) return;
        const errCode = ev?.error;
        if (errCode === 'canceled' || errCode === 'interrupted') {
          settled = true;
          if (activeUtterance === utterance) activeUtterance = null;
          opts.onEnd?.();
          return;
        }
        // Nếu giọng chọn cụ thể bị lỗi trên điện thoại -> tự động thử lại bằng giọng mặc định hệ thống
        if (useCustomVoice && bestVoice) {
          settled = true;
          if (activeUtterance === utterance) activeUtterance = null;
          dispatchSpeak(false);
          return;
        }
        settled = true;
        if (activeUtterance === utterance) activeUtterance = null;
        opts.onError?.();
      };

      try {
        if (synth.paused) synth.resume();
      } catch {}
      synth.speak(utterance);
    };

    // Quan trọng cho Chrome Android / iOS:
    // KHÔNG gọi cancel() khi hàng đợi đang trống (vì cancel() + speak() cùng tick hay bị nuốt tiếng trên mobile).
    // Nếu đang có câu khác phát dở thì cancel() rồi chờ 60ms mới gọi speak().
    if (synth.speaking || synth.pending) {
      synth.cancel();
      pendingSpeakTimer = setTimeout(() => {
        pendingSpeakTimer = null;
        dispatchSpeak(Boolean(bestVoice));
      }, 60);
    } else {
      dispatchSpeak(Boolean(bestVoice));
    }
  } catch (err) {
    console.warn('Speech synthesis playback error, fallback silent:', err);
    if (typeof options === 'object') options.onError?.();
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

  if (isIOSChrome()) {
    handlers.onError?.(
      'Chrome trên iPhone/iPad không hỗ trợ nhận diện giọng nói (giới hạn của iOS). Bạn hãy mở link bằng Safari hoặc dùng chế độ Gõ tay nhé.'
    );
    return null;
  }

  if (!window.isSecureContext) {
    handlers.onError?.(
      'Micro chỉ hoạt động trên đường dẫn bảo mật (HTTPS). Hãy mở ứng dụng bằng link https:// chính thức.'
    );
    return null;
  }

  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    handlers.onError?.('Trình duyệt này chưa hỗ trợ nhận diện giọng nói. Hãy dùng Chrome (Android/PC) hoặc Safari (iPhone).');
    return null;
  }

  try {
    // Dừng TTS trước khi bật mic để tránh xung đột AudioFocus trên Android Chrome
    if ('speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
          window.speechSynthesis.cancel();
        }
      } catch {}
    }

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
      for (let i = 0; i < event.results.length; ++i) {
        const res = event.results[i];
        const txt = res?.[0]?.transcript || '';
        if (res.isFinal) {
          finalTranscript += (finalTranscript ? ' ' : '') + txt;
        } else {
          interimTranscript += (interimTranscript ? ' ' : '') + txt;
        }
      }
      const combined = (finalTranscript || interimTranscript).trim();
      if (combined) {
        handlers.onResult?.(combined, Boolean(finalTranscript.trim()));
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('SpeechRecognition error:', event.error);
      let msg = 'Lỗi nhận diện giọng nói: ' + event.error;
      if (event.error === 'not-allowed') {
        msg = 'Trình duyệt chưa được cấp quyền Micro. Hãy bấm biểu tượng ổ khóa cạnh thanh địa chỉ → Quyền → Bật Micro (và kiểm tra Cài đặt điện thoại → Ứng dụng → Chrome → Quyền → Micro).';
      } else if (event.error === 'service-not-allowed') {
        msg = 'Dịch vụ nhận diện giọng nói đang bị chặn. Nếu mở trong khung nhúng/Zalo/Facebook hãy mở trực tiếp bằng Chrome, hoặc bật Dịch vụ giọng nói của Google trên Android.';
      } else if (event.error === 'audio-capture') {
        msg = 'Không thu được âm thanh từ Micro (có thể ứng dụng khác đang chiếm Micro). Hãy đóng ứng dụng gọi/ghi âm khác rồi thử lại.';
      } else if (event.error === 'network') {
        msg = 'Lỗi mạng khi gửi giọng nói tới máy chủ nhận diện. Hãy kiểm tra kết nối Wi-Fi/4G rồi thử lại.';
      } else if (event.error === 'no-speech') {
        msg = 'Chưa nghe thấy giọng nói. Hãy bấm Micro và đọc to, rõ gần điện thoại hơn nhé.';
      } else if (event.error === 'aborted') {
        return;
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
    handlers.onError?.(err?.message || 'Không thể khởi động micro trên thiết bị này.');
    return null;
  }
}

