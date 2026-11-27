import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Film,
  Keyboard,
  Layers,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  BRAND_COLLABORATIONS,
  SHOWREEL_CHAPTERS,
  SHOWREEL_VIDEO_SRC,
  ShowreelChapter,
} from '../data/spentaEnrichments';
import { SPENTA_APPS } from '../data/spentaManifest';
import { useStack } from '../store/StackContext';

interface ShowreelAndBrandsStudioProps {
  seekSignal?: { seconds: number; nonce: number } | null;
}

type VideoLoadStatus = 'loading' | 'ready' | 'buffering' | 'error';

const SHOWREEL_VIDEO_CANDIDATES = Array.from(
  new Set([SHOWREEL_VIDEO_SRC, '/assets/aistudio/spenta_demo.mp4', '/spenta_demo.mp4']),
);

function formatClock(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function ShowreelAndBrandsStudio({ seekSignal }: ShowreelAndBrandsStudioProps) {
  const { selectedIds, toggleApp, setDrawerOpen } = useStack();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const chapterButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const pendingSeekRef = useRef<{ seconds: number; autoPlay: boolean } | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(182);
  const [bufferedPct, setBufferedPct] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [sliderPaused, setSliderPaused] = useState(false);
  const [videoStatus, setVideoStatus] = useState<VideoLoadStatus>('loading');
  const [videoErrorMsg, setVideoErrorMsg] = useState<string | null>(null);
  const [pathCheckNote, setPathCheckNote] = useState<string | null>(null);
  const [checkingPath, setCheckingPath] = useState(false);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [reloadNonce, setReloadNonce] = useState(0);

  const activeVideoSrc = SHOWREEL_VIDEO_CANDIDATES[sourceIndex] ?? SHOWREEL_VIDEO_SRC;

  const activeChapterIndex = useMemo(() => {
    let matchedIdx = 0;
    for (let i = 0; i < SHOWREEL_CHAPTERS.length; i++) {
      if (currentTime + 0.35 >= SHOWREEL_CHAPTERS[i].seconds) {
        matchedIdx = i;
      }
    }
    return matchedIdx;
  }, [currentTime]);

  const activeChapter = SHOWREEL_CHAPTERS[activeChapterIndex] ?? SHOWREEL_CHAPTERS[0];

  const updateBufferedProgress = useCallback((el: HTMLVideoElement) => {
    const totalDur = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : duration;
    if (totalDur > 0 && el.buffered.length > 0) {
      try {
        const end = el.buffered.end(el.buffered.length - 1);
        const pct = Math.max(0, Math.min(100, Math.round((end / totalDur) * 100)));
        setBufferedPct(pct);
      } catch {
        // ignore buffered range read errors
      }
    }
  }, [duration]);

  // Synchronize initial video readyState if cached/preloaded immediately on mount or retry
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.error) {
      setVideoStatus('error');
      setVideoErrorMsg('Unable to decode showreel video stream.');
      return;
    }
    if (el.readyState >= 2) {
      if (Number.isFinite(el.duration) && el.duration > 0) setDuration(el.duration);
      updateBufferedProgress(el);
      setVideoStatus('ready');
      setVideoErrorMsg(null);
      setPathCheckNote(null);
    } else if (el.readyState === 1) {
      if (Number.isFinite(el.duration) && el.duration > 0) setDuration(el.duration);
      updateBufferedProgress(el);
      setVideoStatus('loading');
    }
  }, [reloadNonce, sourceIndex, updateBufferedProgress]);

  const jumpToChapter = useCallback((seconds: number, autoPlay = true) => {
    const el = videoRef.current;
    if (!el) return;
    setCurrentTime(seconds);
    if (el.readyState < 1) {
      pendingSeekRef.current = { seconds, autoPlay };
      setVideoStatus((prev) => (prev === 'error' ? 'loading' : prev));
      el.load();
      return;
    }
    pendingSeekRef.current = null;
    el.currentTime = seconds;
    if (autoPlay) {
      el.play().catch(() => {
        /* autoplay blocked by browser policy; user can press Play */
      });
    }
  }, []);

  useEffect(() => {
    if (!seekSignal) return;
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const timer = window.setTimeout(() => {
      jumpToChapter(seekSignal.seconds, true);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [seekSignal, jumpToChapter]);

  const handleRetryStream = useCallback(async () => {
    setCheckingPath(true);
    setPathCheckNote(null);
    setVideoErrorMsg(null);
    setVideoStatus('loading');
    setBufferedPct(0);

    let resolvedIdx = 0;
    let foundReachable = false;
    const diagnostics: string[] = [];

    for (let i = 0; i < SHOWREEL_VIDEO_CANDIDATES.length; i++) {
      const candidate = SHOWREEL_VIDEO_CANDIDATES[i];
      try {
        const res = await fetch(candidate, { method: 'HEAD' });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && (!contentType || contentType.includes('video') || contentType.includes('octet-stream'))) {
          resolvedIdx = i;
          foundReachable = true;
          break;
        }
        diagnostics.push(`${candidate} → HTTP ${res.status}`);
      } catch {
        diagnostics.push(`${candidate} → network unreachable`);
      }
    }

    setCheckingPath(false);
    setSourceIndex(resolvedIdx);
    setReloadNonce((n) => n + 1);

    if (!foundReachable && diagnostics.length > 0) {
      setPathCheckNote(`Asset check: ${diagnostics.join(' · ')}`);
    }

    const el = videoRef.current;
    if (el) {
      el.load();
    }
  }, []);

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (videoStatus === 'error') {
      void handleRetryStream();
      return;
    }
    if (el.paused) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [videoStatus, handleRetryStream]);

  const toggleMute = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setIsMuted(el.muted);
  }, []);

  const stepChapter = useCallback(
    (delta: -1 | 1) => {
      const targetIdx = Math.max(
        0,
        Math.min(SHOWREEL_CHAPTERS.length - 1, activeChapterIndex + delta),
      );
      const target = SHOWREEL_CHAPTERS[targetIdx];
      if (!target) return;
      jumpToChapter(target.seconds, true);
      chapterButtonRefs.current[targetIdx]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    },
    [activeChapterIndex, jumpToChapter],
  );

  // Keyboard shortcuts: Space (play/pause), Left/Right arrows (step chapters), M (mute/unmute)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      // Do not intercept while a modal dialog / command palette is open
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepChapter(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepChapter(1);
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, toggleMute, stepChapter]);

  const handleAddChapterModules = (chapter: ShowreelChapter) => {
    chapter.appIds.forEach((id) => {
      if (!selectedIds.includes(id)) {
        toggleApp(id);
      }
    });
    setDrawerOpen(true);
  };

  const appNameMap = useMemo(
    () => Object.fromEntries(SPENTA_APPS.map((a) => [a.id, a.shortName])),
    [],
  );

  return (
    <div className="space-y-6">
      {/* Looping Brand Collaboration Slider */}
      <section className="rounded-2xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <div className="text-xs font-mono text-[#1C6E46] dark:text-[#6FCB9F] font-semibold">
              Enterprise Deployments &amp; Brand Collaborations · 16 Portfolio Partners
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#16213A] dark:text-[#E7EBF5] mt-0.5">
              Production Footprint Across Global &amp; Regional Leaders
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setSliderPaused((p) => !p)}
            aria-pressed={sliderPaused}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0B1020] text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5] hover:border-[#1F3863] transition-colors self-start sm:self-auto whitespace-nowrap shrink-0 cursor-pointer"
          >
            {sliderPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{sliderPaused ? 'Resume Slider' : 'Pause Slider'}</span>
          </button>
        </div>

        <div className="spenta-brand-slider-mask py-2">
          <div
            className="spenta-brand-slider-track gap-3"
            style={sliderPaused ? { animationPlayState: 'paused' } : undefined}
          >
            {[0, 1].map((loopIdx) => (
              <div
                key={loopIdx}
                aria-hidden={loopIdx === 1}
                className={`flex items-center gap-3 pr-3 ${
                  loopIdx === 1 ? 'spenta-brand-slider-duplicate' : ''
                }`}
              >
                {BRAND_COLLABORATIONS.map((brand) => (
                  <div
                    key={`${loopIdx}-${brand.name}`}
                    className="flex flex-col justify-center px-4 py-2.5 rounded-xl border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0B1020] min-w-[178px] shrink-0"
                  >
                    <span className="text-sm font-bold text-[#16213A] dark:text-[#E7EBF5] whitespace-nowrap">
                      {brand.name}
                    </span>
                    <span className="text-[11px] text-[#5F6576] dark:text-[#8E96B0] whitespace-nowrap mt-0.5">
                      {brand.domain}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-[#5F6576] dark:text-[#8E96B0] mt-2">
          Collaborations and deployments per company portfolio, 2026; client-reported benchmarks. Hover any item to pause.
        </p>
      </section>

      {/* Interactive Chaptered 1080p Showreel Studio */}
      <section
        ref={sectionRef}
        id="spenta-showreel-studio"
        className="rounded-2xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] p-5 sm:p-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-[#E4DFD6] dark:border-[#232B4A]">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-mono text-[#1C6E46] dark:text-[#6FCB9F] font-semibold">
              <Film className="w-3.5 h-3.5" />
              <span>Interactive Production Showreel · 1080p · {SHOWREEL_CHAPTERS.length} Indexed Chapters</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-[#16213A] dark:text-[#E7EBF5] mt-0.5">
              Spenta Sovereign OS — Spatial XR, Cleanroom VR &amp; Digital Twin Demo
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono text-[#5F6576] dark:text-[#8E96B0] mr-1">
              <Keyboard className="w-3.5 h-3.5" />
              <span>Space Play/Pause · ←/→ Chapter · M Mute</span>
            </span>
            <button
              type="button"
              onClick={togglePlay}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1F3863] dark:bg-[#8FA6E8] text-white dark:text-[#0B1020] text-xs font-semibold hover:opacity-95 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
              title="Toggle Play / Pause (Space)"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Pause Reel' : 'Play Showreel'}</span>
            </button>
            <button
              type="button"
              onClick={toggleMute}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0B1020] text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5] hover:border-[#1F3863] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Mute / Unmute (M)"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>{isMuted ? 'Unmute' : 'Mute'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 mt-5 items-start">
          {/* Video Viewport + Active Chapter Context */}
          <div className="xl:col-span-7 space-y-3">
            <div className="relative rounded-xl overflow-hidden bg-[#060B18] border border-[#232B4A] aspect-video">
              <video
                key={`${sourceIndex}-${reloadNonce}`}
                ref={videoRef}
                src={activeVideoSrc}
                controls
                muted={isMuted}
                playsInline
                preload="auto"
                onLoadStart={() => {
                  setVideoErrorMsg(null);
                  setVideoStatus('loading');
                }}
                onLoadedMetadata={(e) => {
                  const el = e.currentTarget;
                  if (Number.isFinite(el.duration) && el.duration > 0) {
                    setDuration(el.duration);
                  }
                  updateBufferedProgress(el);
                  if (pendingSeekRef.current) {
                    const { seconds, autoPlay } = pendingSeekRef.current;
                    pendingSeekRef.current = null;
                    el.currentTime = seconds;
                    setCurrentTime(seconds);
                    if (autoPlay) {
                      el.play().catch(() => {});
                    }
                  }
                }}
                onProgress={(e) => updateBufferedProgress(e.currentTarget)}
                onLoadedData={(e) => {
                  updateBufferedProgress(e.currentTarget);
                  setVideoErrorMsg(null);
                  setPathCheckNote(null);
                  setVideoStatus('ready');
                }}
                onCanPlay={(e) => {
                  updateBufferedProgress(e.currentTarget);
                  setVideoErrorMsg(null);
                  setPathCheckNote(null);
                  setVideoStatus('ready');
                }}
                onCanPlayThrough={() => {
                  setBufferedPct(100);
                  setVideoStatus('ready');
                }}
                onWaiting={() => setVideoStatus('buffering')}
                onStalled={() => setVideoStatus((prev) => (prev === 'error' ? 'error' : 'buffering'))}
                onPlaying={() => {
                  setVideoStatus('ready');
                  setIsPlaying(true);
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={(e) => {
                  setCurrentTime(e.currentTarget.currentTime);
                  setVideoStatus((prev) => (prev === 'buffering' || prev === 'loading' ? 'ready' : prev));
                }}
                onError={(e) => {
                  if (sourceIndex + 1 < SHOWREEL_VIDEO_CANDIDATES.length) {
                    setSourceIndex((idx) => idx + 1);
                    setVideoStatus('loading');
                    return;
                  }
                  const mediaErr = e.currentTarget.error;
                  const codeMap: Record<number, string> = {
                    1: 'Playback aborted before completion.',
                    2: 'Network error while streaming the 1080p MP4 showreel asset.',
                    3: 'Browser failed to decode the MP4 video stream.',
                    4: 'Showreel MP4 asset could not be loaded or format is unsupported.',
                  };
                  setIsPlaying(false);
                  setVideoStatus('error');
                  setVideoErrorMsg(
                    (mediaErr && codeMap[mediaErr.code]) ||
                      'Showreel video stream failed to initialize.',
                  );
                }}
                className="w-full h-full object-contain bg-black"
              />

              {(videoStatus === 'loading' || videoStatus === 'buffering') && (
                <div
                  role="status"
                  aria-live="polite"
                  className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#060B18]/80 backdrop-blur-[2px] px-4 text-center text-[#E7EBF5]"
                >
                  <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-[#141A32]/90 border border-[#6FCB9F]/40">
                    <Loader2 className="w-6 h-6 animate-spin text-[#6FCB9F]" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs sm:text-sm font-semibold text-white">
                      {videoStatus === 'loading'
                        ? 'Loading 1080p Production Showreel…'
                        : 'Buffering 1080p Showreel Stream…'}
                    </div>
                    <div className="text-[11px] font-mono text-[#A4ADC6] tabular-nums">
                      {bufferedPct > 0
                        ? `Buffered ${bufferedPct}% · Preparing chapter timestamps`
                        : 'Connecting to local MP4 stream…'}
                    </div>
                  </div>
                  {bufferedPct > 0 && (
                    <div className="w-44 h-1 rounded-full bg-white/15 overflow-hidden">
                      <div
                        className="h-full bg-[#6FCB9F] transition-all duration-200"
                        style={{ width: `${bufferedPct}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

              {videoStatus === 'error' && (
                <div
                  role="alert"
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#060B18]/94 p-5 text-center text-[#E7EBF5]"
                >
                  <div className="w-11 h-11 rounded-full bg-amber-500/15 border border-amber-400/40 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="space-y-1.5 max-w-md">
                    <div className="text-sm font-bold text-white">
                      Showreel Video Failed to Load
                    </div>
                    <p className="text-xs text-[#C8D0E4]">
                      {videoErrorMsg ?? 'Unable to load the embedded 1080p production reel.'}
                    </p>
                    <p className="text-[11px] text-[#8E96B0] leading-relaxed">
                      Check that the local MP4 file is available under{' '}
                      <code className="font-mono text-[#6FCB9F]">{SHOWREEL_VIDEO_SRC}</code> (or{' '}
                      <code className="font-mono text-[#6FCB9F]">/spenta_demo.mp4</code>) and served with{' '}
                      <span className="font-mono text-[#E7EBF5]">video/mp4</span> byte-range support.
                    </p>
                    {pathCheckNote && (
                      <p className="text-[10px] font-mono text-amber-300/90 break-all">
                        {pathCheckNote}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      disabled={checkingPath}
                      onClick={() => void handleRetryStream()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1C6E46] hover:bg-[#175A39] disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
                    >
                      {checkingPath ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5" />
                      )}
                      <span>{checkingPath ? 'Checking Asset Path…' : 'Retry Video Stream'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0B1020] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#5F6576] dark:text-[#8E96B0] font-mono tabular-nums">
                  <span className="text-[#1C6E46] dark:text-[#6FCB9F] font-semibold">
                    Now Showing · {activeChapter.timestampLabel}
                  </span>
                  <span aria-hidden="true">/</span>
                  <span>{formatClock(currentTime)} of {formatClock(duration)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeChapter.sector}</span>
                  <span aria-hidden="true">·</span>
                  <span
                    className={
                      videoStatus === 'error'
                        ? 'text-rose-600 dark:text-rose-400'
                        : videoStatus === 'ready'
                          ? 'text-[#1C6E46] dark:text-[#6FCB9F]'
                          : 'text-amber-600 dark:text-amber-400'
                    }
                  >
                    {videoStatus === 'ready'
                      ? 'Stream Ready'
                      : videoStatus === 'buffering'
                        ? 'Buffering…'
                        : videoStatus === 'error'
                          ? 'Stream Error'
                          : 'Loading 1080p…'}
                  </span>
                </div>
                <div className="text-sm font-bold text-[#16213A] dark:text-[#E7EBF5] mt-1">
                  {activeChapter.title}
                </div>
                <p className="text-xs text-[#4A5568] dark:text-[#A4ADC6] mt-0.5">
                  {activeChapter.highlight}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleAddChapterModules(activeChapter)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1C6E46] dark:bg-[#6FCB9F] text-white dark:text-[#0B1020] text-xs font-semibold hover:opacity-95 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Add Matching Modules ({activeChapter.appIds.length})</span>
              </button>
            </div>
          </div>

          {/* Clickable Chapter Index with Elapsed Mini Progress Bars */}
          <div className="xl:col-span-5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="text-xs font-semibold text-[#5F6576] dark:text-[#8E96B0]">
                Chapter Controller ({activeChapterIndex + 1}/{SHOWREEL_CHAPTERS.length})
              </div>
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => stepChapter(-1)}
                  disabled={activeChapterIndex === 0}
                  aria-label="Previous chapter (Left Arrow)"
                  title="Previous chapter (←)"
                  className="p-1 rounded-md border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0B1020] text-[#16213A] dark:text-[#E7EBF5] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => stepChapter(1)}
                  disabled={activeChapterIndex === SHOWREEL_CHAPTERS.length - 1}
                  aria-label="Next chapter (Right Arrow)"
                  title="Next chapter (→)"
                  className="p-1 rounded-md border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0B1020] text-[#16213A] dark:text-[#E7EBF5] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="space-y-1.5 max-h-[430px] overflow-y-auto pr-1">
              {SHOWREEL_CHAPTERS.map((ch, idx) => {
                const isActive = activeChapterIndex === idx;
                const nextStart =
                  idx < SHOWREEL_CHAPTERS.length - 1
                    ? SHOWREEL_CHAPTERS[idx + 1].seconds
                    : Math.max(duration, ch.seconds + 15);
                const chapterSpan = Math.max(1, nextStart - ch.seconds);
                const elapsedInChapter = Math.max(0, Math.min(chapterSpan, currentTime - ch.seconds));
                const chapterProgressPct = Math.round((elapsedInChapter / chapterSpan) * 100);
                const isCompleted = currentTime >= nextStart;
                const moduleLabels = ch.appIds.map((id) => appNameMap[id] ?? id).join(' · ');

                return (
                  <button
                    key={ch.id}
                    ref={(node) => {
                      chapterButtonRefs.current[idx] = node;
                    }}
                    type="button"
                    onClick={() => jumpToChapter(ch.seconds, true)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#1F3863]/10 dark:bg-[#8FA6E8]/15 border-[#1F3863]/50 dark:border-[#8FA6E8]/50'
                        : 'bg-[#FAF8F4] dark:bg-[#0B1020] border-[#E4DFD6] dark:border-[#232B4A] hover:border-[#1F3863]/40 dark:hover:border-[#8FA6E8]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#16213A] dark:text-[#E7EBF5] truncate">
                        {ch.title}
                      </span>
                      <span className="text-xs font-mono tabular-nums font-semibold text-[#1C6E46] dark:text-[#6FCB9F] shrink-0">
                        {ch.timestampLabel}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#5F6576] dark:text-[#8E96B0] mt-0.5 truncate">
                      {ch.sector} · {moduleLabels}
                    </div>

                    {/* Mini elapsed time progress bar per chapter */}
                    <div className="mt-2 flex items-center gap-2">
                      <div
                        className="flex-1 h-1 rounded-full bg-[#E4DFD6] dark:bg-[#232B4A] overflow-hidden"
                        role="progressbar"
                        aria-label={`${ch.title} elapsed progress`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={chapterProgressPct}
                      >
                        <div
                          className={`h-full rounded-full transition-all duration-200 ${
                            isActive
                              ? 'bg-[#1C6E46] dark:bg-[#6FCB9F]'
                              : isCompleted
                                ? 'bg-[#1F3863]/55 dark:bg-[#8FA6E8]/55'
                                : 'bg-transparent'
                          }`}
                          style={{ width: `${chapterProgressPct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0] shrink-0">
                        {formatClock(elapsedInChapter)} / {formatClock(chapterSpan)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
