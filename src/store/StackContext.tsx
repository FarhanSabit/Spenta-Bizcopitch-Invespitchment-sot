import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  BRAIN_HUBS,
  NAV_TABS,
  NavTab,
  SERVER_TIERS,
  SPENTA_APPS,
  SPENTA_CONTACT_EMAIL,
  ServerTierId,
  SpentaApp,
  STARTER_RECIPES,
} from '../data/spentaManifest';

import {
  DEPLOYMENT_PROFILES,
  DeploymentProfileSpec,
  DeploymentTargetId,
} from '../data/deploymentProfiles';
import { PaletteMode, ThemeMode, useTheme } from '../context/ThemeContext';
import {
  SsotBriefingQuery,
  buildInvestorBriefingPath,
  buildShareableUrl,
  clearShareUrlParams,
  isInvestorBriefingPathname,
  ParsedShareSnapshot,
  parseShareUrlParams,
  parseSsotBriefingQuery,
} from '../utils/shareUrlCodec';
import {
  ActiveBrainSelection,
  LinkPathwayNodeOptions,
  PathwayBrainLinkTarget,
  resolveBrainHubForPathwayNode,
} from '../utils/pathwayBrainLink';
import {
  DEFAULT_WORKSPACE_SNAPSHOT_KEY,
  InvestorCalculatorScenario,
  InvestorFeedbackPriority,
  InvestorFeedbackRecord,
  LocalPersistenceService,
  OfflineContactInquiry,
  OfflineExportSummary,
  PERSISTENCE_STORES,
  PersistedInvestorCalculatorState,
  PersistenceStorageMetrics,
  SnapshotCleanupResult,
  UserWorkspaceSnapshot,
} from '../utils/LocalPersistenceService';
import {
  ArPreviewTarget,
  BRIEFING_CHAPTERS,
  DATA_ROOM_DOCUMENTS,
  DEFAULT_SSOT_FX_RATE,
  InvestorPersonaTrack,
  NINE_TIER_UNIT_ECONOMICS,
  SSOT_CASE_STUDIES,
  SsotCurrency,
  UNIFIED_SAFE_TERMS,
} from '../data/unifiedSsotData';
import {
  createPerformanceMonitor,
  INTERNAL_DEV_STORAGE_KEY,
  PerformanceMonitor,
  resolveInternalDeveloperFlag,
} from '../utils/performanceMonitor';

export type InvestorCalculatorState = Omit<PersistedInvestorCalculatorState, 'updatedAt'>;
export type SyncStatus = 'synced' | 'syncing' | 'offline';

export const DEFAULT_INVESTOR_CALCULATOR_STATE: InvestorCalculatorState = {
  scenario: 'conservative',
  growthMode: 'conservative',
  fxRate: DEFAULT_SSOT_FX_RATE,
  taxRate: 25,
  exitMultiple: 10,
  dilutionPct: 0,
  investmentK: 500,
  horizonYears: 5,
  compareGrowthScenarios: false,
  projectedChartMetric: 'value',
  subTab: 'pnl',
  mixPreset: 'fy31',
  mixScopeWeights: {
    one_time_builds: 24,
    recurring_saas: 44,
    managed_retainers: 14,
    ip_royalties: 12,
    captive_ecosystem: 6,
  },
  mixOpexRatioPct: 24,
};

function sanitizeInvestorCalculatorState(
  raw: Partial<InvestorCalculatorState> | null | undefined,
): InvestorCalculatorState {
  if (!raw || typeof raw !== 'object') {
    return {
      ...DEFAULT_INVESTOR_CALCULATOR_STATE,
      mixScopeWeights: { ...DEFAULT_INVESTOR_CALCULATOR_STATE.mixScopeWeights },
    };
  }
  return {
    scenario: raw.scenario === 'upside' ? 'upside' : 'conservative',
    growthMode: raw.growthMode === 'aggressive' ? 'aggressive' : 'conservative',
    fxRate:
      typeof raw.fxRate === 'number' && Number.isFinite(raw.fxRate)
        ? Math.max(100, Math.min(160, raw.fxRate))
        : DEFAULT_INVESTOR_CALCULATOR_STATE.fxRate,
    taxRate:
      typeof raw.taxRate === 'number' && Number.isFinite(raw.taxRate)
        ? Math.max(0, Math.min(45, raw.taxRate))
        : DEFAULT_INVESTOR_CALCULATOR_STATE.taxRate,
    exitMultiple:
      typeof raw.exitMultiple === 'number' && Number.isFinite(raw.exitMultiple)
        ? Math.max(6, Math.min(20, raw.exitMultiple))
        : DEFAULT_INVESTOR_CALCULATOR_STATE.exitMultiple,
    dilutionPct:
      typeof raw.dilutionPct === 'number' && Number.isFinite(raw.dilutionPct)
        ? Math.max(0, Math.min(40, raw.dilutionPct))
        : DEFAULT_INVESTOR_CALCULATOR_STATE.dilutionPct,
    investmentK:
      typeof raw.investmentK === 'number' && Number.isFinite(raw.investmentK)
        ? Math.max(25, Math.min(500, raw.investmentK))
        : DEFAULT_INVESTOR_CALCULATOR_STATE.investmentK,
    horizonYears:
      typeof raw.horizonYears === 'number' && Number.isFinite(raw.horizonYears)
        ? Math.max(1, Math.min(5, Math.round(raw.horizonYears)))
        : DEFAULT_INVESTOR_CALCULATOR_STATE.horizonYears,
    compareGrowthScenarios:
      typeof raw.compareGrowthScenarios === 'boolean'
        ? raw.compareGrowthScenarios
        : DEFAULT_INVESTOR_CALCULATOR_STATE.compareGrowthScenarios,
    projectedChartMetric: raw.projectedChartMetric === 'moic' ? 'moic' : 'value',
    subTab:
      raw.subTab === 'roi' || raw.subTab === 'maps' || raw.subTab === 'pnl'
        ? raw.subTab
        : DEFAULT_INVESTOR_CALCULATOR_STATE.subTab,
    mixPreset:
      raw.mixPreset === 'fy27' || raw.mixPreset === 'fy31' || raw.mixPreset === 'arr-heavy'
        ? raw.mixPreset
        : DEFAULT_INVESTOR_CALCULATOR_STATE.mixPreset,
    mixScopeWeights:
      raw.mixScopeWeights && typeof raw.mixScopeWeights === 'object'
        ? {
            ...DEFAULT_INVESTOR_CALCULATOR_STATE.mixScopeWeights,
            ...raw.mixScopeWeights,
          }
        : { ...DEFAULT_INVESTOR_CALCULATOR_STATE.mixScopeWeights },
    mixOpexRatioPct:
      typeof raw.mixOpexRatioPct === 'number' && Number.isFinite(raw.mixOpexRatioPct)
        ? raw.mixOpexRatioPct
        : DEFAULT_INVESTOR_CALCULATOR_STATE.mixOpexRatioPct,
  };
}

const STACK_STORAGE_KEY = 'spenta_sovereign_stack_v1';
const PROPOSALS_STORAGE_KEY = 'spenta_saved_proposals_v1';
const CORE_CONFIG_STORAGE_KEY = 'spenta_core_layer_configs_v1';
const CORE_AUDIT_STORAGE_KEY = 'spenta_core_audit_log_v1';
const DEPLOYMENT_TARGET_STORAGE_KEY = 'spenta_deployment_target_v1';
const MOBILE_GRID_STORAGE_KEY = 'spenta_mobile_grid_v1';
const NEURAL_CORE_STORAGE_KEY = 'spenta_neural_core_v2';
const ACTIVE_TAB_STORAGE_KEY = 'spenta_active_tab_v1';
const DEFAULT_SELECTED_IDS = ['icr_ops', 'genai_bi', 'mis_erp', 'cyber_sla'];

export type NeuralCoreSystem = 'spiral-galaxy' | 'solar-map';
export type NeuralSimulationSystem = 'spiral' | 'solar' | 'nebula';
export type NeuralGalaxyPresetId =
  | 'andromeda-spiral'
  | 'elliptical-dense'
  | 'active-starburst'
  | 'procedural-nebula';
export type NeuralObservatoryFinish = 'cosmos' | 'nocturnal' | 'nebula' | 'stone';
export type NeuralCameraPreset = 'overview' | 'operations' | 'experience' | 'ecliptic';
export type SolarConfigurationPresetId =
  | 'stable-circular'
  | 'highly-eccentric'
  | 'young-chaotic';
export type SolarViewModeId = 'overview' | 'ecliptic' | 'inner-core';

export interface NeuralCoreState {
  activeSystem: NeuralCoreSystem;
  solarTimeScale: number;
  galaxyRotationSpeed: number;
  galaxyPreset: NeuralGalaxyPresetId;
  observatoryFinish: NeuralObservatoryFinish | null;
  bloomIntensity: number;
  nebulaMode: boolean;
  nebulaDensity: number;
  particleTurbulence: number;
  starDensity: number;
  orbitalDecay: number;
  orbitalSpread: number;
  galaxyCameraPreset: NeuralCameraPreset;
  galaxyAutoRotate: boolean;
  solarOrbitalVelocity: number;
  solarOrbitalInclinationDeg: number;
  solarConfigurationPreset: SolarConfigurationPresetId;
  solarViewMode: SolarViewModeId;
  solarShowOrbits: boolean;
  solarAutoRotate: boolean;
  solarDayNightCycle: boolean;
  solarShowConstellations: boolean;
  solarShowResonance: boolean;
  solarFollowPlanet: boolean;
}

export const DEFAULT_NEURAL_CORE_STATE: NeuralCoreState = {
  activeSystem: 'solar-map',
  solarTimeScale: 1.0,
  galaxyRotationSpeed: 0.85,
  galaxyPreset: 'andromeda-spiral',
  observatoryFinish: null,
  bloomIntensity: 1.0,
  nebulaMode: false,
  nebulaDensity: 1.0,
  particleTurbulence: 0.75,
  starDensity: 1.0,
  orbitalDecay: 0.0,
  orbitalSpread: 0.65,
  galaxyCameraPreset: 'overview',
  galaxyAutoRotate: false,
  solarOrbitalVelocity: 1.0,
  solarOrbitalInclinationDeg: 6,
  solarConfigurationPreset: 'stable-circular',
  solarViewMode: 'overview',
  solarShowOrbits: true,
  solarAutoRotate: false,
  solarDayNightCycle: false,
  solarShowConstellations: false,
  solarShowResonance: false,
  solarFollowPlanet: false,
};

export type { PaletteMode, ThemeMode };
export type CoreLayerId = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6';
export type CoreAuditScope = CoreLayerId | 'Hardware';
export type CoreIsolationMode =
  | 'Air-Gapped On-Prem'
  | 'Private Sovereign VPC'
  | 'Hybrid Edge';
export type CorePolicyMode =
  | 'Strict OPA (>= 0.88 HITL)'
  | 'Balanced OPA (>= 0.85 HITL)'
  | 'Audit-Only Monitor';

export interface LayerConfig {
  isolationMode: CoreIsolationMode;
  policyMode: CorePolicyMode;
  teeEnabled: boolean;
  slaTarget: string;
}

export interface CoreAuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  layer: CoreAuditScope;
  action: string;
  field: string;
  previousValue: string;
  newValue: string;
}

export const DEFAULT_CORE_LAYER_CONFIGS: Record<CoreLayerId, LayerConfig> = {
  L6: {
    isolationMode: 'Private Sovereign VPC',
    policyMode: 'Strict OPA (>= 0.88 HITL)',
    teeEnabled: false,
    slaTarget: '99.95% UI uptime · <120ms TTI',
  },
  L5: {
    isolationMode: 'Air-Gapped On-Prem',
    policyMode: 'Strict OPA (>= 0.88 HITL)',
    teeEnabled: true,
    slaTarget: '0.88 HITL Gate · 100% immutable audit trace',
  },
  L4: {
    isolationMode: 'Private Sovereign VPC',
    policyMode: 'Balanced OPA (>= 0.85 HITL)',
    teeEnabled: false,
    slaTarget: '60–90 FPS XR · <18MB WebAR payloads',
  },
  L3: {
    isolationMode: 'Air-Gapped On-Prem',
    policyMode: 'Strict OPA (>= 0.88 HITL)',
    teeEnabled: true,
    slaTarget: '<30s/form ICR · 0 bytes cloud PII egress',
  },
  L2: {
    isolationMode: 'Air-Gapped On-Prem',
    policyMode: 'Strict OPA (>= 0.88 HITL)',
    teeEnabled: true,
    slaTarget: '<50ms edge inference · Hardware-enforced memory encryption',
  },
  L1: {
    isolationMode: 'Hybrid Edge',
    policyMode: 'Balanced OPA (>= 0.85 HITL)',
    teeEnabled: true,
    slaTarget: '80 BaaS Stations / 480 EVs · Sub-second MQTT ingest',
  },
};

function buildInitialAuditLog(): CoreAuditEntry[] {
  const now = Date.now();
  return [
    {
      id: 'audit_init_1',
      timestamp: new Date(now - 1000 * 60 * 18).toISOString(),
      actor: 'System Bootstrap',
      layer: 'L5',
      action: 'Enforced OPA Governance Gate',
      field: 'OPA Policy Mode',
      previousValue: 'Balanced OPA (>= 0.85 HITL)',
      newValue: 'Strict OPA (>= 0.88 HITL)',
    },
    {
      id: 'audit_init_2',
      timestamp: new Date(now - 1000 * 60 * 42).toISOString(),
      actor: 'Security Architect',
      layer: 'L2',
      action: 'Enabled Confidential Compute TEE',
      field: 'Hardware TEE (SEV-SNP/TDX)',
      previousValue: 'Disabled',
      newValue: 'Enabled (AMD SEV-SNP / Intel TDX)',
    },
    {
      id: 'audit_init_3',
      timestamp: new Date(now - 1000 * 60 * 95).toISOString(),
      actor: 'Infra Lead',
      layer: 'Hardware',
      action: 'Initialized Server PC Baseline',
      field: 'Target Server Tier',
      previousValue: 'Unassigned',
      newValue: 'TIER 3 — Spenta Budget Baseline ($8.5K–$10.5K)',
    },
  ];
}

export interface SavedProposal {
  id: string;
  createdAt: string;
  organization: string;
  contactName: string;
  email: string;
  deployment: 'On-Prem' | 'Private VPC' | 'Air-Gap' | 'SaaS';
  timeline: string;
  engagementModel?: string;
  commercialTier?: string;
  onboardingPath?: string;
  notes: string;
  appIds: string[];
  appNames: string[];
  estimatedBuildUsd: number;
  quarterlyRetainerUsd?: number;
  blendedGmPct: number;
  recommendedTier: ServerTierId;
}

