import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  HardDrive,
  Layers,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  WifiOff,
  X,
} from 'lucide-react';
import { useStack } from '../store/StackContext';
import {
  PersistenceStorageMetrics,
  PersistenceStoreName,
} from '../utils/LocalPersistenceService';

const STORE_METADATA: Record<
  PersistenceStoreName,
  { label: string; description: string }
> = {
  investorCalculator: {
    label: 'Active Investor Calculator',
    description: 'Current ROI, FX, dilution, and revenue-mix model parameters',
  },
  calculatorScenarios: {
    label: 'Saved Calculator Scenarios',
    description: 'User-named financial modeling presets stored offline',
  },
  workspaceSnapshots: {
    label: 'Workspace Snapshots',
    description: 'Auto-saved session checkpoint plus named stack snapshots',
  },
  chartProjections: {
    label: 'Cached Chart Projections',
    description: 'Pre-computed 5-year P&L and MOIC series for offline charts',
  },
  userSession: {
    label: 'Active User Session',
    description: 'Last active portal tab, stack selection, and deployment target',
  },
  diligencePrefs: {
    label: 'Diligence Preferences',
    description: 'Investor persona track, currency mode, and Data Room bookmarks',
  },
  investorFeedback: {
    label: 'Investor Feedback & Notes',
    description: 'Section-level diligence notes, replies, and sentiment ratings',
  },
  contactInquiries: {
    label: 'Offline Founder Inquiries',
    description: 'Drafted SAFE term-sheet and founder outreach inquiries',
  },
};

