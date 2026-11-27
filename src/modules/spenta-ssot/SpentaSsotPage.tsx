import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Compass } from 'lucide-react';
import { BRIEFING_CHAPTERS, INVESTOR_PERSONA_TRACKS } from '../../data/unifiedSsotData';
import { SPENTA_CONTACT_EMAIL } from '../../data/spentaManifest';
import { useTheme } from '../../context/ThemeContext';
import { useStack } from '../../store/StackContext';
import { SpentaLogo } from '../../components/SpentaLogo';
import { SystemHealthFooter } from '../../components/SystemHealthFooter';
import {
  SsotBriefingProvider,
  useSsotBriefing,
  useSsotSentiment,
} from './context/SsotBriefingContext';
import { SsotNavbar } from './components/SsotNavbar';
import { ExecutiveHeroSection } from './components/ExecutiveHeroSection';
import { FusionStackSection } from './components/FusionStackSection';
import { UnitEconomicsSection } from './components/UnitEconomicsSection';
import { SectionNavigator } from './components/SectionNavigator';
import { SectionDivider } from './components/SectionDivider';
import {
  CornerHudIndicators,
  FooterFeedbackWidget,
  InvestorNewsTicker,
  ScrollProgressBar,
  SectionMap,
  StickyBreadcrumbBar,
} from './components/SsotHudChrome';
import {
  CaseStudiesSection,
  CompetitiveMoatSection,
  DualEngineSection,
  DualShoreSection,
  RoadmapAndSprintsSection,
  SafeTermsSection,
  TeamAndPassiveIpSection,
  ValueExchangeSection,
} from './components/SsotInteractiveSections';
import {
  OnboardingWizardModal,
  PitchDeckModal,
  ShareBriefingModal,
} from './components/SsotModals';

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#05070B]/92 backdrop-blur-xs px-4 ssot-no-print"
    >
      <div className="w-full max-w-md rounded-2xl bg-slate-950 border border-slate-800 p-6 space-y-4 shadow-2xl text-slate-100">
        <div className="flex items-center justify-between gap-3">
          <SpentaLogo size="sm" tone="dark-bg" showTagline tagline="MASTER SSOT" />
          <button
            type="button"
            onClick={dismiss}
            className="text-xs font-mono text-cyan-400 hover:underline cursor-pointer"
          >
            Enter Briefing →
          </button>
        </div>
        <div className="text-sm font-semibold">
          Restoring L1–L6 Fusion Contracts &amp; 5-Year Financial Kernel…
        </div>
        <div className="h-1.5 w-full rounded-full bg-slate-900 overflow-hidden">
          <div
            style={{ width: `${progress}%` }}
            className="h-full bg-emerald-400 transition-all duration-200"
          />
        </div>
      </div>
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
    openContactModal,
    onProfilerRender,
  } = useStack();
  const {
    activeSectionId,
    bearCaseEnabled,
    sessionSid,
    scrollToSection,
    setOnboardingModalOpen,
  } = useSsotBriefing();
  const { sentimentFilterCss } = useSsotSentiment();

  const fxRate = investorCalculatorState.fxRate;

  const activeChapterSpec = useMemo(() => {
    if (activeSectionId === 'ssot-hero') {
      return { num: '00', shortTitle: 'Executive Overview' };
    }
    if (activeSectionId === 'ssot-milestones') {
      return { num: '04B', shortTitle: 'Execution Sprints' };
    }
    if (activeSectionId === 'ssot-value-exchange') {
      return { num: '05', shortTitle: 'Value Exchange' };
    }
    const found = BRIEFING_CHAPTERS.find((c) => c.id === activeSectionId);
    return found
      ? { num: found.num, shortTitle: found.shortTitle }
      : { num: '00', shortTitle: 'Overview' };
  }, [activeSectionId]);

  const activePersonaLabel =
    INVESTOR_PERSONA_TRACKS.find((t) => t.id === personaTrack)?.label ?? personaTrack;

  return (
    <div className="spenta-ssot-scope min-h-screen flex flex-col overflow-x-hidden print:bg-white print:text-slate-900 print:overflow-visible">
      <GlobalLoadingScreen />
      <ScrollProgressBar />
      <React.Profiler id="SsotNavbar" onRender={onProfilerRender}>
        <SsotNavbar />
      </React.Profiler>
      <StickyBreadcrumbBar />

      <React.Profiler id="SpentaSsotPage" onRender={onProfilerRender}>
        <main
          id="ssot-main-content"
          style={{ filter: sentimentFilterCss }}
          className="ssot-main-content flex-1 max-w-[1440px] w-full mx-auto px-3.5 sm:px-6 py-5 sm:py-7 space-y-6 print:max-w-none print:p-0"
        >
        {/* Top Inline Breadcrumb & Active Track Summary */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800 text-xs ssot-no-print">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 font-mono">
            <button
              type="button"
              onClick={() => exitInvestorBriefing()}
              className="text-cyan-700 dark:text-cyan-400 hover:underline cursor-pointer"
            >
              Spentech Pitching WebApp
            </button>
            <span className="text-slate-400 dark:text-slate-600" aria-hidden="true">
              /
            </span>
            <span className="text-slate-500 dark:text-slate-400">Investor Master SSOT</span>
            <span className="text-slate-400 dark:text-slate-600" aria-hidden="true">
              /
            </span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {activeChapterSpec.num}. {activeChapterSpec.shortTitle}
            </span>
          </nav>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">
            <span>
              Track:{' '}
              <strong className="text-slate-900 dark:text-white">{activePersonaLabel}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Scenario:{' '}
              <strong className="text-slate-900 dark:text-white uppercase">
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
                <strong className="text-amber-700 dark:text-amber-400">Bear-Case Active</strong>
              </>
            )}
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setOnboardingModalOpen(true)}
              className="inline-flex items-center gap-1 text-cyan-700 dark:text-cyan-400 hover:underline cursor-pointer font-semibold"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Guided Setup</span>
            </button>
          </div>
        </div>

        {/* 00. Executive Hero, Spatial3DCanvas & Diligence Dispatch Matrix */}
        <ExecutiveHeroSection />

        {/* Live Clickable Investor Intelligence Ticker */}
        <InvestorNewsTicker />

        {/* 01. Dual-Engine Commercialization & SVG Synergy Flywheel */}
        <SectionDivider accent="emerald" label="01 · Dual-Engine Model" />
        <DualEngineSection />

        {/* 02. 6-Layer Sovereign Fusion Architecture & Live Inspector */}
        <SectionDivider accent="indigo" label="02 · 6-Layer Fusion Stack" />
        <FusionStackSection />

        {/* 03. R&D Technology Roadmap & 04. Execution Sprints */}
        <SectionDivider accent="purple" label="03 · R&D Roadmap" />
        <RoadmapAndSprintsSection />

        {/* 05. Interactive D3-Style Value Exchange Graph */}
        <SectionDivider accent="emerald" label="05 · Value Exchange" />
        <ValueExchangeSection />

        {/* 06. Verified Enterprise Case Studies */}
        <SectionDivider accent="indigo" label="06 · Verified Deployments" />
        <CaseStudiesSection />

        {/* 07. Recalibrated 9-Tier Unit Economics, Sensitivity Sliders, Monte Carlo & Gemini Memo */}
        <SectionDivider accent="emerald" label="07 · Unit Economics & ROI" />
        <UnitEconomicsSection />

        {/* 08. Dual-Shore 3D Delivery Globe */}
        <SectionDivider accent="cyan" label="08 · Dual-Shore Sync" />
        <DualShoreSection />

        {/* 09. Macro Hardware Catalyst, TAM Trajectory & Competitive Moat */}
        <SectionDivider accent="cyan" label="09 · Macro Hardware Shift" />
        <CompetitiveMoatSection />

        {/* 10. Executive Leadership & Passive IP Streams */}
        <SectionDivider accent="purple" label="10 · Leadership & Passive IP" />
        <TeamAndPassiveIpSection />

        {/* 11. Seed Round SAFE Terms & Capital Allocation */}
        <SectionDivider accent="emerald" label="11 · Seed SAFE Terms" />
        <SafeTermsSection />
        </main>
      </React.Profiler>

      <footer
        id="ssot-main-footer"
        className="ssot-footer-surface mt-12 pt-12 pb-28 ssot-no-print"
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 space-y-8">
          <FooterFeedbackWidget />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs pt-4 border-t border-slate-200 dark:border-slate-800/80">
            <div className="space-y-2.5">
              <SpentaLogo
                size="sm"
                showTagline
                tone={theme === 'dark' ? 'dark-bg' : 'light-bg'}
              />
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm">
                Air-gapped Enterprise Physical AI and Spatial Computing infrastructure spanning Silicon Valley, Sydney, and Dhaka.
              </p>
              <div className="font-mono text-[11px] text-slate-500 dark:text-slate-500">
                Session: {sessionSid}
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-mono font-bold text-slate-900 dark:text-white uppercase">
                Quick Navigation
              </div>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                {BRIEFING_CHAPTERS.slice(0, 8).map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => scrollToSection(ch.id)}
                    className="text-left text-slate-600 dark:text-slate-400 hover:text-cyan-700 dark:hover:text-cyan-400 cursor-pointer truncate"
                  >
                    {ch.num}. {ch.shortTitle}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="font-mono font-bold text-slate-900 dark:text-white uppercase">
                Institutional Compliance &amp; Contact
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Financial models reflect reconciled Seed SAFE benchmarks. Figures dynamically convert via active BDT/USD rate.
              </p>
              <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
                <button
                  type="button"
                  onClick={() => exitInvestorBriefing()}
                  className="inline-flex items-center gap-1.5 text-cyan-700 dark:text-cyan-400 hover:underline font-semibold cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Spentech Pitching WebApp</span>
                </button>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => openContactModal('Direct SSOT Investor Inquiry')}
                  className="text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  {SPENTA_CONTACT_EMAIL}
                </button>
              </div>
            </div>
          </div>

          <SystemHealthFooter />
        </div>
      </footer>

      <SectionNavigator />
      <SectionMap />
      <CornerHudIndicators />
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
