import React, { useCallback, useMemo, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Check, Download, PieChart as PieChartIcon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import {
  InvestorCalculatorScenario,
  UserWorkspaceSnapshot,
} from '../utils/LocalPersistenceService';

export interface ScenariosVsSnapshotsDonutProps {
  scenarios: InvestorCalculatorScenario[];
  snapshots: UserWorkspaceSnapshot[];
  totalDbBytes?: number;
}

function estimateRecordBytes(value: unknown): number {
  try {
    const json = JSON.stringify(value);
    if (!json) return 0;
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(json).length;
    }
    return json.length * 2;
  } catch {
    return 0;
  }
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(2)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

export interface DonutCategoryData {
  key: 'scenarios' | 'snapshots';
  name: string;
  bytes: number;
  count: number;
  pctOfTwo: number;
  pctOfTotalDb: number;
  color: string;
  colorDark: string;
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}

export function ScenariosVsSnapshotsDonut({
  scenarios,
  snapshots,
  totalDbBytes = 0,
}: ScenariosVsSnapshotsDonutProps) {
  const { isDark } = useTheme();
  const [exporting, setExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);

  const scenariosBytes = useMemo(() => {
    return scenarios.reduce((sum, item) => sum + estimateRecordBytes(item), 0);
  }, [scenarios]);

  const snapshotsBytes = useMemo(() => {
    return snapshots.reduce((sum, item) => sum + estimateRecordBytes(item), 0);
  }, [snapshots]);

  const combinedBytes = scenariosBytes + snapshotsBytes;

  const chartData = useMemo<DonutCategoryData[]>(() => {
    const scenariosPct = combinedBytes > 0 ? (scenariosBytes / combinedBytes) * 100 : 0;
    const snapshotsPct = combinedBytes > 0 ? (snapshotsBytes / combinedBytes) * 100 : 0;
    const safeTotalDb = Math.max(combinedBytes, totalDbBytes);

    return [
      {
        key: 'scenarios',
        name: 'Scenarios',
        bytes: scenariosBytes,
        count: scenarios.length,
        pctOfTwo: scenariosPct,
        pctOfTotalDb: safeTotalDb > 0 ? (scenariosBytes / safeTotalDb) * 100 : 0,
        color: '#0891B2',
        colorDark: '#22D3EE',
      },
      {
        key: 'snapshots',
        name: 'Workspace Snapshots',
        bytes: snapshotsBytes,
        count: snapshots.length,
        pctOfTwo: snapshotsPct,
        pctOfTotalDb: safeTotalDb > 0 ? (snapshotsBytes / safeTotalDb) * 100 : 0,
        color: '#1C6E46',
        colorDark: '#6FCB9F',
      },
    ];
  }, [combinedBytes, scenarios.length, scenariosBytes, snapshots.length, snapshotsBytes, totalDbBytes]);

  const scenariosColor = isDark ? '#22D3EE' : '#0891B2';
  const snapshotsColor = isDark ? '#6FCB9F' : '#1C6E46';

  const dominantCategory = useMemo(() => {
    if (combinedBytes === 0) return null;
    if (scenariosBytes > snapshotsBytes) {
      const ratio = snapshotsBytes > 0 ? (scenariosBytes / snapshotsBytes).toFixed(1) : null;
      return {
        key: 'scenarios' as const,
        label: 'Scenarios dominate',
        desc: ratio
          ? `Scenarios occupy ${ratio}x more space than Workspace Snapshots (${chartData[0].pctOfTwo.toFixed(1)}%).`
          : `Scenarios occupy 100% of tracked scenario/snapshot disk space.`,
        badgeClass: 'text-[#0891B2] dark:text-[#22D3EE] bg-[#0891B2]/10 dark:bg-[#22D3EE]/15 border-[#0891B2]/30',
      };
    }
    if (snapshotsBytes > scenariosBytes) {
      const ratio = scenariosBytes > 0 ? (snapshotsBytes / scenariosBytes).toFixed(1) : null;
      return {
        key: 'snapshots' as const,
        label: 'Snapshots dominate',
        desc: ratio
          ? `Workspace Snapshots occupy ${ratio}x more space than Scenarios (${chartData[1].pctOfTwo.toFixed(1)}%).`
          : `Workspace Snapshots occupy 100% of tracked scenario/snapshot disk space.`,
        badgeClass: 'text-[#1C6E46] dark:text-[#6FCB9F] bg-[#1C6E46]/10 dark:bg-[#6FCB9F]/15 border-[#1C6E46]/30',
      };
    }
    return {
      key: 'balanced' as const,
      label: 'Even 50/50 balance',
      desc: 'Scenarios and Workspace Snapshots occupy equal disk space.',
      badgeClass: 'text-[#4F46E5] dark:text-[#A5B4FC] bg-[#4F46E5]/10 dark:bg-[#A5B4FC]/15 border-[#4F46E5]/30',
    };
  }, [chartData, combinedBytes, scenariosBytes, snapshotsBytes]);

  // High-Resolution PNG Chart Export Handler
  const handleExportHighResPng = useCallback(() => {
    setExporting(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1600;
      canvas.height = 960;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const bgFill = isDark ? '#0B1020' : '#FAF8F4';
      const cardFill = isDark ? '#141A32' : '#FFFFFF';
      const borderStroke = isDark ? '#232B4A' : '#E4DFD6';
      const primaryText = isDark ? '#E7EBF5' : '#16213A';
      const mutedText = isDark ? '#8E96B0' : '#5F6576';
      const sColor = isDark ? '#22D3EE' : '#0891B2';
      const snapColor = isDark ? '#6FCB9F' : '#1C6E46';

      // 1. Canvas Background
      ctx.fillStyle = bgFill;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Main Card Container
      const cardX = 40;
      const cardY = 40;
      const cardW = 1520;
      const cardH = 880;
      const cardRadius = 24;

      ctx.fillStyle = cardFill;
      ctx.strokeStyle = borderStroke;
      ctx.lineWidth = 2;
      drawRoundRect(ctx, cardX, cardY, cardW, cardH, cardRadius);
      ctx.fill();
      ctx.stroke();

      // 3. Header Section
      ctx.fillStyle = isDark ? '#8FA6E8' : '#1F3863';
      ctx.font = '600 15px "JetBrains Mono", monospace';
      ctx.fillText('SPENTA SOVEREIGN OS · OFFLINE PERSISTENCE STORAGE', cardX + 44, cardY + 54);

      ctx.fillStyle = primaryText;
      ctx.font = '700 30px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Scenarios vs. Workspace Snapshots Allocation', cardX + 44, cardY + 98);

      ctx.fillStyle = mutedText;
      ctx.font = '400 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(
        'Visual breakdown measuring persistent disk space share between Saved Scenarios and Workspace Snapshots.',
        cardX + 44,
        cardY + 130,
      );

      // Timestamp & Watermark on the right of header
      const nowIso = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
      ctx.fillStyle = mutedText;
      ctx.font = '500 15px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`Exported: ${nowIso}`, cardX + cardW - 44, cardY + 68);

      if (dominantCategory) {
        ctx.fillStyle = dominantCategory.key === 'scenarios' ? sColor : snapColor;
        ctx.font = '700 16px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(dominantCategory.label.toUpperCase(), cardX + cardW - 44, cardY + 98);
      }
      ctx.textAlign = 'left';

      // Header divider line
      ctx.strokeStyle = borderStroke;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cardX + 44, cardY + 154);
      ctx.lineTo(cardX + cardW - 44, cardY + 154);
      ctx.stroke();

      // 4. Donut Chart (Left Side)
      const centerX = cardX + 340;
      const centerY = cardY + 470;
      const outerRadius = 175;
      const innerRadius = 115;

      if (combinedBytes <= 0) {
        ctx.strokeStyle = isDark ? '#232B4A' : '#E4DFD6';
        ctx.lineWidth = outerRadius - innerRadius;
        ctx.beginPath();
        ctx.arc(centerX, centerY, (outerRadius + innerRadius) / 2, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        const scenariosShare = scenariosBytes / combinedBytes;
        const snapshotsShare = snapshotsBytes / combinedBytes;
        const gapRad = 0.04;
        const startAngle = -Math.PI / 2;

        // Slice 1: Scenarios
        if (scenariosShare > 0) {
          const sliceAngle = scenariosShare * Math.PI * 2;
          ctx.fillStyle = sColor;
          ctx.beginPath();
          ctx.arc(centerX, centerY, outerRadius, startAngle + gapRad, startAngle + sliceAngle - gapRad);
          ctx.arc(centerX, centerY, innerRadius, startAngle + sliceAngle - gapRad, startAngle + gapRad, true);
          ctx.closePath();
          ctx.fill();
        }

        // Slice 2: Snapshots
        if (snapshotsShare > 0) {
          const sliceStart = startAngle + scenariosShare * Math.PI * 2;
          const sliceAngle = snapshotsShare * Math.PI * 2;
          ctx.fillStyle = snapColor;
          ctx.beginPath();
          ctx.arc(centerX, centerY, outerRadius, sliceStart + gapRad, sliceStart + sliceAngle - gapRad);
          ctx.arc(centerX, centerY, innerRadius, sliceStart + sliceAngle - gapRad, sliceStart + gapRad, true);
          ctx.closePath();
          ctx.fill();
        }
      }

      // Donut Center Text
      ctx.textAlign = 'center';
      ctx.fillStyle = mutedText;
      ctx.font = '600 15px "JetBrains Mono", monospace';
      ctx.fillText('COMBINED', centerX, centerY - 24);

      ctx.fillStyle = primaryText;
      ctx.font = '700 34px "JetBrains Mono", monospace';
      ctx.fillText(formatBytes(combinedBytes), centerX, centerY + 18);

      ctx.fillStyle = mutedText;
      ctx.font = '500 15px "JetBrains Mono", monospace';
      ctx.fillText(`${scenarios.length + snapshots.length} items total`, centerX, centerY + 52);
      ctx.textAlign = 'left';

      // 5. Category Details (Right Side)
      const rightX = cardX + 660;
      const rightW = cardW - 704;

      // Box 1: Saved Scenarios
      const box1Y = cardY + 195;
      const boxH = 175;
      ctx.fillStyle = isDark ? '#0F1529' : '#FAF8F4';
      ctx.strokeStyle = borderStroke;
      ctx.lineWidth = 1.5;
      drawRoundRect(ctx, rightX, box1Y, rightW, boxH, 16);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = sColor;
      drawRoundRect(ctx, rightX + 24, box1Y + 24, 18, 18, 4);
      ctx.fill();

      ctx.fillStyle = primaryText;
      ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Saved Scenarios', rightX + 54, box1Y + 40);

      ctx.fillStyle = mutedText;
      ctx.font = '500 15px "JetBrains Mono", monospace';
      ctx.fillText(`(${scenarios.length} saved)`, rightX + 235, box1Y + 40);

      ctx.textAlign = 'right';
      ctx.fillStyle = sColor;
      ctx.font = '700 30px "JetBrains Mono", monospace';
      ctx.fillText(`${chartData[0].pctOfTwo.toFixed(1)}%`, rightX + rightW - 24, box1Y + 42);
      ctx.textAlign = 'left';

      const barW = rightW - 48;
      ctx.fillStyle = isDark ? '#232B4A' : '#E4DFD6';
      drawRoundRect(ctx, rightX + 24, box1Y + 68, barW, 12, 6);
      ctx.fill();

      if (chartData[0].pctOfTwo > 0) {
        ctx.fillStyle = sColor;
        drawRoundRect(ctx, rightX + 24, box1Y + 68, (barW * chartData[0].pctOfTwo) / 100, 12, 6);
        ctx.fill();
      }

      ctx.fillStyle = mutedText;
      ctx.font = '500 15px "JetBrains Mono", monospace';
      ctx.fillText(`Footprint: `, rightX + 24, box1Y + 124);
      ctx.fillStyle = primaryText;
      ctx.font = '700 15px "JetBrains Mono", monospace';
      ctx.fillText(formatBytes(scenariosBytes), rightX + 125, box1Y + 124);

      ctx.textAlign = 'right';
      ctx.fillStyle = mutedText;
      ctx.font = '500 15px "JetBrains Mono", monospace';
      ctx.fillText(`${chartData[0].pctOfTotalDb.toFixed(1)}% of total IndexedDB`, rightX + rightW - 24, box1Y + 124);
      ctx.textAlign = 'left';

      // Box 2: Workspace Snapshots
      const box2Y = box1Y + boxH + 20;
      ctx.fillStyle = isDark ? '#0F1529' : '#FAF8F4';
      ctx.strokeStyle = borderStroke;
      ctx.lineWidth = 1.5;
      drawRoundRect(ctx, rightX, box2Y, rightW, boxH, 16);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = snapColor;
      drawRoundRect(ctx, rightX + 24, box2Y + 24, 18, 18, 4);
      ctx.fill();

      ctx.fillStyle = primaryText;
      ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Workspace Snapshots', rightX + 54, box2Y + 40);

      ctx.fillStyle = mutedText;
      ctx.font = '500 15px "JetBrains Mono", monospace';
      ctx.fillText(`(${snapshots.length} saved)`, rightX + 295, box2Y + 40);

      ctx.textAlign = 'right';
      ctx.fillStyle = snapColor;
      ctx.font = '700 30px "JetBrains Mono", monospace';
      ctx.fillText(`${chartData[1].pctOfTwo.toFixed(1)}%`, rightX + rightW - 24, box2Y + 42);
      ctx.textAlign = 'left';

      ctx.fillStyle = isDark ? '#232B4A' : '#E4DFD6';
      drawRoundRect(ctx, rightX + 24, box2Y + 68, barW, 12, 6);
      ctx.fill();

      if (chartData[1].pctOfTwo > 0) {
        ctx.fillStyle = snapColor;
        drawRoundRect(ctx, rightX + 24, box2Y + 68, (barW * chartData[1].pctOfTwo) / 100, 12, 6);
        ctx.fill();
      }

      ctx.fillStyle = mutedText;
      ctx.font = '500 15px "JetBrains Mono", monospace';
      ctx.fillText(`Footprint: `, rightX + 24, box2Y + 124);
      ctx.fillStyle = primaryText;
      ctx.font = '700 15px "JetBrains Mono", monospace';
      ctx.fillText(formatBytes(snapshotsBytes), rightX + 125, box2Y + 124);

      ctx.textAlign = 'right';
      ctx.fillStyle = mutedText;
      ctx.font = '500 15px "JetBrains Mono", monospace';
      ctx.fillText(`${chartData[1].pctOfTotalDb.toFixed(1)}% of total IndexedDB`, rightX + rightW - 24, box2Y + 124);
      ctx.textAlign = 'left';

      // Box 3: Insight Summary Callout
      const box3Y = box2Y + boxH + 20;
      const box3H = 80;
      ctx.fillStyle = isDark ? '#141A32' : '#FFFFFF';
      ctx.strokeStyle = borderStroke;
      ctx.lineWidth = 1;
      drawRoundRect(ctx, rightX, box3Y, rightW, box3H, 14);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = primaryText;
      ctx.font = '600 15px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(
        dominantCategory ? dominantCategory.desc : 'No stored items recorded yet in this window.',
        rightX + 24,
        box3Y + 34,
      );

      ctx.fillStyle = mutedText;
      ctx.font = '500 13.5px "JetBrains Mono", monospace';
      ctx.fillText(
        `${formatBytes(combinedBytes)} combined · ${formatBytes(totalDbBytes || combinedBytes)} total browser IndexedDB footprint`,
        rightX + 24,
        box3Y + 58,
      );

      // 6. Footer Line
      const footerY = cardY + cardH - 28;
      ctx.fillStyle = mutedText;
      ctx.font = '500 13px "JetBrains Mono", monospace';
      ctx.fillText('Spenta Sovereign OS · Offline-First Persistence Telemetry · LocalPersistenceService', cardX + 44, footerY);

      // 7. Trigger File Download
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      const dateStamp = new Date().toISOString().slice(0, 10);
      a.download = `spenta-storage-donut-breakdown-${dateStamp}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2500);
    } finally {
      setExporting(false);
    }
  }, [
    chartData,
    combinedBytes,
    dominantCategory,
    isDark,
    scenarios.length,
    scenariosBytes,
    snapshots.length,
    snapshotsBytes,
    totalDbBytes,
  ]);

  // Recharts requires non-zero values to render slices; if both 0, show placeholder
  const hasData = combinedBytes > 0;
  const pieDisplayData = hasData
    ? chartData.map((d) => ({
        ...d,
        displayValue: d.bytes > 0 ? d.bytes : 0.0001,
      }))
    : [
        {
          key: 'idle',
          name: 'No Data',
          displayValue: 1,
          color: isDark ? '#232B4A' : '#E4DFD6',
          colorDark: '#232B4A',
          bytes: 0,
          count: 0,
          pctOfTwo: 0,
          pctOfTotalDb: 0,
        },
      ];

  return (
    <div
      data-testid="scenarios-snapshots-donut-card"
      className="rounded-2xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] p-5 space-y-4"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E4DFD6] dark:border-[#232B4A]">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-[#0891B2] dark:text-[#22D3EE]" strokeWidth={1.75} />
            <h3 className="text-sm font-bold text-[#16213A] dark:text-[#E7EBF5]">
              Scenarios vs. Workspace Snapshots Allocation
            </h3>
          </div>
          <p className="text-xs text-[#5F6576] dark:text-[#8E96B0]">
            Recharts donut breakdown measuring disk space share occupied by financial modeling Scenarios vs. session Workspace Snapshots.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
          {dominantCategory && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${dominantCategory.badgeClass}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              <span>{dominantCategory.label}</span>
            </span>
          )}

          {/* Export Chart Button next to the storage donut chart */}
          <button
            type="button"
            data-testid="export-donut-chart-btn"
            onClick={handleExportHighResPng}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-semibold border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] text-[#16213A] dark:text-[#E7EBF5] hover:border-[#0891B2] dark:hover:border-[#22D3EE] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60"
            title="Download visual disk usage breakdown as a high-resolution PNG image"
          >
            {exportSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#1C6E46] dark:text-[#6FCB9F]" strokeWidth={2} />
                <span className="text-[#1C6E46] dark:text-[#6FCB9F]">Chart Exported!</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>{exporting ? 'Exporting…' : 'Export Chart'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Grid: Recharts Donut (Left) + Detailed Category Cards (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Donut Chart Viewport */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center">
          <div className="relative w-full max-w-[280px] h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieDisplayData}
                  dataKey="displayValue"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={68}
                  outerRadius={98}
                  paddingAngle={hasData ? 3 : 0}
                  stroke="none"
                  isAnimationActive={true}
                >
                  {hasData ? (
                    <>
                      <Cell
                        key="scenarios"
                        data-testid="donut-scenarios-slice"
                        fill={isDark ? chartData[0].colorDark : chartData[0].color}
                      />
                      <Cell
                        key="snapshots"
                        data-testid="donut-snapshots-slice"
                        fill={isDark ? chartData[1].colorDark : chartData[1].color}
                      />
                    </>
                  ) : (
                    <Cell fill={isDark ? '#232B4A' : '#E4DFD6'} />
                  )}
                </Pie>
                {hasData && (
                  <Tooltip
                    formatter={(val, _name, item) => {
                      const payload = item?.payload as DonutCategoryData;
                      if (!payload) return ['-', 'Category'];
                      return [
                        `Size: ${formatBytes(payload.bytes)} · ${payload.pctOfTotalDb.toFixed(2)}% of browser quota (${payload.count} item${payload.count === 1 ? '' : 's'})`,
                        payload.name,
                      ];
                    }}
                    contentStyle={{
                      backgroundColor: isDark ? '#0F1529' : '#FFFFFF',
                      borderColor: isDark ? '#232B4A' : '#E4DFD6',
                      color: isDark ? '#E7EBF5' : '#16213A',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  />
                )}
              </PieChart>
            </ResponsiveContainer>

            {/* Centered Donut Summary Label */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-mono text-[#5F6576] dark:text-[#8E96B0] uppercase tracking-wider">
                Combined
              </span>
              <span
                data-testid="donut-combined-bytes"
                className="text-base font-bold font-mono tabular-nums text-[#16213A] dark:text-[#E7EBF5] mt-0.5"
              >
                {formatBytes(combinedBytes)}
              </span>
              <span className="text-[10px] font-mono text-[#5F6576] dark:text-[#8E96B0]">
                {scenarios.length + snapshots.length} items
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Category Stat Cards (Right) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Scenarios Category Card */}
          <div
            data-testid="donut-scenarios-stat"
            className="p-4 rounded-xl border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-xs shrink-0"
                  style={{ backgroundColor: scenariosColor }}
                />
                <span className="text-xs font-bold text-[#16213A] dark:text-[#E7EBF5]">
                  Scenarios
                </span>
                <span className="text-[11px] font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0]">
                  ({scenarios.length} saved)
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold font-mono tabular-nums text-[#0891B2] dark:text-[#22D3EE]">
                  {chartData[0].pctOfTwo.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Horizontal Proportion Bar */}
            <div className="h-1.5 w-full rounded-full bg-[#E4DFD6] dark:bg-[#232B4A] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${chartData[0].pctOfTwo}%`,
                  backgroundColor: scenariosColor,
                }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0]">
              <span>
                Footprint: <strong className="text-[#16213A] dark:text-[#E7EBF5]">{formatBytes(scenariosBytes)}</strong>
              </span>
              <span>{chartData[0].pctOfTotalDb.toFixed(1)}% of total IndexedDB</span>
            </div>
          </div>

          {/* Workspace Snapshots Category Card */}
          <div
            data-testid="donut-snapshots-stat"
            className="p-4 rounded-xl border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-xs shrink-0"
                  style={{ backgroundColor: snapshotsColor }}
                />
                <span className="text-xs font-bold text-[#16213A] dark:text-[#E7EBF5]">
                  Workspace Snapshots
                </span>
                <span className="text-[11px] font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0]">
                  ({snapshots.length} saved)
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold font-mono tabular-nums text-[#1C6E46] dark:text-[#6FCB9F]">
                  {chartData[1].pctOfTwo.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Horizontal Proportion Bar */}
            <div className="h-1.5 w-full rounded-full bg-[#E4DFD6] dark:bg-[#232B4A] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${chartData[1].pctOfTwo}%`,
                  backgroundColor: snapshotsColor,
                }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0]">
              <span>
                Footprint: <strong className="text-[#16213A] dark:text-[#E7EBF5]">{formatBytes(snapshotsBytes)}</strong>
              </span>
              <span>{chartData[1].pctOfTotalDb.toFixed(1)}% of total IndexedDB</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-footer explanation */}
      {dominantCategory && (
        <div className="pt-2 border-t border-[#E4DFD6] dark:border-[#232B4A] text-[11px] text-[#5F6576] dark:text-[#8E96B0] flex items-center justify-between gap-2">
          <span>{dominantCategory.desc}</span>
          <span className="font-mono tabular-nums shrink-0">
            {formatBytes(combinedBytes)} of {formatBytes(totalDbBytes || combinedBytes)} total DB
          </span>
        </div>
      )}
    </div>
  );
}
