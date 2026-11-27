import React, { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowRight,
  ArrowUpDown,
  Calculator,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  GitCompareArrows,
  Globe2,
  Loader2,
  MapPin,
  Navigation,
  Plus,
  Printer,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  FINANCIAL_TRAJECTORY,
  SERVER_TIERS,
  SPENTA_APPS,
} from '../data/spentaManifest';
import {
  REVENUE_SCOPES,
  REGIONAL_HUBS,
  RevenueScopeId,
  computeProductRoi,
} from '../data/roiModel';
import {
  COMPETITIVE_EDGE_MATRIX,
  GLOBAL_PEER_COMPARABLES,
  GROWTH_MODE_SPECS,
  GrowthMode,
  ROI_CONFIDENCE_EVIDENCE_NOTE,
} from '../data/spentaEnrichments';
import { useStack } from '../store/StackContext';
import { SpentaLogo } from './SpentaLogo';
import {
  QuarterRow,
  QuarterlyExecutiveSummaryData,
  exportQuarterlySummaryToPdf,
} from '../utils/exportQuarterlySummaryPdf';
import { copyTextWithFallback } from '../utils/shareUrlCodec';
import {
  BenchmarkVerifyPayload,
  MixPresetId,
  RoiRevenueModeler,
  SharedSearchBenchmarkState,
} from './RoiRevenueModeler';
import {
  BUILD_SCOPE_IDS,
  DEFAULT_MIX_WEIGHTS,
  DEFAULT_PRESET_OPEX,
  PRESET_REVENUE_SCALE_K,
} from './RevenueMixModeler';
import {
  MapsQueryPayload,
  RegionalMarketMapsView,
  SharedMapsMarketState,
} from './RegionalMarketMapsView';
import {
  InvestorRoiCalculator,
  computeInvestorRoiSeries,
  formatUsdFromK,
} from './InvestorRoiCalculator';
import { localPersistenceService } from '../utils/LocalPersistenceService';

type ScenarioMode = 'conservative' | 'upside';
type SortField = 'gmPct' | 'setupUsd' | 'minServerTier' | 'name';
type QuarterKey = 'Q1' | 'Q2' | 'Q3' | 'Q4';
type FinancialsSubTab = 'pnl' | 'roi' | 'maps';

const QUARTER_WEIGHTS: { quarter: QuarterKey; weight: number }[] = [
  { quarter: 'Q1', weight: 0.21 },
  { quarter: 'Q2', weight: 0.24 },
  { quarter: 'Q3', weight: 0.26 },
  { quarter: 'Q4', weight: 0.29 },
];

function formatCompactUsdK(valK: number): string {
  if (valK >= 1000) return `$${(valK / 1000).toFixed(2)}M`;
  return `$${valK.toFixed(1)}K`;
}

function renderGroundedMarkdown(text: string) {
  const lines = text.split('\n').filter((line) => line.trim().length > 0);
  return (
    <div className="space-y-1.5 text-xs leading-relaxed text-[#334155] dark:text-[#C8D0E4]">
      {lines.slice(0, 8).map((raw, idx) => {
        const cleaned = raw.replace(/^#{1,3}\s*/, '').replace(/^[-*•]\s*/, '').trim();
        const isBullet = /^[-*•]\s/.test(raw.trim());
        const parts = cleaned.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={idx} className={isBullet ? 'pl-3 relative' : ''}>
            {isBullet && (
              <span
                aria-hidden="true"
                className="absolute left-0 top-0 text-[#1C6E46] dark:text-[#6FCB9F] font-bold"
              >
                ·
              </span>
            )}
            {parts.map((part, pIdx) =>
              part.startsWith('**') && part.endsWith('**') ? (
                <strong key={pIdx} className="font-semibold text-[#16213A] dark:text-[#E7EBF5]">
                  {part.slice(2, -2)}
                </strong>
              ) : (
                <React.Fragment key={pIdx}>{part}</React.Fragment>
              ),
            )}
          </p>
        );
      })}
    </div>
  );
}