export interface StackMetrics {
  /** Strictly one-time build setup CapEx (kept for legacy compatibility alongside oneTimeBuildUsd) */
  totalSetupUsd: number;
  oneTimeBuildUsd: number;
  quarterlyRetainerUsd: number;
  annualizedRetainerUsd: number;
  year1ContractUsd: number;
  buildWeightedGmPct: number;
  retainerWeightedGmPct: number;
  /** Revenue-weighted composite GM% across Year-1 contract value (one-time builds + 4x quarterly retainers) */
  blendedGmPct: number;
  tier: ServerTierId;
  activeLayers: Set<string>;
  synergyPairs: [string, string][];
  escalatedByCount: boolean;
}

export interface PendingNavFocus {
  type:
    | 'app'
    | 'slide'
    | 'infographic'
    | 'layer'
    | 'tier'
    | 'case'
    | 'blueprint'
    | 'studio'
    | 'showreel'
    | 'brain-hub'
    | 'briefing-section';
  id: string;
  appId?: string;
  open3D?: boolean;
  returnTab?: NavTab;
  returnLabel?: string;
  ts: number;
}

export interface ProjectArchitectureMetadata {
  project: string;
  updatedAt: string;
  infrastructureTarget: {
    id: DeploymentTargetId;
    environment: string;
    topology: string;
    transport: string;
    enclaveBoundary: string;
    latencyBudget: string;
    egressPolicy: string;
    compliancePosture: string;
    costPosture: string;
  };
  stackSizing: {
    activeModules: number;
    recommendedTier: string;
    estimatedBuildUsd: number;
    quarterlyRetainerUsd: number;
    year1ContractUsd: number;
  };
  governanceSummary: {
    teeEnabledLayers: number;
    strictOpaLayers: number;
    airGappedLayers: number;
    vpcLayers: number;
  };
  coreLayers: Record<CoreLayerId, LayerConfig>;
}

interface StackContextValue {
  theme: ThemeMode;
  paletteMode: PaletteMode;
  setTheme: (theme: ThemeMode) => void;
  setPaletteMode: (palette: PaletteMode) => void;
  toggleTheme: () => void;
  mobileGridVisible: boolean;
  setMobileGridVisible: (visible: boolean) => void;
  toggleMobileGrid: () => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  pendingNavFocus: PendingNavFocus | null;
  navigateToItem: (tab: NavTab, focus?: Omit<PendingNavFocus, 'ts'>) => void;
  clearPendingNavFocus: () => void;
  aiAssistantOpen: boolean;
  setAiAssistantOpen: (open: boolean) => void;
  selectedIds: string[];
  selectedApps: SpentaApp[];
  appMap: Record<string, SpentaApp>;
  toggleApp: (id: string) => void;
  applyRecipe: (recipeId: string) => void;
  clearStack: () => void;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  autoNotice: string | null;
  setAutoNotice: (msg: string | null) => void;
  hitlConfidence: number;
  setHitlConfidence: (val: number) => void;
  stackMetrics: StackMetrics;
  savedProposals: SavedProposal[];
  saveProposal: (input: Omit<SavedProposal, 'id' | 'createdAt' | 'appIds' | 'appNames' | 'estimatedBuildUsd' | 'quarterlyRetainerUsd' | 'blendedGmPct' | 'recommendedTier'>) => SavedProposal;
  deleteProposal: (id: string) => void;
  exportStackJson: (extra?: Record<string, unknown>) => void;
  buildExecutiveBrief: () => string;
  buildMailtoHref: (subject?: string, bodyExtra?: string) => string;
  deploymentTarget: DeploymentTargetId;
  deploymentProfile: DeploymentProfileSpec;
  projectArchitectureMetadata: ProjectArchitectureMetadata;
  setDeploymentTarget: (target: DeploymentTargetId, actor?: string) => void;
  coreLayerConfigs: Record<CoreLayerId, LayerConfig>;
  coreAuditLog: CoreAuditEntry[];
  updateCoreLayerConfig: (
    layerId: CoreLayerId,
    patch: Partial<LayerConfig>,
    actionLabel?: string,
    actor?: string,
  ) => void;
  resetCoreLayerConfig: (layerId: CoreLayerId, actor?: string) => void;
  logCoreAuditEvent: (entry: Omit<CoreAuditEntry, 'id' | 'timestamp'>) => void;
  clearCoreAuditLog: () => void;
  sharedSnapshotSummary: string | null;
  dismissSharedSnapshot: () => void;
  resetToLocalDefaults: () => void;
  buildShareUrl: (overrides?: {
    tab?: NavTab;
    hubId?: string | null;
    brainMode?: '3d' | 'radar';
  }) => string;
  activeBrainSelection: ActiveBrainSelection;
  selectBrainHub: (
    hubId: string,
    options?: {
      appId?: string;
      source?: ActiveBrainSelection['source'];
      pathwayBranchId?: string;
      pathwayNodeCode?: string;
      pathwayNodeTitle?: string;
    },
  ) => void;
  linkPathwayNodeToBrain: (options: LinkPathwayNodeOptions) => PathwayBrainLinkTarget;
  neuralCoreState: NeuralCoreState;
  activeNeuralSystem: NeuralCoreSystem;
  setActiveNeuralSystem: (system: NeuralCoreSystem) => void;
  toggleNeuralSystem: () => void;
  activeSimulationSystem: NeuralSimulationSystem;
  setActiveSimulationSystem: (system: NeuralSimulationSystem) => void;
  solarTimeScale: number;
  setSolarTimeScale: (scale: number) => void;
  galaxyRotationSpeed: number;
  setGalaxyRotationSpeed: (speed: number) => void;
  neuralGalaxyPreset: NeuralGalaxyPresetId;
  setNeuralGalaxyPreset: (preset: NeuralGalaxyPresetId) => void;
  neuralObservatoryFinish: NeuralObservatoryFinish | null;
  setNeuralObservatoryFinish: (finish: NeuralObservatoryFinish) => void;
  neuralBloomIntensity: number;
  setNeuralBloomIntensity: (intensity: number) => void;
  nebulaMode: boolean;
  setNebulaMode: (enabled: boolean) => void;
  toggleNebulaMode: () => void;
  nebulaDensity: number;
  setNebulaDensity: (density: number) => void;
  particleTurbulence: number;
  setParticleTurbulence: (turbulence: number) => void;
  starDensity: number;
  setStarDensity: (density: number) => void;
  orbitalDecay: number;
  setOrbitalDecay: (decay: number) => void;
  orbitalSpread: number;
  setOrbitalSpread: (spread: number) => void;
  galaxyCameraPreset: NeuralCameraPreset;
  setGalaxyCameraPreset: (preset: NeuralCameraPreset) => void;
  galaxyAutoRotate: boolean;
  setGalaxyAutoRotate: (enabled: boolean) => void;
  solarOrbitalVelocity: number;
  setSolarOrbitalVelocity: (vel: number) => void;
  solarOrbitalInclinationDeg: number;
  setSolarOrbitalInclinationDeg: (deg: number) => void;
  solarConfigurationPreset: SolarConfigurationPresetId;
  setSolarConfigurationPreset: (preset: SolarConfigurationPresetId) => void;
  solarViewMode: SolarViewModeId;
  setSolarViewMode: (mode: SolarViewModeId) => void;
  solarShowOrbits: boolean;
  setSolarShowOrbits: (show: boolean) => void;
  solarAutoRotate: boolean;
  setSolarAutoRotate: (enabled: boolean) => void;
  solarDayNightCycle: boolean;
  setSolarDayNightCycle: (enabled: boolean) => void;
  solarShowConstellations: boolean;
  setSolarShowConstellations: (enabled: boolean) => void;
  solarShowResonance: boolean;
  setSolarShowResonance: (enabled: boolean) => void;
  solarFollowPlanet: boolean;
  setSolarFollowPlanet: (enabled: boolean) => void;
  resetNeuralCoreState: () => void;
  investorCalculatorState: InvestorCalculatorState;
  investorCalculatorHydrated: boolean;
  updateInvestorCalculatorState: (
    patch:
      | Partial<InvestorCalculatorState>
      | ((prev: InvestorCalculatorState) => InvestorCalculatorState),
  ) => void;
  resetInvestorCalculatorState: () => void;
  savedCalculatorScenarios: InvestorCalculatorScenario[];
  saveCalculatorScenario: (name: string, description?: string) => Promise<InvestorCalculatorScenario>;
  applyCalculatorScenario: (id: string) => void;
  deleteCalculatorScenario: (id: string) => Promise<void>;
  workspaceSnapshots: UserWorkspaceSnapshot[];
  saveWorkspaceSnapshot: (name: string) => Promise<UserWorkspaceSnapshot>;
  restoreWorkspaceSnapshot: (id: string) => void;
  deleteWorkspaceSnapshot: (id: string) => Promise<void>;
  // Unified SSOT & Investor Briefing engagement state
  currency: SsotCurrency;
  setCurrency: (currency: SsotCurrency) => void;
  personaTrack: InvestorPersonaTrack;
  setPersonaTrack: (track: InvestorPersonaTrack) => void;
  bookmarkedDocIds: string[];
  toggleDocBookmark: (docId: string) => void;
  investorFeedback: InvestorFeedbackRecord[];
  addInvestorFeedback: (input: {
    section: string;
    priority: InvestorFeedbackPriority;
    sentimentScore: number;
    text: string;
  }) => Promise<InvestorFeedbackRecord>;
  replyInvestorFeedback: (feedbackId: string, replyText: string) => Promise<void>;
  deleteInvestorFeedback: (id: string) => Promise<void>;
  contactInquiries: OfflineContactInquiry[];
  submitContactInquiry: (input: {
    name: string;
    organization: string;
    email: string;
    topic: string;
    checkSize: string;
    message: string;
  }) => Promise<OfflineContactInquiry>;
  deleteContactInquiry: (id: string) => Promise<void>;
  dataRoomOpen: boolean;
  setDataRoomOpen: (open: boolean) => void;
  contactModalOpen: boolean;
  contactModalTopic: string;
  openContactModal: (topic?: string) => void;
  closeContactModal: () => void;
  intelligenceModalOpen: boolean;
  intelligenceFocusSection: string;
  openIntelligenceModal: (section?: string) => void;
  closeIntelligenceModal: () => void;
  arPreviewTarget: ArPreviewTarget | null;
  openArPreview: (target: ArPreviewTarget) => void;
  closeArPreview: () => void;
  loadCaseStudyStack: (appIds: string[], label: string) => void;
  openBriefingSection: (sectionId: string) => void;
  isInvestorBriefingRoute: boolean;
  ssotQueryState: SsotBriefingQuery;
  setSsotQueryState: React.Dispatch<React.SetStateAction<SsotBriefingQuery>>;
  navigateToInvestorBriefing: (query?: SsotBriefingQuery) => void;
  exitInvestorBriefing: (targetTab?: NavTab) => void;
  // Offline persistence sync telemetry & storage management
  persistenceService: LocalPersistenceService;
  syncStatus: SyncStatus;
  isOnline: boolean;
  lastSyncedAt: string | null;
  storageRevision: number;
  forceSync: () => Promise<boolean>;
  getStorageMetrics: () => Promise<PersistenceStorageMetrics>;
  clearLocalCachedData: () => Promise<void>;
  exportOfflineBackup: () => Promise<OfflineExportSummary>;
  autoCleanupEnabled: boolean;
  setAutoCleanupEnabled: (enabled: boolean) => void;
  lastAutoCleanupAt: string | null;
  lastAutoCleanupPurgedCount: number;
  runSnapshotCleanup: (maxAgeDays?: number) => Promise<SnapshotCleanupResult>;
  investorBriefingCachedAt: string | null;
  memoryStats: {
    totalMemoryBytes: number;
    scenariosMemoryBytes: number;
    snapshotMemoryBytes: number;
    browserStorageUsageBytes: number;
    browserStorageQuotaBytes: number | null;
    quotaUsagePct: number;
  };
  syncConflictState: {
    open: boolean;
    title: string;
    detail: string;
    localRevision: number;
    serverRevision: number;
  } | null;
  triggerSyncConflictSimulation: () => void;
  resolveSyncConflict: (choice: 'local' | 'server') => Promise<void>;
  // Internal developer performance & memory telemetry
  performanceMonitor: PerformanceMonitor;
  onProfilerRender: React.ProfilerOnRenderCallback;
  isInternalDeveloper: boolean;
  setInternalDeveloperMode: (enabled: boolean) => void;
  toggleInternalDeveloperMode: () => void;
}

const StackContext = createContext<StackContextValue | null>(null);

