import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CalendarClock, DollarSign, GitCompareArrows, Layers, RotateCcw, TrendingUp } from 'lucide-react';
import { FINANCIAL_TRAJECTORY } from '../data/spentaManifest';
import { GrowthMode, GROWTH_MODE_SPECS } from '../data/spentaEnrichments';

export interface ModeledFinancialSeriesRow {
  year: string;
  label: string;
  conservativeRevK: number;
  conservativeBurnK: number;
  conservativeEbitdaK: number;
  conservativeNetProfitK: number;
  upsideRevK: number;
  upsideEbitdaK: number;
  upsideNetProfitK: number;
  milestone: string;
  upsideMilestone: string;
  growthFactor: number;
  revK: number;
  ebitdaK: number;
  netProfitK: number;
  cumEbitdaK: number;
  cumNetK: number;
  capitalEfficiencyMultiple: number;
}

export interface InvestorRoiYearPoint {
  yrNum: number;
  year: string;
  label: string;
  yearAxisLabel: string;
  revK: number;
  ebitdaK: number;
  netProfitK: number;
  cumNetK: number;
  impliedEvK: number;
  costBasisK: number;
  stakeValueK: number;
  conservativeStakeK: number;
  upsideStakeK: number;
  conservativeGrowthStakeK: number;
  aggressiveGrowthStakeK: number;
  conservativeGrowthMoic: number;
  aggressiveGrowthMoic: number;
  growthSpreadK: number;
  netGainK: number;
  moic: number;
  annualizedIrrPct: number;
  proRataCumNetK: number;
  capitalEfficiencyMultiple: number;
  belowSafeCapFloor: boolean;
}

export interface InvestorRoiCalculatorProps {
  modeledSeries: ModeledFinancialSeriesRow[];
  investorRoiSeries?: InvestorRoiYearPoint[];
  scenario: 'conservative' | 'upside';
  growthMode: GrowthMode;
  compareGrowthScenarios: boolean;
  fxRate: number;
  taxRate: number;
  exitMultiple: number;
  dilutionPct: number;
  investmentK: number;
  horizonYears: number;
  isDark: boolean;
  onToggleCompareGrowthScenarios: () => void;
  onChangeInvestmentK: (valK: number) => void;
  onChangeHorizonYears: (years: number) => void;
  onChangeExitMultiple: (val: number) => void;
  onChangeDilutionPct: (val: number) => void;
}

interface InvestmentTier {
  id: 'angel' | 'syndicate' | 'colead' | 'lead';
  label: string;
  amountK: number;
  subtitle: string;
}

export const POST_MONEY_CAP_K = 4500;
export const SAFE_DISCOUNT_PCT = 20;
const BASE_BDT_BURN_RATIO = 0.65;

const INVESTMENT_TIERS: InvestmentTier[] = [
  { id: 'angel', label: 'Angel Check', amountK: 50, subtitle: '1.11% pre-dil.' },
  { id: 'syndicate', label: 'Syndicate Tier', amountK: 100, subtitle: '2.22% pre-dil.' },
  { id: 'colead', label: 'Co-Lead Anchor', amountK: 250, subtitle: '5.56% pre-dil.' },
  { id: 'lead', label: 'Full SAFE Lead', amountK: 500, subtitle: '11.11% pre-dil.' },
];

const HORIZON_OPTIONS: { years: number; label: string; fy: string }[] = [
  { years: 1, label: '1 Yr', fy: 'FY2027' },
  { years: 2, label: '2 Yrs', fy: 'FY2028' },
  { years: 3, label: '3 Yrs', fy: 'FY2029' },
  { years: 4, label: '4 Yrs', fy: 'FY2030' },
  { years: 5, label: '5 Yrs', fy: 'FY2031' },
];

export function formatUsdFromK(valK: number): string {
  const absK = Math.abs(valK);
  const sign = valK < 0 ? '-' : '';
  if (absK >= 1000) {
    return `${sign}$${(absK / 1000).toFixed(2)}M`;
  }
  return `${sign}$${Math.round(absK).toLocaleString()}K`;
}

function computeAdjustedEbitdaK(
  baseRevK: number,
  baseEbitdaK: number,
  growthFactor: number,
  fxRate: number,
): number {
  const revK = baseRevK * growthFactor;
  const scaledEbitdaK = baseEbitdaK * growthFactor;
  const impliedOpexK = revK - scaledEbitdaK;
  const fxDeltaFactor = 120 / fxRate - 1;
  const fxCostAdjustmentK = impliedOpexK * BASE_BDT_BURN_RATIO * fxDeltaFactor;
  return Math.max(0, Number((scaledEbitdaK - fxCostAdjustmentK).toFixed(1)));
}

