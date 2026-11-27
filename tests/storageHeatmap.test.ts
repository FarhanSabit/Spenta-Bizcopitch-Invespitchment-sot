import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStorageHeatmapData, formatCompactBytes } from '../src/utils/storageHeatmap';
import {
  InvestorCalculatorScenario,
  UserWorkspaceSnapshot,
} from '../src/utils/LocalPersistenceService';

const BASE_CALC_STATE = {
  scenario: 'conservative' as const,
  growthMode: 'conservative' as const,
  fxRate: 122.61,
  taxRate: 25,
  exitMultiple: 10,
  dilutionPct: 0,
  investmentK: 500,
  horizonYears: 5,
  compareGrowthScenarios: false,
  projectedChartMetric: 'value' as const,
  subTab: 'pnl' as const,
  mixPreset: 'fy31' as const,
  mixScopeWeights: {
    one_time_builds: 24,
    recurring_saas: 44,
    managed_retainers: 14,
    ip_royalties: 12,
    captive_ecosystem: 6,
  },
  mixOpexRatioPct: 24,
};

test('buildStorageHeatmapData detects fastest-growing category and peak hot-spot cell', () => {
  const nowMs = Date.UTC(2026, 10, 27, 12, 0, 0);
  const oneDayMs = 86_400_000;

  const scenarios: InvestorCalculatorScenario[] = [
    {
      id: 'sc_1',
      name: 'Base Case',
      state: BASE_CALC_STATE,
      createdAt: new Date(nowMs - 2 * oneDayMs).toISOString(),
      updatedAt: new Date(nowMs - 2 * oneDayMs).toISOString(),
    },
  ];

  const snapshots: UserWorkspaceSnapshot[] = [
    {
      id: 'ws_1',
      name: 'Fintech Stack v1',
      activeTab: 'App Vault',
      selectedIds: ['icr_ops', 'genai_bi', 'mis_erp'],
      deploymentTarget: 'on-prem',
      hitlConfidence: 0.91,
      calculatorState: BASE_CALC_STATE,
      createdAt: new Date(nowMs - 3600_000).toISOString(),
      updatedAt: new Date(nowMs - 3600_000).toISOString(),
    },
    {
      id: 'ws_2',
      name: 'Air-Gapped Sovereign Stack v2',
      activeTab: 'Spenta Core',
      selectedIds: ['icr_ops', 'genai_bi', 'mis_erp', 'cyber_sla', 'prime_ocr'],
      deploymentTarget: 'air-gapped',
      hitlConfidence: 0.94,
      calculatorState: BASE_CALC_STATE,
      createdAt: new Date(nowMs - 1800_000).toISOString(),
      updatedAt: new Date(nowMs - 1800_000).toISOString(),
    },
  ];

  const byteHeatmap = buildStorageHeatmapData(scenarios, snapshots, '7d', 'bytes', nowMs);
  assert.equal(byteHeatmap.buckets.length, 7);
  assert.equal(byteHeatmap.cells.length, 14);
  assert.equal(byteHeatmap.scenariosTotalCount, 1);
  assert.equal(byteHeatmap.snapshotsTotalCount, 2);
  assert.equal(byteHeatmap.fastestCategory, 'snapshots');
  assert.ok(byteHeatmap.fastestCategorySharePct > 50);
  assert.ok(byteHeatmap.hotSpotCell);
  assert.equal(byteHeatmap.hotSpotCell.category, 'snapshots');
  assert.equal(byteHeatmap.hotSpotCell.bucketLabel, 'Today');
  assert.equal(byteHeatmap.hotSpotCell.count, 2);
  assert.equal(byteHeatmap.hotSpotCell.isHotSpot, true);

  const countHeatmap = buildStorageHeatmapData(scenarios, snapshots, '24h', 'count', nowMs);
  assert.equal(countHeatmap.buckets.length, 8);
  assert.equal(countHeatmap.scenariosTotalCount, 0);
  assert.equal(countHeatmap.snapshotsTotalCount, 2);
  assert.equal(countHeatmap.fastestCategory, 'snapshots');
  assert.equal(countHeatmap.fastestCategorySharePct, 100);
});

test('buildStorageHeatmapData handles idle window cleanly with no hot-spot', () => {
  const nowMs = Date.UTC(2026, 10, 27, 12, 0, 0);
  const idle = buildStorageHeatmapData([], [], '30d', 'bytes', nowMs);
  assert.equal(idle.buckets.length, 6);
  assert.equal(idle.maxValue, 0);
  assert.equal(idle.fastestCategory, 'idle');
  assert.equal(idle.hotSpotCell, null);
});

test('formatCompactBytes formats bytes, KB, and MB accurately', () => {
  assert.equal(formatCompactBytes(0), '0 B');
  assert.equal(formatCompactBytes(512), '512 B');
  assert.equal(formatCompactBytes(2048), '2.0 KB');
  assert.equal(formatCompactBytes(2 * 1024 * 1024), '2.00 MB');
});

