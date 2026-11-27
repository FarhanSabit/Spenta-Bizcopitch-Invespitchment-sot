import {
  InvestorCalculatorScenario,
  UserWorkspaceSnapshot,
} from './LocalPersistenceService';

export type HeatmapHorizon = '24h' | '7d' | '30d';
export type HeatmapMetric = 'bytes' | 'count';
export type HeatmapCategoryKey = 'scenarios' | 'snapshots';

export interface HeatmapBucket {
  index: number;
  label: string;
  rangeLabel: string;
  startMs: number;
  endMs: number;
}

export interface HeatmapCellDatum {
  category: HeatmapCategoryKey;
  categoryLabel: string;
  bucketIndex: number;
  bucketLabel: string;
  rangeLabel: string;
  count: number;
  bytes: number;
  value: number;
  sharePct: number;
  isHotSpot: boolean;
}

export interface StorageHeatmapSummary {
  horizon: HeatmapHorizon;
  metric: HeatmapMetric;
  buckets: HeatmapBucket[];
  cells: HeatmapCellDatum[];
  maxValue: number;
  scenariosTotalCount: number;
  scenariosTotalBytes: number;
  snapshotsTotalCount: number;
  snapshotsTotalBytes: number;
  fastestCategory: HeatmapCategoryKey | 'tied' | 'idle';
  fastestCategorySharePct: number;
  hotSpotCell: HeatmapCellDatum | null;
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

export function formatCompactBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function buildBuckets(horizon: HeatmapHorizon, nowMs: number): HeatmapBucket[] {
  const buckets: HeatmapBucket[] = [];

  if (horizon === '24h') {
    const stepMs = 3 * 3_600_000;
    const endAnchor = nowMs + 1;
    const startAnchor = endAnchor - 8 * stepMs;
    for (let i = 0; i < 8; i++) {
      const startMs = startAnchor + i * stepMs;
      const endMs = startMs + stepMs;
      const startDate = new Date(startMs);
      const endDate = new Date(Math.min(endMs, nowMs));
      const label =
        i === 7
          ? 'Now'
          : startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const rangeLabel = `${startDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })} – ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      buckets.push({ index: i, label, rangeLabel, startMs, endMs });
    }
    return buckets;
  }

  if (horizon === '30d') {
    const stepMs = 5 * 86_400_000;
    const endDay = new Date(nowMs);
    endDay.setHours(23, 59, 59, 999);
    const endAnchor = endDay.getTime() + 1;
    const startAnchor = endAnchor - 6 * stepMs;
    for (let i = 0; i < 6; i++) {
      const startMs = startAnchor + i * stepMs;
      const endMs = startMs + stepMs;
      const d1 = new Date(startMs);
      const d2 = new Date(endMs - 1);
      const label = d2.toLocaleDateString([], { month: 'short', day: 'numeric' });
      const rangeLabel = `${d1.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
      })} – ${d2.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
      buckets.push({ index: i, label, rangeLabel, startMs, endMs });
    }
    return buckets;
  }

  // Default 7d: 7 daily buckets ending today
  const endToday = new Date(nowMs);
  endToday.setHours(23, 59, 59, 999);
  const endAnchor = endToday.getTime() + 1;
  const startAnchor = endAnchor - 7 * 86_400_000;
  for (let i = 0; i < 7; i++) {
    const startMs = startAnchor + i * 86_400_000;
    const endMs = startMs + 86_400_000;
    const d = new Date(startMs);
    const label =
      i === 6 ? 'Today' : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const rangeLabel = d.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    buckets.push({ index: i, label, rangeLabel, startMs, endMs });
  }
  return buckets;
}