export function computeInvestorRoiSeries(params: {
  modeledSeries: ModeledFinancialSeriesRow[];
  scenario: 'conservative' | 'upside';
  horizonYears: number;
  exitMultiple: number;
  dilutionPct: number;
  investmentK: number;
  fxRate: number;
}): InvestorRoiYearPoint[] {
  const {
    modeledSeries,
    scenario,
    horizonYears,
    exitMultiple,
    dilutionPct,
    investmentK,
    fxRate,
  } = params;

  const clampedHorizon = Math.max(1, Math.min(5, Math.round(horizonYears)));
  const clampedInvestmentK = Math.max(25, Math.min(500, investmentK));
  const effectiveOwnership = (clampedInvestmentK / POST_MONEY_CAP_K) * (1 - dilutionPct / 100);
  const aggressiveBase = GROWTH_MODE_SPECS.aggressive.annualCompoundBase;

  const sourceSeries =
    modeledSeries.length > 0
      ? modeledSeries
      : FINANCIAL_TRAJECTORY.map((row) => ({
          ...row,
          growthFactor: 1,
          revK: row.conservativeRevK,
          ebitdaK: row.conservativeEbitdaK,
          netProfitK: row.conservativeNetProfitK,
          cumEbitdaK: row.conservativeEbitdaK,
          cumNetK: row.conservativeNetProfitK,
          capitalEfficiencyMultiple: Number((row.conservativeNetProfitK / 500).toFixed(2)),
        }));

  return sourceSeries.slice(0, clampedHorizon).map((row, idx) => {
    const yrNum = idx + 1;
    const impliedEvK = row.ebitdaK * exitMultiple;
    const stakeValueK = Number((impliedEvK * effectiveOwnership).toFixed(1));
    const netGainK = Number((stakeValueK - clampedInvestmentK).toFixed(1));
    const moic = clampedInvestmentK > 0 ? Number((stakeValueK / clampedInvestmentK).toFixed(2)) : 0;
    const annualizedIrrPct =
      moic > 0 ? Number(((Math.pow(moic, 1 / yrNum) - 1) * 100).toFixed(1)) : -100;

    const consEbitdaK = computeAdjustedEbitdaK(
      row.conservativeRevK,
      row.conservativeEbitdaK,
      row.growthFactor,
      fxRate,
    );
    const upsideEbitdaK = computeAdjustedEbitdaK(
      row.upsideRevK,
      row.upsideEbitdaK,
      row.growthFactor,
      fxRate,
    );

    const activeBaseRevK = scenario === 'conservative' ? row.conservativeRevK : row.upsideRevK;
    const activeBaseEbitdaK =
      scenario === 'conservative' ? row.conservativeEbitdaK : row.upsideEbitdaK;

    const conservativeGrowthFactor = 1.0;
    const aggressiveGrowthFactor = Number(Math.pow(aggressiveBase, idx).toFixed(3));

    const conservativeGrowthEbitdaK = computeAdjustedEbitdaK(
      activeBaseRevK,
      activeBaseEbitdaK,
      conservativeGrowthFactor,
      fxRate,
    );
    const aggressiveGrowthEbitdaK = computeAdjustedEbitdaK(
      activeBaseRevK,
      activeBaseEbitdaK,
      aggressiveGrowthFactor,
      fxRate,
    );

    const conservativeGrowthStakeK = Number(
      (conservativeGrowthEbitdaK * exitMultiple * effectiveOwnership).toFixed(1),
    );
    const aggressiveGrowthStakeK = Number(
      (aggressiveGrowthEbitdaK * exitMultiple * effectiveOwnership).toFixed(1),
    );
    const conservativeGrowthMoic =
      clampedInvestmentK > 0
        ? Number((conservativeGrowthStakeK / clampedInvestmentK).toFixed(2))
        : 0;
    const aggressiveGrowthMoic =
      clampedInvestmentK > 0
        ? Number((aggressiveGrowthStakeK / clampedInvestmentK).toFixed(2))
        : 0;

    const conservativeStakeK = Number((consEbitdaK * exitMultiple * effectiveOwnership).toFixed(1));
    const upsideStakeK = Number((upsideEbitdaK * exitMultiple * effectiveOwnership).toFixed(1));
    const proRataCumNetK = Number((row.cumNetK * effectiveOwnership).toFixed(1));

    return {
      yrNum,
      year: row.year,
      label: row.label,
      yearAxisLabel: `${row.year} (${row.label})`,
      revK: row.revK,
      ebitdaK: row.ebitdaK,
      netProfitK: row.netProfitK,
      cumNetK: row.cumNetK,
      impliedEvK: Number(impliedEvK.toFixed(1)),
      costBasisK: clampedInvestmentK,
      stakeValueK,
      conservativeStakeK,
      upsideStakeK,
      conservativeGrowthStakeK,
      aggressiveGrowthStakeK,
      conservativeGrowthMoic,
      aggressiveGrowthMoic,
      growthSpreadK: Number((aggressiveGrowthStakeK - conservativeGrowthStakeK).toFixed(1)),
      netGainK,
      moic,
      annualizedIrrPct,
      proRataCumNetK,
      capitalEfficiencyMultiple: row.capitalEfficiencyMultiple,
      belowSafeCapFloor: impliedEvK < POST_MONEY_CAP_K,
    };
  });
}

