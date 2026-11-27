import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  Copy,
  Download,
  Layers,
  Loader2,
  MessageSquarePlus,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
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
import { INSTITUTIONAL_EASE } from './SectionReveal';

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
    updateInvestorCalculatorState,
    investorFeedback,
    openIntelligenceModal,
    loadCaseStudyStack,
    navigateToItem,
    setAutoNotice,
  } = useStack();
  const {
    bearCaseEnabled,
    setBearCaseEnabled,
    confidenceLevelPct,
    setConfidenceLevelPct,
    pulsedSectionId,
    highlightedSectionId,
    anomalyDrawerOpen,
    setAnomalyDrawerOpen,
  } = useSsotBriefing();

  const [tierCategory, setTierCategory] = useState<'All' | 'A' | 'B' | 'C'>('All');
  const [selectedTierId, setSelectedTierId] = useState<string>(NINE_TIER_UNIT_ECONOMICS[6].id);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<AiSummaryResult | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<'csv' | 'json' | null>(null);

  const monteCarloSvgRef = useRef<SVGSVGElement | null>(null);
  const areaChartSvgRef = useRef<SVGSVGElement | null>(null);

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

  // 5-Year Cumulative Equity Value Projection driven by interactive sensitivity sliders
  const trajectorySeries = useMemo(() => {
    const invUsd = investorCalculatorState.investmentK * 1000;
    const ownership = invUsd / 4_500_000;
    const multiple = investorCalculatorState.exitMultiple;
    const horizon = investorCalculatorState.horizonYears;
    const stressFactor = bearCaseEnabled ? 0.72 : 1.0;
    const baseAnnualEbitda =
      investorCalculatorState.scenario === 'upside'
        ? [180_000, 520_000, 1_040_000, 1_720_000, 2_480_000]
        : [140_000, 390_000, 790_000, 1_310_000, 1_872_000];

    const points: Array<{
      year: number;
      label: string;
      equityUsd: number;
      baselineUsd: number;
      moic: number;
    }> = [
      {
        year: 0,
        label: 'Seed',
        equityUsd: invUsd,
        baselineUsd: invUsd,
        moic: 1.0,
      },
    ];

    for (let y = 1; y <= horizon; y += 1) {
      const ebitda = baseAnnualEbitda[Math.min(y - 1, baseAnnualEbitda.length - 1)] * stressFactor;
      const ev = Math.max(4_500_000, ebitda * multiple);
      const equityUsd = ev * ownership;
      const baselineEv = Math.max(
        4_500_000,
        baseAnnualEbitda[Math.min(y - 1, baseAnnualEbitda.length - 1)] * 10,
      );
      points.push({
        year: y,
        label: `FY${26 + y}`,
        equityUsd,
        baselineUsd: baselineEv * ownership,
        moic: equityUsd / invUsd,
      });
    }
    return points;
  }, [
    investorCalculatorState.investmentK,
    investorCalculatorState.exitMultiple,
    investorCalculatorState.horizonYears,
    investorCalculatorState.scenario,
    bearCaseEnabled,
  ]);

  // D3.js Cumulative Equity Area Chart for Sensitivity Sliders
  useEffect(() => {
    const svgEl = areaChartSvgRef.current;
    if (!svgEl) return;
    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const width = 560;
    const height = 185;
    const margin = { top: 16, right: 20, bottom: 28, left: 54 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const maxY = Math.max(
      ...trajectorySeries.map((d) => Math.max(d.equityUsd, d.baselineUsd)),
      1,
    );
    const x = d3
      .scalePoint<string>()
      .domain(trajectorySeries.map((d) => d.label))
      .range([0, innerW]);
    const y = d3.scaleLinear().domain([0, maxY * 1.12]).nice().range([innerH, 0]);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const defs = svg.append('defs');
    const grad = defs
      .append('linearGradient')
      .attr('id', 'ssot-equity-area-grad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    grad
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', bearCaseEnabled ? '#F59E0B' : isDark ? '#22D3EE' : '#0891B2')
      .attr('stop-opacity', 0.36);
    grad
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', bearCaseEnabled ? '#F59E0B' : isDark ? '#22D3EE' : '#0891B2')
      .attr('stop-opacity', 0.02);

    const gridInk = isDark ? 'rgba(51, 65, 85, 0.45)' : 'rgba(148, 163, 184, 0.35)';
    const axisInk = isDark ? '#94A3B8' : '#64748B';
    const strokeInk = bearCaseEnabled ? '#F59E0B' : isDark ? '#22D3EE' : '#0891B2';

    y.ticks(4).forEach((t) => {
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerW)
        .attr('y1', y(t))
        .attr('y2', y(t))
        .attr('stroke', gridInk)
        .attr('stroke-dasharray', '3,3');
    });

    const areaGen = d3
      .area<(typeof trajectorySeries)[0]>()
      .x((d) => x(d.label) ?? 0)
      .y0(innerH)
      .y1((d) => y(d.equityUsd))
      .curve(d3.curveMonotoneX);

    const lineGen = d3
      .line<(typeof trajectorySeries)[0]>()
      .x((d) => x(d.label) ?? 0)
      .y((d) => y(d.equityUsd))
      .curve(d3.curveMonotoneX);

    const baseLineGen = d3
      .line<(typeof trajectorySeries)[0]>()
      .x((d) => x(d.label) ?? 0)
      .y((d) => y(d.baselineUsd))
      .curve(d3.curveMonotoneX);

    g.append('path').datum(trajectorySeries).attr('d', areaGen).attr('fill', 'url(#ssot-equity-area-grad)');
    g.append('path')
      .datum(trajectorySeries)
      .attr('d', baseLineGen)
      .attr('fill', 'none')
      .attr('stroke', axisInk)
      .attr('stroke-width', 1.25)
      .attr('stroke-dasharray', '4,4');
    g.append('path')
      .datum(trajectorySeries)
      .attr('d', lineGen)
      .attr('fill', 'none')
      .attr('stroke', strokeInk)
      .attr('stroke-width', 2.4);

    g.selectAll('circle.eq-dot')
      .data(trajectorySeries)
      .enter()
      .append('circle')
      .attr('cx', (d) => x(d.label) ?? 0)
      .attr('cy', (d) => y(d.equityUsd))
      .attr('r', 3.5)
      .attr('fill', strokeInk)
      .attr('stroke', isDark ? '#05070B' : '#FFFFFF')
      .attr('stroke-width', 1.5);

    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x))
      .call((ax) => ax.selectAll('path, line').attr('stroke', gridInk))
      .call((ax) =>
        ax
          .selectAll('text')
          .attr('fill', axisInk)
          .attr('font-size', '10px')
          .attr('font-family', 'JetBrains Mono, monospace'),
      );

    g.append('g')
      .call(
        d3
          .axisLeft(y)
          .ticks(4)
          .tickFormat((val) => formatSsotCurrency(Number(val), currency, fxRate, { compact: true })),
      )
      .call((ax) => ax.selectAll('path, line').attr('stroke', gridInk))
      .call((ax) =>
        ax
          .selectAll('text')
          .attr('fill', axisInk)
          .attr('font-size', '10px')
          .attr('font-family', 'JetBrains Mono, monospace'),
      );
  }, [trajectorySeries, isDark, currency, fxRate, bearCaseEnabled]);

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

    const axisInk = isDark ? '#94A3B8' : '#64748B';
    const gridInk = isDark ? 'rgba(51, 65, 85, 0.45)' : 'rgba(148, 163, 184, 0.35)';
    const inBandFill = isDark ? '#34D399' : '#059669';
    const outBandFill = isDark ? '#334155' : '#CBD5E1';

    g.append('rect')
      .attr('x', x(ciLowUsd))
      .attr('width', Math.max(2, x(ciHighUsd) - x(ciLowUsd)))
      .attr('y', 0)
      .attr('height', innerH)
      .attr('fill', isDark ? 'rgba(52, 211, 153, 0.08)' : 'rgba(5, 150, 105, 0.08)');

    y.ticks(4).forEach((t) => {
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerW)
        .attr('y1', y(t))
        .attr('y2', y(t))
        .attr('stroke', gridInk)
        .attr('stroke-dasharray', '3,3');
    });

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

    g.append('line')
      .attr('x1', x(p50Usd))
      .attr('x2', x(p50Usd))
      .attr('y1', 0)
      .attr('y2', innerH)
      .attr('stroke', isDark ? '#22D3EE' : '#0891B2')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,3');

    g.append('text')
      .attr('x', Math.min(innerW - 60, x(p50Usd) + 6))
      .attr('y', 12)
      .attr('fill', isDark ? '#22D3EE' : '#0891B2')
      .attr('font-size', '10px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-weight', '600')
      .text(`P50 ${formatSsotCurrency(p50Usd, currency, fxRate, { compact: true })}`);

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

  const handleExportReport = async (format: 'csv' | 'json') => {
    if (exportingFormat) return;
    setExportingFormat(format);
    try {
      await new Promise((r) => window.setTimeout(r, 260));
      let content = '';
      let mime = 'application/json;charset=utf-8';
      let ext = 'json';

      if (format === 'csv') {
        ext = 'csv';
        mime = 'text/csv;charset=utf-8';
        const header = 'TierCode,Category,Name,TicketUSD,GrossMarginPct,NetMarginPct,DeliveryTimeline';
        const rows = NINE_TIER_UNIT_ECONOMICS.map(
          (t) =>
            `${t.code},${t.category},"${t.name}",${t.baselineUsd},${t.grossMarginPercent},${t.netMarginPercent},"${t.deliveryTimeline}"`,
        );
        content = [header, ...rows].join('\n');
      } else {
        content = JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            currency,
            fxRate,
            bearCaseEnabled,
            confidenceLevelPct,
            calculatorState: investorCalculatorState,
            monteCarloStats: {
              p10Usd: monteCarloStats.p10Usd,
              p50Usd: monteCarloStats.p50Usd,
              p90Usd: monteCarloStats.p90Usd,
              medianMoic: Number(monteCarloStats.medianMoic.toFixed(2)),
            },
            tiers: NINE_TIER_UNIT_ECONOMICS,
          },
          null,
          2,
        );
      }

      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `spenta-unit-economics-${investorCalculatorState.scenario}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setAutoNotice(`Downloaded ${format.toUpperCase()} Unit Economics Model`);
    } finally {
      setExportingFormat(null);
    }
  };

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

  const finalTrajectoryPoint = trajectorySeries[trajectorySeries.length - 1];
  const isHighlighted = highlightedSectionId === 'ssot-unit-economics';

  return (
    <>
      <section
        id="ssot-unit-economics"
        className={`relative ssot-band-alt scroll-mt-24 rounded-3xl p-4 sm:p-6 space-y-6 overflow-hidden transition-all duration-300 ${
          isHighlighted ? 'ring-2 ring-cyan-500/60 shadow-[0_0_28px_rgba(8,145,178,0.16)]' : ''
        } ${pulsedSectionId === 'ssot-unit-economics' ? 'animate-section-header-pulse' : ''}`}
      >
        {/* Ambient Background Glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[540px] h-[220px] rounded-full bg-cyan-500/10 dark:bg-cyan-400/10 blur-[100px]"
        />

        {/* Chapter Header */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
              <span>Chapter {chapter.num}</span>
              {chapter.recommendedFor.includes(personaTrack) && (
                <>
                  <span aria-hidden="true"> · </span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                    Priority for {activePersonaSpec.label}
                  </span>
                </>
              )}
            </div>
            <h2 className="font-display-ssot text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight text-balance">
              {chapter.title}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-3xl">
              9-tier unit economics waterfall, downside bear-case stress testing, interactive ROI sensitivity sliders, D3.js 5-year Monte Carlo simulation, and live Gemini executive synthesis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 ssot-no-print">
            <button
              type="button"
              onClick={() => setAnomalyDrawerOpen(true)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                bearCaseEnabled
                  ? 'border-amber-500/50 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:border-cyan-500'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Risk &amp; Anomaly Watch</span>
            </button>
            <button
              type="button"
              onClick={() => navigateToItem('Financials')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              <span>Open Full 5-Yr Calculator</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => openIntelligenceModal(chapter.title)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-cyan-500 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer whitespace-nowrap"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              <span>{noteCount > 0 ? `Notes (${noteCount})` : 'Add Note'}</span>
            </button>
          </div>
        </div>

        {/* Controls Bar: Bear-Case Sensitivity, Scenario Mode, Exports & Currency */}
        <div className="relative z-10 p-4 rounded-2xl bg-white/95 dark:bg-slate-950/85 border border-slate-200 dark:border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={bearCaseEnabled}
              onClick={() => setBearCaseEnabled(!bearCaseEnabled)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                bearCaseEnabled
                  ? 'bg-amber-500/12 border-amber-500 text-amber-800 dark:text-amber-300'
                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                {bearCaseEnabled
                  ? 'Bear-Case Stress Active (+20% CAC · -15% Realization)'
                  : 'Enable Bear-Case Sensitivity Overlay'}
              </span>
            </button>

            {/* Scenario Mode Toggle */}
            <div
              role="group"
              aria-label="Growth Scenario"
              className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-900 p-0.5 border border-slate-200 dark:border-slate-800"
            >
              {(['conservative', 'upside'] as const).map((sc) => (
                <button
                  key={sc}
                  type="button"
                  onClick={() =>
                    updateInvestorCalculatorState({
                      scenario: sc,
                      growthMode: sc === 'upside' ? 'aggressive' : 'conservative',
                    })
                  }
                  className={`px-3 py-1.5 rounded-md text-xs font-mono font-semibold capitalize cursor-pointer transition-colors ${
                    investorCalculatorState.scenario === sc
                      ? 'bg-cyan-600 text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {sc}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 ssot-no-print">
            <button
              type="button"
              disabled={Boolean(exportingFormat)}
              onClick={() => void handleExportReport('csv')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 hover:border-cyan-500 cursor-pointer disabled:opacity-60"
            >
              {exportingFormat === 'csv' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>CSV</span>
            </button>
            <button
              type="button"
              disabled={Boolean(exportingFormat)}
              onClick={() => void handleExportReport('json')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 hover:border-cyan-500 cursor-pointer disabled:opacity-60"
            >
              {exportingFormat === 'json' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>JSON</span>
            </button>

            <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {currency} · {fxRate.toFixed(2)}
            </span>
            <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-900 p-0.5 border border-slate-200 dark:border-slate-800">
              {(['USD', 'BDT'] as const).map((cur) => (
                <button
                  key={cur}
                  type="button"
                  onClick={() => setCurrency(cur)}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-semibold cursor-pointer ${
                    currency === cur
                      ? 'bg-cyan-600 text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {cur}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex flex-wrap rounded-lg bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800">
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
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 9-Tier Table + Waterfall Chart */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Tier</th>
                    <th className="px-4 py-3 font-semibold text-right">Ticket</th>
                    <th className="px-4 py-3 font-semibold text-right">Gross Margin</th>
                    <th className="px-4 py-3 font-semibold text-right">Net Margin</th>
                    <th className="px-4 py-3 font-semibold text-right">Timeline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
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
                            ? 'bg-cyan-50/75 dark:bg-cyan-950/35'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-900/60'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-mono font-semibold text-cyan-700 dark:text-cyan-400">
                            {tier.code}
                          </div>
                          <div className="text-slate-900 dark:text-slate-100 font-medium">
                            {tier.name}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                          {formatSsotCurrency(rowTicket, currency, fxRate, { compact: true })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                          {tier.grossMarginPercent.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                          {rowNetPct.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {tier.deliveryTimeline}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-5 p-5 rounded-2xl bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-4">
            <div className="space-y-1.5">
              <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {selectedTier.code} · {selectedTier.categoryLabel}
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
                {selectedTier.name} — Cost &amp; Net Margin Waterfall
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">{selectedTier.scopeSummary}</p>
            </div>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={adjustedTierMetrics.waterfall}
                  margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? 'rgba(51,65,85,0.45)' : 'rgba(148,163,184,0.35)'}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }}
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
                      backgroundColor: isDark ? '#0B101B' : '#FFFFFF',
                      borderColor: isDark ? '#334155' : '#CBD5E1',
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

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-400">
                Net Margin: {adjustedTierMetrics.netMarginPct.toFixed(1)}% (
                {formatSsotCurrency(adjustedTierMetrics.netUsd, currency, fxRate, { compact: true })})
              </div>
              <button
                type="button"
                onClick={() => loadCaseStudyStack(selectedTier.recommendedAppIds, selectedTier.code)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Load Tier Stack</span>
              </button>
            </div>
          </div>
        </div>

        {/* Interactive RoiSensitivitySlider + D3.js Cumulative Equity Area Chart */}
        <div className="relative z-10 p-5 rounded-2xl bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-5 space-y-4">
            <div>
              <div className="text-xs font-mono font-semibold text-cyan-700 dark:text-cyan-400 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>RoiSensitivitySlider · Interactive Valuation Modeling</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                SAFE Equity Check, Exit Multiple &amp; Horizon
              </h3>
            </div>

            <div className="space-y-3.5">
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-600 dark:text-slate-400">Investment Check Size</span>
                  <span className="font-bold tabular-nums text-slate-900 dark:text-white">
                    {formatSsotCurrency(investorCalculatorState.investmentK * 1000, currency, fxRate, {
                      compact: true,
                    })}
                  </span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={1000}
                  step={50}
                  value={investorCalculatorState.investmentK}
                  onChange={(e) =>
                    updateInvestorCalculatorState({ investmentK: Number(e.target.value) })
                  }
                  aria-label="Investment Check Size in thousands USD"
                  className="spenta-slider w-full"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-600 dark:text-slate-400">Exit EBITDA Multiple</span>
                  <span className="font-bold tabular-nums text-slate-900 dark:text-white">
                    {investorCalculatorState.exitMultiple.toFixed(1)}x EV/EBITDA
                  </span>
                </div>
                <input
                  type="range"
                  min={6}
                  max={20}
                  step={1}
                  value={investorCalculatorState.exitMultiple}
                  onChange={(e) =>
                    updateInvestorCalculatorState({ exitMultiple: Number(e.target.value) })
                  }
                  aria-label="Exit EBITDA Multiple"
                  className="spenta-slider w-full"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-600 dark:text-slate-400">Holding Horizon</span>
                  <span className="font-bold tabular-nums text-slate-900 dark:text-white">
                    {investorCalculatorState.horizonYears} Years
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={investorCalculatorState.horizonYears}
                  onChange={(e) =>
                    updateInvestorCalculatorState({ horizonYears: Number(e.target.value) })
                  }
                  aria-label="Investment Holding Horizon in Years"
                  className="spenta-slider w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Modeled Equity</div>
                <div className="text-base font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                  {formatSsotCurrency(finalTrajectoryPoint.equityUsd, currency, fxRate, {
                    compact: true,
                  })}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Target MOIC</div>
                <div className="text-base font-bold font-mono tabular-nums text-cyan-700 dark:text-cyan-400">
                  {finalTrajectoryPoint.moic.toFixed(2)}x Return
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
              <span>D3.js Cumulative Investor Equity Curve ({finalTrajectoryPoint.label})</span>
              <span>Dashed: 10x Baseline Reference</span>
            </div>
            <svg
              ref={areaChartSvgRef}
              viewBox="0 0 560 185"
              className="w-full h-48 overflow-visible"
              role="img"
              aria-label="5-Year Cumulative SAFE Investor Equity Trajectory"
            />
          </div>
        </div>

        {/* D3.js MonteCarloSimulation + RoiSensitivityHeatmap */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 p-5 rounded-2xl bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-mono text-cyan-700 dark:text-cyan-400 font-semibold">
                  MonteCarloSimulation · 1,500 Trials (D3.js)
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  5-Year SAFE Equity Exit Probability Histogram
                </h3>
              </div>
              <div
                role="group"
                aria-label="Monte Carlo Confidence Interval"
                className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800"
              >
                {([90, 95, 99] as ConfidenceLevelPct[]).map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    aria-pressed={confidenceLevelPct === pct}
                    onClick={() => setConfidenceLevelPct(pct)}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-semibold cursor-pointer ${
                      confidenceLevelPct === pct
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-600 dark:text-slate-400'
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

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">P10 Downside</div>
                <div className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                  {formatSsotCurrency(monteCarloStats.p10Usd, currency, fxRate, { compact: true })}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Median P50</div>
                <div className="text-sm font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                  {formatSsotCurrency(monteCarloStats.p50Usd, currency, fxRate, { compact: true })}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">P90 Upside</div>
                <div className="text-sm font-bold font-mono tabular-nums text-cyan-700 dark:text-cyan-400">
                  {formatSsotCurrency(monteCarloStats.p90Usd, currency, fxRate, { compact: true })}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {confidenceLevelPct}% CI Band
                </div>
                <div className="text-xs font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                  {monteCarloStats.medianMoic.toFixed(2)}x Med. MOIC
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 p-5 rounded-2xl bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 space-y-4">
            <div>
              <div className="text-xs font-mono text-cyan-700 dark:text-cyan-400 font-semibold">
                RoiSensitivityHeatmap
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                SAFE Investor Return Matrix (Y5 EBITDA × Exit Multiple)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Modeled on{' '}
                {formatSsotCurrency(investorCalculatorState.investmentK * 1000, currency, fxRate, {
                  compact: true,
                })}{' '}
                check @ $4.5M Post-Money Cap
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-center text-[11px] font-mono tabular-nums border-collapse">
                <thead>
                  <tr className="text-slate-500 dark:text-slate-400">
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
                      <td className="p-1.5 text-left font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {formatSsotCurrency(ebitdaM * 1_000_000, currency, fxRate, {
                          compact: true,
                        })}
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
                            ? 'bg-emerald-600 text-white'
                            : moic >= 4.0
                              ? 'bg-emerald-500/20 text-slate-900 dark:text-slate-100'
                              : 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300';
                        return (
                          <td
                            key={mult}
                            className={`p-1.5 border border-white dark:border-slate-950 rounded ${tierCls}`}
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
        <div className="relative z-10 rounded-2xl bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-mono text-cyan-700 dark:text-cyan-400 font-semibold">
                RoiScenarioComparator
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Side-by-Side 5-Year Capital Return Scenarios
              </h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
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
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {scenarioComparatorRows.map((row) => (
                  <tr key={row.name}>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      {row.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
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
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                      {formatSsotCurrency(row.investorReturnUsd, currency, fxRate, {
                        compact: true,
                      })}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-cyan-700 dark:text-cyan-400">
                      {row.moic.toFixed(2)}x
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FinancialSummaryGenerator (POST /api/financial-summary) */}
        <div className="relative z-10 p-5 rounded-2xl bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-mono text-cyan-700 dark:text-cyan-400 font-semibold">
                FinancialSummaryGenerator · Server-Side Gemini Synthesis
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Generate Institutional IC Diligence Memo from Active Parameters
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Synthesizes {currency} financials, {selectedTier.code}, {confidenceLevelPct}% Monte Carlo CI, and {bearCaseEnabled ? 'Bear Stress' : 'Baseline'} sensitivity via /api/financial-summary.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 ssot-no-print">
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
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  {copiedSummary ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedSummary ? 'Copied' : 'Copy Memo'}</span>
                </button>
              )}
              <button
                type="button"
                disabled={aiLoading}
                onClick={() => void handleGenerateAiSummary()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold cursor-pointer whitespace-nowrap disabled:opacity-60"
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
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <p className="text-sm text-slate-900 dark:text-slate-100 leading-relaxed">
                {aiSummary.summary}
              </p>
              {aiSummary.thesisBullets.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                    Key Investment Highlights
                  </div>
                  <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                    {aiSummary.thesisBullets.map((b, i) => (
                      <li key={i}>· {b}</li>
                    ))}
                  </ul>
                </div>
              )}
              {aiSummary.riskMitigants.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-mono font-semibold text-cyan-700 dark:text-cyan-400">
                    Structural Downside Protection
                  </div>
                  <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
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

      {/* Slide-In Anomaly Watch & Risk Guardrails Drawer */}
      <AnimatePresence>
        {anomalyDrawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-end ssot-no-print">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAnomalyDrawerOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Anomaly Watch & Sensitivity Guardrails"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.28, ease: INSTITUTIONAL_EASE }}
              className="relative z-10 w-full max-w-md h-full overflow-y-auto bg-white dark:bg-[#0B101B] border-l border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <div className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400 uppercase">
                    Anomaly Watch &amp; Downside Stress
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    Institutional Risk Guardrails
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setAnomalyDrawerOpen(false)}
                  aria-label="Close risk drawer"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/35 space-y-2">
                  <div className="font-mono font-bold text-amber-800 dark:text-amber-300">
                    Bear Stress Test Variance ({bearCaseEnabled ? 'ACTIVE' : 'STANDBY'})
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    Models simultaneous +20% Enterprise CAC expansion, -15% contract realization compression, and +10% air-gapped GPU compute overhead across all 9 tiers.
                  </p>
                  <button
                    type="button"
                    onClick={() => setBearCaseEnabled(!bearCaseEnabled)}
                    className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold cursor-pointer"
                  >
                    {bearCaseEnabled ? 'Restore Nominal Baseline' : 'Activate Bear-Case Stress'}
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex justify-between font-mono font-semibold text-slate-900 dark:text-white">
                    <span>FX Sensitivity (BDT / USD)</span>
                    <span className="tabular-nums">{fxRate.toFixed(2)}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">
                    Dhaka engineering payroll is BDT-denominated while enterprise contracts bill in USD/AUD/SGD, creating a natural margin buffer if BDT softens.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex justify-between font-mono font-semibold text-slate-900 dark:text-white">
                    <span>CAC Payback Guardrail</span>
                    <span className="tabular-nums text-emerald-700 dark:text-emerald-400">
                      &lt; 2.8 Months
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">
                    Experience Engine WebAR pilots (Cat A) self-fund Enterprise Operations discovery before heavy L5 Agent deployment begins.
                  </p>
                </div>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
