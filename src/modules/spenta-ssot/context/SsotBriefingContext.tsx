import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { CoreLayerId, useStack } from '../../../store/StackContext';
import {
  ArPreviewTarget,
  BRIEFING_CHAPTERS,
  NINE_TIER_UNIT_ECONOMICS,
  UNIFIED_SAFE_TERMS,
  formatSsotCurrency,
} from '../../../data/unifiedSsotData';
import { buildInvestorBriefingPath } from '../../../utils/shareUrlCodec';

export type FusionViewMode = 'overview' | 'deep-dive';
export type ConfidenceLevelPct = 90 | 95 | 99;
export type InvestorPartnerMode = 'investor' | 'partner';
export type SentimentMood = 'bullish' | 'cautious' | 'neutral' | 'defensive';

export const SENTIMENT_FILTER_MAP: Record<
  SentimentMood,
  { label: string; summary: string; filterCss: string }
> = {
  bullish: {
    label: 'High Conviction',
    summary: 'Enhanced chromatic clarity across return projections and moat surfaces.',
    filterCss: 'saturate(1.22) contrast(1.04)',
  },
  cautious: {
    label: 'Analytical Baseline',
    summary: 'Calibrated institutional reference rendering with neutral telemetry contrast.',
    filterCss: 'none',
  },
  neutral: {
    label: 'Diligence Audit',
    summary: 'Softened saturation optimized for extended table and financial statement review.',
    filterCss: 'saturate(0.88) contrast(1.02)',
  },
  defensive: {
    label: 'Downside Defense',
    summary: 'Focus emphasis on downside stress tests, air-gapped security, and cash runway.',
    filterCss: 'saturate(0.92) contrast(1.03)',
  },
};

interface SentimentContextValue {
  avgSentiment: number;
  feedbackCount: number;
  highlightedChapterId: string | null;
  setHighlightedChapterId: (id: string | null) => void;
  sentimentMood: SentimentMood;
  setSentimentMood: (mood: SentimentMood) => void;
  sentimentFilterCss: string;
}

const SentimentContext = createContext<SentimentContextValue | null>(null);

export function SentimentProvider({ children }: { children: React.ReactNode }) {
  const { investorFeedback } = useStack();
  const [highlightedChapterId, setHighlightedChapterId] = useState<string | null>(null);
  const [sentimentMood, setSentimentMood] = useState<SentimentMood>('cautious');

  const avgSentiment = useMemo(() => {
    if (investorFeedback.length === 0) return 4.3;
    const sum = investorFeedback.reduce((acc, item) => acc + item.sentimentScore, 0);
    return Number((sum / investorFeedback.length).toFixed(2));
  }, [investorFeedback]);

  const sentimentFilterCss = SENTIMENT_FILTER_MAP[sentimentMood].filterCss;

  const value = useMemo<SentimentContextValue>(
    () => ({
      avgSentiment,
      feedbackCount: investorFeedback.length,
      highlightedChapterId,
      setHighlightedChapterId,
      sentimentMood,
      setSentimentMood,
      sentimentFilterCss,
    }),
    [avgSentiment, investorFeedback.length, highlightedChapterId, sentimentMood, sentimentFilterCss],
  );

  return <SentimentContext.Provider value={value}>{children}</SentimentContext.Provider>;
}

export function useSsotSentiment() {
  const ctx = useContext(SentimentContext);
  if (!ctx) throw new Error('useSsotSentiment must be used within SentimentProvider');
  return ctx;
}

interface ArPreviewContextValue {
  activeArTarget: ArPreviewTarget | null;
  launchArPreview: (target: ArPreviewTarget) => void;
  dismissArPreview: () => void;
}

const ArPreviewContext = createContext<ArPreviewContextValue | null>(null);

export function ArPreviewProvider({ children }: { children: React.ReactNode }) {
  const { arPreviewTarget, openArPreview, closeArPreview } = useStack();

  const value = useMemo<ArPreviewContextValue>(
    () => ({
      activeArTarget: arPreviewTarget,
      launchArPreview: openArPreview,
      dismissArPreview: closeArPreview,
    }),
    [arPreviewTarget, openArPreview, closeArPreview],
  );

  return <ArPreviewContext.Provider value={value}>{children}</ArPreviewContext.Provider>;
}

export function useSsotArPreview() {
  const ctx = useContext(ArPreviewContext);
  if (!ctx) throw new Error('useSsotArPreview must be used within ArPreviewProvider');
  return ctx;
}

