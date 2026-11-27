import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  Check,
  Compass,
  Map as MapIcon,
  Minimize2,
  Search,
  Sparkles,
  ThumbsUp,
  HelpCircle,
  FileSpreadsheet,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  BRIEFING_CHAPTERS,
  INVESTOR_PERSONA_TRACKS,
  UNIFIED_SAFE_TERMS,
  formatSsotCurrency,
} from '../../../data/unifiedSsotData';
import { useStack } from '../../../store/StackContext';
import { INSTITUTIONAL_EASE } from './SectionReveal';
import { useSsotBriefing } from '../context/SsotBriefingContext';

interface TickerItem {
  id: string;
  headline: string;
  tag: string;
  metric: string;
  detail: string;
  sectionId: string;
}

const TICKER_ITEMS: TickerItem[] = [
  {
    id: 'prime-ocr',
    tag: 'VERIFIED ROI',
    headline: 'Prime Bank Air-Gapped PrimeOCR KYC Verification',
    metric: '450% 3-Yr ROI · <30s SLA',
    detail:
      'Self-hosted LLaMA 3.2 Vision + LayoutLMv3 pipeline executing inside Prime Bank private datacenter with zero public cloud egress and 0.88 HITL escalation gating.',
    sectionId: 'ssot-case-studies',
  },
  {
    id: 'samsung-vr',
    tag: 'CLEANROOM TWIN',
    headline: 'Samsung Biologics Procedural VR Operator Certification',
    metric: '-96% Protocol Errors',
    detail:
      'Deterministic Unreal Engine 5 biopharma cleanroom physics digital twin training operators before floor entry, eliminating cleanroom production downtime.',
    sectionId: 'ssot-case-studies',
  },
  {
    id: 'dhaka-arbitrage',
    tag: 'DELIVERY MOAT',
    headline: 'Dual-Shore San Jose & Sydney <-> Dhaka Engineering Hub',
    metric: '$12.98/hr Loaded R&D',
    detail:
      '20-FTE Dhaka Sovereign AI and UE5 3D Studio paired with onshore San Jose and Sydney enterprise client directors yields 85%+ cost arbitrage over Western agencies.',
    sectionId: 'ssot-dual-shore',
  },
  {
    id: 'tam-wave',
    tag: 'MACRO CATALYST',
    headline: 'Global Physical AI & Spatial Computing Addressable Market',
    metric: '$667.3B TAM · 41.1% CAGR',
    detail:
      'Driven by Meta Ray-Ban 7M+ smart glasses shipments, Android XR standardization, Apple visionOS spatial twins, and affordable local NVIDIA L40S/H100 inference.',
    sectionId: 'ssot-moat',
  },
  {
    id: 'seed-safe',
    tag: 'SEED SAFE',
    headline: 'Spenta Seed Financing Instrument Open for Institutional Diligence',
    metric: '$500K @ $4.5M Post-Money Cap',
    detail:
      'YC Post-Money SAFE with 20% discount and 11.11% initial ownership allocated across SDK productization (40%), APAC/US enterprise BD (35%), and GPU clusters (25%).',
    sectionId: 'ssot-safe-terms',
  },
];

export function ScrollProgressBar() {
  const { scrollProgressPct } = useSsotBriefing();
  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 h-[2.5px] z-[70] pointer-events-none ssot-no-print bg-transparent"
    >
      <div
        style={{ width: `${scrollProgressPct}%` }}
        className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-teal-300 transition-[width] duration-75 ease-out shadow-[0_0_8px_rgba(34,211,238,0.55)]"
      />
    </div>
  );
}

