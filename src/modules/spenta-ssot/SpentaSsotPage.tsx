import React, { Suspense, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Box,
  Compass,
  FolderLock,
  Layers,
  MessageSquarePlus,
  Presentation,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import {
  BRIEFING_CHAPTERS,
  BriefingChapterSpec,
  COMPETITIVE_MOAT_ROWS,
  EXECUTIVE_TEAM,
  INVESTOR_PERSONA_TRACKS,
  MACRO_HARDWARE_CATALYSTS,
  PASSIVE_IP_STREAMS,
  RD_ROADMAP_PHASES,
  SSOT_CASE_STUDIES,
  STARTUP_BENCHMARKS,
  UNIFIED_SAFE_TERMS,
  formatSsotCurrency,
} from '../../data/unifiedSsotData';
import { SPENTA_CONTACT_EMAIL } from '../../data/spentaManifest';
import { useTheme } from '../../context/ThemeContext';
import { useStack } from '../../store/StackContext';
import { lazyWithRetry } from '../../utils/lazyWithRetry';
import { getPanelPreloadHandlers, getTabPreloadHandlers } from '../../utils/viewPreloaders';
import { SpentaLogo } from '../../components/SpentaLogo';
import { SsotBriefingProvider, useSsotBriefing } from './context/SsotBriefingContext';
import { SsotNavbar } from './components/SsotNavbar';
import { ExecutiveHeroSection } from './components/ExecutiveHeroSection';
import { FusionStackSection } from './components/FusionStackSection';
import { UnitEconomicsSection } from './components/UnitEconomicsSection';
import { SectionNavigator } from './components/SectionNavigator';
import {
  OnboardingWizardModal,
  PitchDeckModal,
  ShareBriefingModal,
} from './components/SsotModals';

const DualShoreGlobe = lazyWithRetry(() =>
  import('../../components/briefing/DualShoreGlobe').then((m) => ({
    default: m.DualShoreGlobe,
  })),
);

const SSOT_BOOT_STORAGE_KEY = 'spenta_ssot_booted';

function GlobalLoadingScreen() {
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.sessionStorage.getItem(SSOT_BOOT_STORAGE_KEY) !== '1';
    } catch {
      return false;
    }
  });
  const [progress, setProgress] = useState<number>(36);

  const dismiss = () => {
    setVisible(false);
    try {
      window.sessionStorage.setItem(SSOT_BOOT_STORAGE_KEY, '1');
    } catch {
      // ignore storage errors
    }
  };

  useEffect(() => {
    if (!visible) return;
    const t1 = window.setTimeout(() => setProgress(100), 40);
    const t2 = window.setTimeout(() => {
      dismiss();
    }, 240);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-label="Initializing Spenta Investor Master SSOT"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1020]/90 backdrop-blur-xs px-4 ssot-no-print"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#141A32] border border-[#232B4A] p-6 space-y-4 shadow-2xl text-[#E7EBF5]">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-mono uppercase tracking-[0.16em] text-[#6FCB9F]">
            SPENTA MASTER SSOT
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="text-xs font-mono text-[#8FA6E8] hover:underline cursor-pointer"
          >
            Enter Briefing →
          </button>
        </div>
        <div className="text-sm font-semibold">
          Restoring L1–L6 Fusion Contracts &amp; 5-Year Financial Kernel…
        </div>
        <div className="h-1.5 w-full rounded-full bg-[#0B1020] overflow-hidden">
          <div
            style={{ width: `${progress}%` }}
            className="h-full bg-[#6FCB9F] transition-all duration-200"
          />
        </div>
      </div>
    </div>
  );
}