interface SsotBriefingContextValue {
  activeSectionId: string;
  pulsedSectionId: string | null;
  highlightedSectionId: string | null;
  scrollProgressPct: number;
  scrollToSection: (sectionId: string, options?: { updateUrl?: boolean }) => void;
  investorMode: InvestorPartnerMode;
  setInvestorMode: (mode: InvestorPartnerMode) => void;
  fusionViewMode: FusionViewMode;
  setFusionViewMode: (mode: FusionViewMode) => void;
  activeLayer: CoreLayerId;
  setActiveLayer: (layer: CoreLayerId) => void;
  focusFusionLayer: (layer: CoreLayerId, openDeepDive?: boolean) => void;
  bearCaseEnabled: boolean;
  setBearCaseEnabled: (enabled: boolean) => void;
  confidenceLevelPct: ConfidenceLevelPct;
  setConfidenceLevelPct: (pct: ConfidenceLevelPct) => void;
  anomalyDrawerOpen: boolean;
  setAnomalyDrawerOpen: (open: boolean) => void;
  shareModalOpen: boolean;
  setShareModalOpen: (open: boolean) => void;
  onboardingModalOpen: boolean;
  setOnboardingModalOpen: (open: boolean) => void;
  pitchDeckModalOpen: boolean;
  setPitchDeckModalOpen: (open: boolean) => void;
  exportingOneClickSummary: boolean;
  triggerOneClickSummary: () => Promise<void>;
  sessionSid: string;
  shareUrl: string;
}

const SsotBriefingContext = createContext<SsotBriefingContextValue | null>(null);

function resolveInitialSid(urlSid?: string): string {
  if (urlSid) return urlSid;
  try {
    const existing = window.sessionStorage.getItem('spenta_ssot_sid');
    if (existing) return existing;
    const created = `sid_${Math.random().toString(36).slice(2, 8)}`;
    window.sessionStorage.setItem('spenta_ssot_sid', created);
    return created;
  } catch {
    return 'sid_ssot';
  }
}