export function StickyBreadcrumbBar() {
  const { currency, personaTrack, investorCalculatorState, exitInvestorBriefing } = useStack();
  const { activeSectionId, bearCaseEnabled, scrollProgressPct, setOnboardingModalOpen } =
    useSsotBriefing();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 80);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const chapter = useMemo(() => {
    if (activeSectionId === 'ssot-hero') return { num: '00', shortTitle: 'Executive Hero' };
    if (activeSectionId === 'ssot-milestones') return { num: '04B', shortTitle: 'Execution Sprints' };
    if (activeSectionId === 'ssot-value-exchange') return { num: '01B', shortTitle: 'Value Exchange' };
    return (
      BRIEFING_CHAPTERS.find((c) => c.id === activeSectionId) ?? {
        num: '00',
        shortTitle: 'Overview',
      }
    );
  }, [activeSectionId]);

  const personaLabel =
    INVESTOR_PERSONA_TRACKS.find((t) => t.id === personaTrack)?.label ?? personaTrack;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          id="ssot-breadcrumb-nav"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2, ease: INSTITUTIONAL_EASE }}
          className="fixed top-14 left-0 right-0 z-30 bg-white/92 dark:bg-[#070A10]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 ssot-no-print"
        >
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-9 flex items-center justify-between gap-3 text-[11px] font-mono">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => exitInvestorBriefing()}
                className="text-cyan-700 dark:text-cyan-400 hover:underline cursor-pointer whitespace-nowrap"
              >
                Spentech Portal
              </button>
              <span className="text-slate-400 dark:text-slate-600">/</span>
              <span className="text-slate-600 dark:text-slate-400 whitespace-nowrap hidden sm:inline">
                Investor Master SSOT
              </span>
              <span className="text-slate-400 dark:text-slate-600 hidden sm:inline">/</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {chapter.num}. {chapter.shortTitle}
              </span>
            </div>

            <div className="flex items-center gap-3 shrink-0 text-slate-600 dark:text-slate-400">
              <span className="hidden md:inline whitespace-nowrap">
                {personaLabel} · {currency} · {investorCalculatorState.scenario.toUpperCase()}
              </span>
              {bearCaseEnabled && (
                <span className="text-amber-600 dark:text-amber-400 font-semibold whitespace-nowrap">
                  Bear Stress
                </span>
              )}
              <span className="tabular-nums font-bold text-cyan-700 dark:text-cyan-400">
                {scrollProgressPct}%
              </span>
              <button
                type="button"
                onClick={() => setOnboardingModalOpen(true)}
                className="inline-flex items-center gap-1 text-slate-800 dark:text-slate-200 hover:text-cyan-600 dark:hover:text-cyan-400 cursor-pointer whitespace-nowrap"
              >
                <Compass className="w-3 h-3" />
                <span className="hidden sm:inline">Tour</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function InvestorNewsTicker() {
  const { scrollToSection } = useSsotBriefing();
  const [selectedItem, setSelectedItem] = useState<TickerItem | null>(null);

  return (
    <>
      <div
        id="investor-news-ticker"
        className="w-full bg-slate-100 dark:bg-[#06090F] border-y border-slate-200 dark:border-slate-800/80 overflow-hidden py-2 ssot-no-print"
      >
        <div className="spenta-brand-slider-mask">
          <div className="spenta-brand-slider-track flex items-center gap-8 px-4">
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, idx) => (
              <button
                key={`${item.id}-${idx}`}
                type="button"
                onClick={() => setSelectedItem(item)}
                className="inline-flex items-center gap-2.5 text-xs font-mono whitespace-nowrap shrink-0 cursor-pointer group"
              >
                <span className="text-[10px] font-bold text-cyan-700 dark:text-cyan-400">
                  {item.tag}
                </span>
                <span className="text-slate-700 dark:text-slate-300 group-hover:text-slate-950 dark:group-hover:text-white transition-colors">
                  {item.headline}
                </span>
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold tabular-nums">
                  {item.metric}
                </span>
                <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                  |
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {selectedItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ssot-ticker-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs ssot-no-print"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700 p-5 space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-mono font-bold text-cyan-700 dark:text-cyan-400">
                  {selectedItem.tag} · {selectedItem.metric}
                </div>
                <h3
                  id="ssot-ticker-modal-title"
                  className="text-base font-bold text-slate-900 dark:text-white mt-0.5"
                >
                  {selectedItem.headline}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="Close ticker notice"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {selectedItem.detail}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  const target = selectedItem.sectionId;
                  setSelectedItem(null);
                  scrollToSection(target);
                }}
                className="px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold cursor-pointer"
              >
                Jump to Supporting Chapter →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function SectionMap() {
  const { personaTrack } = useStack();
  const { activeSectionId, scrollToSection } = useSsotBriefing();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [onlyRecommended, setOnlyRecommended] = useState(false);
  const [zoom, setZoom] = useState(1);

  const filteredChapters = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BRIEFING_CHAPTERS.filter((ch) => {
      if (onlyRecommended && !ch.recommendedFor.includes(personaTrack)) return false;
      if (!q) return true;
      return ch.title.toLowerCase().includes(q) || ch.shortTitle.toLowerCase().includes(q);
    });
  }, [query, onlyRecommended, personaTrack]);

  return (
    <div className="ssot-no-print fixed bottom-20 right-4 xl:left-4 xl:right-auto xl:top-1/2 xl:-translate-y-1/2 xl:bottom-auto z-[35]">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open Briefing Dependency Map"
          title="Open SSOT Section Dependency Mini-Map"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/92 dark:bg-slate-950/92 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-lg backdrop-blur-xl text-xs font-mono font-semibold hover:border-cyan-500 cursor-pointer transition-colors"
        >
          <MapIcon className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span className="hidden sm:inline">Map</span>
        </button>
      ) : (
        <div
          style={{ transform: `scale(${zoom})`, transformOrigin: 'bottom right' }}
          className="w-72 rounded-2xl bg-white/95 dark:bg-slate-950/95 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop-blur-xl p-3 space-y-2.5 text-xs"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              SSOT Navigation Map
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.85, Number((z - 0.1).toFixed(2))))}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="Zoom out map"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(1.25, Number((z + 0.1).toFixed(2))))}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="Zoom in map"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="Collapse navigation map"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter chapters..."
              className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <label className="flex items-center gap-2 text-[11px] font-mono text-slate-600 dark:text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyRecommended}
              onChange={(e) => setOnlyRecommended(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-700"
            />
            <span>Highlight {personaTrack} track</span>
          </label>

          <div className="max-h-56 overflow-y-auto space-y-1 pr-0.5">
            {filteredChapters.map((ch) => {
              const active = activeSectionId === ch.id;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => scrollToSection(ch.id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg font-mono text-[11px] transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                    active
                      ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-semibold border border-cyan-500/40'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  <span className="truncate">
                    {ch.num}. {ch.shortTitle}
                  </span>
                  {ch.recommendedFor.includes(personaTrack) && (
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 shrink-0">
                      REC
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function CornerHudIndicators() {
  const { personaTrack, currency } = useStack();
  const { bearCaseEnabled, setAnomalyDrawerOpen, scrollToSection } = useSsotBriefing();
  const [dismissedToast, setDismissedToast] = useState(false);

  const trackLabel =
    INVESTOR_PERSONA_TRACKS.find((t) => t.id === personaTrack)?.label ?? personaTrack;

  return (
    <div className="ssot-no-print">
      {!dismissedToast && bearCaseEnabled && (
        <div className="fixed bottom-16 left-4 z-[34] max-w-[calc(100vw-2rem)] sm:max-w-xs rounded-xl bg-white/95 dark:bg-slate-950/95 border border-amber-500/45 shadow-lg px-3 py-2 flex items-center justify-between gap-2 text-[11px] font-mono backdrop-blur-md">
          <button
            type="button"
            onClick={() => {
              scrollToSection('ssot-unit-economics');
              setAnomalyDrawerOpen(true);
            }}
            className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-semibold cursor-pointer text-left"
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Bear Stress Sensitivity Active (+20% CAC)</span>
          </button>
          <button
            type="button"
            onClick={() => setDismissedToast(true)}
            aria-label="Dismiss sensitivity alert"
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="fixed bottom-4 left-4 z-[34] max-w-[calc(100vw-6rem)] sm:max-w-xs rounded-xl bg-white/92 dark:bg-slate-950/92 border border-slate-200 dark:border-slate-800 shadow-lg px-3 py-2 flex items-center gap-2 text-[11px] font-mono text-slate-700 dark:text-slate-300 backdrop-blur-md">
        <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span className="truncate">
          {trackLabel} · {currency} · SAFE ${UNIFIED_SAFE_TERMS.raiseUsd / 1000}K
        </span>
      </div>
    </div>
  );
}

const FEEDBACK_TOPICS = [
  'Unit Economics & 9-Tier Waterfall',
  'L1–L6 Fusion API & Security',
  'Seed SAFE Terms ($500K @ $4.5M)',
  'Enterprise Case Studies & ROI',
];

export function FooterFeedbackWidget() {
  const { addInvestorFeedback } = useStack();
  const [topic, setTopic] = useState(FEEDBACK_TOPICS[0]);
  const [submittedSignal, setSubmittedSignal] = useState<string | null>(null);

  const handleSignal = (signalLabel: string, sentimentScore: number) => {
    void addInvestorFeedback({
      section: topic,
      priority:
        sentimentScore >= 5
          ? 'General Feedback'
          : sentimentScore >= 4
            ? 'Strategic Suggestion'
            : 'Critical Inquiry',
      sentimentScore,
      text: `${signalLabel} signal logged on ${topic} (${formatSsotCurrency(UNIFIED_SAFE_TERMS.raiseUsd, 'USD')} Seed SAFE).`,
    });
    setSubmittedSignal(signalLabel);
    window.setTimeout(() => setSubmittedSignal(null), 3000);
  };

  return (
    <div
      id="ssot-feedback-widget"
      className="p-4 rounded-2xl bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800/80 space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-mono font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>Diligence Signal &amp; Reviewer Feedback</span>
        </div>
        {submittedSignal && (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-700 dark:text-emerald-400">
            <Check className="w-3.5 h-3.5" />
            <span>Logged: {submittedSignal}</span>
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
        <label htmlFor="ssot-feedback-topic" className="sr-only">
          Select diligence topic
        </label>
        <select
          id="ssot-feedback-topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-900 dark:text-slate-100"
        >
          {FEEDBACK_TOPICS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => void handleSignal('High Conviction', 5)}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>High Conviction</span>
          </button>
          <button
            type="button"
            onClick={() => void handleSignal('Request Data', 4)}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-cyan-500 text-slate-800 dark:text-slate-200 text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Request Data</span>
          </button>
          <button
            type="button"
            onClick={() => void handleSignal('Questions', 3)}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 text-slate-800 dark:text-slate-200 text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            <HelpCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Questions</span>
          </button>
        </div>
      </div>
    </div>
  );
}