function SsotChapterHeader({
  chapter,
  subtitle,
  rightAction,
}: {
  chapter: BriefingChapterSpec;
  subtitle: string;
  rightAction?: React.ReactNode;
}) {
  const { personaTrack, investorFeedback, openIntelligenceModal } = useStack();
  const { pulsedSectionId } = useSsotBriefing();
  const isPriority = chapter.recommendedFor.includes(personaTrack);
  const feedbackCount = investorFeedback.filter((f) => f.section === chapter.id).length;
  const activePersonaLabel =
    INVESTOR_PERSONA_TRACKS.find((p) => p.id === personaTrack)?.label ?? personaTrack;
  const isPulsed = pulsedSectionId === chapter.id;

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-3 border-b border-[#E4DFD6] dark:border-[#232B4A] rounded-lg transition-all ${
        isPulsed ? 'animate-section-header-pulse px-2 py-1' : ''
      }`}
    >
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-mono text-[#5F6576] dark:text-[#8E96B0]">
          <span className="text-[#1F3863] dark:text-[#8FA6E8] font-semibold">
            Chapter {chapter.num}
          </span>
          {isPriority && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-[#1C6E46] dark:text-[#6FCB9F] font-semibold">
                Recommended for {activePersonaLabel}
              </span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <button
            type="button"
            {...getPanelPreloadHandlers('investor-intelligence')}
            onClick={() => openIntelligenceModal(chapter.id)}
            className="inline-flex items-center gap-1 hover:text-[#16213A] dark:hover:text-[#E7EBF5] transition-colors cursor-pointer"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            <span>Notes ({feedbackCount})</span>
          </button>
        </div>
        <h2 className="font-display-ssot text-xl sm:text-2xl font-bold text-[#16213A] dark:text-[#E7EBF5] tracking-tight text-balance">
          {chapter.title}
        </h2>
        <p className="text-sm text-[#5F6576] dark:text-[#8E96B0] max-w-3xl">{subtitle}</p>
      </div>
      {rightAction && <div className="shrink-0">{rightAction}</div>}
    </div>
  );
}

function SsotBriefingWorkspace() {
  const { theme } = useTheme();
  const {
    currency,
    personaTrack,
    investorCalculatorState,
    exitInvestorBriefing,
    openArPreview,
    loadCaseStudyStack,
    setDataRoomOpen,
    openContactModal,
    navigateToItem,
  } = useStack();
  const {
    activeSectionId,
    bearCaseEnabled,
    sessionSid,
    setOnboardingModalOpen,
    setPitchDeckModalOpen,
  } = useSsotBriefing();

  const isDark = theme === 'dark';
  const fxRate = investorCalculatorState.fxRate;

  const activeChapterSpec = useMemo(() => {
    if (activeSectionId === 'ssot-hero') {
      return { num: '00', shortTitle: 'Executive Overview' };
    }
    const found = BRIEFING_CHAPTERS.find((c) => c.id === activeSectionId);
    return found ? { num: found.num, shortTitle: found.shortTitle } : { num: '00', shortTitle: 'Overview' };
  }, [activeSectionId]);

  const activePersonaLabel =
    INVESTOR_PERSONA_TRACKS.find((t) => t.id === personaTrack)?.label ?? personaTrack;

  return (
    <div className="spenta-ssot-scope min-h-screen spenta-canvas text-[#16213A] dark:text-[#E7EBF5] flex flex-col overflow-x-hidden print:bg-white print:text-zinc-950 print:overflow-visible">
      <GlobalLoadingScreen />
      <SsotNavbar />

      <main className="ssot-main-content flex-1 max-w-[1440px] w-full mx-auto px-3.5 sm:px-6 py-5 sm:py-7 space-y-10 print:max-w-none print:p-0">
        {/* Compact BreadcrumbNav + ActiveTrackIndicator Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E4DFD6] dark:border-[#232B4A] text-xs ssot-no-print">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 font-mono">
            <button
              type="button"
              onClick={() => exitInvestorBriefing()}
              className="text-[#1F3863] dark:text-[#8FA6E8] hover:underline cursor-pointer"
            >
              Spentech Pitching WebApp
            </button>
            <span className="text-[#CFC8BC] dark:text-[#333F69]" aria-hidden="true">
              /
            </span>
            <span className="text-[#5F6576] dark:text-[#8E96B0]">Investor Master SSOT</span>
            <span className="text-[#CFC8BC] dark:text-[#333F69]" aria-hidden="true">
              /
            </span>
            <span className="font-semibold text-[#16213A] dark:text-[#E7EBF5]">
              {activeChapterSpec.num}. {activeChapterSpec.shortTitle}
            </span>
          </nav>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[11px] text-[#5F6576] dark:text-[#8E96B0]">
            <span>
              Track:{' '}
              <strong className="text-[#16213A] dark:text-[#E7EBF5]">{activePersonaLabel}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Scenario:{' '}
              <strong className="text-[#16213A] dark:text-[#E7EBF5] uppercase">
                {investorCalculatorState.scenario}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {currency} ({fxRate.toFixed(2)})
            </span>
            {bearCaseEnabled && (
              <>
                <span aria-hidden="true">·</span>
                <strong className="text-amber-700 dark:text-amber-300">Bear-Case Active</strong>
              </>
            )}
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setOnboardingModalOpen(true)}
              className="inline-flex items-center gap-1 text-[#1F3863] dark:text-[#8FA6E8] hover:underline cursor-pointer font-semibold"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Guided Setup</span>
            </button>
          </div>
        </div>

        {/* 00. Executive Hero, Spatial3DCanvas & Diligence Dispatch Matrix */}
        <ExecutiveHeroSection />

        {/* 01. Dual-Engine Commercialization & Value Exchange */}
        <section id="ssot-dual-engine" className="scroll-mt-24 space-y-5">
          <SsotChapterHeader
            chapter={BRIEFING_CHAPTERS[0]}
            subtitle="Two synergistic commercial engines convert low-friction spatial pilots into recurring air-gapped enterprise operating systems."
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="high-density-box p-6 rounded-2xl bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] space-y-4">
              <div className="text-xs font-mono text-[#1F3863] dark:text-[#8FA6E8] font-semibold">
                Engine 01 · Land &amp; Expand Entry Wedge
              </div>
              <h3 className="text-lg font-bold text-[#16213A] dark:text-[#E7EBF5]">
                The Experience Engine (Spatial XR &amp; Digital Twins)
              </h3>
              <p className="text-sm text-[#5F6576] dark:text-[#8E96B0] leading-relaxed">
                Attracts enterprise buyers rapidly through zero-install WebAR commerce (ISHO), interactive UE5 hospital twins (Apollo), and procedural cleanroom VR certifications (Samsung Biologics).
              </p>
              <div className="pt-3 border-t border-[#E4DFD6] dark:border-[#232B4A] flex items-center justify-between text-xs font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0]">
                <span>
                  Entry Ticket: {formatSsotCurrency(1200, currency, fxRate)} –{' '}
                  {formatSsotCurrency(45000, currency, fxRate)}
                </span>
                <span className="text-[#1C6E46] dark:text-[#6FCB9F] font-semibold">
                  Up to 76.3% GM
                </span>
              </div>
            </div>

            <div className="high-density-box p-6 rounded-2xl bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] space-y-4">
              <div className="text-xs font-mono text-[#1C6E46] dark:text-[#6FCB9F] font-semibold">
                Engine 02 · High-Retention Sovereign Expansion
              </div>
              <h3 className="text-lg font-bold text-[#16213A] dark:text-[#E7EBF5]">
                The Operations Engine (PrimeOCR, Voice ERP &amp; 8 AI Agents)
              </h3>
              <p className="text-sm text-[#5F6576] dark:text-[#8E96B0] leading-relaxed">
                Locks in multi-year recurring revenue by deploying air-gapped document intelligence, Bengali/English WhatsApp Voice ERP, and 0.88 HITL-governed reasoning workflows on private infrastructure.
              </p>
              <div className="pt-3 border-t border-[#E4DFD6] dark:border-[#232B4A] flex items-center justify-between text-xs font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0]">
                <span>
                  Enterprise Enclave: {formatSsotCurrency(40000, currency, fxRate)} –{' '}
                  {formatSsotCurrency(100000, currency, fxRate)}+
                </span>
                <span className="text-[#1C6E46] dark:text-[#6FCB9F] font-semibold">
                  450% Verified ROI
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 02. 6-Layer Sovereign Fusion Architecture & Live Inspector */}
        <FusionStackSection />

        {/* 03. R&D Technology Roadmap & Execution Sprints */}
        <section id="ssot-roadmap" className="scroll-mt-24 space-y-5">
          <SsotChapterHeader
            chapter={BRIEFING_CHAPTERS[2]}
            subtitle="Disciplined productization milestones moving from proven on-premise deployments to scalable SDK & spatial hardware recurring revenue."
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {RD_ROADMAP_PHASES.map((phase) => (
              <div
                key={phase.quarter}
                className="p-5 rounded-2xl bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-[#1F3863] dark:text-[#8FA6E8]">
                      {phase.quarter}
                    </span>
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
        <section id="ssot-case-studies" className="scroll-mt-24 space-y-5">
          <SsotChapterHeader
            chapter={BRIEFING_CHAPTERS[3]}
            subtitle="Production client deployments across banking, biopharma, retail, healthcare, and education—each inspectable in 3D or loadable into the Stack Composer."
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {SSOT_CASE_STUDIES.map((cs) => (
              <article
                key={cs.id}
                className="p-5 rounded-2xl bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="text-xs font-mono text-[#5F6576] dark:text-[#8E96B0]">
                    <span className="font-semibold text-[#1F3863] dark:text-[#8FA6E8]">
                      {cs.client}
                    </span>
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
                  <div className="flex items-center gap-2 ssot-no-print">
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

        {/* 05. Recalibrated 9-Tier Unit Economics, Bear-Case Risk, D3 Monte Carlo & AI Memo */}
        <UnitEconomicsSection />

        {/* 06. Dual-Shore 3D Delivery Globe */}
        <section id="ssot-dual-shore" className="scroll-mt-24 space-y-5">
          <SsotChapterHeader
            chapter={BRIEFING_CHAPTERS[5]}
            subtitle="Global onshore client sponsorship in San Jose and Sydney/Melbourne fused with our 20-FTE Dhaka Sovereign AI & 3D Studio Hub."
          />

          <Suspense
            fallback={
              <div className="h-[420px] rounded-2xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] animate-pulse" />
            }
          >
            <DualShoreGlobe />
          </Suspense>
        </section>

        {/* 07. Macro Hardware Catalyst & Competitive Moat */}
        <section id="ssot-moat" className="scroll-mt-24 space-y-5">
          <SsotChapterHeader
            chapter={BRIEFING_CHAPTERS[6]}
            subtitle="Big Tech hardware mass production creates the sensory ingest wave; Spenta owns the air-gapped enterprise software & dual-shore cost moat."
          />

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
        <section id="ssot-team-ip" className="scroll-mt-24 space-y-6">
          <SsotChapterHeader
            chapter={BRIEFING_CHAPTERS[7]}
            subtitle="Dual-shore leadership spanning Silicon Valley, Sydney, and Dhaka paired with 5 high-margin non-client passive IP & asset royalty streams."
          />

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
        <section id="ssot-safe-terms" className="scroll-mt-24 space-y-5">
          <SsotChapterHeader
            chapter={BRIEFING_CHAPTERS[8]}
            subtitle="Standard YC Post-Money SAFE structured for 18 months of disciplined runway, SDK productization, and APAC/US enterprise expansion."
            rightAction={
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
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] text-xs font-medium text-[#16213A] dark:text-[#E7EBF5] cursor-pointer whitespace-nowrap ssot-no-print"
              >
                <Box className="w-3.5 h-3.5" />
                <span>3D Trajectory</span>
              </button>
            }
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
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

              <div className="p-4 rounded-xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] flex flex-wrap items-center justify-between gap-3 ssot-no-print">
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
                    onClick={() => setPitchDeckModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5] cursor-pointer whitespace-nowrap"
                  >
                    <Presentation className="w-3.5 h-3.5" />
                    <span>Open Pitch Deck Modal</span>
                  </button>
                  <button
                    type="button"
                    {...getTabPreloadHandlers('Pitch Deck')}
                    onClick={() => navigateToItem('Pitch Deck')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5] cursor-pointer whitespace-nowrap"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-[#1C6E46] dark:text-[#6FCB9F]" />
                    <span>Full Deck View</span>
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
      </main>

      <footer className="spenta-band spenta-muted border-t mt-10 ssot-no-print">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-3 min-w-0">
            <SpentaLogo className="h-6 sm:h-7" tone={theme === 'dark' ? 'dark-bg' : 'light-bg'} />
            <span className="h-3.5 w-px bg-[#CFC8BC] dark:bg-[#232B4A] shrink-0" />
            <span className="font-mono text-[11px] spenta-muted">
              SPENTA — Intelligent Reality · Investor Master SSOT · Session {sessionSid}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
            <button
              type="button"
              onClick={() => exitInvestorBriefing()}
              className="inline-flex items-center gap-1.5 text-[#1F3863] dark:text-[#8FA6E8] hover:underline font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Spentech Pitching WebApp</span>
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => openContactModal('Direct SSOT Investor Inquiry')}
              className="spenta-positive hover:underline cursor-pointer"
            >
              {SPENTA_CONTACT_EMAIL}
            </button>
          </div>
        </div>
      </footer>

      <SectionNavigator />
      <ShareBriefingModal />
      <OnboardingWizardModal />
      <PitchDeckModal />
    </div>
  );
}

export function SpentaSsotPage() {
  return (
    <SsotBriefingProvider>
      <SsotBriefingWorkspace />
    </SsotBriefingProvider>
  );
}