export function SsotBriefingProvider({ children }: { children: React.ReactNode }) {
  const {
    currency,
    personaTrack,
    investorCalculatorState,
    ssotQueryState,
    setSsotQueryState,
    isInvestorBriefingRoute,
    setAutoNotice,
  } = useStack();

  const [sessionSid] = useState<string>(() => resolveInitialSid(ssotQueryState.sid));
  const [activeSectionId, setActiveSectionId] = useState<string>(
    () => ssotQueryState.section || 'ssot-hero',
  );
  const [pulsedSectionId, setPulsedSectionId] = useState<string | null>(null);
  const [highlightedSectionId, setHighlightedSectionId] = useState<string | null>(null);
  const [scrollProgressPct, setScrollProgressPct] = useState<number>(0);
  const [investorMode, setInvestorMode] = useState<InvestorPartnerMode>('investor');
  const [fusionViewMode, setFusionViewMode] = useState<FusionViewMode>(
    () => ssotQueryState.view ?? 'overview',
  );
  const [activeLayer, setActiveLayer] = useState<CoreLayerId>('L6');
  const [bearCaseEnabled, setBearCaseEnabled] = useState<boolean>(false);
  const [confidenceLevelPct, setConfidenceLevelPct] = useState<ConfidenceLevelPct>(95);
  const [anomalyDrawerOpen, setAnomalyDrawerOpen] = useState<boolean>(false);
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const [onboardingModalOpen, setOnboardingModalOpen] = useState<boolean>(false);
  const [pitchDeckModalOpen, setPitchDeckModalOpen] = useState<boolean>(false);
  const [exportingOneClickSummary, setExportingOneClickSummary] = useState<boolean>(false);

  const pulseTimerRef = useRef<number | null>(null);
  const highlightTimerRef = useRef<number | null>(null);

  const triggerHeadingPulse = useCallback((sectionId: string) => {
    setPulsedSectionId(sectionId);
    setHighlightedSectionId(sectionId);
    if (pulseTimerRef.current) {
      window.clearTimeout(pulseTimerRef.current);
    }
    if (highlightTimerRef.current) {
      window.clearTimeout(highlightTimerRef.current);
    }
    pulseTimerRef.current = window.setTimeout(() => {
      setPulsedSectionId((prev) => (prev === sectionId ? null : prev));
    }, 1500);
    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightedSectionId((prev) => (prev === sectionId ? null : prev));
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (pulseTimerRef.current) {
        window.clearTimeout(pulseTimerRef.current);
      }
      if (highlightTimerRef.current) {
        window.clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  // Track continuous page scroll percentage (0%–100%)
  useEffect(() => {
    const computeProgress = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      const totalScrollable = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const pct = Math.min(100, Math.max(0, Math.round((scrollTop / totalScrollable) * 100)));
      setScrollProgressPct(pct);
    };
    computeProgress();
    window.addEventListener('scroll', computeProgress, { passive: true });
    window.addEventListener('resize', computeProgress, { passive: true });
    return () => {
      window.removeEventListener('scroll', computeProgress);
      window.removeEventListener('resize', computeProgress);
    };
  }, []);

  const syncUrlParams = useCallback(
    (overrides?: { section?: string; view?: FusionViewMode }) => {
      if (!isInvestorBriefingRoute || typeof window === 'undefined') return;
      const nextSection = overrides?.section ?? activeSectionId;
      const nextView = overrides?.view ?? fusionViewMode;
      const nextPath = buildInvestorBriefingPath({
        section: nextSection,
        persona: personaTrack,
        scenario: investorCalculatorState.scenario,
        currency,
        view: nextView,
        sid: sessionSid,
      });
      try {
        window.history.replaceState({}, '', nextPath);
      } catch {
        // ignore history restrictions
      }
      setSsotQueryState({
        section: nextSection,
        persona: personaTrack,
        scenario: investorCalculatorState.scenario,
        currency,
        view: nextView,
        sid: sessionSid,
      });
    },
    [
      isInvestorBriefingRoute,
      activeSectionId,
      fusionViewMode,
      personaTrack,
      investorCalculatorState.scenario,
      currency,
      sessionSid,
      setSsotQueryState,
    ],
  );

  // Keep query string synchronized with active state while on /investor-briefing
  useEffect(() => {
    syncUrlParams();
  }, [syncUrlParams]);

  const scrollToSection = useCallback(
    (sectionId: string, options?: { updateUrl?: boolean }) => {
      setActiveSectionId(sectionId);
      if (options?.updateUrl !== false) {
        syncUrlParams({ section: sectionId });
      }
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.setTimeout(() => {
          triggerHeadingPulse(sectionId);
        }, 280);
      }
    },
    [syncUrlParams, triggerHeadingPulse],
  );

  const focusFusionLayer = useCallback(
    (layer: CoreLayerId, openDeepDive = true) => {
      setActiveLayer(layer);
      if (openDeepDive) {
        setFusionViewMode('deep-dive');
        syncUrlParams({ section: 'ssot-fusion-stack', view: 'deep-dive' });
      }
      scrollToSection('ssot-fusion-stack');
    },
    [scrollToSection, syncUrlParams],
  );

  // Restore initial ?section= on mount/entry
  useEffect(() => {
    if (!ssotQueryState.section || ssotQueryState.section === 'ssot-hero') return;
    const target = ssotQueryState.section;
    const timer = window.setTimeout(() => {
      scrollToSection(target, { updateUrl: false });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [ssotQueryState.section, scrollToSection]);

  // Observe visible sections to update active rail node cleanly without resetting URL path
  useEffect(() => {
    const ids = [
      'ssot-hero',
      ...BRIEFING_CHAPTERS.map((c) => c.id),
      'ssot-milestones',
      'ssot-value-exchange',
    ];
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (elements.length === 0 || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) {
          setActiveSectionId(visible[0].target.id);
        }
      },
      { rootMargin: '-20% 0px -56% 0px', threshold: [0.1, 0.35, 0.6] },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const shareUrl = useMemo(() => {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://spenta.tech';
    return `${origin}${buildInvestorBriefingPath({
      section: activeSectionId,
      persona: personaTrack,
      scenario: investorCalculatorState.scenario,
      currency,
      view: fusionViewMode,
      sid: sessionSid,
    })}`;
  }, [
    activeSectionId,
    personaTrack,
    investorCalculatorState.scenario,
    currency,
    fusionViewMode,
    sessionSid,
  ]);

  const triggerOneClickSummary = useCallback(async () => {
    if (exportingOneClickSummary) return;
    setExportingOneClickSummary(true);
    try {
      const fx = investorCalculatorState.fxRate;
      const lines = [
        'SPENTA TECHNOLOGY — INTELLIGENT REALITY | INVESTOR MASTER SSOT SUMMARY',
        '========================================================================',
        `Generated: ${new Date().toISOString()}`,
        `Audience Mode: ${investorMode.toUpperCase()} | Briefing Track: ${personaTrack.toUpperCase()} | Scenario: ${investorCalculatorState.scenario.toUpperCase()} | Currency: ${currency} (FX ${fx.toFixed(2)} BDT/USD)`,
        `Downside Sensitivity Stress: ${bearCaseEnabled ? 'ACTIVE (Bear Case)' : 'Nominal Baseline'}`,
        '',
        '1. ROUND INSTRUMENT & VALUATION',
        `- Instrument: ${UNIFIED_SAFE_TERMS.instrument}`,
        `- Target Raise: ${formatSsotCurrency(UNIFIED_SAFE_TERMS.raiseUsd, currency, fx)}`,
        `- Post-Money Cap: ${formatSsotCurrency(UNIFIED_SAFE_TERMS.postMoneyCapUsd, currency, fx)} (${UNIFIED_SAFE_TERMS.impliedOwnershipPct}% Ownership | ${UNIFIED_SAFE_TERMS.discountPct}% Discount)`,
        `- TAM: $${UNIFIED_SAFE_TERMS.tamUsdBillions}B Physical AI & Spatial XR (${UNIFIED_SAFE_TERMS.tamCagrPct}% CAGR)`,
        `- Dhaka R&D Hub Cost: $${UNIFIED_SAFE_TERMS.dhakaHourlyLoadedUsd}/hr loaded (20 FTEs)`,
        '',
        '2. 9-TIER UNIT ECONOMICS SNAPSHOT',
        ...NINE_TIER_UNIT_ECONOMICS.map(
          (t) =>
            `- ${t.code} (${t.name}): ${formatSsotCurrency(t.baselineUsd, currency, fx)} | GM ${t.grossMarginPercent.toFixed(1)}% | Net ${t.netMarginPercent.toFixed(1)}%`,
        ),
        '',
        '3. DEEP-LINK RESTORE URL',
        shareUrl,
      ];

      await new Promise((r) => window.setTimeout(r, 320));

      const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `spenta-investor-master-ssot-summary-${currency.toLowerCase()}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setAutoNotice('Exported One-Click Institutional Investor Summary');
    } finally {
      setExportingOneClickSummary(false);
    }
  }, [
    exportingOneClickSummary,
    investorCalculatorState.fxRate,
    investorCalculatorState.scenario,
    investorMode,
    personaTrack,
    currency,
    bearCaseEnabled,
    shareUrl,
    setAutoNotice,
  ]);

  const value = useMemo<SsotBriefingContextValue>(
    () => ({
      activeSectionId,
      pulsedSectionId,
      highlightedSectionId,
      scrollProgressPct,
      scrollToSection,
      investorMode,
      setInvestorMode,
      fusionViewMode,
      setFusionViewMode,
      activeLayer,
      setActiveLayer,
      focusFusionLayer,
      bearCaseEnabled,
      setBearCaseEnabled,
      confidenceLevelPct,
      setConfidenceLevelPct,
      anomalyDrawerOpen,
      setAnomalyDrawerOpen,
      shareModalOpen,
      setShareModalOpen,
      onboardingModalOpen,
      setOnboardingModalOpen,
      pitchDeckModalOpen,
      setPitchDeckModalOpen,
      exportingOneClickSummary,
      triggerOneClickSummary,
      sessionSid,
      shareUrl,
    }),
    [
      activeSectionId,
      pulsedSectionId,
      highlightedSectionId,
      scrollProgressPct,
      scrollToSection,
      investorMode,
      fusionViewMode,
      activeLayer,
      focusFusionLayer,
      bearCaseEnabled,
      confidenceLevelPct,
      anomalyDrawerOpen,
      shareModalOpen,
      onboardingModalOpen,
      pitchDeckModalOpen,
      exportingOneClickSummary,
      triggerOneClickSummary,
      sessionSid,
      shareUrl,
    ],
  );

  return (
    <SentimentProvider>
      <ArPreviewProvider>
        <SsotBriefingContext.Provider value={value}>{children}</SsotBriefingContext.Provider>
      </ArPreviewProvider>
    </SentimentProvider>
  );
}

export function useSsotBriefing() {
  const ctx = useContext(SsotBriefingContext);
  if (!ctx) throw new Error('useSsotBriefing must be used within SsotBriefingProvider');
  return ctx;
}
