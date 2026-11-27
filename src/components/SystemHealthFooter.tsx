import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Cpu,
  RefreshCw,
  RotateCcw,
  X,
} from 'lucide-react';
import { useStack } from '../store/StackContext';
import { SystemHealthStatus } from '../utils/performanceMonitor';

function formatMegabytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) return 'N/A';
  const mb = bytes / (1024 * 1024);
  if (mb >= 100) return `${mb.toFixed(0)} MB`;
  return `${mb.toFixed(1)} MB`;
}

function formatSignedMegabytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) return '—';
  const sign = bytes > 0 ? '+' : bytes < 0 ? '−' : '';
  const absMb = Math.abs(bytes) / (1024 * 1024);
  return `${sign}${absMb.toFixed(2)} MB`;
}

function formatUptime(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  if (mins === 0) return `${secs}s`;
  const hrs = Math.floor(mins / 60);
  if (hrs === 0) return `${mins}m ${secs}s`;
  return `${hrs}h ${mins % 60}m`;
}

function getStatusPresentation(status: SystemHealthStatus): {
  label: string;
  textClass: string;
} {
  if (status === 'degraded') {
    return {
      label: 'Degraded',
      textClass: 'text-[#B91C1C] dark:text-[#FCA5A5]',
    };
  }
  if (status === 'elevated') {
    return {
      label: 'Elevated',
      textClass: 'text-[#B45309] dark:text-[#FCD34D]',
    };
  }
  return {
    label: 'Nominal',
    textClass: 'text-[#1C6E46] dark:text-[#6FCB9F]',
  };
}

