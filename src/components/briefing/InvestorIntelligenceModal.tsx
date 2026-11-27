import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  MessageSquarePlus,
  Send,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { BRIEFING_CHAPTERS, formatSsotCurrency } from '../../data/unifiedSsotData';
import { useStack } from '../../store/StackContext';
import type { InvestorFeedbackPriority } from '../../utils/LocalPersistenceService';

const PRIORITY_OPTIONS: InvestorFeedbackPriority[] = [
  'Critical Inquiry',
  'Strategic Suggestion',
  'General Feedback',
];

export function InvestorIntelligenceModal() {
  const {
    theme,
    intelligenceModalOpen,
    intelligenceFocusSection,
    closeIntelligenceModal,
    investorFeedback,
    addInvestorFeedback,
    replyInvestorFeedback,
    deleteInvestorFeedback,
    investorCalculatorState,
    updateInvestorCalculatorState,
    currency,
    navigateToItem,
  } = useStack();

  const [section, setSection] = useState(intelligenceFocusSection);
  const [priority, setPriority] = useState<InvestorFeedbackPriority>('Strategic Suggestion');
  const [sentimentScore, setSentimentScore] = useState<number>(4);
  const [text, setText] = useState('');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  const sentimentSvgRef = useRef<SVGSVGElement | null>(null);
  const heatmapSvgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    setSection(intelligenceFocusSection);
  }, [intelligenceFocusSection]);

  useEffect(() => {
    if (!intelligenceModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeIntelligenceModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [intelligenceModalOpen, closeIntelligenceModal]);

  const orderedFeedback = useMemo(
    () => [...investorFeedback].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [investorFeedback],
  );

  const averageSentiment = useMemo(() => {
    if (investorFeedback.length === 0) return null;
    const total = investorFeedback.reduce((sum, item) => sum + item.sentimentScore, 0);
    return Number((total / investorFeedback.length).toFixed(2));
  }, [investorFeedback]);

  // Render D3 Sentiment Trend Curve
  useEffect(() => {
    if (!intelligenceModalOpen || !sentimentSvgRef.current) return;
    const svg = d3.select(sentimentSvgRef.current);
    svg.selectAll('*').remove();

    const width = 460;
    const height = 170;
    const margin = { top: 18, right: 18, bottom: 28, left: 34 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const isDark = theme === 'dark';
    const inkColor = isDark ? '#8E96B0' : '#5F6576';
    const gridColor = isDark ? '#232B4A' : '#E4DFD6';
    const lineColor = isDark ? '#6FCB9F' : '#1C6E46';
    const areaFill = isDark ? 'rgba(111, 203, 159, 0.16)' : 'rgba(28, 110, 70, 0.14)';

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const points =
      orderedFeedback.length > 0
        ? orderedFeedback.map((entry, idx) => ({ idx: idx + 1, score: entry.sentimentScore }))
        : [
            { idx: 1, score: 3 },
            { idx: 2, score: 3 },
          ];

    const x = d3
      .scaleLinear()
      .domain([1, Math.max(2, points.length)])
      .range([0, innerW]);

    const y = d3.scaleLinear().domain([1, 5]).range([innerH, 0]);

    // Gridlines
    [1, 2, 3, 4, 5].forEach((tick) => {
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerW)
        .attr('y1', y(tick))
        .attr('y2', y(tick))
        .attr('stroke', gridColor)
        .attr('stroke-dasharray', tick === 3 ? '3,3' : 'none');

      g.append('text')
        .attr('x', -8)
        .attr('y', y(tick) + 3.5)
        .attr('text-anchor', 'end')
        .attr('fill', inkColor)
        .attr('font-size', '10px')
        .attr('font-family', 'JetBrains Mono, monospace')
        .text(`${tick}`);
    });

    if (orderedFeedback.length > 0) {
      const area = d3
        .area<{ idx: number; score: number }>()
        .x((d) => x(d.idx))
        .y0(innerH)
        .y1((d) => y(d.score))
        .curve(d3.curveMonotoneX);

      const line = d3
        .line<{ idx: number; score: number }>()
        .x((d) => x(d.idx))
        .y((d) => y(d.score))
        .curve(d3.curveMonotoneX);

      g.append('path').datum(points).attr('fill', areaFill).attr('d', area);
      g.append('path')
        .datum(points)
        .attr('fill', 'none')
        .attr('stroke', lineColor)
        .attr('stroke-width', 2.2)
        .attr('d', line);

      g.selectAll('circle')
        .data(points)
        .enter()
        .append('circle')
        .attr('cx', (d) => x(d.idx))
        .attr('cy', (d) => y(d.score))
        .attr('r', 4)
        .attr('fill', lineColor);
    } else {
      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', innerH / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', inkColor)
        .attr('font-size', '11px')
        .text('Log your first diligence note below to populate sentiment trend');
    }
  }, [intelligenceModalOpen, orderedFeedback, theme]);

  // Render D3 Section Feedback Heatmap
  useEffect(() => {
    if (!intelligenceModalOpen || !heatmapSvgRef.current) return;
    const svg = d3.select(heatmapSvgRef.current);
    svg.selectAll('*').remove();

    const width = 460;
    const height = 170;
    const margin = { top: 14, right: 16, bottom: 38, left: 16 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const isDark = theme === 'dark';
    const inkColor = isDark ? '#8E96B0' : '#5F6576';
    const borderColor = isDark ? '#232B4A' : '#E4DFD6';

    const chapterCounts = BRIEFING_CHAPTERS.map((ch) => {
      const matches = investorFeedback.filter(
        (fb) => fb.section === ch.title || fb.section.includes(ch.shortTitle),
      );
      const critical = matches.filter((m) => m.priority === 'Critical Inquiry').length;
      return {
        num: ch.num,
        shortTitle: ch.shortTitle,
        count: matches.length,
        critical,
      };
    });

    const maxCount = Math.max(1, ...chapterCounts.map((c) => c.count));
    const colorScale = d3
      .scaleSequential(isDark ? d3.interpolateBlues : d3.interpolateYlGnBu)
      .domain([0, maxCount]);

    const x = d3
      .scaleBand()
      .domain(chapterCounts.map((c) => c.num))
      .range([0, innerW])
      .padding(0.14);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const cellH = Math.min(74, innerH - 12);

    g.selectAll('rect')
      .data(chapterCounts)
      .enter()
      .append('rect')
      .attr('x', (d) => x(d.num) ?? 0)
      .attr('y', 10)
      .attr('width', x.bandwidth())
      .attr('height', cellH)
      .attr('rx', 6)
      .attr('fill', (d) => (d.count === 0 ? (isDark ? '#141A32' : '#F2EFE9') : colorScale(d.count)))
      .attr('stroke', borderColor);

    g.selectAll('text.count')
      .data(chapterCounts)
      .enter()
      .append('text')
      .attr('class', 'count')
      .attr('x', (d) => (x(d.num) ?? 0) + x.bandwidth() / 2)
      .attr('y', 10 + cellH / 2 + 4)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-size', '12px')
      .attr('font-weight', '700')
      .attr('fill', (d) =>
        d.count === 0 ? inkColor : d.count / maxCount > 0.55 ? '#FFFFFF' : '#16213A',
      )
      .text((d) => `${d.count}`);

    g.selectAll('text.label')
      .data(chapterCounts)
      .enter()
      .append('text')
      .attr('class', 'label')
      .attr('x', (d) => (x(d.num) ?? 0) + x.bandwidth() / 2)
      .attr('y', cellH + 28)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-size', '10px')
      .attr('fill', inkColor)
      .text((d) => `C${d.num}`);
  }, [intelligenceModalOpen, investorFeedback, theme]);

  if (!intelligenceModalOpen) return null;

  const { investmentK, horizonYears, exitMultiple, fxRate, compareGrowthScenarios } =
    investorCalculatorState;
  const ownershipPct = (investmentK / 4500) * (1 - investorCalculatorState.dilutionPct / 100);
  // Reference Y5 EBITDA (~$2,163K conservative, scaled by horizon fraction for quick sensitivity read)
  const horizonScale = [0.16, 0.34, 0.56, 0.78, 1.0][Math.max(0, Math.min(4, horizonYears - 1))];
  const estimatedEbitdaK = (investorCalculatorState.scenario === 'upside' ? 3240 : 2163) * horizonScale;
  const projectedProceedsUsd = estimatedEbitdaK * 1000 * exitMultiple * ownershipPct;
  const projectedMoic = investmentK > 0 ? projectedProceedsUsd / (investmentK * 1000) : 0;

  const handleAddFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    if (!text.trim()) {
      setValidationError('Enter a due diligence question or note before saving.');
      return;
    }
    await addInvestorFeedback({
      section,
      priority,
      sentimentScore,
      text,
    });
    setText('');
  };

  const handleReplySubmit = async (feedbackId: string) => {
    const draft = (replyDrafts[feedbackId] ?? '').trim();
    if (!draft) return;
    await replyInvestorFeedback(feedbackId, draft);
    setReplyDrafts((prev) => ({ ...prev, [feedbackId]: '' }));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="spenta-intelligence-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#0B1020]/70 no-print"
      onClick={closeIntelligenceModal}
    >
      <div
        className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#1C6E46]/12 dark:bg-[#6FCB9F]/15 flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4 text-[#1C6E46] dark:text-[#6FCB9F]" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <h2
                id="spenta-intelligence-title"
                className="text-base sm:text-lg font-bold text-[#16213A] dark:text-[#E7EBF5] truncate"
              >
                Investor Intelligence &amp; D3 Sentiment Analytics
              </h2>
              <p className="text-xs text-[#5F6576] dark:text-[#8E96B0] truncate">
                {investorFeedback.length} offline notes logged · Avg. conviction{' '}
                <span className="font-mono tabular-nums font-semibold">
                  {averageSentiment !== null ? `${averageSentiment}/5.0` : 'Unrated'}
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeIntelligenceModal}
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-[#5F6576] dark:text-[#8E96B0] hover:bg-[#F2EFE9] dark:hover:bg-[#1E2747] transition-colors cursor-pointer"
            aria-label="Close Investor Intelligence"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Synchronized ROI Sensitivity Bar */}
          <section className="p-4 rounded-xl bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#1F3863] dark:text-[#8FA6E8]" />
                <h3 className="text-sm font-semibold text-[#16213A] dark:text-[#E7EBF5]">
                  Live SAFE Sensitivity (Synced to Financials Calculator)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  closeIntelligenceModal();
                  navigateToItem('Financials');
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#1F3863] dark:text-[#8FA6E8] hover:underline cursor-pointer"
              >
                <span>Open Full 5-Year ROI Workspace</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              <label className="space-y-1 block">
                <div className="flex justify-between text-xs text-[#5F6576] dark:text-[#8E96B0]">
                  <span>SAFE Ticket</span>
                  <span className="font-mono tabular-nums font-semibold text-[#16213A] dark:text-[#E7EBF5]">
                    {formatSsotCurrency(investmentK * 1000, currency, fxRate, { compact: true })}
                  </span>
                </div>
                <input
                  type="range"
                  min={25}
                  max={500}
                  step={25}
                  value={investmentK}
                  onChange={(e) => updateInvestorCalculatorState({ investmentK: Number(e.target.value) })}
                  className="w-full accent-[#1F3863] dark:accent-[#8FA6E8]"
                />
              </label>

              <label className="space-y-1 block">
                <div className="flex justify-between text-xs text-[#5F6576] dark:text-[#8E96B0]">
                  <span>Exit Multiple</span>
                  <span className="font-mono tabular-nums font-semibold text-[#16213A] dark:text-[#E7EBF5]">
                    {exitMultiple}× EBITDA
                  </span>
                </div>
                <input
                  type="range"
                  min={6}
                  max={20}
                  step={1}
                  value={exitMultiple}
                  onChange={(e) => updateInvestorCalculatorState({ exitMultiple: Number(e.target.value) })}
                  className="w-full accent-[#1F3863] dark:accent-[#8FA6E8]"
                />
              </label>

              <label className="space-y-1 block">
                <div className="flex justify-between text-xs text-[#5F6576] dark:text-[#8E96B0]">
                  <span>Horizon</span>
                  <span className="font-mono tabular-nums font-semibold text-[#16213A] dark:text-[#E7EBF5]">
                    {horizonYears} {horizonYears === 1 ? 'Year' : 'Years'}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={horizonYears}
                  onChange={(e) => updateInvestorCalculatorState({ horizonYears: Number(e.target.value) })}
                  className="w-full accent-[#1F3863] dark:accent-[#8FA6E8]"
                />
              </label>

              <div className="p-3 rounded-lg bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A]">
                <div className="text-[11px] text-[#5F6576] dark:text-[#8E96B0]">
                  Implied Return ({compareGrowthScenarios ? 'Compare On' : 'Base'})
                </div>
                <div className="text-base font-bold font-mono tabular-nums text-[#1C6E46] dark:text-[#6FCB9F]">
                  {formatSsotCurrency(projectedProceedsUsd, currency, fxRate, { compact: true })}{' '}
                  <span className="text-xs font-semibold">({projectedMoic.toFixed(2)}×)</span>
                </div>
              </div>
            </div>
          </section>

          {/* D3 Visualizations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5]">
                  D3 Conviction &amp; Sentiment Trend (1–5 Scale)
                </h3>
                <span className="text-[11px] font-mono text-[#5F6576] dark:text-[#8E96B0]">
                  D3 Line/Area
                </span>
              </div>
              <svg
                ref={sentimentSvgRef}
                viewBox="0 0 460 170"
                className="w-full h-44 overflow-visible"
                role="img"
                aria-label="D3 investor sentiment trend chart"
              />
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5] flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-[#1F3863] dark:text-[#8FA6E8]" />
                  <span>D3 Briefing Chapter Engagement Heatmap</span>
                </h3>
                <span className="text-[11px] font-mono text-[#5F6576] dark:text-[#8E96B0]">
                  C01–C09 Density
                </span>
              </div>
              <svg
                ref={heatmapSvgRef}
                viewBox="0 0 460 170"
                className="w-full h-44 overflow-visible"
                role="img"
                aria-label="D3 section feedback density heatmap"
              />
            </div>
          </div>

          {/* Offline Diligence Feedback Logger */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <form
              onSubmit={(e) => void handleAddFeedback(e)}
              className="lg:col-span-2 p-4 rounded-xl bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] space-y-3"
            >
              <div className="flex items-center gap-2">
                <MessageSquarePlus className="w-4 h-4 text-[#1F3863] dark:text-[#8FA6E8]" />
                <h3 className="text-sm font-semibold text-[#16213A] dark:text-[#E7EBF5]">
                  Log Offline Diligence Note
                </h3>
              </div>

              {validationError && (
                <div className="p-2.5 rounded-lg bg-[#E11D48]/10 text-xs text-[#BE123C] dark:text-[#FDA4AF]">
                  {validationError}
                </div>
              )}

              <label className="space-y-1 block">
                <span className="text-xs font-medium text-[#5F6576] dark:text-[#8E96B0]">
                  Target Chapter
                </span>
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] text-xs text-[#16213A] dark:text-[#E7EBF5]"
                >
                  {BRIEFING_CHAPTERS.map((ch) => (
                    <option key={ch.id} value={ch.title}>
                      {ch.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 block">
                <span className="text-xs font-medium text-[#5F6576] dark:text-[#8E96B0]">
                  Priority Classification
                </span>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as InvestorFeedbackPriority)}
                  className="w-full px-3 py-2 rounded-lg bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] text-xs text-[#16213A] dark:text-[#E7EBF5]"
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 block">
                <div className="flex justify-between text-xs text-[#5F6576] dark:text-[#8E96B0]">
                  <span>Conviction Rating</span>
                  <span className="font-mono tabular-nums font-semibold text-[#1C6E46] dark:text-[#6FCB9F]">
                    {sentimentScore} / 5
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={sentimentScore}
                  onChange={(e) => setSentimentScore(Number(e.target.value))}
                  className="w-full accent-[#1C6E46] dark:accent-[#6FCB9F]"
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-xs font-medium text-[#5F6576] dark:text-[#8E96B0]">
                  Note / Question
                </span>
                <textarea
                  rows={3}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Record diligence questions, unit economics notes, or technical follow-ups…"
                  className="w-full px-3 py-2 rounded-lg bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] text-xs text-[#16213A] dark:text-[#E7EBF5]"
                />
              </label>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#1F3863] hover:bg-[#162848] dark:bg-[#8FA6E8] dark:hover:bg-[#A6B9F0] text-white dark:text-[#0B1020] text-xs font-semibold transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Save Note to IndexedDB</span>
              </button>
            </form>

            {/* Feedback Stream */}
            <div className="lg:col-span-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5]">
                  Recorded Diligence Thread ({investorFeedback.length})
                </h3>
                <span className="text-[11px] font-mono text-[#5F6576] dark:text-[#8E96B0]">
                  Persists Offline
                </span>
              </div>

              {investorFeedback.length === 0 ? (
                <div className="p-6 rounded-xl bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] text-center space-y-2">
                  <div className="text-sm font-semibold text-[#16213A] dark:text-[#E7EBF5]">
                    No diligence notes recorded yet
                  </div>
                  <p className="text-xs text-[#5F6576] dark:text-[#8E96B0]">
                    Add your first note on the left to dynamically populate the D3 Sentiment Curve and Chapter Engagement Heatmap.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {investorFeedback.map((fb) => (
                    <div
                      key={fb.id}
                      className="p-3.5 rounded-xl bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-[11px] font-mono text-[#5F6576] dark:text-[#8E96B0]">
                          <span className="font-semibold text-[#1F3863] dark:text-[#8FA6E8]">
                            {fb.priority}
                          </span>
                          <span aria-hidden="true"> · </span>
                          <span>Score {fb.sentimentScore}/5</span>
                          <span aria-hidden="true"> · </span>
                          <span>{fb.section}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => void deleteInvestorFeedback(fb.id)}
                          className="text-[#5F6576] hover:text-[#E11D48] cursor-pointer"
                          aria-label="Delete feedback note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-[#16213A] dark:text-[#E7EBF5] leading-relaxed">
                        {fb.text}
                      </p>

                      {fb.replies.length > 0 && (
                        <div className="pl-3 border-t border-[#E4DFD6] dark:border-[#232B4A] pt-2 space-y-1">
                          {fb.replies.map((rep) => (
                            <p
                              key={rep.id}
                              className="text-[11px] text-[#5F6576] dark:text-[#8E96B0]"
                            >
                              Follow-up: {rep.text}
                            </p>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={replyDrafts[fb.id] ?? ''}
                          onChange={(e) =>
                            setReplyDrafts((prev) => ({ ...prev, [fb.id]: e.target.value }))
                          }
                          placeholder="Add follow-up reply…"
                          className="flex-1 px-2.5 py-1.5 rounded-md bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] text-[11px] text-[#16213A] dark:text-[#E7EBF5]"
                        />
                        <button
                          type="button"
                          onClick={() => void handleReplySubmit(fb.id)}
                          className="px-2.5 py-1.5 rounded-md bg-[#F2EFE9] dark:bg-[#1E2747] text-[11px] font-medium text-[#16213A] dark:text-[#E7EBF5] hover:bg-[#E4DFD6] dark:hover:bg-[#2A355E] cursor-pointer"
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
