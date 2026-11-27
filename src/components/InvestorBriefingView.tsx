import React, { Suspense, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  ArrowUpRight,
  Box,
  Check,
  Copy,
  FolderLock,
  Layers,
  MessageSquarePlus,
  Presentation,
  Send,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import {
  BRIEFING_CHAPTERS,
  COMPETITIVE_MOAT_ROWS,
  EXECUTIVE_TEAM,
  FUSION_LAYER_TECH_SPECS,
  INVESTOR_PERSONA_TRACKS,
  MACRO_HARDWARE_CATALYSTS,
  NINE_TIER_UNIT_ECONOMICS,
  PASSIVE_IP_STREAMS,
  RD_ROADMAP_PHASES,
  SSOT_CASE_STUDIES,
  STARTUP_BENCHMARKS,
  UNIFIED_SAFE_TERMS,
  formatSsotCurrency,
} from '../data/unifiedSsotData';
import { CoreLayerId, useStack } from '../store/StackContext';
import { copyTextWithFallback } from '../utils/shareUrlCodec';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import { getPanelPreloadHandlers, getTabPreloadHandlers } from '../utils/viewPreloaders';
import { VoiceNavigatorButton } from './briefing/VoiceNavigatorButton';

const DualShoreGlobe = lazyWithRetry(() =>
  import('./briefing/DualShoreGlobe').then((m) => ({ default: m.DualShoreGlobe })),
);

const LAYER_KEYS: CoreLayerId[] = ['L6', 'L5', 'L4', 'L3', 'L2', 'L1'];

export function InvestorBriefingView() {
  const {
    theme,
    currency,
    setCurrency,
    personaTrack,
    setPersonaTrack,
    investorCalculatorState,
    investorFeedback,
    pendingNavFocus,
    clearPendingNavFocus,
    navigateToItem,
    setDataRoomOpen,
    openContactModal,
    openIntelligenceModal,
    openArPreview,
    loadCaseStudyStack,
  } = useStack();

  const [activeLayer, setActiveLayer] = useState<CoreLayerId>('L6');
  const [tierCategory, setTierCategory] = useState<'All' | 'A' | 'B' | 'C'>('All');
  const [selectedTierId, setSelectedTierId] = useState<string>(NINE_TIER_UNIT_ECONOMICS[6].id);
  const [copiedLayerCode, setCopiedLayerCode] = useState<boolean>(false);

  const fxRate = investorCalculatorState.fxRate;
  const isDark = theme === 'dark';

  const scrollToChapter = (chapterId: string) => {
    const el = document.getElementById(chapterId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    if (pendingNavFocus?.type === 'briefing-section' && pendingNavFocus.id) {
      const targetId = pendingNavFocus.id;
      clearPendingNavFocus();
      window.setTimeout(() => scrollToChapter(targetId), 80);
    }
  }, [pendingNavFocus, clearPendingNavFocus]);

  const activePersonaSpec =
    INVESTOR_PERSONA_TRACKS.find((t) => t.id === personaTrack) ?? INVESTOR_PERSONA_TRACKS[0];

  const filteredTiers = useMemo(() => {
    if (tierCategory === 'All') return NINE_TIER_UNIT_ECONOMICS;
    return NINE_TIER_UNIT_ECONOMICS.filter((t) => t.category === tierCategory);
  }, [tierCategory]);

  const selectedTier =
    filteredTiers.find((t) => t.id === selectedTierId) ??
    filteredTiers[0] ??
    NINE_TIER_UNIT_ECONOMICS[0];

  const tierWaterfallData = useMemo(() => {
    const cb = selectedTier.costBreakdownUsd;
    const netUsd = Math.round(selectedTier.baselineUsd * (selectedTier.netMarginPercent / 100));
    return [
      { label: 'Eng Labor', usd: cb.engineeringLabor, fill: isDark ? '#8FA6E8' : '#1F3863' },
      { label: '3D / Spatial', usd: cb.spatialDesignLabor, fill: isDark ? '#60A5FA' : '#2563EB' },
      { label: 'Compute', usd: cb.cloudCompute, fill: isDark ? '#94A3B8' : '#64748B' },
      { label: 'Sales CAC', usd: cb.salesCac, fill: isDark ? '#F59E0B' : '#B45309' },
      { label: 'Overhead', usd: cb.overheadReserve, fill: isDark ? '#64748B' : '#94A3B8' },
      { label: 'Net Margin', usd: netUsd, fill: isDark ? '#6FCB9F' : '#1C6E46' },
    ];
  }, [selectedTier, isDark]);

  const activeFusionSpec = FUSION_LAYER_TECH_SPECS[activeLayer];

  const handleCopySnippet = async () => {
    await copyTextWithFallback(activeFusionSpec.codeSample.code);
    setCopiedLayerCode(true);
    window.setTimeout(() => setCopiedLayerCode(false), 2000);
  };

  const countNotesForChapter = (chapterTitle: string, shortTitle: string) =>
    investorFeedback.filter(
      (f) => f.section === chapterTitle || f.section.includes(shortTitle),
    ).length;

  const renderChapterHeader = (
    chapter: (typeof BRIEFING_CHAPTERS)[number],
    subtitle: string,
    extraAction?: React.ReactNode,
  ) => {
    const noteCount = countNotesForChapter(chapter.title, chapter.shortTitle);
    const isRecommended = chapter.recommendedFor.includes(personaTrack);
    return (
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 pb-4 border-b border-[#E4DFD6] dark:border-[#232B4A]">
        <div className="space-y-1">
          <div className="text-xs font-mono text-[#5F6576] dark:text-[#8E96B0]">
            <span>Chapter {chapter.num}</span>
            {isRecommended && (
              <>
                <span aria-hidden="true"> · </span>
                <span className="text-[#1C6E46] dark:text-[#6FCB9F] font-semibold">
                  Priority for {activePersonaSpec.label}
                </span>
              </>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#16213A] dark:text-[#E7EBF5] tracking-tight text-balance">
            {chapter.title}
          </h2>
          <p className="text-sm text-[#5F6576] dark:text-[#8E96B0] max-w-3xl">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {extraAction}
          <button
            type="button"
            {...getPanelPreloadHandlers('investor-intelligence')}
            onClick={() => openIntelligenceModal(chapter.title)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] hover:border-[#1F3863] dark:hover:border-[#8FA6E8] text-xs font-medium text-[#16213A] dark:text-[#E7EBF5] transition-colors cursor-pointer whitespace-nowrap"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            <span>{noteCount > 0 ? `Notes (${noteCount})` : 'Add Note'}</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-10 pb-8">
      {/* Executive Briefing Hero & Workspace Toolbar */}
      <section className="rounded-2xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] p-5 sm:p-7 space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6">
          <div className="space-y-2.5 max-w-3xl">
            <div className="text-xs font-mono text-[#5F6576] dark:text-[#8E96B0]">
              Spenta Intelligent Reality &amp; Sovereign OS · Master SSOT Investor Briefing ·{' '}
              {UNIFIED_SAFE_TERMS.instrument}
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#16213A] dark:text-[#E7EBF5] tracking-tight leading-tight text-balance">
              Engineering Sovereign Physical AI &amp; Spatial Computing at Dual-Shore Unit Economics
            </h1>
            <p className="text-sm sm:text-base text-[#5F6576] dark:text-[#8E96B0] leading-relaxed">
              One unified portal linking executive due diligence directly to Spenta’s live 5-Year ROI model, 13-app Sovereign OS Vault, and configurable L1–L6 air-gapped infrastructure.
            </p>
          </div>

          {/* Focal Primary & Secondary Briefing Actions */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              {...getPanelPreloadHandlers('data-room')}
              onClick={() => setDataRoomOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              <FolderLock className="w-3.5 h-3.5" />
              <span>Open Data Room</span>
            </button>

            <button
              type="button"
              {...getPanelPreloadHandlers('investor-intelligence')}
              onClick={() => openIntelligenceModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-[#1F3863] hover:bg-[#162848] dark:bg-[#8FA6E8] dark:hover:bg-[#A6B9F0] text-white dark:text-[#0B1020] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Intelligence (D3)</span>
            </button>

            <button
              type="button"
              {...getPanelPreloadHandlers('spatial-ar')}
              onClick={() =>
                openArPreview({
                  sectionId: 'hero',
                  title: 'Spenta Physical AI Spatial Eyewear',
                  subtitle: 'Layer 1–2 Wearable RGB & Edge Inference Showcase',
                  preset: 'xr-glasses',
                })
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] hover:border-[#1F3863] dark:hover:border-[#8FA6E8] text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D Spatial Preview</span>
            </button>

            <VoiceNavigatorButton onJumpToChapter={scrollToChapter} />
          </div>
        </div>

        {/* Unified Workspace Controls: Currency Toggle + Persona Track */}
        <div className="pt-4 border-t border-[#E4DFD6] dark:border-[#232B4A] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-[#5F6576] dark:text-[#8E96B0]">
              Investor Track:
            </span>
            <div
              role="group"
              aria-label="Investor persona track"
              className="inline-flex rounded-lg bg-[#F2EFE9] dark:bg-[#0F1529] p-1 border border-[#E4DFD6] dark:border-[#232B4A]"
            >
              {INVESTOR_PERSONA_TRACKS.map((track) => {
                const active = personaTrack === track.id;
                return (
                  <button
                    key={track.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setPersonaTrack(track.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-white dark:bg-[#141A32] text-[#16213A] dark:text-[#E7EBF5] shadow-xs'
                        : 'text-[#5F6576] dark:text-[#8E96B0] hover:text-[#16213A] dark:hover:text-[#E7EBF5]'
                    }`}
                  >
                    {track.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => scrollToChapter(activePersonaSpec.primaryChapterId)}
              className="text-xs font-semibold text-[#1C6E46] dark:text-[#6FCB9F] hover:underline cursor-pointer whitespace-nowrap"
            >
              {activePersonaSpec.primaryCtaLabel} →
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="text-xs font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0]">
              Synced FX: 1 USD = {fxRate.toFixed(2)} BDT
            </div>
            <div
              role="group"
              aria-label="Global display currency"
              className="inline-flex rounded-lg bg-[#F2EFE9] dark:bg-[#0F1529] p-1 border border-[#E4DFD6] dark:border-[#232B4A]"
            >
              {(['USD', 'BDT'] as const).map((cur) => (
                <button
                  key={cur}
                  type="button"
                  aria-pressed={currency === cur}
                  onClick={() => setCurrency(cur)}
                  className={`px-3 py-1 rounded-md text-xs font-mono font-semibold transition-colors cursor-pointer ${
                    currency === cur
                      ? 'bg-[#1F3863] text-white dark:bg-[#8FA6E8] dark:text-[#0B1020]'
                      : 'text-[#5F6576] dark:text-[#8E96B0]'
                  }`}
                >
                  {cur}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column SSOT Headline KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div className="p-4 rounded-xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A]">
            <div className="text-xs text-[#5F6576] dark:text-[#8E96B0]">Seed SAFE Target</div>
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#16213A] dark:text-[#E7EBF5] mt-1">
              {formatSsotCurrency(UNIFIED_SAFE_TERMS.raiseUsd, currency, fxRate, { compact: true })}
            </div>
            <div className="text-[11px] font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0] mt-0.5">
              {formatSsotCurrency(UNIFIED_SAFE_TERMS.postMoneyCapUsd, currency, fxRate, {
                compact: true,
              })}{' '}
              Cap · {UNIFIED_SAFE_TERMS.discountPct}% Disc.
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A]">
            <div className="text-xs text-[#5F6576] dark:text-[#8E96B0]">Physical AI &amp; XR TAM</div>
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#16213A] dark:text-[#E7EBF5] mt-1">
              ${UNIFIED_SAFE_TERMS.tamUsdBillions}B
            </div>
            <div className="text-[11px] font-mono tabular-nums text-[#1C6E46] dark:text-[#6FCB9F] mt-0.5">
              {UNIFIED_SAFE_TERMS.tamCagrPct}% CAGR through 2033
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A]">
            <div className="text-xs text-[#5F6576] dark:text-[#8E96B0]">Verified Flagship ROI</div>
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#1C6E46] dark:text-[#6FCB9F] mt-1">
              450%
            </div>
            <div className="text-[11px] text-[#5F6576] dark:text-[#8E96B0] mt-0.5">
              Prime Bank 3-Yr On-Prem PrimeOCR
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A]">
            <div className="text-xs text-[#5F6576] dark:text-[#8E96B0]">Dual-Shore Delivery Cost</div>
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#16213A] dark:text-[#E7EBF5] mt-1">
              ${UNIFIED_SAFE_TERMS.dhakaHourlyLoadedUsd}/hr
            </div>
            <div className="text-[11px] text-[#5F6576] dark:text-[#8E96B0] mt-0.5">
              20-FTE Dhaka Hub · 85%+ arbitrage
            </div>
          </div>
        </div>
      </section>

      {/* Sticky Editorial Chapter Jump Bar */}
      <nav
        aria-label="Investor Briefing chapters"
        className="sticky top-14 z-20 -mx-1 px-2 py-2 bg-[#FAF8F4]/95 dark:bg-[#0B1020]/95 border-y border-[#E4DFD6] dark:border-[#232B4A] flex items-center gap-1.5 overflow-x-auto no-scrollbar"
      >
        {BRIEFING_CHAPTERS.map((ch) => {
          const prioritized = ch.recommendedFor.includes(personaTrack);
          return (
            <button
              key={ch.id}
              type="button"
              onClick={() => scrollToChapter(ch.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                prioritized
                  ? 'bg-white dark:bg-[#141A32] border border-[#1F3863]/35 dark:border-[#8FA6E8]/40 text-[#16213A] dark:text-[#E7EBF5]'
                  : 'text-[#5F6576] dark:text-[#8E96B0] hover:text-[#16213A] dark:hover:text-[#E7EBF5]'
              }`}
            >
              <span className="font-mono text-[11px] mr-1 opacity-70">{ch.num}</span>
              {ch.shortTitle}
            </button>
          );
        })}
      </nav>

      {/* 01. Dual-Engine Commercialization & Value Exchange */}
      <section id="ssot-dual-engine" className="scroll-mt-28 space-y-5">
        {renderChapterHeader(
          BRIEFING_CHAPTERS[0],
          'Two synergistic commercial engines convert low-friction spatial pilots into recurring air-gapped enterprise operating systems.',
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] space-y-4">
            <div className="text-xs font-mono text-[#1F3863] dark:text-[#8FA6E8] font-semibold">
              Engine 01 · Land &amp; Expand Entry Wedge
            </div>
            <h3 className="text-lg font-bold text-[#16213A] dark:text-[#E7EBF5]">
              The Experience Engine (Spatial XR &amp; Digital Twins)
            </h3>
            <p className="text-sm text-[#5F6576] dark:text-[#8E96B0] leading-relaxed">
              Attracts enterprise buyers rapidly through zero-install WebAR commerce (ISHO), interactive UE5 hospital twins (Apollo), and procedural cleanroom VR certifications (Samsung Biologics).
            </p>
            <div className="pt-2 border-t border-[#E4DFD6] dark:border-[#232B4A] flex items-center justify-between text-xs font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0]">
              <span>Entry Ticket: {formatSsotCurrency(1200, currency, fxRate)} – {formatSsotCurrency(45000, currency, fxRate)}</span>
              <span className="text-[#1C6E46] dark:text-[#6FCB9F] font-semibold">Up to 76.3% GM</span>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] space-y-4">
            <div className="text-xs font-mono text-[#1C6E46] dark:text-[#6FCB9F] font-semibold">
              Engine 02 · High-Retention Sovereign Expansion
            </div>
            <h3 className="text-lg font-bold text-[#16213A] dark:text-[#E7EBF5]">
              The Operations Engine (PrimeOCR, Voice ERP &amp; 8 AI Agents)
            </h3>
            <p className="text-sm text-[#5F6576] dark:text-[#8E96B0] leading-relaxed">
              Locks in multi-year recurring revenue by deploying air-gapped document intelligence, Bengali/English WhatsApp Voice ERP, and 0.88 HITL-governed reasoning workflows on private infrastructure.
            </p>
            <div className="pt-2 border-t border-[#E4DFD6] dark:border-[#232B4A] flex items-center justify-between text-xs font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0]">
              <span>Enterprise Enclave: {formatSsotCurrency(40000, currency, fxRate)} – {formatSsotCurrency(100000, currency, fxRate)}+</span>
              <span className="text-[#1C6E46] dark:text-[#6FCB9F] font-semibold">450% Verified ROI</span>
            </div>
          </div>
        </div>
      </section>

      {/* 02. 6-Layer Sovereign Fusion Architecture & API Contracts */}
      <section id="ssot-fusion-stack" className="scroll-mt-28 space-y-5">
        {renderChapterHeader(
          BRIEFING_CHAPTERS[1],
          'Vertically integrated L1–L6 pipeline with live REST, gRPC, WebSocket, and MQTT contracts synced directly to Spenta Core.',
          <button
            type="button"
            {...getTabPreloadHandlers('Spenta Core')}
            onClick={() =>
              navigateToItem('Spenta Core', { type: 'layer', id: activeLayer })
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1F3863] hover:bg-[#162848] dark:bg-[#8FA6E8] dark:hover:bg-[#A6B9F0] text-white dark:text-[#0B1020] text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Configure {activeLayer} in Spenta Core</span>
          </button>,
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Layer Selector Rail */}
          <div className="lg:col-span-4 space-y-2">
            {LAYER_KEYS.map((layerKey) => {
              const spec = FUSION_LAYER_TECH_SPECS[layerKey];
              const selected = activeLayer === layerKey;
              return (
                <button
                  key={layerKey}
                  type="button"
                  onClick={() => setActiveLayer(layerKey)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-colors cursor-pointer ${
                    selected
                      ? 'bg-[#1F3863] text-white border-[#1F3863] dark:bg-[#8FA6E8] dark:text-[#0B1020] dark:border-[#8FA6E8]'
                      : 'bg-white dark:bg-[#141A32] border-[#E4DFD6] dark:border-[#232B4A] hover:border-[#1F3863]/50 dark:hover:border-[#8FA6E8]/50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold">{spec.layerId}</span>
                    <span className="opacity-80">{spec.specs.latency}</span>
                  </div>
                  <div className="text-sm font-semibold mt-1">{spec.title}</div>
                </button>
              );
            })}
          </div>

          {/* Active Layer Contract Details */}
          <div className="lg:col-span-8 p-5 rounded-2xl bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] space-y-5">
            <div className="space-y-1.5">
              <div className="text-xs font-mono text-[#5F6576] dark:text-[#8E96B0]">
                {activeFusionSpec.layerId} · {activeFusionSpec.specs.protocol} · SLA{' '}
                {activeFusionSpec.specs.uptimeSla}
              </div>
              <h3 className="text-lg font-bold text-[#16213A] dark:text-[#E7EBF5]">
                {activeFusionSpec.title}
              </h3>
              <p className="text-sm text-[#5F6576] dark:text-[#8E96B0]">
                {activeFusionSpec.subtitle}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A]">
                <div className="text-[#5F6576] dark:text-[#8E96B0]">Latency</div>
                <div className="font-mono font-semibold text-[#16213A] dark:text-[#E7EBF5] mt-0.5">
                  {activeFusionSpec.specs.latency}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A]">
                <div className="text-[#5F6576] dark:text-[#8E96B0]">Throughput</div>
                <div className="font-mono font-semibold text-[#16213A] dark:text-[#E7EBF5] mt-0.5">
                  {activeFusionSpec.specs.throughput}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A]">
                <div className="text-[#5F6576] dark:text-[#8E96B0]">Encryption</div>
                <div className="font-mono font-semibold text-[#16213A] dark:text-[#E7EBF5] mt-0.5">
                  {activeFusionSpec.specs.encryption}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A]">
                <div className="text-[#5F6576] dark:text-[#8E96B0]">Uptime SLA</div>
                <div className="font-mono font-semibold text-[#1C6E46] dark:text-[#6FCB9F] mt-0.5">
                  {activeFusionSpec.specs.uptimeSla}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5]">
                Interface Endpoints &amp; Contracts
              </div>
              {activeFusionSpec.endpoints.map((ep) => (
                <div
                  key={ep.path}
                  className="p-3 rounded-lg bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] space-y-1"
                >
                  <div className="text-xs font-mono text-[#1F3863] dark:text-[#8FA6E8] font-semibold">
                    {ep.method} {ep.path}
                  </div>
                  <p className="text-xs text-[#5F6576] dark:text-[#8E96B0]">{ep.description}</p>
                  <pre className="text-[11px] font-mono text-[#16213A] dark:text-[#C8D0E4] overflow-x-auto pt-1">
                    {ep.samplePayload}
                  </pre>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5]">
                  {activeFusionSpec.codeSample.title} ({activeFusionSpec.codeSample.language})
                </span>
                <button
                  type="button"
                  onClick={() => void handleCopySnippet()}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#1F3863] dark:text-[#8FA6E8] hover:underline cursor-pointer"
                >
                  {copiedLayerCode ? <Check className="w-3.5 h-3.5 text-[#1C6E46]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLayerCode ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>
              <pre className="p-3.5 rounded-xl bg-[#0B1020] text-[#E7EBF5] text-xs font-mono overflow-x-auto leading-relaxed">
                {activeFusionSpec.codeSample.code}
              </pre>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E4DFD6] dark:border-[#232B4A] text-xs text-[#5F6576] dark:text-[#8E96B0]">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#1C6E46] dark:text-[#6FCB9F]" />
                <span>Compliance: {activeFusionSpec.complianceMapping.join(' · ')}</span>
              </div>
              <span className="font-mono text-[11px]">
                Stack: {activeFusionSpec.techStack.slice(0, 3).join(' · ')}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 03. R&D Technology Roadmap & Execution Sprints */}
      <section id="ssot-roadmap" className="scroll-mt-28 space-y-5">
        {renderChapterHeader(
          BRIEFING_CHAPTERS[2],
          'Disciplined productization milestones moving from proven on-premise deployments to scalable SDK & spatial hardware recurring revenue.',
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {RD_ROADMAP_PHASES.map((phase) => (
            <div
              key={phase.quarter}
              className="p-5 rounded-2xl bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-[#1F3863] dark:text-[#8FA6E8]">{phase.quarter}</span>
                  <span
                    className={
                      phase.status === 'Completed'
                        ? 'text-[#1C6E46] dark:text-[#6FCB9F] font-semibold'
                        : 'text-[#5F6576] dark:text-[#8E96B0]'
                    }
                  >
                    {phase.status}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-[#5F6576] dark:text-[#8E96B0]">{phase.horizon}</div>
                  <h3 className="text-base font-bold text-[#16213A] dark:text-[#E7EBF5] mt-0.5">
                    {phase.title}
                  </h3>
                </div>
                <ul className="space-y-1.5 text-xs text-[#5F6576] dark:text-[#8E96B0]">
                  {phase.deliverables.map((d) => (
                    <li key={d} className="leading-relaxed">
                      · {d}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-3 border-t border-[#E4DFD6] dark:border-[#232B4A] text-xs font-mono text-[#1C6E46] dark:text-[#6FCB9F] font-semibold">
                Target: {phase.targetKpi}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 04. Verified Enterprise Case Studies */}
      <section id="ssot-case-studies" className="scroll-mt-28 space-y-5">
        {renderChapterHeader(
          BRIEFING_CHAPTERS[3],
          'Production client deployments across banking, biopharma, retail, healthcare, and education—each one-click loadable into the Stack Composer.',
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {SSOT_CASE_STUDIES.map((cs) => (
            <article
              key={cs.id}
              className="p-5 rounded-2xl bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="text-xs font-mono text-[#5F6576] dark:text-[#8E96B0]">
                  <span className="font-semibold text-[#1F3863] dark:text-[#8FA6E8]">{cs.client}</span>
                  <span aria-hidden="true"> · </span>
                  <span>{cs.industry}</span>
                  <span aria-hidden="true"> · </span>
                  <span>{cs.engine}</span>
                </div>

                <h3 className="text-base font-bold text-[#16213A] dark:text-[#E7EBF5] leading-snug">
                  {cs.headline}
                </h3>

                <p className="text-xs text-[#5F6576] dark:text-[#8E96B0] leading-relaxed">
                  {cs.solution}
                </p>

                <div className="grid grid-cols-3 gap-2.5 pt-1">
                  {cs.metrics.map((m) => (
                    <div
                      key={m.label}
                      className="p-2.5 rounded-lg bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A]"
                    >
                      <div className="text-base font-bold font-mono tabular-nums text-[#1C6E46] dark:text-[#6FCB9F]">
                        {m.value}
                      </div>
                      <div className="text-[11px] font-semibold text-[#16213A] dark:text-[#E7EBF5]">
                        {m.label}
                      </div>
                      <div className="text-[10px] text-[#5F6576] dark:text-[#8E96B0] leading-tight mt-0.5">
                        {m.detail}
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-xs italic text-[#5F6576] dark:text-[#8E96B0] pt-1">
                  “{cs.quote}”
                </p>
              </div>

              <div className="pt-3 border-t border-[#E4DFD6] dark:border-[#232B4A] flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-[#5F6576] dark:text-[#8E96B0]">
                  {cs.techStack.join(' · ')}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    {...getPanelPreloadHandlers('spatial-ar')}
                    onClick={() =>
                      openArPreview({
                        sectionId: cs.id,
                        title: `${cs.client} — Spatial Twin Preview`,
                        subtitle: cs.headline,
                        preset: cs.arPreset,
                      })
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] text-xs font-medium text-[#16213A] dark:text-[#E7EBF5] hover:border-[#1F3863] cursor-pointer whitespace-nowrap"
                  >
                    <Box className="w-3.5 h-3.5" />
                    <span>3D View</span>
                  </button>
                  <button
                    type="button"
                    {...getPanelPreloadHandlers('stack-composer')}
                    onClick={() => loadCaseStudyStack(cs.stackAppIds, cs.client)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1F3863] hover:bg-[#162848] dark:bg-[#8FA6E8] dark:hover:bg-[#A6B9F0] text-white dark:text-[#0B1020] text-xs font-semibold cursor-pointer whitespace-nowrap"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Load Stack</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 05. Recalibrated 9-Tier Unit Economics */}
      <section id="ssot-unit-economics" className="scroll-mt-28 space-y-5">
        {renderChapterHeader(
          BRIEFING_CHAPTERS[4],
          'Granular COGS, Gross Margin, CAC, Overhead, and Net Margin discipline across 9 standardized commercial tiers—synced live with your active FX rate.',
          <button
            type="button"
            {...getTabPreloadHandlers('Financials')}
            onClick={() => navigateToItem('Financials')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1C6E46] hover:bg-[#145334] dark:bg-[#6FCB9F] dark:hover:bg-[#8ADBB4] text-white dark:text-[#0B1020] text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            <span>Model in 5-Year ROI Calculator</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>,
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg bg-[#F2EFE9] dark:bg-[#0F1529] p-1 border border-[#E4DFD6] dark:border-[#232B4A]">
            {(
              [
                { id: 'All', label: 'All 9 Tiers' },
                { id: 'A', label: 'Cat A · Pilots ($0.5K–$5K)' },
                { id: 'B', label: 'Cat B · Mid-Market ($5K–$30K)' },
                { id: 'C', label: 'Cat C · Enterprise ($40K–$100K+)' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTierCategory(opt.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  tierCategory === opt.id
                    ? 'bg-white dark:bg-[#141A32] text-[#16213A] dark:text-[#E7EBF5] shadow-xs'
                    : 'text-[#5F6576] dark:text-[#8E96B0]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <span className="text-xs font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0]">
            Displaying in {currency} (1 USD = {fxRate.toFixed(2)} BDT)
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Tier Table */}
          <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF8F4] dark:bg-[#0F1529] border-b border-[#E4DFD6] dark:border-[#232B4A] text-[#5F6576] dark:text-[#8E96B0]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Tier</th>
                    <th className="px-4 py-3 font-semibold text-right">Baseline</th>
                    <th className="px-4 py-3 font-semibold text-right">Gross Margin</th>
                    <th className="px-4 py-3 font-semibold text-right">Net Margin</th>
                    <th className="px-4 py-3 font-semibold text-right">Timeline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4DFD6] dark:divide-[#232B4A]">
                  {filteredTiers.map((tier) => {
                    const active = tier.id === selectedTier.id;
                    return (
                      <tr
                        key={tier.id}
                        onClick={() => setSelectedTierId(tier.id)}
                        className={`cursor-pointer transition-colors ${
                          active
                            ? 'bg-[#1F3863]/8 dark:bg-[#8FA6E8]/12'
                            : 'hover:bg-[#FAF8F4] dark:hover:bg-[#0F1529]'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-mono font-semibold text-[#1F3863] dark:text-[#8FA6E8]">
                            {tier.code}
                          </div>
                          <div className="text-[#16213A] dark:text-[#E7EBF5] font-medium">
                            {tier.name}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-[#16213A] dark:text-[#E7EBF5]">
                          {formatSsotCurrency(tier.baselineUsd, currency, fxRate, { compact: true })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-[#16213A] dark:text-[#E7EBF5]">
                          {tier.grossMarginPercent.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-[#1C6E46] dark:text-[#6FCB9F]">
                          {tier.netMarginPercent.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-right text-[#5F6576] dark:text-[#8E96B0] whitespace-nowrap">
                          {tier.deliveryTimeline}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Selected Tier Waterfall Chart */}
          <div className="lg:col-span-5 p-5 rounded-2xl bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] flex flex-col justify-between gap-4">
            <div className="space-y-1.5">
              <div className="text-xs font-mono text-[#5F6576] dark:text-[#8E96B0]">
                {selectedTier.code} · {selectedTier.categoryLabel}
              </div>
              <h3 className="text-base font-bold text-[#16213A] dark:text-[#E7EBF5]">
                {selectedTier.name} — Cost &amp; Net Margin Waterfall
              </h3>
              <p className="text-xs text-[#5F6576] dark:text-[#8E96B0]">{selectedTier.scopeSummary}</p>
            </div>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tierWaterfallData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? '#232B4A' : '#E4DFD6'}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: isDark ? '#8E96B0' : '#5F6576' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: isDark ? '#8E96B0' : '#5F6576' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) =>
                      formatSsotCurrency(v, currency, fxRate, { compact: true })
                    }
                  />
                  <Tooltip
                    formatter={(val) => [
                      formatSsotCurrency(Number(val ?? 0), currency, fxRate),
                      'Allocation',
                    ]}
                    contentStyle={{
                      backgroundColor: isDark ? '#141A32' : '#FFFFFF',
                      borderColor: isDark ? '#232B4A' : '#E4DFD6',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="usd" radius={[6, 6, 0, 0]}>
                    {tierWaterfallData.map((entry) => (
                      <Cell key={entry.label} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="pt-3 border-t border-[#E4DFD6] dark:border-[#232B4A] flex flex-wrap items-center justify-between gap-2">
              <div className="text-[11px] font-mono text-[#5F6576] dark:text-[#8E96B0]">
                Squad: {selectedTier.teamAllocation.join(' · ')}
              </div>
              <button
                type="button"
                onClick={() => loadCaseStudyStack(selectedTier.recommendedAppIds, selectedTier.code)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1F3863] hover:bg-[#162848] dark:bg-[#8FA6E8] dark:hover:bg-[#A6B9F0] text-white dark:text-[#0B1020] text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Load Tier Stack</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 06. Dual-Shore 3D Delivery Globe */}
      <section id="ssot-dual-shore" className="scroll-mt-28 space-y-5">
        {renderChapterHeader(
          BRIEFING_CHAPTERS[5],
          'Global onshore client sponsorship in San Jose and Sydney/Melbourne fused with our 20-FTE Dhaka Sovereign AI & 3D Studio Hub.',
        )}

        <Suspense
          fallback={
            <div className="h-[420px] rounded-2xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] animate-pulse" />
          }
        >
          <DualShoreGlobe />
        </Suspense>
      </section>

      {/* 07. Macro Hardware Catalyst & Competitive Moat */}
      <section id="ssot-moat" className="scroll-mt-28 space-y-5">
        {renderChapterHeader(
          BRIEFING_CHAPTERS[6],
          'Big Tech hardware mass production creates the sensory ingest wave; Spenta owns the air-gapped enterprise software & dual-shore cost moat.',
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {MACRO_HARDWARE_CATALYSTS.map((cat) => (
            <div
              key={cat.id}
              className="p-4 rounded-xl bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] space-y-2"
            >
              <div className="text-xs font-mono text-[#1F3863] dark:text-[#8FA6E8] font-semibold">
                {cat.vendor}
              </div>
              <h3 className="text-sm font-bold text-[#16213A] dark:text-[#E7EBF5]">{cat.headline}</h3>
              <div className="text-xs font-mono tabular-nums text-[#1C6E46] dark:text-[#6FCB9F] font-semibold">
                {cat.metric}
              </div>
              <p className="text-xs text-[#5F6576] dark:text-[#8E96B0] leading-relaxed">
                {cat.spentaAdvantage}
              </p>
            </div>
          ))}
        </div>

        {/* Competitive Moat Matrix */}
        <div className="rounded-2xl bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F4] dark:bg-[#0F1529] border-b border-[#E4DFD6] dark:border-[#232B4A] text-[#5F6576] dark:text-[#8E96B0]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Capability Dimension</th>
                  <th className="px-4 py-3 font-semibold text-[#1C6E46] dark:text-[#6FCB9F]">
                    Spenta Sovereign Fusion
                  </th>
                  <th className="px-4 py-3 font-semibold">Western Agencies</th>
                  <th className="px-4 py-3 font-semibold">Commodity Outsourcers</th>
                  <th className="px-4 py-3 font-semibold">Rigid SaaS Vendors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4DFD6] dark:divide-[#232B4A]">
                {COMPETITIVE_MOAT_ROWS.map((row) => (
                  <tr key={row.attribute}>
                    <td className="px-4 py-3 font-semibold text-[#16213A] dark:text-[#E7EBF5]">
                      {row.attribute}
                    </td>
                    <td className="px-4 py-3 font-medium text-[#1C6E46] dark:text-[#6FCB9F]">
                      {row.spenta}
                    </td>
                    <td className="px-4 py-3 text-[#5F6576] dark:text-[#8E96B0]">
                      {row.westernAgencies}
                    </td>
                    <td className="px-4 py-3 text-[#5F6576] dark:text-[#8E96B0]">
                      {row.commodityOutsourcers}
                    </td>
                    <td className="px-4 py-3 text-[#5F6576] dark:text-[#8E96B0]">
                      {row.rigidSaas}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Global Peer Benchmarks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {STARTUP_BENCHMARKS.map((bm) => (
            <div
              key={bm.name}
              className="p-3.5 rounded-xl bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] space-y-1"
            >
              <div className="text-xs font-mono font-bold text-[#16213A] dark:text-[#E7EBF5]">
                {bm.name}
              </div>
              <div className="text-[11px] font-medium text-[#1F3863] dark:text-[#8FA6E8]">
                {bm.category} · {bm.valuationOrScale}
              </div>
              <p className="text-[11px] text-[#5F6576] dark:text-[#8E96B0] leading-relaxed">
                {bm.spentaParallel}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 08. Executive Leadership & Passive IP Streams */}
      <section id="ssot-team-ip" className="scroll-mt-28 space-y-6">
        {renderChapterHeader(
          BRIEFING_CHAPTERS[7],
          'Dual-shore leadership spanning Silicon Valley, Sydney, and Dhaka paired with 5 high-margin non-client passive IP & asset royalty streams.',
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {EXECUTIVE_TEAM.map((member) => (
            <div
              key={member.id}
              className="p-5 rounded-2xl bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1F3863] dark:bg-[#8FA6E8] text-white dark:text-[#0B1020] font-mono text-sm font-bold flex items-center justify-center shrink-0">
                  {member.initials}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[#16213A] dark:text-[#E7EBF5] truncate">
                    {member.name}
                  </h3>
                  <div className="text-[11px] text-[#5F6576] dark:text-[#8E96B0] truncate">
                    {member.location}
                  </div>
                </div>
              </div>
              <div className="text-xs font-semibold text-[#1F3863] dark:text-[#8FA6E8]">
                {member.role}
              </div>
              <p className="text-xs text-[#5F6576] dark:text-[#8E96B0] leading-relaxed">
                {member.bio}
              </p>
              <div className="text-[11px] font-mono text-[#5F6576] dark:text-[#8E96B0] pt-1 border-t border-[#E4DFD6] dark:border-[#232B4A]">
                {member.focusAreas.join(' · ')}
              </div>
            </div>
          ))}
        </div>

        {/* Passive IP Streams */}
        <div className="rounded-2xl bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-[#16213A] dark:text-[#E7EBF5]">
                Non-Client Passive IP &amp; Creator Commerce Streams
              </h3>
              <p className="text-xs text-[#5F6576] dark:text-[#8E96B0]">
                High-margin digital asset royalties, LMS micro-SaaS, and OEM hardware referrals compounding alongside enterprise builds.
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-[#1C6E46] dark:text-[#6FCB9F] font-semibold">
              84%–95% Gross Margin Band
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {PASSIVE_IP_STREAMS.map((stream) => (
              <div
                key={stream.id}
                className="p-4 rounded-xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] space-y-2"
              >
                <div className="text-xs font-mono text-[#5F6576] dark:text-[#8E96B0]">
                  {stream.platform}
                </div>
                <div className="text-sm font-bold text-[#16213A] dark:text-[#E7EBF5]">
                  {stream.title}
                </div>
                <div className="text-xs font-mono tabular-nums font-semibold text-[#1C6E46] dark:text-[#6FCB9F]">
                  {formatSsotCurrency(stream.minMonthlyUsd, currency, fxRate, { compact: true })} –{' '}
                  {formatSsotCurrency(stream.maxMonthlyUsd, currency, fxRate, { compact: true })} / mo · GM{' '}
                  {stream.grossMargin}
                </div>
                <p className="text-xs text-[#5F6576] dark:text-[#8E96B0] leading-relaxed">
                  {stream.mechanics}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 09. Seed Round SAFE Terms & Capital Allocation */}
      <section id="ssot-safe-terms" className="scroll-mt-28 space-y-5">
        {renderChapterHeader(
          BRIEFING_CHAPTERS[8],
          'Standard YC Post-Money SAFE structured for 18 months of disciplined runway, SDK productization, and APAC/US enterprise expansion.',
          <button
            type="button"
            {...getPanelPreloadHandlers('spatial-ar')}
            onClick={() =>
              openArPreview({
                sectionId: 'ssot-safe-terms',
                title: 'Seed SAFE 5-Year Value Trajectory (3D)',
                subtitle: '$500K Raise @ $4.5M Post-Money Cap · 20% Discount',
                preset: 'financial-waterfall',
              })
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] text-xs font-medium text-[#16213A] dark:text-[#E7EBF5] cursor-pointer whitespace-nowrap"
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D Trajectory</span>
          </button>,
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Donut Chart */}
          <div className="lg:col-span-5 p-5 rounded-2xl bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] flex flex-col justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-mono text-[#5F6576] dark:text-[#8E96B0]">
                Capital Deployment Breakdown
              </div>
              <h3 className="text-lg font-bold text-[#16213A] dark:text-[#E7EBF5] font-mono tabular-nums">
                {formatSsotCurrency(UNIFIED_SAFE_TERMS.raiseUsd, currency, fxRate)} Seed Allocation
              </h3>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={UNIFIED_SAFE_TERMS.allocations}
                    dataKey="amountUsd"
                    nameKey="title"
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={3}
                  >
                    {UNIFIED_SAFE_TERMS.allocations.map((entry) => (
                      <Cell key={entry.id} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => formatSsotCurrency(Number(val ?? 0), currency, fxRate)}
                    contentStyle={{
                      backgroundColor: isDark ? '#141A32' : '#FFFFFF',
                      borderColor: isDark ? '#232B4A' : '#E4DFD6',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-[#E4DFD6] dark:border-[#232B4A] text-xs font-mono tabular-nums">
              <div>
                <div className="font-bold text-[#16213A] dark:text-[#E7EBF5]">
                  {formatSsotCurrency(UNIFIED_SAFE_TERMS.postMoneyCapUsd, currency, fxRate, {
                    compact: true,
                  })}
                </div>
                <div className="text-[10px] text-[#5F6576] dark:text-[#8E96B0]">Post-Money Cap</div>
              </div>
              <div>
                <div className="font-bold text-[#1C6E46] dark:text-[#6FCB9F]">
                  {UNIFIED_SAFE_TERMS.discountPct}%
                </div>
                <div className="text-[10px] text-[#5F6576] dark:text-[#8E96B0]">SAFE Discount</div>
              </div>
              <div>
                <div className="font-bold text-[#16213A] dark:text-[#E7EBF5]">
                  {UNIFIED_SAFE_TERMS.targetRunwayMonths} Mo
                </div>
                <div className="text-[10px] text-[#5F6576] dark:text-[#8E96B0]">Target Runway</div>
              </div>
            </div>
          </div>

          {/* Allocation Tranches & Action Footer */}
          <div className="lg:col-span-7 flex flex-col justify-between gap-4">
            <div className="space-y-3">
              {UNIFIED_SAFE_TERMS.allocations.map((tranche) => (
                <div
                  key={tranche.id}
                  className="p-4 rounded-xl bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] space-y-1.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-[#16213A] dark:text-[#E7EBF5]">
                      {tranche.title}
                    </h4>
                    <span className="text-xs font-mono tabular-nums font-bold text-[#1F3863] dark:text-[#8FA6E8]">
                      {tranche.percent}% · {formatSsotCurrency(tranche.amountUsd, currency, fxRate)}
                    </span>
                  </div>
                  <p className="text-xs text-[#5F6576] dark:text-[#8E96B0] leading-relaxed">
                    {tranche.description}
                  </p>
                  <div className="text-[11px] font-mono text-[#1C6E46] dark:text-[#6FCB9F]">
                    Milestone: {tranche.milestone}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  {...getPanelPreloadHandlers('data-room')}
                  onClick={() => setDataRoomOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5] cursor-pointer whitespace-nowrap"
                >
                  <FolderLock className="w-3.5 h-3.5" />
                  <span>Inspect Data Room</span>
                </button>
                <button
                  type="button"
                  {...getTabPreloadHandlers('Pitch Deck')}
                  onClick={() => navigateToItem('Pitch Deck')}
                  aria-label="Open Pitch Deck: 12-to-18 slide investor presentation covering the $500K Seed SAFE round, market traction, L1–L6 sovereign AI architecture, and 5-year P&L projections"
                  title="Open interactive investor Pitch Deck ($500K Seed SAFE, traction metrics, L1–L6 architecture, and 5-year P&L with PDF export)"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5] cursor-pointer whitespace-nowrap"
                >
                  <Presentation className="w-3.5 h-3.5" />
                  <span>Open 12-Slide Deck</span>
                </button>
              </div>

              <button
                type="button"
                {...getPanelPreloadHandlers('founder-contact')}
                onClick={() => openContactModal('Seed SAFE Term Sheet ($500K @ $4.5M Cap)')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Request Term Sheet</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
