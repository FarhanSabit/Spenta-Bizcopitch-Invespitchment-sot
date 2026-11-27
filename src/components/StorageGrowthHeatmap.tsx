import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Flame, TrendingUp } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import {
  InvestorCalculatorScenario,
  UserWorkspaceSnapshot,
} from '../utils/LocalPersistenceService';

import {
  HeatmapCategoryKey,
  HeatmapCellDatum,
  HeatmapHorizon,
  HeatmapMetric,
  buildStorageHeatmapData,
  formatCompactBytes,
} from '../utils/storageHeatmap';

export type {
  HeatmapBucket,
  HeatmapCategoryKey,
  HeatmapCellDatum,
  HeatmapHorizon,
  HeatmapMetric,
  StorageHeatmapSummary,
} from '../utils/storageHeatmap';
export { buildStorageHeatmapData, formatCompactBytes } from '../utils/storageHeatmap';

interface StorageGrowthHeatmapProps {
  scenarios: InvestorCalculatorScenario[];
  snapshots: UserWorkspaceSnapshot[];
}

export function StorageGrowthHeatmap({ scenarios, snapshots }: StorageGrowthHeatmapProps) {
  const { isDark } = useTheme();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [horizon, setHorizon] = useState<HeatmapHorizon>('7d');
  const [metric, setMetric] = useState<HeatmapMetric>('bytes');
  const [hoveredCell, setHoveredCell] = useState<HeatmapCellDatum | null>(null);

  const summary = useMemo(
    () => buildStorageHeatmapData(scenarios, snapshots, horizon, metric),
    [scenarios, snapshots, horizon, metric],
  );

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const width = 760;
    const height = 192;
    const margin = { top: 18, right: 20, bottom: 52, left: 152 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3
      .scaleBand<string>()
      .domain(summary.buckets.map((b) => String(b.index)))
      .range([0, innerWidth])
      .padding(0.14);

    const yCategories: HeatmapCategoryKey[] = ['scenarios', 'snapshots'];
    const yLabels: Record<HeatmapCategoryKey, string> = {
      scenarios: 'Saved Scenarios',
      snapshots: 'Workspace Snapshots',
    };

    const yScale = d3
      .scaleBand<HeatmapCategoryKey>()
      .domain(yCategories)
      .range([0, innerHeight])
      .padding(0.22);

    const idleColor = isDark ? '#0F1529' : '#FAF8F4';
    const heatInterpolator = isDark
      ? d3.interpolateRgbBasis(['#162647', '#0891B2', '#D97706', '#EF4444'])
      : d3.interpolateRgbBasis(['#DBEAFE', '#38BDF8', '#F59E0B', '#DC2626']);

    const maxDomain = Math.max(1, summary.maxValue);
    const colorScale = d3.scaleSequential(heatInterpolator).domain([0, maxDomain]);

    // Defs linear gradient for legend
    const defs = svg.append('defs');
    const grad = defs
      .append('linearGradient')
      .attr('id', 'storage-hotspot-legend-grad')
      .attr('x1', '0%')
      .attr('x2', '100%')
      .attr('y1', '0%')
      .attr('y2', '0%');
    grad.append('stop').attr('offset', '0%').attr('stop-color', idleColor);
    grad.append('stop').attr('offset', '28%').attr('stop-color', heatInterpolator(0.25));
    grad.append('stop').attr('offset', '65%').attr('stop-color', heatInterpolator(0.65));
    grad.append('stop').attr('offset', '100%').attr('stop-color', heatInterpolator(1));

    const borderStroke = isDark ? '#232B4A' : '#E4DFD6';
    const hotStroke = isDark ? '#FCD34D' : '#991B1B';
    const mutedAxisColor = isDark ? '#8E96B0' : '#5F6576';
    const inkAxisColor = isDark ? '#E7EBF5' : '#16213A';

    // X-Axis (Time Buckets)
    const xAxis = d3
      .axisBottom(xScale)
      .tickFormat((idx) => summary.buckets[Number(idx)]?.label ?? '')
      .tickSize(0);

    const xAxisG = g
      .append('g')
      .attr('transform', `translate(0,${innerHeight + 6})`)
      .call(xAxis);
    xAxisG.select('.domain').remove();
    xAxisG
      .selectAll('text')
      .attr('fill', mutedAxisColor)
      .attr('font-size', '11px')
      .attr('font-family', 'JetBrains Mono, ui-monospace, monospace');

    // Y-Axis (Scenarios vs Snapshots)
    const yAxis = d3
      .axisLeft(yScale)
      .tickFormat((key) => yLabels[key])
      .tickSize(0);

    const yAxisG = g.append('g').attr('transform', 'translate(-8,0)').call(yAxis);
    yAxisG.select('.domain').remove();
    yAxisG
      .selectAll('text')
      .attr('fill', inkAxisColor)
      .attr('font-size', '11.5px')
      .attr('font-weight', '600');

    // Heatmap Cells
    const cellGroups = g
      .selectAll<SVGGElement, HeatmapCellDatum>('.heatmap-cell')
      .data(summary.cells)
      .enter()
      .append('g')
      .attr('class', 'heatmap-cell')
      .attr('transform', (d) => {
        const x = xScale(String(d.bucketIndex)) ?? 0;
        const y = yScale(d.category) ?? 0;
        return `translate(${x},${y})`;
      })
      .style('cursor', 'pointer')
      .on('mouseenter', (_event, d) => setHoveredCell(d))
      .on('mouseleave', () => setHoveredCell(null));

    cellGroups
      .append('rect')
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('rx', 7)
      .attr('ry', 7)
      .attr('fill', (d) => (d.value <= 0 ? idleColor : colorScale(d.value)))
      .attr('stroke', (d) => (d.isHotSpot ? hotStroke : borderStroke))
      .attr('stroke-width', (d) => (d.isHotSpot ? 2.25 : 1));

    // Cell value labels (bytes or count) inside cells
    cellGroups
      .append('text')
      .attr('x', xScale.bandwidth() / 2)
      .attr('y', yScale.bandwidth() / 2 + 4)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-family', 'JetBrains Mono, ui-monospace, monospace')
      .attr('font-weight', (d) => (d.value > 0 ? '700' : '400'))
      .attr('fill', (d) => {
        if (d.value <= 0) return mutedAxisColor;
        const ratio = summary.maxValue > 0 ? d.value / summary.maxValue : 0;
        if (ratio >= 0.55) return '#FFFFFF';
        return isDark ? '#F8FAFC' : '#16213A';
      })
      .text((d) => {
        if (d.value <= 0) return '0';
        return metric === 'bytes' ? formatCompactBytes(d.bytes) : String(d.count);
      });

    // Subtle peak badge text above hot-spot cell
    cellGroups
      .filter((d) => d.isHotSpot)
      .append('text')
      .attr('x', xScale.bandwidth() / 2)
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '9.5px')
      .attr('font-weight', '700')
      .attr('font-family', 'JetBrains Mono, ui-monospace, monospace')
      .attr('fill', hotStroke)
      .text('HOT-SPOT');

    // Bottom legend bar
    const legendWidth = 148;
    const legendGroup = svg
      .append('g')
      .attr('transform', `translate(${width - margin.right - legendWidth},${height - 18})`);

    legendGroup
      .append('text')
      .attr('x', -8)
      .attr('y', 8)
      .attr('text-anchor', 'end')
      .attr('font-size', '10px')
      .attr('font-family', 'JetBrains Mono, ui-monospace, monospace')
      .attr('fill', mutedAxisColor)
      .text('Idle');

    legendGroup
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', legendWidth)
      .attr('height', 8)
      .attr('rx', 4)
      .attr('fill', 'url(#storage-hotspot-legend-grad)')
      .attr('stroke', borderStroke)
      .attr('stroke-width', 0.75);

    legendGroup
      .append('text')
      .attr('x', -164)
      .attr('y', 8)
      .attr('text-anchor', 'end')
      .attr('font-size', '10px')
      .attr('font-family', 'JetBrains Mono, ui-monospace, monospace')
      .attr('fill', mutedAxisColor)
      .text(
        summary.maxValue > 0
          ? `Peak: ${metric === 'bytes' ? formatCompactBytes(summary.maxValue) : `${summary.maxValue} items`}`
          : 'No accumulation in window',
      );
  }, [summary, isDark, metric]);

  const fastestLabel =
    summary.fastestCategory === 'scenarios'
      ? 'Saved Scenarios'
      : summary.fastestCategory === 'snapshots'
        ? 'Workspace Snapshots'
        : summary.fastestCategory === 'tied'
          ? 'Balanced (50 / 50)'
          : 'No recent growth';

  return (
    <div
      data-testid="storage-hotspot-heatmap"
      className="rounded-2xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] p-5 space-y-4"
    >
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#E4DFD6] dark:border-[#232B4A]">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-[#D97706] dark:text-[#FCD34D]" strokeWidth={1.75} />
            <h3 className="text-sm font-bold text-[#16213A] dark:text-[#E7EBF5]">
              Storage Accumulation Hot-Spot Heatmap
            </h3>
          </div>
          <p className="text-xs text-[#5F6576] dark:text-[#8E96B0]">
            D3.js temporal velocity matrix comparing Saved Scenarios vs. Workspace Snapshots growth over time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Metric Toggle (Bytes vs Item Count) */}
          <div
            role="group"
            aria-label="Heatmap intensity metric"
            className="inline-flex rounded-lg bg-[#F2EFE9] dark:bg-[#0F1529] p-0.5 border border-[#E4DFD6] dark:border-[#232B4A]"
          >
            <button
              type="button"
              data-testid="heatmap-metric-bytes"
              onClick={() => setMetric('bytes')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                metric === 'bytes'
                  ? 'bg-white dark:bg-[#141A32] text-[#16213A] dark:text-[#E7EBF5] shadow-xs'
                  : 'text-[#5F6576] dark:text-[#8E96B0]'
              }`}
            >
              Byte Growth
            </button>
            <button
              type="button"
              data-testid="heatmap-metric-count"
              onClick={() => setMetric('count')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                metric === 'count'
                  ? 'bg-white dark:bg-[#141A32] text-[#16213A] dark:text-[#E7EBF5] shadow-xs'
                  : 'text-[#5F6576] dark:text-[#8E96B0]'
              }`}
            >
              Item Count
            </button>
          </div>

          {/* Time Horizon Toggle */}
          <div
            role="group"
            aria-label="Heatmap time window"
            className="inline-flex rounded-lg bg-[#F2EFE9] dark:bg-[#0F1529] p-0.5 border border-[#E4DFD6] dark:border-[#232B4A]"
          >
            {(
              [
                { id: '24h', label: '24h' },
                { id: '7d', label: '7 Days' },
                { id: '30d', label: '30 Days' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                data-testid={`heatmap-horizon-${opt.id}`}
                onClick={() => setHorizon(opt.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  horizon === opt.id
                    ? 'bg-white dark:bg-[#141A32] text-[#16213A] dark:text-[#E7EBF5] shadow-xs'
                    : 'text-[#5F6576] dark:text-[#8E96B0]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Fastest-Growing Origin Callout Row (Clean Single-Elevation Strip) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded-xl border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529]">
          <div className="flex items-center justify-between text-[11px] text-[#5F6576] dark:text-[#8E96B0]">
            <span>Fastest-Growing Category</span>
            <TrendingUp className="w-3.5 h-3.5 text-[#D97706] dark:text-[#FCD34D]" strokeWidth={1.75} />
          </div>
          <div
            data-testid="heatmap-fastest-category"
            className="mt-1 font-bold text-[#16213A] dark:text-[#E7EBF5]"
          >
            {fastestLabel}
          </div>
          <div className="mt-0.5 text-[11px] font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0]">
            {summary.fastestCategory === 'idle'
              ? 'Save a scenario or snapshot to measure velocity'
              : `${summary.fastestCategorySharePct.toFixed(1)}% of ${horizon} accumulation`}
          </div>
        </div>

        <div className="p-3 rounded-xl border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529]">
          <div className="text-[11px] text-[#5F6576] dark:text-[#8E96B0]">
            Saved Scenarios ({horizon})
          </div>
          <div className="mt-1 font-bold font-mono tabular-nums text-[#16213A] dark:text-[#E7EBF5]">
            {formatCompactBytes(summary.scenariosTotalBytes)}
          </div>
          <div className="mt-0.5 text-[11px] font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0]">
            {summary.scenariosTotalCount} scenario{summary.scenariosTotalCount === 1 ? '' : 's'} accumulated
          </div>
        </div>

        <div className="p-3 rounded-xl border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529]">
          <div className="text-[11px] text-[#5F6576] dark:text-[#8E96B0]">
            Workspace Snapshots ({horizon})
          </div>
          <div className="mt-1 font-bold font-mono tabular-nums text-[#16213A] dark:text-[#E7EBF5]">
            {formatCompactBytes(summary.snapshotsTotalBytes)}
          </div>
          <div className="mt-0.5 text-[11px] font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0]">
            {summary.snapshotsTotalCount} snapshot{summary.snapshotsTotalCount === 1 ? '' : 's'} accumulated
          </div>
        </div>
      </div>

      {/* D3 SVG Matrix */}
      <div className="relative w-full overflow-x-auto">
        <svg
          ref={svgRef}
          role="img"
          aria-label="D3 storage accumulation hot-spot heatmap comparing scenarios and snapshots"
          className="w-full min-w-[540px] h-auto select-none"
        />
      </div>

      {/* Interactive Hover Detail Strip */}
      <div
        data-testid="heatmap-hover-readout"
        className="pt-2 border-t border-[#E4DFD6] dark:border-[#232B4A] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0]"
      >
        {hoveredCell ? (
          <>
            <span className="text-[#16213A] dark:text-[#E7EBF5] font-semibold">
              {hoveredCell.categoryLabel} · {hoveredCell.rangeLabel}
            </span>
            <span>
              {hoveredCell.count} item{hoveredCell.count === 1 ? '' : 's'} ·{' '}
              {formatCompactBytes(hoveredCell.bytes)} · {hoveredCell.sharePct.toFixed(1)}% share
              {hoveredCell.isHotSpot ? ' · Peak Hot-Spot' : ''}
            </span>
          </>
        ) : summary.hotSpotCell ? (
          <>
            <span>
              Peak Hot-Spot:{' '}
              <strong className="text-[#16213A] dark:text-[#E7EBF5]">
                {summary.hotSpotCell.categoryLabel} ({summary.hotSpotCell.rangeLabel})
              </strong>
            </span>
            <span>
              {summary.hotSpotCell.count} item{summary.hotSpotCell.count === 1 ? '' : 's'} ·{' '}
              {formatCompactBytes(summary.hotSpotCell.bytes)} · Hover any cell for exact breakdown
            </span>
          </>
        ) : (
          <span>No saved scenarios or snapshots recorded in this time window yet.</span>
        )}
      </div>
    </div>
  );
}