export function SystemHealthFooter() {
  const { isInternalDeveloper, setInternalDeveloperMode, performanceMonitor } = useStack();
  const [expanded, setExpanded] = useState<boolean>(false);
  const [summary, setSummary] = useState(() => performanceMonitor.getSnapshot());

  useEffect(() => {
    if (!isInternalDeveloper) return;
    setSummary(performanceMonitor.getSnapshot());
    const unsubscribe = performanceMonitor.subscribe(() => {
      setSummary(performanceMonitor.getSnapshot());
    });
    return unsubscribe;
  }, [isInternalDeveloper, performanceMonitor]);

  const heapSparklinePath = useMemo(() => {
    const validPoints = summary.memoryHistory.filter(
      (pt): pt is { timestamp: number; usedJSHeapBytes: number; domNodeCount: number | null } =>
        pt.usedJSHeapBytes !== null && Number.isFinite(pt.usedJSHeapBytes),
    );
    if (validPoints.length < 2) return null;

    const width = 160;
    const height = 28;
    const values = validPoints.map((p) => p.usedJSHeapBytes);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(1, max - min);

    return validPoints
      .map((pt, idx) => {
        const x = (idx / (validPoints.length - 1)) * width;
        const y = height - 3 - ((pt.usedJSHeapBytes - min) / span) * (height - 6);
        return `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [summary.memoryHistory]);

  if (!isInternalDeveloper) {
    return null;
  }

  const statusMeta = getStatusPresentation(summary.status);
  const { memory } = summary;

  return (
    <div
      data-testid="system-health-footer"
      aria-label="Internal developer system health telemetry"
      className="w-full border-t border-[#E4DFD6] dark:border-[#232B4A] pt-3 mt-3"
    >
      {/* Subtle 1-Line Internal Developer Summary Strip */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[11px] font-mono">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
          <span className="inline-flex items-center gap-1.5 font-sans font-semibold text-[#16213A] dark:text-[#E7EBF5]">
            <Activity className="w-3.5 h-3.5 text-[#1F3863] dark:text-[#8FA6E8]" strokeWidth={1.75} />
            <span>System Health</span>
          </span>
          <span className="text-[#CFC8BC] dark:text-[#333F69]" aria-hidden="true">
            ·
          </span>
          <span className="text-[#5F6576] dark:text-[#8E96B0]">Internal Dev</span>
          <span className="text-[#CFC8BC] dark:text-[#333F69]" aria-hidden="true">
            ·
          </span>
          <span className={`font-semibold ${statusMeta.textClass}`} data-testid="system-health-status">
            {statusMeta.label}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 tabular-nums text-[#5F6576] dark:text-[#8E96B0]">
          <span data-testid="system-health-avg-render">
            Render avg{' '}
            <strong className="text-[#16213A] dark:text-[#E7EBF5]">
              {summary.totalRenders > 0 ? `${summary.avgRenderMs.toFixed(2)} ms` : '—'}
            </strong>
          </span>
          <span className="text-[#CFC8BC] dark:text-[#333F69]" aria-hidden="true">
            ·
          </span>
          <span>
            P95{' '}
            <strong className="text-[#16213A] dark:text-[#E7EBF5]">
              {summary.totalRenders > 0 ? `${summary.p95RenderMs.toFixed(2)} ms` : '—'}
            </strong>
          </span>
          <span className="text-[#CFC8BC] dark:text-[#333F69]" aria-hidden="true">
            ·
          </span>
          <span data-testid="system-health-memory-summary">
            {memory.supported ? (
              <>
                Heap{' '}
                <strong className="text-[#16213A] dark:text-[#E7EBF5]">
                  {formatMegabytes(memory.usedJSHeapBytes)}
                </strong>{' '}
                / {formatMegabytes(memory.jsHeapLimitBytes)}
              </>
            ) : (
              <>
                DOM{' '}
                <strong className="text-[#16213A] dark:text-[#E7EBF5]">
                  {memory.domNodeCount !== null ? memory.domNodeCount.toLocaleString() : '—'}
                </strong>{' '}
                nodes
              </>
            )}
          </span>
          <span className="text-[#CFC8BC] dark:text-[#333F69]" aria-hidden="true">
            ·
          </span>
          <span>
            <strong className="text-[#16213A] dark:text-[#E7EBF5]">
              {summary.trackedComponents}
            </strong>{' '}
            tracked
          </span>

          <div className="flex items-center gap-1.5 ml-1">
            <button
              type="button"
              data-testid="system-health-toggle-btn"
              aria-expanded={expanded}
              onClick={() => setExpanded((prev) => !prev)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[#E4DFD6] dark:border-[#232B4A] bg-white/80 dark:bg-[#141A32] text-[#16213A] dark:text-[#E7EBF5] hover:border-[#1F3863] dark:hover:border-[#8FA6E8] font-sans text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>{expanded ? 'Collapse' : 'Inspect'}</span>
              {expanded ? (
                <ChevronDown className="w-3 h-3" strokeWidth={1.75} />
              ) : (
                <ChevronUp className="w-3 h-3" strokeWidth={1.75} />
              )}
            </button>
            <button
              type="button"
              data-testid="system-health-dismiss-btn"
              onClick={() => setInternalDeveloperMode(false)}
              title="Hide internal developer system health dashboard (Ctrl+Shift+D to restore)"
              aria-label="Hide internal developer system health dashboard"
              className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[#5F6576] dark:text-[#8E96B0] hover:text-[#16213A] dark:hover:text-[#E7EBF5] hover:bg-[#E4DFD6]/50 dark:hover:bg-[#232B4A]/60 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Internal Developer System Health Console */}
      {expanded && (
        <div
          data-testid="system-health-drawer"
          className="mt-3 rounded-xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] p-4 space-y-4"
        >
          {/* Console Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E4DFD6] dark:border-[#232B4A]">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5]">
                <Cpu className="w-3.5 h-3.5 text-[#1F3863] dark:text-[#8FA6E8]" strokeWidth={1.75} />
                <span>Runtime System Health (StackProvider Profiler)</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0]">
                <span>Uptime {formatUptime(summary.uptimeMs)}</span>
                <span aria-hidden="true">·</span>
                <span>{summary.totalRenders} total commits</span>
                <span aria-hidden="true">·</span>
                <span>{summary.slowRenders} slow (&gt;{summary.slowThresholdMs} ms)</span>
                <span aria-hidden="true">·</span>
                <span>Ctrl+Shift+D toggle</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                data-testid="system-health-sample-btn"
                onClick={() => {
                  performanceMonitor.sampleMemory(true);
                  setSummary(performanceMonitor.getSnapshot());
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] text-[#16213A] dark:text-[#E7EBF5] hover:border-[#1F3863] dark:hover:border-[#8FA6E8] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" strokeWidth={1.75} />
                <span>Sample Memory</span>
              </button>
              <button
                type="button"
                data-testid="system-health-reset-btn"
                onClick={() => {
                  performanceMonitor.reset();
                  setSummary(performanceMonitor.getSnapshot());
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] text-[#16213A] dark:text-[#E7EBF5] hover:border-[#B91C1C] dark:hover:border-[#FCA5A5] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" strokeWidth={1.75} />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* 4-Column Metric Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529]">
              <div className="text-[11px] text-[#5F6576] dark:text-[#8E96B0]">Mean Render Time</div>
              <div className="mt-1 text-lg font-bold font-mono tabular-nums text-[#16213A] dark:text-[#E7EBF5]">
                {summary.totalRenders > 0 ? `${summary.avgRenderMs.toFixed(2)} ms` : '0.00 ms'}
              </div>
              <div className="mt-0.5 text-[11px] font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0] truncate">
                P95 {summary.p95RenderMs.toFixed(2)} ms
                {summary.hottestComponentId ? ` · Top: ${summary.hottestComponentId}` : ''}
              </div>
            </div>

            <div className="p-3 rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529]">
              <div className="text-[11px] text-[#5F6576] dark:text-[#8E96B0]">Frame Budget (&gt;16.6 ms)</div>
              <div
                className={`mt-1 text-lg font-bold font-mono tabular-nums ${
                  summary.slowRenders > 0
                    ? 'text-[#B45309] dark:text-[#FCD34D]'
                    : 'text-[#1C6E46] dark:text-[#6FCB9F]'
                }`}
              >
                {summary.slowRenders} slow
              </div>
              <div className="mt-0.5 text-[11px] font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0]">
                {summary.totalRenders > 0
                  ? `${((1 - summary.slowRenders / summary.totalRenders) * 100).toFixed(1)}% within 60fps`
                  : 'Waiting for commits'}
              </div>
            </div>

            <div className="p-3 rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529]">
              <div className="flex items-center justify-between gap-2 text-[11px] text-[#5F6576] dark:text-[#8E96B0]">
                <span>JS Heap Usage</span>
                {heapSparklinePath && (
                  <svg
                    width="72"
                    height="18"
                    viewBox="0 0 160 28"
                    aria-label="JS heap trend"
                    className="shrink-0 text-[#1F3863] dark:text-[#8FA6E8]"
                  >
                    <path
                      d={heapSparklinePath}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <div className="mt-1 text-lg font-bold font-mono tabular-nums text-[#16213A] dark:text-[#E7EBF5]">
                {memory.supported ? formatMegabytes(memory.usedJSHeapBytes) : 'Unavailable'}
              </div>
              <div className="mt-0.5 text-[11px] font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0] truncate">
                {memory.supported
                  ? `Peak ${formatMegabytes(memory.peakUsedBytes)} · Δ ${formatSignedMegabytes(memory.deltaFromBaselineBytes)}`
                  : 'Browser hides performance.memory'}
              </div>
              {memory.supported && memory.heapUsagePct !== null && (
                <div className="mt-2 h-1 w-full rounded-full bg-[#E4DFD6] dark:bg-[#232B4A] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      memory.heapUsagePct > 85
                        ? 'bg-[#DC2626]'
                        : memory.heapUsagePct > 70
                          ? 'bg-[#D97706]'
                          : 'bg-[#1C6E46] dark:bg-[#6FCB9F]'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(2, memory.heapUsagePct))}%` }}
                  />
                </div>
              )}
            </div>

            <div className="p-3 rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529]">
              <div className="text-[11px] text-[#5F6576] dark:text-[#8E96B0]">DOM &amp; Profiler Scope</div>
              <div className="mt-1 text-lg font-bold font-mono tabular-nums text-[#16213A] dark:text-[#E7EBF5]">
                {memory.domNodeCount !== null ? memory.domNodeCount.toLocaleString() : '—'} nodes
              </div>
              <div className="mt-0.5 text-[11px] font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0]">
                {summary.trackedComponents} React profilers
                {memory.deviceMemoryGb !== null ? ` · ${memory.deviceMemoryGb} GB RAM` : ''}
              </div>
            </div>
          </div>

          {/* Per-Component Render Timings Table */}
          <div className="overflow-x-auto rounded-lg border border-[#E4DFD6] dark:border-[#232B4A]">
            {summary.components.length === 0 ? (
              <div className="py-5 px-4 text-center text-xs text-[#5F6576] dark:text-[#8E96B0]">
                No component commits recorded yet. Interact with tabs or views to collect render timing telemetry.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] text-[11px] font-semibold text-[#5F6576] dark:text-[#8E96B0]">
                    <th className="py-2 px-3">Component / View</th>
                    <th className="py-2 px-3">Last Phase</th>
                    <th className="py-2 px-3 text-right">Renders</th>
                    <th className="py-2 px-3 text-right">Last (ms)</th>
                    <th className="py-2 px-3 text-right">Avg (ms)</th>
                    <th className="py-2 px-3 text-right">Max (ms)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4DFD6] dark:divide-[#232B4A] text-[11px]">
                  {summary.components.slice(0, 12).map((row) => {
                    const isSlow = row.maxDurationMs > summary.slowThresholdMs;
                    return (
                      <tr
                        key={row.id}
                        className="h-9 hover:bg-[#FAF8F4] dark:hover:bg-[#0F1529]/70 transition-colors"
                      >
                        <td className="py-1.5 px-3 font-mono font-medium text-[#16213A] dark:text-[#E7EBF5] whitespace-nowrap">
                          {row.id}
                        </td>
                        <td className="py-1.5 px-3 font-mono text-[#5F6576] dark:text-[#8E96B0] whitespace-nowrap">
                          {row.lastPhase}
                          {row.slowRenderCount > 0 ? ` · ${row.slowRenderCount} slow` : ''}
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono tabular-nums text-[#16213A] dark:text-[#E7EBF5]">
                          {row.renderCount}
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0]">
                          {row.lastDurationMs.toFixed(2)}
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono tabular-nums text-[#16213A] dark:text-[#E7EBF5]">
                          {row.avgDurationMs.toFixed(2)}
                        </td>
                        <td
                          className={`py-1.5 px-3 text-right font-mono tabular-nums whitespace-nowrap ${
                            isSlow
                              ? 'font-semibold text-[#B45309] dark:text-[#FCD34D]'
                              : 'text-[#5F6576] dark:text-[#8E96B0]'
                          }`}
                        >
                          {row.maxDurationMs.toFixed(2)}
                          {isSlow ? ' (>16.6ms)' : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
