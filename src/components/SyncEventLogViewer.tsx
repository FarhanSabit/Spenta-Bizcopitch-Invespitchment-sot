import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Filter,
  Layers,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  WifiOff,
  X,
} from 'lucide-react';
import { useStack } from '../store/StackContext';
import {
  PersistenceAuditEvent,
  PersistenceSyncStatus,
} from '../utils/LocalPersistenceService';

export interface SyncExportLogRecord {
  id: string;
  timestamp: string;
  filename: string;
  byteSize: number;
  formattedSize: string;
  scenariosCount: number;
  snapshotsCount: number;
  schemaVersion: number;
  backend: 'indexeddb' | 'fallback';
  revision: number;
}

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  status: PersistenceSyncStatus;
  eventType: 'scenario' | 'snapshot' | 'cleanup' | 'sync' | 'export' | 'system';
  title: string;
  detail: string;
  backend?: 'indexeddb' | 'fallback';
  revision?: number;
  exportMeta?: {
    filename: string;
    byteSize: number;
    formattedSize: string;
    scenariosCount: number;
    snapshotsCount: number;
    schemaVersion: number;
  };
}

interface SyncEventLogViewerProps {
  exportRecords?: SyncExportLogRecord[];
  onClearExports?: () => void;
}

type LogFilter = 'all' | 'scenarios' | 'cleanups' | 'sync_errors' | 'exports' | 'offline_sync';

