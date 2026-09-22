import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, 
  Mic, 
  MicOff, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Check, 
  X, 
  Sliders, 
  Keyboard, 
  Info,
  HelpCircle
} from 'lucide-react';
import { Exercise } from '../types';
import { useTheme } from '../context/ThemeContext';
import { speakText, startSpeechRecognition } from '../utils/audio';
import { 
  evaluatePronunciation, 
  PronunciationEvaluationResult 
} from '../utils/pronunciationUtils';

interface InteractivePronunciationPracticeProps {
  exercise: Exercise;
  disabled?: boolean;
  onEvaluationComplete: (isPassed: boolean, spokenText: string, accuracyPercent: number) => void;
}

export const InteractivePronunciationPractice: React.FC<InteractivePronunciationPracticeProps> = ({
  exercise,
  disabled = false,
  onEvaluationComplete,
}) => {
  const { getThemeClasses, settings } = useTheme();
  const theme = getThemeClasses();

  const targetText = (exercise.correctText || exercise.vocabWord || exercise.question || '').trim();
  const wordsInTarget = targetText.split(/\s+/).filter(Boolean);
  const isSingle = exercise.isSingleWord !== undefined ? exercise.isSingleWord : (wordsInTarget.length <= 1);
  const passThreshold = isSingle ? 100 : (exercise.pronunciationAccuracy || 70);

  // States
  const [isRecording, setIsRecording] = useState(false);
  const [spokenTranscript, setSpokenTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [evaluation, setEvaluation] = useState<PronunciationEvaluationResult | null>(null);
  const [micErrorMessage, setMicErrorMessage] = useState<string | null>(null);
  const [manualInputMode, setManualInputMode] = useState(false);
  const [manualText, setManualText] = useState('');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  const activeRecognitionRef = useRef<{ stop: () => void } | null>(null);

  // Check Web Speech API support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasSpeech = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
      setSpeechSupported(hasSpeech);
      if (!hasSpeech) {
        setManualInputMode(true);
      }
    }
  }, []);

  // Clean up recording on unmount or question change
  useEffect(() => {
    setSpokenTranscript('');
    setInterimText('');
    setEvaluation(null);
    setMicErrorMessage(null);
    setManualText('');
    if (activeRecognitionRef.current) {
      activeRecognitionRef.current.stop();
      activeRecognitionRef.current = null;
    }
    setIsRecording(false);
  }, [exercise.id]);

  // Handle Play Sample Audio
  const handlePlaySample = (rate: number = 0.9) => {
    if (!targetText) return;
    setIsPlayingAudio(true);
    speakText(targetText, {
      rate,
      onEnd: () => setIsPlayingAudio(false),
      onError: () => setIsPlayingAudio(false),
    });
  };

  // Start Voice Recording
  const handleStartRecording = () => {
    if (disabled) return;
    setMicErrorMessage(null);
    setEvaluation(null);
    setInterimText('');

    if (activeRecognitionRef.current) {
      activeRecognitionRef.current.stop();
      activeRecognitionRef.current = null;
    }

    const recognizer = startSpeechRecognition({
      onStart: () => {
        setIsRecording(true);
      },
      onResult: (transcript, isFinal) => {
        if (isFinal) {
          setSpokenTranscript(transcript);
          setInterimText('');
          // Automatically evaluate when final result arrives
          runEvaluation(transcript);
        } else {
          setInterimText(transcript);
        }
      },
      onError: (err) => {
        setMicErrorMessage(err);
        setIsRecording(false);
      },
      onEnd: () => {
        setIsRecording(false);
        activeRecognitionRef.current = null;
      },
    }, 'en-US');

    if (recognizer) {
      activeRecognitionRef.current = recognizer;
    } else {
      setIsRecording(false);
    }
  };

  // Stop Recording
  const handleStopRecording = () => {
    if (activeRecognitionRef.current) {
      activeRecognitionRef.current.stop();
      activeRecognitionRef.current = null;
    }
    setIsRecording(false);

    // If we have an interim text that wasn't finalized, evaluate with it
    const textToEvaluate = spokenTranscript || interimText;
    if (textToEvaluate.trim()) {
      setSpokenTranscript(textToEvaluate);
      runEvaluation(textToEvaluate);
    }
  };

  // Evaluate the spoken transcript
  const runEvaluation = (text: string) => {
    const res = evaluatePronunciation(targetText, text, {
      isSingleWord: isSingle,
      requiredThreshold: passThreshold,
    });
    setEvaluation(res);
    onEvaluationComplete(res.isPassed, text, res.accuracyPercent);
  };

  // Manual input fallback evaluation
  const handleManualSubmit = () => {
    if (!manualText.trim()) return;
    setSpokenTranscript(manualText.trim());
    runEvaluation(manualText.trim());
  };

  return (
    <div className="space-y-4 pt-1">
      {/* CARD MỤC TIÊU PHÁT ÂM TRUNG TÂM */}
      <div className={`p-5 rounded-2xl border ${theme.border} ${theme.card} shadow-sm relative overflow-hidden`}>
        {/* Top badge */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            {isSingle ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <span>🎯</span>
                <span>Từ đơn lẻ: Phát âm đúng là hoàn thành (100%)</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 flex items-center gap-1.5">
                <span>📝</span>
                <span>Câu nhiều chữ: Yêu cầu độ chính xác ≥ {passThreshold}%</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePlaySample(0.9)}
              disabled={isPlayingAudio}
              className="px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
              title="Lắng nghe người bản xứ phát âm mẫu"
            >
              <Volume2 className={`w-3.5 h-3.5 ${isPlayingAudio ? 'animate-bounce' : ''}`} />
              <span>Nghe mẫu chuẩn</span>
            </button>
            <button
              type="button"
              onClick={() => handlePlaySample(0.7)}
              disabled={isPlayingAudio}
              className="px-2.5 py-1.5 rounded-xl border border-border/50 hover:bg-muted text-muted-foreground hover:text-foreground font-semibold text-xs flex items-center gap-1 transition-all cursor-pointer"
              title="Nghe tốc độ chậm để nhận rõ từng âm tiết"
            >
              <span>🐢 0.7x</span>
            </button>
          </div>
        </div>

        {/* Big Target Word / Sentence */}
        <div className="py-4 text-center space-y-2">
          <div className="text-xl sm:text-2xl font-extrabold text-foreground tracking-wide select-text">
            {targetText}
          </div>

          {exercise.phonetic && (
            <div className="inline-block px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 font-mono text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-semibold tracking-wider">
              {exercise.phonetic}
            </div>
          )}

          {(exercise.vocabMeaning || exercise.hint) && (
            <div className="text-xs sm:text-sm text-muted-foreground font-medium pt-1">
              <span className="font-semibold text-foreground">Nghĩa: </span>
              <span>{exercise.vocabMeaning || exercise.hint}</span>
            </div>
          )}
        </div>
      </div>

      {/* KHU VỰC THU ÂM & MICROPHONE */}
      {!manualInputMode ? (
        <div className={`p-5 rounded-2xl border ${theme.border} ${theme.highlight} flex flex-col items-center justify-center space-y-4 text-center transition-all`}>
          {/* Pulsing Mic Button */}
          <div className="relative">
            {isRecording && (
              <div className="absolute inset-0 rounded-full bg-rose-500/30 animate-ping" />
            )}
            <button
              type="button"
              disabled={disabled}
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              className={`w-18 h-18 sm:w-20 sm:h-20 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95 cursor-pointer relative z-10 ${
                isRecording
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/40 ring-4 ring-rose-400/50'
                  : 'bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-600/30 ring-4 ring-emerald-500/20'
              }`}
            >
              {isRecording ? (
                <MicOff className="w-8 h-8 animate-pulse" />
              ) : (
                <Mic className="w-8 h-8" />
              )}
            </button>
          </div>

          {/* Guide & Status under Mic */}
          <div className="space-y-1">
            <p className="text-xs sm:text-sm font-bold text-foreground">
              {isRecording 
                ? '🎙️ Đang lắng nghe bạn nói... (Bấm nút khi đọc xong)' 
                : 'Bấm vào Micro và đọc to câu/từ phía trên'}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {isRecording 
                ? (interimText ? `"${interimText}..."` : 'Hãy phát âm rõ ràng...')
                : 'Ứng dụng sẽ tự động phân tích và chấm điểm phát âm của bạn'}
            </p>
          </div>

          {/* Micro Error alert if any */}
          {micErrorMessage && (
            <div className="w-full max-w-md p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center justify-between gap-2 text-left">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{micErrorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setManualInputMode(true)}
                className="text-[11px] font-bold text-rose-700 dark:text-rose-300 underline shrink-0 cursor-pointer"
              >
                Gõ tay
              </button>
            </div>
          )}

          {/* Switch to manual typing mode */}
          <button
            type="button"
            onClick={() => setManualInputMode(true)}
            className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Thiết bị không có micro? Chuyển sang gõ văn bản</span>
          </button>
        </div>
      ) : (
        /* CHẾ ĐỘ GÕ TAY NẾU KHÔNG CÓ MICRO */
        <div className={`p-4 rounded-2xl border ${theme.border} ${theme.highlight} space-y-3`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Keyboard className="w-4 h-4 text-emerald-500" />
              <span>Chế độ nhập tay (Kiểm tra chính tả & nhớ từ):</span>
            </span>
            {speechSupported && (
              <button
                type="button"
                onClick={() => setManualInputMode(false)}
                className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Quay lại dùng Micro</span>
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              disabled={disabled}
              value={manualText}
              onChange={e => setManualText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
              placeholder="Gõ lại câu/từ vựng bạn vừa đọc..."
              className={`flex-1 p-3 rounded-xl text-xs font-medium border ${theme.border} ${theme.inputBg} focus:ring-2 focus:ring-emerald-500`}
            />
            <button
              type="button"
              disabled={disabled || !manualText.trim()}
              onClick={handleManualSubmit}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 shadow-sm cursor-pointer disabled:opacity-50"
            >
              Chấm điểm
            </button>
          </div>
        </div>
      )}

      {/* KẾT QUẢ ĐÁNH GIÁ PHÁT ÂM CHI TIẾT (EVALUATION CARD) */}
      {evaluation && (
        <div className={`p-4 sm:p-5 rounded-2xl border transition-all animate-in fade-in duration-200 ${
          evaluation.isPassed
            ? 'border-emerald-500/40 bg-emerald-500/10'
            : 'border-amber-500/40 bg-amber-500/10'
        }`}>
          {/* Header kết quả */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-inherit/40">
            <div className="flex items-center gap-2">
              {evaluation.isPassed ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              )}
              <span className={`text-xs sm:text-sm font-extrabold ${
                evaluation.isPassed ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'
              }`}>
                {evaluation.isPassed 
                  ? (isSingle ? '🎉 Tuyệt vời! Bạn đã phát âm chính xác từ này.' : `🎉 Chúc mừng! Bạn đã đạt yêu cầu phát âm câu này.`)
                  : (isSingle ? 'Cần cải thiện: Hãy lắng nghe mẫu và phát âm lại rõ hơn.' : `Chưa đạt tỷ lệ yêu cầu (Cần ≥ ${passThreshold}%).`)}
              </span>
            </div>

            {/* Điểm chính xác % */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Độ chính xác:</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${
                evaluation.isPassed 
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
              }`}>
                {evaluation.accuracyPercent}%
              </span>
            </div>
          </div>

          {/* Chi tiết âm thanh nhận được */}
          <div className="py-2.5 space-y-2">
            <div className="text-xs">
              <span className="font-bold text-muted-foreground">App nghe được: </span>
              <span className="font-semibold text-foreground italic">"{evaluation.spokenText}"</span>
            </div>

            {/* Phân tích từng từ trong câu nhiều chữ */}
            {!isSingle && evaluation.wordsAnalysis && evaluation.wordsAnalysis.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Phân tích từng từ trong câu:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {evaluation.wordsAnalysis.map((w, idx) => (
                    <span
                      key={idx}
                      className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 border ${
                        w.isMatched
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                          : 'bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300 line-through'
                      }`}
                      title={w.isMatched ? 'Từ này phát âm tốt!' : 'Từ này chưa nghe rõ hoặc phát âm sai'}
                    >
                      {w.isMatched ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      <span>{w.word}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Feedback & Mẹo */}
          {evaluation.feedback && (
            <div className="pt-2 text-xs text-muted-foreground border-t border-inherit/40 flex items-center justify-between">
              <span>💡 {evaluation.feedback}</span>
              {!evaluation.isPassed && (
                <button
                  type="button"
                  onClick={handleStartRecording}
                  className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Đọc lại</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