function loadStoredIds(): string[] {
  try {
    const raw = window.localStorage.getItem(STACK_STORAGE_KEY);
    if (!raw) return DEFAULT_SELECTED_IDS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const validSet = new Set(SPENTA_APPS.map((a) => a.id));
      const clean = parsed.filter((id): id is string => typeof id === 'string' && validSet.has(id));
      return clean;
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_SELECTED_IDS;
}

function loadStoredProposals(): SavedProposal[] {
  try {
    const raw = window.localStorage.getItem(PROPOSALS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // ignore storage errors
  }
  return [];
}

function loadStoredCoreConfigs(): Record<CoreLayerId, LayerConfig> {
  try {
    const raw = window.localStorage.getItem(CORE_CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_CORE_LAYER_CONFIGS;
    const parsed = JSON.parse(raw) as Partial<Record<CoreLayerId, Partial<LayerConfig>>>;
    const merged = { ...DEFAULT_CORE_LAYER_CONFIGS };
    (['L1', 'L2', 'L3', 'L4', 'L5', 'L6'] as CoreLayerId[]).forEach((layerId) => {
      if (parsed && parsed[layerId]) {
        merged[layerId] = { ...DEFAULT_CORE_LAYER_CONFIGS[layerId], ...parsed[layerId] };
      }
    });
    return merged;
  } catch {
    // ignore storage errors
  }
  return DEFAULT_CORE_LAYER_CONFIGS;
}

function loadStoredAuditLog(): CoreAuditEntry[] {
  try {
    const raw = window.localStorage.getItem(CORE_AUDIT_STORAGE_KEY);
    if (!raw) return buildInitialAuditLog();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as CoreAuditEntry[];
  } catch {
    // ignore storage errors
  }
  return buildInitialAuditLog();
}

function loadStoredDeploymentTarget(): DeploymentTargetId {
  try {
    const raw = window.localStorage.getItem(DEPLOYMENT_TARGET_STORAGE_KEY);
    if (raw === 'on-prem' || raw === 'private-vpc' || raw === 'air-gapped') return raw;
  } catch {
    // ignore storage errors
  }
  return 'on-prem';
}

function loadStoredMobileGridVisible(): boolean {
  try {
    return window.localStorage.getItem(MOBILE_GRID_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function clampSolarTimeScale(val: number): number {
  if (!Number.isFinite(val)) return DEFAULT_NEURAL_CORE_STATE.solarTimeScale;
  return Math.round(Math.max(0.1, Math.min(5.0, val)) * 10) / 10;
}

function clampGalaxyRotationSpeed(val: number): number {
  if (!Number.isFinite(val)) return DEFAULT_NEURAL_CORE_STATE.galaxyRotationSpeed;
  return Math.round(Math.max(0, Math.min(2.5, val)) * 100) / 100;
}

function clampBloomIntensity(val: number): number {
  if (!Number.isFinite(val)) return DEFAULT_NEURAL_CORE_STATE.bloomIntensity;
  return Math.round(Math.max(0, Math.min(2.0, val)) * 100) / 100;
}

function clampNebulaDensity(val: number): number {
  if (!Number.isFinite(val)) return DEFAULT_NEURAL_CORE_STATE.nebulaDensity;
  return Math.round(Math.max(0.2, Math.min(2.0, val)) * 100) / 100;
}

function clampParticleTurbulence(val: number): number {
  if (!Number.isFinite(val)) return DEFAULT_NEURAL_CORE_STATE.particleTurbulence;
  return Math.round(Math.max(0, Math.min(2.0, val)) * 100) / 100;
}

function clampStarDensity(val: number): number {
  if (!Number.isFinite(val)) return DEFAULT_NEURAL_CORE_STATE.starDensity;
  return Math.round(Math.max(0.2, Math.min(1.0, val)) * 100) / 100;
}

function clampOrbitalDecay(val: number): number {
  if (!Number.isFinite(val)) return DEFAULT_NEURAL_CORE_STATE.orbitalDecay;
  return Math.round(Math.max(0, Math.min(1.0, val)) * 100) / 100;
}

function clampOrbitalSpread(val: number): number {
  if (!Number.isFinite(val)) return DEFAULT_NEURAL_CORE_STATE.orbitalSpread;
  return Math.round(Math.max(0.25, Math.min(1.5, val)) * 100) / 100;
}

function clampSolarOrbitalVelocity(val: number): number {
  if (!Number.isFinite(val)) return DEFAULT_NEURAL_CORE_STATE.solarOrbitalVelocity;
  return Math.round(Math.max(0, Math.min(4.0, val)) * 100) / 100;
}

function clampSolarOrbitalInclinationDeg(val: number): number {
  if (!Number.isFinite(val)) return DEFAULT_NEURAL_CORE_STATE.solarOrbitalInclinationDeg;
  return Math.round(Math.max(0, Math.min(45, val)));
}

function loadStoredActiveTab(): NavTab {
  try {
    const raw = window.localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
    if (raw && (NAV_TABS as string[]).includes(raw)) {
      return raw as NavTab;
    }
  } catch {
    // ignore storage errors
  }
  return 'App Vault';
}

function loadStoredNeuralCoreState(): NeuralCoreState {
  try {
    const raw = window.localStorage.getItem(NEURAL_CORE_STORAGE_KEY);
    if (!raw) return DEFAULT_NEURAL_CORE_STATE;
    const parsed = JSON.parse(raw) as Partial<NeuralCoreState>;
    const activeSystem: NeuralCoreSystem =
      parsed.activeSystem === 'spiral-galaxy' ? 'spiral-galaxy' : 'solar-map';
    const galaxyPreset: NeuralGalaxyPresetId =
      parsed.galaxyPreset === 'elliptical-dense' ||
      parsed.galaxyPreset === 'active-starburst' ||
      parsed.galaxyPreset === 'procedural-nebula'
        ? parsed.galaxyPreset
        : 'andromeda-spiral';
    const observatoryFinish: NeuralObservatoryFinish | null =
      parsed.observatoryFinish === 'cosmos' ||
      parsed.observatoryFinish === 'nocturnal' ||
      parsed.observatoryFinish === 'nebula' ||
      parsed.observatoryFinish === 'stone'
        ? parsed.observatoryFinish
        : null;
    const galaxyCameraPreset: NeuralCameraPreset =
      parsed.galaxyCameraPreset === 'operations' ||
      parsed.galaxyCameraPreset === 'experience' ||
      parsed.galaxyCameraPreset === 'ecliptic'
        ? parsed.galaxyCameraPreset
        : 'overview';
    const solarConfigurationPreset: SolarConfigurationPresetId =
      parsed.solarConfigurationPreset === 'highly-eccentric' ||
      parsed.solarConfigurationPreset === 'young-chaotic'
        ? parsed.solarConfigurationPreset
        : 'stable-circular';
    const solarViewMode: SolarViewModeId =
      parsed.solarViewMode === 'ecliptic' || parsed.solarViewMode === 'inner-core'
        ? parsed.solarViewMode
        : 'overview';
    return {
      activeSystem,
      solarTimeScale: clampSolarTimeScale(parsed.solarTimeScale ?? DEFAULT_NEURAL_CORE_STATE.solarTimeScale),
      galaxyRotationSpeed: clampGalaxyRotationSpeed(
        parsed.galaxyRotationSpeed ?? DEFAULT_NEURAL_CORE_STATE.galaxyRotationSpeed,
      ),
      galaxyPreset,
      observatoryFinish,
      bloomIntensity: clampBloomIntensity(parsed.bloomIntensity ?? DEFAULT_NEURAL_CORE_STATE.bloomIntensity),
      nebulaMode: Boolean(parsed.nebulaMode),
      nebulaDensity: clampNebulaDensity(parsed.nebulaDensity ?? DEFAULT_NEURAL_CORE_STATE.nebulaDensity),
      particleTurbulence: clampParticleTurbulence(
        parsed.particleTurbulence ?? DEFAULT_NEURAL_CORE_STATE.particleTurbulence,
      ),
      starDensity: clampStarDensity(parsed.starDensity ?? DEFAULT_NEURAL_CORE_STATE.starDensity),
      orbitalDecay: clampOrbitalDecay(parsed.orbitalDecay ?? DEFAULT_NEURAL_CORE_STATE.orbitalDecay),
      orbitalSpread: clampOrbitalSpread(parsed.orbitalSpread ?? DEFAULT_NEURAL_CORE_STATE.orbitalSpread),
      galaxyCameraPreset,
      galaxyAutoRotate: Boolean(parsed.galaxyAutoRotate),
      solarOrbitalVelocity: clampSolarOrbitalVelocity(
        parsed.solarOrbitalVelocity ?? DEFAULT_NEURAL_CORE_STATE.solarOrbitalVelocity,
      ),
      solarOrbitalInclinationDeg: clampSolarOrbitalInclinationDeg(
        parsed.solarOrbitalInclinationDeg ?? DEFAULT_NEURAL_CORE_STATE.solarOrbitalInclinationDeg,
      ),
      solarConfigurationPreset,
      solarViewMode,
      solarShowOrbits:
        typeof parsed.solarShowOrbits === 'boolean'
          ? parsed.solarShowOrbits
          : DEFAULT_NEURAL_CORE_STATE.solarShowOrbits,
      solarAutoRotate: Boolean(parsed.solarAutoRotate),
      solarDayNightCycle: Boolean(parsed.solarDayNightCycle),
      solarShowConstellations: Boolean(parsed.solarShowConstellations),
      solarShowResonance: Boolean(parsed.solarShowResonance),
      solarFollowPlanet: Boolean(parsed.solarFollowPlanet),
    };
  } catch {
    return DEFAULT_NEURAL_CORE_STATE;
  }
}

export function StackProvider({ children }: { children: React.ReactNode }) {
  const providerRenderStartMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const providerRenderCountRef = useRef<number>(0);
  const performanceMonitor = useMemo(() => createPerformanceMonitor(), []);
  const [isInternalDeveloper, setIsInternalDeveloper] = useState<boolean>(
    () => resolveInternalDeveloperFlag().isInternalDeveloper,
  );

  const setInternalDeveloperMode = useCallback(
    (enabled: boolean) => {
      setIsInternalDeveloper(enabled);
      try {
        window.localStorage.setItem(INTERNAL_DEV_STORAGE_KEY, enabled ? '1' : '0');
      } catch {
        // ignore storage errors
      }
      if (enabled) {
        performanceMonitor.sampleMemory(true);
      }
    },
    [performanceMonitor],
  );

  const toggleInternalDeveloperMode = useCallback(() => {
    setIsInternalDeveloper((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(INTERNAL_DEV_STORAGE_KEY, next ? '1' : '0');
      } catch {
        // ignore storage errors
      }
      if (next) {
        performanceMonitor.sampleMemory(true);
      }
      return next;
    });
  }, [performanceMonitor]);

  const onProfilerRender = useCallback<React.ProfilerOnRenderCallback>(
    (id, phase, actualDuration, baseDuration, _startTime, commitTime) => {
      if (id === 'SystemHealthFooter') return;
      const epochTimestamp =
        typeof performance !== 'undefined' && typeof performance.timeOrigin === 'number'
          ? performance.timeOrigin + commitTime
          : Date.now();
      performanceMonitor.recordRender(id, phase, actualDuration, baseDuration, epochTimestamp);
    },
    [performanceMonitor],
  );

  useLayoutEffect(() => {
    const endMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const durationMs = Math.max(0.05, endMs - providerRenderStartMs);
    const phase = providerRenderCountRef.current === 0 ? 'mount' : 'update';
    providerRenderCountRef.current += 1;
    performanceMonitor.recordRender('StackProvider', phase, durationMs, durationMs);
  });

  useEffect(() => {
    if (!isInternalDeveloper) return;
    performanceMonitor.sampleMemory(true);
    const timer = window.setInterval(() => {
      performanceMonitor.sampleMemory(true);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [isInternalDeveloper, performanceMonitor]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        toggleInternalDeveloperMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleInternalDeveloperMode]);

  const { theme, paletteMode, setTheme, setPaletteMode, toggleTheme } = useTheme();
  const [mobileGridVisible, setMobileGridVisible] = useState<boolean>(loadStoredMobileGridVisible);

  const toggleMobileGrid = useCallback(() => {
    setMobileGridVisible((prev) => !prev);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('spenta-mobile-grid-on', mobileGridVisible);
    try {
      window.localStorage.setItem(MOBILE_GRID_STORAGE_KEY, String(mobileGridVisible));
    } catch {
      // ignore storage errors
    }
  }, [mobileGridVisible]);
  const [initialShareSnapshot] = useState<ParsedShareSnapshot | null>(() => parseShareUrlParams());
  const [sharedSnapshotSummary, setSharedSnapshotSummary] = useState<string | null>(
    () => initialShareSnapshot?.summary ?? null,
  );
  const [commandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<NavTab>(
    () => initialShareSnapshot?.activeTab ?? loadStoredActiveTab(),
  );
  const [pendingNavFocus, setPendingNavFocus] = useState<PendingNavFocus | null>(() => {
    if (initialShareSnapshot?.hubId) {
      return {
        type: 'brain-hub',
        id: initialShareSnapshot.hubId,
        open3D: initialShareSnapshot.brainMode !== 'radar',
        ts: Date.now(),
      };
    }
    return null;
  });
  const [activeBrainSelection, setActiveBrainSelection] = useState<ActiveBrainSelection>(() => {
    const initialHubId = initialShareSnapshot?.hubId;
    if (initialHubId && BRAIN_HUBS.some((h) => h.id === initialHubId)) {
      const firstApp = SPENTA_APPS.find((a) => a.hubId === initialHubId);
      return {
        hubId: initialHubId,
        appId: firstApp?.id,
        source: 'url',
        nonce: 1,
      };
    }
    return {
      hubId: 'fintech',
      appId: 'icr_ops',
      source: 'brain',
      nonce: 0,
    };
  });
  const [aiAssistantOpen, setAiAssistantOpen] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    () => initialShareSnapshot?.selectedIds ?? loadStoredIds(),
  );
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [autoNotice, setAutoNotice] = useState<string | null>(null);
  const [hitlConfidence, setHitlConfidence] = useState<number>(
    () => initialShareSnapshot?.hitlConfidence ?? 0.91,
  );
  const [savedProposals, setSavedProposals] = useState<SavedProposal[]>(() => loadStoredProposals());
  const [deploymentTarget, setDeploymentTargetState] = useState<DeploymentTargetId>(
    () => initialShareSnapshot?.deploymentTarget ?? loadStoredDeploymentTarget(),
  );
  const [coreLayerConfigs, setCoreLayerConfigs] = useState<Record<CoreLayerId, LayerConfig>>(() => {
    if (initialShareSnapshot?.deploymentTarget) {
      const presets = DEPLOYMENT_PROFILES[initialShareSnapshot.deploymentTarget].layerPresets;
      return {
        L1: { ...presets.L1 },
        L2: { ...presets.L2 },
        L3: { ...presets.L3 },
        L4: { ...presets.L4 },
        L5: { ...presets.L5 },
        L6: { ...presets.L6 },
      };
    }
    return loadStoredCoreConfigs();
  });
  const [architectureUpdatedAt, setArchitectureUpdatedAt] = useState<string>(() =>
    new Date().toISOString(),
  );
  const [coreAuditLog, setCoreAuditLog] = useState<CoreAuditEntry[]>(() => loadStoredAuditLog());
  const [neuralCoreState, setNeuralCoreState] = useState<NeuralCoreState>(() =>
    loadStoredNeuralCoreState(),
  );
  const persistenceService = useMemo(() => new LocalPersistenceService(), []);
  const initialLocalStorageFlagsRef = useRef<{
    hasTab: boolean;
    hasStack: boolean;
    hasDeploy: boolean;
    hasNeural: boolean;
  } | null>(null);
  if (initialLocalStorageFlagsRef.current === null) {
    try {
      initialLocalStorageFlagsRef.current = {
        hasTab: Boolean(window.localStorage.getItem(ACTIVE_TAB_STORAGE_KEY)),
        hasStack: Boolean(window.localStorage.getItem(STACK_STORAGE_KEY)),
        hasDeploy: Boolean(window.localStorage.getItem(DEPLOYMENT_TARGET_STORAGE_KEY)),
        hasNeural: Boolean(window.localStorage.getItem(NEURAL_CORE_STORAGE_KEY)),
      };
    } catch {
      initialLocalStorageFlagsRef.current = {
        hasTab: false,
        hasStack: false,
        hasDeploy: false,
        hasNeural: false,
      };
    }
  }

  const deploymentProfile = DEPLOYMENT_PROFILES[deploymentTarget];

  const [isInvestorBriefingRoute, setIsInvestorBriefingRoute] = useState<boolean>(() =>
    isInvestorBriefingPathname(),
  );
  const [ssotQueryState, setSsotQueryState] = useState<SsotBriefingQuery>(() =>
    isInvestorBriefingPathname() ? parseSsotBriefingQuery() : {},
  );

  const navigateToItem = useCallback((tab: NavTab, focus?: Omit<PendingNavFocus, 'ts'>) => {
    if (isInvestorBriefingPathname() && tab !== 'Investor Briefing') {
      try {
        window.history.pushState({}, '', '/');
      } catch {
        // ignore history error
      }
      setIsInvestorBriefingRoute(false);
    }
    setActiveTab(tab);
    setPendingNavFocus(focus ? { ...focus, ts: Date.now() } : null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const clearPendingNavFocus = useCallback(() => setPendingNavFocus(null), []);

  const selectBrainHub = useCallback<StackContextValue['selectBrainHub']>((hubId, options) => {
    const validHub = BRAIN_HUBS.find((h) => h.id === hubId) ?? BRAIN_HUBS[0];
    const resolvedAppId =
      options?.appId && SPENTA_APPS.some((a) => a.id === options.appId)
        ? options.appId
        : SPENTA_APPS.find((a) => a.hubId === validHub.id)?.id;

    setActiveBrainSelection((prev) => ({
      hubId: validHub.id,
      appId: resolvedAppId,
      source: options?.source ?? 'brain',
      pathwayBranchId: options?.pathwayBranchId,
      pathwayNodeCode: options?.pathwayNodeCode,
      pathwayNodeTitle: options?.pathwayNodeTitle,
      nonce: prev.nonce + 1,
    }));
  }, []);

  const linkPathwayNodeToBrain = useCallback<StackContextValue['linkPathwayNodeToBrain']>(
    (options) => {
      const target = resolveBrainHubForPathwayNode(options);
      setActiveBrainSelection((prev) => ({
        hubId: target.hubId,
        appId: target.appId,
        source: 'pathway',
        pathwayBranchId: options.branchId,
        pathwayNodeCode: options.nodeCode,
        pathwayNodeTitle: options.nodeTitle,
        nonce: prev.nonce + 1,
      }));

      if (options.navigateToBrain) {
        navigateToItem('The Brain', {
          type: 'brain-hub',
          id: target.hubId,
          appId: target.appId,
          open3D: options.open3D !== false,
          returnTab: options.returnTab,
          returnLabel: options.returnLabel,
        });
      }

      return target;
    },
    [navigateToItem],
  );

  const appMap = useMemo(
    () => Object.fromEntries(SPENTA_APPS.map((app) => [app.id, app])) as Record<string, SpentaApp>,
    [],
  );

  const [investorCalculatorState, setInvestorCalculatorState] = useState<InvestorCalculatorState>(
    () => ({
      ...DEFAULT_INVESTOR_CALCULATOR_STATE,
      mixScopeWeights: { ...DEFAULT_INVESTOR_CALCULATOR_STATE.mixScopeWeights },
    }),
  );
  const [investorCalculatorHydrated, setInvestorCalculatorHydrated] = useState<boolean>(false);
  const [investorBriefingCachedAt, setInvestorBriefingCachedAt] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(() => persistenceService.getSyncState().isOnline);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => persistenceService.getSyncState().lastSyncedAt);
  const [storageRevision, setStorageRevision] = useState<number>(() => persistenceService.getSyncState().revision);
  const [observedSyncStatus, setObservedSyncStatus] = useState<SyncStatus>(() => persistenceService.getSyncState().status);
  const activeSyncOpsRef = useRef<number>(0);
  const clearGuardUntilRef = useRef<number>(0);
  const pendingOfflineSyncRef = useRef<boolean>(false);
  const forceSyncRef = useRef<(() => Promise<boolean>) | null>(null);

  useEffect(() => {
    return persistenceService.subscribe((snapshot) => {
      setIsOnline(snapshot.isOnline);
      setObservedSyncStatus(snapshot.status);
      if (snapshot.lastSyncedAt) {
        setLastSyncedAt(snapshot.lastSyncedAt);
      }
      setStorageRevision(snapshot.revision);
    });
  }, [persistenceService]);

  const runTrackedPersistence = useCallback(
    async <T,>(task: () => Promise<T>, options?: { minVisualMs?: number }): Promise<T> => {
      activeSyncOpsRef.current += 1;
      setIsSyncing(true);
      const startedAt = Date.now();
      try {
        const result = await task();
        if (options?.minVisualMs) {
          const elapsed = Date.now() - startedAt;
          if (elapsed < options.minVisualMs) {
            await new Promise((resolve) => window.setTimeout(resolve, options.minVisualMs! - elapsed));
          }
        }
        setLastSyncedAt(new Date().toISOString());
        setStorageRevision((rev) => rev + 1);
        return result;
      } finally {
        activeSyncOpsRef.current = Math.max(0, activeSyncOpsRef.current - 1);
        if (activeSyncOpsRef.current === 0) {
          setIsSyncing(false);
        }
      }
    },
    [],
  );

  const syncStatus: SyncStatus = !isOnline
    ? 'offline'
    : isSyncing || observedSyncStatus === 'syncing'
      ? 'syncing'
      : 'synced';

  useEffect(() => {
    if (!investorCalculatorHydrated) return;
    try {
      window.localStorage.setItem(STACK_STORAGE_KEY, JSON.stringify(selectedIds));
    } catch {
      // ignore storage quota errors
    }
  }, [investorCalculatorHydrated, selectedIds]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PROPOSALS_STORAGE_KEY, JSON.stringify(savedProposals));
    } catch {
      // ignore storage quota errors
    }
  }, [savedProposals]);

  useEffect(() => {
    try {
      window.localStorage.setItem(CORE_CONFIG_STORAGE_KEY, JSON.stringify(coreLayerConfigs));
    } catch {
      // ignore storage quota errors
    }
  }, [coreLayerConfigs]);

  useEffect(() => {
    try {
      window.localStorage.setItem(CORE_AUDIT_STORAGE_KEY, JSON.stringify(coreAuditLog));
    } catch {
      // ignore storage quota errors
    }
  }, [coreAuditLog]);

  useEffect(() => {
    if (!investorCalculatorHydrated) return;
    try {
      window.localStorage.setItem(DEPLOYMENT_TARGET_STORAGE_KEY, deploymentTarget);
    } catch {
      // ignore storage quota errors
    }
  }, [investorCalculatorHydrated, deploymentTarget]);

  useEffect(() => {
    if (!autoNotice) return;
    const timer = window.setTimeout(() => setAutoNotice(null), 5500);
    return () => window.clearTimeout(timer);
  }, [autoNotice]);

  useEffect(() => {
    if (!investorCalculatorHydrated) return;
    try {
      window.localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTab);
    } catch {
      // ignore storage quota errors
    }
  }, [investorCalculatorHydrated, activeTab]);

  useEffect(() => {
    if (!investorCalculatorHydrated) return;
    try {
      window.localStorage.setItem(NEURAL_CORE_STORAGE_KEY, JSON.stringify(neuralCoreState));
    } catch {
      // ignore storage quota errors
    }
  }, [investorCalculatorHydrated, neuralCoreState]);
  const [savedCalculatorScenarios, setSavedCalculatorScenarios] = useState<
    InvestorCalculatorScenario[]
  >([]);
  const [workspaceSnapshots, setWorkspaceSnapshots] = useState<UserWorkspaceSnapshot[]>([]);
  const [currency, setCurrency] = useState<SsotCurrency>('USD');
  const [personaTrack, setPersonaTrack] = useState<InvestorPersonaTrack>('financial');
  const [bookmarkedDocIds, setBookmarkedDocIds] = useState<string[]>([]);
  const [autoCleanupEnabled, setAutoCleanupEnabledState] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem('spenta_auto_cleanup_30d') === 'true';
    } catch {
      return false;
    }
  });
  const [lastAutoCleanupAt, setLastAutoCleanupAt] = useState<string | null>(null);
  const [lastAutoCleanupPurgedCount, setLastAutoCleanupPurgedCount] = useState<number>(0);
  const [investorFeedback, setInvestorFeedback] = useState<InvestorFeedbackRecord[]>([]);
  const [contactInquiries, setContactInquiries] = useState<OfflineContactInquiry[]>([]);
  const [dataRoomOpen, setDataRoomOpen] = useState<boolean>(false);
  const [contactModalOpen, setContactModalOpen] = useState<boolean>(false);
  const [contactModalTopic, setContactModalTopic] = useState<string>('Seed Round SAFE Terms ($500K @ $4.5M Cap)');
  const [intelligenceModalOpen, setIntelligenceModalOpen] = useState<boolean>(false);
  const [intelligenceFocusSection, setIntelligenceFocusSection] = useState<string>(
    '01. Dual-Engine Commercialization & Value Exchange',
  );
  const [arPreviewTarget, setArPreviewTarget] = useState<ArPreviewTarget | null>(null);

  const openContactModal = useCallback((topic?: string) => {
    if (topic) setContactModalTopic(topic);
    setContactModalOpen(true);
  }, []);

  const closeContactModal = useCallback(() => {
    setContactModalOpen(false);
  }, []);

  const openIntelligenceModal = useCallback((section?: string) => {
    if (section) setIntelligenceFocusSection(section);
    setIntelligenceModalOpen(true);
  }, []);

  const closeIntelligenceModal = useCallback(() => {
    setIntelligenceModalOpen(false);
  }, []);

  const openArPreview = useCallback((target: ArPreviewTarget) => {
    setArPreviewTarget(target);
  }, []);

  const closeArPreview = useCallback(() => {
    setArPreviewTarget(null);
  }, []);

  const toggleDocBookmark = useCallback((docId: string) => {
    setBookmarkedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId],
    );
  }, []);

  const addInvestorFeedback = useCallback<StackContextValue['addInvestorFeedback']>(
    async (input) => {
      const saved = await persistenceService.saveInvestorFeedback(input);
      setInvestorFeedback((prev) => [saved, ...prev.filter((item) => item.id !== saved.id)]);
      return saved;
    },
    [persistenceService],
  );

  const replyInvestorFeedback = useCallback(
    async (feedbackId: string, replyText: string) => {
      const updated = await persistenceService.addFeedbackReply(feedbackId, replyText);
      if (!updated) return;
      setInvestorFeedback((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    },
    [persistenceService],
  );

  const deleteInvestorFeedback = useCallback(
    async (id: string) => {
      await persistenceService.deleteInvestorFeedback(id);
      setInvestorFeedback((prev) => prev.filter((item) => item.id !== id));
    },
    [persistenceService],
  );

  const submitContactInquiry = useCallback<StackContextValue['submitContactInquiry']>(
    async (input) => {
      const saved = await persistenceService.saveContactInquiry(input);
      setContactInquiries((prev) => [saved, ...prev.filter((item) => item.id !== saved.id)]);
      setAutoNotice(`Saved founder inquiry draft for "${saved.topic}" offline to IndexedDB`);
      return saved;
    },
    [persistenceService],
  );

  const deleteContactInquiry = useCallback(
    async (id: string) => {
      await persistenceService.deleteContactInquiry(id);
      setContactInquiries((prev) => prev.filter((item) => item.id !== id));
    },
    [persistenceService],
  );

  const loadCaseStudyStack = useCallback(
    (appIds: string[], label: string) => {
      const validSet = new Set(SPENTA_APPS.map((a) => a.id));
      const matched = appIds.filter((id) => validSet.has(id));
      if (matched.length === 0) return;
      // Include required dependencies so the composed stack is immediately coherent
      const expanded = new Set<string>(matched);
      matched.forEach((id) => {
        const app = SPENTA_APPS.find((a) => a.id === id);
        app?.depends.forEach((dep) => {
          if (validSet.has(dep)) expanded.add(dep);
        });
      });
      setSelectedIds(Array.from(expanded));
      setDrawerOpen(true);
      setAutoNotice(`Loaded ${label} stack (${expanded.size} modules) into Stack Composer`);
    },
    [],
  );

  const navigateToInvestorBriefing = useCallback(
    (query?: SsotBriefingQuery) => {
      const mergedQuery: SsotBriefingQuery = {
        persona: query?.persona ?? personaTrack,
        currency: query?.currency ?? currency,
        scenario: query?.scenario ?? investorCalculatorState.scenario,
        view: query?.view ?? ssotQueryState.view ?? 'overview',
        ...(query?.section ? { section: query.section } : {}),
        ...(query?.sid ? { sid: query.sid } : {}),
      };
      if (mergedQuery.persona) setPersonaTrack(mergedQuery.persona);
      if (mergedQuery.currency) setCurrency(mergedQuery.currency);
      if (mergedQuery.scenario) {
        setInvestorCalculatorState((prev) => ({
          ...prev,
          scenario: mergedQuery.scenario!,
        }));
      }
      setSsotQueryState(mergedQuery);
      setIsInvestorBriefingRoute(true);
      try {
        window.history.pushState({}, '', buildInvestorBriefingPath(mergedQuery));
      } catch {
        // ignore history errors inside restricted frames
      }
      if (!mergedQuery.section) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [personaTrack, currency, investorCalculatorState.scenario, ssotQueryState.view],
  );

  const exitInvestorBriefing = useCallback((targetTab?: NavTab) => {
    setIsInvestorBriefingRoute(false);
    if (targetTab) {
      setActiveTab(targetTab);
    }
    try {
      window.history.pushState({}, '', '/');
    } catch {
      // ignore history errors inside restricted frames
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openBriefingSection = useCallback(
    (sectionId: string) => {
      navigateToInvestorBriefing({ section: sectionId });
    },
    [navigateToInvestorBriefing],
  );

  // Sync /investor-briefing route & query params on browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const onBriefing = isInvestorBriefingPathname();
      setIsInvestorBriefingRoute(onBriefing);
      if (onBriefing) {
        const parsed = parseSsotBriefingQuery();
        setSsotQueryState(parsed);
        if (parsed.persona) setPersonaTrack(parsed.persona);
        if (parsed.currency) setCurrency(parsed.currency);
        if (parsed.scenario) {
          setInvestorCalculatorState((prev) => ({ ...prev, scenario: parsed.scenario! }));
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Apply initial /investor-briefing query params when deep-linked directly
  useEffect(() => {
    if (!isInvestorBriefingPathname()) return;
    const parsed = parseSsotBriefingQuery();
    if (parsed.persona) setPersonaTrack(parsed.persona);
    if (parsed.currency) setCurrency(parsed.currency);
    if (parsed.scenario) {
      setInvestorCalculatorState((prev) => ({ ...prev, scenario: parsed.scenario! }));
    }
  }, []);

  const updateInvestorCalculatorState = useCallback<
    StackContextValue['updateInvestorCalculatorState']
  >((patch) => {
    setInvestorCalculatorState((prev) => {
      const next =
        typeof patch === 'function'
          ? patch(prev)
          : {
              ...prev,
              ...patch,
              mixScopeWeights: patch.mixScopeWeights
                ? { ...prev.mixScopeWeights, ...patch.mixScopeWeights }
                : prev.mixScopeWeights,
            };
      return sanitizeInvestorCalculatorState(next);
    });
  }, []);

  const resetInvestorCalculatorState = useCallback(() => {
    setInvestorCalculatorState({
      ...DEFAULT_INVESTOR_CALCULATOR_STATE,
      mixScopeWeights: { ...DEFAULT_INVESTOR_CALCULATOR_STATE.mixScopeWeights },
    });
  }, []);

  const saveCalculatorScenario = useCallback<StackContextValue['saveCalculatorScenario']>(
    async (name, description) => {
      clearGuardUntilRef.current = 0;
      const saved = await runTrackedPersistence(() =>
        persistenceService.saveScenario({
          name,
          description,
          state: investorCalculatorState,
        }),
      );
      setSavedCalculatorScenarios((prev) => [
        saved,
        ...prev.filter((item) => item.id !== saved.id),
      ]);
      return saved;
    },
    [investorCalculatorState, persistenceService, runTrackedPersistence],
  );

  const applyCalculatorScenario = useCallback(
    (id: string) => {
      const applyRecord = (match: InvestorCalculatorScenario) => {
        clearGuardUntilRef.current = 0;
        setInvestorCalculatorState(sanitizeInvestorCalculatorState(match.state));
        setAutoNotice(`Loaded saved scenario "${match.name}" from offline IndexedDB storage`);
      };
      const match = savedCalculatorScenarios.find((s) => s.id === id);
      if (match) {
        applyRecord(match);
        return;
      }
      void persistenceService.getScenario(id).then((stored) => {
        if (stored) applyRecord(stored);
      });
    },
    [savedCalculatorScenarios, persistenceService],
  );

  const deleteCalculatorScenario = useCallback(
    async (id: string) => {
      await runTrackedPersistence(() => persistenceService.deleteCalculatorScenario(id));
      setSavedCalculatorScenarios((prev) => prev.filter((item) => item.id !== id));
    },
    [persistenceService, runTrackedPersistence],
  );

  const saveWorkspaceSnapshot = useCallback<StackContextValue['saveWorkspaceSnapshot']>(
    async (name) => {
      clearGuardUntilRef.current = 0;
      const saved = await runTrackedPersistence(() =>
        persistenceService.saveWorkspaceSnapshot({
          name,
          activeTab,
          selectedIds,
          deploymentTarget,
          hitlConfidence,
          calculatorState: investorCalculatorState,
        }),
      );
      setWorkspaceSnapshots((prev) => [saved, ...prev.filter((item) => item.id !== saved.id)]);
      setAutoNotice(`Saved offline workspace snapshot "${saved.name}" to IndexedDB`);
      return saved;
    },
    [
      activeTab,
      selectedIds,
      deploymentTarget,
      hitlConfidence,
      investorCalculatorState,
      persistenceService,
      runTrackedPersistence,
    ],
  );

  const restoreWorkspaceSnapshot = useCallback(
    (id: string) => {
      const applySnapshot = (match: UserWorkspaceSnapshot) => {
        if (NAV_TABS.includes(match.activeTab as NavTab)) {
          setActiveTab(match.activeTab as NavTab);
        }
        if (Array.isArray(match.selectedIds) && match.selectedIds.length > 0) {
          const validIds = match.selectedIds.filter((appId) => SPENTA_APPS.some((a) => a.id === appId));
          if (validIds.length > 0) setSelectedIds(validIds);
        }
        if (match.deploymentTarget in DEPLOYMENT_PROFILES) {
          setDeploymentTargetState(match.deploymentTarget as DeploymentTargetId);
        }
        if (typeof match.hitlConfidence === 'number' && Number.isFinite(match.hitlConfidence)) {
          setHitlConfidence(match.hitlConfidence);
        }
        if (match.calculatorState) {
          setInvestorCalculatorState(sanitizeInvestorCalculatorState(match.calculatorState));
        }
        persistenceService.recordAuditEvent({
          title: 'Workspace snapshot restored',
          detail: `Restored snapshot "${match.name}" (${match.activeTab})`,
          status: 'synced',
          category: 'snapshot',
          metadata: { snapshotId: match.id, name: match.name },
        });
        setAutoNotice(`Restored offline workspace snapshot "${match.name}" from IndexedDB`);
      };
      const match = workspaceSnapshots.find((s) => s.id === id);
      if (match) {
        applySnapshot(match);
        return;
      }
      void persistenceService.getWorkspaceSnapshot(id).then((stored) => {
        if (stored) applySnapshot(stored);
      });
    },
    [workspaceSnapshots, persistenceService],
  );

  const deleteWorkspaceSnapshot = useCallback(
    async (id: string) => {
      await runTrackedPersistence(() => persistenceService.deleteWorkspaceSnapshot(id));
      setWorkspaceSnapshots((prev) => prev.filter((item) => item.id !== id));
    },
    [persistenceService, runTrackedPersistence],
  );

  const [memoryStats, setMemoryStats] = useState<{
    totalMemoryBytes: number;
    scenariosMemoryBytes: number;
    snapshotMemoryBytes: number;
    browserStorageUsageBytes: number;
    browserStorageQuotaBytes: number | null;
    quotaUsagePct: number;
  }>({
    totalMemoryBytes: 0,
    scenariosMemoryBytes: 0,
    snapshotMemoryBytes: 0,
    browserStorageUsageBytes: 0,
    browserStorageQuotaBytes: null,
    quotaUsagePct: 0,
  });

  const [syncConflictState, setSyncConflictState] = useState<{
    open: boolean;
    title: string;
    detail: string;
    localRevision: number;
    serverRevision: number;
  } | null>(null);

  useEffect(() => {
    let active = true;
    const computeMemory = async () => {
      const scenariosBytes = savedCalculatorScenarios.reduce(
        (acc, s) => acc + JSON.stringify(s).length * 2,
        0,
      );
      const snapshotsBytes = workspaceSnapshots.reduce(
        (acc, sn) => acc + JSON.stringify(sn).length * 2,
        0,
      );
      const totalObjBytes = scenariosBytes + snapshotsBytes;

      let usageBytes = totalObjBytes;
      let quotaBytes: number | null = null;

      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
        try {
          const est = await navigator.storage.estimate();
          if (est.usage !== undefined) usageBytes = est.usage;
          if (est.quota !== undefined) quotaBytes = est.quota ?? null;
        } catch {
          // ignore
        }
      }

      const effectiveQuota = quotaBytes && quotaBytes > 0 ? quotaBytes : 50 * 1024 * 1024 * 1024;
      const pct = effectiveQuota > 0 ? (usageBytes / effectiveQuota) * 100 : 0;

      if (active) {
        setMemoryStats({
          totalMemoryBytes: totalObjBytes,
          scenariosMemoryBytes: scenariosBytes,
          snapshotMemoryBytes: snapshotsBytes,
          browserStorageUsageBytes: usageBytes,
          browserStorageQuotaBytes: quotaBytes,
          quotaUsagePct: Math.min(100, Math.max(0, pct)),
        });
      }
    };

    void computeMemory();
    const interval = window.setInterval(computeMemory, 10_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [savedCalculatorScenarios, workspaceSnapshots, storageRevision]);

  const triggerSyncConflictSimulation = useCallback(() => {
    setSyncConflictState({
      open: true,
      title: 'IndexedDB Schema Version & Sync Conflict Detected',
      detail: `Local storage revision v${storageRevision} conflicts with incoming server state revision v${storageRevision + 2} due to concurrent update mismatch or data verification checksum error.`,
      localRevision: storageRevision,
      serverRevision: storageRevision + 2,
    });
  }, [storageRevision]);

  const resolveSyncConflict = useCallback(
    async (choice: 'local' | 'server') => {
      if (choice === 'local') {
        persistenceService.recordAuditEvent({
          title: 'Sync conflict resolved: Keep Local',
          detail: `User selected local state authoritative override at revision v${storageRevision}.`,
          status: 'synced',
          category: 'sync',
        });
        setAutoNotice('Conflict resolved — local storage state retained as authoritative.');
      } else {
        persistenceService.recordAuditEvent({
          title: 'Sync conflict resolved: Overwrite with Server',
          detail: `User accepted server state overwrite, synchronizing local cache.`,
          status: 'synced',
          category: 'sync',
        });
        await persistenceService.reconcileAndVerify();
        setAutoNotice('Conflict resolved — local storage synchronized with server state.');
      }
      setSyncConflictState(null);
    },
    [persistenceService, storageRevision, setAutoNotice],
  );

  const getStorageMetrics = useCallback(() => {
    return persistenceService.getStorageMetrics();
  }, [persistenceService]);

  const buildInvestorBriefingCacheInput = useCallback(
    () => ({
      chaptersCount: BRIEFING_CHAPTERS.length,
      tiersCount: NINE_TIER_UNIT_ECONOMICS.length,
      caseStudiesCount: SSOT_CASE_STUDIES.length,
      dataRoomDocsCount: DATA_ROOM_DOCUMENTS.length,
      safeTermsSnapshot: UNIFIED_SAFE_TERMS,
      activeSection: ssotQueryState.section || 'ssot-hero',
      personaTrack,
      currency,
      scenario: investorCalculatorState.scenario,
      bookmarkedDocIds,
      feedbackCount: investorFeedback.length,
      payload: {
        chapters: BRIEFING_CHAPTERS,
        tiers: NINE_TIER_UNIT_ECONOMICS,
        caseStudies: SSOT_CASE_STUDIES,
        dataRoomDocs: DATA_ROOM_DOCUMENTS,
      },
    }),
    [
      ssotQueryState.section,
      personaTrack,
      currency,
      investorCalculatorState.scenario,
      bookmarkedDocIds,
      investorFeedback.length,
    ],
  );

  const forceSync = useCallback(async (): Promise<boolean> => {
    const currentlyOnline =
      typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
        ? navigator.onLine
        : isOnline;
    persistenceService.setOnlineStatus(currentlyOnline);
    setIsOnline(currentlyOnline);
    if (!currentlyOnline) {
      pendingOfflineSyncRef.current = true;
      persistenceService.recordAuditEvent({
        title: 'Sync failed',
        detail: 'Cannot synchronize: browser network is offline. Offline mutations remain queued locally.',
        status: 'offline',
        category: 'sync',
      });
      setAutoNotice('Offline mode — changes remain safely queued in local IndexedDB until connection returns');
      return false;
    }

    clearGuardUntilRef.current = 0;
    const reconciliation = await runTrackedPersistence(
      async () => {
        const [, , , , cachedBriefing] = await Promise.all([
          persistenceService.saveCalculatorState(investorCalculatorState),
          persistenceService.saveWorkspaceSnapshot({
            id: DEFAULT_WORKSPACE_SNAPSHOT_KEY,
            name: 'Auto-Saved Workspace',
            activeTab,
            selectedIds,
            deploymentTarget,
            hitlConfidence,
            calculatorState: investorCalculatorState,
          }),
          persistenceService.saveUserSession({
            activeTab,
            selectedIds,
            deploymentTarget,
            hitlConfidence,
            savedProposalsCount: savedProposals.length,
            neuralCoreSystem: neuralCoreState.activeSystem,
          }),
          persistenceService.saveDiligencePrefs({
            personaTrack,
            currency,
            bookmarkedDocIds,
            autoCleanupSnapshots30d: autoCleanupEnabled,
          }),
          persistenceService.saveInvestorBriefingCache(buildInvestorBriefingCacheInput()),
        ]);
        setInvestorBriefingCachedAt(cachedBriefing.cachedAt);
        const result = await persistenceService.reconcileAndVerify();
        const [scenarios, snapshots] = await Promise.all([
          persistenceService.listCalculatorScenarios(),
          persistenceService.listWorkspaceSnapshots(),
        ]);
        setSavedCalculatorScenarios(scenarios);
        setWorkspaceSnapshots(snapshots);
        pendingOfflineSyncRef.current = false;
        return result;
      },
      { minVisualMs: 220 },
    );

    setAutoNotice(
      `Reconciled ${reconciliation.totalEntries} records across ${reconciliation.verifiedStores} IndexedDB stores`,
    );
    return reconciliation.ok;
  }, [
    isOnline,
    runTrackedPersistence,
    persistenceService,
    investorCalculatorState,
    activeTab,
    selectedIds,
    deploymentTarget,
    hitlConfidence,
    savedProposals.length,
    neuralCoreState.activeSystem,
    personaTrack,
    currency,
    bookmarkedDocIds,
    autoCleanupEnabled,
    buildInvestorBriefingCacheInput,
  ]);

  useEffect(() => {
    forceSyncRef.current = forceSync;
  }, [forceSync]);

  const clearLocalCachedData = useCallback(async (): Promise<void> => {
    clearGuardUntilRef.current = Date.now() + 600;
    pendingOfflineSyncRef.current = false;
    await runTrackedPersistence(async () => {
      await persistenceService.clearAll();
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith('spenta_')) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => window.localStorage.removeItem(k));
      } catch {
        // ignore storage errors
      }
    });

    setSavedCalculatorScenarios([]);
    setWorkspaceSnapshots([]);
    setInvestorFeedback([]);
    setContactInquiries([]);
    setSavedProposals([]);
    setBookmarkedDocIds([]);
    setInvestorBriefingCachedAt(null);
    setSelectedIds(DEFAULT_SELECTED_IDS);
    setDeploymentTargetState('on-prem');
    setHitlConfidence(0.91);
    setInvestorCalculatorState({
      ...DEFAULT_INVESTOR_CALCULATOR_STATE,
      mixScopeWeights: { ...DEFAULT_INVESTOR_CALCULATOR_STATE.mixScopeWeights },
    });
    setAutoNotice('Cleared all local IndexedDB stores and cached workspace data');
  }, [persistenceService, runTrackedPersistence]);

  const exportOfflineBackup = useCallback(async (): Promise<OfflineExportSummary> => {
    const bundle = await persistenceService.exportAllOfflineData();
    const jsonPayload = JSON.stringify(bundle, null, 2);
    const filename = `spenta-offline-storage-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const blob = new Blob([jsonPayload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    const scenariosCount = bundle.scenarios?.length ?? 0;
    const snapshotsCount = bundle.workspaceSnapshots?.length ?? 0;
    const storeNames = [...PERSISTENCE_STORES];
    const totalRecords = storeNames.reduce(
      (sum, store) => sum + Object.keys(bundle.stores[store] ?? {}).length,
      0,
    );
    const byteSize =
      typeof TextEncoder !== 'undefined'
        ? new TextEncoder().encode(jsonPayload).length
        : jsonPayload.length;
    persistenceService.recordAuditEvent({
      title: 'Data exported',
      detail: `Downloaded ${filename} (${scenariosCount} scenarios, ${snapshotsCount} snapshots, ${byteSize} bytes).`,
      status: 'synced',
      category: 'export',
      metadata: { filename, byteSize, schemaVersion: bundle.schemaVersion },
    });
    setAutoNotice(
      `Downloaded ${filename} (${scenariosCount} scenario${scenariosCount === 1 ? '' : 's'} & ${snapshotsCount} snapshot${snapshotsCount === 1 ? '' : 's'} · v${bundle.schemaVersion})`,
    );
    return {
      filename,
      schemaVersion: bundle.schemaVersion,
      exportedAt: bundle.exportedAt,
      scenariosCount,
      snapshotsCount,
      storeNames,
      totalRecords,
      byteSize,
    };
  }, [persistenceService]);

  const runSnapshotCleanup = useCallback(
    async (maxAgeDays: number = 30): Promise<SnapshotCleanupResult> => {
      const result = await runTrackedPersistence(() =>
        persistenceService.purgeOldSnapshots(maxAgeDays),
      );
      if (result.purgedCount > 0) {
        const purgedSet = new Set(result.purgedIds);
        setWorkspaceSnapshots((prev) => prev.filter((item) => !purgedSet.has(item.id)));
        setAutoNotice(
          `Auto-Cleanup purged ${result.purgedCount} snapshot${result.purgedCount === 1 ? '' : 's'} older than ${maxAgeDays} days`,
        );
      }
      setLastAutoCleanupAt(new Date().toISOString());
      setLastAutoCleanupPurgedCount(result.purgedCount);
      return result;
    },
    [persistenceService, runTrackedPersistence],
  );

  const setAutoCleanupEnabled = useCallback((enabled: boolean) => {
    setAutoCleanupEnabledState(enabled);
    try {
      window.localStorage.setItem('spenta_auto_cleanup_30d', String(enabled));
    } catch {
      // ignore storage errors
    }
  }, []);

  // Track browser online/offline connectivity and automatically sync/reconcile on reconnect
  useEffect(() => {
    const handleOnline = () => {
      persistenceService.setOnlineStatus(true);
      setIsOnline(true);
      if (investorCalculatorHydrated) {
        const hadPendingOffline = pendingOfflineSyncRef.current;
        void (forceSyncRef.current ? forceSyncRef.current() : runTrackedPersistence(() => persistenceService.reconcileAndVerify())).then(
          () => {
            if (hadPendingOffline) {
              setAutoNotice('Connection restored — synced offline Investor Briefing cache & IndexedDB stores');
            }
          },
        );
      }
    };
    const handleOffline = () => {
      persistenceService.setOnlineStatus(false);
      setIsOnline(false);
      pendingOfflineSyncRef.current = true;
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [investorCalculatorHydrated, persistenceService, runTrackedPersistence]);

  // Hydrate investor calculator state, saved scenarios, latest workspace snapshot, diligence preferences, feedback, inquiries, and session from IndexedDB on mount
  useEffect(() => {
    let active = true;
    const hasStoredNeural = initialLocalStorageFlagsRef.current?.hasNeural ?? false;

    void Promise.all([
      persistenceService.loadCalculatorState(),
      persistenceService.listCalculatorScenarios(),
      persistenceService.listWorkspaceSnapshots(),
      persistenceService.getWorkspaceSnapshot(DEFAULT_WORKSPACE_SNAPSHOT_KEY),
      persistenceService.loadUserSession(),
      persistenceService.loadDiligencePrefs(),
      persistenceService.listInvestorFeedback(),
      persistenceService.listContactInquiries(),
      persistenceService.loadInvestorBriefingCache(),
    ]).then(
      ([
        savedCalc,
        scenarios,
        snapshots,
        latestSnapshot,
        session,
        diligencePrefs,
        feedbackList,
        inquiryList,
        briefingCache,
      ]) => {
        if (!active) return;
        const restoredCalc = savedCalc ?? latestSnapshot?.calculatorState ?? null;
        if (restoredCalc) {
          setInvestorCalculatorState(sanitizeInvestorCalculatorState(restoredCalc));
        }
        if (Array.isArray(scenarios)) {
          setSavedCalculatorScenarios(scenarios);
        }
        if (Array.isArray(snapshots)) {
          setWorkspaceSnapshots(snapshots);
        }
        const urlQuery = isInvestorBriefingPathname() ? parseSsotBriefingQuery() : {};
        if (diligencePrefs) {
          if (!urlQuery.currency && (diligencePrefs.currency === 'USD' || diligencePrefs.currency === 'BDT')) {
            setCurrency(diligencePrefs.currency);
          }
          if (
            !urlQuery.persona &&
            (diligencePrefs.personaTrack === 'financial' ||
              diligencePrefs.personaTrack === 'technical' ||
              diligencePrefs.personaTrack === 'strategic')
          ) {
            setPersonaTrack(diligencePrefs.personaTrack);
          }
          if (Array.isArray(diligencePrefs.bookmarkedDocIds)) {
            setBookmarkedDocIds(diligencePrefs.bookmarkedDocIds);
          }
          if (typeof diligencePrefs.autoCleanupSnapshots30d === 'boolean') {
            setAutoCleanupEnabledState(diligencePrefs.autoCleanupSnapshots30d);
            try {
              window.localStorage.setItem(
                'spenta_auto_cleanup_30d',
                String(diligencePrefs.autoCleanupSnapshots30d),
              );
            } catch {
              // ignore storage errors
            }
          }
        } else if (briefingCache) {
          if (!urlQuery.currency && (briefingCache.currency === 'USD' || briefingCache.currency === 'BDT')) {
            setCurrency(briefingCache.currency);
          }
          if (
            !urlQuery.persona &&
            (briefingCache.personaTrack === 'financial' ||
              briefingCache.personaTrack === 'technical' ||
              briefingCache.personaTrack === 'strategic')
          ) {
            setPersonaTrack(briefingCache.personaTrack);
          }
          if (Array.isArray(briefingCache.bookmarkedDocIds)) {
            setBookmarkedDocIds(briefingCache.bookmarkedDocIds);
          }
        }
        if (briefingCache) {
          setInvestorBriefingCachedAt(briefingCache.cachedAt);
          if (!urlQuery.section && briefingCache.activeSection && isInvestorBriefingPathname()) {
            setSsotQueryState((prev) => ({
              ...prev,
              section: prev.section ?? briefingCache.activeSection,
            }));
          }
        }
        if (Array.isArray(feedbackList)) {
          setInvestorFeedback(feedbackList);
        }
        if (Array.isArray(inquiryList)) {
          setContactInquiries(inquiryList);
        }
        if (!initialShareSnapshot) {
          const restoredTab = latestSnapshot?.activeTab ?? session?.activeTab;
          const restoredIds = latestSnapshot?.selectedIds ?? session?.selectedIds;
          const restoredDeploy = latestSnapshot?.deploymentTarget ?? session?.deploymentTarget;
          const restoredHitl = latestSnapshot?.hitlConfidence ?? session?.hitlConfidence;

          if (restoredTab && NAV_TABS.includes(restoredTab as NavTab)) {
            setActiveTab(restoredTab as NavTab);
          }
          if (Array.isArray(restoredIds) && restoredIds.length > 0) {
            const validIds = restoredIds.filter((id) => SPENTA_APPS.some((a) => a.id === id));
            if (validIds.length > 0) {
              setSelectedIds(validIds);
            }
          }
          if (restoredDeploy && restoredDeploy in DEPLOYMENT_PROFILES) {
            setDeploymentTargetState(restoredDeploy as DeploymentTargetId);
          }
          if (
            typeof restoredHitl === 'number' &&
            Number.isFinite(restoredHitl) &&
            restoredHitl >= 0.5 &&
            restoredHitl <= 0.99
          ) {
            setHitlConfidence(restoredHitl);
          }
          if (
            !hasStoredNeural &&
            session &&
            (session.neuralCoreSystem === 'solar-map' ||
              session.neuralCoreSystem === 'spiral-galaxy')
          ) {
            setNeuralCoreState((prev) => ({
              ...prev,
              activeSystem: session.neuralCoreSystem as NeuralCoreSystem,
            }));
          }
        }
        setLastSyncedAt(
          latestSnapshot?.updatedAt ??
            savedCalc?.updatedAt ??
            briefingCache?.cachedAt ??
            session?.updatedAt ??
            null,
        );
        setStorageRevision((rev) => rev + 1);
        setInvestorCalculatorHydrated(true);
      },
    );

    return () => {
      active = false;
    };
  }, [persistenceService]);

  // Automatically persist investor calculator state & active workspace snapshot to IndexedDB on every change
  useEffect(() => {
    if (!investorCalculatorHydrated) return;
    if (Date.now() < clearGuardUntilRef.current) return;
    if (!isOnline) pendingOfflineSyncRef.current = true;
    const timer = window.setTimeout(() => {
      if (Date.now() < clearGuardUntilRef.current) return;
      void runTrackedPersistence(async () => {
        await Promise.all([
          persistenceService.saveCalculatorState(investorCalculatorState),
          persistenceService.saveWorkspaceSnapshot({
            id: DEFAULT_WORKSPACE_SNAPSHOT_KEY,
            name: 'Auto-Saved Workspace',
            activeTab,
            selectedIds,
            deploymentTarget,
            hitlConfidence,
            calculatorState: investorCalculatorState,
          }),
        ]);
      });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [
    investorCalculatorHydrated,
    isOnline,
    investorCalculatorState,
    activeTab,
    selectedIds,
    deploymentTarget,
    hitlConfidence,
    persistenceService,
    runTrackedPersistence,
  ]);

  // Automatically persist diligence preferences (currency, persona track, Data Room bookmarks) & Investor Briefing cache to IndexedDB
  useEffect(() => {
    if (!investorCalculatorHydrated) return;
    if (Date.now() < clearGuardUntilRef.current) return;
    if (!isOnline) pendingOfflineSyncRef.current = true;
    const timer = window.setTimeout(() => {
      if (Date.now() < clearGuardUntilRef.current) return;
      void runTrackedPersistence(async () => {
        const [, cachedBriefing] = await Promise.all([
          persistenceService.saveDiligencePrefs({
            personaTrack,
            currency,
            bookmarkedDocIds,
            autoCleanupSnapshots30d: autoCleanupEnabled,
          }),
          persistenceService.saveInvestorBriefingCache(buildInvestorBriefingCacheInput()),
        ]);
        setInvestorBriefingCachedAt(cachedBriefing.cachedAt);
      });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [
    investorCalculatorHydrated,
    isOnline,
    personaTrack,
    currency,
    bookmarkedDocIds,
    autoCleanupEnabled,
    buildInvestorBriefingCacheInput,
    persistenceService,
    runTrackedPersistence,
  ]);

  // Automatically purge workspace snapshots older than 30 days whenever Auto-Cleanup is enabled
  useEffect(() => {
    if (!investorCalculatorHydrated || !autoCleanupEnabled) return;
    const cutoffMs = Date.now() - 30 * 86_400_000;
    const hasStaleSnapshot = workspaceSnapshots.some((snap) => {
      const ts = Date.parse(snap.updatedAt || snap.createdAt);
      return Number.isFinite(ts) && ts < cutoffMs;
    });
    if (!hasStaleSnapshot) return;
    void runSnapshotCleanup(30);
  }, [investorCalculatorHydrated, autoCleanupEnabled, workspaceSnapshots, runSnapshotCleanup]);

  // Automatically persist active tab and user session metadata to IndexedDB on every change
  useEffect(() => {
    if (!investorCalculatorHydrated) return;
    if (Date.now() < clearGuardUntilRef.current) return;
    const timer = window.setTimeout(() => {
      if (Date.now() < clearGuardUntilRef.current) return;
      void runTrackedPersistence(() =>
        persistenceService.saveUserSession({
          activeTab,
          selectedIds,
          deploymentTarget,
          hitlConfidence,
          savedProposalsCount: savedProposals.length,
          neuralCoreSystem: neuralCoreState.activeSystem,
        }),
      );
    }, 150);
    return () => window.clearTimeout(timer);
  }, [
    investorCalculatorHydrated,
    activeTab,
    selectedIds,
    deploymentTarget,
    hitlConfidence,
    savedProposals.length,
    neuralCoreState.activeSystem,
    persistenceService,
    runTrackedPersistence,
  ]);

  // Flush latest calculator, workspace snapshot & user session immediately when the browser tab hides or reloads
  useEffect(() => {
    if (!investorCalculatorHydrated) return;
    const flushNow = () => {
      if (Date.now() < clearGuardUntilRef.current) return;
      void persistenceService.saveCalculatorState(investorCalculatorState);
      void persistenceService.saveWorkspaceSnapshot({
        id: DEFAULT_WORKSPACE_SNAPSHOT_KEY,
        name: 'Auto-Saved Workspace',
        activeTab,
        selectedIds,
        deploymentTarget,
        hitlConfidence,
        calculatorState: investorCalculatorState,
      });
      void persistenceService.saveUserSession({
        activeTab,
        selectedIds,
        deploymentTarget,
        hitlConfidence,
        savedProposalsCount: savedProposals.length,
        neuralCoreSystem: neuralCoreState.activeSystem,
      });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushNow();
      }
    };
    window.addEventListener('pagehide', flushNow);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', flushNow);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    investorCalculatorHydrated,
    investorCalculatorState,
    activeTab,
    selectedIds,
    deploymentTarget,
    hitlConfidence,
    savedProposals.length,
    neuralCoreState.activeSystem,
    persistenceService,
  ]);

  const activeSimulationSystem: NeuralSimulationSystem =
    neuralCoreState.activeSystem === 'solar-map'
      ? 'solar'
      : neuralCoreState.nebulaMode
        ? 'nebula'
        : 'spiral';

  const setActiveSimulationSystem = useCallback((system: NeuralSimulationSystem) => {
    setNeuralCoreState((prev) => {
      if (system === 'solar') {
        return prev.activeSystem === 'solar-map' ? prev : { ...prev, activeSystem: 'solar-map' };
      }
      if (system === 'nebula') {
        return prev.activeSystem === 'spiral-galaxy' && prev.nebulaMode
          ? prev
          : { ...prev, activeSystem: 'spiral-galaxy', nebulaMode: true };
      }
      return prev.activeSystem === 'spiral-galaxy' && !prev.nebulaMode
        ? prev
        : { ...prev, activeSystem: 'spiral-galaxy', nebulaMode: false };
    });
  }, []);

  const setActiveNeuralSystem = useCallback((system: NeuralCoreSystem) => {
    setNeuralCoreState((prev) =>
      prev.activeSystem === system ? prev : { ...prev, activeSystem: system },
    );
  }, []);

  const toggleNeuralSystem = useCallback(() => {
    setNeuralCoreState((prev) => ({
      ...prev,
      activeSystem: prev.activeSystem === 'spiral-galaxy' ? 'solar-map' : 'spiral-galaxy',
    }));
  }, []);

  const setSolarTimeScale = useCallback((scale: number) => {
    const next = clampSolarTimeScale(scale);
    setNeuralCoreState((prev) => (prev.solarTimeScale === next ? prev : { ...prev, solarTimeScale: next }));
  }, []);

  const setGalaxyRotationSpeed = useCallback((speed: number) => {
    const next = clampGalaxyRotationSpeed(speed);
    setNeuralCoreState((prev) =>
      prev.galaxyRotationSpeed === next ? prev : { ...prev, galaxyRotationSpeed: next },
    );
  }, []);

  const setNeuralGalaxyPreset = useCallback((preset: NeuralGalaxyPresetId) => {
    setNeuralCoreState((prev) =>
      prev.galaxyPreset === preset ? prev : { ...prev, galaxyPreset: preset },
    );
  }, []);

  const setNeuralObservatoryFinish = useCallback((finish: NeuralObservatoryFinish) => {
    setNeuralCoreState((prev) =>
      prev.observatoryFinish === finish ? prev : { ...prev, observatoryFinish: finish },
    );
  }, []);

  const setNeuralBloomIntensity = useCallback((intensity: number) => {
    const next = clampBloomIntensity(intensity);
    setNeuralCoreState((prev) =>
      prev.bloomIntensity === next ? prev : { ...prev, bloomIntensity: next },
    );
  }, []);

  const setNebulaMode = useCallback((enabled: boolean) => {
    setNeuralCoreState((prev) =>
      prev.nebulaMode === enabled ? prev : { ...prev, nebulaMode: enabled },
    );
  }, []);

  const toggleNebulaMode = useCallback(() => {
    setNeuralCoreState((prev) => ({
      ...prev,
      nebulaMode: !prev.nebulaMode,
    }));
  }, []);

  const setNebulaDensity = useCallback((density: number) => {
    const next = clampNebulaDensity(density);
    setNeuralCoreState((prev) =>
      prev.nebulaDensity === next ? prev : { ...prev, nebulaDensity: next },
    );
  }, []);

  const setParticleTurbulence = useCallback((turbulence: number) => {
    const next = clampParticleTurbulence(turbulence);
    setNeuralCoreState((prev) =>
      prev.particleTurbulence === next ? prev : { ...prev, particleTurbulence: next },
    );
  }, []);

  const setStarDensity = useCallback((density: number) => {
    const next = clampStarDensity(density);
    setNeuralCoreState((prev) => (prev.starDensity === next ? prev : { ...prev, starDensity: next }));
  }, []);

  const setOrbitalDecay = useCallback((decay: number) => {
    const next = clampOrbitalDecay(decay);
    setNeuralCoreState((prev) => (prev.orbitalDecay === next ? prev : { ...prev, orbitalDecay: next }));
  }, []);

  const setOrbitalSpread = useCallback((spread: number) => {
    const next = clampOrbitalSpread(spread);
    setNeuralCoreState((prev) => (prev.orbitalSpread === next ? prev : { ...prev, orbitalSpread: next }));
  }, []);

  const setGalaxyCameraPreset = useCallback((preset: NeuralCameraPreset) => {
    setNeuralCoreState((prev) =>
      prev.galaxyCameraPreset === preset ? prev : { ...prev, galaxyCameraPreset: preset },
    );
  }, []);

  const setGalaxyAutoRotate = useCallback((enabled: boolean) => {
    setNeuralCoreState((prev) =>
      prev.galaxyAutoRotate === enabled ? prev : { ...prev, galaxyAutoRotate: enabled },
    );
  }, []);

  const setSolarOrbitalVelocity = useCallback((vel: number) => {
    const next = clampSolarOrbitalVelocity(vel);
    setNeuralCoreState((prev) =>
      prev.solarOrbitalVelocity === next ? prev : { ...prev, solarOrbitalVelocity: next },
    );
  }, []);

  const setSolarOrbitalInclinationDeg = useCallback((deg: number) => {
    const next = clampSolarOrbitalInclinationDeg(deg);
    setNeuralCoreState((prev) =>
      prev.solarOrbitalInclinationDeg === next ? prev : { ...prev, solarOrbitalInclinationDeg: next },
    );
  }, []);

  const setSolarConfigurationPreset = useCallback((preset: SolarConfigurationPresetId) => {
    setNeuralCoreState((prev) =>
      prev.solarConfigurationPreset === preset
        ? prev
        : { ...prev, solarConfigurationPreset: preset },
    );
  }, []);

  const setSolarViewMode = useCallback((mode: SolarViewModeId) => {
    setNeuralCoreState((prev) =>
      prev.solarViewMode === mode ? prev : { ...prev, solarViewMode: mode },
    );
  }, []);

  const setSolarShowOrbits = useCallback((show: boolean) => {
    setNeuralCoreState((prev) =>
      prev.solarShowOrbits === show ? prev : { ...prev, solarShowOrbits: show },
    );
  }, []);

  const setSolarAutoRotate = useCallback((enabled: boolean) => {
    setNeuralCoreState((prev) =>
      prev.solarAutoRotate === enabled ? prev : { ...prev, solarAutoRotate: enabled },
    );
  }, []);

  const setSolarDayNightCycle = useCallback((enabled: boolean) => {
    setNeuralCoreState((prev) =>
      prev.solarDayNightCycle === enabled ? prev : { ...prev, solarDayNightCycle: enabled },
    );
  }, []);

  const setSolarShowConstellations = useCallback((enabled: boolean) => {
    setNeuralCoreState((prev) =>
      prev.solarShowConstellations === enabled
        ? prev
        : { ...prev, solarShowConstellations: enabled },
    );
  }, []);

  const setSolarShowResonance = useCallback((enabled: boolean) => {
    setNeuralCoreState((prev) =>
      prev.solarShowResonance === enabled ? prev : { ...prev, solarShowResonance: enabled },
    );
  }, []);

  const setSolarFollowPlanet = useCallback((enabled: boolean) => {
    setNeuralCoreState((prev) =>
      prev.solarFollowPlanet === enabled ? prev : { ...prev, solarFollowPlanet: enabled },
    );
  }, []);

  const resetNeuralCoreState = useCallback(() => {
    setNeuralCoreState(DEFAULT_NEURAL_CORE_STATE);
  }, []);

  const toggleApp = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        setAutoNotice(null);
        return prev.filter((item) => item !== id);
      }
      const target = appMap[id];
      if (!target) return prev;
      const next = new Set([...prev, id]);
      const addedDeps: string[] = [];

      const attachDeps = (modId: string) => {
        const mod = appMap[modId];
        if (!mod) return;
        mod.depends.forEach((dep) => {
          if (!next.has(dep)) {
            next.add(dep);
            addedDeps.push(appMap[dep]?.shortName ?? dep);
            attachDeps(dep);
          }
        });
      };
      attachDeps(id);

      if (addedDeps.length > 0) {
        setAutoNotice(`Auto-attached required dependency: ${addedDeps.join(', ')}`);
      } else {
        setAutoNotice(null);
      }
      return Array.from(next);
    });
  };

  const applyRecipe = (recipeId: string) => {
    const recipe = STARTER_RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return;
    setSelectedIds(recipe.ids);
    setAutoNotice(`Loaded "${recipe.name}" (${recipe.pattern}) — ${recipe.ids.length} modules ready`);
    setDrawerOpen(true);
  };

  const clearStack = () => {
    setSelectedIds([]);
    setAutoNotice('Cleared composed stack');
  };

  const selectedApps = useMemo(
    () => selectedIds.map((id) => appMap[id]).filter(Boolean),
    [selectedIds, appMap],
  );

  const stackMetrics = useMemo<StackMetrics>(() => {
    if (selectedApps.length === 0) {
      return {
        totalSetupUsd: 0,
        oneTimeBuildUsd: 0,
        quarterlyRetainerUsd: 0,
        annualizedRetainerUsd: 0,
        year1ContractUsd: 0,
        buildWeightedGmPct: 0,
        retainerWeightedGmPct: 0,
        blendedGmPct: 0,
        tier: 4,
        activeLayers: new Set<string>(),
        synergyPairs: [],
        escalatedByCount: false,
      };
    }

    const oneTimeApps = selectedApps.filter((app) => app.billingCadence !== 'quarterly-retainer');
    const retainerApps = selectedApps.filter((app) => app.billingCadence === 'quarterly-retainer');

    const oneTimeBuildUsd = oneTimeApps.reduce((sum, app) => sum + app.setupUsd, 0);
    const quarterlyRetainerUsd = retainerApps.reduce((sum, app) => sum + app.setupUsd, 0);
    const annualizedRetainerUsd = quarterlyRetainerUsd * 4;
    const year1ContractUsd = oneTimeBuildUsd + annualizedRetainerUsd;
    // Strictly one-time build CapEx (never mixes quarterly retainers into one-time build totals)
    const totalSetupUsd = oneTimeBuildUsd;

    const buildWeightedGmPct =
      oneTimeBuildUsd > 0
        ? oneTimeApps.reduce((sum, app) => sum + app.setupUsd * app.gmPct, 0) / oneTimeBuildUsd
        : 0;
    const retainerWeightedGmPct =
      quarterlyRetainerUsd > 0
        ? retainerApps.reduce((sum, app) => sum + app.setupUsd * app.gmPct, 0) / quarterlyRetainerUsd
        : 0;

    // Revenue-weighted composite GM across Year-1 contract value (builds + 4x quarterly retainers)
    const weightedGrossProfitY1 =
      oneTimeApps.reduce((sum, app) => sum + app.setupUsd * app.gmPct, 0) +
      retainerApps.reduce((sum, app) => sum + app.setupUsd * 4 * app.gmPct, 0);
    const blendedGmPct = year1ContractUsd > 0 ? weightedGrossProfitY1 / year1ContractUsd : 0;

    let minTier = Math.min(...selectedApps.map((app) => app.minServerTier)) as ServerTierId;
    let escalatedByCount = false;
    if (selectedApps.length >= 6 && minTier > 1) {
      minTier = (minTier - 1) as ServerTierId;
      escalatedByCount = true;
    }

    const activeLayers = new Set<string>();
    selectedApps.forEach((app) => app.layers.forEach((l) => activeLayers.add(l)));

    const synergyPairs: [string, string][] = [];
    const seen = new Set<string>();
    selectedApps.forEach((app) => {
      app.integratesWith.forEach((targetId) => {
        if (selectedIds.includes(targetId) && appMap[targetId]) {
          const key = [app.id, targetId].sort().join('::');
          if (!seen.has(key)) {
            seen.add(key);
            synergyPairs.push([app.shortName, appMap[targetId].shortName]);
          }
        }
      });
    });

    return {
      totalSetupUsd,
      oneTimeBuildUsd,
      quarterlyRetainerUsd,
      annualizedRetainerUsd,
      year1ContractUsd,
      buildWeightedGmPct,
      retainerWeightedGmPct,
      blendedGmPct,
      tier: minTier,
      activeLayers,
      synergyPairs,
      escalatedByCount,
    };
  }, [selectedApps, selectedIds, appMap]);

  const projectArchitectureMetadata = useMemo<ProjectArchitectureMetadata>(() => {
    const tierSpec = SERVER_TIERS[stackMetrics.tier];
    const layers = Object.values(coreLayerConfigs);
    return {
      project: 'Spenta Sovereign OS',
      updatedAt: architectureUpdatedAt,
      infrastructureTarget: {
        id: deploymentProfile.id,
        environment: deploymentProfile.switcherLabel,
        topology: deploymentProfile.title,
        transport: deploymentProfile.transport,
        enclaveBoundary: deploymentProfile.enclaveBoundary,
        latencyBudget: deploymentProfile.latencyBudget,
        egressPolicy: deploymentProfile.egressPolicy,
        compliancePosture: deploymentProfile.compliancePosture,
        costPosture: deploymentProfile.costPosture,
      },
      stackSizing: {
        activeModules: selectedApps.length,
        recommendedTier: `${tierSpec.code} (${tierSpec.name})`,
        estimatedBuildUsd: stackMetrics.oneTimeBuildUsd,
        quarterlyRetainerUsd: stackMetrics.quarterlyRetainerUsd,
        year1ContractUsd: stackMetrics.year1ContractUsd,
      },
      governanceSummary: {
        teeEnabledLayers: layers.filter((l) => l.teeEnabled).length,
        strictOpaLayers: layers.filter((l) => l.policyMode === 'Strict OPA (>= 0.88 HITL)').length,
        airGappedLayers: layers.filter((l) => l.isolationMode === 'Air-Gapped On-Prem').length,
        vpcLayers: layers.filter((l) => l.isolationMode === 'Private Sovereign VPC').length,
      },
      coreLayers: coreLayerConfigs,
    };
  }, [
    architectureUpdatedAt,
    coreLayerConfigs,
    deploymentProfile,
    selectedApps.length,
    stackMetrics.tier,
    stackMetrics.oneTimeBuildUsd,
    stackMetrics.quarterlyRetainerUsd,
    stackMetrics.year1ContractUsd,
  ]);

  const buildExecutiveBrief = () => {
    const tierSpec = SERVER_TIERS[stackMetrics.tier];
    const lines = [
      'SPENTA SOVEREIGN OS — COMPOSED ARCHITECTURE BRIEF',
      '================================================',
      `Infrastructure Target: ${deploymentProfile.title} (${deploymentProfile.switcherLabel})`,
      `  Transport: ${deploymentProfile.transport}`,
      `  Enclave Boundary: ${deploymentProfile.enclaveBoundary}`,
      `  Latency Budget: ${deploymentProfile.latencyBudget}`,
      `  Egress & Compliance: ${deploymentProfile.egressPolicy} | ${deploymentProfile.compliancePosture}`,
      '',
      `Selected Modules (${selectedApps.length}/13):`,
      ...selectedApps.map(
        (a, i) =>
          `  ${i + 1}. ${a.name} (${a.setupLabel} | ${a.gmPct.toFixed(1)}% GM | ${a.recurringLabel})`,
      ),
      '',
      `Verified Native Integrations (${stackMetrics.synergyPairs.length}):`,
      ...(stackMetrics.synergyPairs.length > 0
        ? stackMetrics.synergyPairs.map(([a, b]) => `  - ${a} <-> ${b}`)
        : ['  - Standalone deployment']),
      '',
      `Active Sovereign Layers: ${Array.from(stackMetrics.activeLayers).sort().join(', ') || 'None'}`,
      `Recommended Server Baseline: ${tierSpec.code} — ${tierSpec.name}`,
      `  Hardware: ${tierSpec.hardware} (${tierSpec.vramRam})`,
      `  Est. CapEx: ${tierSpec.capex} | Throughput: ${tierSpec.speed}`,
      '',
      `One-Time Build CapEx: $${(stackMetrics.oneTimeBuildUsd / 1000).toFixed(1)}K${
        stackMetrics.oneTimeBuildUsd > 0 ? ` (${stackMetrics.buildWeightedGmPct.toFixed(1)}% weighted GM)` : ''
      }`,
      ...(stackMetrics.quarterlyRetainerUsd > 0
        ? [
            `Quarterly Managed Retainers: $${(stackMetrics.quarterlyRetainerUsd / 1000).toFixed(1)}K/qtr ($${(
              stackMetrics.annualizedRetainerUsd / 1000
            ).toFixed(1)}K/yr · ${stackMetrics.retainerWeightedGmPct.toFixed(1)}% weighted GM)`,
          ]
        : []),
      `Year-1 Composite Contract Value: $${(stackMetrics.year1ContractUsd / 1000).toFixed(1)}K`,
      `Revenue-Weighted Composite GM (Y1): ${stackMetrics.blendedGmPct.toFixed(1)}%`,
      `Governance Baseline: OPA Policy-as-Code + 0.88 Confidence HITL Gate`,
      `Contact: ${SPENTA_CONTACT_EMAIL}`,
    ];
    return lines.join('\n');
  };

  const exportStackJson = (extra?: Record<string, unknown>) => {
    const tierSpec = SERVER_TIERS[stackMetrics.tier];
    const payload = {
      platform: 'Spenta Sovereign OS',
      exportedAt: new Date().toISOString(),
      contact: SPENTA_CONTACT_EMAIL,
      infrastructureTarget: {
        id: deploymentProfile.id,
        label: deploymentProfile.switcherLabel,
        title: deploymentProfile.title,
        transport: deploymentProfile.transport,
        enclaveBoundary: deploymentProfile.enclaveBoundary,
        latencyBudget: deploymentProfile.latencyBudget,
        egressPolicy: deploymentProfile.egressPolicy,
        compliancePosture: deploymentProfile.compliancePosture,
        costPosture: deploymentProfile.costPosture,
      },
      selectedCount: selectedApps.length,
      oneTimeBuildUsd: stackMetrics.oneTimeBuildUsd,
      quarterlyRetainerUsd: stackMetrics.quarterlyRetainerUsd,
      annualizedRetainerUsd: stackMetrics.annualizedRetainerUsd,
      year1ContractUsd: stackMetrics.year1ContractUsd,
      buildWeightedGmPct: Number(stackMetrics.buildWeightedGmPct.toFixed(1)),
      retainerWeightedGmPct: Number(stackMetrics.retainerWeightedGmPct.toFixed(1)),
      revenueWeightedCompositeGmPct: Number(stackMetrics.blendedGmPct.toFixed(1)),
      activeSovereignLayers: Array.from(stackMetrics.activeLayers).sort(),
      coreLayerConfigs,
      recommendedServerTier: tierSpec,
      verifiedSynergyPairs: stackMetrics.synergyPairs,
      modules: selectedApps.map((a) => ({
        id: a.id,
        name: a.name,
        category: a.category,
        engine: a.engine,
        billingCadence: a.billingCadence ?? 'one-time',
        setupUsd: a.setupUsd,
        recurringLabel: a.recurringLabel,
        gmPct: a.gmPct,
        layers: a.layers,
        depends: a.depends,
        proofClient: a.proofClient,
      })),
      ...(extra ?? {}),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `spenta-sovereign-stack-${deploymentProfile.id}-${selectedApps.length}apps.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const buildMailtoHref = (subject?: string, bodyExtra?: string) => {
    const scopeLabel =
      stackMetrics.quarterlyRetainerUsd > 0
        ? `$${(stackMetrics.oneTimeBuildUsd / 1000).toFixed(1)}K Build + $${(
            stackMetrics.quarterlyRetainerUsd / 1000
          ).toFixed(1)}K/qtr`
        : `$${(stackMetrics.oneTimeBuildUsd / 1000).toFixed(1)}K Build`;
    const sub =
      subject ??
      `Spenta Sovereign OS Stack Proposal (${selectedApps.length} Modules — ${scopeLabel})`;
    const body = bodyExtra ? `${bodyExtra}\n\n${buildExecutiveBrief()}` : buildExecutiveBrief();
    return `mailto:${SPENTA_CONTACT_EMAIL}?subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(
      body,
    )}`;
  };

  const saveProposal: StackContextValue['saveProposal'] = (input) => {
    const created: SavedProposal = {
      ...input,
      id: `prop_${Date.now()}`,
      createdAt: new Date().toISOString(),
      appIds: selectedApps.map((a) => a.id),
      appNames: selectedApps.map((a) => a.shortName),
      estimatedBuildUsd: stackMetrics.oneTimeBuildUsd,
      quarterlyRetainerUsd: stackMetrics.quarterlyRetainerUsd,
      blendedGmPct: Number(stackMetrics.blendedGmPct.toFixed(1)),
      recommendedTier: stackMetrics.tier,
    };
    setSavedProposals((prev) => [created, ...prev]);
    return created;
  };

  const deleteProposal = (id: string) => {
    setSavedProposals((prev) => prev.filter((p) => p.id !== id));
  };

  const logCoreAuditEvent: StackContextValue['logCoreAuditEvent'] = (entry) => {
    const created: CoreAuditEntry = {
      ...entry,
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    setCoreAuditLog((prev) => [created, ...prev].slice(0, 200));
  };

  const updateCoreLayerConfig: StackContextValue['updateCoreLayerConfig'] = (
    layerId,
    patch,
    actionLabel,
    actor = 'Sovereign Architect',
  ) => {
    const current = coreLayerConfigs[layerId];
    if (!current) return;

    const fieldLabels: Record<keyof LayerConfig, string> = {
      isolationMode: 'Deployment Isolation',
      policyMode: 'OPA Policy Mode',
      teeEnabled: 'Hardware TEE (SEV-SNP/TDX)',
      slaTarget: 'Target SLA Profile',
    };

    const formatFieldValue = (key: keyof LayerConfig, val: LayerConfig[keyof LayerConfig]) => {
      if (key === 'teeEnabled') {
        return val ? 'Enabled (AMD SEV-SNP / Intel TDX)' : 'Disabled';
      }
      return String(val);
    };

    const newEntries: CoreAuditEntry[] = [];
    const nowIso = new Date().toISOString();

    (Object.keys(patch) as (keyof LayerConfig)[]).forEach((key) => {
      const nextVal = patch[key];
      if (nextVal === undefined || nextVal === current[key]) return;
      newEntries.push({
        id: `audit_${Date.now()}_${key}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: nowIso,
        actor,
        layer: layerId,
        action: actionLabel ?? `Updated ${layerId} ${fieldLabels[key]}`,
        field: fieldLabels[key],
        previousValue: formatFieldValue(key, current[key]),
        newValue: formatFieldValue(key, nextVal),
      });
    });

    if (newEntries.length === 0) return;

    setCoreLayerConfigs((prev) => ({
      ...prev,
      [layerId]: { ...prev[layerId], ...patch },
    }));
    setArchitectureUpdatedAt(nowIso);
    setCoreAuditLog((prev) => [...newEntries, ...prev].slice(0, 200));
  };

  const resetCoreLayerConfig: StackContextValue['resetCoreLayerConfig'] = (
    layerId,
    actor = 'Sovereign Architect',
  ) => {
    const baseline = DEFAULT_CORE_LAYER_CONFIGS[layerId];
    updateCoreLayerConfig(layerId, baseline, `Reset ${layerId} to Sovereign Baseline`, actor);
  };

  const setDeploymentTarget: StackContextValue['setDeploymentTarget'] = (
    target,
    actor = 'Studio Architect',
  ) => {
    if (target === deploymentTarget) return;
    const prevProfile = DEPLOYMENT_PROFILES[deploymentTarget];
    const nextProfile = DEPLOYMENT_PROFILES[target];
    setDeploymentTargetState(target);
    setCoreLayerConfigs({
      L1: { ...nextProfile.layerPresets.L1 },
      L2: { ...nextProfile.layerPresets.L2 },
      L3: { ...nextProfile.layerPresets.L3 },
      L4: { ...nextProfile.layerPresets.L4 },
      L5: { ...nextProfile.layerPresets.L5 },
      L6: { ...nextProfile.layerPresets.L6 },
    });
    setArchitectureUpdatedAt(new Date().toISOString());
    logCoreAuditEvent({
      actor,
      layer: 'Hardware',
      action: 'Switched Infrastructure Target Environment',
      field: 'Deployment Topology & L1–L6 Presets',
      previousValue: prevProfile.shortLabel,
      newValue: `${nextProfile.shortLabel} (${nextProfile.latencyBudget})`,
    });
    setAutoNotice(
      `Infrastructure target switched to ${nextProfile.shortLabel} — L1–L6 architecture metadata updated`,
    );
  };

  const clearCoreAuditLog = () => {
    setCoreAuditLog([]);
  };

  const dismissSharedSnapshot = () => {
    setSharedSnapshotSummary(null);
    clearShareUrlParams();
  };

  const resetToLocalDefaults = () => {
    setSelectedIds(DEFAULT_SELECTED_IDS);
    setDeploymentTargetState('on-prem');
    setCoreLayerConfigs({ ...DEFAULT_CORE_LAYER_CONFIGS });
    setHitlConfidence(0.91);
    setPaletteMode('stone');
    setActiveBrainSelection((prev) => ({
      hubId: 'fintech',
      appId: 'icr_ops',
      source: 'brain',
      nonce: prev.nonce + 1,
    }));
    setSharedSnapshotSummary(null);
    clearShareUrlParams();
    setNeuralCoreState(DEFAULT_NEURAL_CORE_STATE);
    resetInvestorCalculatorState();
    setAutoNotice('Restored default Spenta Sovereign OS baseline configuration');
  };

  const buildShareUrl: StackContextValue['buildShareUrl'] = (overrides) =>
    buildShareableUrl({
      selectedIds,
      deploymentTarget,
      paletteMode,
      activeTab: overrides?.tab ?? activeTab,
      hitlConfidence,
      hubId:
        overrides?.hubId !== undefined
          ? overrides.hubId
          : (overrides?.tab ?? activeTab) === 'The Brain'
            ? activeBrainSelection.hubId
            : null,
      brainMode: overrides?.brainMode,
    });

  return (
    <StackContext.Provider
      value={{
        theme,
        paletteMode,
        setTheme,
        setPaletteMode,
        toggleTheme,
        mobileGridVisible,
        setMobileGridVisible,
        toggleMobileGrid,
        commandPaletteOpen,
        setCommandPaletteOpen,
        activeTab,
        setActiveTab,
        pendingNavFocus,
        navigateToItem,
        clearPendingNavFocus,
        aiAssistantOpen,
        setAiAssistantOpen,
        selectedIds,
        selectedApps,
        appMap,
        toggleApp,
        applyRecipe,
        clearStack,
        drawerOpen,
        setDrawerOpen,
        autoNotice,
        setAutoNotice,
        hitlConfidence,
        setHitlConfidence,
        stackMetrics,
        savedProposals,
        saveProposal,
        deleteProposal,
        exportStackJson,
        buildExecutiveBrief,
        buildMailtoHref,
        deploymentTarget,
        deploymentProfile,
        projectArchitectureMetadata,
        setDeploymentTarget,
        coreLayerConfigs,
        coreAuditLog,
        updateCoreLayerConfig,
        resetCoreLayerConfig,
        logCoreAuditEvent,
        clearCoreAuditLog,
        sharedSnapshotSummary,
        dismissSharedSnapshot,
        resetToLocalDefaults,
        buildShareUrl,
        activeBrainSelection,
        selectBrainHub,
        linkPathwayNodeToBrain,
        neuralCoreState,
        activeNeuralSystem: neuralCoreState.activeSystem,
        setActiveNeuralSystem,
        toggleNeuralSystem,
        activeSimulationSystem,
        setActiveSimulationSystem,
        solarTimeScale: neuralCoreState.solarTimeScale,
        setSolarTimeScale,
        galaxyRotationSpeed: neuralCoreState.galaxyRotationSpeed,
        setGalaxyRotationSpeed,
        neuralGalaxyPreset: neuralCoreState.galaxyPreset,
        setNeuralGalaxyPreset,
        neuralObservatoryFinish: neuralCoreState.observatoryFinish,
        setNeuralObservatoryFinish,
        neuralBloomIntensity: neuralCoreState.bloomIntensity,
        setNeuralBloomIntensity,
        nebulaMode: neuralCoreState.nebulaMode,
        setNebulaMode,
        toggleNebulaMode,
        nebulaDensity: neuralCoreState.nebulaDensity,
        setNebulaDensity,
        particleTurbulence: neuralCoreState.particleTurbulence,
        setParticleTurbulence,
        starDensity: neuralCoreState.starDensity,
        setStarDensity,
        orbitalDecay: neuralCoreState.orbitalDecay,
        setOrbitalDecay,
        orbitalSpread: neuralCoreState.orbitalSpread,
        setOrbitalSpread,
        galaxyCameraPreset: neuralCoreState.galaxyCameraPreset,
        setGalaxyCameraPreset,
        galaxyAutoRotate: neuralCoreState.galaxyAutoRotate,
        setGalaxyAutoRotate,
        solarOrbitalVelocity: neuralCoreState.solarOrbitalVelocity,
        setSolarOrbitalVelocity,
        solarOrbitalInclinationDeg: neuralCoreState.solarOrbitalInclinationDeg,
        setSolarOrbitalInclinationDeg,
        solarConfigurationPreset: neuralCoreState.solarConfigurationPreset,
        setSolarConfigurationPreset,
        solarViewMode: neuralCoreState.solarViewMode,
        setSolarViewMode,
        solarShowOrbits: neuralCoreState.solarShowOrbits,
        setSolarShowOrbits,
        solarAutoRotate: neuralCoreState.solarAutoRotate,
        setSolarAutoRotate,
        solarDayNightCycle: neuralCoreState.solarDayNightCycle,
        setSolarDayNightCycle,
        solarShowConstellations: neuralCoreState.solarShowConstellations,
        setSolarShowConstellations,
        solarShowResonance: neuralCoreState.solarShowResonance,
        setSolarShowResonance,
        solarFollowPlanet: neuralCoreState.solarFollowPlanet,
        setSolarFollowPlanet,
        resetNeuralCoreState,
        investorCalculatorState,
        investorCalculatorHydrated,
        updateInvestorCalculatorState,
        resetInvestorCalculatorState,
        savedCalculatorScenarios,
        saveCalculatorScenario,
        applyCalculatorScenario,
        deleteCalculatorScenario,
        workspaceSnapshots,
        saveWorkspaceSnapshot,
        restoreWorkspaceSnapshot,
        deleteWorkspaceSnapshot,
        currency,
        setCurrency,
        personaTrack,
        setPersonaTrack,
        bookmarkedDocIds,
        toggleDocBookmark,
        investorFeedback,
        addInvestorFeedback,
        replyInvestorFeedback,
        deleteInvestorFeedback,
        contactInquiries,
        submitContactInquiry,
        deleteContactInquiry,
        dataRoomOpen,
        setDataRoomOpen,
        contactModalOpen,
        contactModalTopic,
        openContactModal,
        closeContactModal,
        intelligenceModalOpen,
        intelligenceFocusSection,
        openIntelligenceModal,
        closeIntelligenceModal,
        arPreviewTarget,
        openArPreview,
        closeArPreview,
        loadCaseStudyStack,
        openBriefingSection,
        isInvestorBriefingRoute,
        ssotQueryState,
        setSsotQueryState,
        navigateToInvestorBriefing,
        exitInvestorBriefing,
        persistenceService,
        syncStatus,
        isOnline,
        lastSyncedAt,
        storageRevision,
        forceSync,
        getStorageMetrics,
        clearLocalCachedData,
        exportOfflineBackup,
        autoCleanupEnabled,
        setAutoCleanupEnabled,
        lastAutoCleanupAt,
        lastAutoCleanupPurgedCount,
        runSnapshotCleanup,
        investorBriefingCachedAt,
        memoryStats,
        syncConflictState,
        triggerSyncConflictSimulation,
        resolveSyncConflict,
        performanceMonitor,
        onProfilerRender,
        isInternalDeveloper,
        setInternalDeveloperMode,
        toggleInternalDeveloperMode,
      }}
    >
      {children}
    </StackContext.Provider>
  );
}

export function useStack() {
  const ctx = useContext(StackContext);
  if (!ctx) throw new Error('useStack must be used inside StackProvider');
  return ctx;
}
