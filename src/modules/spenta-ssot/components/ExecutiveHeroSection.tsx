import React from 'react';
import {
  Activity,
  ArrowUpRight,
  Compass,
  Download,
  FolderLock,
  Layers,
  Loader2,
  Presentation,
  Share2,
} from 'lucide-react';
import { CoreLayerId, useStack } from '../../../store/StackContext';
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

const DILIGENCE_DISPATCH_CARDS = [
  {
    id: 'ssot-dual-engine',
    code: '01 · THESIS',
    title: 'Dual-Engine Commercialization',
    metric: 'Up to 76.3% GM',
    detail: 'Spatial XR & Twin wedge converting into recurring air-gapped AI & Voice ERP enclaves.',
  },
  {
    id: 'ssot-fusion-stack',
    code: '02 · ARCHITECTURE',
    title: '6-Layer Sovereign Fusion',
    metric: '<50ms Edge · 0.88 HITL',
    detail: 'Inspect L1–L6 REST/gRPC/MQTT contracts, SDK samples, and OPA governance gates.',
  },
  {
    id: 'ssot-case-studies',
    code: '04 · PROOF',
    title: 'Verified Enterprise Deployments',
    metric: '450% Prime Bank ROI',
    detail: 'Live deployments at Prime Bank, Samsung Biologics, LABAID, Apollo, ISHO, and Jotax Oy.',
  },
  {
    id: 'ssot-unit-economics',
    code: '05 · FINANCIALS',
    title: '9-Tier Unit Economics & Monte Carlo',
    metric: '6.38x Op. Efficiency',
    detail: 'Waterfall COGS, Bear-Case stress test, D3 Monte Carlo CI histogram, and sensitivity matrix.',
  },
  {
    id: 'ssot-dual-shore',
    code: '06 · DELIVERY MOAT',
    title: 'Dual-Shore 3D Delivery Hub',
    metric: '$12.98/hr Dhaka Hub',
    detail: 'San Jose & Sydney client sponsorship fused with 20-FTE Dhaka Sovereign AI enclave.',
  },
  {
    id: 'ssot-safe-terms',
    code: '09 · CAPITAL ROUND',
    title: 'Seed Round SAFE Terms',
    metric: '$500K @ $4.5M Cap',
    detail: '11.11% initial ownership, 20% discount, 18-month runway targeting $60K platform MRR.',
  },
];

