import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { Link2, RefreshCw, RotateCcw, WifiOff, X } from 'lucide-react';
import { SPENTA_CONTACT_EMAIL } from './data/spentaManifest';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { StackProvider, useStack } from './store/StackContext';
import { Navbar } from './components/Navbar';
import { SpentaLogo } from './components/SpentaLogo';
import { GlobalSearchBar } from './components/GlobalSearchBar';
import { SpentaThemeView } from './components/SpentaThemeView';
import { MobileGridToggle } from './components/MobileGridToggle';
import { ResilientErrorBoundary } from './components/ResilientErrorBoundary';
import { SystemHealthFooter } from './components/SystemHealthFooter';
import { lazyWithRetry } from './utils/lazyWithRetry';
import {
  aiAssistantImporter,
  dataRoomImporter,
  founderContactImporter,
  getTabPreloadHandlers,
  investorIntelligenceImporter,
  markStackComposerLoaded,
  markTabViewLoaded,
  spatialArImporter,
  ssotPageImporter,
  stackComposerImporter,
  viewImporters,
} from './utils/viewPreloaders';

const StackComposerDrawer = lazyWithRetry(stackComposerImporter);

const SpentaBrainVault = lazyWithRetry(viewImporters['App Vault']);
const InvestorBriefingView = lazyWithRetry(viewImporters['Investor Briefing']);
const InfographicsView = lazyWithRetry(viewImporters.Infographics);
const FinancialsView = lazyWithRetry(viewImporters.Financials);
const SpentaCoreView = lazyWithRetry(viewImporters['Spenta Core']);
const TheBrainView = lazyWithRetry(viewImporters['The Brain']);
const PitchDeckView = lazyWithRetry(viewImporters['Pitch Deck']);
const ResourcesView = lazyWithRetry(viewImporters.Resources);
const SpentaAiAssistant = lazyWithRetry(aiAssistantImporter);
const DataRoomModal = lazyWithRetry(dataRoomImporter);
const FounderContactModal = lazyWithRetry(founderContactImporter);
const InvestorIntelligenceModal = lazyWithRetry(investorIntelligenceImporter);
const SpatialArViewerModal = lazyWithRetry(spatialArImporter);
const SpentaSsotPage = lazyWithRetry(ssotPageImporter);

function ViewLoadingFallback() {
  return (
    <div
      role="status"
      aria-label="Loading view"
      className="space-y-4 animate-pulse py-2"
    >
      <div className="h-24 rounded-2xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32]" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="h-32 rounded-2xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32]" />
        <div className="h-32 rounded-2xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32]" />
        <div className="h-32 rounded-2xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32]" />
      </div>
      <div className="h-64 rounded-2xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32]" />
    </div>
  );
}

interface EnvironmentNotice {
  title: string;
  detail: string;
  kind: 'offline' | 'connectivity';
}

function isIgnorableHmrRejection(reason: unknown): boolean {
  const msg = reason instanceof Error ? reason.message : String(reason ?? '');
  const stack = reason instanceof Error ? reason.stack ?? '' : '';
  return (
    msg.includes('WebSocket closed without opened') &&
    (stack.includes('@vite/client') || stack.includes('vite/dist/client'))
  );
}

function isConnectivityReason(reason: unknown): boolean {
  const msg = (reason instanceof Error ? reason.message : String(reason ?? '')).toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('load failed') ||
    msg.includes('websocket') ||
    msg.includes('err_network')
  );
}

