import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  TrendingUp,
  HardDrive,
  Calendar,
  Layers,
  FileText,
  Info,
} from 'lucide-react';
import {
  InvestorCalculatorScenario,
  UserWorkspaceSnapshot,
} from '../utils/LocalPersistenceService';

interface StorageTrendChartProps {
  scenarios: InvestorCalculatorScenario[];
  snapshots: UserWorkspaceSnapshot[];
  isDark?: boolean;
}

interface TrendDayPoint {
  dateStr: string;
  timestamp: number;
  scenarioBytes: number;
  snapshotBytes: number;
  totalBytes: number;
  scenarioCount: number;
  snapshotCount: number;
}

function formatBytesCompact(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

export function StorageTrendChart({
  scenarios,
  snapshots,
  isDark = false,
}: StorageTrendChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<TrendDayPoint | null>(null);
  const [chartWidth, setChartWidth] = useState<number>(600);

  // Generate 30-day cumulative growth data
  const trendData = useMemo<TrendDayPoint[]>(() => {
    const days: TrendDayPoint[] = [];
    const now = Date.now();
    const oneDayMs = 86_400_000;

    for (let i = 29; i >= 0; i--) {
      const dayAnchor = now - i * oneDayMs;
      const dayDate = new Date(dayAnchor);
      const dateStr = dayDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

      // Count items created on or before this day
      const activeScenarios = scenarios.filter((s) => {
        const t = Date.parse(s.createdAt || s.updatedAt);
        return Number.isFinite(t) ? t <= dayAnchor : true;
      });

      const activeSnapshots = snapshots.filter((sn) => {
        const t = Date.parse(sn.createdAt || sn.updatedAt);
        return Number.isFinite(t) ? t <= dayAnchor : true;
      });

      const scenarioBytes = activeScenarios.reduce(
        (sum, s) => sum + JSON.stringify(s).length * 2,
        0,
      );
      const snapshotBytes = activeSnapshots.reduce(
        (sum, sn) => sum + JSON.stringify(sn).length * 2,
        0,
      );

      days.push({
        dateStr,
        timestamp: dayAnchor,
        scenarioBytes: Math.max(scenarioBytes, activeScenarios.length * 512),
        snapshotBytes: Math.max(snapshotBytes, activeSnapshots.length * 1024),
        totalBytes: Math.max(scenarioBytes + snapshotBytes, (activeScenarios.length + activeSnapshots.length) * 768),
        scenarioCount: activeScenarios.length,
        snapshotCount: activeSnapshots.length,
      });
    }

    return days;
  }, [scenarios, snapshots]);

  // Handle ResizeObserver for responsive SVG width
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 100) {
          setChartWidth(Math.floor(entry.contentRect.width));
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Render D3 Line Chart
  useEffect(() => {
    if (!svgRef.current || trendData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 35, left: 55 };
    const width = Math.max(300, chartWidth);
    const height = 240;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(trendData, (d) => new Date(d.timestamp)) as [Date, Date])
      .range([0, innerWidth]);

    const maxBytes = d3.max(trendData, (d) => d.totalBytes) ?? 1024;
    const yScale = d3
      .scaleLinear()
      .domain([0, maxBytes * 1.15])
      .nice()
      .range([innerHeight, 0]);

    // Grid lines (Y)
    const yAxisGrid = d3
      .axisLeft(yScale)
      .ticks(4)
      .tickSize(-innerWidth)
      .tickFormat(() => '');

    g.append('g')
      .attr('class', 'text-[#E4DFD6] dark:text-[#232B4A] opacity-60')
      .call(yAxisGrid);

    // X Axis
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(6)
      .tickFormat((d) => d3.timeFormat('%b %d')(d as Date));

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('fill', isDark ? '#8E96B0' : '#5F6576')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace');

    // Y Axis
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(4)
      .tickFormat((d) => formatBytesCompact(d as number));

    g.append('g')
      .call(yAxis)
      .selectAll('text')
      .attr('fill', isDark ? '#8E96B0' : '#5F6576')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace');

    // Line generators
    const totalLine = d3
      .line<TrendDayPoint>()
      .x((d) => xScale(new Date(d.timestamp)))
      .y((d) => yScale(d.totalBytes))
      .curve(d3.curveMonotoneX);

    const scenarioLine = d3
      .line<TrendDayPoint>()
      .x((d) => xScale(new Date(d.timestamp)))
      .y((d) => yScale(d.scenarioBytes))
      .curve(d3.curveMonotoneX);

    const snapshotLine = d3
      .line<TrendDayPoint>()
      .x((d) => xScale(new Date(d.timestamp)))
      .y((d) => yScale(d.snapshotBytes))
      .curve(d3.curveMonotoneX);

    // Area generator for total footprint
    const totalArea = d3
      .area<TrendDayPoint>()
      .x((d) => xScale(new Date(d.timestamp)))
      .y0(innerHeight)
      .y1((d) => yScale(d.totalBytes))
      .curve(d3.curveMonotoneX);

    // Append Area Gradient
    const defs = svg.append('defs');
    const gradient = defs
      .append('linearGradient')
      .attr('id', 'storage-trend-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    gradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', isDark ? '#8FA6E8' : '#1F3863')
      .attr('stop-opacity', 0.28);

    gradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', isDark ? '#8FA6E8' : '#1F3863')
      .attr('stop-opacity', 0.0);

    g.append('path')
      .datum(trendData)
      .attr('fill', 'url(#storage-trend-gradient)')
      .attr('d', totalArea);

    // Append Lines
    g.append('path')
      .datum(trendData)
      .attr('fill', 'none')
      .attr('stroke', isDark ? '#8FA6E8' : '#1F3863')
      .attr('stroke-width', 2.5)
      .attr('d', totalLine);

    g.append('path')
      .datum(trendData)
      .attr('fill', 'none')
      .attr('stroke', '#1C6E46')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '3,3')
      .attr('d', scenarioLine);

    g.append('path')
      .datum(trendData)
      .attr('fill', 'none')
      .attr('stroke', '#0891B2')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,2')
      .attr('d', snapshotLine);

    // Interactive Overlay for Hover Tooltip
    const bisectDate = d3.bisector((d: TrendDayPoint) => d.timestamp).left;

    const focusGroup = g.append('g').style('display', 'none');

    focusGroup
      .append('line')
      .attr('class', 'hover-line')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', isDark ? '#8E96B0' : '#5F6576')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2,2');

    const focusDot = focusGroup
      .append('circle')
      .attr('r', 4.5)
      .attr('fill', isDark ? '#8FA6E8' : '#1F3863')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5);

    g.append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')
      .on('mouseover', () => focusGroup.style('display', null))
      .on('mouseout', () => {
        focusGroup.style('display', 'none');
        setHoveredPoint(null);
      })
      .on('mousemove', (event) => {
        const coords = d3.pointer(event);
        const x0 = xScale.invert(coords[0]).getTime();
        const i = bisectDate(trendData, x0, 1);
        const d0 = trendData[i - 1];
        const d1 = trendData[i];
        if (!d0) return;
        const d = d1 && x0 - d0.timestamp > d1.timestamp - x0 ? d1 : d0;

        setHoveredPoint(d);
        const cx = xScale(new Date(d.timestamp));
        const cy = yScale(d.totalBytes);
        focusGroup.select('.hover-line').attr('transform', `translate(${cx},0)`);
        focusDot.attr('cx', cx).attr('cy', cy);
      });
  }, [trendData, chartWidth, isDark]);

  const latestPoint = trendData[trendData.length - 1] ?? {
    totalBytes: 0,
    scenarioBytes: 0,
    snapshotBytes: 0,
  };
  const activeDisplay = hoveredPoint || latestPoint;

  return (
    <div
      data-testid="storage-trend-chart-card"
      className="rounded-2xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] p-5 space-y-4 shadow-xs"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E4DFD6] dark:border-[#232B4A]">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#EBF1FA] dark:bg-[#1A2342] text-[#1F3863] dark:text-[#8FA6E8] flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <h3 className="text-sm font-bold text-[#16213A] dark:text-[#E7EBF5]">
              30-Day Storage Growth & Projection Trend
            </h3>
          </div>
          <p className="text-xs text-[#5F6576] dark:text-[#8E96B0] mt-1">
            Real-time D3.js trend analysis tracking scenario and workspace snapshot accumulation over the last 30 days.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono tabular-nums shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1F3863] dark:bg-[#8FA6E8]" />
            <span className="text-[#16213A] dark:text-[#E7EBF5] font-semibold">
              {formatBytesCompact(activeDisplay.totalBytes)}
            </span>
          </div>
          <span className="text-[#5F6576]" aria-hidden="true">·</span>
          <span className="text-[11px] text-[#5F6576] dark:text-[#8E96B0]">
            {hoveredPoint ? hoveredPoint.dateStr : 'Today (30d Trend)'}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[#5F6576] dark:text-[#8E96B0]">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-[#1F3863] dark:bg-[#8FA6E8]" />
          <span>Total Footprint</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-[#1C6E46]" />
          <span>Scenarios ({activeDisplay.scenarioCount})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-[#0891B2]" />
          <span>Snapshots ({activeDisplay.snapshotCount})</span>
        </div>
        <div className="ml-auto text-[11px] text-[#7D8599] flex items-center gap-1">
          <Info className="w-3 h-3" />
          <span>Hover chart for daily breakdown</span>
        </div>
      </div>

      {/* SVG Container */}
      <div ref={containerRef} className="w-full relative overflow-x-auto">
        <svg ref={svgRef} className="w-full overflow-visible" />
      </div>

      {/* Tooltip Details Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] text-xs font-mono tabular-nums">
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <span className="text-[#5F6576] dark:text-[#8E96B0]">Date:</span>
          <span className="font-semibold text-[#16213A] dark:text-[#E7EBF5]">
            {activeDisplay.dateStr}
          </span>
        </div>
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <span className="text-[#5F6576] dark:text-[#8E96B0]">Scenarios:</span>
          <span className="font-semibold text-[#1C6E46] dark:text-[#6FCB9F]">
            {formatBytesCompact(activeDisplay.scenarioBytes)}
          </span>
        </div>
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <span className="text-[#5F6576] dark:text-[#8E96B0]">Snapshots:</span>
          <span className="font-semibold text-[#0891B2] dark:text-[#22D3EE]">
            {formatBytesCompact(activeDisplay.snapshotBytes)}
          </span>
        </div>
      </div>
    </div>
  );
}