function formatLogTime(iso: string): string {
  try {
    const d = new Date(iso);
    const timePart = d.toLocaleTimeString([], {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const ms = String(d.getMilliseconds()).padStart(3, '0');
    return `${timePart}.${ms}`;
  } catch {
    return iso;
  }
}

function getEventBadgeMeta(title: string, status: PersistenceSyncStatus, category: string) {
  const lowerTitle = title.toLowerCase();

  if (lowerTitle.includes('failed') || lowerTitle.includes('error') || status === 'offline') {
    return {
      badgeClass:
        'bg-[#FEF2F2] dark:bg-[#2A1215] text-[#B91C1C] dark:text-[#FCA5A5] border-[#FECACA] dark:border-[#7F1D1D]',
      Icon: AlertTriangle,
      tag: 'Failure',
    };
  }

  if (lowerTitle.includes('scenario saved')) {
    return {
      badgeClass:
        'bg-[#ECFDF5] dark:bg-[#0D261C] text-[#0891B2] dark:text-[#22D3EE] border-[#A7F3D0] dark:border-[#1E4D36]',
      Icon: FileText,
      tag: 'Scenario Saved',
    };
  }

  if (lowerTitle.includes('workspace snapshot') || lowerTitle.includes('snapshot saved')) {
    return {
      badgeClass:
        'bg-[#F0FDF4] dark:bg-[#0D2418] text-[#1C6E46] dark:text-[#6FCB9F] border-[#BBF7D0] dark:border-[#164E2F]',
      Icon: Layers,
      tag: 'Snapshot Saved',
    };
  }

  if (lowerTitle.includes('auto-cleanup') || lowerTitle.includes('cleanup')) {
    return {
      badgeClass:
        'bg-[#F5F3FF] dark:bg-[#1E1835] text-[#7C3AED] dark:text-[#C4B5FD] border-[#DDD6FE] dark:border-[#4C1D95]',
      Icon: Sparkles,
      tag: 'Auto-Cleanup',
    };
  }

  if (lowerTitle.includes('export') || category === 'export') {
    return {
      badgeClass:
        'bg-[#EEF2FF] dark:bg-[#1A2447] text-[#1F3863] dark:text-[#8FA6E8] border-[#C7D2FE] dark:border-[#303E73]',
      Icon: Download,
      tag: 'Export',
    };
  }

  if (status === 'syncing') {
    return {
      badgeClass:
        'bg-[#FFFBEB] dark:bg-[#29200D] text-[#B45309] dark:text-[#FCD34D] border-[#FDE68A] dark:border-[#78350F]',
      Icon: RefreshCw,
      tag: 'Syncing',
    };
  }

  return {
    badgeClass:
      'bg-[#ECFDF5] dark:bg-[#0D261C] text-[#1C6E46] dark:text-[#6FCB9F] border-[#A7F3D0] dark:border-[#1E4D36]',
    Icon: CheckCircle2,
    tag: 'Synced',
  };
}

export function SyncEventLogViewer({
  exportRecords = [],
  onClearExports,
}: SyncEventLogViewerProps) {
  const { persistenceService, syncStatus, isOnline, forceSync } = useStack();
  const [filter, setFilter] = useState<LogFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [auditEvents, setAuditEvents] = useState<PersistenceAuditEvent[]>(() =>
    persistenceService.getAuditLog(),
  );
  const [simulatingError, setSimulatingError] = useState<boolean>(false);

  // Subscribe to live audit events emitted by LocalPersistenceService
  useEffect(() => {
    return persistenceService.subscribeAuditLog((events) => {
      setAuditEvents(events);
    });
  }, [persistenceService]);

  const handleSimulateSyncFailure = () => {
    setSimulatingError(true);
    persistenceService.recordAuditEvent({
      title: 'Sync failed',
      detail: 'Simulated connection timeout while verifying object store checksums (audit diagnostic test).',
      status: 'offline',
      category: 'sync',
      metadata: { simulated: true, simulatedAt: new Date().toISOString() },
    });
    setTimeout(() => setSimulatingError(false), 400);
  };

  const handleClearAllLogs = () => {
    persistenceService.clearAuditLog();
    onClearExports?.();
    setAuditEvents([]);
  };

  const handleExportLogsCsv = () => {
    if (allEntries.length === 0) return;
    const headers = ['Timestamp', 'Event Type', 'Status', 'Title', 'Detail'];
    const rows = allEntries.map((e) => [
      `"${e.timestamp}"`,
      `"${e.eventType}"`,
      `"${e.status}"`,
      `"${e.title.replace(/"/g, '""')}"`,
      `"${e.detail.replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStamp = new Date().toISOString().slice(0, 10);
    a.download = `spenta-sync-audit-logs-${dateStamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Merge native audit events with any explicit export records
  const allEntries = useMemo<SyncLogEntry[]>(() => {
    const fromAudit: SyncLogEntry[] = auditEvents.map((evt) => ({
      id: evt.id,
      timestamp: evt.timestamp,
      status: evt.status,
      eventType: evt.category,
      title: evt.title,
      detail: evt.detail,
    }));

    const fromExports: SyncLogEntry[] = exportRecords.map((rec) => ({
      id: rec.id,
      timestamp: rec.timestamp,
      status: 'synced',
      eventType: 'export',
      title: `Export · ${rec.filename}`,
      detail: `File size ${rec.formattedSize} (${rec.byteSize.toLocaleString()} bytes) · ${rec.scenariosCount} scenarios · ${rec.snapshotsCount} snapshots · Schema v${rec.schemaVersion}`,
      backend: rec.backend,
      revision: rec.revision,
      exportMeta: {
        filename: rec.filename,
        byteSize: rec.byteSize,
        formattedSize: rec.formattedSize,
        scenariosCount: rec.scenariosCount,
        snapshotsCount: rec.snapshotsCount,
        schemaVersion: rec.schemaVersion,
      },
    }));

    // Combine and sort reverse-chronological by timestamp
    const combined = [...fromAudit, ...fromExports];
    const seen = new Set<string>();
    const deduplicated: SyncLogEntry[] = [];
    for (const item of combined) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        deduplicated.push(item);
      }
    }

    return deduplicated
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
      .slice(0, 100);
  }, [auditEvents, exportRecords]);

  // Filtered entries by category tab and search query
  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return allEntries.filter((item) => {
      // Category filter
      if (filter === 'scenarios') {
        const isScenario =
          item.eventType === 'scenario' ||
          item.title.toLowerCase().includes('scenario');
        if (!isScenario) return false;
      } else if (filter === 'cleanups') {
        const isCleanup =
          item.eventType === 'cleanup' ||
          item.title.toLowerCase().includes('cleanup') ||
          item.title.toLowerCase().includes('purge');
        if (!isCleanup) return false;
      } else if (filter === 'sync_errors') {
        const isSyncOrError =
          item.eventType === 'sync' ||
          item.title.toLowerCase().includes('sync') ||
          item.title.toLowerCase().includes('failed') ||
          item.title.toLowerCase().includes('network') ||
          item.status === 'offline';
        if (!isSyncOrError) return false;
      } else if (filter === 'exports') {
        const isExport =
          item.eventType === 'export' ||
          item.title.toLowerCase().includes('export');
        if (!isExport) return false;
      } else if (filter === 'offline_sync') {
        const isOffline =
          item.status === 'offline' ||
          item.eventType === 'sync' ||
          item.title.toLowerCase().includes('offline') ||
          item.detail.toLowerCase().includes('offline') ||
          item.detail.toLowerCase().includes('queue') ||
          item.detail.toLowerCase().includes('reconnect');
        if (!isOffline) return false;
      }

      // Keyword query filter
      if (q) {
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchDetail = item.detail.toLowerCase().includes(q);
        const matchFile = item.exportMeta?.filename.toLowerCase().includes(q) ?? false;
        if (!matchTitle && !matchDetail && !matchFile) return false;
      }

      return true;
    });
  }, [allEntries, filter, searchQuery]);

  const counts = useMemo(() => {
    return {
      all: allEntries.length,
      scenarios: allEntries.filter(
        (e) => e.eventType === 'scenario' || e.title.toLowerCase().includes('scenario'),
      ).length,
      cleanups: allEntries.filter(
        (e) =>
          e.eventType === 'cleanup' ||
          e.title.toLowerCase().includes('cleanup') ||
          e.title.toLowerCase().includes('purge'),
      ).length,
      sync_errors: allEntries.filter(
        (e) =>
          e.eventType === 'sync' ||
          e.title.toLowerCase().includes('sync') ||
          e.title.toLowerCase().includes('failed') ||
          e.title.toLowerCase().includes('network') ||
          e.status === 'offline',
      ).length,
      exports: allEntries.filter(
        (e) => e.eventType === 'export' || e.title.toLowerCase().includes('export'),
      ).length,
      offline_sync: allEntries.filter(
        (e) =>
          e.status === 'offline' ||
          e.eventType === 'sync' ||
          e.title.toLowerCase().includes('offline') ||
          e.detail.toLowerCase().includes('offline') ||
          e.detail.toLowerCase().includes('queue') ||
          e.detail.toLowerCase().includes('reconnect'),
      ).length,
    };
  }, [allEntries]);

  return (
    <div
      data-testid="sync-event-log-viewer"
      className="rounded-2xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] p-5 space-y-4"
    >
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E4DFD6] dark:border-[#232B4A]">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Activity
              className="w-4 h-4 text-[#1F3863] dark:text-[#8FA6E8]"
              strokeWidth={1.75}
            />
            <h3 className="text-sm font-bold text-[#16213A] dark:text-[#E7EBF5]">
              Sync Event Log Viewer
            </h3>
            <span className="text-[11px] font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0]">
              ({allEntries.length} event{allEntries.length === 1 ? '' : 's'})
            </span>
          </div>
          <p className="text-xs text-[#5F6576] dark:text-[#8E96B0]">
            Audit-grade chronological log tracking all sync events, scenario saves, automated 30-day cleanups, sync errors, and backups.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void forceSync()}
            disabled={!isOnline || syncStatus === 'syncing'}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-semibold border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] text-[#16213A] dark:text-[#E7EBF5] hover:border-[#1F3863] dark:hover:border-[#8FA6E8] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <RefreshCw
              className={`w-3 h-3 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`}
              strokeWidth={1.75}
            />
            <span>Run Sync Check</span>
          </button>

          <button
            type="button"
            data-testid="simulate-sync-failure-btn"
            onClick={handleSimulateSyncFailure}
            disabled={simulatingError}
            title="Inject a diagnostic 'Sync failed' audit entry to test log visibility and error handling"
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-semibold border border-[#FECACA] dark:border-[#7F1D1D] bg-[#FEF2F2] dark:bg-[#2A1215] text-[#B91C1C] dark:text-[#FCA5A5] hover:bg-[#FEE2E2] dark:hover:bg-[#3B181C] transition-colors cursor-pointer whitespace-nowrap"
          >
            <AlertTriangle className="w-3 h-3" strokeWidth={1.75} />
            <span>Test Sync Error</span>
          </button>

          <button
            type="button"
            data-testid="sync-log-export-csv-btn"
            onClick={handleExportLogsCsv}
            disabled={allEntries.length === 0}
            title="Export chronological sync event logs as CSV for audit"
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-semibold border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] text-[#16213A] dark:text-[#E7EBF5] hover:border-[#1F3863] dark:hover:border-[#8FA6E8] transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <Download className="w-3 h-3" strokeWidth={1.6} />
            <span>Export Logs</span>
          </button>

          <button
            type="button"
            data-testid="sync-log-clear-btn"
            onClick={handleClearAllLogs}
            disabled={allEntries.length === 0}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-semibold border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] text-[#5F6576] dark:text-[#8E96B0] hover:text-[#16213A] dark:hover:text-[#E7EBF5] transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <Trash2 className="w-3 h-3" strokeWidth={1.6} />
            <span>Clear Log</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Keyword Search Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Category Tabs */}
        <div
          role="group"
          aria-label="Filter sync event category"
          className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-[#F2EFE9] dark:bg-[#0F1529] p-0.5 border border-[#E4DFD6] dark:border-[#232B4A]"
        >
          {(
            [
              { id: 'all', label: 'All Events', count: counts.all },
              { id: 'scenarios', label: 'Scenarios', count: counts.scenarios },
              { id: 'cleanups', label: 'Auto-Cleanups', count: counts.cleanups },
              { id: 'sync_errors', label: 'Sync & Errors', count: counts.sync_errors },
              { id: 'exports', label: 'Exports', count: counts.exports },
              { id: 'offline_sync', label: 'Offline Sync History', count: counts.offline_sync },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              data-testid={`sync-log-filter-${tab.id}`}
              onClick={() => setFilter(tab.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 tabular-nums ${
                filter === tab.id
                  ? 'bg-white dark:bg-[#141A32] text-[#16213A] dark:text-[#E7EBF5] shadow-xs'
                  : 'text-[#5F6576] dark:text-[#8E96B0] hover:text-[#16213A] dark:hover:text-[#E7EBF5]'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[220px]">
          <Search
            className="w-3.5 h-3.5 text-[#5F6576] dark:text-[#8E96B0] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            strokeWidth={1.6}
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events (e.g., Scenario saved, failed)…"
            aria-label="Search sync event log"
            className="w-full h-8 pl-8 pr-7 text-xs rounded-lg bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] text-[#16213A] dark:text-[#E7EBF5] placeholder:text-[#7D8599] focus:outline-none focus:border-[#1F3863] dark:focus:border-[#8FA6E8]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search query"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#5F6576] hover:text-[#16213A] dark:hover:text-[#E7EBF5] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" strokeWidth={1.6} />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Event Timeline Container */}
      {filteredEntries.length === 0 ? (
        <div className="py-10 text-center rounded-xl border border-dashed border-[#E4DFD6] dark:border-[#232B4A] text-xs text-[#5F6576] dark:text-[#8E96B0] space-y-1">
          <div>No sync events found matching the active filter.</div>
          <div className="text-[11px] text-[#7D8599]">
            Save a scenario, perform an auto-cleanup, or run a sync check above to generate audit events.
          </div>
        </div>
      ) : (
        <div
          data-testid="sync-log-scroll-container"
          className="max-h-80 overflow-y-auto divide-y divide-[#E4DFD6] dark:divide-[#232B4A] rounded-xl border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4]/70 dark:bg-[#0F1529]/70"
        >
          {filteredEntries.map((entry) => {
            const isExport = entry.eventType === 'export';
            const badgeMeta = getEventBadgeMeta(entry.title, entry.status, entry.eventType);
            const BadgeIcon = badgeMeta.Icon;

            return (
              <div
                key={entry.id}
                data-testid={isExport ? 'sync-log-export-entry' : 'sync-log-entry'}
                className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs hover:bg-white dark:hover:bg-[#141A32]/80 transition-colors"
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  {/* Timestamp with Millisecond Precision */}
                  <span
                    data-testid={isExport ? 'sync-log-export-time' : undefined}
                    className="font-mono text-[11px] tabular-nums text-[#5F6576] dark:text-[#8E96B0] shrink-0 pt-0.5 sm:pt-0"
                    title={new Date(entry.timestamp).toISOString()}
                  >
                    {formatLogTime(entry.timestamp)}
                  </span>

                  {/* Event Category / Title Badge */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-[11px] font-semibold shrink-0 ${badgeMeta.badgeClass}`}
                  >
                    <BadgeIcon className="w-3 h-3 shrink-0" strokeWidth={1.85} aria-hidden="true" />
                    <span>{badgeMeta.tag}</span>
                  </span>

                  {/* Title & Detail */}
                  <div className="min-w-0">
                    <div className="font-semibold text-[#16213A] dark:text-[#E7EBF5] flex flex-wrap items-center gap-1.5">
                      {isExport && entry.exportMeta ? (
                        <>
                          <span
                            data-testid="sync-log-export-filename"
                            className="font-mono truncate"
                          >
                            {entry.exportMeta.filename}
                          </span>
                          <span
                            data-testid="sync-log-export-size"
                            className="font-mono text-[11px] tabular-nums text-[#1C6E46] dark:text-[#6FCB9F] shrink-0"
                          >
                            ({entry.exportMeta.formattedSize})
                          </span>
                        </>
                      ) : (
                        <span className="truncate">{entry.title}</span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#5F6576] dark:text-[#8E96B0] truncate mt-0.5">
                      {entry.detail}
                    </div>
                  </div>
                </div>

                {/* Right-hand side metadata */}
                <div className="font-mono text-[10.5px] tabular-nums text-[#5F6576] dark:text-[#8E96B0] shrink-0 sm:text-right">
                  {isExport && entry.exportMeta
                    ? `${entry.exportMeta.formattedSize}`
                    : entry.revision !== undefined
                      ? `Rev #${entry.revision}`
                      : 'Audit Logged'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
