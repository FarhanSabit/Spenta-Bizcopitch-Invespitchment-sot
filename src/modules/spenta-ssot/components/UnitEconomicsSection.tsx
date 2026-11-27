import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  Copy,
  Layers,
  Loader2,
  MessageSquarePlus,
  Sparkles,
} from 'lucide-react';
import {
  BRIEFING_CHAPTERS,
  INVESTOR_PERSONA_TRACKS,
  NINE_TIER_UNIT_ECONOMICS,
  formatSsotCurrency,
} from '../../../data/unifiedSsotData';
import { useStack } from '../../../store/StackContext';
import { copyTextWithFallback } from '../../../utils/shareUrlCodec';
import {
  ConfidenceLevelPct,
  useSsotBriefing,
} from '../context/SsotBriefingContext';

interface AiSummaryResult {
  summary: string;
  thesisBullets: string[];
  riskMitigants: string[];
  modelUsed: string;
  generatedAt: string;
}

/** Deterministic PRNG (Mulberry32) so D3 Monte Carlo distribution updates predictably per scenario */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function UnitEconomicsSection() {
  const {
    theme,
    currency,
    setCurrency,
    personaTrack,
    investorCalculatorState,
    investorFeedback,
    openIntelligenceModal,
    loadCaseStudyStack,
    navigateToItem,
  } = useStack();
  const {
    bearCaseEnabled,
    setBearCaseEnabled,
    confidenceLevelPct,
    setConfidenceLevelPct,
    pulsedSectionId,
  } = useSsotBriefing();

  const [tierCategory, setTierCategory] = useState<'All' | 'A' | 'B' | 'C'>('All');
  const [selectedTierId, setSelectedTierId] = useState<string>(NINE_TIER_UNIT_ECONOMICS[6].id);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<AiSummaryResult | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  const monteCarloSvgRef = useRef<SVGSVGElement | null>(null);

  const isDark = theme === 'dark';
  const fxRate = investorCalculatorState.fxRate;
  const chapter = BRIEFING_CHAPTERS[4];
  const activePersonaSpec =
    INVESTOR_PERSONA_TRACKS.find((t) => t.id === personaTrack) ?? INVESTOR_PERSONA_TRACKS[0];
  const noteCount = investorFeedback.filter(
    (f) => f.section === chapter.title || f.section.includes(chapter.shortTitle),
  ).length;

  const filteredTiers = useMemo(() => {
    if (tierCategory === 'All') return NINE_TIER_UNIT_ECONOMICS;
    return NINE_TIER_UNIT_ECONOMICS.filter((t) => t.category === tierCategory);
  }, [tierCategory]);

  const selectedTier =
    filteredTiers.find((t) => t.id === selectedTierId) ??
    filteredTiers[0] ??
    NINE_TIER_UNIT_ECONOMICS[0];

  // Bear-Case Sensitivity Adjustments (+20% CAC, -15% realization pricing, +10% compute)
  const adjustedTierMetrics = useMemo(() => {
    const cb = selectedTier.costBreakdownUsd;
    const revUsd = bearCaseEnabled
      ? Math.round(selectedTier.baselineUsd * 0.85)
      : selectedTier.baselineUsd;
    const cacUsd = bearCaseEnabled ? Math.round(cb.salesCac * 1.2) : cb.salesCac;
    const computeUsd = bearCaseEnabled ? Math.round(cb.cloudCompute * 1.1) : cb.cloudCompute;
    const totalCost =
      cb.engineeringLabor + cb.spatialDesignLabor + computeUsd + cacUsd + cb.overheadReserve;
    const netUsd = Math.max(0, revUsd - totalCost);
    const netMarginPct = revUsd > 0 ? (netUsd / revUsd) * 100 : 0;
    return {
      revUsd,
      cacUsd,
      computeUsd,
      netUsd,
      netMarginPct,
      waterfall: [
        { label: 'Eng Labor', usd: cb.engineeringLabor, fill: isDark ? '#8FA6E8' : '#1F3863' },
        { label: '3D / Spatial', usd: cb.spatialDesignLabor, fill: isDark ? '#60A5FA' : '#2563EB' },
        { label: 'Compute', usd: computeUsd, fill: isDark ? '#94A3B8' : '#64748B' },
        { label: 'Sales CAC', usd: cacUsd, fill: isDark ? '#F59E0B' : '#B45309' },
        { label: 'Overhead', usd: cb.overheadReserve, fill: isDark ? '#64748B' : '#94A3B8' },
        { label: 'Net Margin', usd: netUsd, fill: isDark ? '#6FCB9F' : '#1C6E46' },
      ],
    };
  }, [selectedTier, bearCaseEnabled, isDark]);

  // Monte Carlo 1,500-Trial 5-Year Equity Return Simulation ($500K @ $4.5M Cap = 11.11% ownership)
  const monteCarloStats = useMemo(() => {
    const invUsd = investorCalculatorState.investmentK * 1000;
    const ownership = invUsd / 4_500_000;
    const baseY5EbitdaUsd =
      investorCalculatorState.scenario === 'upside' ? 2_480_000 : 1_872_000;
    const stressFactor = bearCaseEnabled ? 0.72 : 1.0;
    const meanMultiple = investorCalculatorState.exitMultiple;

    const seed =
      (bearCaseEnabled ? 913 : 317) +
      (investorCalculatorState.scenario === 'upside' ? 77 : 19) +
      Math.round(meanMultiple * 10);
    const rand = mulberry32(seed);

    const samples: number[] = [];
    for (let i = 0; i < 1500; i += 1) {
      // Box-Muller normal variate
      const u1 = Math.max(1e-6, rand());
      const u2 = rand();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const y5Ebitda = Math.max(
        650_000,
        baseY5EbitdaUsd * stressFactor * Math.exp(0.18 * z - 0.016),
      );
      const u3 = Math.max(1e-6, rand());
      const u4 = rand();
      const z2 = Math.sqrt(-2 * Math.log(u3)) * Math.cos(2 * Math.PI * u4);
      const mult = Math.max(6, Math.min(20, meanMultiple + z2 * 1.75));
      const exitValUsd = y5Ebitda * mult * ownership;
      samples.push(exitValUsd);
    }
    samples.sort((a, b) => a - b);

    const alpha = (100 - confidenceLevelPct) / 200;
    const ciLowUsd = d3.quantileSorted(samples, alpha) ?? samples[0];
    const ciHighUsd = d3.quantileSorted(samples, 1 - alpha) ?? samples[samples.length - 1];
    const p10Usd = d3.quantileSorted(samples, 0.1) ?? samples[0];
    const p50Usd = d3.quantileSorted(samples, 0.5) ?? samples[Math.floor(samples.length / 2)];
    const p90Usd = d3.quantileSorted(samples, 0.9) ?? samples[samples.length - 1];

    return {
      samples,
      invUsd,
      ciLowUsd,
      ciHighUsd,
      p10Usd,
      p50Usd,
      p90Usd,
      medianMoic: p50Usd / invUsd,
    };
  }, [
    investorCalculatorState.investmentK,
    investorCalculatorState.scenario,
    investorCalculatorState.exitMultiple,
    bearCaseEnabled,
    confidenceLevelPct,
  ]);

  // Render D3 Monte Carlo Histogram
  useEffect(() => {
    const svgEl = monteCarloSvgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const width = 580;
    const height = 220;
    const margin = { top: 20, right: 20, bottom: 32, left: 44 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const { samples, ciLowUsd, ciHighUsd, p50Usd } = monteCarloStats;
    const minX = Math.min(...samples);
    const maxX = Math.max(...samples);

    const x = d3.scaleLinear().domain([minX, maxX]).nice().range([0, innerW]);
    const bins = d3.bin().domain(x.domain() as [number, number]).thresholds(24)(samples);
    const maxCount = d3.max(bins, (b) => b.length) ?? 1;
    const y = d3.scaleLinear().domain([0, maxCount]).nice().range([innerH, 0]);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const axisInk = isDark ? '#8E96B0' : '#5F6576';
    const gridInk = isDark ? '#232B4A' : '#E4DFD6';
    const inBandFill = isDark ? '#6FCB9F' : '#1C6E46';
    const outBandFill = isDark ? '#334155' : '#CBD5E1';

    // Confidence Interval Band Shaded Backdrop
    g.append('rect')
      .attr('x', x(ciLowUsd))
      .attr('width', Math.max(2, x(ciHighUsd) - x(ciLowUsd)))
      .attr('y', 0)
      .attr('height', innerH)
      .attr('fill', isDark ? 'rgba(111, 203, 159, 0.08)' : 'rgba(28, 110, 70, 0.07)');

    // Horizontal Grid Lines
    y.ticks(4).forEach((t) => {
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerW)
        .attr('y1', y(t))
        .attr('y2', y(t))
        .attr('stroke', gridInk)
        .attr('stroke-dasharray', '3,3');
    });

    // Histogram Bars
    g.selectAll('rect.mc-bar')
      .data(bins)
      .enter()
      .append('rect')
      .attr('class', 'mc-bar')
      .attr('x', (d) => x(d.x0 ?? 0) + 1)
      .attr('y', (d) => y(d.length))
      .attr('width', (d) => Math.max(1, x(d.x1 ?? 0) - x(d.x0 ?? 0) - 2))
      .attr('height', (d) => Math.max(0, innerH - y(d.length)))
      .attr('rx', 2)
      .attr('fill', (d) => {
        const mid = ((d.x0 ?? 0) + (d.x1 ?? 0)) / 2;
        return mid >= ciLowUsd && mid <= ciHighUsd ? inBandFill : outBandFill;
      });

    // Median P50 Line
    g.append('line')
      .attr('x1', x(p50Usd))
      .attr('x2', x(p50Usd))
      .attr('y1', 0)
      .attr('y2', innerH)
      .attr('stroke', isDark ? '#8FA6E8' : '#1F3863')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,3');

    g.append('text')
      .attr('x', Math.min(innerW - 60, x(p50Usd) + 6))
      .attr('y', 12)
      .attr('fill', isDark ? '#8FA6E8' : '#1F3863')
      .attr('font-size', '10px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-weight', '600')
      .text(`P50 ${formatSsotCurrency(p50Usd, currency, fxRate, { compact: true })}`);

    // X Axis
    const xAxis = d3
      .axisBottom(x)
      .ticks(5)
      .tickFormat((val) => formatSsotCurrency(Number(val), currency, fxRate, { compact: true }));
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(xAxis)
      .call((ax) => ax.selectAll('path, line').attr('stroke', gridInk))
      .call((ax) =>
        ax
          .selectAll('text')
          .attr('fill', axisInk)
          .attr('font-size', '10px')
          .attr('font-family', 'JetBrains Mono, monospace'),
      );

    // Y Axis
    const yAxis = d3.axisLeft(y).ticks(4);
    g.append('g')
      .call(yAxis)
      .call((ax) => ax.selectAll('path, line').attr('stroke', gridInk))
      .call((ax) =>
        ax
          .selectAll('text')
          .attr('fill', axisInk)
          .attr('font-size', '10px')
          .attr('font-family', 'JetBrains Mono, monospace'),
      );
  }, [monteCarloStats, isDark, currency, fxRate]);

  // ROI Scenario Comparator Data
  const scenarioComparatorRows = useMemo(() => {
    const invUsd = investorCalculatorState.investmentK * 1000;
    const ownership = invUsd / 4_500_000;
    return [
      {
        name: 'Bear Stress Test',
        haircut: '0.42x Blended · +20% CAC',
        y5RevUsd: 4_210_000,
        y5EbitdaUsd: 1_348_000,
        exitEvUsd: 13_480_000,
        investorReturnUsd: 13_480_000 * ownership,
        moic: (13_480_000 * ownership) / invUsd,
      },
      {
        name: 'Conservative Floor (Base)',
        haircut: '0.5825x Blended Haircut',
        y5RevUsd: 5_850_000,
        y5EbitdaUsd: 1_872_000,
        exitEvUsd: 18_720_000,
        investorReturnUsd: 18_720_000 * ownership,
        moic: (18_720_000 * ownership) / invUsd,
      },
      {
        name: 'Growth Upside (15x Y5)',
        haircut: '1.12x Mix · 15x EBITDA',
        y5RevUsd: 7_450_000,
        y5EbitdaUsd: 2_480_000,
        exitEvUsd: 37_200_000,
        investorReturnUsd: 37_200_000 * ownership,
        moic: (37_200_000 * ownership) / invUsd,
      },
    ];
  }, [investorCalculatorState.investmentK]);

  // 5x5 Sensitivity Heatmap (Exit Multiple x Y5 EBITDA)
  const heatmapMultiples = [8, 10, 12, 15, 18];
  const heatmapEbitdaM = [1.4, 1.65, 1.87, 2.2, 2.6];

  const handleGenerateAiSummary = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch('/api/financial-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currency,
          fxRate,
          scenario: investorCalculatorState.scenario,
          bearCase: bearCaseEnabled,
          investmentUsd: investorCalculatorState.investmentK * 1000,
          exitMultiple: investorCalculatorState.exitMultiple,
          horizonYears: investorCalculatorState.horizonYears,
          persona: personaTrack,
          selectedTierCode: selectedTier.code,
          selectedTierName: selectedTier.name,
          netMarginPct: adjustedTierMetrics.netMarginPct,
          monteCarloP10Usd: monteCarloStats.p10Usd,
          monteCarloP50Usd: monteCarloStats.p50Usd,
          monteCarloP90Usd: monteCarloStats.p90Usd,
          confidenceLevelPct,
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || `HTTP ${res.status}`);
      }
      setAiSummary(payload as AiSummaryResult);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Unable to reach /api/financial-summary.';
      setAiError(msg);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <section
      id="ssot-unit-economics"
      className={`scroll-mt-24 space-y-6 rounded-2xl p-1 ${
        pulsedSectionId === 'ssot-unit-economics' ? 'animate-section-header-pulse' : ''
      }`}
    >
      {/* Chapter Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 pb-4 border-b border-[#E4DFD6] dark:border-[#232B4A]">
        <div className="space-y-1">
          <div className="text-xs font-mono text-[#5F6576] dark:text-[#8E96B0]">
            <span>Chapter {chapter.num}</span>
            {chapter.recommendedFor.includes(personaTrack) && (
              <>
                <span aria-hidden="true"> · </span>
                <span className="text-[#1C6E46] dark:text-[#6FCB9F] font-semibold">
                  Priority for {activePersonaSpec.label}
                </span>
              </>
            )}
          </div>
          <h2 className="font-display-ssot text-xl sm:text-2xl font-bold text-[#16213A] dark:text-[#E7EBF5] tracking-tight text-balance">
            {chapter.title}
          </h2>
          <p className="text-sm text-[#5F6576] dark:text-[#8E96B0] max-w-3xl">
            9-tier unit economics waterfall, downside bear-case stress testing, D3.js 5-year Monte Carlo return distribution, scenario comparator, and live Gemini executive synthesis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => navigateToItem('Financials')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1C6E46] hover:bg-[#145334] dark:bg-[#6FCB9F] dark:hover:bg-[#8ADBB4] text-white dark:text-[#0B1020] text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            <span>Open Full 5-Yr Calculator</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => openIntelligenceModal(chapter.title)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] hover:border-[#1F3863] text-xs font-medium text-[#16213A] dark:text-[#E7EBF5] cursor-pointer whitespace-nowrap"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            <span>{noteCount > 0 ? `Notes (${noteCount})` : 'Add Note'}</span>
          </button>
        </div>
      </div>

      {/* InvestmentRisksOverlay (Bear-Case Sensitivity Toggle) & Currency Controls */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={bearCaseEnabled}
            onClick={() => setBearCaseEnabled(!bearCaseEnabled)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
              bearCaseEnabled
                ? 'bg-[#B45309]/12 border-[#B45309] text-[#B45309] dark:text-[#F59E0B]'
                : 'bg-[#FAF8F4] dark:bg-[#0F1529] border-[#E4DFD6] dark:border-[#232B4A] text-[#16213A] dark:text-[#E7EBF5]'
            }`}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              {bearCaseEnabled
                ? 'Bear-Case Stress Active (+20% CAC · -15% Realization)'
                : 'Enable Bear-Case Sensitivity Overlay'}
            </span>
          </button>
          <span className="text-xs text-[#5F6576] dark:text-[#8E96B0]">
            {bearCaseEnabled
              ? 'Waterfall & Monte Carlo percentiles reflect stressed realization and slower ramp.'
              : 'Showing reconciled baseline unit economics & Monte Carlo distribution.'}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0]">
            {currency} · 1 USD = {fxRate.toFixed(2)} BDT
          </span>
          <div className="inline-flex rounded-lg bg-[#F2EFE9] dark:bg-[#0F1529] p-0.5 border border-[#E4DFD6] dark:border-[#232B4A]">
            {(['USD', 'BDT'] as const).map((cur) => (
              <button
                key={cur}
                type="button"
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

      {/* Category Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap rounded-lg bg-[#F2EFE9] dark:bg-[#0F1529] p-1 border border-[#E4DFD6] dark:border-[#232B4A]">
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
      </div>

      {/* 9-Tier Table + Waterfall Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F4] dark:bg-[#0F1529] border-b border-[#E4DFD6] dark:border-[#232B4A] text-[#5F6576] dark:text-[#8E96B0]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Tier</th>
                  <th className="px-4 py-3 font-semibold text-right">Ticket</th>
                  <th className="px-4 py-3 font-semibold text-right">Gross Margin</th>
                  <th className="px-4 py-3 font-semibold text-right">Net Margin</th>
                  <th className="px-4 py-3 font-semibold text-right">Timeline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4DFD6] dark:divide-[#232B4A]">
                {filteredTiers.map((tier) => {
                  const active = tier.id === selectedTier.id;
                  const rowTicket = bearCaseEnabled
                    ? Math.round(tier.baselineUsd * 0.85)
                    : tier.baselineUsd;
                  const rowNetPct = bearCaseEnabled
                    ? Math.max(8, tier.netMarginPercent - 9.4)
                    : tier.netMarginPercent;
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
                        {formatSsotCurrency(rowTicket, currency, fxRate, { compact: true })}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-[#16213A] dark:text-[#E7EBF5]">
                        {tier.grossMarginPercent.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-[#1C6E46] dark:text-[#6FCB9F]">
                        {rowNetPct.toFixed(1)}%
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
              <BarChart
                data={adjustedTierMetrics.waterfall}
                margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
              >
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
                  {adjustedTierMetrics.waterfall.map((entry) => (
                    <Cell key={entry.label} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 border-t border-[#E4DFD6] dark:border-[#232B4A] flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0]">
              Net Margin: {adjustedTierMetrics.netMarginPct.toFixed(1)}% (
              {formatSsotCurrency(adjustedTierMetrics.netUsd, currency, fxRate, { compact: true })})
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

      {/* D3.js MonteCarloSimulation + Confidence Interval Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 p-5 rounded-2xl bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-mono text-[#1F3863] dark:text-[#8FA6E8] font-semibold">
                MonteCarloSimulation · 1,500 Trials (D3.js)
              </div>
              <h3 className="text-base font-bold text-[#16213A] dark:text-[#E7EBF5]">
                5-Year SAFE Equity Exit Probability Histogram
              </h3>
            </div>
            <div
              role="group"
              aria-label="Monte Carlo Confidence Interval"
              className="inline-flex rounded-lg bg-[#F2EFE9] dark:bg-[#0F1529] p-1 border border-[#E4DFD6] dark:border-[#232B4A]"
            >
              {([90, 95, 99] as ConfidenceLevelPct[]).map((pct) => (
                <button
                  key={pct}
                  type="button"
                  aria-pressed={confidenceLevelPct === pct}
                  onClick={() => setConfidenceLevelPct(pct)}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-semibold cursor-pointer ${
                    confidenceLevelPct === pct
                      ? 'bg-[#1C6E46] text-white dark:bg-[#6FCB9F] dark:text-[#0B1020]'
                      : 'text-[#5F6576] dark:text-[#8E96B0]'
                  }`}
                >
                  {pct}% CI
                </button>
              ))}
            </div>
          </div>

          <svg
            ref={monteCarloSvgRef}
            viewBox="0 0 580 220"
            className="w-full h-56 overflow-visible"
            role="img"
            aria-label="5-Year Monte Carlo Equity Value Probability Histogram"
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-[#E4DFD6] dark:border-[#232B4A]">
            <div className="p-2.5 rounded-lg bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A]">
              <div className="text-[11px] text-[#5F6576] dark:text-[#8E96B0]">P10 Downside</div>
              <div className="text-sm font-bold font-mono tabular-nums text-[#16213A] dark:text-[#E7EBF5]">
                {formatSsotCurrency(monteCarloStats.p10Usd, currency, fxRate, { compact: true })}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A]">
              <div className="text-[11px] text-[#5F6576] dark:text-[#8E96B0]">Median P50</div>
              <div className="text-sm font-bold font-mono tabular-nums text-[#1C6E46] dark:text-[#6FCB9F]">
                {formatSsotCurrency(monteCarloStats.p50Usd, currency, fxRate, { compact: true })}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A]">
              <div className="text-[11px] text-[#5F6576] dark:text-[#8E96B0]">P90 Upside</div>
              <div className="text-sm font-bold font-mono tabular-nums text-[#1F3863] dark:text-[#8FA6E8]">
                {formatSsotCurrency(monteCarloStats.p90Usd, currency, fxRate, { compact: true })}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A]">
              <div className="text-[11px] text-[#5F6576] dark:text-[#8E96B0]">
                {confidenceLevelPct}% CI Band
              </div>
              <div className="text-xs font-bold font-mono tabular-nums text-[#16213A] dark:text-[#E7EBF5] mt-0.5">
                {monteCarloStats.medianMoic.toFixed(2)}x Med. MOIC
              </div>
            </div>
          </div>
        </div>

        {/* RoiSensitivityHeatmap (5x5 Exit Multiple x Y5 EBITDA) */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] space-y-4">
          <div>
            <div className="text-xs font-mono text-[#1F3863] dark:text-[#8FA6E8] font-semibold">
              RoiSensitivityHeatmap
            </div>
            <h3 className="text-base font-bold text-[#16213A] dark:text-[#E7EBF5]">
              SAFE Investor Return Matrix (Y5 EBITDA × Exit Multiple)
            </h3>
            <p className="text-xs text-[#5F6576] dark:text-[#8E96B0] mt-0.5">
              Modeled on {formatSsotCurrency(investorCalculatorState.investmentK * 1000, currency, fxRate, { compact: true })} check @ $4.5M Post-Money Cap
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center text-[11px] font-mono tabular-nums border-collapse">
              <thead>
                <tr className="text-[#5F6576] dark:text-[#8E96B0]">
                  <th className="p-1.5 text-left">EBITDA \ Mult</th>
                  {heatmapMultiples.map((m) => (
                    <th key={m} className="p-1.5 font-semibold">
                      {m}x
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapEbitdaM.map((ebitdaM) => (
                  <tr key={ebitdaM}>
                    <td className="p-1.5 text-left font-semibold text-[#16213A] dark:text-[#E7EBF5] whitespace-nowrap">
                      {formatSsotCurrency(ebitdaM * 1_000_000, currency, fxRate, { compact: true })}
                    </td>
                    {heatmapMultiples.map((mult) => {
                      const invUsd = investorCalculatorState.investmentK * 1000;
                      const valUsd =
                        ebitdaM *
                        1_000_000 *
                        mult *
                        (invUsd / 4_500_000) *
                        (bearCaseEnabled ? 0.72 : 1);
                      const moic = valUsd / invUsd;
                      const tierCls =
                        moic >= 6.5
                          ? 'bg-[#1C6E46] text-white dark:bg-[#6FCB9F] dark:text-[#0B1020]'
                          : moic >= 4.0
                            ? 'bg-[#1C6E46]/18 text-[#16213A] dark:bg-[#6FCB9F]/22 dark:text-[#E7EBF5]'
                            : 'bg-[#F2EFE9] text-[#16213A] dark:bg-[#0F1529] dark:text-[#C8D0E4]';
                      return (
                        <td
                          key={mult}
                          className={`p-1.5 border border-white dark:border-[#141A32] rounded ${tierCls}`}
                          title={`${formatSsotCurrency(valUsd, currency, fxRate)} (${moic.toFixed(1)}x)`}
                        >
                          {moic.toFixed(1)}x
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* RoiScenarioComparator */}
      <div className="rounded-2xl bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E4DFD6] dark:border-[#232B4A] flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-[#1F3863] dark:text-[#8FA6E8] font-semibold">
              RoiScenarioComparator
            </div>
            <h3 className="text-sm font-bold text-[#16213A] dark:text-[#E7EBF5]">
              Side-by-Side 5-Year Capital Return Scenarios
            </h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F4] dark:bg-[#0F1529] border-b border-[#E4DFD6] dark:border-[#232B4A] text-[#5F6576] dark:text-[#8E96B0]">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Scenario</th>
                <th className="px-4 py-2.5 font-semibold">Calibration</th>
                <th className="px-4 py-2.5 font-semibold text-right">FY31 Revenue</th>
                <th className="px-4 py-2.5 font-semibold text-right">FY31 EBITDA</th>
                <th className="px-4 py-2.5 font-semibold text-right">Exit EV</th>
                <th className="px-4 py-2.5 font-semibold text-right">Investor Equity</th>
                <th className="px-4 py-2.5 font-semibold text-right">MOIC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4DFD6] dark:divide-[#232B4A]">
              {scenarioComparatorRows.map((row) => (
                <tr key={row.name}>
                  <td className="px-4 py-3 font-semibold text-[#16213A] dark:text-[#E7EBF5]">
                    {row.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-[#5F6576] dark:text-[#8E96B0]">
                    {row.haircut}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {formatSsotCurrency(row.y5RevUsd, currency, fxRate, { compact: true })}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {formatSsotCurrency(row.y5EbitdaUsd, currency, fxRate, { compact: true })}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {formatSsotCurrency(row.exitEvUsd, currency, fxRate, { compact: true })}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-[#1C6E46] dark:text-[#6FCB9F]">
                    {formatSsotCurrency(row.investorReturnUsd, currency, fxRate, { compact: true })}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-[#1F3863] dark:text-[#8FA6E8]">
                    {row.moic.toFixed(2)}x
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FinancialSummaryGenerator (POST /api/financial-summary) */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-mono text-[#1F3863] dark:text-[#8FA6E8] font-semibold">
              FinancialSummaryGenerator · Server-Side Gemini Synthesis
            </div>
            <h3 className="text-base font-bold text-[#16213A] dark:text-[#E7EBF5]">
              Generate Institutional IC Diligence Memo from Active Parameters
            </h3>
            <p className="text-xs text-[#5F6576] dark:text-[#8E96B0] mt-0.5">
              Synthesizes {currency} financials, {selectedTier.code}, {confidenceLevelPct}% Monte Carlo CI, and {bearCaseEnabled ? 'Bear Stress' : 'Baseline'} sensitivity via /api/financial-summary.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {aiSummary && (
              <button
                type="button"
                onClick={async () => {
                  const text = [
                    aiSummary.summary,
                    '',
                    'Thesis:',
                    ...aiSummary.thesisBullets.map((b) => `- ${b}`),
                    '',
                    'Risk Mitigants:',
                    ...aiSummary.riskMitigants.map((r) => `- ${r}`),
                  ].join('\n');
                  await copyTextWithFallback(text);
                  setCopiedSummary(true);
                  window.setTimeout(() => setCopiedSummary(false), 2000);
                }}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] text-xs font-medium text-[#16213A] dark:text-[#E7EBF5] cursor-pointer"
              >
                {copiedSummary ? <Check className="w-3.5 h-3.5 text-[#1C6E46]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSummary ? 'Copied' : 'Copy Memo'}</span>
              </button>
            )}
            <button
              type="button"
              disabled={aiLoading}
              onClick={() => void handleGenerateAiSummary()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1F3863] hover:bg-[#162848] dark:bg-[#8FA6E8] dark:hover:bg-[#A6B9F0] text-white dark:text-[#0B1020] text-xs font-semibold cursor-pointer whitespace-nowrap disabled:opacity-60"
            >
              {aiLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{aiLoading ? 'Synthesizing…' : 'Generate AI Financial Memo'}</span>
            </button>
          </div>
        </div>

        {aiError && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/35 text-xs text-amber-800 dark:text-amber-300">
            {aiError}
          </div>
        )}

        {aiSummary && (
          <div className="p-4 rounded-xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] space-y-3">
            <p className="text-sm text-[#16213A] dark:text-[#E7EBF5] leading-relaxed">
              {aiSummary.summary}
            </p>
            {aiSummary.thesisBullets.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-mono font-semibold text-[#1C6E46] dark:text-[#6FCB9F]">
                  Key Investment Highlights
                </div>
                <ul className="space-y-1 text-xs text-[#5F6576] dark:text-[#8E96B0]">
                  {aiSummary.thesisBullets.map((b, i) => (
                    <li key={i}>· {b}</li>
                  ))}
                </ul>
              </div>
            )}
            {aiSummary.riskMitigants.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-mono font-semibold text-[#1F3863] dark:text-[#8FA6E8]">
                  Structural Downside Protection
                </div>
                <ul className="space-y-1 text-xs text-[#5F6576] dark:text-[#8E96B0]">
                  {aiSummary.riskMitigants.map((r, i) => (
                    <li key={i}>· {r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
