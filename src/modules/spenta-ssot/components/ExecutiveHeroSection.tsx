import React, { useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  Box,
  Compass,
  Download,
  FolderLock,
  Layers,
  Loader2,
  Presentation,
  Share2,
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { useStack, CoreLayerId } from '../../../store/StackContext';
import { SpentaLogo } from '../../../components/SpentaLogo';
import {
  FUSION_LAYER_TECH_SPECS,
  INVESTOR_PERSONA_TRACKS,
  UNIFIED_SAFE_TERMS,
  formatSsotCurrency,
} from '../../../data/unifiedSsotData';
import { useSsotBriefing } from '../context/SsotBriefingContext';
import { Spatial3DCanvas } from './Spatial3DCanvas';
import { VoiceNavigatorButton } from '../../../components/briefing/VoiceNavigatorButton';

const LAYER_ORDER: CoreLayerId[] = ['L6', 'L5', 'L4', 'L3', 'L2', 'L1'];

type DomainFilterId = 'all' | 'delivery' | 'ai-spatial' | 'edge';

const LAYER_DOMAIN_MAP: Record<CoreLayerId, Exclude<DomainFilterId, 'all'>> = {
  L6: 'delivery',
  L5: 'delivery',
  L4: 'ai-spatial',
  L3: 'ai-spatial',
  L2: 'edge',
  L1: 'edge',
};

const DILIGENCE_DISPATCH_CARDS = [
  {
    id: 'ssot-dual-engine',
    code: '01 · THESIS',
    title: 'Dual-Engine Commercialization',
    metric: 'Up to 76.3% GM',
    accentCls: 'text-emerald-700 dark:text-emerald-400',
    detail: 'Spatial XR & Twin wedge converting into recurring air-gapped AI & Voice ERP enclaves.',
  },
  {
    id: 'ssot-fusion-stack',
    code: '02 · ARCHITECTURE',
    title: '6-Layer Sovereign Fusion',
    metric: '<50ms Edge · 0.88 HITL',
    accentCls: 'text-cyan-700 dark:text-cyan-400',
    detail: 'Inspect L1–L6 REST/gRPC/MQTT contracts, SDK samples, and OPA governance gates.',
  },
  {
    id: 'ssot-case-studies',
    code: '04 · PROOF',
    title: 'Verified Enterprise Deployments',
    metric: '450% Prime Bank ROI',
    accentCls: 'text-purple-700 dark:text-purple-400',
    detail: 'Live deployments at Prime Bank, Samsung Biologics, LABAID, Apollo, ISHO, and Jotax Oy.',
  },
  {
    id: 'ssot-unit-economics',
    code: '05 · FINANCIALS',
    title: '9-Tier Unit Economics & Monte Carlo',
    metric: '6.38x Op. Efficiency',
    accentCls: 'text-sky-700 dark:text-sky-400',
    detail: 'Waterfall COGS, Bear-Case stress test, D3 Monte Carlo CI histogram, and sensitivity matrix.',
  },
  {
    id: 'ssot-dual-shore',
    code: '06 · DELIVERY MOAT',
    title: 'Dual-Shore 3D Delivery Hub',
    metric: '$12.98/hr Dhaka Hub',
    accentCls: 'text-amber-700 dark:text-amber-400',
    detail: 'San Jose & Sydney client sponsorship fused with 20-FTE Dhaka Sovereign AI enclave.',
  },
  {
    id: 'ssot-safe-terms',
    code: '09 · CAPITAL ROUND',
    title: 'Seed Round SAFE Terms',
    metric: '$500K @ $4.5M Cap',
    accentCls: 'text-teal-700 dark:text-teal-400',
    detail: '11.11% initial ownership, 20% discount, 18-month runway targeting $60K platform MRR.',
  },
];

export function ExecutiveHeroSection() {
  const { theme } = useTheme();
  const {
    currency,
    setCurrency,
    personaTrack,
    setPersonaTrack,
    investorCalculatorState,
    setDataRoomOpen,
    openIntelligenceModal,
    openArPreview,
  } = useStack();
  const {
    activeLayer,
    setActiveLayer,
    focusFusionLayer,
    scrollToSection,
    investorMode,
    setInvestorMode,
    exportingOneClickSummary,
    triggerOneClickSummary,
    setShareModalOpen,
    setOnboardingModalOpen,
    setPitchDeckModalOpen,
    pulsedSectionId,
    highlightedSectionId,
  } = useSsotBriefing();

  const [flashedTileId, setFlashedTileId] = useState<string | null>(null);
  const [domainFilter, setDomainFilter] = useState<DomainFilterId>('all');

  const fxRate = investorCalculatorState.fxRate;
  const activePersonaSpec =
    INVESTOR_PERSONA_TRACKS.find((t) => t.id === personaTrack) ?? INVESTOR_PERSONA_TRACKS[0];

  const filteredLayers = useMemo(() => {
    if (domainFilter === 'all') return LAYER_ORDER;
    return LAYER_ORDER.filter((l) => LAYER_DOMAIN_MAP[l] === domainFilter);
  }, [domainFilter]);

  const handleDispatchJump = (id: string) => {
    setFlashedTileId(id);
    window.setTimeout(() => {
      setFlashedTileId((prev) => (prev === id ? null : prev));
    }, 1200);
    scrollToSection(id);
  };

  const isHighlighted = highlightedSectionId === 'ssot-hero';

  return (
    <section
      id="ssot-hero"
      className={`scroll-mt-20 relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#05070B] bg-grid-pattern bg-radial-cyan p-5 sm:p-8 space-y-6 transition-shadow ${
        pulsedSectionId === 'ssot-hero' ? 'animate-section-header-pulse' : ''
      } ${
        isHighlighted
          ? 'ring-2 ring-cyan-500 dark:ring-cyan-400 ring-offset-4 ring-offset-slate-50 dark:ring-offset-[#05070B]'
          : ''
      }`}
    >
      {/* Ambient Radial Blur Orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[700px] h-[380px] rounded-full bg-gradient-to-r from-cyan-500/12 via-indigo-500/12 to-purple-500/10 blur-[130px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-12 -right-12 w-72 h-72 rounded-full bg-emerald-500/10 blur-[100px]"
      />

      {/* Top Hero Grid: Executive Copy + Three.js Spatial3DCanvas */}
      <div className="relative z-10 grid grid-cols-1 xl:grid-cols-12 gap-6 items-center">
        <div className="xl:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <SpentaLogo
                size="md"
                showTagline
                tagline="INTELLIGENT REALITY"
                tone={theme === 'dark' ? 'dark-bg' : 'light-bg'}
              />
              <span className="hidden sm:inline-block h-6 w-px bg-slate-200 dark:bg-slate-800" aria-hidden="true" />
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-mono text-slate-600 dark:text-slate-400">
                <span>INVESTOR MASTER SSOT</span>
                <span aria-hidden="true">·</span>
                <span>{UNIFIED_SAFE_TERMS.instrument}</span>
              </div>
            </div>

            {/* Investor vs Partner Audience Mode Switcher */}
            <div
              role="group"
              aria-label="Audience thesis framing"
              className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-900/90 p-0.5 border border-slate-200 dark:border-slate-800"
            >
              {(
                [
                  { id: 'investor', label: 'Investor Thesis' },
                  { id: 'partner', label: 'Enterprise Partner' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={investorMode === m.id}
                  onClick={() => setInvestorMode(m.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    investorMode === m.id
                      ? 'bg-white dark:bg-slate-950 text-cyan-700 dark:text-cyan-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <h1 className="font-display-ssot text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.1] text-balance">
            {investorMode === 'investor' ? (
              <>
                Engineering{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-sky-500 to-indigo-600 dark:from-cyan-400 dark:via-sky-300 dark:to-indigo-400">
                  Sovereign Physical AI
                </span>{' '}
                &amp; Spatial Computing at Dual-Shore Economics
              </>
            ) : (
              <>
                Deploying{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-cyan-600 to-indigo-600 dark:from-emerald-400 dark:via-cyan-300 dark:to-indigo-400">
                  Air-Gapped AI Enclaves
                </span>{' '}
                &amp; Spatial Digital Twins for Regulated Enterprises
              </>
            )}
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
            {investorMode === 'investor'
              ? 'Institutional diligence workspace unifying verified client ROI, 9-tier unit economics, Monte Carlo return distributions, and on-premise L1–L6 architecture contracts.'
              : 'Co-build and license production PrimeOCR document intelligence, bilingual Voice ERP, and Unreal Engine 5 cleanroom/hospital twins with zero cloud data egress.'}
          </p>

          {/* Animated Proof Value Highlight Line */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            <span className="animate-value-pulse inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold tabular-nums">
              450% Prime Bank ROI
            </span>
            <span className="animate-value-pulse inline-flex items-center px-2.5 py-1 rounded-md bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-300 font-bold tabular-nums">
              38%–76.3% Profit Margins
            </span>
            <span className="text-slate-500 dark:text-slate-400 tabular-nums">
              $12.98/hr Dhaka Engineering Hub
            </span>
          </div>

          {/* Primary Action Row */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              id="hero-one-click-summary-btn"
              type="button"
              disabled={exportingOneClickSummary}
              onClick={() => void triggerOneClickSummary()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 text-xs font-mono font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {exportingOneClickSummary ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{exportingOneClickSummary ? 'Exporting Summary…' : 'One-Click Summary'}</span>
            </button>

            <button
              type="button"
              onClick={() => setDataRoomOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <FolderLock className="w-3.5 h-3.5" />
              <span>Data Room</span>
            </button>

            <button
              type="button"
              onClick={() =>
                openArPreview({
                  sectionId: 'ssot-hero',
                  title: 'Fusion Core L1–L6 Enclave',
                  subtitle: 'Air-Gapped Hardware & Spatial Layer Stack',
                  preset: 'server-enclave',
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 hover:border-cyan-500 text-xs font-semibold text-slate-900 dark:text-slate-100 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Box className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>3D Enclave View</span>
            </button>

            <button
              type="button"
              onClick={() => openIntelligenceModal()}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 hover:border-emerald-500 text-xs font-semibold text-slate-900 dark:text-slate-100 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Intelligence (D3)</span>
            </button>

            <button
              type="button"
              onClick={() => setPitchDeckModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 hover:border-indigo-500 text-xs font-semibold text-slate-900 dark:text-slate-100 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Presentation className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Pitch Deck</span>
            </button>

            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 hover:border-slate-400 text-xs font-semibold text-slate-900 dark:text-slate-100 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Briefing</span>
            </button>

            <button
              type="button"
              onClick={() => setOnboardingModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 hover:border-slate-400 text-xs font-semibold text-slate-900 dark:text-slate-100 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Guided Tour</span>
            </button>

            <VoiceNavigatorButton onJumpToChapter={(id) => scrollToSection(id)} />
          </div>

          {/* Persona Track + Currency Toolbar */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Investor Track:
              </span>
              <div
                role="group"
                aria-label="Investor persona track"
                className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800"
              >
                {INVESTOR_PERSONA_TRACKS.map((track) => {
                  const active = personaTrack === track.id;
                  return (
                    <button
                      key={track.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setPersonaTrack(track.id)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {track.label}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => scrollToSection(activePersonaSpec.primaryChapterId)}
                className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer whitespace-nowrap"
              >
                {activePersonaSpec.primaryCtaLabel} →
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                1 USD = {fxRate.toFixed(2)} BDT
              </span>
              <div
                role="group"
                aria-label="Hero currency switcher"
                className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-900 p-0.5 border border-slate-200 dark:border-slate-800"
              >
                {(['USD', 'BDT'] as const).map((cur) => (
                  <button
                    key={cur}
                    type="button"
                    aria-pressed={currency === cur}
                    onClick={() => setCurrency(cur)}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-semibold cursor-pointer ${
                      currency === cur
                        ? 'bg-cyan-600 text-white dark:bg-cyan-500 dark:text-slate-950'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {cur}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Spatial3DCanvas (Interactive Three.js L1-L6 Sovereign Enclave) */}
        <div className="xl:col-span-5 space-y-3">
          <Spatial3DCanvas
            activeLayer={activeLayer}
            onSelectLayer={(layer) => {
              setActiveLayer(layer);
            }}
          />

          {/* 6-Layer Telemetry Mini Strip (L6–L1) */}
          <div className="grid grid-cols-6 gap-1.5">
            {LAYER_ORDER.map((layerId, idx) => {
              const active = activeLayer === layerId;
              const widthPct = 95 - idx * 7;
              return (
                <button
                  key={layerId}
                  type="button"
                  onClick={() => setActiveLayer(layerId)}
                  className={`p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                    active
                      ? 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-500 text-cyan-800 dark:text-cyan-300'
                      : 'bg-slate-50 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-cyan-500/40'
                  }`}
                >
                  <div className="text-[10px] font-mono font-bold tabular-nums">{layerId}</div>
                  <div className="mt-1 h-1 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      style={{ width: `${widthPct}%` }}
                      className={`h-full rounded-full ${
                        active ? 'bg-cyan-500' : 'bg-emerald-500/75'
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4 Headline HUD-Corner KPI Figures */}
      <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="hud-corner p-4 rounded-xl high-density-box hover:border-cyan-500/45 transition-colors">
          <div className="text-xs text-slate-500 dark:text-slate-400">Seed SAFE Target</div>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
            {formatSsotCurrency(UNIFIED_SAFE_TERMS.raiseUsd, currency, fxRate, { compact: true })}
          </div>
          <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 mt-0.5">
            {formatSsotCurrency(UNIFIED_SAFE_TERMS.postMoneyCapUsd, currency, fxRate, {
              compact: true,
            })}{' '}
            Cap · {UNIFIED_SAFE_TERMS.discountPct}% Disc.
          </div>
        </div>

        <div className="hud-corner p-4 rounded-xl high-density-box hover:border-emerald-500/45 transition-colors">
          <div className="text-xs text-slate-500 dark:text-slate-400">Physical AI &amp; XR TAM</div>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
            ${UNIFIED_SAFE_TERMS.tamUsdBillions}B
          </div>
          <div className="text-[11px] font-mono tabular-nums text-emerald-700 dark:text-emerald-400 mt-0.5">
            {UNIFIED_SAFE_TERMS.tamCagrPct}% CAGR through 2033
          </div>
        </div>

        <div className="hud-corner p-4 rounded-xl high-density-box hover:border-sky-500/45 transition-colors">
          <div className="text-xs text-slate-500 dark:text-slate-400">Verified Flagship ROI</div>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400 mt-1">
            450%
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Prime Bank 3-Yr On-Prem PrimeOCR
          </div>
        </div>

        <div className="hud-corner p-4 rounded-xl high-density-box hover:border-purple-500/45 transition-colors">
          <div className="text-xs text-slate-500 dark:text-slate-400">Dual-Shore Delivery Cost</div>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
            ${UNIFIED_SAFE_TERMS.dhakaHourlyLoadedUsd}/hr
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            20-FTE Dhaka Hub · 85%+ arbitrage
          </div>
        </div>
      </div>

      {/* 6-Card Diligence Dispatch Matrix inside .hud-corner + .crt-scanlines + .crt-beam */}
      <div className="relative z-10 hud-corner crt-beam rounded-2xl bg-slate-50/90 dark:bg-slate-950/85 border border-cyan-500/30 backdrop-blur-xl p-4 sm:p-5 space-y-3 overflow-hidden">
        <div
          aria-hidden="true"
          className="crt-scanlines pointer-events-none absolute inset-0 opacity-60 dark:opacity-45"
        />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-mono uppercase tracking-wider text-cyan-700 dark:text-cyan-400 font-semibold">
            Diligence Dispatch Matrix — Jump Directly to Any Canonical Pillar
          </h2>
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            6 Core Verification Modules
          </span>
        </div>

        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {DILIGENCE_DISPATCH_CARDS.map((card) => {
            const flashed = flashedTileId === card.id;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => handleDispatchJump(card.id)}
                className={`service-card-3d text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  flashed
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 ring-2 ring-cyan-400'
                    : 'bg-white/90 dark:bg-slate-900/75 border-slate-200 dark:border-slate-800 hover:border-cyan-500/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[11px] font-mono font-semibold ${
                      flashed ? 'text-slate-950' : 'text-cyan-700 dark:text-cyan-400'
                    }`}
                  >
                    {card.code}
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
                </div>
                <div>
                  <div
                    className={`text-sm font-bold ${
                      flashed ? 'text-slate-950' : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {card.title}
                  </div>
                  <p
                    className={`text-xs mt-1 leading-relaxed ${
                      flashed ? 'text-slate-900' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {card.detail}
                  </p>
                </div>
                <div
                  className={`text-xs font-mono tabular-nums font-semibold pt-1 border-t ${
                    flashed
                      ? 'text-slate-950 border-slate-950/20'
                      : `${card.accentCls} border-slate-200 dark:border-slate-800`
                  }`}
                >
                  {card.metric}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ExecutiveSummaryTable with Domain Filters & Layer Deep-Linking */}
      <div
        id="hero-executive-summary-table"
        className="relative z-10 rounded-xl bg-slate-50/90 dark:bg-slate-950/85 border border-slate-200 dark:border-slate-800 overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              Executive Architecture Summary Matrix (L6–L1 Deep-Link Inspector)
            </h2>
          </div>

          <div
            role="group"
            aria-label="Filter architecture layers by domain"
            className="inline-flex flex-wrap items-center gap-1 p-0.5 rounded-lg bg-slate-200/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
          >
            {(
              [
                { id: 'all', label: 'All Layers' },
                { id: 'delivery', label: 'Delivery & Vector' },
                { id: 'ai-spatial', label: 'AI & Spatial' },
                { id: 'edge', label: 'Edge & Ingest' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                aria-pressed={domainFilter === opt.id}
                onClick={() => setDomainFilter(opt.id)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  domainFilter === opt.id
                    ? 'bg-white dark:bg-slate-950 text-cyan-700 dark:text-cyan-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Layer</th>
                <th className="px-4 py-2.5 font-semibold">Sovereign Responsibility</th>
                <th className="px-4 py-2.5 font-semibold">Protocol</th>
                <th className="px-4 py-2.5 font-semibold text-right">Latency</th>
                <th className="px-4 py-2.5 font-semibold text-right">Uptime SLA</th>
                <th className="px-4 py-2.5 font-semibold text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredLayers.map((layerId) => {
                const spec = FUSION_LAYER_TECH_SPECS[layerId];
                const isSelected = activeLayer === layerId;
                return (
                  <tr
                    key={layerId}
                    onClick={() => focusFusionLayer(layerId, true)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-cyan-500/10'
                        : 'hover:bg-white dark:hover:bg-slate-900/60'
                    }`}
                  >
                    <td className="px-4 py-2.5 font-mono font-bold text-cyan-700 dark:text-cyan-400 whitespace-nowrap">
                      {spec.layerId}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                      {spec.title}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {spec.specs.protocol}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {spec.specs.latency}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400 font-semibold whitespace-nowrap">
                      {spec.specs.uptimeSla}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-cyan-700 dark:text-cyan-400">
                        Inspect <ArrowUpRight className="w-3 h-3" />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