function PortalShell() {
  const {
    activeTab,
    setActiveTab,
    drawerOpen,
    sharedSnapshotSummary,
    dismissSharedSnapshot,
    resetToLocalDefaults,
    dataRoomOpen,
    contactModalOpen,
    intelligenceModalOpen,
    arPreviewTarget,
    isInvestorBriefingRoute,
    exitInvestorBriefing,
    onProfilerRender,
  } = useStack();
  const { theme } = useTheme();
  const [hasOpenedDrawer, setHasOpenedDrawer] = useState(drawerOpen);
  const [envNotice, setEnvNotice] = useState<EnvironmentNotice | null>(() =>
    typeof navigator !== 'undefined' && navigator.onLine === false
      ? {
          kind: 'offline',
          title: 'Offline Mode Active',
          detail:
            'Browser network connectivity is offline. Local stack composition, calculator modeling, and cached assets remain interactive.',
        }
      : null,
  );
  const [recheckingHealth, setRecheckingHealth] = useState(false);

  useEffect(() => {
    markTabViewLoaded(activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (drawerOpen) {
      markStackComposerLoaded();
      setHasOpenedDrawer(true);
    }
  }, [drawerOpen]);

  useEffect(() => {
    const handleOffline = () => {
      setEnvNotice({
        kind: 'offline',
        title: 'Network Connectivity Lost',
        detail:
          'You appear offline. Local workspace state and composed modules are preserved until connectivity resumes.',
      });
    };

    const handleOnline = () => {
      setEnvNotice(null);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isIgnorableHmrRejection(event.reason)) {
        event.preventDefault();
        return;
      }
      if (isConnectivityReason(event.reason)) {
        event.preventDefault();
        const detail =
          event.reason instanceof Error
            ? event.reason.message
            : 'A background network or stream request failed.';
        setEnvNotice({
          kind: 'connectivity',
          title: 'Connectivity Notice',
          detail: `${detail} Your current workspace state remains intact.`,
        });
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const handleRecheckConnectivity = useCallback(async () => {
    setRecheckingHealth(true);
    try {
      const res = await fetch('/api/health', { cache: 'no-store' });
      if (res.ok) {
        setEnvNotice(null);
      } else {
        setEnvNotice({
          kind: 'connectivity',
          title: 'Environment Check Returned HTTP ' + res.status,
          detail: 'Local portal views remain responsive while backend connectivity recovers.',
        });
      }
    } catch {
      setEnvNotice({
        kind: 'offline',
        title: 'Backend Unreachable',
        detail:
          'Unable to reach /api/health. Local views and saved configurations continue operating offline.',
      });
    } finally {
      setRecheckingHealth(false);
    }
  }, []);

  return (
    <>
      {isInvestorBriefingRoute ? (
        <ResilientErrorBoundary
          scope="view"
          resetKey="investor-briefing"
          contextLabel="SPENTA Investor Master SSOT"
          onReturnHome={() => exitInvestorBriefing()}
        >
          <Suspense
            fallback={
              <div className="min-h-screen spenta-canvas p-4 sm:p-6">
                <div className="max-w-[1440px] mx-auto">
                  <ViewLoadingFallback />
                </div>
              </div>
            }
          >
            <SpentaSsotPage />
          </Suspense>
        </ResilientErrorBoundary>
      ) : (
        <div className="min-h-screen spenta-canvas print:bg-white print:text-zinc-950 print:min-h-0 flex flex-col overflow-x-hidden print:overflow-visible transition-colors duration-150">
          <React.Profiler id="Navbar" onRender={onProfilerRender}>
            <Navbar />
          </React.Profiler>

          <main className="flex-1 max-w-[1440px] w-full mx-auto px-3.5 sm:px-6 py-5 sm:py-6 print:max-w-none print:p-0">
            {envNotice && (
              <div
                role="status"
                aria-live="polite"
                className="mb-4 rounded-xl border border-amber-500/35 bg-amber-500/10 dark:bg-amber-500/12 px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 no-print"
              >
                <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/35 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                    <WifiOff className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold spenta-ink">{envNotice.title}</div>
                    <div className="text-[11px] spenta-muted">{envNotice.detail}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={recheckingHealth}
                    onClick={() => void handleRecheckConnectivity()}
                    className="inline-flex items-center gap-1.5 min-h-[34px] px-2.5 py-1.5 rounded-lg spenta-surface border hover:border-[#1F3863] dark:hover:border-[#8FA6E8] text-xs font-medium spenta-ink transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${recheckingHealth ? 'animate-spin' : ''}`}
                      strokeWidth={1.6}
                    />
                    <span>{recheckingHealth ? 'Checking…' : 'Retry'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEnvNotice(null)}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg spenta-muted hover:text-[#16213A] dark:hover:text-[#E7EBF5] hover:bg-[#F2EFE9] dark:hover:bg-[#1E2747] transition-colors cursor-pointer"
                    aria-label="Dismiss connectivity notification"
                  >
                    <X className="w-4 h-4" strokeWidth={1.6} />
                  </button>
                </div>
              </div>
            )}

            {sharedSnapshotSummary && (
              <div
                role="status"
                className="mb-4 rounded-xl border border-[#1F3863]/25 dark:border-[#8FA6E8]/30 spenta-surface px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 no-print"
              >
                <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-[#1F3863]/10 dark:bg-[#8FA6E8]/15 border border-[#1F3863]/20 dark:border-[#8FA6E8]/30 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                    <Link2 className="w-3.5 h-3.5 spenta-brand" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold spenta-ink">
                      Shared Architecture Snapshot Loaded
                    </div>
                    <div className="text-[11px] font-mono spenta-muted truncate">
                      {sharedSnapshotSummary}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={resetToLocalDefaults}
                    className="inline-flex items-center gap-1.5 min-h-[36px] px-2.5 py-1.5 rounded-lg spenta-band border hover:border-[#1F3863] dark:hover:border-[#8FA6E8] text-xs font-medium spenta-ink transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.6} />
                    <span>Reset to Defaults</span>
                  </button>
                  <button
                    type="button"
                    onClick={dismissSharedSnapshot}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-lg spenta-muted hover:text-[#16213A] dark:hover:text-[#E7EBF5] hover:bg-[#F2EFE9] dark:hover:bg-[#1E2747] transition-colors cursor-pointer"
                    aria-label="Dismiss shared snapshot notice"
                  >
                    <X className="w-4 h-4" strokeWidth={1.6} />
                  </button>
                </div>
              </div>
            )}

            <ResilientErrorBoundary
              scope="view"
              resetKey={activeTab}
              contextLabel={activeTab}
              onReturnHome={activeTab !== 'App Vault' ? () => setActiveTab('App Vault') : undefined}
            >
              <SpentaThemeView viewId={activeTab}>
                <Suspense fallback={<ViewLoadingFallback />}>
                  <React.Profiler id={activeTab} onRender={onProfilerRender}>
                    {activeTab === 'App Vault' && <SpentaBrainVault />}
                    {activeTab === 'Investor Briefing' && <InvestorBriefingView />}
                    {activeTab === 'Infographics' && <InfographicsView />}
                    {activeTab === 'Financials' && <FinancialsView />}
                    {activeTab === 'Spenta Core' && <SpentaCoreView />}
                    {activeTab === 'The Brain' && <TheBrainView />}
                    {activeTab === 'Pitch Deck' && <PitchDeckView />}
                    {activeTab === 'Resources' && <ResourcesView />}
                  </React.Profiler>
                </Suspense>
              </SpentaThemeView>
            </ResilientErrorBoundary>
          </main>

          <footer className="spenta-band spenta-muted border-t mt-10 no-print">
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-5 space-y-3 text-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <SpentaLogo className="h-6 sm:h-7" tone={theme === 'dark' ? 'dark-bg' : 'light-bg'} />
                  <span className="h-3.5 w-px bg-[#CFC8BC] dark:bg-[#232B4A] shrink-0" />
                  <span className="font-mono text-[11px] spenta-muted truncate">
                    Sovereign AI · ERP · Fintech · Voice · Spatial XR
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px]">
                  <span>San Jose · Australia · 20-FTE Dhaka R&amp;D Hub</span>
                  <span className="text-[#CFC8BC] dark:text-[#333F69]" aria-hidden="true">
                    ·
                  </span>
                  <button
                    type="button"
                    {...getTabPreloadHandlers('Resources')}
                    onClick={() => {
                      setActiveTab('Resources');
                      window.setTimeout(() => {
                        document
                          .getElementById('spenta-proposal-form')
                          ?.scrollIntoView({ behavior: 'smooth' });
                      }, 80);
                    }}
                    className="spenta-positive hover:underline cursor-pointer"
                  >
                    {SPENTA_CONTACT_EMAIL}
                  </button>
                </div>
              </div>
              <SystemHealthFooter />
            </div>
          </footer>

          <MobileGridToggle />
        </div>
      )}

      <GlobalSearchBar />
      {(hasOpenedDrawer || drawerOpen) && (
        <Suspense fallback={null}>
          <StackComposerDrawer />
        </Suspense>
      )}
      {dataRoomOpen && (
        <Suspense fallback={null}>
          <DataRoomModal />
        </Suspense>
      )}
      {contactModalOpen && (
        <Suspense fallback={null}>
          <FounderContactModal />
        </Suspense>
      )}
      {intelligenceModalOpen && (
        <Suspense fallback={null}>
          <InvestorIntelligenceModal />
        </Suspense>
      )}
      {arPreviewTarget && (
        <Suspense fallback={null}>
          <SpatialArViewerModal />
        </Suspense>
      )}
      <Suspense fallback={null}>
        <SpentaAiAssistant />
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <ResilientErrorBoundary scope="portal" contextLabel="Spenta Sovereign OS">
      <ThemeProvider>
        <StackProvider>
          <PortalShell />
        </StackProvider>
      </ThemeProvider>
    </ResilientErrorBoundary>
  );
}