export function FinancialsView() {
  const {
    theme,
    selectedIds,
    selectedApps,
    stackMetrics,
    toggleApp,
    investorCalculatorState,
    investorCalculatorHydrated,
    updateInvestorCalculatorState,
    currency,
    setCurrency,
    openBriefingSection,
    openIntelligenceModal,
    setDataRoomOpen,
  } = useStack();
  const {
    scenario,
    growthMode,
    fxRate,
    taxRate,
    exitMultiple,
    dilutionPct,
    investmentK,
    horizonYears,
    compareGrowthScenarios,
    projectedChartMetric,
    subTab,
    mixPreset,
    mixScopeWeights: rawMixScopeWeights,
    mixOpexRatioPct,
  } = investorCalculatorState;

  const mixScopeWeights = rawMixScopeWeights as Record<RevenueScopeId, number>;

  const setScenario = (val: ScenarioMode) => updateInvestorCalculatorState({ scenario: val });
  const setGrowthMode = (val: GrowthMode) => updateInvestorCalculatorState({ growthMode: val });
  const setFxRate = (val: number) => updateInvestorCalculatorState({ fxRate: val });
  const setTaxRate = (val: number) => updateInvestorCalculatorState({ taxRate: val });
  const setExitMultiple = (val: number) => updateInvestorCalculatorState({ exitMultiple: val });
  const setDilutionPct = (val: number) => updateInvestorCalculatorState({ dilutionPct: val });
  const setInvestmentK = (val: number) => updateInvestorCalculatorState({ investmentK: val });
  const setHorizonYears = (val: number) => updateInvestorCalculatorState({ horizonYears: val });
  const setCompareGrowthScenarios = (val: boolean | ((prev: boolean) => boolean)) =>
    updateInvestorCalculatorState((prev) => ({
      ...prev,
      compareGrowthScenarios:
        typeof val === 'function' ? val(prev.compareGrowthScenarios) : val,
    }));
  const setProjectedChartMetric = (val: 'value' | 'moic') =>
    updateInvestorCalculatorState({ projectedChartMetric: val });
  const setSubTab = (val: FinancialsSubTab) => updateInvestorCalculatorState({ subTab: val });
  const setMixPreset = (val: MixPresetId) => updateInvestorCalculatorState({ mixPreset: val });
  const setMixScopeWeights = (
    val:
      | Record<RevenueScopeId, number>
      | ((prev: Record<RevenueScopeId, number>) => Record<RevenueScopeId, number>),
  ) =>
    updateInvestorCalculatorState((prev) => ({
      ...prev,
      mixScopeWeights:
        typeof val === 'function'
          ? val(prev.mixScopeWeights as Record<RevenueScopeId, number>)
          : val,
    }));
  const setMixOpexRatioPct = (val: number) =>
    updateInvestorCalculatorState({ mixOpexRatioPct: val });

  const [sortField, setSortField] = useState<SortField>('gmPct');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [roiInitialAppId, setRoiInitialAppId] = useState<string>(SPENTA_APPS[0].id);

  const [summaryOpen, setSummaryOpen] = useState<boolean>(false);
  const [summaryYearIndex, setSummaryYearIndex] = useState<number>(0);
  const [summaryQuarter, setSummaryQuarter] = useState<QuarterKey>('Q4');
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  // Server-side Google Search (Live ROI Benchmarks) state inside FinancialsView
  const [benchmarkAppId, setBenchmarkAppId] = useState<string>(SPENTA_APPS[0].id);
  const [searchBenchmark, setSearchBenchmark] = useState<SharedSearchBenchmarkState>({
    loading: false,
    error: null,
    data: null,
    subject: '',
  });

  // Server-side Google Maps (Client Market Data) state inside FinancialsView
  const [quickHubId, setQuickHubId] = useState<'san-jose' | 'sydney' | 'dhaka'>('dhaka');
  const [quickUserCoords, setQuickUserCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [mapsMarket, setMapsMarket] = useState<SharedMapsMarketState>({
    loading: false,
    error: null,
    result: null,
    activePromptLabel: '',
    activeHubLabel: REGIONAL_HUBS[2].name,
  });

  const [scopeLineMetric, setScopeLineMetric] = useState<'revenue' | 'share'>('revenue');
  const [hiddenScopeLines, setHiddenScopeLines] = useState<RevenueScopeId[]>([]);
  const [csvExported, setCsvExported] = useState<boolean>(false);

  const activeGrowthSpec = GROWTH_MODE_SPECS[growthMode];

  const toggleScopeLineVisibility = (scopeId: RevenueScopeId) => {
    setHiddenScopeLines((prev) =>
      prev.includes(scopeId) ? prev.filter((id) => id !== scopeId) : [...prev, scopeId],
    );
  };

  const handleApplyMixPreset = (preset: MixPresetId) => {
    setMixPreset(preset);
    setMixScopeWeights(DEFAULT_MIX_WEIGHTS[preset]);
    setMixOpexRatioPct(DEFAULT_PRESET_OPEX[preset]);
  };

  const handleChangeMixScopeWeight = (scopeId: RevenueScopeId, value: number) => {
    setMixScopeWeights((prev) => ({ ...prev, [scopeId]: value }));
  };

  const revenueMixPieData = useMemo(() => {
    const totalWeight = Object.values(mixScopeWeights).reduce((s, v) => s + v, 0) || 1;
    const scaleK = Number(
      (PRESET_REVENUE_SCALE_K[mixPreset].totalRevK * activeGrowthSpec.mixMultiplier).toFixed(1),
    );
    let totalGpK = 0;
    let buildRevK = 0;
    let recurringRevK = 0;

    const slices = REVENUE_SCOPES.map((scope) => {
      const sharePct = (mixScopeWeights[scope.id] / totalWeight) * 100;
      const revK = (sharePct / 100) * scaleK;
      const gpK = revK * (scope.grossMarginPct / 100);
      totalGpK += gpK;
      if (BUILD_SCOPE_IDS.includes(scope.id)) buildRevK += revK;
      else recurringRevK += revK;
      return {
        ...scope,
        sharePct: Number(sharePct.toFixed(1)),
        revK: Number(revK.toFixed(1)),
        gpK: Number(gpK.toFixed(1)),
        gmContributionPct: Number(((sharePct / 100) * scope.grossMarginPct).toFixed(1)),
      };
    });

    const weightedGmPct = scaleK > 0 ? Number(((totalGpK / scaleK) * 100).toFixed(1)) : 0;
    const impliedEbitdaPct = Number((weightedGmPct - mixOpexRatioPct).toFixed(1));
    const recurringSharePct = scaleK > 0 ? Number(((recurringRevK / scaleK) * 100).toFixed(1)) : 0;
    const buildSharePct = Number((100 - recurringSharePct).toFixed(1));

    return {
      slices,
      scaleK,
      scaleLabel: PRESET_REVENUE_SCALE_K[mixPreset].label,
      weightedGmPct,
      impliedEbitdaPct,
      buildSharePct,
      recurringSharePct,
      totalGpK: Number(totalGpK.toFixed(1)),
    };
  }, [mixScopeWeights, mixPreset, mixOpexRatioPct, activeGrowthSpec.mixMultiplier]);

  const isDark = theme === 'dark';

  const handleFetchSearchBenchmarks = async (payload: BenchmarkVerifyPayload) => {
    setSearchBenchmark((prev) => ({
      ...prev,
      loading: true,
      error: null,
      subject: payload.subject,
    }));
    try {
      const res = await fetch('/api/gemini/search-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: payload.query,
          context: {
            ...payload.context,
            scenarioLabel:
              scenario === 'conservative'
                ? 'Conservative Base (~0.5825x 5Y avg)'
                : 'Healthcare Upside ($4.80M Y3)',
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || 'Live ROI benchmark verification failed.');
      }
      setSearchBenchmark({
        loading: false,
        error: null,
        subject: payload.subject,
        data: {
          text: json.text || '',
          sources: Array.isArray(json.sources) ? json.sources : [],
          searchQueries: Array.isArray(json.searchQueries) ? json.searchQueries : [],
        },
      });
    } catch (err) {
      setSearchBenchmark((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Unable to reach Search grounding service.',
      }));
    }
  };

  const handleFetchMapsMarketData = async (payload: MapsQueryPayload) => {
    setMapsMarket((prev) => ({
      ...prev,
      loading: true,
      error: null,
      activePromptLabel: payload.label,
      activeHubLabel: payload.hubLabel,
    }));
    try {
      const res = await fetch('/api/gemini/maps-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: payload.query,
          hubLabel: payload.hubLabel,
          latLng: payload.latLng,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || 'Client market Maps grounding request failed.');
      }
      setMapsMarket({
        loading: false,
        error: null,
        activePromptLabel: payload.label,
        activeHubLabel: payload.hubLabel,
        result: {
          text: json.text || '',
          sources: Array.isArray(json.sources) ? json.sources : [],
        },
      });
    } catch (err) {
      setMapsMarket((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Unable to reach Maps grounding service.',
      }));
    }
  };

  const handleQuickBenchmarkCheck = () => {
    const app = SPENTA_APPS.find((a) => a.id === benchmarkAppId) ?? SPENTA_APPS[0];
    const roi = computeProductRoi(app.id);
    void handleFetchSearchBenchmarks({
      subject: app.name,
      query: `Verify 2026 enterprise industry ROI, implementation timeline, and 3-year TCO benchmarks for ${app.name} (${app.tagline}) versus Spenta Sovereign OS (${app.setupLabel}, ${app.recurringLabel}, ${app.gmPct.toFixed(1)}% GM, modeled 12-month client ROI ${roi.client12MoRoiPct}%, payback ${roi.paybackMonths} months, 3-yr TCO $${(roi.spenta3YrTcoUsd / 1000).toFixed(1)}K vs Western equivalent $${(roi.western3YrTcoUsd / 1000).toFixed(1)}K).`,
      context: {
        productName: app.name,
        modeledRoiPct: roi.client12MoRoiPct,
        paybackMonths: roi.paybackMonths,
        spentaThreeYrTcoUsd: roi.spenta3YrTcoUsd,
        westernThreeYrTcoUsd: roi.western3YrTcoUsd,
      },
    });
  };

  const handleQuickMarketFetch = (presetIndex = 0) => {
    const hub = REGIONAL_HUBS.find((h) => h.id === quickHubId) ?? REGIONAL_HUBS[2];
    const preset = hub.presetQueries[presetIndex] ?? hub.presetQueries[0];
    const coords = quickUserCoords ?? { latitude: hub.latitude, longitude: hub.longitude };
    void handleFetchMapsMarketData({
      query: preset.prompt,
      label: preset.label,
      hubLabel: quickUserCoords ? 'Current User Location' : hub.name,
      latLng: coords,
    });
  };

  const handleQuickGeolocate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          latitude: Number(pos.coords.latitude.toFixed(5)),
          longitude: Number(pos.coords.longitude.toFixed(5)),
        };
        setQuickUserCoords(coords);
        void handleFetchMapsMarketData({
          query: `Identify major enterprise hospitals, regulated banks, or industrial technology centers near these coordinates suitable for Spenta Sovereign OS on-premises AI and ERP deployments.`,
          label: 'Enterprise Prospects Near Me',
          hubLabel: `Current Location (${coords.latitude}, ${coords.longitude})`,
          latLng: coords,
        });
      },
      () => {
        setQuickUserCoords(null);
      },
      { timeout: 8000 },
    );
  };

  useEffect(() => {
    if (!summaryOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSummaryOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [summaryOpen]);

  const modeledSeries = useMemo(() => {
    const baseBdtBurnRatio = 0.65;
    const fxDeltaFactor = 120 / fxRate - 1;

    let cumEbitda = 0;
    let cumNet = 0;

    return FINANCIAL_TRAJECTORY.map((row, idx) => {
      const growthFactor =
        growthMode === 'aggressive'
          ? Number(Math.pow(activeGrowthSpec.annualCompoundBase, idx).toFixed(3))
          : 1.0;
      const baseRevK = scenario === 'conservative' ? row.conservativeRevK : row.upsideRevK;
      const baseEbitdaK = scenario === 'conservative' ? row.conservativeEbitdaK : row.upsideEbitdaK;
      const revK = Number((baseRevK * growthFactor).toFixed(1));
      const scaledBaseEbitdaK = baseEbitdaK * growthFactor;
      const impliedOpexK = revK - scaledBaseEbitdaK;
      const fxCostAdjustmentK = impliedOpexK * baseBdtBurnRatio * fxDeltaFactor;
      const ebitdaK = Math.max(0, Number((scaledBaseEbitdaK - fxCostAdjustmentK).toFixed(1)));
      const netProfitK = Number((ebitdaK * (1 - taxRate / 100)).toFixed(1));

      cumEbitda += ebitdaK;
      cumNet += netProfitK;

      return {
        ...row,
        growthFactor,
        revK,
        ebitdaK,
        netProfitK,
        cumEbitdaK: Number(cumEbitda.toFixed(1)),
        cumNetK: Number(cumNet.toFixed(1)),
        capitalEfficiencyMultiple: Number((cumNet / 500).toFixed(2)),
      };
    });
  }, [scenario, fxRate, taxRate, growthMode, activeGrowthSpec.annualCompoundBase]);

  // 5-Year (FY2027-FY2031) 5-Scope Revenue Mix Modeler Projection Series (synced with Growth Mode)
  const fiveYearScopeSeries = useMemo(() => {
    const startTotalWeight =
      Object.values(DEFAULT_MIX_WEIGHTS.fy27).reduce((sum, val) => sum + val, 0) || 1;
    const endTotalWeight =
      Object.values(mixScopeWeights).reduce((sum, val) => sum + val, 0) || 1;
    const yearCount = Math.max(modeledSeries.length - 1, 1);

    return modeledSeries.map((row, idx) => {
      const progress = idx / yearCount;
      const growthFactor = row.growthFactor;
      const scaledTotalRevK = row.revK;
      let weightedGmPct = 0;

      const scopeRevK = {} as Record<RevenueScopeId, number>;
      const scopeSharePct = {} as Record<RevenueScopeId, number>;

      REVENUE_SCOPES.forEach((scope) => {
        const startShare = DEFAULT_MIX_WEIGHTS.fy27[scope.id] / startTotalWeight;
        const endShare = mixScopeWeights[scope.id] / endTotalWeight;
        const interpolatedShare = startShare + (endShare - startShare) * progress;
        const sharePct = Number((interpolatedShare * 100).toFixed(1));
        const revK = Number((scaledTotalRevK * interpolatedShare).toFixed(1));

        scopeSharePct[scope.id] = sharePct;
        scopeRevK[scope.id] = revK;
        weightedGmPct += interpolatedShare * scope.grossMarginPct;
      });

      return {
        year: row.year,
        label: row.label,
        growthFactor,
        totalRevK: scaledTotalRevK,
        weightedGmPct: Number(weightedGmPct.toFixed(1)),
        one_time_builds: scopeRevK.one_time_builds,
        recurring_saas: scopeRevK.recurring_saas,
        managed_retainers: scopeRevK.managed_retainers,
        ip_royalties: scopeRevK.ip_royalties,
        captive_ecosystem: scopeRevK.captive_ecosystem,
        one_time_builds_pct: scopeSharePct.one_time_builds,
        recurring_saas_pct: scopeSharePct.recurring_saas,
        managed_retainers_pct: scopeSharePct.managed_retainers,
        ip_royalties_pct: scopeSharePct.ip_royalties,
        captive_ecosystem_pct: scopeSharePct.captive_ecosystem,
      };
    });
  }, [modeledSeries, mixScopeWeights]);

  const handleExportFiveYearCsv = () => {
    const headers = [
      'Fiscal Year',
      'Period',
      'Growth Mode',
      'Disciplined Factor',
      'Total Revenue ($K)',
      'One-Time Builds ($K)',
      'Recurring SaaS ARR ($K)',
      'Managed Retainers ($K)',
      '3D & Dataset IP ($K)',
      'Captive Ecosystem ($K)',
      'Revenue-Weighted GM (%)',
      'Target 3-5Yr Annual ROI Band',
    ];
    const rows = fiveYearScopeSeries.map((r) => [
      r.year,
      r.label,
      activeGrowthSpec.label,
      `${r.growthFactor.toFixed(3)}x`,
      r.totalRevK.toFixed(1),
      r.one_time_builds.toFixed(1),
      r.recurring_saas.toFixed(1),
      r.managed_retainers.toFixed(1),
      r.ip_royalties.toFixed(1),
      r.captive_ecosystem.toFixed(1),
      r.weightedGmPct.toFixed(1),
      `${activeGrowthSpec.targetRoiMinPct}%-${activeGrowthSpec.targetRoiMaxPct}%`,
    ]);
    const csvLines = [headers, ...rows]
      .map((cols) => cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`\uFEFF${csvLines}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `spenta-5yr-revenue-projections-${growthMode}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setCsvExported(true);
    window.setTimeout(() => setCsvExported(false), 2200);
  };

  const y1 = modeledSeries[0];
  const y4 = modeledSeries[3];
  const y5 = modeledSeries[4];
  const horizonSeries = useMemo(
    () => modeledSeries.slice(0, horizonYears),
    [modeledSeries, horizonYears],
  );
  const horizonScopeSeries = useMemo(
    () => fiveYearScopeSeries.slice(0, horizonYears),
    [fiveYearScopeSeries, horizonYears],
  );
  const horizonRow = horizonSeries[horizonSeries.length - 1] ?? y5;
  const dhakaY1UsdK = Number((64800 / fxRate).toFixed(1));
  const dhakaLoadedHourlyUsd = Number(((dhakaY1UsdK * 1000) / 41600).toFixed(2));
  // $500K SAFE at $4.5M post-money cap = 11.11% pre-dilution; adjusted for subsequent round dilution
  const preDilutionOwnership = 500 / 4500;
  const effectiveOwnership = preDilutionOwnership * (1 - dilutionPct / 100);
  const effectiveOwnershipPct = Number((effectiveOwnership * 100).toFixed(2));
  const impliedExitEvM = Number(((y5.ebitdaK * exitMultiple) / 1000).toFixed(2));
  const safeExitProceedsM = Number(((y5.ebitdaK * exitMultiple * effectiveOwnership) / 1000).toFixed(2));
  const safeEquityRoiMultiple = Number(
    ((y5.ebitdaK * exitMultiple * effectiveOwnership) / 500).toFixed(2),
  );
  const safeRoiAt10xPreDil = Number(((y5.ebitdaK * 10 * preDilutionOwnership) / 500).toFixed(2));
  const safeRoiAt10xSeriesA = Number(
    ((y5.ebitdaK * 10 * preDilutionOwnership * 0.8) / 500).toFixed(2),
  );
  const safeRoiAt15xPreDil = Number(((y5.ebitdaK * 15 * preDilutionOwnership) / 500).toFixed(2));

  // Dynamic investor-tier & horizon-synced metrics for KPI strip
  const tierOwnership = (investmentK / 4500) * (1 - dilutionPct / 100);
  const tierOwnershipPct = Number((tierOwnership * 100).toFixed(2));
  const horizonExitEvM = Number(((horizonRow.ebitdaK * exitMultiple) / 1000).toFixed(2));
  const tierProceedsK = horizonRow.ebitdaK * exitMultiple * tierOwnership;
  const tierProceedsM = Number((tierProceedsK / 1000).toFixed(2));
  const tierRoiMultiple = investmentK > 0 ? Number((tierProceedsK / investmentK).toFixed(2)) : 0;

  const investorRoiSeries = useMemo(
    () =>
      computeInvestorRoiSeries({
        modeledSeries,
        scenario,
        horizonYears,
        exitMultiple,
        dilutionPct,
        investmentK,
        fxRate,
      }),
    [modeledSeries, scenario, horizonYears, exitMultiple, dilutionPct, investmentK, fxRate],
  );
  const terminalRoiPoint = investorRoiSeries[investorRoiSeries.length - 1] ?? investorRoiSeries[0];

  // Persist computed chart projection series to IndexedDB whenever calculator outputs update
  useEffect(() => {
    if (!investorCalculatorHydrated) return;
    const timer = window.setTimeout(() => {
      void localPersistenceService.saveChartProjection('investor_roi_series', investorRoiSeries, {
        scenario,
        growthMode,
        investmentK,
        horizonYears,
        exitMultiple,
        dilutionPct,
        compareGrowthScenarios,
        projectedChartMetric,
      });
      void localPersistenceService.saveChartProjection('modeled_pnl_series', modeledSeries, {
        scenario,
        growthMode,
        fxRate,
        taxRate,
      });
    }, 180);

    return () => window.clearTimeout(timer);
  }, [
    investorCalculatorHydrated,
    scenario,
    growthMode,
    fxRate,
    taxRate,
    exitMultiple,
    dilutionPct,
    investmentK,
    horizonYears,
    compareGrowthScenarios,
    projectedChartMetric,
    investorRoiSeries,
    modeledSeries,
  ]);

  const summaryData = useMemo<QuarterlyExecutiveSummaryData>(() => {
    const activeRow = modeledSeries[summaryYearIndex] ?? modeledSeries[0];
    const quarters: QuarterRow[] = QUARTER_WEIGHTS.map(({ quarter, weight }) => {
      const revK = Number((activeRow.revK * weight).toFixed(1));
      const ebitdaK = Number((activeRow.ebitdaK * weight).toFixed(1));
      const netProfitK = Number((activeRow.netProfitK * weight).toFixed(1));
      const ebitdaMarginPct = revK > 0 ? Number(((ebitdaK / revK) * 100).toFixed(1)) : 0;
      return {
        quarter,
        weightPct: Math.round(weight * 100),
        revK,
        ebitdaK,
        netProfitK,
        ebitdaMarginPct,
      };
    });

    const selectedQuarterRow =
      quarters.find((q) => q.quarter === summaryQuarter) ?? quarters[3];
    const tierSpec = SERVER_TIERS[stackMetrics.tier];

    return {
      fiscalYear: activeRow.year,
      fiscalLabel: activeRow.label,
      quarter: summaryQuarter,
      scenarioLabel:
        scenario === 'conservative'
          ? 'Conservative Base (~0.5825x 5Y avg)'
          : 'Healthcare Upside ($4.80M Y3)',
      fxRate,
      taxRate,
      dhakaY1UsdK,
      annualRevK: activeRow.revK,
      annualEbitdaK: activeRow.ebitdaK,
      annualNetProfitK: activeRow.netProfitK,
      cumNetK: activeRow.cumNetK,
      capitalEfficiencyMultiple: activeRow.capitalEfficiencyMultiple,
      fiveYearCapitalEfficiency: y5.capitalEfficiencyMultiple,
      fiveYearCumNetM: Number((y5.cumNetK / 1000).toFixed(3)),
      exitEbitdaMultiple: exitMultiple,
      dilutionPct,
      effectiveOwnershipPct,
      safeEquityRoiMultiple,
      impliedExitEvM,
      milestone: scenario === 'conservative' ? activeRow.milestone : activeRow.upsideMilestone,
      quarters,
      selectedQuarterRow,
      stackModuleCount: selectedApps.length,
      stackModuleNames: selectedApps.map((a) => a.shortName),
      stackSetupUsd: stackMetrics.oneTimeBuildUsd,
      stackQuarterlyRetainerUsd: stackMetrics.quarterlyRetainerUsd,
      stackBlendedGmPct: stackMetrics.blendedGmPct,
      recommendedTierCode: tierSpec.code,
      recommendedTierName: tierSpec.name,
      recommendedTierCapex: tierSpec.capex,
      generatedAtLabel: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      }),
    };
  }, [
    modeledSeries,
    summaryYearIndex,
    summaryQuarter,
    scenario,
    fxRate,
    taxRate,
    dhakaY1UsdK,
    y5,
    exitMultiple,
    dilutionPct,
    effectiveOwnershipPct,
    safeEquityRoiMultiple,
    impliedExitEvM,
    selectedApps,
    stackMetrics,
  ]);

  const handleCopySummaryText = async () => {
    const q = summaryData.selectedQuarterRow;
    const text = [
      `SPENTA SOVEREIGN OS — ${summaryData.quarter} ${summaryData.fiscalYear} (${summaryData.fiscalLabel}) EXECUTIVE SUMMARY`,
      '========================================================================',
      `Scenario: ${summaryData.scenarioLabel} | FX: ${summaryData.fxRate} BDT/USD | Tax: ${summaryData.taxRate.toFixed(1)}% | Dilution: ${dilutionPct}%`,
      '',
      `[${summaryData.quarter} ${summaryData.fiscalYear} HEADLINE PERFORMANCE — ${q.weightPct}% ANNUAL SHARE]`,
      `  • Quarterly Revenue:   ${formatCompactUsdK(q.revK)} (Annualized Run-Rate: ${formatCompactUsdK(q.revK * 4)}/yr)`,
      `  • Quarterly EBITDA:    ${formatCompactUsdK(q.ebitdaK)} (${q.ebitdaMarginPct.toFixed(1)}% margin)`,
      `  • Quarterly Net Profit:${formatCompactUsdK(q.netProfitK)} (after ${summaryData.taxRate.toFixed(1)}% corp. tax)`,
      `  • Modeled SAFE Exit:   ${summaryData.safeEquityRoiMultiple.toFixed(2)}x at ${summaryData.exitEbitdaMultiple}x Y5 EBITDA (EV $${summaryData.impliedExitEvM.toFixed(2)}M · ${effectiveOwnershipPct.toFixed(2)}% ownership)`,
      `  • Capital Efficiency:  ${summaryData.capitalEfficiencyMultiple.toFixed(2)}x through ${summaryData.fiscalYear} (5-Yr Cum. Net / $500K: ${summaryData.fiveYearCapitalEfficiency.toFixed(2)}x — company operating metric)`,
      '',
      `[FULL-YEAR ${summaryData.fiscalYear} RECONCILIATION]`,
      `  • Revenue: ${formatCompactUsdK(summaryData.annualRevK)} | EBITDA: ${formatCompactUsdK(summaryData.annualEbitdaK)} | Net Profit: ${formatCompactUsdK(summaryData.annualNetProfitK)}`,
      `  • 20-FTE Dhaka Hub (64.8M BDT): $${summaryData.dhakaY1UsdK}K/yr`,
      `  • Operating Milestone: ${summaryData.milestone}`,
      '',
      `[COMPOSED STACK CONTEXT]`,
      `  • Modules (${summaryData.stackModuleCount}/13): ${summaryData.stackModuleNames.join(', ') || 'None selected'}`,
      `  • One-Time Build: $${(summaryData.stackSetupUsd / 1000).toFixed(1)}K${
        summaryData.stackQuarterlyRetainerUsd && summaryData.stackQuarterlyRetainerUsd > 0
          ? ` + $${(summaryData.stackQuarterlyRetainerUsd / 1000).toFixed(1)}K/qtr retainers`
          : ''
      } | Rev-Weighted GM (Y1): ${summaryData.stackBlendedGmPct.toFixed(1)}% | Hardware: ${summaryData.recommendedTierCode} (${summaryData.recommendedTierCapex})`,
      '',
      'Spenta Technology (spenta.tech) · hello@spenta.tech',
    ].join('\n');

    const ok = await copyTextWithFallback(text);
    if (ok) {
      setCopiedSummary(true);
      window.setTimeout(() => setCopiedSummary(false), 2200);
    }
  };

  const sortedApps = useMemo(() => {
    return [...SPENTA_APPS].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else cmp = a[sortField] - b[sortField];
      return sortAsc ? cmp : -cmp;
    });
  }, [sortField, sortAsc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc((v) => !v);
    } else {
      setSortField(field);
      setSortAsc(field === 'name' || field === 'minServerTier');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-2xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#1C6E46] dark:text-[#6FCB9F]">
            RECONCILED 5-YEAR MODEL (FY2027–FY2031) · $500K POST-MONEY SAFE ($4.5M CAP · 20% DISC.)
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#16213A] dark:text-[#E7EBF5] tracking-tight mt-1">
            Financials — P&amp;L Trajectory, 13-Product ROI &amp; Regional Market Intelligence
          </h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Unified SSOT Currency"
              className="inline-flex rounded-lg bg-[#F2EFE9] dark:bg-[#0F1529] p-0.5 border border-[#E4DFD6] dark:border-[#232B4A]"
            >
              {(['USD', 'BDT'] as const).map((curr) => (
                <button
                  key={curr}
                  type="button"
                  onClick={() => setCurrency(curr)}
                  className={`px-2 py-1 rounded-md text-[11px] font-mono font-semibold transition-colors cursor-pointer ${
                    currency === curr
                      ? 'bg-[#1F3863] text-white dark:bg-[#8FA6E8] dark:text-[#0B1020]'
                      : 'text-[#5F6576] dark:text-[#8E96B0] hover:text-[#16213A] dark:hover:text-[#E7EBF5]'
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => openBriefingSection('ssot-unit-economics')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] text-[#16213A] dark:text-[#E7EBF5] hover:border-[#1C6E46] dark:hover:border-[#6FCB9F] transition-colors cursor-pointer"
            >
              <span>9-Tier Unit Economics</span>
              <ArrowRight className="w-3 h-3 text-[#1C6E46] dark:text-[#6FCB9F]" />
            </button>
            <button
              type="button"
              onClick={() => openIntelligenceModal('ssot-unit-economics')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] text-[#16213A] dark:text-[#E7EBF5] hover:border-[#1F3863] dark:hover:border-[#8FA6E8] transition-colors cursor-pointer"
            >
              <span>Investor Intelligence (D3)</span>
              <ArrowRight className="w-3 h-3 text-[#1F3863] dark:text-[#8FA6E8]" />
            </button>
            <button
              type="button"
              onClick={() => setDataRoomOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] text-[#16213A] dark:text-[#E7EBF5] hover:border-[#1C6E46] dark:hover:border-[#6FCB9F] transition-colors cursor-pointer"
            >
              <span>Data Room</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start xl:self-auto">
          {subTab === 'pnl' && (
            <div className="inline-flex flex-wrap rounded-xl bg-[#F2EFE9] dark:bg-[#0F1529] p-1 border border-[#E4DFD6] dark:border-[#232B4A]">
              <button
                type="button"
                onClick={() => setScenario('conservative')}
                className={`px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  scenario === 'conservative'
                    ? 'bg-[#1F3863] text-white dark:bg-[#8FA6E8] dark:text-[#0B1020]'
                    : 'text-[#5F6576] dark:text-[#8E96B0] hover:text-[#16213A] dark:hover:text-[#E7EBF5]'
                }`}
              >
                Conservative Base (~0.5825×)
              </button>
              <button
                type="button"
                onClick={() => setScenario('upside')}
                className={`px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  scenario === 'upside'
                    ? 'bg-[#1C6E46] text-white dark:bg-[#6FCB9F] dark:text-[#0B1020]'
                    : 'text-[#5F6576] dark:text-[#8E96B0] hover:text-[#16213A] dark:hover:text-[#E7EBF5]'
                }`}
              >
                Healthcare Upside ($4.80M Y3)
              </button>
            </div>
          )}

          <div
            role="group"
            aria-label="Growth Mode Scaling Toggle"
            className="inline-flex rounded-xl bg-[#F2EFE9] dark:bg-[#0F1529] p-1 border border-[#E4DFD6] dark:border-[#232B4A]"
          >
            <button
              type="button"
              onClick={() => setGrowthMode('conservative')}
              aria-pressed={growthMode === 'conservative'}
              className={`px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                growthMode === 'conservative'
                  ? 'bg-[#1F3863] text-white dark:bg-[#8FA6E8] dark:text-[#0B1020]'
                  : 'text-[#5F6576] dark:text-[#8E96B0] hover:text-[#16213A] dark:hover:text-[#E7EBF5]'
              }`}
            >
              Conservative (1.00×)
            </button>
            <button
              type="button"
              onClick={() => setGrowthMode('aggressive')}
              aria-pressed={growthMode === 'aggressive'}
              className={`px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                growthMode === 'aggressive'
                  ? 'bg-[#1C6E46] text-white dark:bg-[#6FCB9F] dark:text-[#0B1020]'
                  : 'text-[#5F6576] dark:text-[#8E96B0] hover:text-[#16213A] dark:hover:text-[#E7EBF5]'
              }`}
            >
              Aggressive Growth (1.12×)
            </button>
          </div>

          {subTab === 'pnl' && (
            <button
              type="button"
              onClick={() => setCompareGrowthScenarios((prev) => !prev)}
              aria-pressed={compareGrowthScenarios}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-xl border text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                compareGrowthScenarios
                  ? 'bg-[#1C6E46] text-white border-[#1C6E46] dark:bg-[#6FCB9F] dark:text-[#0B1020] dark:border-[#6FCB9F]'
                  : 'bg-[#F2EFE9] dark:bg-[#0F1529] border-[#E4DFD6] dark:border-[#232B4A] text-[#16213A] dark:text-[#E7EBF5] hover:border-[#1C6E46] dark:hover:border-[#6FCB9F]'
              }`}
            >
              <GitCompareArrows className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Compare Growth Scenarios</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportFiveYearCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-xl border border-[#1C6E46]/40 dark:border-[#6FCB9F]/40 bg-[#1C6E46]/10 dark:bg-[#6FCB9F]/15 text-[#1C6E46] dark:text-[#6FCB9F] hover:bg-[#1C6E46]/20 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {csvExported ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
            <span>{csvExported ? 'CSV Exported' : 'Export 5Y CSV'}</span>
          </button>

          <button
            type="button"
            onClick={() => setSummaryOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 sm:py-2 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Quick Generate</span>
          </button>
        </div>
      </section>

      {/* Financials Workspace Sub-Tab Bar */}
      <nav
        aria-label="Financials workspace views"
        className="flex flex-wrap items-center gap-2 border-b border-[#E4DFD6] dark:border-[#232B4A] pb-3"
      >
        {(
          [
            { id: 'pnl', label: 'P&L & Trajectory', icon: TrendingUp },
            { id: 'roi', label: '13-Product ROI & Revenue Scopes', icon: Calculator },
            { id: 'maps', label: 'Market & Regional Hubs (Maps)', icon: MapPin },
          ] as const
        ).map(({ id, label, icon: Icon }) => {
          const active = subTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSubTab(id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'bg-[#1F3863] text-white dark:bg-[#8FA6E8] dark:text-[#0B1020]'
                  : 'bg-white dark:bg-[#141A32] text-[#4A5568] dark:text-[#C8D0E4] border border-[#E4DFD6] dark:border-[#232B4A] hover:border-[#1C6E46] dark:hover:border-[#6FCB9F]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      {subTab === 'roi' && (
        <RoiRevenueModeler
          key={roiInitialAppId}
          initialAppId={roiInitialAppId}
          sharedBenchmark={searchBenchmark}
          onVerifyBenchmarks={handleFetchSearchBenchmarks}
          growthMode={growthMode}
          onChangeGrowthMode={setGrowthMode}
          revenueMixProps={{
            activePreset: mixPreset,
            scopeWeights: mixScopeWeights,
            targetOpexRatioPct: mixOpexRatioPct,
            growthMode,
            onApplyPreset: handleApplyMixPreset,
            onChangeScopeWeight: handleChangeMixScopeWeight,
            onChangeOpexRatio: setMixOpexRatioPct,
          }}
        />
      )}

      {subTab === 'maps' && (
        <RegionalMarketMapsView
          sharedMaps={mapsMarket}
          onRunMapsQuery={handleFetchMapsMarketData}
        />
      )}

      {subTab === 'pnl' && (
        <>
      {/* Monospace KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl p-5 bg-[#1F3863] dark:bg-[#141A32] text-white border border-[#1F3863] dark:border-[#6FCB9F]/40">
          <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#A7E6C6] dark:text-[#6FCB9F]">
            Selected Ticket · {dilutionPct === 0 ? 'Post-Money Cap' : `${dilutionPct}% Post-Seed Dil.`}
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-extrabold mt-1 tabular-nums">
            ${investmentK}K SAFE
          </div>
          <div className="text-xs text-[#C6D2EE] dark:text-[#8E96B0] font-mono mt-1 tabular-nums">
            $4.5M Cap ({tierOwnershipPct.toFixed(2)}% eff.) · 20% Disc.
          </div>
        </div>

        <div className="rounded-2xl p-5 bg-white dark:bg-[#141A32] border border-[#1C6E46]/35 dark:border-[#6FCB9F]/35">
          <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#1C6E46] dark:text-[#6FCB9F]">
            Investor SAFE ROI ({horizonRow.year} · {exitMultiple}× EV)
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-extrabold text-[#1C6E46] dark:text-[#6FCB9F] mt-1 tabular-nums">
            {tierRoiMultiple.toFixed(2)}×
          </div>
          <div className="text-xs text-[#4A5568] dark:text-[#8E96B0] font-mono mt-1 tabular-nums">
            {tierProceedsK >= 1000
              ? `$${tierProceedsM.toFixed(2)}M`
              : `$${Math.round(tierProceedsK).toLocaleString()}K`}{' '}
            proceeds · EV ${horizonExitEvM.toFixed(2)}M
          </div>
        </div>

        <div className="rounded-2xl p-5 bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A]">
          <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#5F6576] dark:text-[#8E96B0]">
            Capital Efficiency ({horizonYears}-Yr Co. Net ÷ $500K)
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-extrabold text-[#16213A] dark:text-[#E7EBF5] mt-1 tabular-nums">
            {horizonRow.capitalEfficiencyMultiple.toFixed(2)}×
          </div>
          <div className="text-xs text-[#4A5568] dark:text-[#8E96B0] font-mono mt-1 tabular-nums">
            Company Cum. Net ${(horizonRow.cumNetK / 1000).toFixed(3)}M · Y4: {y4.capitalEfficiencyMultiple.toFixed(2)}×
          </div>
        </div>

        <div className="rounded-2xl p-5 bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A]">
          <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#5F6576] dark:text-[#8E96B0]">
            {horizonRow.year} ({horizonRow.label}) Revenue &amp; Client ROI
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-extrabold text-[#16213A] dark:text-[#E7EBF5] mt-1 tabular-nums">
            {formatCompactUsdK(horizonRow.revK)}
          </div>
          <div className="text-xs text-[#4A5568] dark:text-[#8E96B0] font-mono mt-1 tabular-nums">
            Y1: ${y1.revK}K · Client ROI 250–350% (Bank: 450%+)
          </div>
        </div>
      </section>

      {/* Interactive Investor ROI Calculator (Tier & 1-5 Year Horizon Modeler) */}
      <InvestorRoiCalculator
        modeledSeries={modeledSeries}
        investorRoiSeries={investorRoiSeries}
        scenario={scenario}
        growthMode={growthMode}
        compareGrowthScenarios={compareGrowthScenarios}
        fxRate={fxRate}
        taxRate={taxRate}
        exitMultiple={exitMultiple}
        dilutionPct={dilutionPct}
        investmentK={investmentK}
        horizonYears={horizonYears}
        isDark={isDark}
        onToggleCompareGrowthScenarios={() => setCompareGrowthScenarios((prev) => !prev)}
        onChangeInvestmentK={setInvestmentK}
        onChangeHorizonYears={setHorizonYears}
        onChangeExitMultiple={setExitMultiple}
        onChangeDilutionPct={setDilutionPct}
      />

      {/* Projected Value Over Time Line Chart (Mapped Directly from Investor ROI Calculator Yearly Data) */}
      <section
        aria-label="Projected Value Over Time"
        className="rounded-2xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] p-5 sm:p-6 space-y-4"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-[#E4DFD6] dark:border-[#232B4A]">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#1C6E46] dark:text-[#6FCB9F] font-semibold">
              Yearly Investor ROI Trajectory · ${investmentK}K Allocation · {horizonYears}-Year Horizon (FY2027–{horizonRow.year})
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#16213A] dark:text-[#E7EBF5] tracking-tight mt-0.5">
              Projected Value Over Time
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto shrink-0">
            <div
              role="group"
              aria-label="Projected Value Over Time metric"
              className="inline-flex rounded-lg bg-[#F2EFE9] dark:bg-[#0F1529] p-0.5 border border-[#E4DFD6] dark:border-[#232B4A]"
            >
              <button
                type="button"
                onClick={() => setProjectedChartMetric('value')}
                aria-pressed={projectedChartMetric === 'value'}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  projectedChartMetric === 'value'
                    ? 'bg-[#1F3863] text-white dark:bg-[#8FA6E8] dark:text-[#0B1020]'
                    : 'text-[#5F6576] dark:text-[#8E96B0] hover:text-[#16213A] dark:hover:text-[#E7EBF5]'
                }`}
              >
                Equity Value ($K)
              </button>
              <button
                type="button"
                onClick={() => setProjectedChartMetric('moic')}
                aria-pressed={projectedChartMetric === 'moic'}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  projectedChartMetric === 'moic'
                    ? 'bg-[#1F3863] text-white dark:bg-[#8FA6E8] dark:text-[#0B1020]'
                    : 'text-[#5F6576] dark:text-[#8E96B0] hover:text-[#16213A] dark:hover:text-[#E7EBF5]'
                }`}
              >
                MOIC Multiple (×)
              </button>
            </div>

            <button
              type="button"
              onClick={() => setCompareGrowthScenarios((prev) => !prev)}
              aria-pressed={compareGrowthScenarios}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                compareGrowthScenarios
                  ? 'bg-[#1C6E46] text-white border-[#1C6E46] dark:bg-[#6FCB9F] dark:text-[#0B1020] dark:border-[#6FCB9F]'
                  : 'bg-[#FAF8F4] dark:bg-[#0F1529] border-[#E4DFD6] dark:border-[#232B4A] text-[#16213A] dark:text-[#E7EBF5] hover:border-[#1C6E46] dark:hover:border-[#6FCB9F]'
              }`}
            >
              <GitCompareArrows className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>{compareGrowthScenarios ? 'Comparing Aggressive vs. Conservative' : 'Compare Growth Scenarios'}</span>
            </button>
          </div>
        </div>

        <div className="h-[270px] sm:h-[310px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={investorRoiSeries}
              margin={{ top: 12, right: 16, left: 4, bottom: 8 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={isDark ? '#232B4A' : '#E4DFD6'}
                vertical={false}
              />
              <XAxis
                dataKey="year"
                tick={{
                  fontSize: 11,
                  fontFamily: 'JetBrains Mono, monospace',
                  fill: isDark ? '#8E96B0' : '#5F6576',
                }}
                axisLine={{ stroke: isDark ? '#232B4A' : '#E4DFD6' }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => {
                  const num = Number(v ?? 0);
                  if (projectedChartMetric === 'moic') return `${num.toFixed(1)}×`;
                  return num >= 1000 ? `$${(num / 1000).toFixed(1)}M` : `$${num}K`;
                }}
                tick={{
                  fontSize: 11,
                  fontFamily: 'JetBrains Mono, monospace',
                  fill: isDark ? '#8E96B0' : '#5F6576',
                }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value, name) => {
                  const num = Number(value ?? 0);
                  const label = String(name ?? '');
                  if (projectedChartMetric === 'moic') {
                    return [`${num.toFixed(2)}×`, label];
                  }
                  return [formatUsdFromK(num), label];
                }}
                labelFormatter={(label) => {
                  const match = investorRoiSeries.find((r) => r.year === String(label));
                  return match
                    ? `${match.year} (${match.label}) · Implied EV ${formatUsdFromK(match.impliedEvK)} · IRR ${match.annualizedIrrPct >= 0 ? '+' : ''}${match.annualizedIrrPct.toFixed(1)}%`
                    : String(label);
                }}
                contentStyle={{
                  borderRadius: '10px',
                  backgroundColor: isDark ? '#141A32' : '#FFFFFF',
                  border: isDark ? '1px solid #232B4A' : '1px solid #E4DFD6',
                  color: isDark ? '#E7EBF5' : '#16213A',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '12px',
                }}
                itemStyle={{ color: isDark ? '#E7EBF5' : '#16213A' }}
              />
              <Legend
                wrapperStyle={{
                  fontSize: '11px',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: isDark ? '#8E96B0' : '#5F6576',
                }}
              />
              <ReferenceLine
                y={projectedChartMetric === 'moic' ? 1 : investmentK}
                stroke={isDark ? '#8E96B0' : '#5F6576'}
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: projectedChartMetric === 'moic' ? '1.0× Break-even' : `Cost Basis $${investmentK}K`,
                  position: 'insideTopLeft',
                  fill: isDark ? '#8E96B0' : '#5F6576',
                  fontSize: 10,
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              />

              {projectedChartMetric === 'value' ? (
                compareGrowthScenarios ? (
                  <>
                    <Line
                      type="monotone"
                      dataKey="conservativeGrowthStakeK"
                      name="Conservative Growth 1.00× ($K)"
                      stroke={isDark ? '#8FA6E8' : '#1F3863'}
                      strokeWidth={2.75}
                      dot={{ r: 4, fill: isDark ? '#8FA6E8' : '#1F3863' }}
                      activeDot={{ r: 6 }}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="aggressiveGrowthStakeK"
                      name="Aggressive Growth 1.045ⁿ ($K)"
                      stroke={isDark ? '#6FCB9F' : '#1C6E46'}
                      strokeWidth={3}
                      dot={{ r: 4, fill: isDark ? '#6FCB9F' : '#1C6E46' }}
                      activeDot={{ r: 6 }}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="proRataCumNetK"
                      name="Pro-Rata Cum. Net Profit ($K)"
                      stroke={isDark ? '#F5C57B' : '#B45309'}
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      dot={{ r: 3, fill: isDark ? '#F5C57B' : '#B45309' }}
                      isAnimationActive={false}
                    />
                  </>
                ) : (
                  <>
                    <Line
                      type="monotone"
                      dataKey="stakeValueK"
                      name={`Projected Stake Value (${activeGrowthSpec.shortLabel}, $K)`}
                      stroke={isDark ? '#6FCB9F' : '#1C6E46'}
                      strokeWidth={3}
                      dot={{ r: 4, fill: isDark ? '#6FCB9F' : '#1C6E46' }}
                      activeDot={{ r: 6 }}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="netGainK"
                      name="Net Gain / Loss ($K)"
                      stroke={isDark ? '#8FA6E8' : '#1F3863'}
                      strokeWidth={2.25}
                      dot={{ r: 3.5, fill: isDark ? '#8FA6E8' : '#1F3863' }}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="proRataCumNetK"
                      name="Pro-Rata Cum. Net Profit ($K)"
                      stroke={isDark ? '#F5C57B' : '#B45309'}
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      dot={{ r: 3, fill: isDark ? '#F5C57B' : '#B45309' }}
                      isAnimationActive={false}
                    />
                  </>
                )
              ) : compareGrowthScenarios ? (
                <>
                  <Line
                    type="monotone"
                    dataKey="conservativeGrowthMoic"
                    name="Conservative Growth MOIC (×)"
                    stroke={isDark ? '#8FA6E8' : '#1F3863'}
                    strokeWidth={2.75}
                    dot={{ r: 4, fill: isDark ? '#8FA6E8' : '#1F3863' }}
                    activeDot={{ r: 6 }}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="aggressiveGrowthMoic"
                    name="Aggressive Growth MOIC (×)"
                    stroke={isDark ? '#6FCB9F' : '#1C6E46'}
                    strokeWidth={3}
                    dot={{ r: 4, fill: isDark ? '#6FCB9F' : '#1C6E46' }}
                    activeDot={{ r: 6 }}
                    isAnimationActive={false}
                  />
                </>
              ) : (
                <Line
                  type="monotone"
                  dataKey="moic"
                  name={`Return Multiple (${activeGrowthSpec.shortLabel}, ×)`}
                  stroke={isDark ? '#6FCB9F' : '#1C6E46'}
                  strokeWidth={3}
                  dot={{ r: 4, fill: isDark ? '#6FCB9F' : '#1C6E46' }}
                  activeDot={{ r: 6 }}
                  isAnimationActive={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {terminalRoiPoint && (
          <div className="pt-3 border-t border-[#EFEBE3] dark:border-[#1E2642] flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-[#5F6576] dark:text-[#8E96B0] tabular-nums">
            <span>
              Entry Check:{' '}
              <strong className="text-[#16213A] dark:text-[#E7EBF5]">${investmentK}K</strong>{' '}
              → {terminalRoiPoint.year} Value:{' '}
              <strong className="text-[#1C6E46] dark:text-[#6FCB9F]">
                {formatUsdFromK(terminalRoiPoint.stakeValueK)}
              </strong>{' '}
              ({terminalRoiPoint.moic.toFixed(2)}× · {terminalRoiPoint.annualizedIrrPct >= 0 ? '+' : ''}
              {terminalRoiPoint.annualizedIrrPct.toFixed(1)}% IRR)
            </span>
            <span>
              {compareGrowthScenarios ? (
                <>
                  Growth Spread (Aggr. vs Cons.):{' '}
                  <strong className="text-[#1C6E46] dark:text-[#6FCB9F]">
                    +{formatUsdFromK(terminalRoiPoint.growthSpreadK)}
                  </strong>{' '}
                  ({formatUsdFromK(terminalRoiPoint.conservativeGrowthStakeK)} →{' '}
                  {formatUsdFromK(terminalRoiPoint.aggressiveGrowthStakeK)})
                </>
              ) : (
                <>
                  Enable <strong className="text-[#16213A] dark:text-[#E7EBF5]">Compare Growth Scenarios</strong> to overlay Conservative (1.00×) vs. Aggressive (1.045ⁿ) trajectories.
                </>
              )}
            </span>
          </div>
        )}
      </section>

      {/* Main Chart + Live FX, Tax & Exit Sensitivity Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-8 min-w-0 rounded-2xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="inline-flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#1C6E46] dark:text-[#6FCB9F]" strokeWidth={1.5} />
              <h2 className="font-bold text-sm sm:text-base text-[#16213A] dark:text-[#E7EBF5]">
                FY2027–{horizonRow.year} ({horizonYears}-Year Horizon) Revenue, EBITDA &amp; Net Profit ($K USD)
              </h2>
            </div>
            <span className="text-xs font-mono text-[#5F6576] dark:text-[#8E96B0] tabular-nums">
              FX: {fxRate} BDT/USD · Tax: {taxRate.toFixed(1)}% · Exit: {exitMultiple}× · Dil: {dilutionPct}%
            </span>
          </div>

          <div className="h-[250px] sm:h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={horizonSeries} margin={{ top: 10, right: 14, left: 2, bottom: 8 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDark ? '#232B4A' : '#E4DFD6'}
                  vertical={false}
                />
                <XAxis
                  dataKey="year"
                  tick={{
                    fontSize: 11,
                    fontFamily: 'JetBrains Mono, monospace',
                    fill: isDark ? '#8E96B0' : '#5F6576',
                  }}
                  axisLine={{ stroke: isDark ? '#232B4A' : '#E4DFD6' }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}M` : `${v}K`}`}
                  tick={{
                    fontSize: 11,
                    fontFamily: 'JetBrains Mono, monospace',
                    fill: isDark ? '#8E96B0' : '#5F6576',
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value: unknown, name: unknown) => [
                    `$${Number(value).toLocaleString()}K`,
                    String(name),
                  ]}
                  contentStyle={{
                    borderRadius: '10px',
                    backgroundColor: isDark ? '#141A32' : '#FFFFFF',
                    border: isDark ? '1px solid #232B4A' : '1px solid #E4DFD6',
                    color: isDark ? '#E7EBF5' : '#16213A',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '12px',
                  }}
                  itemStyle={{ color: isDark ? '#E7EBF5' : '#16213A' }}
                />
                <Legend
                  wrapperStyle={{
                    fontSize: '11px',
                    fontFamily: 'JetBrains Mono, monospace',
                    color: isDark ? '#8E96B0' : '#5F6576',
                  }}
                />
                <Bar
                  dataKey="revK"
                  name="Revenue ($K)"
                  fill={isDark ? '#8FA6E8' : '#1F3863'}
                  radius={[5, 5, 0, 0]}
                  barSize={34}
                />
                <Line
                  type="monotone"
                  dataKey="ebitdaK"
                  name="EBITDA ($K)"
                  stroke={isDark ? '#38BDF8' : '#0D9488'}
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: isDark ? '#38BDF8' : '#0D9488' }}
                />
                <Line
                  type="monotone"
                  dataKey="netProfitK"
                  name="Net Profit ($K)"
                  stroke={isDark ? '#6FCB9F' : '#1C6E46'}
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: isDark ? '#6FCB9F' : '#1C6E46' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 pt-4 border-t border-[#E4DFD6] dark:border-[#232B4A] overflow-x-auto">
            <table className="w-full min-w-[520px] text-left font-mono text-xs tabular-nums">
              <thead>
                <tr className="text-[#5F6576] dark:text-[#8E96B0] border-b border-[#E4DFD6] dark:border-[#232B4A]">
                  <th className="py-2 pr-3">Fiscal Year</th>
                  <th className="py-2 px-3 text-right">Revenue</th>
                  <th className="py-2 px-3 text-right">EBITDA</th>
                  <th className="py-2 px-3 text-right">Net Profit</th>
                  <th className="py-2 pl-3 text-right">Capital Eff.</th>
                </tr>
              </thead>
              <tbody>
                {horizonSeries.map((r) => (
                  <tr
                    key={r.year}
                    className="border-b border-[#EFEBE3] dark:border-[#1E2642] last:border-0"
                  >
                    <td className="py-2 pr-3 font-bold text-[#16213A] dark:text-[#E7EBF5]">
                      {r.year}{' '}
                      <span className="text-[#7D8599] dark:text-[#707B9C] font-normal">({r.label})</span>
                    </td>
                    <td className="py-2 px-3 text-right text-[#334155] dark:text-[#C9D2E6]">
                      ${r.revK.toLocaleString()}K
                    </td>
                    <td className="py-2 px-3 text-right text-[#0D9488] dark:text-sky-400">
                      ${r.ebitdaK.toLocaleString()}K
                    </td>
                    <td className="py-2 px-3 text-right text-[#1C6E46] dark:text-[#6FCB9F] font-semibold">
                      ${r.netProfitK.toLocaleString()}K
                    </td>
                    <td className="py-2 pl-3 text-right font-bold text-[#16213A] dark:text-[#E7EBF5]">
                      {r.capitalEfficiencyMultiple.toFixed(2)}×
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2.5 text-[11px] font-mono text-[#5F6576] dark:text-[#8E96B0] leading-relaxed">
            Audit Separation: <strong className="text-[#16213A] dark:text-[#E7EBF5]">Capital Eff.</strong> = Cumulative Company Net Profit ÷ $500K Raised (company productivity, not investor cash-out).{' '}
            <strong className="text-[#1C6E46] dark:text-[#6FCB9F]">SAFE Equity ROI</strong> = (Y5 EBITDA × {exitMultiple}× EV × {effectiveOwnershipPct.toFixed(2)}% ownership) ÷ $500K ={' '}
            <strong className="text-[#1C6E46] dark:text-[#6FCB9F]">{safeEquityRoiMultiple.toFixed(2)}×</strong>.
          </p>
        </section>

        {/* Live Sensitivity Controls */}
        <section className="lg:col-span-4 min-w-0 rounded-2xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] p-4 sm:p-5 flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-wider text-[#1C6E46] dark:text-[#6FCB9F]">
              <SlidersHorizontal className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>FX, Tax &amp; Exit Multiple Stress Test</span>
            </div>

            <div className="rounded-xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] p-3.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5]">
                  BDT / USD Exchange Rate
                </span>
                <span className="font-mono text-base sm:text-lg font-extrabold text-[#16213A] dark:text-[#E7EBF5] tabular-nums">
                  {fxRate} BDT
                </span>
              </div>
              <input
                type="range"
                min={115}
                max={130}
                step={1}
                value={fxRate}
                onChange={(e) => setFxRate(Number(e.target.value))}
                aria-label="BDT per USD exchange rate"
                className="w-full spenta-slider mt-2.5"
              />
              <div className="flex justify-between text-[10px] font-mono text-[#5F6576] dark:text-[#8E96B0] mt-1">
                <span>115 BDT</span>
                <span className="font-bold text-[#1C6E46] dark:text-[#6FCB9F]">120 Base</span>
                <span>130 BDT</span>
              </div>
              <div className="mt-2 text-[11px] font-mono text-[#4A5568] dark:text-[#8E96B0] tabular-nums">
                20-FTE Dhaka Hub (64.8M BDT):{' '}
                <strong className="text-[#16213A] dark:text-[#E7EBF5]">${dhakaY1UsdK}K/yr</strong>
              </div>
            </div>

            <div className="rounded-xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] p-3.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5]">
                  Effective Corporate Tax
                </span>
                <span className="font-mono text-base sm:text-lg font-extrabold text-[#16213A] dark:text-[#E7EBF5] tabular-nums">
                  {taxRate.toFixed(1)}%
                </span>
              </div>
              <input
                type="range"
                min={20}
                max={30}
                step={0.5}
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                aria-label="Effective corporate tax rate"
                className="w-full spenta-slider mt-2.5"
              />
              <div className="flex justify-between text-[10px] font-mono text-[#5F6576] dark:text-[#8E96B0] mt-1">
                <span>20.0%</span>
                <span className="font-bold text-[#1C6E46] dark:text-[#6FCB9F]">25.0% Base</span>
                <span>30.0%</span>
              </div>
            </div>

            <div className="rounded-xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#1C6E46]/30 dark:border-[#6FCB9F]/30 p-3.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5]">
                  Y5 Exit Multiple (EV / EBITDA)
                </span>
                <span className="font-mono text-base sm:text-lg font-extrabold text-[#1C6E46] dark:text-[#6FCB9F] tabular-nums">
                  {exitMultiple.toFixed(1)}×
                </span>
              </div>
              <input
                type="range"
                min={8}
                max={15}
                step={0.5}
                value={exitMultiple}
                onChange={(e) => setExitMultiple(Number(e.target.value))}
                aria-label="Year 5 Exit EV to EBITDA Multiple"
                className="w-full spenta-slider mt-2.5"
              />
              <div className="flex justify-between text-[10px] font-mono text-[#5F6576] dark:text-[#8E96B0] mt-1">
                <span>8.0×</span>
                <span className="font-bold text-[#1C6E46] dark:text-[#6FCB9F]">10.0× Base</span>
                <span>15.0×</span>
              </div>
              <div className="mt-2 text-[11px] font-mono text-[#4A5568] dark:text-[#8E96B0] tabular-nums">
                SAFE Exit ROI:{' '}
                <strong className="text-[#1C6E46] dark:text-[#6FCB9F]">
                  {safeEquityRoiMultiple.toFixed(2)}×
                </strong>{' '}
                (${safeExitProceedsM.toFixed(2)}M on ${impliedExitEvM.toFixed(2)}M EV)
              </div>
            </div>

            <div className="rounded-xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] p-3.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5]">
                  Post-Seed Round Dilution
                </span>
                <span className="font-mono text-base sm:text-lg font-extrabold text-[#16213A] dark:text-[#E7EBF5] tabular-nums">
                  {dilutionPct}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={25}
                step={5}
                value={dilutionPct}
                onChange={(e) => setDilutionPct(Number(e.target.value))}
                aria-label="Post-seed equity dilution percentage"
                className="w-full spenta-slider mt-2.5"
              />
              <div className="flex items-center justify-between gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => setDilutionPct(0)}
                  className={`flex-1 py-1 px-2 rounded-md text-[10px] font-mono font-semibold border cursor-pointer transition-colors ${
                    dilutionPct === 0
                      ? 'bg-[#1F3863] text-white border-[#1F3863] dark:bg-[#8FA6E8] dark:text-[#0B1020] dark:border-[#8FA6E8]'
                      : 'bg-white dark:bg-[#141A32] border-[#E4DFD6] dark:border-[#232B4A] text-[#5F6576] dark:text-[#8E96B0]'
                  }`}
                >
                  0% Pre-Dil. (11.1%)
                </button>
                <button
                  type="button"
                  onClick={() => setDilutionPct(20)}
                  className={`flex-1 py-1 px-2 rounded-md text-[10px] font-mono font-semibold border cursor-pointer transition-colors ${
                    dilutionPct === 20
                      ? 'bg-[#1C6E46] text-white border-[#1C6E46] dark:bg-[#6FCB9F] dark:text-[#0B1020] dark:border-[#6FCB9F]'
                      : 'bg-white dark:bg-[#141A32] border-[#E4DFD6] dark:border-[#232B4A] text-[#5F6576] dark:text-[#8E96B0]'
                  }`}
                >
                  20% Series A (8.9%)
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setFxRate(120);
                setTaxRate(25);
                setExitMultiple(10);
                setDilutionPct(0);
                setScenario('conservative');
              }}
              className="w-full min-h-[38px] py-2 rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] hover:border-[#1F3863]/50 dark:hover:border-[#8FA6E8]/50 text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5] cursor-pointer transition-colors"
            >
              Reset Baseline (120 BDT · 25% Tax · 10× EV · 0% Dil.)
            </button>
          </div>

          <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
            <div className="font-mono text-[10px] font-bold uppercase mb-1">
              Natural Hard-Currency FX Hedge
            </div>
            Enterprise contracts billed in USD/AUD/EUR naturally hedge BDT engineering payroll—a move from 120 to 125 BDT/USD reduces Dhaka USD OpEx while lifting 5-year net profit and exit EV.
          </div>
        </section>
      </div>

      {/* 5-Scope Revenue Mix Modeler — Dynamic Responsive Recharts Pie Chart */}
      <section className="rounded-2xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-[#E4DFD6] dark:border-[#232B4A]">
          <div>
            <div className="text-xs font-mono text-[#1C6E46] dark:text-[#6FCB9F] font-semibold">
              5-Scope Revenue Architecture · Dynamic Recharts Pie Breakdown
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#16213A] dark:text-[#E7EBF5] mt-0.5">
              Revenue Scope Mix &amp; Revenue-Weighted Gross Margin Bridge
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {(
              [
                { id: 'fy27', label: 'FY2027 ($672K)' },
                { id: 'fy31', label: 'FY2031 ($5.85M)' },
                { id: 'arr-heavy', label: 'Upside ($9.60M)' },
              ] as const
            ).map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleApplyMixPreset(id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  mixPreset === id
                    ? 'bg-[#1C6E46] dark:bg-[#6FCB9F] text-white dark:text-[#0B1020]'
                    : 'bg-[#FAF8F4] dark:bg-[#0B1020] text-[#4A5568] dark:text-[#C8D0E4] border border-[#E4DFD6] dark:border-[#232B4A] hover:border-[#1F3863]'
                }`}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSubTab('roi')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0B1020] hover:border-[#1F3863] text-xs font-semibold text-[#1F3863] dark:text-[#8FA6E8] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Tune Scope Sliders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5 items-center">
          {/* Left: Dynamic Responsive Donut Pie Chart */}
          <div className="lg:col-span-5 relative h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={revenueMixPieData.slices}
                  dataKey="sharePct"
                  nameKey="shortName"
                  cx="50%"
                  cy="50%"
                  innerRadius="56%"
                  outerRadius="84%"
                  paddingAngle={2}
                  stroke={isDark ? '#141A32' : '#FFFFFF'}
                  strokeWidth={2}
                >
                  {revenueMixPieData.slices.map((slice) => (
                    <Cell key={slice.id} fill={slice.accent} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val, _name, item) => {
                    const p = item?.payload as
                      | { revK?: number; grossMarginPct?: number; gmContributionPct?: number }
                      | undefined;
                    return [
                      `${Number(val ?? 0).toFixed(1)}% · ${formatCompactUsdK(p?.revK ?? 0)} (${p?.grossMarginPct ?? 0}% GM)`,
                      'Scope Share',
                    ];
                  }}
                  contentStyle={{
                    borderRadius: '10px',
                    backgroundColor: isDark ? '#141A32' : '#FFFFFF',
                    border: isDark ? '1px solid #232B4A' : '1px solid #E4DFD6',
                    color: isDark ? '#E7EBF5' : '#16213A',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center KPI Overlay */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#5F6576] dark:text-[#8E96B0]">
                Rev-Wtd GM
              </span>
              <span className="font-mono text-2xl font-extrabold text-[#1C6E46] dark:text-[#6FCB9F] tabular-nums">
                {revenueMixPieData.weightedGmPct.toFixed(1)}%
              </span>
              <span className="text-[10px] font-mono text-[#5F6576] dark:text-[#8E96B0] tabular-nums">
                {formatCompactUsdK(revenueMixPieData.scaleK)} Rev
              </span>
            </div>
          </div>

          {/* Right: 5-Scope Tabular Legend + Build vs. Recurring Annuity Summary */}
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-3 gap-3 text-xs font-mono tabular-nums">
              <div className="rounded-lg bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] p-3">
                <div className="text-[10px] text-[#5F6576] dark:text-[#8E96B0]">Build &amp; Captive</div>
                <div className="text-base font-bold text-[#1F3863] dark:text-[#8FA6E8] mt-0.5">
                  {revenueMixPieData.buildSharePct.toFixed(1)}%
                </div>
              </div>
              <div className="rounded-lg bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] p-3">
                <div className="text-[10px] text-[#5F6576] dark:text-[#8E96B0]">
                  SaaS, Retainers &amp; IP
                </div>
                <div className="text-base font-bold text-[#1C6E46] dark:text-[#6FCB9F] mt-0.5">
                  {revenueMixPieData.recurringSharePct.toFixed(1)}%
                </div>
              </div>
              <div className="rounded-lg bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] p-3">
                <div className="text-[10px] text-[#5F6576] dark:text-[#8E96B0]">Implied EBITDA</div>
                <div className="text-base font-bold text-[#16213A] dark:text-[#E7EBF5] mt-0.5">
                  {revenueMixPieData.impliedEbitdaPct.toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="divide-y divide-[#EFEBE3] dark:divide-[#1E2642] border-y border-[#E4DFD6] dark:border-[#232B4A]">
              {revenueMixPieData.slices.map((slice) => (
                <div
                  key={slice.id}
                  className="py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: slice.accent }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-[#16213A] dark:text-[#E7EBF5] truncate">
                        {slice.name}
                      </div>
                      <div className="text-[11px] text-[#5F6576] dark:text-[#8E96B0] truncate">
                        {slice.roleSummary}
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-mono tabular-nums shrink-0">
                    <div className="font-bold text-[#16213A] dark:text-[#E7EBF5]">
                      {slice.sharePct.toFixed(1)}% · {formatCompactUsdK(slice.revK)}
                    </div>
                    <div className="text-[11px] text-[#1C6E46] dark:text-[#6FCB9F]">
                      {slice.grossMarginPct}% GM (+{slice.gmContributionPct.toFixed(1)} pts)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 5-Year (FY2027–FY2031) 5-Scope Revenue Mix Projection Line Chart + Disciplined Growth Mode + CSV Export */}
        <div className="mt-6 pt-5 border-t border-[#E4DFD6] dark:border-[#232B4A]">
          <div className="mb-4 rounded-xl border border-[#1C6E46]/30 dark:border-[#6FCB9F]/30 bg-[#1C6E46]/[0.05] dark:bg-[#6FCB9F]/[0.06] px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-mono font-bold text-[#1C6E46] dark:text-[#6FCB9F]">
                {ROI_CONFIDENCE_EVIDENCE_NOTE.title} · {activeGrowthSpec.confidenceBadge}
              </div>
              <p className="text-xs text-[#334155] dark:text-[#C8D0E4] mt-0.5 leading-relaxed">
                {activeGrowthSpec.summary} {ROI_CONFIDENCE_EVIDENCE_NOTE.lead}
              </p>
            </div>
            <div
              role="group"
              aria-label="5-Year Projection Growth Mode"
              className="inline-flex rounded-lg bg-white dark:bg-[#0B1020] p-0.5 border border-[#E4DFD6] dark:border-[#232B4A] self-start lg:self-auto shrink-0"
            >
              <button
                type="button"
                onClick={() => setGrowthMode('conservative')}
                aria-pressed={growthMode === 'conservative'}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  growthMode === 'conservative'
                    ? 'bg-[#1F3863] text-white dark:bg-[#8FA6E8] dark:text-[#0B1020]'
                    : 'text-[#5F6576] dark:text-[#8E96B0] hover:text-[#16213A] dark:hover:text-[#E7EBF5]'
                }`}
              >
                Conservative (25% Floor)
              </button>
              <button
                type="button"
                onClick={() => setGrowthMode('aggressive')}
                aria-pressed={growthMode === 'aggressive'}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  growthMode === 'aggressive'
                    ? 'bg-[#1C6E46] text-white dark:bg-[#6FCB9F] dark:text-[#0B1020]'
                    : 'text-[#5F6576] dark:text-[#8E96B0] hover:text-[#16213A] dark:hover:text-[#E7EBF5]'
                }`}
              >
                Aggressive Growth (35% Cap)
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <div>
              <div className="text-xs font-mono text-[#1C6E46] dark:text-[#6FCB9F] font-semibold">
                {horizonYears}-Year Scope Trajectory · FY2027–{horizonRow.year} ({scenario === 'conservative' ? 'Conservative Base' : 'Healthcare Upside'} · {activeGrowthSpec.shortLabel})
              </div>
              <h3 className="text-sm sm:text-base font-bold text-[#16213A] dark:text-[#E7EBF5] mt-0.5">
                {scopeLineMetric === 'revenue'
                  ? `Projected Revenue by Scope ($K USD, FY2027–${horizonRow.year})`
                  : `Revenue Mix Transition (%) & Revenue-Weighted GM Bridge (FY2027–${horizonRow.year})`}
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
              <div className="inline-flex rounded-lg bg-[#F2EFE9] dark:bg-[#0F1529] p-0.5 border border-[#E4DFD6] dark:border-[#232B4A]">
                <button
                  type="button"
                  onClick={() => setScopeLineMetric('revenue')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    scopeLineMetric === 'revenue'
                      ? 'bg-[#1F3863] text-white dark:bg-[#8FA6E8] dark:text-[#0B1020]'
                      : 'text-[#5F6576] dark:text-[#8E96B0] hover:text-[#16213A] dark:hover:text-[#E7EBF5]'
                  }`}
                >
                  Revenue ($K)
                </button>
                <button
                  type="button"
                  onClick={() => setScopeLineMetric('share')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    scopeLineMetric === 'share'
                      ? 'bg-[#1F3863] text-white dark:bg-[#8FA6E8] dark:text-[#0B1020]'
                      : 'text-[#5F6576] dark:text-[#8E96B0] hover:text-[#16213A] dark:hover:text-[#E7EBF5]'
                  }`}
                >
                  Mix Share (%)
                </button>
              </div>

              <button
                type="button"
                onClick={handleExportFiveYearCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1C6E46]/40 dark:border-[#6FCB9F]/40 bg-[#1C6E46]/10 dark:bg-[#6FCB9F]/15 text-[#1C6E46] dark:text-[#6FCB9F] hover:bg-[#1C6E46]/20 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {csvExported ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                <span>{csvExported ? 'CSV Exported' : 'Export CSV'}</span>
              </button>
            </div>
          </div>

          {/* Interactive Scope Series Filter Controls */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {REVENUE_SCOPES.map((scope) => {
              const hidden = hiddenScopeLines.includes(scope.id);
              const strokeColor =
                scope.id === 'one_time_builds' && isDark ? '#8FA6E8' : scope.accent;
              return (
                <button
                  key={scope.id}
                  type="button"
                  onClick={() => toggleScopeLineVisibility(scope.id)}
                  aria-pressed={!hidden}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    hidden
                      ? 'bg-transparent border-[#E4DFD6] dark:border-[#232B4A] text-[#94A3B8] dark:text-[#64748B] line-through'
                      : 'bg-[#FAF8F4] dark:bg-[#0F1529] border-[#E4DFD6] dark:border-[#232B4A] text-[#16213A] dark:text-[#E7EBF5]'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: strokeColor, opacity: hidden ? 0.35 : 1 }}
                    aria-hidden="true"
                  />
                  <span>{scope.shortName}</span>
                </button>
              );
            })}
            {hiddenScopeLines.length > 0 && (
              <button
                type="button"
                onClick={() => setHiddenScopeLines([])}
                className="px-2 py-1 text-[11px] font-mono text-[#1C6E46] dark:text-[#6FCB9F] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                Show all 5 scopes
              </button>
            )}
          </div>

          <div className="h-[260px] sm:h-[310px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={horizonScopeSeries}
                margin={{ top: 10, right: 16, left: 4, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDark ? '#232B4A' : '#E4DFD6'}
                  vertical={false}
                />
                <XAxis
                  dataKey="year"
                  tick={{
                    fontSize: 11,
                    fontFamily: 'JetBrains Mono, monospace',
                    fill: isDark ? '#8E96B0' : '#5F6576',
                  }}
                  axisLine={{ stroke: isDark ? '#232B4A' : '#E4DFD6' }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) =>
                    scopeLineMetric === 'revenue'
                      ? `$${v >= 1000 ? `${(v / 1000).toFixed(1)}M` : `${v}K`}`
                      : `${v}%`
                  }
                  domain={scopeLineMetric === 'share' ? [0, 70] : ['auto', 'auto']}
                  tick={{
                    fontSize: 11,
                    fontFamily: 'JetBrains Mono, monospace',
                    fill: isDark ? '#8E96B0' : '#5F6576',
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value, name) => {
                    const num = Number(value ?? 0);
                    return [
                      scopeLineMetric === 'revenue'
                        ? formatCompactUsdK(num)
                        : `${num.toFixed(1)}%`,
                      String(name ?? ''),
                    ];
                  }}
                  labelFormatter={(label) => {
                    const match = fiveYearScopeSeries.find((r) => r.year === String(label));
                    return match
                      ? `${match.year} (${match.label}) · Total ${formatCompactUsdK(match.totalRevK)} · Wtd GM ${match.weightedGmPct.toFixed(1)}%`
                      : String(label);
                  }}
                  contentStyle={{
                    borderRadius: '10px',
                    backgroundColor: isDark ? '#141A32' : '#FFFFFF',
                    border: isDark ? '1px solid #232B4A' : '1px solid #E4DFD6',
                    color: isDark ? '#E7EBF5' : '#16213A',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '12px',
                  }}
                  itemStyle={{ color: isDark ? '#E7EBF5' : '#16213A' }}
                />
                <Legend
                  wrapperStyle={{
                    fontSize: '11px',
                    fontFamily: 'JetBrains Mono, monospace',
                    color: isDark ? '#8E96B0' : '#5F6576',
                  }}
                />
                {REVENUE_SCOPES.map((scope) => {
                  if (hiddenScopeLines.includes(scope.id)) return null;
                  const strokeColor =
                    scope.id === 'one_time_builds' && isDark ? '#8FA6E8' : scope.accent;
                  const dataKey =
                    scopeLineMetric === 'revenue' ? scope.id : `${scope.id}_pct`;
                  return (
                    <Line
                      key={scope.id}
                      type="monotone"
                      dataKey={dataKey}
                      name={scope.shortName}
                      stroke={strokeColor}
                      strokeWidth={scope.id === 'recurring_saas' ? 3 : 2.2}
                      dot={{ r: 3.5, fill: strokeColor }}
                      activeDot={{ r: 5.5 }}
                    />
                  );
                })}
                {scopeLineMetric === 'share' && (
                  <Line
                    type="monotone"
                    dataKey="weightedGmPct"
                    name="Rev-Wtd GM (%)"
                    stroke={isDark ? '#F5C57B' : '#B45309'}
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={{ r: 3, fill: isDark ? '#F5C57B' : '#B45309' }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 pt-3 border-t border-[#EFEBE3] dark:border-[#1E2642] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#5F6576] dark:text-[#8E96B0] tabular-nums">
            <span>
              FY2027 SaaS ARR:{' '}
              <strong className="text-[#16213A] dark:text-[#E7EBF5]">
                {formatCompactUsdK(horizonScopeSeries[0]?.recurring_saas ?? 0)}
              </strong>{' '}
              → {horizonRow.year}:{' '}
              <strong className="text-[#1C6E46] dark:text-[#6FCB9F]">
                {formatCompactUsdK(horizonScopeSeries[horizonScopeSeries.length - 1]?.recurring_saas ?? 0)}
              </strong>
            </span>
            <span>
              Rev-Wtd GM Bridge:{' '}
              <strong className="text-[#16213A] dark:text-[#E7EBF5]">
                {(horizonScopeSeries[0]?.weightedGmPct ?? 0).toFixed(1)}%
              </strong>{' '}
              →{' '}
              <strong className="text-[#1C6E46] dark:text-[#6FCB9F]">
                {(horizonScopeSeries[horizonScopeSeries.length - 1]?.weightedGmPct ?? 0).toFixed(1)}%
              </strong>{' '}
              {(() => {
                const startGm = horizonScopeSeries[0]?.weightedGmPct ?? 0;
                const endGm =
                  horizonScopeSeries[horizonScopeSeries.length - 1]?.weightedGmPct ?? 0;
                const gmDelta = endGm - startGm;
                return `(${gmDelta >= 0 ? '+' : ''}${gmDelta.toFixed(1)} pts)`;
              })()}
            </span>
          </div>
        </div>
      </section>

      {/* Financial & ROI Audit Reconciliation Ledger */}
      <section className="rounded-2xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="inline-flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#1C6E46] dark:text-[#6FCB9F]" strokeWidth={1.75} />
            <h2 className="font-bold text-base sm:text-lg text-[#16213A] dark:text-[#E7EBF5]">
              Financial Model &amp; ROI Audit Reconciliation
            </h2>
          </div>
          <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-[#1C6E46] dark:text-[#6FCB9F]">
            CAPITAL EFFICIENCY ≠ SAFE INVESTOR RETURN
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Formula 1: Operating Capital Efficiency */}
          <div className="rounded-xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-[#5F6576] dark:text-[#8E96B0]">
                01 · Operating Capital Efficiency (Company Metric)
              </span>
              <span className="font-mono text-sm font-extrabold text-[#16213A] dark:text-[#E7EBF5] tabular-nums">
                {y5.capitalEfficiencyMultiple.toFixed(2)}×
              </span>
            </div>
            <div className="font-mono text-xs text-[#16213A] dark:text-[#E7EBF5] bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] rounded-lg px-3 py-2 tabular-nums">
              Cum. 5-Yr Net Profit (${(y5.cumNetK / 1000).toFixed(3)}M) ÷ $500K Raised ={' '}
              <strong>{y5.capitalEfficiencyMultiple.toFixed(2)}×</strong>
            </div>
            <p className="text-xs text-[#4A5568] dark:text-[#A4ADC6] leading-relaxed">
              Measures internal business cash productivity per dollar of seed capital. Retained earnings belong to the corporate balance sheet and are not distributed 1:1 to a minority SAFE holder.
            </p>
          </div>

          {/* Formula 2: Investor SAFE Equity ROI */}
          <div className="rounded-xl bg-[#1C6E46]/[0.05] dark:bg-[#6FCB9F]/[0.07] border border-[#1C6E46]/35 dark:border-[#6FCB9F]/35 p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-[#1C6E46] dark:text-[#6FCB9F]">
                02 · Modeled Investor SAFE Exit ROI (Equity Return)
              </span>
              <span className="font-mono text-sm font-extrabold text-[#1C6E46] dark:text-[#6FCB9F] tabular-nums">
                {safeEquityRoiMultiple.toFixed(2)}×
              </span>
            </div>
            <div className="font-mono text-xs text-[#16213A] dark:text-[#E7EBF5] bg-white dark:bg-[#141A32] border border-[#1C6E46]/30 dark:border-[#6FCB9F]/30 rounded-lg px-3 py-2 tabular-nums">
              (Y5 EBITDA ${y5.ebitdaK.toLocaleString()}K × {exitMultiple}× EV × {effectiveOwnershipPct.toFixed(2)}%) ÷ $500K ={' '}
              <strong className="text-[#1C6E46] dark:text-[#6FCB9F]">{safeEquityRoiMultiple.toFixed(2)}×</strong>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px] font-mono tabular-nums pt-0.5">
              <div className="rounded-lg bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] px-2.5 py-1.5">
                <div className="text-[10px] text-[#5F6576] dark:text-[#8E96B0]">10× EV (0% Dil.)</div>
                <div className="font-bold text-[#16213A] dark:text-[#E7EBF5]">{safeRoiAt10xPreDil.toFixed(2)}×</div>
              </div>
              <div className="rounded-lg bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] px-2.5 py-1.5">
                <div className="text-[10px] text-[#5F6576] dark:text-[#8E96B0]">10× EV (-20% Ser.A)</div>
                <div className="font-bold text-[#16213A] dark:text-[#E7EBF5]">{safeRoiAt10xSeriesA.toFixed(2)}×</div>
              </div>
              <div className="rounded-lg bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] px-2.5 py-1.5">
                <div className="text-[10px] text-[#5F6576] dark:text-[#8E96B0]">15× EV (0% Dil.)</div>
                <div className="font-bold text-[#1C6E46] dark:text-[#6FCB9F]">{safeRoiAt15xPreDil.toFixed(2)}×</div>
              </div>
            </div>
          </div>
        </div>

        {/* Audited Unit-Economics Normalization Strip */}
        <div className="mt-4 pt-4 border-t border-[#E4DFD6] dark:border-[#232B4A] grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] p-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-[#5F6576] dark:text-[#8E96B0]">
              20-FTE Dhaka Hub Rate Reconciliation
            </div>
            <div className="font-mono font-bold text-[#16213A] dark:text-[#E7EBF5] mt-1 tabular-nums">
              ${dhakaLoadedHourlyUsd.toFixed(2)}/hr Loaded · ${dhakaY1UsdK}K/yr
            </div>
            <p className="text-[11px] text-[#4A5568] dark:text-[#8E96B0] mt-1 leading-relaxed">
              64.8M BDT ÷ {fxRate} FX ÷ 41,600 hrs/yr ($11.50/hr base + $1.48/hr enclave overhead; ~${(dhakaLoadedHourlyUsd / 0.7).toFixed(2)}/hr at 70% billable utilization vs. $4.78M/yr US/AU pod).
            </p>
          </div>

          <div className="rounded-xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] p-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-[#5F6576] dark:text-[#8E96B0]">
              Reconciled On-Prem Server BOM
            </div>
            <div className="font-mono font-bold text-[#16213A] dark:text-[#E7EBF5] mt-1">
              T3 $8.5K–$10.5K · T2 $12.0K–$14.5K
            </div>
            <p className="text-[11px] text-[#4A5568] dark:text-[#8E96B0] mt-1 leading-relaxed">
              Tier 3 baseline uses refurbished 4× RTX 3090 (96GB), 256GB DDR5, 10TB NVMe &amp; 50TB HDD; Tier 2 unified strictly below Flagship Tier 1 ($14.1K–$15.3K).
            </p>
          </div>

          <div className="rounded-xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] p-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-[#5F6576] dark:text-[#8E96B0]">
              Revenue-Weighted GM &amp; Separate Retainers
            </div>
            <div className="font-mono font-bold text-[#16213A] dark:text-[#E7EBF5] mt-1">
              Build CapEx ≠ Quarterly SLAs
            </div>
            <p className="text-[11px] text-[#4A5568] dark:text-[#8E96B0] mt-1 leading-relaxed">
              Quarterly retainers ($8.6K/qtr Cyber SLA, $6.9K/qtr WebAR/GEO) are tracked strictly apart from one-time builds; composite GM is revenue-weighted across Year-1 contract value.
            </p>
          </div>
        </div>
      </section>

      {/* Sortable 13-Product Gross Margin Matrix */}
      <section className="rounded-2xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-bold text-base sm:text-lg text-[#16213A] dark:text-[#E7EBF5]">
              13-Product Conservative Gross Margin Matrix
            </h2>
            <p className="text-xs text-[#4A5568] dark:text-[#A4ADC6]">
              High-Margin IP &amp; SaaS (&gt;=55% GM highlighted in Spenta Green) paired with predictable Enterprise Delivery Pods (29%–35% GM).
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="inline-flex items-center gap-1.5 text-[#1C6E46] dark:text-[#6FCB9F]">
              <span className="w-2 h-2 rounded-full bg-[#1C6E46] dark:bg-[#6FCB9F]" /> High-Margin IP (&gt;=55%)
            </span>
            <span className="inline-flex items-center gap-1.5 text-[#5F6576] dark:text-[#8E96B0]">
              <span className="w-2 h-2 rounded-full bg-[#B9B2A5] dark:bg-[#3A456B]" /> Delivery Pods (29%–35%)
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[740px] text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E4DFD6] dark:border-[#232B4A] text-[10px] font-mono uppercase text-[#5F6576] dark:text-[#8E96B0]">
                <th className="py-2.5 pr-3">
                  <button
                    type="button"
                    onClick={() => handleSort('name')}
                    className="inline-flex items-center gap-1 hover:text-[#16213A] dark:hover:text-[#E7EBF5] cursor-pointer"
                  >
                    Product Line <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('setupUsd')}
                    className="inline-flex items-center gap-1 hover:text-[#16213A] dark:hover:text-[#E7EBF5] cursor-pointer"
                  >
                    Setup / Build <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3">Recurring / License Model</th>
                <th className="py-2.5 px-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('gmPct')}
                    className="inline-flex items-center gap-1 hover:text-[#16213A] dark:hover:text-[#E7EBF5] cursor-pointer"
                  >
                    Cons. GM% <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3 text-right">12-Mo ROI / Payback</th>
                <th className="py-2.5 px-3 text-center">
                  <button
                    type="button"
                    onClick={() => handleSort('minServerTier')}
                    className="inline-flex items-center gap-1 hover:text-[#16213A] dark:hover:text-[#E7EBF5] cursor-pointer"
                  >
                    Min Tier <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 pl-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFEBE3] dark:divide-[#1E2642]">
              {sortedApps.map((app) => {
                const isHighMargin = app.gmPct >= 55;
                const inStack = selectedIds.includes(app.id);
                const roi = computeProductRoi(app.id);
                return (
                  <tr
                    key={app.id}
                    className={`transition-colors ${
                      inStack
                        ? 'bg-[#1C6E46]/[0.06] dark:bg-[#6FCB9F]/[0.08]'
                        : 'hover:bg-[#FAF8F4] dark:hover:bg-[#192140]'
                    }`}
                  >
                    <td className="py-3 pr-3">
                      <div className="font-bold text-[#16213A] dark:text-[#E7EBF5]">{app.name}</div>
                      <div className="text-[11px] text-[#5F6576] dark:text-[#8E96B0]">
                        {app.proofClient}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-[#4A5568] dark:text-[#A4ADC6]">{app.category}</td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-[#16213A] dark:text-[#E7EBF5] tabular-nums whitespace-nowrap">
                      ${(app.setupUsd / 1000).toFixed(1)}K
                      {app.billingCadence === 'quarterly-retainer' && (
                        <span className="ml-1 text-[10px] text-[#5F6576] dark:text-[#8E96B0]">/qtr</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-[#4A5568] dark:text-[#A4ADC6]">
                      {app.recurringLabel}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-extrabold tabular-nums">
                      <span
                        className={`px-2 py-0.5 rounded ${
                          isHighMargin
                            ? 'bg-[#1C6E46]/12 dark:bg-[#6FCB9F]/15 text-[#1C6E46] dark:text-[#6FCB9F]'
                            : 'bg-[#F2EFE9] dark:bg-[#1D2545] text-[#4A5568] dark:text-[#C9D2E6]'
                        }`}
                      >
                        {app.gmPct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                      <div className="font-bold text-[#1C6E46] dark:text-[#6FCB9F]">
                        {roi.client12MoRoiPct}% ROI
                      </div>
                      <div className="text-[10px] text-[#5F6576] dark:text-[#8E96B0]">
                        {roi.paybackMonths} mo payback
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-[#4A5568] dark:text-[#C9D2E6]">
                      T{app.minServerTier}
                    </td>
                    <td className="py-3 pl-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setRoiInitialAppId(app.id);
                            setSubTab('roi');
                          }}
                          className="px-2 py-1.5 sm:py-1 rounded-lg font-mono text-[11px] font-semibold border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#0B1020] text-[#1F3863] dark:text-[#8FA6E8] hover:border-[#1F3863] whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          ROI
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleApp(app.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 sm:py-1 rounded-lg font-mono text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            inStack
                              ? 'bg-[#1C6E46] text-white dark:bg-[#6FCB9F] dark:text-[#0B1020]'
                              : 'bg-[#F2EFE9] dark:bg-[#1D2545] text-[#16213A] dark:text-[#E7EBF5] hover:bg-[#1F3863] hover:text-white dark:hover:bg-[#8FA6E8] dark:hover:text-[#0B1020]'
                          }`}
                        >
                          {inStack ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                          <span>{inStack ? 'Added' : 'Add'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Live Grounded Market Intelligence — Server-Side Google Search (ROI Benchmarks) & Google Maps (Client Markets) */}
      <section className="rounded-2xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-[#E4DFD6] dark:border-[#232B4A]">
          <div>
            <div className="text-xs font-mono text-[#1C6E46] dark:text-[#6FCB9F] font-semibold">
              Server-Side Live Grounding · Google Search Benchmarks &amp; Google Maps Client Discovery
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#16213A] dark:text-[#E7EBF5] mt-0.5">
              Live External ROI Benchmarks &amp; Regional Client Market Intelligence
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSubTab('roi')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0B1020] hover:border-[#1F3863] text-xs font-semibold text-[#1F3863] dark:text-[#8FA6E8] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Full ROI &amp; 5-Scope Modeler</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setSubTab('maps')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0B1020] hover:border-[#1C6E46] text-xs font-semibold text-[#1C6E46] dark:text-[#6FCB9F] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Full Maps Hub Explorer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Panel 1: Google Search Live ROI Benchmarks */}
          <div className="rounded-xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] p-4 flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#16213A] dark:text-[#E7EBF5]">
                  <Globe2 className="w-4 h-4 text-[#1F3863] dark:text-[#8FA6E8]" />
                  <span>Live ROI &amp; TCO Benchmarks (Google Search)</span>
                </span>
                <span className="text-[11px] font-mono text-[#5F6576] dark:text-[#8E96B0]">
                  Cited Web Data
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  aria-label="Select Spenta solution for live ROI benchmark check"
                  value={benchmarkAppId}
                  onChange={(e) => setBenchmarkAppId(e.target.value)}
                  className="flex-1 rounded-lg bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] px-3 py-2 text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5] focus:outline-none focus:border-[#1F3863]"
                >
                  {SPENTA_APPS.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.shortName} ({app.gmPct.toFixed(1)}% GM · {app.setupLabel})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={searchBenchmark.loading}
                  onClick={handleQuickBenchmarkCheck}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1F3863] hover:bg-[#162848] dark:bg-[#8FA6E8] dark:hover:bg-[#A6B9F0] text-white dark:text-[#0B1020] text-xs font-semibold whitespace-nowrap shrink-0 disabled:opacity-60 cursor-pointer"
                >
                  {searchBenchmark.loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Calculator className="w-3.5 h-3.5" />
                  )}
                  <span>{searchBenchmark.loading ? 'Fetching…' : 'Fetch ROI Benchmarks'}</span>
                </button>
              </div>

              {searchBenchmark.error && (
                <div className="text-xs text-[#E11D48] dark:text-[#FDA4AF] bg-[#E11D48]/10 border border-[#E11D48]/25 rounded-lg px-3 py-2">
                  {searchBenchmark.error}
                </div>
              )}

              {searchBenchmark.loading ? (
                <div className="space-y-2 py-2 animate-pulse">
                  <div className="h-3 bg-[#E4DFD6] dark:bg-[#232B4A] rounded w-3/4" />
                  <div className="h-3 bg-[#E4DFD6] dark:bg-[#232B4A] rounded w-full" />
                  <div className="h-3 bg-[#E4DFD6] dark:bg-[#232B4A] rounded w-5/6" />
                </div>
              ) : searchBenchmark.data ? (
                <div className="space-y-3 pt-2 border-t border-[#E4DFD6] dark:border-[#232B4A]">
                  <div className="text-[11px] font-mono text-[#1C6E46] dark:text-[#6FCB9F]">
                    Verified Benchmark Subject: {searchBenchmark.subject}
                  </div>
                  {renderGroundedMarkdown(searchBenchmark.data.text)}
                  {searchBenchmark.data.sources.length > 0 && (
                    <div className="pt-2 border-t border-[#E4DFD6] dark:border-[#232B4A] flex flex-wrap gap-1.5">
                      {searchBenchmark.data.sources.slice(0, 5).map((src, idx) => (
                        <a
                          key={`${src.uri}-${idx}`}
                          href={src.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1F3863] dark:text-[#8FA6E8] hover:underline bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] rounded-md px-2 py-1 max-w-[230px] truncate"
                        >
                          <span className="truncate">{src.title}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[#5F6576] dark:text-[#8E96B0] leading-relaxed pt-1">
                  Select any of the 13 sovereign products and fetch live 2026 external TCO, payback, and enterprise ROI benchmarks grounded in Google Search with clickable web citations.
                </p>
              )}
            </div>
          </div>

          {/* Panel 2: Google Maps Live Client Market Data */}
          <div className="rounded-xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] p-4 flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#16213A] dark:text-[#E7EBF5]">
                  <MapPin className="w-4 h-4 text-[#1C6E46] dark:text-[#6FCB9F]" />
                  <span>Regional Client Market Data (Google Maps)</span>
                </span>
                <button
                  type="button"
                  onClick={handleQuickGeolocate}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1C6E46] dark:text-[#6FCB9F] hover:underline cursor-pointer"
                >
                  <Navigation className="w-3 h-3" />
                  <span>Near Me</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {REGIONAL_HUBS.map((hub) => {
                  const active = quickHubId === hub.id && !quickUserCoords;
                  return (
                    <button
                      key={hub.id}
                      type="button"
                      onClick={() => {
                        setQuickUserCoords(null);
                        setQuickHubId(hub.id);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-[#1C6E46] text-white border-[#1C6E46] dark:bg-[#6FCB9F] dark:text-[#0B1020] dark:border-[#6FCB9F]'
                          : 'bg-white dark:bg-[#141A32] text-[#4A5568] dark:text-[#C8D0E4] border-[#E4DFD6] dark:border-[#232B4A] hover:border-[#1C6E46]'
                      }`}
                    >
                      {hub.id === 'san-jose'
                        ? 'San Jose (US)'
                        : hub.id === 'sydney'
                          ? 'Sydney (AU)'
                          : 'Dhaka (BD)'}
                    </button>
                  );
                })}
                <button
                  type="button"
                  disabled={mapsMarket.loading}
                  onClick={() => handleQuickMarketFetch(0)}
                  className="ml-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1C6E46] hover:bg-[#175B3A] dark:bg-[#6FCB9F] dark:hover:bg-[#5EC092] text-white dark:text-[#0B1020] text-xs font-semibold whitespace-nowrap shrink-0 disabled:opacity-60 cursor-pointer"
                >
                  {mapsMarket.loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <MapPin className="w-3.5 h-3.5" />
                  )}
                  <span>{mapsMarket.loading ? 'Querying…' : 'Fetch Client Market'}</span>
                </button>
              </div>

              {mapsMarket.error && (
                <div className="text-xs text-[#E11D48] dark:text-[#FDA4AF] bg-[#E11D48]/10 border border-[#E11D48]/25 rounded-lg px-3 py-2">
                  {mapsMarket.error}
                </div>
              )}

              {mapsMarket.loading ? (
                <div className="space-y-2 py-2 animate-pulse">
                  <div className="h-3 bg-[#E4DFD6] dark:bg-[#232B4A] rounded w-2/3" />
                  <div className="h-3 bg-[#E4DFD6] dark:bg-[#232B4A] rounded w-full" />
                  <div className="h-3 bg-[#E4DFD6] dark:bg-[#232B4A] rounded w-4/5" />
                </div>
              ) : mapsMarket.result ? (
                <div className="space-y-3 pt-2 border-t border-[#E4DFD6] dark:border-[#232B4A]">
                  <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-[#1C6E46] dark:text-[#6FCB9F]">
                    <span>
                      {mapsMarket.activeHubLabel} · {mapsMarket.activePromptLabel}
                    </span>
                    <span className="text-[#5F6576] dark:text-[#8E96B0]">
                      {mapsMarket.result.sources.length} places
                    </span>
                  </div>
                  {renderGroundedMarkdown(mapsMarket.result.text)}
                  {mapsMarket.result.sources.length > 0 && (
                    <div className="pt-2 border-t border-[#E4DFD6] dark:border-[#232B4A] grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {mapsMarket.result.sources.slice(0, 4).map((place, idx) => (
                        <a
                          key={`${place.uri}-${idx}`}
                          href={place.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group rounded-lg bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] hover:border-[#1C6E46] dark:hover:border-[#6FCB9F] p-2.5 flex flex-col gap-1 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-[11px] font-bold text-[#16213A] dark:text-[#E7EBF5] group-hover:text-[#1C6E46] dark:group-hover:text-[#6FCB9F] truncate">
                              {place.title}
                            </span>
                            <ExternalLink className="w-3 h-3 text-[#5F6576] shrink-0" />
                          </div>
                          {place.reviewSnippet && (
                            <span className="text-[10px] text-[#5F6576] dark:text-[#8E96B0] line-clamp-1">
                              “{place.reviewSnippet}”
                            </span>
                          )}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[#5F6576] dark:text-[#8E96B0] leading-relaxed pt-1">
                  Pick a Spenta operating hub (San Jose, Sydney, or Dhaka) or use your current coordinates to discover real target hospitals, banking headquarters, and industrial clusters via Google Maps grounding with clickable place links.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Validated Global Peer Comparables & 4-Row Competitive Edge Matrix */}
      <section className="rounded-2xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] p-5 sm:p-6 space-y-5">
        <div>
          <div className="text-xs font-mono text-[#1C6E46] dark:text-[#6FCB9F] font-semibold">
            Market Validation &amp; Structural Moat · Global Precedents
          </div>
          <h2 className="text-base sm:text-lg font-bold text-[#16213A] dark:text-[#E7EBF5] mt-0.5">
            Validated Global Peer Comparables &amp; 4-Axis Competitive Edge Matrix
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
          {GLOBAL_PEER_COMPARABLES.map((peer) => (
            <article
              key={peer.company}
              className="rounded-xl border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] p-4 flex flex-col justify-between gap-2.5"
            >
              <div>
                <div className="text-sm font-bold text-[#16213A] dark:text-[#E7EBF5]">
                  {peer.company}
                </div>
                <div className="text-[11px] font-mono text-[#1C6E46] dark:text-[#6FCB9F] mt-0.5">
                  {peer.vertical}
                </div>
                <p className="text-xs text-[#4A5568] dark:text-[#A4ADC6] mt-2 leading-relaxed">
                  {peer.traction}
                </p>
              </div>
              <div className="pt-2.5 border-t border-[#E4DFD6] dark:border-[#232B4A] text-[11px] text-[#16213A] dark:text-[#E7EBF5] leading-relaxed">
                <span className="font-semibold text-[#1F3863] dark:text-[#8FA6E8]">Spenta Edge: </span>
                {peer.spentaAdvantage}
              </div>
            </article>
          ))}
        </div>

        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E4DFD6] dark:border-[#232B4A] text-[#5F6576] dark:text-[#8E96B0]">
                <th className="py-2.5 pr-3 font-semibold">Competitive Dimension</th>
                <th className="py-2.5 px-3 font-semibold">Legacy Enterprise Vendors</th>
                <th className="py-2.5 px-3 font-semibold">Public Cloud AI Wrappers</th>
                <th className="py-2.5 pl-3 font-semibold text-[#1C6E46] dark:text-[#6FCB9F]">
                  Spenta Sovereign OS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4DFD6] dark:divide-[#232B4A]">
              {COMPETITIVE_EDGE_MATRIX.map((row) => (
                <tr key={row.dimension}>
                  <td className="py-3 pr-3 font-bold text-[#16213A] dark:text-[#E7EBF5] align-top min-w-[170px]">
                    {row.dimension}
                  </td>
                  <td className="py-3 px-3 text-[#5F6576] dark:text-[#8E96B0] align-top leading-relaxed">
                    {row.legacyVendors}
                  </td>
                  <td className="py-3 px-3 text-[#5F6576] dark:text-[#8E96B0] align-top leading-relaxed">
                    {row.publicCloudWrappers}
                  </td>
                  <td className="py-3 pl-3 font-medium text-[#16213A] dark:text-[#E7EBF5] bg-[#1C6E46]/[0.04] dark:bg-[#6FCB9F]/[0.05] align-top leading-relaxed">
                    {row.spentaSovereignOs}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
        </>
      )}

      {/* One-Page Quarterly Executive Summary Modal */}
      {summaryOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#0B1020]/80 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-6 overflow-y-auto"
          onClick={() => setSummaryOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="One-Page Quarterly Executive Summary"
        >
          <div
            className="w-full max-w-4xl bg-[#FAF8F4] dark:bg-[#0B1020] rounded-2xl border border-[#E4DFD6] dark:border-[#232B4A] shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Control Bar */}
            <div className="bg-white dark:bg-[#141A32] border-b border-[#E4DFD6] dark:border-[#232B4A] px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#1C6E46] dark:text-[#6FCB9F]">
                  One-Page Brief
                </span>

                <div className="inline-flex flex-wrap rounded-lg bg-[#F2EFE9] dark:bg-[#0F1529] p-0.5 border border-[#E4DFD6] dark:border-[#232B4A]">
                  {modeledSeries.map((row, idx) => (
                    <button
                      key={row.year}
                      type="button"
                      onClick={() => setSummaryYearIndex(idx)}
                      className={`px-2 py-1 rounded-md font-mono text-[11px] font-bold transition-colors cursor-pointer ${
                        summaryYearIndex === idx
                          ? 'bg-[#1F3863] text-white dark:bg-[#8FA6E8] dark:text-[#0B1020]'
                          : 'text-[#5F6576] dark:text-[#8E96B0] hover:text-[#16213A] dark:hover:text-[#E7EBF5]'
                      }`}
                    >
                      {row.year}
                    </button>
                  ))}
                </div>

                <div className="inline-flex rounded-lg bg-[#F2EFE9] dark:bg-[#0F1529] p-0.5 border border-[#E4DFD6] dark:border-[#232B4A]">
                  {QUARTER_WEIGHTS.map(({ quarter }) => (
                    <button
                      key={quarter}
                      type="button"
                      onClick={() => setSummaryQuarter(quarter)}
                      className={`px-2 py-1 rounded-md font-mono text-[11px] font-bold transition-colors cursor-pointer ${
                        summaryQuarter === quarter
                          ? 'bg-[#1C6E46] text-white dark:bg-[#6FCB9F] dark:text-[#0B1020]'
                          : 'text-[#5F6576] dark:text-[#8E96B0] hover:text-[#16213A] dark:hover:text-[#E7EBF5]'
                      }`}
                    >
                      {quarter}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySummaryText}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#0F1529] hover:border-[#1F3863]/50 dark:hover:border-[#8FA6E8]/50 text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {copiedSummary ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#1C6E46] dark:text-[#6FCB9F]" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#0F1529] hover:border-[#1F3863]/50 dark:hover:border-[#8FA6E8]/50 text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => void exportQuarterlySummaryToPdf(summaryData)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1C6E46] hover:bg-[#175B3A] dark:bg-[#6FCB9F] dark:hover:bg-[#5EC092] text-white dark:text-[#0B1020] text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>Export 1-Page PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSummaryOpen(false)}
                  aria-label="Close executive summary"
                  className="p-1.5 rounded-lg text-[#5F6576] hover:text-[#16213A] dark:hover:text-white hover:bg-[#F2EFE9] dark:hover:bg-[#1D2545] cursor-pointer"
                >
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* One-Page Executive Brief Sheet */}
            <div className="p-3 sm:p-6 overflow-y-auto">
              <div className="bg-white dark:bg-[#141A32] rounded-xl border border-[#E4DFD6] dark:border-[#232B4A] overflow-hidden">
                <div className="bg-[#0F1529] text-white px-5 sm:px-6 py-5 border-b border-[#6FCB9F]/35">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <SpentaLogo className="h-7 sm:h-8" tone="dark-bg" />
                      <span className="font-mono text-[10px] font-bold tracking-wider uppercase text-[#6FCB9F] bg-[#6FCB9F]/10 border border-[#6FCB9F]/30 px-2 py-0.5 rounded">
                        QUARTERLY EXECUTIVE BRIEF
                      </span>
                    </div>
                    <span className="font-mono text-xs font-extrabold bg-[#6FCB9F] text-[#0B1020] px-3 py-1 rounded-md">
                      {summaryData.quarter} {summaryData.fiscalYear} ({summaryData.fiscalLabel})
                    </span>
                  </div>

                  <h2 className="text-lg sm:text-xl font-extrabold tracking-tight mt-3">
                    {summaryData.quarter} {summaryData.fiscalYear} Financial &amp; Sovereign Deployment Summary
                  </h2>
                  <p className="font-mono text-[11px] text-[#8E96B0] mt-1 tabular-nums">
                    Scenario: {summaryData.scenarioLabel} · FX: {summaryData.fxRate} BDT/USD · Tax:{' '}
                    {summaryData.taxRate.toFixed(1)}% · Generated {summaryData.generatedAtLabel}
                  </p>
                </div>

                <div className="p-4 sm:p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="rounded-xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] p-3.5">
                      <div className="text-[10px] font-mono uppercase text-[#5F6576] dark:text-[#8E96B0]">
                        {summaryData.quarter} Revenue ({summaryData.selectedQuarterRow.weightPct}%)
                      </div>
                      <div className="font-mono text-xl font-extrabold text-[#16213A] dark:text-[#E7EBF5] mt-1 tabular-nums">
                        {formatCompactUsdK(summaryData.selectedQuarterRow.revK)}
                      </div>
                      <div className="text-[11px] font-mono text-[#5F6576] dark:text-[#8E96B0] mt-0.5 tabular-nums">
                        Run-rate: {formatCompactUsdK(summaryData.selectedQuarterRow.revK * 4)}/yr
                      </div>
                    </div>

                    <div className="rounded-xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] p-3.5">
                      <div className="text-[10px] font-mono uppercase text-[#5F6576] dark:text-[#8E96B0]">
                        {summaryData.quarter} EBITDA
                      </div>
                      <div className="font-mono text-xl font-extrabold text-[#0D9488] dark:text-sky-400 mt-1 tabular-nums">
                        {formatCompactUsdK(summaryData.selectedQuarterRow.ebitdaK)}
                      </div>
                      <div className="text-[11px] font-mono text-[#5F6576] dark:text-[#8E96B0] mt-0.5 tabular-nums">
                        Margin: {summaryData.selectedQuarterRow.ebitdaMarginPct.toFixed(1)}%
                      </div>
                    </div>

                    <div className="rounded-xl bg-[#1C6E46]/10 dark:bg-[#6FCB9F]/10 border border-[#1C6E46]/30 dark:border-[#6FCB9F]/35 p-3.5">
                      <div className="text-[10px] font-mono uppercase text-[#1C6E46] dark:text-[#6FCB9F]">
                        {summaryData.quarter} Net Profit
                      </div>
                      <div className="font-mono text-xl font-extrabold text-[#1C6E46] dark:text-[#6FCB9F] mt-1 tabular-nums">
                        {formatCompactUsdK(summaryData.selectedQuarterRow.netProfitK)}
                      </div>
                      <div className="text-[11px] font-mono text-[#4A5568] dark:text-[#8E96B0] mt-0.5 tabular-nums">
                        After {summaryData.taxRate.toFixed(1)}% corp. tax
                      </div>
                    </div>

                    <div className="rounded-xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] p-3.5">
                      <div className="text-[10px] font-mono uppercase text-[#5F6576] dark:text-[#8E96B0]">
                        SAFE Exit ROI ({summaryData.exitEbitdaMultiple}× EV)
                      </div>
                      <div className="font-mono text-xl font-extrabold text-[#16213A] dark:text-[#E7EBF5] mt-1 tabular-nums">
                        {summaryData.safeEquityRoiMultiple.toFixed(2)}×
                      </div>
                      <div className="text-[11px] font-mono text-[#5F6576] dark:text-[#8E96B0] mt-0.5 tabular-nums">
                        Cap. Eff: {summaryData.fiveYearCapitalEfficiency.toFixed(2)}× · EV ${summaryData.impliedExitEvM.toFixed(2)}M
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#1C6E46] dark:text-[#6FCB9F]">
                        {summaryData.fiscalYear} Quarterly Phasing &amp; Full-Year Reconciliation
                      </span>
                      <span className="font-mono text-[10px] text-[#5F6576] dark:text-[#8E96B0]">
                        Seasonal ramp: 21% / 24% / 26% / 29%
                      </span>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-[#E4DFD6] dark:border-[#232B4A]">
                      <table className="w-full min-w-[520px] text-left font-mono text-xs tabular-nums">
                        <thead className="bg-[#0F1529] text-[#6FCB9F]">
                          <tr>
                            <th className="py-2 px-3">Quarter</th>
                            <th className="py-2 px-3 text-right">Share</th>
                            <th className="py-2 px-3 text-right">Revenue</th>
                            <th className="py-2 px-3 text-right">EBITDA</th>
                            <th className="py-2 px-3 text-right">EBITDA %</th>
                            <th className="py-2 px-3 text-right">Net Profit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EFEBE3] dark:divide-[#1E2642]">
                          {summaryData.quarters.map((qRow) => {
                            const active = qRow.quarter === summaryData.quarter;
                            return (
                              <tr
                                key={qRow.quarter}
                                onClick={() => setSummaryQuarter(qRow.quarter)}
                                className={`cursor-pointer transition-colors ${
                                  active
                                    ? 'bg-[#1C6E46]/10 dark:bg-[#6FCB9F]/15 font-bold text-[#16213A] dark:text-white'
                                    : 'hover:bg-[#FAF8F4] dark:hover:bg-[#192140] text-[#334155] dark:text-[#C9D2E6]'
                                }`}
                              >
                                <td className="py-2 px-3">
                                  {qRow.quarter} {summaryData.fiscalYear}
                                  {active && (
                                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-[#1C6E46] dark:bg-[#6FCB9F] text-white dark:text-[#0B1020]">
                                      ACTIVE
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-right">{qRow.weightPct}%</td>
                                <td className="py-2 px-3 text-right">{formatCompactUsdK(qRow.revK)}</td>
                                <td className="py-2 px-3 text-right text-[#0D9488] dark:text-sky-400">
                                  {formatCompactUsdK(qRow.ebitdaK)}
                                </td>
                                <td className="py-2 px-3 text-right">
                                  {qRow.ebitdaMarginPct.toFixed(1)}%
                                </td>
                                <td className="py-2 px-3 text-right text-[#1C6E46] dark:text-[#6FCB9F] font-semibold">
                                  {formatCompactUsdK(qRow.netProfitK)}
                                </td>
                              </tr>
                            );
                          })}
                          <tr className="bg-[#F2EFE9] dark:bg-[#0F1529] font-bold text-[#16213A] dark:text-[#E7EBF5]">
                            <td className="py-2.5 px-3">
                              Total {summaryData.fiscalYear} ({summaryData.fiscalLabel})
                            </td>
                            <td className="py-2.5 px-3 text-right">100%</td>
                            <td className="py-2.5 px-3 text-right">
                              {formatCompactUsdK(summaryData.annualRevK)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-[#0D9488] dark:text-sky-400">
                              {formatCompactUsdK(summaryData.annualEbitdaK)}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {summaryData.annualRevK > 0
                                ? `${((summaryData.annualEbitdaK / summaryData.annualRevK) * 100).toFixed(1)}%`
                                : '0.0%'}
                            </td>
                            <td className="py-2.5 px-3 text-right text-[#1C6E46] dark:text-[#6FCB9F]">
                              {formatCompactUsdK(summaryData.annualNetProfitK)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] p-4">
                      <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#1C6E46] dark:text-[#6FCB9F] mb-2.5">
                        Model Assumptions &amp; FX Hedge
                      </div>
                      <dl className="space-y-1.5 text-xs">
                        <div className="flex justify-between gap-2">
                          <dt className="text-[#5F6576] dark:text-[#8E96B0]">Active Scenario</dt>
                          <dd className="font-mono font-bold text-[#16213A] dark:text-[#E7EBF5] text-right">
                            {summaryData.scenarioLabel}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-[#5F6576] dark:text-[#8E96B0]">BDT / USD FX Rate</dt>
                          <dd className="font-mono font-bold text-[#16213A] dark:text-[#E7EBF5] tabular-nums">
                            {summaryData.fxRate} BDT (120 base)
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-[#5F6576] dark:text-[#8E96B0]">Effective Corp. Tax</dt>
                          <dd className="font-mono font-bold text-[#16213A] dark:text-[#E7EBF5] tabular-nums">
                            {summaryData.taxRate.toFixed(1)}% (25.0% base)
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-[#5F6576] dark:text-[#8E96B0]">20-FTE Dhaka Burn</dt>
                          <dd className="font-mono font-bold text-[#16213A] dark:text-[#E7EBF5] tabular-nums">
                            ${summaryData.dhakaY1UsdK}K/yr (64.8M BDT)
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-[#5F6576] dark:text-[#8E96B0]">SAFE Capital Ask</dt>
                          <dd className="font-mono font-bold text-[#1C6E46] dark:text-[#6FCB9F] tabular-nums">
                            $500K · $4.5M Cap ({effectiveOwnershipPct.toFixed(2)}% eff.)
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-[#5F6576] dark:text-[#8E96B0]">Exit Multiple (Y5)</dt>
                          <dd className="font-mono font-bold text-[#16213A] dark:text-[#E7EBF5] tabular-nums">
                            {summaryData.exitEbitdaMultiple}× EBITDA → EV ${summaryData.impliedExitEvM.toFixed(2)}M ({dilutionPct}% dil.)
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div className="rounded-xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] p-4">
                      <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#1C6E46] dark:text-[#6FCB9F] mb-2.5">
                        Composed Sovereign Stack Snapshot
                      </div>
                      <dl className="space-y-1.5 text-xs">
                        <div className="flex justify-between gap-2">
                          <dt className="text-[#5F6576] dark:text-[#8E96B0]">Selected Modules</dt>
                          <dd className="font-mono font-bold text-[#16213A] dark:text-[#E7EBF5] tabular-nums">
                            {summaryData.stackModuleCount} / 13 Spenta Apps
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-[#5F6576] dark:text-[#8E96B0]">One-Time + Retainers</dt>
                          <dd className="font-mono font-bold text-[#16213A] dark:text-[#E7EBF5] tabular-nums text-right">
                            ${(summaryData.stackSetupUsd / 1000).toFixed(1)}K
                            {summaryData.stackQuarterlyRetainerUsd && summaryData.stackQuarterlyRetainerUsd > 0
                              ? ` + $${(summaryData.stackQuarterlyRetainerUsd / 1000).toFixed(1)}K/qtr`
                              : ' one-time'}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-[#5F6576] dark:text-[#8E96B0]">Rev-Weighted GM (Y1)</dt>
                          <dd className="font-mono font-bold text-[#1C6E46] dark:text-[#6FCB9F] tabular-nums">
                            {summaryData.stackBlendedGmPct.toFixed(1)}%
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-[#5F6576] dark:text-[#8E96B0]">Server PC Tier</dt>
                          <dd className="font-mono font-bold text-[#16213A] dark:text-[#E7EBF5]">
                            {summaryData.recommendedTierCode} ({summaryData.recommendedTierCapex})
                          </dd>
                        </div>
                      </dl>
                      {summaryData.stackModuleNames.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-[#E4DFD6] dark:border-[#232B4A] text-[11px] text-[#5F6576] dark:text-[#8E96B0]">
                          <strong className="text-[#16213A] dark:text-[#E7EBF5]">Modules:</strong>{' '}
                          {summaryData.stackModuleNames.join(' · ')}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl bg-[#0F1529] text-white border border-[#232B4A] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-wider text-[#6FCB9F]">
                        {summaryData.fiscalYear} Operating Milestone &amp; Governance
                      </div>
                      <p className="text-xs text-[#C6D2EE] mt-1 leading-relaxed">
                        {summaryData.milestone}. Backed by L1–L6 Sovereign Core (OPA ≥0.88 HITL gate, zero external LLM cloud egress) and 250%–350% enterprise client ROI.
                      </p>
                    </div>
                    <span className="font-mono text-[11px] text-[#8E96B0] shrink-0">
                      spenta.tech · hello@spenta.tech
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