function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) {
    return '0 B';
  }
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(2)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function formatMegabytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes) || bytes <= 0) {
    return '0.000 MB';
  }
  const mb = bytes / (1024 * 1024);
  if (mb >= 10) return `${mb.toFixed(2)} MB`;
  return `${mb.toFixed(3)} MB`;
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return 'No writes recorded';
  try {
    return new Date(iso).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function StorageManager() {
  const {
    persistenceService,
    syncStatus,
    isOnline,
    lastSyncedAt,
    storageRevision,
    forceSync,
    clearLocalCachedData,
    exportOfflineBackup,
    savedCalculatorScenarios,
    saveCalculatorScenario,
    applyCalculatorScenario,
    deleteCalculatorScenario,
    workspaceSnapshots,
    saveWorkspaceSnapshot,
    restoreWorkspaceSnapshot,
    deleteWorkspaceSnapshot,
    activeTab,
    selectedIds,
  } = useStack();

  const [metrics, setMetrics] = useState<PersistenceStorageMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [confirmClearOpen, setConfirmClearOpen] = useState<boolean>(false);
  const [clearing, setClearing] = useState<boolean>(false);
  const [scenarioNameInput, setScenarioNameInput] = useState<string>('');
  const [snapshotNameInput, setSnapshotNameInput] = useState<string>('');

  const refreshMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const next = await persistenceService.getStorageMetrics();
      setMetrics(next);
    } finally {
      setLoading(false);
    }
  }, [persistenceService]);

  useEffect(() => {
    void refreshMetrics();
  }, [refreshMetrics, storageRevision]);

  useEffect(() => {
    if (!confirmClearOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !clearing) {
        setConfirmClearOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmClearOpen, clearing]);

  const handleConfirmClear = async () => {
    setClearing(true);
    try {
      await clearLocalCachedData();
      setConfirmClearOpen(false);
      const next = await persistenceService.getStorageMetrics();
      setMetrics(next);
    } finally {
      setClearing(false);
    }
  };

  const handleSaveQuickScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    const label =
      scenarioNameInput.trim() ||
      `Scenario ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    await saveCalculatorScenario(label, 'Saved from App Vault Storage Manager');
    setScenarioNameInput('');
  };

  const handleSaveQuickSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    const label =
      snapshotNameInput.trim() ||
      `Workspace ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    await saveWorkspaceSnapshot(label);
    setSnapshotNameInput('');
  };

  const quotaUsagePct = useMemo(() => {
    if (!metrics || !metrics.quotaBytes || metrics.quotaBytes <= 0) return null;
    const effectiveUsage = metrics.usageBytes ?? metrics.estimatedPayloadBytes;
    const rawPct = (effectiveUsage / metrics.quotaBytes) * 100;
    return Math.min(100, Math.max(effectiveUsage > 0 ? 0.5 : 0, rawPct));
  }, [metrics]);

  const scenarioAndWorkspaceCount = useMemo(() => {
    if (!metrics) return 0;
    return metrics.scenarioEntries + metrics.workspaceEntries;
  }, [metrics]);

  return (
    <section
      aria-label="Local IndexedDB Storage Manager"
      className="space-y-5"
    >
      {/* Header & Primary Storage Actions */}
      <div className="rounded-2xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#E4DFD6] dark:border-[#232B4A]">
          <div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#5F6576] dark:text-[#8E96B0]">
              <span className="font-mono text-[#1F3863] dark:text-[#8FA6E8] font-medium">
                {metrics?.dbName ?? 'spenta_sovereign_offline_db'}
              </span>
              <span aria-hidden="true">·</span>
              <span>Schema v{metrics?.dbVersion ?? 3}</span>
              <span aria-hidden="true">·</span>
              <span>
                {metrics?.backend === 'fallback' ? 'LocalStorage Fallback' : 'IndexedDB (idb)'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#16213A] dark:text-[#E7EBF5] tracking-tight mt-1">
              Offline Storage Manager
            </h2>
            <p className="text-xs sm:text-sm text-[#4A5568] dark:text-[#A4ADC6] mt-1 max-w-2xl">
              Inspect browser IndexedDB allocation, review saved investor calculator scenarios and workspace snapshots, run reconciliation, or clear cached local data.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void refreshMetrics()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] text-[#16213A] dark:text-[#E7EBF5] hover:border-[#1F3863] dark:hover:border-[#8FA6E8] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
                strokeWidth={1.6}
              />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => void forceSync()}
              disabled={!isOnline || syncStatus === 'syncing'}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[#1F3863] text-white dark:bg-[#8FA6E8] dark:text-[#0B1020] hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`}
                strokeWidth={1.75}
              />
              <span>Force Sync</span>
            </button>

            <button
              type="button"
              onClick={() => void exportOfflineBackup()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] text-[#16213A] dark:text-[#E7EBF5] hover:border-[#1C6E46] dark:hover:border-[#6FCB9F] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={1.6} />
              <span>Export Backup</span>
            </button>

            <button
              type="button"
              onClick={() => setConfirmClearOpen((open) => !open)}
              aria-label="Clear Cache and purge local application data"
              title="Purge all local IndexedDB stores and cached workspace data"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-[#FECACA] dark:border-[#7F1D1D] bg-[#FEF2F2] dark:bg-[#2A1215] text-[#B91C1C] dark:text-[#FCA5A5] hover:bg-[#FEE2E2] dark:hover:bg-[#3B181C] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.6} />
              <span>Clear Cache</span>
            </button>
          </div>
        </div>

        {/* Confirmation Modal for Clear Cache (No window.confirm/alert) */}
        {confirmClearOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4"
            onClick={() => {
              if (!clearing) setConfirmClearOpen(false);
            }}
          >
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="clear-cache-modal-title"
              aria-describedby="clear-cache-modal-description"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] p-5 sm:p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#FEF2F2] dark:bg-[#2A1215] border border-[#FECACA] dark:border-[#7F1D1D] flex items-center justify-center shrink-0">
                    <AlertTriangle
                      className="w-4 h-4 text-[#DC2626] dark:text-[#FCA5A5]"
                      strokeWidth={1.75}
                    />
                  </div>
                  <div>
                    <h3
                      id="clear-cache-modal-title"
                      className="text-base font-bold text-[#16213A] dark:text-[#E7EBF5]"
                    >
                      Delete Local IndexedDB Cache?
                    </h3>
                    <p
                      id="clear-cache-modal-description"
                      className="mt-1.5 text-xs text-[#4A5568] dark:text-[#A4ADC6] leading-relaxed"
                    >
                      This permanently purges all {metrics?.totalEntries ?? 0} cached entries across {metrics?.storeStats.length ?? 8} object stores in{' '}
                      <span className="font-mono text-[#16213A] dark:text-[#E7EBF5]">
                        {metrics?.dbName ?? 'spenta_sovereign_offline_db'}
                      </span>
                      , including saved investor calculator scenarios, workspace snapshots, diligence notes, and offline inquiries.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmClearOpen(false)}
                  disabled={clearing}
                  aria-label="Close confirmation modal"
                  className="p-1 rounded-md text-[#5F6576] dark:text-[#8E96B0] hover:text-[#16213A] dark:hover:text-[#E7EBF5] cursor-pointer disabled:opacity-50"
                >
                  <X className="w-4 h-4" strokeWidth={1.75} />
                </button>
              </div>

              <div className="mt-5 pt-4 border-t border-[#E4DFD6] dark:border-[#232B4A] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmClearOpen(false)}
                  disabled={clearing}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] text-[#16213A] dark:text-[#E7EBF5] hover:opacity-90 cursor-pointer whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirmClear()}
                  disabled={clearing}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#DC2626] hover:bg-[#B91C1C] text-white cursor-pointer whitespace-nowrap disabled:opacity-60"
                >
                  {clearing ? 'Deleting…' : 'Confirm Clear Cache'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4-Column KPI Summary Strip (Tabular Numerals) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          <div className="p-4 rounded-xl border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529]">
            <div className="flex items-center justify-between text-xs text-[#5F6576] dark:text-[#8E96B0]">
              <span>Database Size (MB)</span>
              <HardDrive className="w-3.5 h-3.5 text-[#1F3863] dark:text-[#8FA6E8]" strokeWidth={1.6} />
            </div>
            <div
              data-testid="storage-usage-bytes"
              className="mt-2 text-2xl font-bold font-mono tabular-nums text-[#16213A] dark:text-[#E7EBF5]"
            >
              {loading && !metrics
                ? '…'
                : formatMegabytes(metrics?.estimatedPayloadBytes ?? 0)}
            </div>
            <div className="mt-1 text-[11px] font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0]">
              {formatBytes(metrics?.estimatedPayloadBytes ?? 0)} ({(metrics?.estimatedPayloadBytes ?? 0).toLocaleString()} bytes)
              {metrics?.usageBytes !== null && metrics?.quotaBytes
                ? ` · Quota ${formatBytes(metrics.quotaBytes)}`
                : ''}
            </div>
            <div className="mt-2.5 h-1.5 w-full rounded-full bg-[#E4DFD6] dark:bg-[#232B4A] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#1F3863] dark:bg-[#8FA6E8] transition-all"
                style={{ width: `${quotaUsagePct ?? (metrics && metrics.estimatedPayloadBytes > 0 ? 4 : 0)}%` }}
              />
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529]">
            <div className="flex items-center justify-between text-xs text-[#5F6576] dark:text-[#8E96B0]">
              <span>Total Saved Scenarios</span>
              <Layers className="w-3.5 h-3.5 text-[#1F3863] dark:text-[#8FA6E8]" strokeWidth={1.6} />
            </div>
            <div
              data-testid="storage-scenario-workspace-entries"
              className="mt-2 text-2xl font-bold font-mono tabular-nums text-[#16213A] dark:text-[#E7EBF5]"
            >
              {loading && !metrics ? '…' : (metrics?.scenarioEntries ?? 0)}
            </div>
            <div className="mt-1 text-[11px] text-[#5F6576] dark:text-[#8E96B0] font-mono tabular-nums">
              {metrics?.workspaceEntries ?? 0} workspace snapshots ({scenarioAndWorkspaceCount} combined)
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529]">
            <div className="flex items-center justify-between text-xs text-[#5F6576] dark:text-[#8E96B0]">
              <span>Total Database Entries</span>
              <Database className="w-3.5 h-3.5 text-[#1C6E46] dark:text-[#6FCB9F]" strokeWidth={1.6} />
            </div>
            <div
              data-testid="storage-total-entries"
              className="mt-2 text-2xl font-bold font-mono tabular-nums text-[#16213A] dark:text-[#E7EBF5]"
            >
              {loading && !metrics ? '…' : (metrics?.totalEntries ?? 0)}
            </div>
            <div className="mt-1 text-[11px] text-[#5F6576] dark:text-[#8E96B0] font-mono tabular-nums">
              Across {metrics?.storeStats.length ?? 8} IndexedDB object stores
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529]">
            <div className="flex items-center justify-between text-xs text-[#5F6576] dark:text-[#8E96B0]">
              <span>Last Sync Timestamp</span>
              {syncStatus === 'offline' ? (
                <WifiOff className="w-3.5 h-3.5 text-[#B91C1C] dark:text-[#FCA5A5]" strokeWidth={1.6} />
              ) : syncStatus === 'syncing' ? (
                <RefreshCw className="w-3.5 h-3.5 text-[#B45309] dark:text-[#FCD34D] animate-spin" strokeWidth={1.6} />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#1C6E46] dark:text-[#6FCB9F]" strokeWidth={1.6} />
              )}
            </div>
            <div
              className={`mt-2 text-2xl font-bold tracking-tight ${
                syncStatus === 'offline'
                  ? 'text-[#B91C1C] dark:text-[#FCA5A5]'
                  : syncStatus === 'syncing'
                    ? 'text-[#B45309] dark:text-[#FCD34D]'
                    : 'text-[#1C6E46] dark:text-[#6FCB9F]'
              }`}
            >
              {syncStatus === 'offline'
                ? 'Offline'
                : syncStatus === 'syncing'
                  ? 'Syncing'
                  : 'Synced'}
            </div>
            <div
              data-testid="storage-last-sync"
              className="mt-1 text-[11px] font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0] truncate"
            >
              {formatTimestamp(lastSyncedAt ?? metrics?.lastUpdatedAt ?? null)}
            </div>
          </div>
        </div>
      </div>

      {/* Store-by-Store IndexedDB Breakdown Table */}
      <div className="rounded-2xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E4DFD6] dark:border-[#232B4A] flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-[#16213A] dark:text-[#E7EBF5]">
              IndexedDB Object Stores
            </h3>
            <p className="text-xs text-[#5F6576] dark:text-[#8E96B0] mt-0.5">
              Live record counts and serialized storage footprint per store in{' '}
              <span className="font-mono">{metrics?.dbName ?? 'spenta_sovereign_offline_db'}</span>.
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0]">
            {metrics?.totalEntries ?? 0} total records · {formatBytes(metrics?.estimatedPayloadBytes ?? 0)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] text-[11px] font-semibold text-[#5F6576] dark:text-[#8E96B0]">
                <th className="py-2.5 px-5">Object Store</th>
                <th className="py-2.5 px-4">Purpose</th>
                <th className="py-2.5 px-4 text-right">Entries</th>
                <th className="py-2.5 px-5 text-right">Payload Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4DFD6] dark:divide-[#232B4A] text-xs">
              {(metrics?.storeStats ?? []).map((row) => {
                const info = STORE_METADATA[row.store];
                return (
                  <tr
                    key={row.store}
                    className="hover:bg-[#FAF8F4] dark:hover:bg-[#0F1529]/70 transition-colors"
                  >
                    <td className="py-2.5 px-5">
                      <div className="font-semibold text-[#16213A] dark:text-[#E7EBF5]">
                        {info.label}
                      </div>
                      <div className="font-mono text-[11px] text-[#5F6576] dark:text-[#8E96B0]">
                        {row.store}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-[#4A5568] dark:text-[#A4ADC6]">
                      {info.description}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-[#16213A] dark:text-[#E7EBF5]">
                      {row.count}
                    </td>
                    <td className="py-2.5 px-5 text-right font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0]">
                      {formatBytes(row.bytes)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Saved Scenarios & Workspace Snapshots Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Saved Scenarios Panel */}
        <div className="rounded-2xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] p-5 flex flex-col">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E4DFD6] dark:border-[#232B4A]">
            <div>
              <h3 className="text-sm font-bold text-[#16213A] dark:text-[#E7EBF5]">
                Saved Investor Scenarios
              </h3>
              <p className="text-xs text-[#5F6576] dark:text-[#8E96B0]">
                Stored via <span className="font-mono">saveScenario</span> /{' '}
                <span className="font-mono">getScenario</span>
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0]">
              {savedCalculatorScenarios.length} saved
            </span>
          </div>

          <form onSubmit={handleSaveQuickScenario} className="mt-3 flex items-center gap-2">
            <input
              type="text"
              value={scenarioNameInput}
              onChange={(e) => setScenarioNameInput(e.target.value)}
              placeholder="Name current calculator scenario…"
              aria-label="New investor scenario name"
              className="flex-1 min-w-0 h-9 px-3 text-xs rounded-lg bg-[#FAF8F4] dark:bg-[#0B1020] border border-[#E4DFD6] dark:border-[#232B4A] text-[#16213A] dark:text-[#E7EBF5] placeholder:text-[#7D8599] focus:outline-none focus:border-[#1F3863] dark:focus:border-[#8FA6E8]"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold bg-[#1F3863] text-white dark:bg-[#8FA6E8] dark:text-[#0B1020] hover:opacity-90 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Save Scenario</span>
            </button>
          </form>

          <div className="mt-3 divide-y divide-[#E4DFD6] dark:divide-[#232B4A] flex-1">
            {savedCalculatorScenarios.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#5F6576] dark:text-[#8E96B0]">
                No named investor scenarios saved yet. Save your active calculator parameters above to benchmark cases offline.
              </div>
            ) : (
              savedCalculatorScenarios.map((item) => (
                <div
                  key={item.id}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5] truncate">
                      {item.name}
                    </div>
                    <div className="text-[11px] font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0] mt-0.5">
                      {item.state.scenario} · ${item.state.investmentK}K · {item.state.exitMultiple}x exit · {formatTimestamp(item.updatedAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => applyCalculatorScenario(item.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] text-[#16213A] dark:text-[#E7EBF5] hover:border-[#1F3863] dark:hover:border-[#8FA6E8] cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" strokeWidth={1.6} />
                      <span>Apply</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteCalculatorScenario(item.id)}
                      aria-label={`Delete scenario ${item.name}`}
                      className="p-1.5 rounded-md text-[#5F6576] dark:text-[#8E96B0] hover:text-[#B91C1C] dark:hover:text-[#FCA5A5] hover:bg-[#FEF2F2] dark:hover:bg-[#2A1215] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.6} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Workspace Snapshots Panel */}
        <div className="rounded-2xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] p-5 flex flex-col">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E4DFD6] dark:border-[#232B4A]">
            <div>
              <h3 className="text-sm font-bold text-[#16213A] dark:text-[#E7EBF5]">
                Saved Workspace Snapshots
              </h3>
              <p className="text-xs text-[#5F6576] dark:text-[#8E96B0]">
                Stored via <span className="font-mono">saveWorkspaceSnapshot</span> /{' '}
                <span className="font-mono">getWorkspaceSnapshot</span>
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0]">
              {workspaceSnapshots.length} named
              {metrics?.autoSavedWorkspacePresent ? ' · 1 auto' : ''}
            </span>
          </div>

          <form onSubmit={handleSaveQuickSnapshot} className="mt-3 flex items-center gap-2">
            <input
              type="text"
              value={snapshotNameInput}
              onChange={(e) => setSnapshotNameInput(e.target.value)}
              placeholder={`Snapshot "${activeTab}" (${selectedIds.length} modules)…`}
              aria-label="New workspace snapshot name"
              className="flex-1 min-w-0 h-9 px-3 text-xs rounded-lg bg-[#FAF8F4] dark:bg-[#0B1020] border border-[#E4DFD6] dark:border-[#232B4A] text-[#16213A] dark:text-[#E7EBF5] placeholder:text-[#7D8599] focus:outline-none focus:border-[#1F3863] dark:focus:border-[#8FA6E8]"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold bg-[#1C6E46] text-white dark:bg-[#6FCB9F] dark:text-[#0B1020] hover:opacity-90 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Save Snapshot</span>
            </button>
          </form>

          <div className="mt-3 divide-y divide-[#E4DFD6] dark:divide-[#232B4A] flex-1">
            {workspaceSnapshots.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#5F6576] dark:text-[#8E96B0]">
                No named workspace snapshots yet. Your active session is auto-saved continuously; create a named checkpoint above to switch stacks cleanly.
              </div>
            ) : (
              workspaceSnapshots.map((snap) => (
                <div
                  key={snap.id}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5] truncate">
                      {snap.name}
                    </div>
                    <div className="text-[11px] font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0] mt-0.5">
                      {snap.activeTab} · {snap.selectedIds.length} modules · {snap.deploymentTarget} · {formatTimestamp(snap.updatedAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => restoreWorkspaceSnapshot(snap.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] text-[#16213A] dark:text-[#E7EBF5] hover:border-[#1C6E46] dark:hover:border-[#6FCB9F] cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" strokeWidth={1.6} />
                      <span>Restore</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteWorkspaceSnapshot(snap.id)}
                      aria-label={`Delete snapshot ${snap.name}`}
                      className="p-1.5 rounded-md text-[#5F6576] dark:text-[#8E96B0] hover:text-[#B91C1C] dark:hover:text-[#FCA5A5] hover:bg-[#FEF2F2] dark:hover:bg-[#2A1215] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.6} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