export function InvestorRoiCalculator({
  modeledSeries,
  investorRoiSeries,
  scenario,
  growthMode,
  compareGrowthScenarios,
  fxRate,
  taxRate,
  exitMultiple,
  dilutionPct,
  investmentK,
  horizonYears,
  isDark,
  onToggleCompareGrowthScenarios,
  onChangeInvestmentK,
  onChangeHorizonYears,
  onChangeExitMultiple,
  onChangeDilutionPct,
}: InvestorRoiCalculatorProps) {
  const activeGrowthSpec = GROWTH_MODE_SPECS[growthMode];
  const clampedHorizon = Math.max(1, Math.min(5, Math.round(horizonYears)));
  const clampedInvestmentK = Math.max(25, Math.min(500, investmentK));

  const preDilutionOwnership = clampedInvestmentK / POST_MONEY_CAP_K;
  const effectiveOwnership = preDilutionOwnership * (1 - dilutionPct / 100);
  const preDilutionPct = preDilutionOwnership * 100;
  const effectiveOwnershipPct = effectiveOwnership * 100;
  const discountImpliedValuationK = POST_MONEY_CAP_K * (1 - SAFE_DISCOUNT_PCT / 100);

  const horizonProjection = useMemo(() => {
    if (investorRoiSeries && investorRoiSeries.length > 0) {
      return investorRoiSeries;
    }
    return computeInvestorRoiSeries({
      modeledSeries,
      scenario,
      horizonYears: clampedHorizon,
      exitMultiple,
      dilutionPct,
      investmentK: clampedInvestmentK,
      fxRate,
    });
  }, [
    investorRoiSeries,
    modeledSeries,
    scenario,
    clampedHorizon,
    exitMultiple,
    dilutionPct,
    clampedInvestmentK,
    fxRate,
  ]);

  const terminalPoint =
    horizonProjection[horizonProjection.length - 1] ?? horizonProjection[0];

  const tierComparisonData = useMemo(() => {
    const activeRow = modeledSeries[clampedHorizon - 1] ?? modeledSeries[0];
    const impliedEvK = activeRow ? activeRow.ebitdaK * exitMultiple : 0;
    const isCustom = !INVESTMENT_TIERS.some((t) => t.amountK === clampedInvestmentK);

    const tiers = INVESTMENT_TIERS.map((tier) => {
      const tierOwnership = (tier.amountK / POST_MONEY_CAP_K) * (1 - dilutionPct / 100);
      const proceedsK = Number((impliedEvK * tierOwnership).toFixed(1));
      const netGainK = Number((proceedsK - tier.amountK).toFixed(1));
      const moic = tier.amountK > 0 ? Number((proceedsK / tier.amountK).toFixed(2)) : 0;
      const ownershipPct = Number((tierOwnership * 100).toFixed(2));
      return {
        tierLabel: `$${tier.amountK}K`,
        tierName: tier.label,
        amountK: tier.amountK,
        proceedsK,
        netGainK,
        moic,
        ownershipPct,
        isSelected: tier.amountK === clampedInvestmentK,
      };
    });

    if (isCustom) {
      const proceedsK = Number((impliedEvK * effectiveOwnership).toFixed(1));
      tiers.push({
        tierLabel: `$${clampedInvestmentK}K*`,
        tierName: 'Custom Ticket',
        amountK: clampedInvestmentK,
        proceedsK,
        netGainK: Number((proceedsK - clampedInvestmentK).toFixed(1)),
        moic: clampedInvestmentK > 0 ? Number((proceedsK / clampedInvestmentK).toFixed(2)) : 0,
        ownershipPct: Number(effectiveOwnershipPct.toFixed(2)),
        isSelected: true,
      });
      tiers.sort((a, b) => a.amountK - b.amountK);
    }

    return tiers;
  }, [modeledSeries, clampedHorizon, exitMultiple, dilutionPct, clampedInvestmentK, effectiveOwnership, effectiveOwnershipPct]);

  const isWithinConfidenceBand =
    terminalPoint &&
    terminalPoint.annualizedIrrPct >= 25 &&
    terminalPoint.annualizedIrrPct <= 45;

  return (
    <section
      aria-label="Interactive Investor ROI Calculator"
      className="rounded-2xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] p-5 sm:p-6 space-y-6"
    >
      {/* Calculator Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E4DFD6] dark:border-[#232B4A]">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#1C6E46] dark:text-[#6FCB9F] font-semibold">
            Interactive SAFE Allocation &amp; Horizon Simulator · $4.5M Post-Money Cap · {SAFE_DISCOUNT_PCT}% Discount
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#16213A] dark:text-[#E7EBF5] tracking-tight mt-0.5">
            Investor ROI Calculator
          </h2>
          <p className="text-xs text-[#4A5568] dark:text-[#A4ADC6] mt-1">
            Adjust investment tier ($25K–$500K) and exit horizon (1–5 years) to dynamically model ownership, projected proceeds, annualized IRR, and operating profit milestones under{' '}
            <span className="font-semibold text-[#16213A] dark:text-[#E7EBF5]">
              {scenario === 'conservative' ? 'Conservative Base' : 'Healthcare Upside'}
            </span>{' '}
            ({compareGrowthScenarios ? 'Comparing Conservative vs. Aggressive Growth' : activeGrowthSpec.shortLabel}, {fxRate} BDT/USD, {taxRate.toFixed(1)}% tax).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto shrink-0">
          <button
            type="button"
            onClick={onToggleCompareGrowthScenarios}
            aria-pressed={compareGrowthScenarios}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              compareGrowthScenarios
                ? 'bg-[#1C6E46] text-white border-[#1C6E46] dark:bg-[#6FCB9F] dark:text-[#0B1020] dark:border-[#6FCB9F]'
                : 'bg-[#FAF8F4] dark:bg-[#0F1529] border-[#E4DFD6] dark:border-[#232B4A] text-[#16213A] dark:text-[#E7EBF5] hover:border-[#1C6E46] dark:hover:border-[#6FCB9F]'
            }`}
          >
            <GitCompareArrows className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Compare Growth Scenarios</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onChangeInvestmentK(500);
              onChangeHorizonYears(5);
              onChangeExitMultiple(10);
              onChangeDilutionPct(0);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] hover:border-[#1F3863] dark:hover:border-[#8FA6E8] text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5] whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Reset $500K · 5 Yr</span>
          </button>
        </div>
      </div>

      {/* Controls Grid: Investment Tier + Time Horizon + Exit/Dilution */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Investment Tier Controls */}
        <div className="xl:col-span-6 rounded-xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] p-4 space-y-3.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <label
              htmlFor="investor-roi-ticket-slider"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#16213A] dark:text-[#E7EBF5]"
            >
              <DollarSign className="w-3.5 h-3.5 text-[#1C6E46] dark:text-[#6FCB9F]" />
              <span>SAFE Investment Tier</span>
            </label>
            <div className="font-mono text-sm sm:text-base font-extrabold text-[#1C6E46] dark:text-[#6FCB9F] tabular-nums">
              ${clampedInvestmentK}K{' '}
              <span className="text-xs font-semibold text-[#5F6576] dark:text-[#8E96B0]">
                ({effectiveOwnershipPct.toFixed(2)}% eff. · {preDilutionPct.toFixed(2)}% pre-dil.)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="group" aria-label="Preset SAFE investment tiers">
            {INVESTMENT_TIERS.map((tier) => {
              const active = clampedInvestmentK === tier.amountK;
              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => onChangeInvestmentK(tier.amountK)}
                  aria-pressed={active}
                  className={`rounded-lg px-2.5 py-2 text-left border transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#1F3863] text-white border-[#1F3863] dark:bg-[#8FA6E8] dark:text-[#0B1020] dark:border-[#8FA6E8]'
                      : 'bg-white dark:bg-[#141A32] border-[#E4DFD6] dark:border-[#232B4A] text-[#16213A] dark:text-[#E7EBF5] hover:border-[#1C6E46] dark:hover:border-[#6FCB9F]'
                  }`}
                >
                  <div className="font-mono text-xs font-extrabold tabular-nums">
                    ${tier.amountK}K
                  </div>
                  <div
                    className={`text-[10px] font-medium truncate ${
                      active ? 'text-[#C6D2EE] dark:text-[#16213A]' : 'text-[#5F6576] dark:text-[#8E96B0]'
                    }`}
                  >
                    {tier.label}
                  </div>
                </button>
              );
            })}
          </div>

          <div>
            <input
              id="investor-roi-ticket-slider"
              type="range"
              min={25}
              max={500}
              step={25}
              value={clampedInvestmentK}
              onChange={(e) => onChangeInvestmentK(Number(e.target.value))}
              aria-label="Custom SAFE investment amount in thousands of USD"
              className="w-full spenta-slider"
            />
            <div className="flex justify-between text-[10px] font-mono text-[#5F6576] dark:text-[#8E96B0] mt-1 tabular-nums">
              <span>$25K Min</span>
              <span>$100K</span>
              <span>$250K</span>
              <span className="font-bold text-[#1C6E46] dark:text-[#6FCB9F]">$500K Tranche</span>
            </div>
          </div>
        </div>

        {/* Time Horizon + Exit Sensitivity Controls */}
        <div className="xl:col-span-6 rounded-xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] p-4 space-y-3.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <label
              htmlFor="investor-roi-horizon-slider"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#16213A] dark:text-[#E7EBF5]"
            >
              <CalendarClock className="w-3.5 h-3.5 text-[#1F3863] dark:text-[#8FA6E8]" />
              <span>Investment Time Horizon</span>
            </label>
            <div className="font-mono text-sm sm:text-base font-extrabold text-[#1F3863] dark:text-[#8FA6E8] tabular-nums">
              {clampedHorizon} {clampedHorizon === 1 ? 'Year' : 'Years'}{' '}
              <span className="text-xs font-semibold text-[#5F6576] dark:text-[#8E96B0]">
                (FY2027 → {terminalPoint?.year})
              </span>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1.5" role="group" aria-label="Investment time horizon in years">
            {HORIZON_OPTIONS.map((opt) => {
              const active = clampedHorizon === opt.years;
              return (
                <button
                  key={opt.years}
                  type="button"
                  onClick={() => onChangeHorizonYears(opt.years)}
                  aria-pressed={active}
                  className={`rounded-lg px-2 py-2 text-center border transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#1C6E46] text-white border-[#1C6E46] dark:bg-[#6FCB9F] dark:text-[#0B1020] dark:border-[#6FCB9F]'
                      : 'bg-white dark:bg-[#141A32] border-[#E4DFD6] dark:border-[#232B4A] text-[#16213A] dark:text-[#E7EBF5] hover:border-[#1C6E46] dark:hover:border-[#6FCB9F]'
                  }`}
                >
                  <div className="font-mono text-xs font-extrabold tabular-nums">{opt.label}</div>
                  <div
                    className={`text-[10px] font-mono ${
                      active ? 'text-[#D6F5E5] dark:text-[#141A32]' : 'text-[#5F6576] dark:text-[#8E96B0]'
                    }`}
                  >
                    {opt.fy}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-0.5">
            <div>
              <div className="flex justify-between text-[10px] font-mono text-[#5F6576] dark:text-[#8E96B0] mb-1 tabular-nums">
                <span>Horizon</span>
                <strong className="text-[#16213A] dark:text-[#E7EBF5]">{clampedHorizon}Y</strong>
              </div>
              <input
                id="investor-roi-horizon-slider"
                type="range"
                min={1}
                max={5}
                step={1}
                value={clampedHorizon}
                onChange={(e) => onChangeHorizonYears(Number(e.target.value))}
                aria-label="Time horizon in years from 1 to 5"
                className="w-full spenta-slider"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] font-mono text-[#5F6576] dark:text-[#8E96B0] mb-1 tabular-nums">
                <span>Exit Multiple</span>
                <strong className="text-[#1C6E46] dark:text-[#6FCB9F]">{exitMultiple.toFixed(1)}× EV</strong>
              </div>
              <input
                type="range"
                min={8}
                max={15}
                step={0.5}
                value={exitMultiple}
                onChange={(e) => onChangeExitMultiple(Number(e.target.value))}
                aria-label="Exit EV to EBITDA multiple"
                className="w-full spenta-slider"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] font-mono text-[#5F6576] dark:text-[#8E96B0] mb-1 tabular-nums">
                <span>Post-Seed Dil.</span>
                <strong className="text-[#16213A] dark:text-[#E7EBF5]">{dilutionPct}%</strong>
              </div>
              <input
                type="range"
                min={0}
                max={25}
                step={5}
                value={dilutionPct}
                onChange={(e) => onChangeDilutionPct(Number(e.target.value))}
                aria-label="Post-seed dilution percentage"
                className="w-full spenta-slider"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Outcome KPI Cards */}
      {terminalPoint && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-xl p-4 bg-[#1F3863] dark:bg-[#0F1529] text-white border border-[#1F3863] dark:border-[#6FCB9F]/40">
            <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#A7E6C6] dark:text-[#6FCB9F]">
              {terminalPoint.year} Projected Equity Value
            </div>
            <div className="font-mono text-2xl font-extrabold mt-1 tabular-nums">
              {formatUsdFromK(terminalPoint.stakeValueK)}
            </div>
            <div className="text-[11px] font-mono text-[#C6D2EE] dark:text-[#8E96B0] mt-1 tabular-nums">
              Net Gain:{' '}
              <strong className="text-white dark:text-[#E7EBF5]">
                {terminalPoint.netGainK >= 0 ? '+' : ''}
                {formatUsdFromK(terminalPoint.netGainK)}
              </strong>{' '}
              on ${clampedInvestmentK}K
            </div>
          </div>

          <div className="rounded-xl p-4 bg-[#1C6E46]/[0.06] dark:bg-[#6FCB9F]/[0.08] border border-[#1C6E46]/35 dark:border-[#6FCB9F]/35">
            <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#1C6E46] dark:text-[#6FCB9F]">
              Return Multiple (MOIC) · {clampedHorizon}Y
            </div>
            <div className="font-mono text-2xl font-extrabold text-[#1C6E46] dark:text-[#6FCB9F] mt-1 tabular-nums">
              {terminalPoint.moic.toFixed(2)}×
            </div>
            <div className="text-[11px] font-mono text-[#4A5568] dark:text-[#A4ADC6] mt-1 tabular-nums">
              Annualized IRR:{' '}
              <strong className="text-[#16213A] dark:text-[#E7EBF5]">
                {terminalPoint.annualizedIrrPct >= 0 ? '+' : ''}
                {terminalPoint.annualizedIrrPct.toFixed(1)}%/yr
              </strong>
              {isWithinConfidenceBand ? ' (in 25–35% band)' : ''}
            </div>
          </div>

          <div className="rounded-xl p-4 bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A]">
            <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#5F6576] dark:text-[#8E96B0]">
              Implied {terminalPoint.year} Exit EV ({exitMultiple.toFixed(1)}×)
            </div>
            <div className="font-mono text-2xl font-extrabold text-[#16213A] dark:text-[#E7EBF5] mt-1 tabular-nums">
              {formatUsdFromK(terminalPoint.impliedEvK)}
            </div>
            <div className="text-[11px] font-mono text-[#5F6576] dark:text-[#8E96B0] mt-1 tabular-nums">
              EBITDA {formatUsdFromK(terminalPoint.ebitdaK)} · Stake {effectiveOwnershipPct.toFixed(2)}%
            </div>
          </div>

          <div className="rounded-xl p-4 bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A]">
            <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#5F6576] dark:text-[#8E96B0]">
              {compareGrowthScenarios
                ? `Growth Overlay Spread (${terminalPoint.year})`
                : `${clampedHorizon}-Yr Cum. Co. Net & Cap. Eff.`}
            </div>
            <div className="font-mono text-2xl font-extrabold text-[#16213A] dark:text-[#E7EBF5] mt-1 tabular-nums">
              {compareGrowthScenarios
                ? `+${formatUsdFromK(terminalPoint.growthSpreadK)}`
                : formatUsdFromK(terminalPoint.cumNetK)}
            </div>
            <div className="text-[11px] font-mono text-[#5F6576] dark:text-[#8E96B0] mt-1 tabular-nums">
              {compareGrowthScenarios
                ? `${terminalPoint.conservativeGrowthMoic.toFixed(2)}× Cons. vs ${terminalPoint.aggressiveGrowthMoic.toFixed(2)}× Aggr.`
                : `Cap. Eff: ${terminalPoint.capitalEfficiencyMultiple.toFixed(2)}× · Pro-rata net: ${formatUsdFromK(terminalPoint.proRataCumNetK)}`}
            </div>
          </div>
        </div>
      )}

      {/* Early-Horizon Cap Floor Notice when Y1–Y2 EBITDA × Multiple < $4.5M Post-Money Cap */}
      {terminalPoint?.belowSafeCapFloor && (
        <div className="rounded-xl border border-[#8A5C10]/30 dark:border-[#E0B063]/35 bg-[#8A5C10]/[0.06] dark:bg-[#E0B063]/[0.08] px-4 py-3 text-xs text-[#5B3D0A] dark:text-[#F3D39C] leading-relaxed">
          <strong className="font-mono uppercase text-[11px]">
            Pre-Scale Horizon Note ({terminalPoint.year}):
          </strong>{' '}
          During the {terminalPoint.label} build-out phase, implied {exitMultiple.toFixed(1)}× EBITDA enterprise value ({formatUsdFromK(terminalPoint.impliedEvK)}) sits below the $4.50M SAFE post-money valuation cap ($3.60M at {SAFE_DISCOUNT_PCT}% discount floor). Equity multiple inflection crosses break-even by Year 3 (FY2029).
        </div>
      )}

      {/* Dynamic Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Chart: Horizon Trajectory (Y1 -> Y[N]) with Growth Scenario Overlay */}
        <div className="lg:col-span-7 min-w-0 rounded-xl border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="inline-flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#1C6E46] dark:text-[#6FCB9F]" strokeWidth={1.75} />
              <h3 className="text-xs sm:text-sm font-bold text-[#16213A] dark:text-[#E7EBF5]">
                {compareGrowthScenarios
                  ? `Conservative vs. Aggressive Growth Overlay (${clampedHorizon}-Yr)`
                  : `Projected Equity Value & MOIC (${clampedHorizon}-Year Horizon)`}
              </h3>
            </div>
            <span className="font-mono text-[11px] text-[#5F6576] dark:text-[#8E96B0] tabular-nums">
              Cost Basis: ${clampedInvestmentK}K
            </span>
          </div>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={horizonProjection}
                margin={{ top: 10, right: 10, left: 0, bottom: 4 }}
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
                  yAxisId="usd"
                  tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}M` : `$${v}K`)}
                  tick={{
                    fontSize: 11,
                    fontFamily: 'JetBrains Mono, monospace',
                    fill: isDark ? '#8E96B0' : '#5F6576',
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="moic"
                  orientation="right"
                  tickFormatter={(v) => `${Number(v).toFixed(1)}×`}
                  tick={{
                    fontSize: 11,
                    fontFamily: 'JetBrains Mono, monospace',
                    fill: isDark ? '#F5C57B' : '#8A5C10',
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value, name) => {
                    const num = Number(value ?? 0);
                    const label = String(name ?? '');
                    if (label.includes('MOIC')) {
                      return [`${num.toFixed(2)}×`, label];
                    }
                    return [formatUsdFromK(num), label];
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
                  yAxisId="usd"
                  y={clampedInvestmentK}
                  stroke={isDark ? '#8FA6E8' : '#1F3863'}
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: `Basis $${clampedInvestmentK}K`,
                    position: 'insideTopLeft',
                    fill: isDark ? '#8FA6E8' : '#1F3863',
                    fontSize: 10,
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                />
                {compareGrowthScenarios ? (
                  <>
                    <Bar
                      yAxisId="usd"
                      dataKey="conservativeGrowthStakeK"
                      name="Conservative Growth 1.00× ($K)"
                      fill={isDark ? '#8FA6E8' : '#1F3863'}
                      radius={[4, 4, 0, 0]}
                      barSize={22}
                      isAnimationActive={false}
                    />
                    <Bar
                      yAxisId="usd"
                      dataKey="aggressiveGrowthStakeK"
                      name="Aggressive Growth 1.045ⁿ ($K)"
                      fill={isDark ? '#6FCB9F' : '#1C6E46'}
                      radius={[4, 4, 0, 0]}
                      barSize={22}
                      isAnimationActive={false}
                    />
                    <Line
                      yAxisId="moic"
                      type="monotone"
                      dataKey="conservativeGrowthMoic"
                      name="Conservative MOIC (×)"
                      stroke={isDark ? '#93C5FD' : '#2563EB'}
                      strokeWidth={2}
                      strokeDasharray="4 3"
                      dot={{ r: 3, fill: isDark ? '#93C5FD' : '#2563EB' }}
                      isAnimationActive={false}
                    />
                    <Line
                      yAxisId="moic"
                      type="monotone"
                      dataKey="aggressiveGrowthMoic"
                      name="Aggressive MOIC (×)"
                      stroke={isDark ? '#F5C57B' : '#B45309'}
                      strokeWidth={2.5}
                      dot={{ r: 3.5, fill: isDark ? '#F5C57B' : '#B45309' }}
                      isAnimationActive={false}
                    />
                  </>
                ) : (
                  <>
                    <Bar
                      yAxisId="usd"
                      dataKey="conservativeStakeK"
                      name="Conservative Stake ($K)"
                      fill={isDark ? '#8FA6E8' : '#1F3863'}
                      radius={[4, 4, 0, 0]}
                      barSize={24}
                      isAnimationActive={false}
                    />
                    <Bar
                      yAxisId="usd"
                      dataKey="upsideStakeK"
                      name="Healthcare Upside ($K)"
                      fill={isDark ? '#6FCB9F' : '#1C6E46'}
                      radius={[4, 4, 0, 0]}
                      barSize={24}
                      isAnimationActive={false}
                    />
                    <Line
                      yAxisId="moic"
                      type="monotone"
                      dataKey="moic"
                      name="Active MOIC (×)"
                      stroke={isDark ? '#F5C57B' : '#B45309'}
                      strokeWidth={2.5}
                      dot={{ r: 3.5, fill: isDark ? '#F5C57B' : '#B45309' }}
                      isAnimationActive={false}
                    />
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Chart: Tier-by-Tier Proceeds at Selected Horizon */}
        <div className="lg:col-span-5 min-w-0 rounded-xl border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="inline-flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#1F3863] dark:text-[#8FA6E8]" strokeWidth={1.75} />
              <h3 className="text-xs sm:text-sm font-bold text-[#16213A] dark:text-[#E7EBF5]">
                Outcomes Across Tiers ({terminalPoint?.year})
              </h3>
            </div>
            <span className="font-mono text-[11px] text-[#1C6E46] dark:text-[#6FCB9F] tabular-nums">
              {exitMultiple.toFixed(1)}× EV · {dilutionPct}% Dil.
            </span>
          </div>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={tierComparisonData}
                margin={{ top: 10, right: 10, left: 0, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDark ? '#232B4A' : '#E4DFD6'}
                  vertical={false}
                />
                <XAxis
                  dataKey="tierLabel"
                  tick={{
                    fontSize: 11,
                    fontFamily: 'JetBrains Mono, monospace',
                    fill: isDark ? '#8E96B0' : '#5F6576',
                  }}
                  axisLine={{ stroke: isDark ? '#232B4A' : '#E4DFD6' }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}M` : `$${v}K`)}
                  tick={{
                    fontSize: 11,
                    fontFamily: 'JetBrains Mono, monospace',
                    fill: isDark ? '#8E96B0' : '#5F6576',
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value, name, item) => {
                    const num = Number(value ?? 0);
                    const p = item?.payload as { ownershipPct?: number; moic?: number } | undefined;
                    return [
                      `${formatUsdFromK(num)}${p ? ` (${p.ownershipPct}% · ${p.moic?.toFixed(2)}×)` : ''}`,
                      String(name ?? ''),
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
                  dataKey="amountK"
                  name="Check Size ($K)"
                  fill={isDark ? '#4B5A87' : '#B9B2A5'}
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="proceedsK"
                  name={`${terminalPoint?.year ?? 'Exit'} Proceeds ($K)`}
                  fill={isDark ? '#6FCB9F' : '#1C6E46'}
                  radius={[4, 4, 0, 0]}
                  barSize={24}
                  isAnimationActive={false}
                >
                  {tierComparisonData.map((entry) => (
                    <Cell
                      key={entry.tierLabel}
                      fill={
                        entry.isSelected
                          ? isDark
                            ? '#6FCB9F'
                            : '#1C6E46'
                          : isDark
                            ? '#8FA6E8'
                            : '#1F3863'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Year-by-Year Investor Horizon Schedule Table */}
      <div className="pt-2 border-t border-[#E4DFD6] dark:border-[#232B4A] overflow-x-auto">
        <table className="w-full min-w-[660px] text-left font-mono text-xs tabular-nums">
          <thead>
            <tr className="text-[#5F6576] dark:text-[#8E96B0] border-b border-[#E4DFD6] dark:border-[#232B4A]">
              <th className="py-2 pr-3">Horizon Year</th>
              <th className="py-2 px-3 text-right">Co. Revenue</th>
              <th className="py-2 px-3 text-right">Co. EBITDA</th>
              <th className="py-2 px-3 text-right">Implied EV ({exitMultiple.toFixed(1)}×)</th>
              <th className="py-2 px-3 text-right">
                {compareGrowthScenarios ? 'Cons. Growth' : 'Investor Stake'}
              </th>
              <th className="py-2 px-3 text-right">
                {compareGrowthScenarios ? 'Aggr. Growth' : 'Net Gain / Loss'}
              </th>
              <th className="py-2 px-3 text-right">MOIC</th>
              <th className="py-2 pl-3 text-right">Ann. IRR</th>
            </tr>
          </thead>
          <tbody>
            {horizonProjection.map((row) => {
              const isTerminal = row.yrNum === clampedHorizon;
              return (
                <tr
                  key={row.year}
                  className={`border-b border-[#EFEBE3] dark:border-[#1E2642] last:border-0 ${
                    isTerminal ? 'bg-[#1C6E46]/[0.06] dark:bg-[#6FCB9F]/[0.08] font-bold' : ''
                  }`}
                >
                  <td className="py-2.5 pr-3 text-[#16213A] dark:text-[#E7EBF5]">
                    {row.year}{' '}
                    <span className="text-[#5F6576] dark:text-[#8E96B0] font-normal">
                      ({row.label})
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-[#334155] dark:text-[#C9D2E6]">
                    {formatUsdFromK(row.revK)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-[#0D9488] dark:text-sky-400">
                    {formatUsdFromK(row.ebitdaK)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-[#16213A] dark:text-[#E7EBF5]">
                    {formatUsdFromK(row.impliedEvK)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-[#16213A] dark:text-[#E7EBF5]">
                    {compareGrowthScenarios
                      ? formatUsdFromK(row.conservativeGrowthStakeK)
                      : formatUsdFromK(row.stakeValueK)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right ${
                      compareGrowthScenarios || row.netGainK >= 0
                        ? 'text-[#1C6E46] dark:text-[#6FCB9F]'
                        : 'text-[#8A5C10] dark:text-[#E0B063]'
                    }`}
                  >
                    {compareGrowthScenarios ? (
                      formatUsdFromK(row.aggressiveGrowthStakeK)
                    ) : (
                      <>
                        {row.netGainK >= 0 ? '+' : ''}
                        {formatUsdFromK(row.netGainK)}
                      </>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right text-[#1C6E46] dark:text-[#6FCB9F]">
                    {compareGrowthScenarios
                      ? `${row.conservativeGrowthMoic.toFixed(2)}× / ${row.aggressiveGrowthMoic.toFixed(2)}×`
                      : `${row.moic.toFixed(2)}×`}
                  </td>
                  <td className="py-2.5 pl-3 text-right text-[#16213A] dark:text-[#E7EBF5]">
                    {row.annualizedIrrPct >= 0 ? '+' : ''}
                    {row.annualizedIrrPct.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] font-mono text-[#5F6576] dark:text-[#8E96B0] leading-relaxed">
        Methodology: ${clampedInvestmentK}K Post-Money SAFE at ${POST_MONEY_CAP_K / 1000}M Cap ({preDilutionPct.toFixed(2)}% pre-dilution;{' '}
        {effectiveOwnershipPct.toFixed(2)}% after {dilutionPct}% subsequent dilution) with a {SAFE_DISCOUNT_PCT}% discount protection (${(discountImpliedValuationK / 1000).toFixed(2)}M implied conversion floor). Operating Capital Efficiency ({terminalPoint?.capitalEfficiencyMultiple.toFixed(2)}× through {terminalPoint?.year}) tracks cumulative company net profit ÷ $500K total round and remains distinct from investor SAFE exit proceeds.
      </p>
    </section>
  );
}