export function buildStorageHeatmapData(
  scenarios: InvestorCalculatorScenario[],
  snapshots: UserWorkspaceSnapshot[],
  horizon: HeatmapHorizon,
  metric: HeatmapMetric,
  nowMs: number = Date.now(),
): StorageHeatmapSummary {
  const buckets = buildBuckets(horizon, nowMs);

  const cellGrid: Record<HeatmapCategoryKey, { count: number; bytes: number }[]> = {
    scenarios: buckets.map(() => ({ count: 0, bytes: 0 })),
    snapshots: buckets.map(() => ({ count: 0, bytes: 0 })),
  };

  let scenariosTotalCount = 0;
  let scenariosTotalBytes = 0;
  let snapshotsTotalCount = 0;
  let snapshotsTotalBytes = 0;

  for (const item of scenarios) {
    const ts = Date.parse(item.updatedAt || item.createdAt);
    if (!Number.isFinite(ts)) continue;
    const size = estimateRecordBytes(item);
    const bucketIdx = buckets.findIndex((b) => ts >= b.startMs && ts < b.endMs);
    if (bucketIdx !== -1) {
      cellGrid.scenarios[bucketIdx].count += 1;
      cellGrid.scenarios[bucketIdx].bytes += size;
      scenariosTotalCount += 1;
      scenariosTotalBytes += size;
    }
  }

  for (const snap of snapshots) {
    const ts = Date.parse(snap.updatedAt || snap.createdAt);
    if (!Number.isFinite(ts)) continue;
    const size = estimateRecordBytes(snap);
    const bucketIdx = buckets.findIndex((b) => ts >= b.startMs && ts < b.endMs);
    if (bucketIdx !== -1) {
      cellGrid.snapshots[bucketIdx].count += 1;
      cellGrid.snapshots[bucketIdx].bytes += size;
      snapshotsTotalCount += 1;
      snapshotsTotalBytes += size;
    }
  }

  const totalMetricSum =
    metric === 'bytes'
      ? scenariosTotalBytes + snapshotsTotalBytes
      : scenariosTotalCount + snapshotsTotalCount;

  const categories: Array<{ key: HeatmapCategoryKey; label: string }> = [
    { key: 'scenarios', label: 'Saved Scenarios' },
    { key: 'snapshots', label: 'Workspace Snapshots' },
  ];

  const rawCells: HeatmapCellDatum[] = [];
  let maxValue = 0;
  let hotSpotCell: HeatmapCellDatum | null = null;

  for (const cat of categories) {
    for (const bucket of buckets) {
      const slot = cellGrid[cat.key][bucket.index];
      const value = metric === 'bytes' ? slot.bytes : slot.count;
      const cell: HeatmapCellDatum = {
        category: cat.key,
        categoryLabel: cat.label,
        bucketIndex: bucket.index,
        bucketLabel: bucket.label,
        rangeLabel: bucket.rangeLabel,
        count: slot.count,
        bytes: slot.bytes,
        value,
        sharePct: totalMetricSum > 0 ? (value / totalMetricSum) * 100 : 0,
        isHotSpot: false,
      };
      if (value > maxValue) {
        maxValue = value;
        hotSpotCell = cell;
      }
      rawCells.push(cell);
    }
  }

  if (hotSpotCell && maxValue > 0) {
    for (const cell of rawCells) {
      if (
        cell.category === hotSpotCell.category &&
        cell.bucketIndex === hotSpotCell.bucketIndex
      ) {
        cell.isHotSpot = true;
      }
    }
  } else {
    hotSpotCell = null;
  }

  const scenScore = metric === 'bytes' ? scenariosTotalBytes : scenariosTotalCount;
  const snapScore = metric === 'bytes' ? snapshotsTotalBytes : snapshotsTotalCount;

  let fastestCategory: HeatmapCategoryKey | 'tied' | 'idle' = 'idle';
  let fastestCategorySharePct = 0;

  if (totalMetricSum > 0) {
    if (scenScore > snapScore) {
      fastestCategory = 'scenarios';
      fastestCategorySharePct = (scenScore / totalMetricSum) * 100;
    } else if (snapScore > scenScore) {
      fastestCategory = 'snapshots';
      fastestCategorySharePct = (snapScore / totalMetricSum) * 100;
    } else {
      fastestCategory = 'tied';
      fastestCategorySharePct = 50;
    }
  }

  return {
    horizon,
    metric,
    buckets,
    cells: rawCells,
    maxValue,
    scenariosTotalCount,
    scenariosTotalBytes,
    snapshotsTotalCount,
    snapshotsTotalBytes,
    fastestCategory,
    fastestCategorySharePct,
    hotSpotCell,
  };
}
