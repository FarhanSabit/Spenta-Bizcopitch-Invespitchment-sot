import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Grid3x3,
  Info,
  Keyboard,
  Loader2,
  Presentation,
  Printer,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { PITCH_DECK_SLIDES, PitchSlide, SERVER_TIERS } from '../data/spentaManifest';
import { getKpiDefinition } from '../data/pitchKpiDefinitions';
import {
  AI_SAFETY_CLIMATE_SLIDES,
  CORE_LEADERSHIP_TEAM,
  CTO_TECHNICAL_SLIDES,
  INVESTOR_GLOSSARY,
  INVESTOR_MASTER_ADDITIONAL_SLIDES,
  PITCH_DECK_TRACKS,
  PitchDeckTrackId,
  QA_CREDIBILITY_SHIELD,
} from '../data/spentaEnrichments';
import { useStack } from '../store/StackContext';
import {
  PdfThemeOption,
  StackAppendixData,
  downloadSerializedPrintDeckPdf,
  exportPitchDeckToPdf,
} from '../utils/exportPitchDeckPdf';
import { SpentaLogo } from './SpentaLogo';

type ExportScope = 'all' | 'current' | 'range';

export function PitchDeckView() {
  const {
    pendingNavFocus,
    clearPendingNavFocus,
    selectedApps,
    stackMetrics,
    mobileGridVisible,
    toggleMobileGrid,
    setDataRoomOpen,
    openContactModal,
    openBriefingSection,
  } = useStack();
  const [activeTrack, setActiveTrack] = useState<PitchDeckTrackId>('investor-master');
  const [slideIdx, setSlideIdx] = useState(0);
  const [displayedIdx, setDisplayedIdx] = useState(0);
  const [transitionStage, setTransitionStage] = useState<'visible' | 'fading-out' | 'fading-in'>(
    'visible',
  );
  const [slideDir, setSlideDir] = useState<1 | -1>(1);
  const [showNotes, setShowNotes] = useState(true);
  const transitionTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const investorMasterSlides = useMemo<PitchSlide[]>(() => {
    const baseWithoutAsk = PITCH_DECK_SLIDES.slice(0, PITCH_DECK_SLIDES.length - 1);
    const askSlide = PITCH_DECK_SLIDES[PITCH_DECK_SLIDES.length - 1];
    return [...baseWithoutAsk, ...INVESTOR_MASTER_ADDITIONAL_SLIDES, askSlide].map((s, idx) => ({
      ...s,
      num: idx + 1,
    }));
  }, []);

  const activeSlides = useMemo<PitchSlide[]>(() => {
    if (activeTrack === 'cto-technical') return CTO_TECHNICAL_SLIDES;
    if (activeTrack === 'ai-safety-climate') return AI_SAFETY_CLIMATE_SLIDES;
    return investorMasterSlides;
  }, [activeTrack, investorMasterSlides]);

  const activeTrackMeta = useMemo(
    () => PITCH_DECK_TRACKS.find((t) => t.id === activeTrack) ?? PITCH_DECK_TRACKS[0],
    [activeTrack],
  );

  // High-Quality PDF Export state & modal options
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportScope, setExportScope] = useState<ExportScope>('all');
  const [rangeStart, setRangeStart] = useState<number>(1);
  const [rangeEnd, setRangeEnd] = useState<number>(activeSlides.length);
  const [includeNotesInPdf, setIncludeNotesInPdf] = useState(true);
  const [includeStackAppendix, setIncludeStackAppendix] = useState(true);
  const [pdfTheme, setPdfTheme] = useState<PdfThemeOption>('auto');
  const [pdfState, setPdfState] = useState<'idle' | 'exporting' | 'done'>('idle');
  const [pdfProgress, setPdfProgress] = useState<string>('');
  const [blobPdfState, setBlobPdfState] = useState<'idle' | 'exporting' | 'done'>('idle');
  const [blobPdfProgress, setBlobPdfProgress] = useState<string>('');
  const [hoveredMetric, setHoveredMetric] = useState<{
    label: string;
    value: string;
    category: string;
    definition: string;
    benchmark?: string;
    accent?: 'emerald' | 'teal' | 'amber' | 'crimson';
    rect: { left: number; top: number; width: number; height: number; bottom: number };
    darkSurface: boolean;
  } | null>(null);

  const showMetricTooltip = useCallback(
    (
      target: HTMLElement,
      label: string,
      value: string,
      accent?: 'emerald' | 'teal' | 'amber' | 'crimson',
      darkSurface = false,
      customCategory?: string,
      customDefinition?: string,
      customBenchmark?: string,
    ) => {
      const r = target.getBoundingClientRect();
      const meta = getKpiDefinition(label, value);
      setHoveredMetric({
        label,
        value,
        category: customCategory ?? meta.category,
        definition: customDefinition ?? meta.definition,
        benchmark: customBenchmark ?? meta.benchmark,
        accent,
        rect: {
          left: r.left,
          top: r.top,
          width: r.width,
          height: r.height,
          bottom: r.bottom,
        },
        darkSurface,
      });
    },
    [],
  );

  const hideMetricTooltip = useCallback(() => {
    setHoveredMetric(null);
  }, []);

  const total = activeSlides.length;
  const safeDisplayedIdx = Math.min(displayedIdx, total - 1);
  const safeSlideIdx = Math.min(slideIdx, total - 1);
  const slide = activeSlides[safeDisplayedIdx];
  const activeSlide = activeSlides[safeSlideIdx];
  const isDarkSlide = slide.theme === 'dark';

  useEffect(() => {
    setHoveredMetric(null);
  }, [activeTrack, displayedIdx]);

  useEffect(() => {
    const clearOnScroll = () => setHoveredMetric(null);
    window.addEventListener('scroll', clearOnScroll, { passive: true });
    return () => window.removeEventListener('scroll', clearOnScroll);
  }, []);

  const handleSelectTrack = (trackId: PitchDeckTrackId) => {
    if (trackId === activeTrack) return;
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const nextLength =
      trackId === 'cto-technical'
        ? CTO_TECHNICAL_SLIDES.length
        : trackId === 'ai-safety-climate'
          ? AI_SAFETY_CLIMATE_SLIDES.length
          : investorMasterSlides.length;
    setActiveTrack(trackId);
    setSlideIdx(0);
    setDisplayedIdx(0);
    setTransitionStage('visible');
    setRangeStart(1);
    setRangeEnd(nextLength);
  };

  const navigateToSlide = useCallback(
    (targetIdx: number) => {
      const clamped = Math.max(0, Math.min(total - 1, targetIdx));
      if (clamped === slideIdx && clamped === displayedIdx && transitionStage === 'visible') return;

      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = null;
      }
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      const prefersReduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      setSlideIdx(clamped);

      if (prefersReduced) {
        setDisplayedIdx(clamped);
        setTransitionStage('visible');
        return;
      }

      setSlideDir(clamped >= displayedIdx ? 1 : -1);
      setTransitionStage('fading-out');

      transitionTimerRef.current = window.setTimeout(() => {
        setDisplayedIdx(clamped);
        setTransitionStage('fading-in');
        rafRef.current = window.requestAnimationFrame(() => {
          rafRef.current = window.requestAnimationFrame(() => {
            setTransitionStage('visible');
          });
        });
      }, 140);
    },
    [total, slideIdx, displayedIdx, transitionStage],
  );

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current);
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const goPrev = () => navigateToSlide(slideIdx - 1);
  const goNext = () => navigateToSlide(slideIdx + 1);

  useEffect(() => {
    if (pendingNavFocus?.type === 'slide') {
      const num = Number(pendingNavFocus.id);
      if (num >= 1 && num <= total) {
        navigateToSlide(num - 1);
      }
      clearPendingNavFocus();
    }
  }, [pendingNavFocus, clearPendingNavFocus, total, navigateToSlide]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && exportModalOpen) {
        setExportModalOpen(false);
        return;
      }
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        navigateToSlide(slideIdx + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        navigateToSlide(slideIdx - 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [exportModalOpen, navigateToSlide, slideIdx]);

  const buildStackAppendix = (): StackAppendixData | null => {
    if (!includeStackAppendix || selectedApps.length === 0) return null;
    const tierSpec = SERVER_TIERS[stackMetrics.tier];
    return {
      moduleCount: selectedApps.length,
      modules: selectedApps.map((a) => ({
        shortName: a.shortName,
        category: a.category,
        setupUsd: a.setupUsd,
        gmPct: a.gmPct,
        minServerTier: a.minServerTier,
        layers: a.layers,
      })),
      totalSetupUsd: stackMetrics.oneTimeBuildUsd,
      quarterlyRetainerUsd: stackMetrics.quarterlyRetainerUsd,
      blendedGmPct: stackMetrics.blendedGmPct,
      tierCode: tierSpec.code,
      tierName: tierSpec.name,
      tierHardware: `${tierSpec.hardware} (${tierSpec.vramRam})`,
      tierCapex: tierSpec.capex,
      tierSpeed: tierSpec.speed,
      activeLayers: Array.from(stackMetrics.activeLayers).sort(),
      synergyPairs: stackMetrics.synergyPairs,
    };
  };

  const handleExportPdf = async (scopeOverride?: ExportScope) => {
    const scope = scopeOverride ?? exportScope;
    setPdfState('exporting');
    setPdfProgress('Preparing slides…');

    let targetSlides = activeSlides;
    let filename = `Spenta-Sovereign-OS-${activeTrackMeta.filenameSlug}.pdf`;

    if (scope === 'current') {
      targetSlides = [activeSlide];
      filename = `Spenta-${activeTrackMeta.filenameSlug}-Slide-${String(activeSlide.num).padStart(2, '0')}.pdf`;
    } else if (scope === 'range') {
      const start = Math.max(1, Math.min(total, Math.min(rangeStart, rangeEnd)));
      const end = Math.max(1, Math.min(total, Math.max(rangeStart, rangeEnd)));
      targetSlides = activeSlides.slice(start - 1, end);
      filename = `Spenta-${activeTrackMeta.filenameSlug}-Slides-${String(start).padStart(2, '0')}-${String(end).padStart(
        2,
        '0',
      )}.pdf`;
    }

    try {
      await exportPitchDeckToPdf({
        slides: targetSlides,
        totalDeckSlides: total,
        includeSpeakerNotes: includeNotesInPdf,
        pdfTheme,
        stackAppendix: scope === 'current' ? null : buildStackAppendix(),
        filename,
        onProgress: (curr, tot) => {
          setPdfProgress(`Rendering ${curr} / ${tot}…`);
        },
      });
      setPdfState('done');
      setPdfProgress('');
      setExportModalOpen(false);
      window.setTimeout(() => setPdfState('idle'), 2600);
    } catch {
      setPdfState('idle');
      setPdfProgress('');
    }
  };

  // Serialize .pitch-deck-print-deck DOM content and trigger Blob-based PDF download
  const handleDownloadSerializedPrintDeck = async () => {
    setBlobPdfState('exporting');
    setBlobPdfProgress('Serializing deck…');
    try {
      await downloadSerializedPrintDeckPdf({
        containerSelector: '.pitch-deck-print-deck',
        filename: `Spenta-Sovereign-OS-${activeTrackMeta.filenameSlug}-Print.pdf`,
        onProgress: (curr, tot) => {
          setBlobPdfProgress(`Blob PDF ${curr}/${tot}…`);
        },
      });
      setBlobPdfState('done');
      setBlobPdfProgress('');
      window.setTimeout(() => setBlobPdfState('idle'), 2400);
    } catch {
      setBlobPdfState('idle');
      setBlobPdfProgress('');
    }
  };

  // Trigger browser print dialog scoped specifically to .pitch-deck-print-deck elements
  const handlePrintPitchDeck = () => {
    const printContainer = document.querySelector('.pitch-deck-print-deck');
    if (!printContainer) return;

    const root = document.documentElement;
    root.classList.add('printing-pitch-deck-only');

    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      root.classList.remove('printing-pitch-deck-only');
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup, { once: true });
    window.print();
    window.setTimeout(cleanup, 4000);
  };

  const kpiAccentClass = (accent?: 'emerald' | 'teal' | 'amber' | 'crimson') => {
    if (isDarkSlide) {
      if (accent === 'crimson') return 'text-[#FB7185]';
      if (accent === 'amber') return 'text-[#FCD34D]';
      if (accent === 'teal') return 'text-[#5EEAD4]';
      return 'text-[#34D399]';
    }
    if (accent === 'crimson') return 'text-[#E11D48]';
    if (accent === 'amber') return 'text-[#B45309]';
    if (accent === 'teal') return 'text-[#0D9488]';
    return 'text-[#065F46]';
  };

  const printAccentClass = (accent?: 'emerald' | 'teal' | 'amber' | 'crimson') => {
    if (accent === 'crimson') return 'print-accent-crimson';
    if (accent === 'amber') return 'print-accent-amber';
    if (accent === 'teal') return 'print-accent-teal';
    return 'print-accent-emerald';
  };

  return (
    <div className="space-y-5 print:space-y-0">
      {/* Header Bar + Multi-Track Deck Switcher */}
      <section className="rounded-2xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] p-4 sm:p-5 space-y-3 no-print pitch-deck-nav">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#1C6E46] dark:text-[#6FCB9F] uppercase tracking-[0.14em]">
              <Presentation className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>
                {total}-SLIDE TRACK · {activeTrackMeta.shortLabel.toUpperCase()}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#16213A] dark:text-[#E7EBF5] tracking-tight mt-0.5">
              Pitch Deck — {activeTrackMeta.label}
            </h1>
            <p className="text-xs text-[#5F6576] dark:text-[#8E96B0] mt-0.5">
              {activeTrackMeta.subtitle}
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Pitch deck presentation track"
            className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#F2EFE9] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] self-start xl:self-auto"
          >
            {PITCH_DECK_TRACKS.map((track) => {
              const isSelected = track.id === activeTrack;
              return (
                <button
                  key={track.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => handleSelectTrack(track.id)}
                  className={`min-h-[34px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-[#1F3863] text-white dark:bg-[#8FA6E8] dark:text-[#0B1020]'
                      : 'text-[#4A5568] dark:text-[#A4ADC6] hover:text-[#16213A] dark:hover:text-[#E7EBF5]'
                  }`}
                >
                  {track.shortLabel}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#E4DFD6] dark:border-[#232B4A]">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openBriefingSection('ssot-safe-terms')}
              className="inline-flex items-center gap-1.5 min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-semibold border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] text-[#16213A] dark:text-[#E7EBF5] hover:border-[#1C6E46] dark:hover:border-[#6FCB9F] transition-colors cursor-pointer"
            >
              <span>Investor Briefing (SSOT)</span>
            </button>
            <button
              type="button"
              onClick={() => setDataRoomOpen(true)}
              className="inline-flex items-center gap-1.5 min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-semibold border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] text-[#16213A] dark:text-[#E7EBF5] hover:border-[#1F3863] dark:hover:border-[#8FA6E8] transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-[#1C6E46] dark:text-[#6FCB9F]" strokeWidth={1.5} />
              <span>Data Room</span>
            </button>
            <button
              type="button"
              onClick={() => openContactModal('Seed SAFE Term Sheet Inquiry (Pitch Deck)')}
              className="inline-flex items-center gap-1.5 min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#1F3863] text-white dark:bg-[#8FA6E8] dark:text-[#0B1020] hover:opacity-90 transition-opacity cursor-pointer"
            >
              <span>Request Term Sheet</span>
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
          <span className="hidden 2xl:inline-flex items-center gap-1.5 text-xs font-mono text-[#5F6576] dark:text-[#8E96B0] bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] px-2.5 py-1.5 rounded-lg">
            <Keyboard className="w-3.5 h-3.5" strokeWidth={1.5} /> ← / → Arrows
          </span>

          <button
            type="button"
            disabled={pdfState === 'exporting'}
            onClick={() => handleExportPdf('current')}
            className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] hover:border-[#1F3863]/50 dark:hover:border-[#8FA6E8]/50 text-[#16213A] dark:text-[#E7EBF5] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Slide {String(activeSlide.num).padStart(2, '0')} PDF</span>
          </button>

          <button
            type="button"
            disabled={pdfState === 'exporting'}
            onClick={() => setExportModalOpen(true)}
            className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] hover:border-[#1F3863]/50 dark:hover:border-[#8FA6E8]/50 text-[#16213A] dark:text-[#E7EBF5] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            title="Configure PDF theme, slide range, speaker notes & stack appendix"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>PDF Options</span>
          </button>

          <button
            type="button"
            disabled={pdfState === 'exporting'}
            onClick={() => handleExportPdf('all')}
            className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#E11D48] hover:bg-[#BE123C] text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
          >
            {pdfState === 'exporting' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : pdfState === 'done' ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
            )}
            <span>
              {pdfState === 'exporting'
                ? pdfProgress || 'Generating PDF…'
                : pdfState === 'done'
                  ? 'Deck PDF Exported'
                  : 'Export Full Deck PDF'}
            </span>
          </button>

          <button
            type="button"
            onClick={handlePrintPitchDeck}
            className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-[#1F3863]/30 dark:border-[#8FA6E8]/35 bg-[#FAF8F4] dark:bg-[#0F1529] hover:border-[#1F3863] dark:hover:border-[#8FA6E8] hover:bg-[#F2EFE9] dark:hover:bg-[#1C2545] text-[#16213A] dark:text-[#E7EBF5] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            aria-label="Download Pitch Deck PDF: Opens the print-formatted investor presentation with executive summary, L1–L6 architecture, unit economics, and Seed SAFE terms"
            title="Download or print the investor Pitch Deck PDF (executive thesis, L1–L6 sovereign stack, 5-year P&L, and Seed SAFE terms)"
          >
            <Printer className="w-3.5 h-3.5 text-[#1F3863] dark:text-[#8FA6E8]" strokeWidth={1.65} />
            <span>Download Pitch Deck PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setShowNotes((v) => !v)}
            className={`inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showNotes
                ? 'bg-[#1F3863] text-white border-[#1F3863] dark:bg-[#8FA6E8] dark:text-[#0B1020] dark:border-[#8FA6E8]'
                : 'bg-[#FAF8F4] dark:bg-[#0F1529] text-[#16213A] dark:text-[#E7EBF5] border-[#E4DFD6] dark:border-[#232B4A] hover:border-[#1F3863]/50 dark:hover:border-[#8FA6E8]/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>{showNotes ? 'Hide Notes' : 'Show Notes'}</span>
          </button>

          <button
            type="button"
            onClick={toggleMobileGrid}
            aria-pressed={mobileGridVisible}
            className={`md:hidden inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              mobileGridVisible
                ? 'border-[#1C6E46]/50 dark:border-[#6FCB9F]/50 bg-[#1C6E46]/10 dark:bg-[#6FCB9F]/15 text-[#1C6E46] dark:text-[#6FCB9F]'
                : 'bg-[#FAF8F4] dark:bg-[#0F1529] text-[#5F6576] dark:text-[#8E96B0] border-[#E4DFD6] dark:border-[#232B4A]'
            }`}
            title={
              mobileGridVisible
                ? 'Hide 24×24 architectural grid on mobile'
                : 'Show 24×24 architectural grid on mobile'
            }
          >
            <Grid3x3 className="w-3.5 h-3.5" strokeWidth={1.65} />
            <span>{mobileGridVisible ? 'Grid On' : 'Grid Off'}</span>
          </button>
          </div>
        </div>
      </section>

      {/* Main Deck Stage + Slide Jump Rail (Screen Interactive View) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pitch-deck-screen-only">
        <aside className="lg:col-span-3 rounded-2xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] p-3 max-h-[260px] lg:max-h-[640px] overflow-y-auto order-2 lg:order-1 no-print pitch-deck-nav">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#5F6576] dark:text-[#8E96B0] px-2 pb-2 border-b border-[#E4DFD6] dark:border-[#232B4A]">
            Slide Index ({total} Slides)
          </div>
          <div className="mt-2 space-y-1">
            {activeSlides.map((s, idx) => {
              const active = idx === safeSlideIdx;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => navigateToSlide(idx)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer flex items-start gap-2.5 ${
                    active
                      ? 'bg-[#1F3863] text-white dark:bg-[#8FA6E8]/18 dark:text-[#E7EBF5] dark:border dark:border-[#8FA6E8]/45 font-semibold'
                      : 'text-[#4A5568] dark:text-[#A4ADC6] hover:bg-[#FAF8F4] dark:hover:bg-[#0F1529]'
                  }`}
                >
                  <span
                    className={`font-mono text-[10px] shrink-0 mt-0.5 tabular-nums ${
                      active ? 'text-[#6FCB9F]' : 'text-[#5F6576] dark:text-[#8E96B0]'
                    }`}
                  >
                    {String(s.num).padStart(2, '0')}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block text-[10px] font-mono uppercase ${
                        active ? 'text-[#A7E6C7]' : 'text-[#1C6E46] dark:text-[#6FCB9F]'
                      }`}
                    >
                      {s.section}
                    </span>
                    <span className="block truncate">{s.title}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="lg:col-span-9 min-w-0 space-y-4 order-1 lg:order-2">
          {/* 16:9 Aspect Slide Stage with Smooth Directional Fade-In/Out Transition */}
          <div
            className={`relative rounded-2xl border overflow-hidden transition-colors duration-200 motion-reduce:transition-none ${
              isDarkSlide
                ? 'bg-[#0B1020] bg-obsidian-grid text-[#E7EBF5] border-[#6FCB9F]/35'
                : 'bg-white text-[#16213A] border-[#E4DFD6] dark:border-[#232B4A]'
            }`}
          >
            <div
              className={`flex flex-col justify-between p-5 sm:p-8 lg:p-10 min-h-[380px] lg:aspect-[16/9] will-change-[opacity,transform] motion-reduce:transition-none motion-reduce:transform-none ${
                transitionStage === 'fading-out'
                  ? `transition-all duration-150 ease-in opacity-0 ${
                      slideDir === 1 ? '-translate-x-2' : 'translate-x-2'
                    }`
                  : transitionStage === 'fading-in'
                    ? `transition-none opacity-0 ${
                        slideDir === 1 ? 'translate-x-2' : '-translate-x-2'
                      }`
                    : 'transition-all duration-200 ease-out opacity-100 translate-x-0'
              }`}
            >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <SpentaLogo className="h-6 sm:h-7" tone={isDarkSlide ? 'dark-bg' : 'light-bg'} />
                <span
                  className={`font-mono text-[10px] sm:text-[11px] uppercase tracking-wider px-2 py-0.5 rounded border truncate ${
                    isDarkSlide
                      ? 'text-[#6FCB9F] border-[#6FCB9F]/30 bg-[#6FCB9F]/10'
                      : 'text-[#1C6E46] border-[#1C6E46]/30 bg-[#1C6E46]/10'
                  }`}
                >
                  {slide.section}
                </span>
              </div>
              <span
                className={`font-mono text-xs font-bold tabular-nums shrink-0 ${
                  isDarkSlide ? 'text-[#8E96B0]' : 'text-[#5F6576]'
                }`}
              >
                {String(slide.num).padStart(2, '0')} / {total}
              </span>
            </div>

            <div className="my-5 space-y-4 sm:space-y-5">
              <div>
                <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight leading-tight">
                  {slide.title}
                </h2>
                <p
                  className={`text-xs sm:text-base mt-2 max-w-3xl ${
                    isDarkSlide ? 'text-[#A4ADC6]' : 'text-[#4A5568]'
                  }`}
                >
                  {slide.subtitle}
                </p>
              </div>

              {slide.kpis && slide.kpis.length > 0 && (
                <div
                  className={`grid gap-3 ${
                    slide.kpis.length === 4
                      ? 'grid-cols-2 sm:grid-cols-4'
                      : slide.kpis.length === 3
                        ? 'grid-cols-1 sm:grid-cols-3'
                        : 'grid-cols-1 sm:grid-cols-2'
                  }`}
                >
                  {slide.kpis.map((kpi) => (
                    <div
                      key={kpi.label}
                      tabIndex={0}
                      onMouseEnter={(e) =>
                        showMetricTooltip(e.currentTarget, kpi.label, kpi.value, kpi.accent, isDarkSlide)
                      }
                      onMouseLeave={hideMetricTooltip}
                      onFocus={(e) =>
                        showMetricTooltip(e.currentTarget, kpi.label, kpi.value, kpi.accent, isDarkSlide)
                      }
                      onBlur={hideMetricTooltip}
                      aria-label={`${kpi.label}: ${kpi.value}. Hover or focus for metric definition.`}
                      className={`group rounded-xl p-3 sm:p-3.5 border transition-colors cursor-help focus:outline-none ${
                        isDarkSlide
                          ? 'bg-[#141A32] border-[#232B4A] hover:border-[#6FCB9F]/60 focus:border-[#6FCB9F]'
                          : 'bg-[#FAF8F4] border-[#E4DFD6] hover:border-[#1C6E46]/55 focus:border-[#1C6E46]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <div
                          className={`text-[10px] font-mono uppercase tracking-wider truncate ${
                            isDarkSlide ? 'text-[#8E96B0]' : 'text-[#5F6576]'
                          }`}
                        >
                          {kpi.label}
                        </div>
                        <Info
                          className={`w-3 h-3 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity ${
                            isDarkSlide ? 'text-[#8E96B0] group-hover:text-[#6FCB9F]' : 'text-[#7B8294] group-hover:text-[#1C6E46]'
                          }`}
                          strokeWidth={1.65}
                        />
                      </div>
                      <div
                        className={`font-mono text-base sm:text-xl font-extrabold mt-0.5 tabular-nums ${kpiAccentClass(
                          kpi.accent,
                        )}`}
                      >
                        {kpi.value}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <ul className="space-y-2 text-xs sm:text-sm">
                {slide.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2.5 leading-relaxed">
                    <span
                      className={`w-1.5 h-1.5 rounded-full mt-1.5 sm:mt-2 shrink-0 ${
                        isDarkSlide ? 'bg-[#6FCB9F]' : 'bg-[#1C6E46]'
                      }`}
                    />
                    <span className={isDarkSlide ? 'text-[#E7EBF5]' : 'text-[#4A5568]'}>{bullet}</span>
                  </li>
                ))}
              </ul>

              {slide.callout && (
                <div
                  className={`rounded-xl px-4 py-3 border text-xs ${
                    isDarkSlide
                      ? 'bg-[#6FCB9F]/10 border-[#6FCB9F]/35 text-[#E7EBF5]'
                      : 'bg-[#FAF8F4] border-[#E4DFD6] text-[#16213A]'
                  }`}
                >
                  <span
                    className={`font-mono font-bold uppercase mr-2 ${
                      isDarkSlide ? 'text-[#6FCB9F]' : 'text-[#1C6E46]'
                    }`}
                  >
                    {slide.callout.label}:
                  </span>
                  <span>{slide.callout.text}</span>
                </div>
              )}
            </div>

            <div
              className={`pt-3 border-t flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-[11px] font-mono ${
                isDarkSlide
                  ? 'border-[#232B4A] text-[#8E96B0]'
                  : 'border-[#E4DFD6] text-[#5F6576]'
              }`}
            >
              <span>spenta.tech · Sovereign OS</span>
              <span>Confidential Investor Briefing · hello@spenta.tech</span>
            </div>
            </div>
          </div>

          {/* Navigation Controls + Progress Bar */}
          <div className="rounded-xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] px-4 py-3 flex items-center justify-between gap-3 no-print pitch-deck-nav">
            <button
              type="button"
              disabled={slideIdx === 0}
              onClick={goPrev}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-lg bg-[#F2EFE9] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] hover:bg-[#1F3863] hover:text-white dark:hover:bg-[#8FA6E8] dark:hover:text-[#0B1020] disabled:opacity-40 disabled:cursor-not-allowed text-[#16213A] dark:text-[#E7EBF5] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <span className="sm:hidden font-mono text-xs font-bold tabular-nums text-[#4A5568] dark:text-[#A4ADC6]">
              {String(slideIdx + 1).padStart(2, '0')} / {total}
            </span>

            <div className="flex-1 max-w-md hidden sm:block">
              <div className="h-1.5 bg-[#F2EFE9] dark:bg-[#0F1529] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1C6E46] dark:bg-[#6FCB9F] transition-all duration-200"
                  style={{ width: `${((slideIdx + 1) / total) * 100}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              disabled={slideIdx === total - 1}
              onClick={goNext}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-lg bg-[#1F3863] dark:bg-[#8FA6E8] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white dark:text-[#0B1020] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Speaker Notes Drawer */}
          {showNotes && (
            <div className="rounded-xl border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#141A32] p-4">
              <div
                className={`transition-opacity duration-200 motion-reduce:transition-none ${
                  transitionStage === 'visible' ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#1C6E46] dark:text-[#6FCB9F] mb-1">
                  Presenter Speaker Notes — Slide {String(slide.num).padStart(2, '0')}
                </div>
                <p className="text-xs sm:text-sm text-[#4A5568] dark:text-[#A4ADC6] leading-relaxed">
                  {slide.speakerNotes}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Executive Diligence Reference Strip: Canonical 45/30/15/10 SAFE, 4-Leader Team & Q&A Credibility Shield */}
      <section className="rounded-2xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] p-5 space-y-5 no-print pitch-deck-nav">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-[#E4DFD6] dark:border-[#232B4A]">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#1C6E46] dark:text-[#6FCB9F] font-semibold">
              Institutional Diligence Companion · Canonical $500K Post-Money SAFE ($4.5M Cap)
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#16213A] dark:text-[#E7EBF5] mt-0.5">
              Use of Funds (45/30/15/10), Verified Leadership &amp; Q&amp;A Credibility Shield
            </h2>
          </div>
          <button
            type="button"
            onMouseEnter={(e) =>
              showMetricTooltip(
                e.currentTarget,
                'SAFE Cap & Discount',
                '11.11% Cap · 20% Disc.',
                'emerald',
                false,
              )
            }
            onMouseLeave={hideMetricTooltip}
            onFocus={(e) =>
              showMetricTooltip(
                e.currentTarget,
                'SAFE Cap & Discount',
                '11.11% Cap · 20% Disc.',
                'emerald',
                false,
              )
            }
            onBlur={hideMetricTooltip}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-[#5F6576] dark:text-[#8E96B0] hover:text-[#1C6E46] dark:hover:text-[#6FCB9F] tabular-nums shrink-0 cursor-help focus:outline-none"
          >
            <span>11.11% Pre-Dilution Cap · 20% Discount</span>
            <Info className="w-3.5 h-3.5 opacity-70" strokeWidth={1.6} />
          </button>
        </div>

        {/* Canonical 45/30/15/10 Use of Funds Split */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { pct: '45%', label: 'Core Engineering & Sovereign AI', usd: '$225K', detail: '20-FTE Dhaka enclave, L1–L6 kernel, Healthcare ERP' },
            { pct: '30%', label: 'Compliance & Clinical Validation', usd: '$150K', detail: 'HIPAA, SOC 2 Type II, ISO 27001, TGA/FDA/DGDA' },
            { pct: '15%', label: 'Enterprise GTM & Partnerships', usd: '$75K', detail: 'US/AU/BD hospital & BFSI pilot conversions' },
            { pct: '10%', label: 'On-Prem Hardware & Reserve', usd: '$50K', detail: 'Tier 3 demo rigs & working capital buffer' },
          ].map((bucket) => (
            <div
              key={bucket.label}
              tabIndex={0}
              onMouseEnter={(e) =>
                showMetricTooltip(
                  e.currentTarget,
                  bucket.label,
                  `${bucket.pct} (${bucket.usd})`,
                  'emerald',
                  false,
                )
              }
              onMouseLeave={hideMetricTooltip}
              onFocus={(e) =>
                showMetricTooltip(
                  e.currentTarget,
                  bucket.label,
                  `${bucket.pct} (${bucket.usd})`,
                  'emerald',
                  false,
                )
              }
              onBlur={hideMetricTooltip}
              className="group rounded-xl border border-[#E4DFD6] dark:border-[#232B4A] hover:border-[#1C6E46]/55 dark:hover:border-[#6FCB9F]/55 bg-[#FAF8F4] dark:bg-[#0F1529] p-3.5 transition-colors cursor-help focus:outline-none"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-lg font-extrabold text-[#1C6E46] dark:text-[#6FCB9F] tabular-nums">
                  {bucket.pct}
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-[#1F3863] dark:text-[#8FA6E8] tabular-nums">
                  <span>{bucket.usd}</span>
                  <Info className="w-3 h-3 opacity-55 group-hover:opacity-100" strokeWidth={1.6} />
                </span>
              </div>
              <div className="text-xs font-bold text-[#16213A] dark:text-[#E7EBF5] mt-1">
                {bucket.label}
              </div>
              <p className="text-[11px] text-[#5F6576] dark:text-[#8E96B0] mt-1 leading-relaxed">
                {bucket.detail}
              </p>
            </div>
          ))}
        </div>

        {/* Confirmed 4-Leader Executive Grid */}
        <div className="space-y-2.5">
          <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-[#5F6576] dark:text-[#8E96B0] font-semibold">
            Confirmed Core Leadership Team (4 Executives · AU / US / Dhaka Enclave)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {CORE_LEADERSHIP_TEAM.map((leader) => (
              <div
                key={leader.id}
                tabIndex={0}
                onMouseEnter={(e) =>
                  showMetricTooltip(
                    e.currentTarget,
                    leader.name,
                    leader.role,
                    'teal',
                    false,
                    leader.location,
                    leader.credentials,
                    leader.focus,
                  )
                }
                onMouseLeave={hideMetricTooltip}
                onFocus={(e) =>
                  showMetricTooltip(
                    e.currentTarget,
                    leader.name,
                    leader.role,
                    'teal',
                    false,
                    leader.location,
                    leader.credentials,
                    leader.focus,
                  )
                }
                onBlur={hideMetricTooltip}
                className="group rounded-xl border border-[#E4DFD6] dark:border-[#232B4A] hover:border-[#1C6E46]/55 dark:hover:border-[#6FCB9F]/55 bg-[#FAF8F4] dark:bg-[#0F1529] p-3.5 flex flex-col gap-1.5 transition-colors cursor-help focus:outline-none"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-[#1F3863] dark:bg-[#8FA6E8] text-white dark:text-[#0B1020] font-mono text-xs font-bold flex items-center justify-center shrink-0">
                    {leader.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <div className="text-xs font-bold text-[#16213A] dark:text-[#E7EBF5] truncate">
                        {leader.name}
                      </div>
                      <Info
                        className="w-3 h-3 shrink-0 opacity-50 group-hover:opacity-100 text-[#1C6E46] dark:text-[#6FCB9F]"
                        strokeWidth={1.6}
                      />
                    </div>
                    <div className="text-[11px] text-[#1C6E46] dark:text-[#6FCB9F] truncate">
                      {leader.role}
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-[#4A5568] dark:text-[#A4ADC6] leading-relaxed">
                  {leader.focus}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Q&A Credibility Shield & Investor Glossary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
          <div className="rounded-xl border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] p-4 space-y-2.5">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#1F3863] dark:text-[#8FA6E8]">
              Q&amp;A Credibility Shield (Diligence Defense)
            </div>
            <div className="space-y-2">
              {QA_CREDIBILITY_SHIELD.map((qa) => (
                <div
                  key={qa.question}
                  className="rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] p-3"
                >
                  <div className="text-xs font-bold text-[#16213A] dark:text-[#E7EBF5]">
                    {qa.question}
                  </div>
                  <p className="text-[11px] text-[#4A5568] dark:text-[#A4ADC6] mt-1 leading-relaxed">
                    {qa.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] p-4 space-y-2.5">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#1C6E46] dark:text-[#6FCB9F]">
              Institutional Glossary
            </div>
            <div className="space-y-2">
              {INVESTOR_GLOSSARY.map((item) => (
                <div
                  key={item.term}
                  className="rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] p-3"
                >
                  <div className="text-xs font-bold font-mono text-[#16213A] dark:text-[#E7EBF5]">
                    {item.term}
                  </div>
                  <p className="text-[11px] text-[#4A5568] dark:text-[#A4ADC6] mt-1 leading-relaxed">
                    {item.definition}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Print-Only Paginated Active Track Executive Deck */}
      <div className="pitch-deck-print-deck">
        {activeSlides.map((s) => (
          <article key={`${activeTrack}-${s.num}`} className="pitch-deck-print-slide">
            {/* Top Slide Header */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <SpentaLogo className="h-6" tone="light-bg" />
                <span className="pitch-deck-print-badge font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                  {s.section}
                </span>
              </div>
              <span className="pitch-deck-print-counter font-mono text-xs font-bold tabular-nums shrink-0">
                {String(s.num).padStart(2, '0')} / {total}
              </span>
            </div>

            {/* Slide Body */}
            <div className="my-4 space-y-4">
              <div>
                <h2 className="tracking-tight">{s.title}</h2>
                <p className="pitch-deck-print-subtitle mt-1.5 max-w-4xl">{s.subtitle}</p>
              </div>

              {s.kpis && s.kpis.length > 0 && (
                <div
                  className={`grid gap-3 ${
                    s.kpis.length >= 4
                      ? 'grid-cols-4'
                      : s.kpis.length === 3
                        ? 'grid-cols-3'
                        : 'grid-cols-2'
                  }`}
                >
                  {s.kpis.map((kpi) => (
                    <div key={kpi.label} className="pitch-deck-print-kpi">
                      <div className="pitch-deck-print-kpi-label font-mono uppercase tracking-wider">
                        {kpi.label}
                      </div>
                      <div
                        className={`pitch-deck-print-kpi-value font-mono mt-0.5 tabular-nums ${printAccentClass(
                          kpi.accent,
                        )}`}
                      >
                        {kpi.value}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <ul className="space-y-2">
                {s.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2.5">
                    <span className="pitch-deck-print-bullet-dot w-1.5 h-1.5 rounded-full mt-2 shrink-0" />
                    <span className="pitch-deck-print-bullet-text">{bullet}</span>
                  </li>
                ))}
              </ul>

              {s.callout && (
                <div className="pitch-deck-print-callout">
                  <span className="pitch-deck-print-callout-label font-mono uppercase mr-2">
                    {s.callout.label}:
                  </span>
                  <span>{s.callout.text}</span>
                </div>
              )}

              {showNotes && (
                <div className="pitch-deck-print-notes">
                  <div className="pitch-deck-print-notes-title font-mono uppercase tracking-wider mb-0.5">
                    Presenter Speaker Notes — Slide {String(s.num).padStart(2, '0')}
                  </div>
                  <p>{s.speakerNotes}</p>
                </div>
              )}
            </div>

            {/* Slide Footer */}
            <div className="pitch-deck-print-footer flex items-center justify-between gap-2 font-mono">
              <span>spenta.tech · Sovereign OS · {activeTrackMeta.label}</span>
              <span>Confidential Briefing · hello@spenta.tech</span>
            </div>
          </article>
        ))}
      </div>

      {/* High-Quality PDF Export Configuration Modal */}
      {exportModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#0B1020]/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 no-print pitch-deck-nav"
          onClick={() => setExportModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Export Pitch Deck as High-Quality PDF"
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-[#1F3863] dark:bg-[#0F1529] text-white border-b border-white/10 dark:border-[#232B4A] flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#6FCB9F]">
                  WIDESCREEN 16:9 VECTOR PDF EXPORT
                </div>
                <h3 className="font-bold text-base mt-0.5">
                  Configure Investor Presentation PDF
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="p-2 rounded-lg text-[#CBD5E1] hover:text-white hover:bg-white/10 cursor-pointer"
                aria-label="Close PDF options"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Scope Selector */}
              <div>
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#5F6576] dark:text-[#8E96B0] mb-2">
                  Slide Selection
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'all', label: `Full Deck (${total})` },
                      { id: 'current', label: `Slide ${String(slide.num).padStart(2, '0')} Only` },
                      { id: 'range', label: 'Custom Range' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setExportScope(opt.id)}
                      className={`min-h-[38px] px-3 py-2 rounded-lg font-semibold border transition-colors cursor-pointer ${
                        exportScope === opt.id
                          ? 'bg-[#1C6E46]/12 dark:bg-[#6FCB9F]/15 border-[#1C6E46] dark:border-[#6FCB9F] text-[#1C6E46] dark:text-[#6FCB9F]'
                          : 'bg-[#FAF8F4] dark:bg-[#0F1529] border-[#E4DFD6] dark:border-[#232B4A] text-[#4A5568] dark:text-[#A4ADC6]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {exportScope === 'range' && (
                  <div className="mt-2.5 grid grid-cols-2 gap-3 rounded-lg bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] p-3">
                    <label className="block">
                      <span className="text-[10px] font-mono uppercase text-[#5F6576] dark:text-[#8E96B0]">
                        From Slide
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={total}
                        value={rangeStart}
                        onChange={(e) => setRangeStart(Number(e.target.value))}
                        className="mt-1 w-full px-2.5 py-1.5 rounded bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] font-mono text-xs text-[#16213A] dark:text-[#E7EBF5]"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-mono uppercase text-[#5F6576] dark:text-[#8E96B0]">
                        To Slide
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={total}
                        value={rangeEnd}
                        onChange={(e) => setRangeEnd(Number(e.target.value))}
                        className="mt-1 w-full px-2.5 py-1.5 rounded bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] font-mono text-xs text-[#16213A] dark:text-[#E7EBF5]"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* PDF Color Theme */}
              <div>
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#5F6576] dark:text-[#8E96B0] mb-2">
                  Document Color Theme
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'auto', label: 'Deck Native' },
                      { id: 'dark', label: 'Nocturnal Dark' },
                      { id: 'light', label: 'Print-Friendly Light' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPdfTheme(opt.id)}
                      className={`min-h-[38px] px-3 py-2 rounded-lg font-semibold border transition-colors cursor-pointer ${
                        pdfTheme === opt.id
                          ? 'bg-[#1C6E46]/12 dark:bg-[#6FCB9F]/15 border-[#1C6E46] dark:border-[#6FCB9F] text-[#1C6E46] dark:text-[#6FCB9F]'
                          : 'bg-[#FAF8F4] dark:bg-[#0F1529] border-[#E4DFD6] dark:border-[#232B4A] text-[#4A5568] dark:text-[#A4ADC6]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Toggles */}
              <div className="space-y-2 pt-1">
                <label className="flex items-start gap-2.5 p-3 rounded-lg bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeNotesInPdf}
                    onChange={(e) => setIncludeNotesInPdf(e.target.checked)}
                    className="mt-0.5 accent-[#1C6E46] dark:accent-[#6FCB9F] cursor-pointer"
                  />
                  <div>
                    <div className="font-semibold text-[#16213A] dark:text-[#E7EBF5]">
                      Include Presenter Speaker Notes
                    </div>
                    <div className="text-[11px] text-[#5F6576] dark:text-[#8E96B0]">
                      Renders a structured notes band at the bottom of each exported slide.
                    </div>
                  </div>
                </label>

                {exportScope !== 'current' && (
                  <label className="flex items-start gap-2.5 p-3 rounded-lg bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeStackAppendix && selectedApps.length > 0}
                      disabled={selectedApps.length === 0}
                      onChange={(e) => setIncludeStackAppendix(e.target.checked)}
                      className="mt-0.5 accent-[#1C6E46] dark:accent-[#6FCB9F] cursor-pointer"
                    />
                    <div>
                      <div className="font-semibold text-[#16213A] dark:text-[#E7EBF5]">
                        Append Live Composed Stack Appendix ({selectedApps.length} modules)
                      </div>
                      <div className="text-[11px] text-[#5F6576] dark:text-[#8E96B0]">
                        Adds a final 16:9 sheet detailing your selected modules, build scope, GM%, and recommended on-prem server tier.
                      </div>
                    </div>
                  </label>
                )}
              </div>
            </div>

            <div className="px-5 py-3.5 bg-[#FAF8F4] dark:bg-[#0F1529] border-t border-[#E4DFD6] dark:border-[#232B4A] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="min-h-[38px] px-3.5 py-2 rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] text-[#4A5568] dark:text-[#A4ADC6] text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pdfState === 'exporting'}
                onClick={() => handleExportPdf()}
                className="inline-flex items-center gap-2 min-h-[38px] px-4 py-2 rounded-lg bg-[#E11D48] hover:bg-[#BE123C] disabled:opacity-60 text-white text-xs font-bold cursor-pointer"
              >
                {pdfState === 'exporting' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
                )}
                <span>
                  {pdfState === 'exporting' ? pdfProgress || 'Generating…' : 'Generate & Download PDF'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Print Pitch Deck & Serialized Blob PDF Action Bar (positioned bottom-left to stay clear of AI Advisor) */}
      <div
        className="fixed bottom-3.5 left-3 sm:bottom-4 sm:left-4 z-40 inline-flex items-center gap-1.5 p-1 rounded-xl bg-white/95 dark:bg-[#141A32]/95 backdrop-blur-md border border-[#E4DFD6] dark:border-[#232B4A] shadow-lg no-print pitch-deck-nav"
        role="region"
        aria-label="Pitch Deck Print and PDF Download Controls"
      >
        <button
          type="button"
          onClick={handlePrintPitchDeck}
          className="inline-flex items-center gap-2 min-h-[38px] px-3 sm:px-3.5 py-2 rounded-lg bg-[#1F3863] hover:bg-[#16213A] dark:bg-[#8FA6E8] dark:hover:bg-[#A6B9F0] text-white dark:text-[#0B1020] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          aria-label="Download Pitch Deck PDF: Full 16:9 investor deck covering $500K Seed SAFE terms, L1–L6 sovereign architecture, and 5-year financials"
          title="Download or print the formatted investor Pitch Deck PDF ($500K Seed SAFE, traction proof, architecture, and 5-year financials)"
        >
          <Printer className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
          <span className="sm:hidden">Print PDF</span>
          <span className="hidden sm:inline">Download Pitch Deck PDF</span>
        </button>

        <button
          type="button"
          disabled={blobPdfState === 'exporting'}
          onClick={handleDownloadSerializedPrintDeck}
          className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-2 rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] hover:border-[#1F3863]/50 dark:hover:border-[#8FA6E8]/50 text-[#16213A] dark:text-[#E7EBF5] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
          title="Serialize .pitch-deck-print-deck content and download as PDF Blob"
        >
          {blobPdfState === 'exporting' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          ) : blobPdfState === 'done' ? (
            <Check className="w-3.5 h-3.5 text-[#1C6E46] dark:text-[#6FCB9F] shrink-0" />
          ) : (
            <Download className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
          )}
          <span className="hidden sm:inline">
            {blobPdfState === 'exporting'
              ? blobPdfProgress || 'Serializing…'
              : blobPdfState === 'done'
                ? 'Blob PDF Saved'
                : 'Download Print PDF'}
          </span>
        </button>
      </div>

      {/* Framer Motion Portal Tooltip for Slide KPIs & Quantitative Data Points */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {hoveredMetric &&
              (() => {
                const vw = window.innerWidth;
                const vh = window.innerHeight;
                const tipW = Math.min(320, vw - 24);
                const estH = 148;
                const rawLeft =
                  hoveredMetric.rect.left + hoveredMetric.rect.width / 2 - tipW / 2;
                const left = Math.max(12, Math.min(vw - tipW - 12, rawLeft));
                const showAbove = hoveredMetric.rect.bottom + estH + 16 > vh;
                const top = showAbove
                  ? Math.max(12, hoveredMetric.rect.top - estH - 10)
                  : hoveredMetric.rect.bottom + 10;
                const tooltipDark =
                  hoveredMetric.darkSurface ||
                  document.documentElement.classList.contains('dark');

                return (
                  <motion.div
                    key={`${hoveredMetric.label}-${hoveredMetric.value}`}
                    role="tooltip"
                    initial={{ opacity: 0, y: showAbove ? 6 : -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: showAbove ? 4 : -4, scale: 0.96 }}
                    transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                    style={{ left, top, width: tipW }}
                    className={`fixed z-[85] pointer-events-none no-print rounded-xl border p-3.5 backdrop-blur-md shadow-2xl ${
                      tooltipDark
                        ? 'bg-[#0F1529]/95 border-[#34416E] text-[#E7EBF5]'
                        : 'bg-[#FAF8F4]/95 border-[#CFC8BC] text-[#16213A]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-current/10">
                      <span
                        className={`font-mono text-[10px] font-semibold uppercase tracking-wider ${
                          tooltipDark ? 'text-[#6FCB9F]' : 'text-[#1C6E46]'
                        }`}
                      >
                        {hoveredMetric.category}
                      </span>
                      <span className="font-mono text-[11px] font-bold tabular-nums">
                        {hoveredMetric.value}
                      </span>
                    </div>
                    <div className="text-xs font-bold mt-2">{hoveredMetric.label}</div>
                    <p className="text-[11px] leading-relaxed opacity-85 mt-1">
                      {hoveredMetric.definition}
                    </p>
                    {hoveredMetric.benchmark && (
                      <div className="mt-2 pt-1.5 border-t border-current/10 font-mono text-[10px] opacity-75">
                        {hoveredMetric.benchmark}
                      </div>
                    )}
                  </motion.div>
                );
              })()}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
