import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  Download,
  FileJson,
  FileSpreadsheet,
  HardDrive,
  Layers,
  Mail,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  WifiOff,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme } from '../context/ThemeContext';
import { useStack } from '../store/StackContext';
import {
  OfflineExportSummary,
  PersistenceStorageMetrics,
  PersistenceStoreName,
} from '../utils/LocalPersistenceService';
import {
  exportScenariosToCsv,
  generateSampleScenariosCsv,
  parseScenariosFromCsv,
} from '../utils/scenarioCsv';
import { ScenariosVsSnapshotsDonut } from './ScenariosVsSnapshotsDonut';
import { StorageGrowthHeatmap } from './StorageGrowthHeatmap';
import { SyncEventLogViewer, SyncExportLogRecord } from './SyncEventLogViewer';

const SYNC_EXPORT_LOG_STORAGE_KEY = 'spenta_sync_export_log_v1';

function loadStoredExportLogs(): SyncExportLogRecord[] {
  try {
    const raw = window.localStorage.getItem(SYNC_EXPORT_LOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SyncExportLogRecord[]) : [];
  } catch {
    return [];
  }
}

const STORE_METADATA: Record<
  PersistenceStoreName,
  {
    label: string;
    shortLabel: string;
    description: string;
    swatchClass: string;
    colorLight: string;
    colorDark: string;
  }