export function ExecutiveHeroSection() {
  const {
    currency,
    setCurrency,
    personaTrack,
    setPersonaTrack,
    investorCalculatorState,
    setDataRoomOpen,
    openIntelligenceModal,
  } = useStack();
  const {
    activeLayer,
    setActiveLayer,
    focusFusionLayer,
    scrollToSection,
    exportingOneClickSummary,
    triggerOneClickSummary,
    setShareModalOpen,
    setOnboardingModalOpen,
    setPitchDeckModalOpen,
    pulsedSectionId,
  } = useSsotBriefing();

  const fxRate = investorCalculatorState.fxRate;
  const activePersonaSpec =
    INVESTOR_PERSONA_TRACKS.find((t) => t.id === personaTrack) ?? INVESTOR_PERSONA_TRACKS[0];

  return (
    <section
      id="ssot-hero"
      className={`scroll-mt-20 rounded-2xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] bg-grid-pattern bg-radial-cyan p-5 sm:p-7 space-y-6 ${
        pulsedSectionId === 'ssot-hero' ? 'animate-section-header-pulse' : ''
      }`}
    >
      {/* Top Hero Grid: Executive Copy + Three.js Spatial3DCanvas */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-center">
        <div className="xl:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-mono text-[#5F6576] dark:text-[#8E96B0]">
            <span className="text-[#1C6E46] dark:text-[#6FCB9F] font-semibold">
              SPENTA — INTELLIGENT REALITY
            </span>
            <span aria-hidden="true">·</span>
            <span>INVESTOR MASTER SSOT</span>
            <span aria-hidden="true">·</span>
            <span>{UNIFIED_SAFE_TERMS.instrument}</span>
          </div>

          <h1 className="font-display-ssot text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#16213A] dark:text-[#E7EBF5] tracking-tight leading-tight text-balance">
            Engineering Sovereign Physical AI &amp; Spatial Computing at Dual-Shore Unit Economics
          </h1>

          <p className="text-sm sm:text-base text-[#5F6576] dark:text-[#8E96B0] leading-relaxed max-w-2xl">
            Self-contained institutional diligence hub connecting live 5-year unit economics, Monte Carlo return distributions, L1–L6 API telemetry, and confidential Data Room artifacts.
          </p>

          {/* Primary Action Row */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              disabled={exportingOneClickSummary}
              onClick={() => void triggerOneClickSummary()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#1F3863] hover:bg-[#162848] dark:bg-[#8FA6E8] dark:hover:bg-[#A6B9F0] text-white dark:text-[#0B1020] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
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
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              <FolderLock className="w-3.5 h-3.5" />
              <span>Data Room</span>
            </button>

            <button
              type="button"
              onClick={() => openIntelligenceModal()}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] hover:border-[#1F3863] text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5] cursor-pointer whitespace-nowrap"
            >
              <Activity className="w-3.5 h-3.5 text-[#1C6E46] dark:text-[#6FCB9F]" />
              <span>Intelligence (D3)</span>
            </button>

            <button
              type="button"
              onClick={() => setPitchDeckModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] hover:border-[#1F3863] text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5] cursor-pointer whitespace-nowrap"
            >
              <Presentation className="w-3.5 h-3.5" />
              <span>Pitch Deck</span>
            </button>

            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] hover:border-[#1F3863] text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5] cursor-pointer whitespace-nowrap"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Briefing</span>
            </button>

            <button
              type="button"
              onClick={() => setOnboardingModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] hover:border-[#1F3863] text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5] cursor-pointer whitespace-nowrap"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Guided Setup</span>
            </button>

            <VoiceNavigatorButton onJumpToChapter={(id) => scrollToSection(id)} />
          </div>

          {/* Persona Track + Currency Toolbar */}
          <div className="pt-3 border-t border-[#E4DFD6] dark:border-[#232B4A] flex flex-wrap items-center justify-between gap-3">
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
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
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
                onClick={() => scrollToSection(activePersonaSpec.primaryChapterId)}
                className="text-xs font-semibold text-[#1C6E46] dark:text-[#6FCB9F] hover:underline cursor-pointer whitespace-nowrap"
              >
                {activePersonaSpec.primaryCtaLabel} →
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0]">
                1 USD = {fxRate.toFixed(2)} BDT
              </span>
              <div
                role="group"
                aria-label="Hero currency switcher"
                className="inline-flex rounded-lg bg-[#F2EFE9] dark:bg-[#0F1529] p-0.5 border border-[#E4DFD6] dark:border-[#232B4A]"
              >
                {(['USD', 'BDT'] as const).map((cur) => (
                  <button
                    key={cur}
                    type="button"
                    aria-pressed={currency === cur}
                    onClick={() => setCurrency(cur)}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-semibold cursor-pointer ${
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
        </div>

        {/* Right: Spatial3DCanvas (Interactive Three.js L1-L6 Sovereign Enclave) */}
        <div className="xl:col-span-5">
          <Spatial3DCanvas
            activeLayer={activeLayer}
            onSelectLayer={(layer) => {
              setActiveLayer(layer);
            }}
          />
        </div>
      </div>

      {/* 4 Headline KPI Figures */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl high-density-box">
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

        <div className="p-4 rounded-xl high-density-box">
          <div className="text-xs text-[#5F6576] dark:text-[#8E96B0]">Physical AI &amp; XR TAM</div>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#16213A] dark:text-[#E7EBF5] mt-1">
            ${UNIFIED_SAFE_TERMS.tamUsdBillions}B
          </div>
          <div className="text-[11px] font-mono tabular-nums text-[#1C6E46] dark:text-[#6FCB9F] mt-0.5">
            {UNIFIED_SAFE_TERMS.tamCagrPct}% CAGR through 2033
          </div>
        </div>

        <div className="p-4 rounded-xl high-density-box">
          <div className="text-xs text-[#5F6576] dark:text-[#8E96B0]">Verified Flagship ROI</div>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#1C6E46] dark:text-[#6FCB9F] mt-1">
            450%
          </div>
          <div className="text-[11px] text-[#5F6576] dark:text-[#8E96B0] mt-0.5">
            Prime Bank 3-Yr On-Prem PrimeOCR
          </div>
        </div>

        <div className="p-4 rounded-xl high-density-box">
          <div className="text-xs text-[#5F6576] dark:text-[#8E96B0]">Dual-Shore Delivery Cost</div>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#16213A] dark:text-[#E7EBF5] mt-1">
            ${UNIFIED_SAFE_TERMS.dhakaHourlyLoadedUsd}/hr
          </div>
          <div className="text-[11px] text-[#5F6576] dark:text-[#8E96B0] mt-0.5">
            20-FTE Dhaka Hub · 85%+ arbitrage
          </div>
        </div>
      </div>

      {/* 6-Card Diligence Dispatch Matrix */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-wider text-[#5F6576] dark:text-[#8E96B0] font-semibold">
            Diligence Dispatch Matrix — Jump Directly to Any Canonical Pillar
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {DILIGENCE_DISPATCH_CARDS.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => scrollToSection(card.id)}
              className="service-card-3d text-left p-4 rounded-xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] hover:border-[#1F3863] dark:hover:border-[#8FA6E8] cursor-pointer flex flex-col justify-between gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono font-semibold text-[#1F3863] dark:text-[#8FA6E8]">
                  {card.code}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#5F6576] dark:text-[#8E96B0]" />
              </div>
              <div>
                <div className="text-sm font-bold text-[#16213A] dark:text-[#E7EBF5]">
                  {card.title}
                </div>
                <p className="text-xs text-[#5F6576] dark:text-[#8E96B0] mt-1 leading-relaxed">
                  {card.detail}
                </p>
              </div>
              <div className="text-xs font-mono tabular-nums font-semibold text-[#1C6E46] dark:text-[#6FCB9F] pt-1 border-t border-[#E4DFD6] dark:border-[#232B4A]">
                {card.metric}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ExecutiveSummaryTable with Layer Deep-Linking */}
      <div className="rounded-xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E4DFD6] dark:border-[#232B4A] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#1F3863] dark:text-[#8FA6E8]" />
            <h2 className="text-xs sm:text-sm font-bold text-[#16213A] dark:text-[#E7EBF5]">
              Executive Architecture Summary Matrix (L6–L1 Deep-Link Inspector)
            </h2>
          </div>
          <span className="text-[11px] font-mono text-[#5F6576] dark:text-[#8E96B0]">
            Click any layer row to deep-link into the 6-Layer Fusion Stack
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white dark:bg-[#141A32] border-b border-[#E4DFD6] dark:border-[#232B4A] text-[#5F6576] dark:text-[#8E96B0]">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Layer</th>
                <th className="px-4 py-2.5 font-semibold">Sovereign Responsibility</th>
                <th className="px-4 py-2.5 font-semibold">Protocol</th>
                <th className="px-4 py-2.5 font-semibold text-right">Latency</th>
                <th className="px-4 py-2.5 font-semibold text-right">Uptime SLA</th>
                <th className="px-4 py-2.5 font-semibold text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4DFD6] dark:divide-[#232B4A]">
              {LAYER_ORDER.map((layerId) => {
                const spec = FUSION_LAYER_TECH_SPECS[layerId];
                const isSelected = activeLayer === layerId;
                return (
                  <tr
                    key={layerId}
                    onClick={() => focusFusionLayer(layerId, true)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#1F3863]/8 dark:bg-[#8FA6E8]/12'
                        : 'hover:bg-white dark:hover:bg-[#141A32]'
                    }`}
                  >
                    <td className="px-4 py-2.5 font-mono font-bold text-[#1F3863] dark:text-[#8FA6E8] whitespace-nowrap">
                      {spec.layerId}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-[#16213A] dark:text-[#E7EBF5]">
                      {spec.title}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[#5F6576] dark:text-[#8E96B0] whitespace-nowrap">
                      {spec.specs.protocol}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-[#16213A] dark:text-[#E7EBF5] whitespace-nowrap">
                      {spec.specs.latency}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-[#1C6E46] dark:text-[#6FCB9F] font-semibold whitespace-nowrap">
                      {spec.specs.uptimeSla}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-[#1F3863] dark:text-[#8FA6E8]">
                        Deep-Dive <ArrowUpRight className="w-3 h-3" />
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
