import { resolveMediaUrl } from './mediaDb';

function formatTime(secs: number): string {
  if (isNaN(secs) || secs < 0 || !isFinite(secs)) return '00:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const PLAY_ICON = `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
const PAUSE_ICON = `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;

export function attachAudioBarListeners(container: HTMLElement): () => void {
  const activeAudios: HTMLAudioElement[] = [];
  const intervals: any[] = [];

  const bars = container.querySelectorAll<HTMLElement>('.lecture-audio-bar, .lecture-audio-widget');

  bars.forEach((bar) => {
    // If legacy .lecture-audio-widget without bar layout, handle legacy click
    if (bar.classList.contains('lecture-audio-widget') && !bar.querySelector('.lecture-audio-slider')) {
      const audioSrc = bar.getAttribute('data-audio-src');
      const audioText = bar.getAttribute('data-audio-text');

      const clickHandler = async (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        if (audioSrc) {
          const resolved = await resolveMediaUrl(audioSrc);
          const audio = new Audio(resolved || audioSrc);
          audio.play().catch(console.warn);
        } else if (audioText && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const ut = new SpeechSynthesisUtterance(audioText);
          ut.lang = 'en-US';
          window.speechSynthesis.speak(ut);
        }
      };
      bar.addEventListener('click', clickHandler);
      return;
    }

    // Modern Audio Bar:
    const playBtn = bar.querySelector<HTMLButtonElement>('.lecture-audio-play-btn');
    const slider = bar.querySelector<HTMLInputElement>('.lecture-audio-slider');
    const currentTimeEl = bar.querySelector<HTMLElement>('.current-time');
    const durationTimeEl = bar.querySelector<HTMLElement>('.duration-time');
    const speedBtn = bar.querySelector<HTMLButtonElement>('.lecture-audio-speed-btn');

    const rawSrc = bar.getAttribute('data-audio-src') || '';
    const rawText = bar.getAttribute('data-audio-text') || '';

    let audio: HTMLAudioElement | null = null;
    let isPlaying = false;
    let currentSpeed = 1.0;
    const speeds = [1.0, 1.25, 1.5, 0.75];

    const setPlayingState = (playing: boolean) => {
      isPlaying = playing;
      if (playBtn) {
        playBtn.innerHTML = playing ? PAUSE_ICON : PLAY_ICON;
        playBtn.style.backgroundColor = playing ? '#f59e0b' : '#10b981';
      }
    };

    // Initialize audio instance
    const getOrInitAudio = async (): Promise<HTMLAudioElement | null> => {
      if (audio) return audio;
      if (!rawSrc) return null;

      const playableUrl = await resolveMediaUrl(rawSrc);
      if (!playableUrl) return null;

      audio = new Audio(playableUrl);
      activeAudios.push(audio);
      audio.playbackRate = currentSpeed;

      audio.onloadedmetadata = () => {
        if (durationTimeEl && audio) {
          durationTimeEl.textContent = formatTime(audio.duration);
        }
      };

      audio.ontimeupdate = () => {
        if (!audio) return;
        if (currentTimeEl) {
          currentTimeEl.textContent = formatTime(audio.currentTime);
        }
        if (slider && audio.duration) {
          slider.value = String((audio.currentTime / audio.duration) * 100);
        }
      };

      audio.onended = () => {
        setPlayingState(false);
        if (slider) slider.value = '0';
        if (currentTimeEl) currentTimeEl.textContent = '00:00';
      };

      audio.onerror = () => {
        setPlayingState(false);
        if (durationTimeEl) durationTimeEl.textContent = 'Lỗi';
      };

      return audio;
    };

    // Preload metadata to display duration
    if (rawSrc) {
      getOrInitAudio().then(a => {
        if (a && a.duration && !isNaN(a.duration) && durationTimeEl) {
          durationTimeEl.textContent = formatTime(a.duration);
        }
      });
    } else if (rawText) {
      if (durationTimeEl) {
        const estSec = Math.max(3, Math.ceil(rawText.split(/\s+/).length / 2.5));
        durationTimeEl.textContent = formatTime(estSec);
      }
    }

    // Play / Pause Click
    if (playBtn) {
      playBtn.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (isPlaying) {
          if (audio) {
            audio.pause();
          }
          if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
          }
          setPlayingState(false);
          return;
        }

        // Stop other active audios
        activeAudios.forEach(a => {
          if (a !== audio) a.pause();
        });
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }

        if (rawSrc) {
          const a = await getOrInitAudio();
          if (a) {
            a.playbackRate = currentSpeed;
            a.play().then(() => {
              setPlayingState(true);
            }).catch(console.warn);
          }
        } else if (rawText && 'speechSynthesis' in window) {
          // TTS Fallback
          setPlayingState(true);
          const ut = new SpeechSynthesisUtterance(rawText);
          ut.lang = 'en-US';
          ut.rate = currentSpeed;
          ut.onend = () => setPlayingState(false);
          ut.onerror = () => setPlayingState(false);
          window.speechSynthesis.speak(ut);
        }
      };
    }

    // Slider scrubbing
    if (slider) {
      slider.oninput = async (e) => {
        e.stopPropagation();
        const a = await getOrInitAudio();
        if (a && a.duration) {
          const targetTime = (parseFloat(slider.value) / 100) * a.duration;
          a.currentTime = targetTime;
          if (currentTimeEl) {
            currentTimeEl.textContent = formatTime(targetTime);
          }
        }
      };
    }

    // Speed button toggle
    if (speedBtn) {
      speedBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const curIdx = speeds.indexOf(currentSpeed);
        const nextIdx = (curIdx + 1) % speeds.length;
        currentSpeed = speeds[nextIdx];
        speedBtn.textContent = `${currentSpeed}x`;
        speedBtn.setAttribute('data-speed', String(currentSpeed));
        if (audio) {
          audio.playbackRate = currentSpeed;
        }
      };
    }
  });

  // Cleanup handler
  return () => {
    activeAudios.forEach(a => {
      a.pause();
      a.src = '';
    });
    intervals.forEach(clearInterval);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };
}
