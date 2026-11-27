import type { NavTab } from '../data/spentaManifest';

export type PreloadPanelId =
  | 'stack-composer'
  | 'ai-assistant'
  | 'data-room'
  | 'founder-contact'
  | 'investor-intelligence'
  | 'spatial-ar'
  | 'ssot-briefing';
export type PreloadStatus = 'idle' | 'loading' | 'loaded';

interface PreloadEntry {
  status: PreloadStatus;
  promise?: Promise<unknown>;
}

interface NetworkInfoLike {
  saveData?: boolean;
  effectiveType?: string;
}

export const viewImporters = {
  'App Vault': () =>
    import('../components/SpentaBrainVault').then((m) => ({ default: m.SpentaBrainVault })),
  'Investor Briefing': () =>
    import('../components/InvestorBriefingView').then((m) => ({ default: m.InvestorBriefingView })),
  Infographics: () =>
    import('../components/InfographicsView').then((m) => ({ default: m.InfographicsView })),
  Financials: () =>
    import('../components/FinancialsView').then((m) => ({ default: m.FinancialsView })),
  'Spenta Core': () =>
    import('../components/SpentaCoreView').then((m) => ({ default: m.SpentaCoreView })),
  'The Brain': () =>
    import('../components/TheBrainView').then((m) => ({ default: m.TheBrainView })),
  'Pitch Deck': () =>
    import('../components/PitchDeckView').then((m) => ({ default: m.PitchDeckView })),
  Resources: () =>
    import('../components/ResourcesView').then((m) => ({ default: m.ResourcesView })),
} as const;

export const stackComposerImporter = () =>
  import('../components/StackComposerDrawer').then((m) => ({ default: m.StackComposerDrawer }));

export const aiAssistantImporter = () =>
  import('../components/SpentaAiAssistant').then((m) => ({ default: m.SpentaAiAssistant }));

export const dataRoomImporter = () =>
  import('../components/briefing/DataRoomModal').then((m) => ({ default: m.DataRoomModal }));

export const founderContactImporter = () =>
  import('../components/briefing/FounderContactModal').then((m) => ({
    default: m.FounderContactModal,
  }));

export const investorIntelligenceImporter = () =>
  import('../components/briefing/InvestorIntelligenceModal').then((m) => ({
    default: m.InvestorIntelligenceModal,
  }));

export const spatialArImporter = () =>
  import('../components/briefing/SpatialArViewerModal').then((m) => ({
    default: m.SpatialArViewerModal,
  }));

export const ssotPageImporter = () =>
  import('../modules/spenta-ssot/SpentaSsotPage').then((m) => ({
    default: m.SpentaSsotPage,
  }));

/**
 * Pure, testable speculative bundle preload controller that guarantees each
 * lazy view or panel bundle is prefetched at most once, skips redundant fetches
 * for already-mounted views, and respects browser Data Saver hints.
 */
export function createPreloadRegistry(options?: {
  shouldSkipSpeculative?: () => boolean;
}) {
  const entries = new Map<string, PreloadEntry>();

  const defaultSkipCheck = (): boolean => {
    if (typeof navigator === 'undefined') return false;
    if (navigator.onLine === false) return true;
    const conn = (navigator as Navigator & { connection?: NetworkInfoLike }).connection;
    if (!conn) return false;
    return Boolean(conn.saveData || conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g');
  };

  const shouldSkip = options?.shouldSkipSpeculative ?? defaultSkipCheck;

  function markLoaded(key: string): void {
    entries.set(key, { status: 'loaded' });
  }

  function getStatus(key: string): PreloadStatus {
    return entries.get(key)?.status ?? 'idle';
  }

  function preloadOnce(key: string, loader: () => Promise<unknown>): Promise<unknown> | null {
    const existing = entries.get(key);
    if (existing?.status === 'loaded') {
      return null;
    }
    if (existing?.status === 'loading' && existing.promise) {
      return existing.promise;
    }
    if (shouldSkip()) {
      return null;
    }

    const pending = Promise.resolve()
      .then(() => loader())
      .then((mod) => {
        entries.set(key, { status: 'loaded' });
        return mod;
      })
      .catch(() => {
        // Clear failed entry so subsequent user hover/focus or click can retry cleanly.
        entries.delete(key);
        return null;
      });

    entries.set(key, { status: 'loading', promise: pending });
    return pending;
  }

  function reset(): void {
    entries.clear();
  }

  return {
    markLoaded,
    getStatus,
    preloadOnce,
    reset,
  };
}

const defaultRegistry = createPreloadRegistry();

export function preloadTabView(tab: NavTab): void {
  const loader = viewImporters[tab];
  if (!loader) return;
  void defaultRegistry.preloadOnce(`tab:${tab}`, loader);
}

export function markTabViewLoaded(tab: NavTab): void {
  defaultRegistry.markLoaded(`tab:${tab}`);
}

export function getTabPreloadStatus(tab: NavTab): PreloadStatus {
  return defaultRegistry.getStatus(`tab:${tab}`);
}

export function preloadStackComposer(): void {
  void defaultRegistry.preloadOnce('panel:stack-composer', stackComposerImporter);
}

export function markStackComposerLoaded(): void {
  defaultRegistry.markLoaded('panel:stack-composer');
}

export function preloadAiAssistant(): void {
  void defaultRegistry.preloadOnce('panel:ai-assistant', aiAssistantImporter);
}

export function preloadDataRoom(): void {
  void defaultRegistry.preloadOnce('panel:data-room', dataRoomImporter);
}

export function preloadFounderContact(): void {
  void defaultRegistry.preloadOnce('panel:founder-contact', founderContactImporter);
}

export function preloadInvestorIntelligence(): void {
  void defaultRegistry.preloadOnce('panel:investor-intelligence', investorIntelligenceImporter);
}

export function preloadSpatialAr(): void {
  void defaultRegistry.preloadOnce('panel:spatial-ar', spatialArImporter);
}

export function preloadSsotBriefing(): void {
  void defaultRegistry.preloadOnce('panel:ssot-briefing', ssotPageImporter);
}

export function getTabPreloadHandlers(tab: NavTab) {
  const trigger = () => preloadTabView(tab);
  return {
    onMouseEnter: trigger,
    onFocus: trigger,
    onTouchStart: trigger,
  } as const;
}

export function getPanelPreloadHandlers(panel: PreloadPanelId) {
  const trigger = () => {
    switch (panel) {
      case 'stack-composer':
        preloadStackComposer();
        break;
      case 'ai-assistant':
        preloadAiAssistant();
        break;
      case 'data-room':
        preloadDataRoom();
        break;
      case 'founder-contact':
        preloadFounderContact();
        break;
      case 'investor-intelligence':
        preloadInvestorIntelligence();
        break;
      case 'spatial-ar':
        preloadSpatialAr();
        break;
      case 'ssot-briefing':
        preloadSsotBriefing();
        break;
    }
  };
  return {
    onMouseEnter: trigger,
    onFocus: trigger,
    onTouchStart: trigger,
  } as const;
}