> = {
  investorCalculator: {
    label: 'Active Investor Calculator',
    shortLabel: 'Calculator',
    description: 'Current ROI, FX, dilution, and revenue-mix model parameters',
    swatchClass: 'bg-[#1F3863] dark:bg-[#8FA6E8]',
    colorLight: '#1F3863',
    colorDark: '#8FA6E8',
  },
  calculatorScenarios: {
    label: 'Saved Calculator Scenarios',
    shortLabel: 'Scenarios',
    description: 'User-named financial modeling presets stored offline',
    swatchClass: 'bg-[#0891B2] dark:bg-[#22D3EE]',
    colorLight: '#0891B2',
    colorDark: '#22D3EE',
  },
  workspaceSnapshots: {
    label: 'Workspace Snapshots',
    shortLabel: 'Snapshots',
    description: 'Auto-saved session checkpoint plus named stack snapshots',
    swatchClass: 'bg-[#1C6E46] dark:bg-[#6FCB9F]',
    colorLight: '#1C6E46',
    colorDark: '#6FCB9F',
  },
  chartProjections: {
    label: 'Cached Projections & Briefing',
    shortLabel: 'Briefing Cache',
    description: 'Offline Investor Briefing SSOT cache and 5-year P&L / MOIC series',
    swatchClass: 'bg-[#B45309] dark:bg-[#F59E0B]',
    colorLight: '#B45309',
    colorDark: '#F59E0B',
  },
  userSession: {
    label: 'Active User Session',
    shortLabel: 'Session',
    description: 'Last active portal tab, stack selection, and deployment target',
    swatchClass: 'bg-[#4F46E5] dark:bg-[#A5B4FC]',
    colorLight: '#4F46E5',
    colorDark: '#A5B4FC',
  },
  diligencePrefs: {
    label: 'Diligence Preferences',
    shortLabel: 'Preferences',
    description: 'Investor persona track, currency mode, and Data Room bookmarks',
    swatchClass: 'bg-[#0D9488] dark:bg-[#5EEAD4]',
    colorLight: '#0D9488',
    colorDark: '#5EEAD4',
  },
  investorFeedback: {
    label: 'Investor Feedback & Notes',
    shortLabel: 'Notes',
    description: 'Section-level diligence notes, replies, and sentiment ratings',
    swatchClass: 'bg-[#E11D48] dark:bg-[#FB7185]',
    colorLight: '#E11D48',
    colorDark: '#FB7185',
  },
  contactInquiries: {
    label: 'Offline Founder Inquiries',
    shortLabel: 'Inquiries',
    description: 'Drafted SAFE term-sheet and founder outreach inquiries',
    swatchClass: 'bg-[#7C3AED] dark:bg-[#C4B5FD]',
    colorLight: '#7C3AED',
    colorDark: '#C4B5FD',
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
  const { isDark } = useTheme();
  const {
    persistenceService,
    syncStatus,
    isOnline,
    lastSyncedAt,
    storageRevision,
    forceSync,
    clearLocalCachedData,
    exportOfflineBackup,
    autoCleanupEnabled,
    setAutoCleanupEnabled,
    lastAutoCleanupAt,
    lastAutoCleanupPurgedCount,
    runSnapshotCleanup,
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
    selectedApps,
    deploymentProfile,
    hitlConfidence,
    investorCalculatorState,
    currency,
    personaTrack,
    buildShareUrl,
    setAutoNotice,
  } = useStack();

  const [metrics, setMetrics] = useState<PersistenceStorageMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [confirmClearOpen, setConfirmClearOpen] = useState<boolean>(false);
  const [clearing, setClearing] = useState<boolean>(false);
  const [exportingBackup, setExportingBackup] = useState<boolean>(false);
  const [exportToast, setExportToast] = useState<OfflineExportSummary | null>(null);
  const [runningCleanup, setRunningCleanup] = useState<boolean>(false);
  const [cleanupNotice, setCleanupNotice] = useState<string | null>(null);
  const [scenarioNameInput, setScenarioNameInput] = useState<string>('');
  const [scenarioSearchQuery, setScenarioSearchQuery] = useState<string>('');
  const [snapshotNameInput, setSnapshotNameInput] = useState<string>('');
  const [chartScope, setChartScope] = useState<'all' | 'focus'>('all');
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<Set<string>>(() => new Set());
  const [selectedSnapshotIds, setSelectedSnapshotIds] = useState<Set<string>>(() => new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState<boolean>(false);
  const [bulkDeleting, setBulkDeleting] = useState<boolean>(false);
  const [exportLogRecords, setExportLogRecords] = useState<SyncExportLogRecord[]>(loadStoredExportLogs);
  const [showLogViewer, setShowLogViewer] = useState<boolean>(() => {
    try {
      const stored = window.localStorage.getItem('spenta_show_sync_log_v1');
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });
  const [importingCsv, setImportingCsv] = useState<boolean>(false);
  const csvFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleToggleLogViewer = useCallback(() => {
    setShowLogViewer((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem('spenta_show_sync_log_v1', String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

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
    if (!exportToast) return;
    const timer = window.setTimeout(() => {
      setExportToast(null);
    }, 9000);
    return () => window.clearTimeout(timer);
  }, [exportToast]);

  useEffect(() => {
    if (!cleanupNotice) return;
    const timer = window.setTimeout(() => {
      setCleanupNotice(null);
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [cleanupNotice]);

  // Prune stale IDs if items were individually removed or cache cleared
  useEffect(() => {
    const validScenarioIds = new Set(savedCalculatorScenarios.map((s) => s.id));
    setSelectedScenarioIds((prev) => {
      if (prev.size === 0) return prev;
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (validScenarioIds.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [savedCalculatorScenarios]);

  useEffect(() => {
    const validSnapshotIds = new Set(workspaceSnapshots.map((s) => s.id));
    setSelectedSnapshotIds((prev) => {
      if (prev.size === 0) return prev;
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (validSnapshotIds.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [workspaceSnapshots]);

  useEffect(() => {
    if (!confirmClearOpen && !bulkDeleteDialogOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (confirmClearOpen && !clearing) setConfirmClearOpen(false);
        if (bulkDeleteDialogOpen && !bulkDeleting) setBulkDeleteDialogOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmClearOpen, clearing, bulkDeleteDialogOpen, bulkDeleting]);

  const handleConfirmClear = async () => {
    setClearing(true);
    try {
      await clearLocalCachedData();
      setSelectedScenarioIds(new Set());
      setSelectedSnapshotIds(new Set());
      setExportLogRecords([]);
      setConfirmClearOpen(false);
      const next = await persistenceService.getStorageMetrics();
      setMetrics(next);
    } finally {
      setClearing(false);
    }
  };

  const toggleScenarioSelection = useCallback((id: string) => {
    setSelectedScenarioIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSnapshotSelection = useCallback((id: string) => {
    setSelectedSnapshotIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearBulkSelection = useCallback(() => {
    setSelectedScenarioIds(new Set());
    setSelectedSnapshotIds(new Set());
  }, []);

  const totalBulkSelected = selectedScenarioIds.size + selectedSnapshotIds.size;

  const selectedScenarioRecords = useMemo(
    () => savedCalculatorScenarios.filter((item) => selectedScenarioIds.has(item.id)),
    [savedCalculatorScenarios, selectedScenarioIds],
  );

  const selectedSnapshotRecords = useMemo(
    () => workspaceSnapshots.filter((snap) => selectedSnapshotIds.has(snap.id)),
    [workspaceSnapshots, selectedSnapshotIds],
  );

  const handleConfirmBulkDelete = async () => {
    const scenarioIdsToDelete = Array.from(selectedScenarioIds);
    const snapshotIdsToDelete = Array.from(selectedSnapshotIds);
    const totalCount = scenarioIdsToDelete.length + snapshotIdsToDelete.length;
    if (totalCount === 0) {
      setBulkDeleteDialogOpen(false);
      return;
    }

    setBulkDeleting(true);
    try {
      for (const id of scenarioIdsToDelete) {
        await deleteCalculatorScenario(id);
      }
      for (const id of snapshotIdsToDelete) {
        await deleteWorkspaceSnapshot(id);
      }
      clearBulkSelection();
      setBulkDeleteDialogOpen(false);
      persistenceService.recordAuditEvent({
        title: 'Bulk delete performed',
        detail: `Removed ${scenarioIdsToDelete.length} scenario${scenarioIdsToDelete.length === 1 ? '' : 's'} and ${snapshotIdsToDelete.length} workspace snapshot${snapshotIdsToDelete.length === 1 ? '' : 's'} from IndexedDB.`,
        status: 'synced',
        category: 'cleanup',
        metadata: {
          scenariosCount: scenarioIdsToDelete.length,
          snapshotsCount: snapshotIdsToDelete.length,
        },
      });
      const next = await persistenceService.getStorageMetrics();
      setMetrics(next);
      setAutoNotice(
        `Bulk deleted ${scenarioIdsToDelete.length} scenario${scenarioIdsToDelete.length === 1 ? '' : 's'} and ${snapshotIdsToDelete.length} workspace snapshot${snapshotIdsToDelete.length === 1 ? '' : 's'} from IndexedDB`,
      );
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleExportData = useCallback(async () => {
    setExportingBackup(true);
    try {
      const summary = await exportOfflineBackup();
      setExportToast(summary);

      const syncState = persistenceService.getSyncState();
      const newExportRecord: SyncExportLogRecord = {
        id: `sync-export-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: summary.exportedAt,
        filename: summary.filename,
        byteSize: summary.byteSize,
        formattedSize: formatBytes(summary.byteSize),
        scenariosCount: summary.scenariosCount,
        snapshotsCount: summary.snapshotsCount,
        schemaVersion: summary.schemaVersion,
        backend: syncState.backend,
        revision: syncState.revision,
      };
      setExportLogRecords((prev) => {
        const next = [newExportRecord, ...prev].slice(0, 30);
        try {
          window.localStorage.setItem(SYNC_EXPORT_LOG_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore storage quota errors
        }
        return next;
      });
    } finally {
      setExportingBackup(false);
    }
  }, [exportOfflineBackup, persistenceService]);

  const handleClearExportLogs = useCallback(() => {
    setExportLogRecords([]);
    try {
      window.localStorage.removeItem(SYNC_EXPORT_LOG_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  }, []);

  const staleSnapshotCount = useMemo(() => {
    const cutoffMs = Date.now() - 30 * 86_400_000;
    return workspaceSnapshots.filter((snap) => {
      const ts = Date.parse(snap.updatedAt || snap.createdAt);
      return Number.isFinite(ts) && ts < cutoffMs;
    }).length;
  }, [workspaceSnapshots]);

  const handleToggleAutoCleanup = useCallback(() => {
    const next = !autoCleanupEnabled;
    setAutoCleanupEnabled(next);
    if (next) {
      setCleanupNotice(
        staleSnapshotCount > 0
          ? `Auto-Cleanup enabled — purging ${staleSnapshotCount} snapshot${staleSnapshotCount === 1 ? '' : 's'} older than 30 days…`
          : 'Auto-Cleanup enabled — snapshots older than 30 days will purge automatically.',
      );
    } else {
      setCleanupNotice('Auto-Cleanup disabled — snapshots older than 30 days will be retained.');
    }
  }, [autoCleanupEnabled, setAutoCleanupEnabled, staleSnapshotCount]);

  const handleManualCleanupNow = useCallback(async () => {
    setRunningCleanup(true);
    try {
      const result = await runSnapshotCleanup(30);
      const next = await persistenceService.getStorageMetrics();
      setMetrics(next);
      setCleanupNotice(
        result.purgedCount > 0
          ? `Purged ${result.purgedCount} stale snapshot${result.purgedCount === 1 ? '' : 's'} (freed ~${formatBytes(result.freedBytesEstimate)}).`
          : 'No named snapshots older than 30 days found.',
      );
    } finally {
      setRunningCleanup(false);
    }
  }, [persistenceService, runSnapshotCleanup]);

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

  const effectiveQuotaBytes = useMemo(() => {
    if (metrics?.quotaBytes && metrics.quotaBytes > 0) {
      return metrics.quotaBytes;
    }
    // Estimated default browser quota (50 GB standard allocation in modern browsers)
    return 50 * 1024 * 1024 * 1024;
  }, [metrics]);

  const effectiveUsageBytes = useMemo(() => {
    return metrics?.usageBytes ?? metrics?.estimatedPayloadBytes ?? 0;
  }, [metrics]);

  const remainingQuotaBytes = useMemo(() => {
    return Math.max(0, effectiveQuotaBytes - effectiveUsageBytes);
  }, [effectiveQuotaBytes, effectiveUsageBytes]);

  const quotaUsagePct = useMemo(() => {
    if (effectiveQuotaBytes <= 0) return 0;
    const rawPct = (effectiveUsageBytes / effectiveQuotaBytes) * 100;
    return Math.min(100, Math.max(effectiveUsageBytes > 0 ? 0.01 : 0, rawPct));
  }, [effectiveQuotaBytes, effectiveUsageBytes]);

  const scenarioAndWorkspaceCount = useMemo(() => {
    if (!metrics) return 0;
    return metrics.scenarioEntries + metrics.workspaceEntries;
  }, [metrics]);

  const storageBreakdown = useMemo(() => {
    const stats = metrics?.storeStats ?? [];
    const totalBytes = metrics?.estimatedPayloadBytes ?? 0;
    return [...stats]
      .sort((a, b) => b.bytes - a.bytes || b.count - a.count)
      .map((row) => {
        const meta = STORE_METADATA[row.store];
        return {
          ...row,
          meta,
          name: meta.shortLabel,
          fullName: meta.label,
          fill: isDark ? meta.colorDark : meta.colorLight,
          sharePct: totalBytes > 0 ? (row.bytes / totalBytes) * 100 : 0,
        };
      });
  }, [metrics, isDark]);

  const activeChartData = useMemo(() => {
    if (chartScope === 'focus') {
      const targetStores = new Set<PersistenceStoreName>([
        'calculatorScenarios',
        'workspaceSnapshots',
        'investorCalculator',
      ]);
      const focused = storageBreakdown.filter((item) => targetStores.has(item.store));
      const focusedTotal = focused.reduce((sum, item) => sum + item.bytes, 0);
      return focused.map((item) => ({
        ...item,
        scopeSharePct: focusedTotal > 0 ? (item.bytes / focusedTotal) * 100 : 0,
      }));
    }
    return storageBreakdown.map((item) => ({
      ...item,
      scopeSharePct: item.sharePct,
    }));
  }, [chartScope, storageBreakdown]);

  const pieChartData = useMemo(() => {
    const nonZero = activeChartData.filter((item) => item.bytes > 0);
    return nonZero;
  }, [activeChartData]);

  const scenarioAndSnapshotBytes = useMemo(() => {
    return storageBreakdown
      .filter(
        (item) =>
          item.store === 'calculatorScenarios' || item.store === 'workspaceSnapshots',
      )
      .reduce((sum, item) => sum + item.bytes, 0);
  }, [storageBreakdown]);

  const scenarioAndSnapshotSharePct = useMemo(() => {
    const total = metrics?.estimatedPayloadBytes ?? 0;
    return total > 0 ? (scenarioAndSnapshotBytes / total) * 100 : 0;
  }, [metrics, scenarioAndSnapshotBytes]);

  const buildSessionMailtoUrl = useCallback(() => {
    const shareUrl = buildShareUrl();
    const totalBytes = metrics?.estimatedPayloadBytes ?? 0;
    const scenarioBytes =
      storageBreakdown.find((s) => s.store === 'calculatorScenarios')?.bytes ?? 0;
    const snapshotBytes =
      storageBreakdown.find((s) => s.store === 'workspaceSnapshots')?.bytes ?? 0;
    const moduleNames =
      selectedApps.length > 0
        ? selectedApps.slice(0, 8).map((a) => a.name).join(', ') +
          (selectedApps.length > 8 ? ` (+${selectedApps.length - 8} more)` : '')
        : 'None selected';

    const subject = `Spenta Sovereign OS Session & Snapshot — ${activeTab} (${selectedIds.length} modules)`;
    const bodyLines = [
      'SPENTA SOVEREIGN OS — SESSION STATE & SNAPSHOT SUMMARY',
      '======================================================',
      '',
      `Active Workspace Tab: ${activeTab}`,
      `Deployment Posture: ${deploymentProfile.title} (${deploymentProfile.id})`,
      `Selected Stack (${selectedIds.length}): ${moduleNames}`,
      `HITL OPA Threshold: ${hitlConfidence.toFixed(2)}`,
      '',
      'FINANCIAL MODEL & BRIEFING TRACK',
      `- Scenario Mode: ${investorCalculatorState.scenario.toUpperCase()} | Currency: ${currency} (FX ${investorCalculatorState.fxRate.toFixed(2)} BDT/USD)`,
      `- Check Size: $${investorCalculatorState.investmentK}K | Exit Multiple: ${investorCalculatorState.exitMultiple}x | Horizon: ${investorCalculatorState.horizonYears} yrs`,
      `- Investor Track: ${personaTrack}`,
      '',
      'OFFLINE STORAGE & SYNC SNAPSHOT',
      `- Sync State: ${syncStatus.toUpperCase()} (${isOnline ? 'Online' : 'Offline'})`,
      `- Last Synced: ${formatTimestamp(lastSyncedAt ?? metrics?.lastUpdatedAt ?? null)}`,
      `- Saved Scenarios: ${savedCalculatorScenarios.length} (${formatBytes(scenarioBytes)})`,
      `- Workspace Snapshots: ${workspaceSnapshots.length} (${formatBytes(snapshotBytes)})`,
      `- Total Local Footprint: ${formatBytes(totalBytes)} across ${metrics?.totalEntries ?? 0} records`,
      '',
      'SHARED SNAPSHOT LINK',
      shareUrl,
    ];

    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
      bodyLines.join('\n'),
    )}`;
  }, [
    activeTab,
    buildShareUrl,
    currency,
    deploymentProfile.id,
    deploymentProfile.title,
    hitlConfidence,
    investorCalculatorState.exitMultiple,
    investorCalculatorState.fxRate,
    investorCalculatorState.horizonYears,
    investorCalculatorState.investmentK,
    investorCalculatorState.scenario,
    isOnline,
    lastSyncedAt,
    metrics,
    personaTrack,
    savedCalculatorScenarios.length,
    selectedApps,
    selectedIds.length,
    storageBreakdown,
    syncStatus,
    workspaceSnapshots.length,
  ]);

  const handleOpenEmailClient = useCallback(() => {
    const mailtoHref = buildSessionMailtoUrl();
    const anchor = document.createElement('a');
    anchor.href = mailtoHref;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setAutoNotice('Opened default email client with session summary & shared snapshot link');
  }, [buildSessionMailtoUrl, setAutoNotice]);

  const handleImportCsvFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = '';

      setImportingCsv(true);
      try {
        const text = await file.text();
        const result = parseScenariosFromCsv(text);
        if (result.scenarios.length === 0) {
          setAutoNotice(
            `CSV import failed: ${result.errors[0] || 'No valid scenario rows found in file.'}`,
          );
          return;
        }

        let importedCount = 0;
        for (const item of result.scenarios) {
          await saveCalculatorScenario(item.name, item.description ?? 'Imported via CSV');
          importedCount++;
        }

        persistenceService.recordAuditEvent({
          title: 'Scenarios imported from CSV',
          detail: `Imported ${importedCount} scenario${importedCount === 1 ? '' : 's'} from "${file.name}" (${formatBytes(file.size)}).`,
          status: 'synced',
          category: 'scenario',
          metadata: {
            filename: file.name,
            count: importedCount,
            fileSize: file.size,
          },
        });

        const next = await persistenceService.getStorageMetrics();
        setMetrics(next);
        setAutoNotice(
          `Successfully imported ${importedCount} scenario${importedCount === 1 ? '' : 's'} from ${file.name} into IndexedDB`,
        );
      } catch (err) {
        setAutoNotice(
          `Failed to parse CSV file: ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      } finally {
        setImportingCsv(false);
      }
    },
    [persistenceService, saveCalculatorScenario, setAutoNotice],
  );

  const handleDownloadSampleCsv = useCallback(() => {
    const sample = generateSampleScenariosCsv();
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spenta-scenario-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setAutoNotice('Downloaded sample scenario CSV template');
  }, [setAutoNotice]);

  const handleExportScenariosCsv = useCallback(() => {
    if (savedCalculatorScenarios.length === 0) {
      setAutoNotice('No saved scenarios to export as CSV');
      return;
    }
    const csv = exportScenariosToCsv(savedCalculatorScenarios);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStamp = new Date().toISOString().slice(0, 10);
    a.download = `spenta-scenarios-${dateStamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setAutoNotice(`Exported ${savedCalculatorScenarios.length} scenarios as CSV`);
  }, [savedCalculatorScenarios, setAutoNotice]);

  const filteredScenarios = useMemo(() => {
    const q = scenarioSearchQuery.trim().toLowerCase();
    if (!q) return savedCalculatorScenarios;
    return savedCalculatorScenarios.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        item.state.scenario.toLowerCase().includes(q),
    );
  }, [savedCalculatorScenarios, scenarioSearchQuery]);

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

            <input
              ref={csvFileInputRef}
              type="file"
              accept=".csv,text/csv"
              data-testid="scenario-csv-input"
              onChange={handleImportCsvFile}
              className="hidden"
              aria-label="Upload CSV to import scenarios"
            />

            <button
              type="button"
              data-testid="storage-import-csv-btn"
              onClick={() => csvFileInputRef.current?.click()}
              disabled={importingCsv}
              title="Upload a CSV file to import scenario data directly into local IndexedDB storage"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] text-[#16213A] dark:text-[#E7EBF5] hover:border-[#1F3863] dark:hover:border-[#8FA6E8] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
            >
              <Upload className="w-3.5 h-3.5 text-[#1F3863] dark:text-[#8FA6E8]" strokeWidth={1.6} />
              <span>{importingCsv ? 'Importing…' : 'Import CSV'}</span>
            </button>

            <button
              type="button"
              data-testid="storage-export-data-btn"
              onClick={() => void handleExportData()}
              disabled={exportingBackup}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] text-[#16213A] dark:text-[#E7EBF5] hover:border-[#1C6E46] dark:hover:border-[#6FCB9F] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={1.6} />
              <span>{exportingBackup ? 'Exporting…' : 'Export Data'}</span>
            </button>

            <button
              type="button"
              data-testid="storage-email-session-btn"
              onClick={handleOpenEmailClient}
              title="Open default email client with session state summary and shared snapshot link"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] text-[#16213A] dark:text-[#E7EBF5] hover:border-[#0891B2] dark:hover:border-[#22D3EE] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" strokeWidth={1.6} />
              <span>Email Snapshot</span>
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

        {/* Storage Quota Progress Bar (Visual indicator of usage vs estimated browser IndexedDB quota) */}
        <div
          data-testid="header-storage-quota-progress"
          className="mt-5 p-4 rounded-xl border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529]"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#EBF1FA] dark:bg-[#1A2342] text-[#1F3863] dark:text-[#8FA6E8] flex items-center justify-center shrink-0">
                <HardDrive className="w-3.5 h-3.5" strokeWidth={1.8} />
              </div>
              <div>
                <span className="text-xs font-bold text-[#16213A] dark:text-[#E7EBF5]">
                  Browser Storage Quota & Capacity
                </span>
                <span className="text-[11px] text-[#5F6576] dark:text-[#8E96B0] block sm:inline sm:ml-2">
                  (Estimated IndexedDB persistent storage allocation)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
              <span
                data-testid="header-storage-usage-text"
                className="text-[#16213A] dark:text-[#E7EBF5] font-semibold"
              >
                Used: {formatBytes(effectiveUsageBytes)}
              </span>
              <span className="text-[#C4CDD5] dark:text-[#3B4564]" aria-hidden="true">|</span>
              <span
                data-testid="header-storage-remaining-text"
                className="text-[#1C6E46] dark:text-[#6FCB9F] font-semibold"
              >
                Free: {formatBytes(remainingQuotaBytes)}
              </span>
              <span className="text-[#C4CDD5] dark:text-[#3B4564]" aria-hidden="true">|</span>
              <span className="text-[#5F6576] dark:text-[#8E96B0]">
                Quota: {formatBytes(effectiveQuotaBytes)}
              </span>
            </div>
          </div>

          {/* Progress Bar Track */}
          <div className="w-full bg-[#E4DFD6] dark:bg-[#232B4A] h-2.5 rounded-full overflow-hidden relative">
            <div
              data-testid="header-storage-quota-bar"
              role="progressbar"
              aria-label="Current storage usage against estimated browser IndexedDB quota"
              aria-valuenow={Math.round(quotaUsagePct)}
              aria-valuemin={0}
              aria-valuemax={100}
              className={`h-full transition-all duration-500 rounded-full ${
                quotaUsagePct >= 90
                  ? 'bg-[#DC2626]'
                  : quotaUsagePct >= 75
                  ? 'bg-[#D97706]'
                  : 'bg-[#1F3863] dark:bg-[#8FA6E8]'
              }`}
              style={{ width: `${Math.max(quotaUsagePct, effectiveUsageBytes > 0 ? 0.75 : 0)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] mt-2 text-[#5F6576] dark:text-[#8E96B0] font-mono tabular-nums">
            <span className="font-semibold text-[#1F3863] dark:text-[#8FA6E8]">
              {quotaUsagePct < 0.01 && effectiveUsageBytes > 0
                ? '< 0.01%'
                : `${quotaUsagePct.toFixed(2)}%`}{' '}
              consumed
            </span>
            <span>
              {formatBytes(remainingQuotaBytes)} headroom available for offline scenarios & snapshots
            </span>
          </div>
        </div>

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

      {/* Recharts Donut: Scenarios vs. Workspace Snapshots Allocation */}
      <ScenariosVsSnapshotsDonut
        scenarios={savedCalculatorScenarios}
        snapshots={workspaceSnapshots}
        totalDbBytes={metrics?.estimatedPayloadBytes ?? 0}
      />

      {/* Storage Breakdown by Item Type (Recharts Donut + Ranked Horizontal Bar Chart) */}
      <div
        data-testid="storage-breakdown-by-type"
        className="rounded-2xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] p-5 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E4DFD6] dark:border-[#232B4A]">
          <div>
            <h3 className="text-sm font-bold text-[#16213A] dark:text-[#E7EBF5]">
              Storage Breakdown by Type
            </h3>
            <p className="text-xs text-[#5F6576] dark:text-[#8E96B0] mt-0.5">
              Interactive footprint across saved calculator scenarios, workspace snapshots, briefing caches, and diligence notes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div
              role="group"
              aria-label="Filter storage chart scope"
              className="inline-flex rounded-lg bg-[#F2EFE9] dark:bg-[#0F1529] p-0.5 border border-[#E4DFD6] dark:border-[#232B4A]"
            >
              <button
                type="button"
                onClick={() => setChartScope('all')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  chartScope === 'all'
                    ? 'bg-white dark:bg-[#141A32] text-[#16213A] dark:text-[#E7EBF5] shadow-xs'
                    : 'text-[#5F6576] dark:text-[#8E96B0]'
                }`}
              >
                All Stores
              </button>
              <button
                type="button"
                onClick={() => setChartScope('focus')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  chartScope === 'focus'
                    ? 'bg-white dark:bg-[#141A32] text-[#16213A] dark:text-[#E7EBF5] shadow-xs'
                    : 'text-[#5F6576] dark:text-[#8E96B0]'
                }`}
              >
                Scenarios &amp; Snapshots
              </button>
            </div>

            <span className="text-xs font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0]">
              {formatBytes(metrics?.estimatedPayloadBytes ?? 0)} allocated
            </span>
          </div>
        </div>

        {/* Multi-segment proportional bar */}
        <div
          aria-label="Proportional storage usage bar"
          className="h-2.5 w-full rounded-md bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] overflow-hidden flex gap-0.5 p-0.5"
        >
          {storageBreakdown
            .filter((item) => item.bytes > 0)
            .map((item) => (
              <div
                key={item.store}
                className={`h-full rounded-xs ${item.meta.swatchClass} transition-all`}
                style={{ width: `${Math.max(item.sharePct, 2)}%` }}
                title={`${item.meta.label}: ${formatBytes(item.bytes)} (${item.sharePct.toFixed(1)}%)`}
              />
            ))}
        </div>

        {/* Recharts Charts Row: Allocation Donut (left) + Serialized Byte BarChart (right) */}
        {pieChartData.length === 0 ? (
          <div className="py-10 text-center space-y-2 border border-dashed border-[#E4DFD6] dark:border-[#232B4A] rounded-xl">
            <p className="text-xs text-[#5F6576] dark:text-[#8E96B0]">
              No cached bytes recorded in the selected storage scope yet. Save a scenario or snapshot below to inspect space allocation.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Recharts PieChart (Donut) */}
            <div className="lg:col-span-5 flex flex-col justify-between gap-3 pt-1 lg:pr-5 lg:border-r lg:border-[#E4DFD6] dark:lg:border-[#232B4A]">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#16213A] dark:text-[#E7EBF5]">
                  Share of Allocated Space
                </span>
                <span className="font-mono tabular-nums text-[11px] text-[#5F6576] dark:text-[#8E96B0]">
                  Scenarios + Snapshots: {scenarioAndSnapshotSharePct.toFixed(1)}%
                </span>
              </div>

              <div className="relative h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      dataKey="bytes"
                      nameKey="fullName"
                      cx="50%"
                      cy="50%"
                      innerRadius={56}
                      outerRadius={84}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {pieChartData.map((entry) => (
                        <Cell key={entry.store} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val, _name, item) => {
                        const bytes = Number(val ?? 0);
                        const pct = item?.payload?.scopeSharePct ?? 0;
                        const cnt = item?.payload?.count ?? 0;
                        return [
                          `${formatBytes(bytes)} · ${pct.toFixed(1)}% (${cnt} rec)`,
                          item?.payload?.fullName ?? 'Store',
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
                  </PieChart>
                </ResponsiveContainer>

                {/* Centered Total Readout */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-mono text-[#5F6576] dark:text-[#8E96B0]">
                    {chartScope === 'focus' ? 'Models + Snapshots' : 'Total Cached'}
                  </span>
                  <span className="text-sm font-bold font-mono tabular-nums text-[#16213A] dark:text-[#E7EBF5] mt-0.5">
                    {formatBytes(
                      activeChartData.reduce((acc, item) => acc + item.bytes, 0),
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Recharts Horizontal BarChart */}
            <div className="lg:col-span-7 flex flex-col justify-between gap-3 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#16213A] dark:text-[#E7EBF5]">
                  Byte Allocation by Store
                </span>
                <span className="font-mono tabular-nums text-[11px] text-[#5F6576] dark:text-[#8E96B0]">
                  {activeChartData.length} object store{activeChartData.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={activeChartData}
                    layout="vertical"
                    margin={{ top: 4, right: 20, left: 6, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke={isDark ? '#232B4A' : '#E4DFD6'}
                    />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fill: isDark ? '#8E96B0' : '#5F6576' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => formatBytes(v)}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={96}
                      tick={{ fontSize: 11, fill: isDark ? '#E7EBF5' : '#16213A' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: isDark ? 'rgba(143,166,232,0.08)' : 'rgba(31,56,99,0.05)' }}
                      formatter={(val, _name, item) => {
                        const bytes = Number(val ?? 0);
                        const cnt = item?.payload?.count ?? 0;
                        const pct = item?.payload?.scopeSharePct ?? 0;
                        return [
                          `${formatBytes(bytes)} (${pct.toFixed(1)}%, ${cnt} entries)`,
                          item?.payload?.fullName ?? 'Storage',
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
                    <Bar dataKey="bytes" radius={[0, 6, 6, 0]} barSize={16}>
                      {activeChartData.map((entry) => (
                        <Cell key={entry.store} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Ranked Type Legend Summary */}
        <div className="pt-3 border-t border-[#E4DFD6] dark:border-[#232B4A] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-2">
          {storageBreakdown.map((item) => (
            <div key={item.store} className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2 h-2 rounded-xs shrink-0 ${item.meta.swatchClass}`} />
                <span className="font-medium text-[#16213A] dark:text-[#E7EBF5] truncate">
                  {item.meta.shortLabel}
                </span>
                <span className="text-[11px] font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0] shrink-0">
                  ({item.count})
                </span>
              </div>
              <span className="font-mono tabular-nums text-[11px] text-[#5F6576] dark:text-[#8E96B0] shrink-0">
                {formatBytes(item.bytes)} · {item.sharePct.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* D3.js Storage Accumulation Hot-Spot Heatmap (Scenarios vs. Snapshots) */}
      <StorageGrowthHeatmap
        scenarios={savedCalculatorScenarios}
        snapshots={workspaceSnapshots}
      />

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

      {/* Bulk Selection Action Bar */}
      {totalBulkSelected > 0 && (
        <div
          data-testid="bulk-delete-bar"
          role="region"
          aria-label="Bulk selection actions"
          className="rounded-xl border border-[#FECACA] dark:border-[#7F1D1D] bg-[#FEF2F2]/85 dark:bg-[#2A1215]/75 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5 text-xs text-[#7F1D1D] dark:text-[#FECACA]">
            <AlertTriangle className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            <span className="font-semibold tabular-nums">
              {totalBulkSelected} item{totalBulkSelected === 1 ? '' : 's'} selected
            </span>
            <span className="font-mono text-[11px] tabular-nums opacity-90">
              ({selectedScenarioIds.size} scenario{selectedScenarioIds.size === 1 ? '' : 's'} ·{' '}
              {selectedSnapshotIds.size} snapshot{selectedSnapshotIds.size === 1 ? '' : 's'})
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={clearBulkSelection}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] text-[#16213A] dark:text-[#E7EBF5] hover:opacity-90 cursor-pointer whitespace-nowrap"
            >
              Clear Selection
            </button>
            <button
              type="button"
              data-testid="bulk-delete-open-btn"
              onClick={() => setBulkDeleteDialogOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#DC2626] hover:bg-[#B91C1C] text-white cursor-pointer whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Bulk Delete ({totalBulkSelected})</span>
            </button>
          </div>
        </div>
      )}

      {/* Safety Confirmation Dialog for Bulk Delete (No window.confirm/alert) */}
      {bulkDeleteDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4"
          onClick={() => {
            if (!bulkDeleting) setBulkDeleteDialogOpen(false);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="bulk-delete-modal-title"
            aria-describedby="bulk-delete-modal-description"
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
                    id="bulk-delete-modal-title"
                    className="text-base font-bold text-[#16213A] dark:text-[#E7EBF5]"
                  >
                    Delete {totalBulkSelected} Selected Item{totalBulkSelected === 1 ? '' : 's'}?
                  </h3>
                  <p
                    id="bulk-delete-modal-description"
                    className="mt-1.5 text-xs text-[#4A5568] dark:text-[#A4ADC6] leading-relaxed"
                  >
                    This permanently deletes{' '}
                    <strong className="text-[#16213A] dark:text-[#E7EBF5] tabular-nums">
                      {selectedScenarioIds.size} saved scenario{selectedScenarioIds.size === 1 ? '' : 's'}
                    </strong>{' '}
                    and{' '}
                    <strong className="text-[#16213A] dark:text-[#E7EBF5] tabular-nums">
                      {selectedSnapshotIds.size} workspace snapshot{selectedSnapshotIds.size === 1 ? '' : 's'}
                    </strong>{' '}
                    from local IndexedDB storage. This action cannot be undone.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBulkDeleteDialogOpen(false)}
                disabled={bulkDeleting}
                aria-label="Close bulk delete confirmation modal"
                className="p-1 rounded-md text-[#5F6576] dark:text-[#8E96B0] hover:text-[#16213A] dark:hover:text-[#E7EBF5] cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>

            {(selectedScenarioRecords.length > 0 || selectedSnapshotRecords.length > 0) && (
              <div className="mt-4 max-h-40 overflow-y-auto rounded-xl border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] p-3 space-y-1.5 text-xs">
                {selectedScenarioRecords.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 text-[#16213A] dark:text-[#E7EBF5]"
                  >
                    <span className="truncate font-medium">{item.name}</span>
                    <span className="font-mono text-[10px] text-[#5F6576] dark:text-[#8E96B0] shrink-0">
                      Scenario
                    </span>
                  </div>
                ))}
                {selectedSnapshotRecords.map((snap) => (
                  <div
                    key={snap.id}
                    className="flex items-center justify-between gap-2 text-[#16213A] dark:text-[#E7EBF5]"
                  >
                    <span className="truncate font-medium">{snap.name}</span>
                    <span className="font-mono text-[10px] text-[#5F6576] dark:text-[#8E96B0] shrink-0">
                      Snapshot
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-[#E4DFD6] dark:border-[#232B4A] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setBulkDeleteDialogOpen(false)}
                disabled={bulkDeleting}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] text-[#16213A] dark:text-[#E7EBF5] hover:opacity-90 cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="bulk-delete-confirm-btn"
                onClick={() => void handleConfirmBulkDelete()}
                disabled={bulkDeleting}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#DC2626] hover:bg-[#B91C1C] text-white cursor-pointer whitespace-nowrap disabled:opacity-60"
              >
                {bulkDeleting ? 'Deleting…' : `Delete ${totalBulkSelected} Item${totalBulkSelected === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        </div>
      )}

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

          {/* CSV Actions for Investor Scenarios */}
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-[#FAF8F4] dark:bg-[#0B1020] border border-[#E4DFD6] dark:border-[#232B4A]">
            <div className="flex items-center gap-1.5 text-xs text-[#5F6576] dark:text-[#8E96B0]">
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#1C6E46] dark:text-[#6FCB9F]" strokeWidth={1.6} />
              <span className="font-semibold text-[#16213A] dark:text-[#E7EBF5]">CSV Scenarios:</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                data-testid="scenario-sample-csv-btn"
                onClick={handleDownloadSampleCsv}
                title="Download sample CSV template with pre-built scenario rows"
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border border-[#E4DFD6] dark:border-[#232B4A] hover:bg-white dark:hover:bg-[#141A32] text-[#5F6576] dark:text-[#8E96B0] hover:text-[#16213A] dark:hover:text-[#E7EBF5] transition-colors cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span>Template</span>
              </button>
              <button
                type="button"
                data-testid="scenario-import-csv-inline-btn"
                onClick={() => csvFileInputRef.current?.click()}
                disabled={importingCsv}
                title="Upload CSV file with scenario data to IndexedDB"
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold bg-[#1F3863] text-white dark:bg-[#8FA6E8] dark:text-[#0B1020] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-3 h-3" />
                <span>{importingCsv ? 'Importing…' : 'Upload CSV'}</span>
              </button>
              <button
                type="button"
                data-testid="scenario-export-csv-btn"
                onClick={handleExportScenariosCsv}
                disabled={savedCalculatorScenarios.length === 0}
                title="Export saved investor scenarios to CSV file"
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border border-[#E4DFD6] dark:border-[#232B4A] hover:bg-white dark:hover:bg-[#141A32] text-[#5F6576] dark:text-[#8E96B0] hover:text-[#16213A] dark:hover:text-[#E7EBF5] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download className="w-3 h-3" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Search Saved Scenarios by Name */}
          <div className="mt-2.5 relative">
            <Search
              className="w-3.5 h-3.5 text-[#5F6576] dark:text-[#8E96B0] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              strokeWidth={1.6}
            />
            <input
              type="search"
              data-testid="scenario-search-input"
              value={scenarioSearchQuery}
              onChange={(e) => setScenarioSearchQuery(e.target.value)}
              placeholder="Search saved scenarios by name…"
              aria-label="Search saved scenarios by name"
              className="w-full h-9 pl-8 pr-8 text-xs rounded-lg bg-[#FAF8F4] dark:bg-[#0B1020] border border-[#E4DFD6] dark:border-[#232B4A] text-[#16213A] dark:text-[#E7EBF5] placeholder:text-[#7D8599] focus:outline-none focus:border-[#1F3863] dark:focus:border-[#8FA6E8]"
            />
            {scenarioSearchQuery && (
              <button
                type="button"
                onClick={() => setScenarioSearchQuery('')}
                aria-label="Clear scenario search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5F6576] hover:text-[#16213A] dark:hover:text-[#E7EBF5] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" strokeWidth={1.6} />
              </button>
            )}
          </div>

          {filteredScenarios.length > 0 && (
            <div className="mt-2.5 pt-2 border-t border-[#E4DFD6] dark:border-[#232B4A] flex items-center justify-between gap-2 text-[11px]">
              <label className="inline-flex items-center gap-2 text-[#5F6576] dark:text-[#8E96B0] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filteredScenarios.every((item) => selectedScenarioIds.has(item.id))}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSelectedScenarioIds((prev) => {
                      const next = new Set(prev);
                      filteredScenarios.forEach((item) => {
                        if (checked) next.add(item.id);
                        else next.delete(item.id);
                      });
                      return next;
                    });
                  }}
                  aria-label="Select all visible scenarios"
                  className="rounded border-[#CFC8BC] dark:border-[#2E3862] accent-[#1F3863] dark:accent-[#8FA6E8] cursor-pointer"
                />
                <span>Select all visible ({filteredScenarios.length})</span>
              </label>
              {selectedScenarioIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => setBulkDeleteDialogOpen(true)}
                  className="font-semibold text-[#B91C1C] dark:text-[#FCA5A5] hover:underline cursor-pointer tabular-nums"
                >
                  Delete selected ({selectedScenarioIds.size})
                </button>
              )}
            </div>
          )}

          <div className="mt-2 divide-y divide-[#E4DFD6] dark:divide-[#232B4A] flex-1">
            {savedCalculatorScenarios.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#5F6576] dark:text-[#8E96B0]">
                No named investor scenarios saved yet. Save your active calculator parameters above to benchmark cases offline.
              </div>
            ) : filteredScenarios.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <div className="text-xs text-[#5F6576] dark:text-[#8E96B0]">
                  No saved scenarios matching &ldquo;{scenarioSearchQuery.trim()}&rdquo;.
                </div>
                <button
                  type="button"
                  onClick={() => setScenarioSearchQuery('')}
                  className="text-xs font-semibold text-[#1F3863] dark:text-[#8FA6E8] hover:underline cursor-pointer"
                >
                  Clear search
                </button>
              </div>
            ) : (
              filteredScenarios.map((item) => {
                const isSelected = selectedScenarioIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    className={`py-3 flex items-center justify-between gap-3 rounded-lg transition-colors ${
                      isSelected ? 'bg-[#FAF8F4] dark:bg-[#0F1529]/80 px-2 -mx-2' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        data-testid={`select-scenario-${item.id}`}
                        checked={isSelected}
                        onChange={() => toggleScenarioSelection(item.id)}
                        aria-label={`Select scenario ${item.name}`}
                        className="rounded border-[#CFC8BC] dark:border-[#2E3862] accent-[#1F3863] dark:accent-[#8FA6E8] cursor-pointer shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5] truncate">
                          {item.name}
                        </div>
                        <div className="text-[11px] font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0] mt-0.5">
                          {item.state.scenario} · ${item.state.investmentK}K · {item.state.exitMultiple}x exit · {formatTimestamp(item.updatedAt)}
                        </div>
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
                );
              })
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

          {/* 30-Day Snapshot Auto-Cleanup Policy Control */}
          <div
            data-testid="auto-cleanup-panel"
            className="mt-3 rounded-xl border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] px-3.5 py-2.5 space-y-2"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <Clock
                  className="w-3.5 h-3.5 text-[#1C6E46] dark:text-[#6FCB9F] mt-0.5 shrink-0"
                  strokeWidth={1.75}
                />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5]">
                    Auto-Cleanup (&gt;30 days)
                  </div>
                  <p className="text-[11px] text-[#5F6576] dark:text-[#8E96B0] leading-snug">
                    Automatically purge saved snapshots older than 30 days to free persistent storage.
                  </p>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={autoCleanupEnabled}
                aria-label="Toggle 30-day automatic snapshot cleanup"
                data-testid="auto-cleanup-toggle"
                onClick={handleToggleAutoCleanup}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors cursor-pointer ${
                  autoCleanupEnabled
                    ? 'bg-[#1C6E46] border-[#1C6E46] dark:bg-[#6FCB9F] dark:border-[#6FCB9F]'
                    : 'bg-[#E4DFD6] border-[#D5CEC2] dark:bg-[#232B4A] dark:border-[#323D66]'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white dark:bg-[#0B1020] shadow-xs transition-transform ${
                    autoCleanupEnabled ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-[#E4DFD6]/70 dark:border-[#232B4A] text-[11px] font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0]">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span>{staleSnapshotCount} &gt;30d eligible</span>
                {lastAutoCleanupAt && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>
                      Last sweep {formatTimestamp(lastAutoCleanupAt)} ({lastAutoCleanupPurgedCount} purged)
                    </span>
                  </>
                )}
              </div>
              {staleSnapshotCount > 0 && (
                <button
                  type="button"
                  data-testid="run-cleanup-now-btn"
                  onClick={() => void handleManualCleanupNow()}
                  disabled={runningCleanup}
                  className="font-sans text-[11px] font-semibold text-[#1C6E46] dark:text-[#6FCB9F] hover:underline cursor-pointer disabled:opacity-50"
                >
                  {runningCleanup ? 'Purging…' : 'Purge Old Now'}
                </button>
              )}
            </div>

            {cleanupNotice && (
              <div
                role="status"
                aria-live="polite"
                data-testid="auto-cleanup-status"
                className="text-[11px] text-[#1C6E46] dark:text-[#6FCB9F] font-medium"
              >
                {cleanupNotice}
              </div>
            )}
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

          {workspaceSnapshots.length > 0 && (
            <div className="mt-2.5 pt-2 border-t border-[#E4DFD6] dark:border-[#232B4A] flex items-center justify-between gap-2 text-[11px]">
              <label className="inline-flex items-center gap-2 text-[#5F6576] dark:text-[#8E96B0] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={workspaceSnapshots.every((snap) => selectedSnapshotIds.has(snap.id))}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSelectedSnapshotIds(
                      checked ? new Set(workspaceSnapshots.map((s) => s.id)) : new Set(),
                    );
                  }}
                  aria-label="Select all workspace snapshots"
                  className="rounded border-[#CFC8BC] dark:border-[#2E3862] accent-[#1C6E46] dark:accent-[#6FCB9F] cursor-pointer"
                />
                <span>Select all ({workspaceSnapshots.length})</span>
              </label>
              {selectedSnapshotIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => setBulkDeleteDialogOpen(true)}
                  className="font-semibold text-[#B91C1C] dark:text-[#FCA5A5] hover:underline cursor-pointer tabular-nums"
                >
                  Delete selected ({selectedSnapshotIds.size})
                </button>
              )}
            </div>
          )}

          <div className="mt-2 divide-y divide-[#E4DFD6] dark:divide-[#232B4A] flex-1">
            {workspaceSnapshots.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#5F6576] dark:text-[#8E96B0]">
                No named workspace snapshots yet. Your active session is auto-saved continuously; create a named checkpoint above to switch stacks cleanly.
              </div>
            ) : (
              workspaceSnapshots.map((snap) => {
                const isSelected = selectedSnapshotIds.has(snap.id);
                return (
                  <div
                    key={snap.id}
                    className={`py-3 flex items-center justify-between gap-3 rounded-lg transition-colors ${
                      isSelected ? 'bg-[#FAF8F4] dark:bg-[#0F1529]/80 px-2 -mx-2' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        data-testid={`select-snapshot-${snap.id}`}
                        checked={isSelected}
                        onChange={() => toggleSnapshotSelection(snap.id)}
                        aria-label={`Select snapshot ${snap.name}`}
                        className="rounded border-[#CFC8BC] dark:border-[#2E3862] accent-[#1C6E46] dark:accent-[#6FCB9F] cursor-pointer shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5] truncate">
                          {snap.name}
                        </div>
                        <div className="text-[11px] font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0] mt-0.5">
                          {snap.activeTab} · {snap.selectedIds.length} modules · {snap.deploymentTarget} · {formatTimestamp(snap.updatedAt)}
                        </div>
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
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Scrollable Sync Event Log Viewer Section with Show/Hide Toggle Switch */}
      <div
        data-testid="sync-log-section"
        className="space-y-3"
      >
        <div
          data-testid="sync-log-toggle-panel"
          className="rounded-2xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4 text-[#1F3863] dark:text-[#8FA6E8]" strokeWidth={1.75} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#16213A] dark:text-[#E7EBF5]">
                  Sync Event Audit Stream
                </h3>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                    showLogViewer
                      ? 'bg-[#ECFDF5] dark:bg-[#0D261C] text-[#1C6E46] dark:text-[#6FCB9F] border-[#A7F3D0] dark:border-[#1E4D36]'
                      : 'bg-[#FAF8F4] dark:bg-[#0F1529] text-[#5F6576] dark:text-[#8E96B0] border-[#E4DFD6] dark:border-[#232B4A]'
                  }`}
                >
                  {showLogViewer ? 'Visible' : 'Hidden'}
                </span>
              </div>
              <p className="text-xs text-[#5F6576] dark:text-[#8E96B0] mt-0.5">
                {showLogViewer
                  ? 'Showing live time-stamped sync events, scenario saves, cleanups, and export records.'
                  : 'Audit log viewer is hidden to keep your dashboard layout compact.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
            <label
              htmlFor="toggle-log-viewer-switch"
              className="text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5] cursor-pointer select-none"
            >
              {showLogViewer ? 'Hide Log' : 'Show Log'}
            </label>
            <button
              id="toggle-log-viewer-switch"
              type="button"
              role="switch"
              aria-checked={showLogViewer}
              aria-label="Toggle sync event log viewer visibility"
              data-testid="toggle-log-viewer-switch"
              onClick={handleToggleLogViewer}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors cursor-pointer ${
                showLogViewer
                  ? 'bg-[#1F3863] border-[#1F3863] dark:bg-[#8FA6E8] dark:border-[#8FA6E8]'
                  : 'bg-[#E4DFD6] border-[#D5CEC2] dark:bg-[#232B4A] dark:border-[#323D66]'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white dark:bg-[#0B1020] shadow-xs transition-transform ${
                  showLogViewer ? 'translate-x-4.5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Scrollable Log Viewer (conditionally rendered when showLogViewer is true) */}
        {showLogViewer && (
          <SyncEventLogViewer
            exportRecords={exportLogRecords}
            onClearExports={handleClearExportLogs}
          />
        )}
      </div>

      {/* JSON Export Completion Toast Notification */}
      {exportToast && (
        <div
          role="status"
          aria-live="polite"
          data-testid="storage-export-toast"
          className="fixed bottom-5 right-5 z-50 w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-[#1C6E46]/35 dark:border-[#6FCB9F]/35 bg-white dark:bg-[#141A32] p-4 shadow-2xl"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#1C6E46]/10 dark:bg-[#6FCB9F]/15 border border-[#1C6E46]/25 dark:border-[#6FCB9F]/30 flex items-center justify-center shrink-0">
                <CheckCircle2
                  className="w-4 h-4 text-[#1C6E46] dark:text-[#6FCB9F]"
                  strokeWidth={1.85}
                />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#16213A] dark:text-[#E7EBF5]">
                  JSON Export Downloaded
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] font-mono text-[#1F3863] dark:text-[#8FA6E8] truncate">
                  <FileJson className="w-3.5 h-3.5 shrink-0" strokeWidth={1.7} />
                  <span data-testid="export-toast-filename" className="truncate font-semibold">
                    {exportToast.filename}
                  </span>
                  <span className="text-[#5F6576] dark:text-[#8E96B0] tabular-nums shrink-0">
                    ({formatBytes(exportToast.byteSize)})
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setExportToast(null)}
              aria-label="Dismiss export notification"
              className="p-1 rounded-md text-[#5F6576] dark:text-[#8E96B0] hover:text-[#16213A] dark:hover:text-[#E7EBF5] cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          </div>

          <div
            data-testid="export-toast-structure"
            className="mt-3 rounded-xl border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] px-3 py-2 space-y-1 text-[11px] font-mono tabular-nums text-[#4A5568] dark:text-[#A4ADC6]"
          >
            <div className="text-[#16213A] dark:text-[#E7EBF5] font-semibold">
              Verified Data Structure (schemaVersion: {exportToast.schemaVersion})
            </div>
            <div>
              exportedAt: {formatTimestamp(exportToast.exportedAt)}
            </div>
            <div>
              scenarios[{exportToast.scenariosCount}] · workspaceSnapshots[{exportToast.snapshotsCount}] · stores&#123;{exportToast.storeNames.length}&#125; ({exportToast.totalRecords} records)
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
