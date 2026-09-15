import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  FastForward, 
  Rewind, 
  Radio, 
  Sparkles 
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { resolveMediaUrl } from '../utils/mediaDb';
import { getBestVoiceForPreference } from '../utils/audio';

interface ListeningAudioPlayerProps {
  audioUrl?: string;
  audioText?: string;
  title?: string;
  autoPlay?: boolean;
}

export const ListeningAudioPlayer: React.FC<ListeningAudioPlayerProps> = ({
  audioUrl,
  audioText,
  title = 'Băng ghi âm bài nghe (TOEIC Audio Track)',
  autoPlay = false,
}) => {
  const { settings, getThemeClasses } = useTheme();
  const theme = getThemeClasses();

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [resolvedSrc, setResolvedSrc] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState(false);

  // Resolve audioUrl (handles online url, blob url, or IndexedDB media reference)
  useEffect(() => {
    let isMounted = true;
    if (audioUrl) {
      resolveMediaUrl(audioUrl).then(src => {
        if (isMounted) {
          setResolvedSrc(src || audioUrl);
        }
      });
    } else {
      setResolvedSrc('');
    }
    return () => {
      isMounted = false;
    };
  }, [audioUrl]);

  // Fallback TTS state if no audioUrl and no resolvedSrc
  const isTtsMode = !resolvedSrc && !audioUrl && !!audioText;
  const ttsIntervalRef = useRef<any>(null);
  const ttsEstimatedDuration = useRef<number>(
    Math.max(5, Math.ceil(((audioText || '').split(/\s+/).length / 2.5)))
  );

  // Setup HTML5 Audio or reset state when audio source changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    if (isTtsMode) {
      window.speechSynthesis?.cancel();
      ttsEstimatedDuration.current = Math.max(5, Math.ceil(((audioText || '').split(/\s+/).length / 2.5)));
      setDuration(ttsEstimatedDuration.current);
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (ttsIntervalRef.current) {
        clearInterval(ttsIntervalRef.current);
      }
    };
  }, [resolvedSrc, audioText, isTtsMode]);

  // Handle Play / Pause
  const togglePlay = () => {
    if (isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  };

  const handlePlay = () => {
    if (!resolvedSrc && !audioUrl && !audioText) return;

    if ((resolvedSrc || audioUrl) && audioRef.current) {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.warn('Audio play error:', err);
      });
      return;
    }

    // TTS Fallback
    if (isTtsMode && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(audioText);
      utterance.lang = 'en-US';
      utterance.rate = playbackRate;
      utterance.volume = isMuted ? 0 : volume;

      const bestVoice = getBestVoiceForPreference(settings?.voiceGender, settings?.selectedVoiceURI);
      if (bestVoice) {
        utterance.voice = bestVoice;
      }

      utterance.onstart = () => {
        setIsPlaying(true);
        if (ttsIntervalRef.current) clearInterval(ttsIntervalRef.current);
        ttsIntervalRef.current = setInterval(() => {
          setCurrentTime(prev => {
            const next = prev + 0.25;
            if (next >= ttsEstimatedDuration.current) {
              clearInterval(ttsIntervalRef.current);
              return ttsEstimatedDuration.current;
            }
            return next;
          });
        }, 250);
      };

      utterance.onend = () => {
        setIsPlaying(false);
        setCurrentTime(ttsEstimatedDuration.current);
        if (ttsIntervalRef.current) clearInterval(ttsIntervalRef.current);
      };

      utterance.onerror = () => {
        setIsPlaying(false);
        if (ttsIntervalRef.current) clearInterval(ttsIntervalRef.current);
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (ttsIntervalRef.current) {
      clearInterval(ttsIntervalRef.current);
    }
    setIsPlaying(false);
  };

  // Seek handler
  const handleSeek = (targetTime: number) => {
    const clamped = Math.max(0, Math.min(duration || 100, targetTime));
    setCurrentTime(clamped);

    if (audioRef.current && audioUrl) {
      audioRef.current.currentTime = clamped;
    } else if (isTtsMode) {
      // Re-trigger TTS from rough point or restart
      if (isPlaying) {
        handlePause();
        setTimeout(handlePlay, 100);
      }
    }
  };

  // Skip seconds (e.g. -5s / +5s)
  const handleSkip = (seconds: number) => {
    handleSeek(currentTime + seconds);
  };

  // Change Speed
  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
    if (isTtsMode && isPlaying) {
      handlePause();
      setTimeout(handlePlay, 100);
    }
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`p-4 rounded-2xl border ${theme.border} ${theme.card} shadow-sm space-y-3`}>
      {/* Hidden audio element if URL exists */}
      {(resolvedSrc || audioUrl) && (
        <audio
          ref={audioRef}
          src={resolvedSrc || audioUrl}
          onTimeUpdate={() => {
            if (audioRef.current) {
              setCurrentTime(audioRef.current.currentTime);
            }
          }}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setDuration(audioRef.current.duration || 0);
            }
          }}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(0);
          }}
        />
      )}

      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
            isPlaying ? 'bg-emerald-500 text-white animate-pulse' : 'bg-emerald-500/10 text-emerald-500'
          }`}>
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-emerald-500 flex items-center gap-1.5">
              <span>{title}</span>
              {isTtsMode && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 font-normal">
                  Giọng đọc AI (TTS)
                </span>
              )}
            </h4>
            <span className={`text-[10px] ${theme.textMuted}`}>
              Luyện nghe chuẩn định dạng TOEIC • Kéo thanh để tua lại mốc nghe
            </span>
          </div>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-1 bg-neutral-500/10 p-1 rounded-xl">
          {[0.75, 1.0, 1.25, 1.5].map(rate => (
            <button
              key={rate}
              type="button"
              onClick={() => handleSpeedChange(rate)}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                playbackRate === rate
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : `${theme.textMuted} hover:text-white`
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>
      </div>

      {/* Seek / Timeline Bar */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-medium w-10 text-right">
            {formatTime(currentTime)}
          </span>
          <div className="relative flex-1 flex items-center group">
            <input
              type="range"
              min={0}
              max={duration > 0 ? duration : 100}
              step={0.1}
              value={currentTime}
              onChange={e => handleSeek(parseFloat(e.target.value))}
              className="w-full h-2 rounded-lg bg-neutral-700/60 accent-emerald-500 cursor-pointer"
            />
          </div>
          <span className={`text-[11px] font-mono ${theme.textMuted} w-10`}>
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Control Buttons Bar */}
      <div className="flex items-center justify-between pt-1">
        {/* Rewind -5s */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleSkip(-5)}
            className={`p-2 rounded-xl border ${theme.border} ${theme.badgeBg} hover:border-emerald-500 text-xs font-semibold flex items-center gap-1 cursor-pointer`}
            title="Tua lại 5 giây"
          >
            <Rewind className="w-3.5 h-3.5" />
            <span className="text-[10px]">-5s</span>
          </button>
          <button
            type="button"
            onClick={() => handleSkip(5)}
            className={`p-2 rounded-xl border ${theme.border} ${theme.badgeBg} hover:border-emerald-500 text-xs font-semibold flex items-center gap-1 cursor-pointer`}
            title="Tua tới 5 giây"
          >
            <FastForward className="w-3.5 h-3.5" />
            <span className="text-[10px]">+5s</span>
          </button>
        </div>

        {/* Primary Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          className="px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-transform active:scale-95 cursor-pointer"
        >
          {isPlaying ? (
            <>
              <Pause className="w-4 h-4 fill-current" />
              <span>Tạm dừng</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Phát âm thanh</span>
            </>
          )}
        </button>

        {/* Replay from beginning / Mute */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleSeek(0)}
            className={`p-2 rounded-xl border ${theme.border} ${theme.badgeBg} hover:border-emerald-500 text-xs font-semibold flex items-center gap-1 cursor-pointer`}
            title="Nghe lại từ đầu"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              const nextMuted = !isMuted;
              setIsMuted(nextMuted);
              if (audioRef.current) {
                audioRef.current.muted = nextMuted;
              }
            }}
            className={`p-2 rounded-xl border ${theme.border} ${theme.badgeBg} hover:border-emerald-500 text-xs font-semibold flex items-center gap-1 cursor-pointer`}
            title={isMuted ? 'Bật âm lượng' : 'Tắt tiếng'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
          </button>
        </div>
      </div>
    </div>
  );
};
