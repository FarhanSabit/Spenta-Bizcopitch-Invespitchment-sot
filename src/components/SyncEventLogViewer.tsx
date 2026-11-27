import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Trash2,
  WifiOff,
} from 'lucide-react';
import { useStack } from '../store/StackContext';
import { PersistenceSyncState, PersistenceSyncStatus } from '../utils/LocalPersistenceService';

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  status: PersistenceSyncStatus;
  previousStatus: PersistenceSyncStatus | null;
  eventType: 'initial' | 'transition' | 'sync' | 'reconcile';
  isOnline: boolean;
  backend: 'indexeddb' | 'fallback';
  activeOperations: number;
  revision: number;
  title: string;
  detail: string;
}

type LogFilter = 'all' | 'transitions' | 'synced' | 'offline';

const MAX_LOG_ENTRIES = 60;

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

function getStatusMeta(status: PersistenceSyncStatus) {
  if (status === 'offline') {
    return {
      label: 'Offline',
      badgeClass:
        'bg-[#FEF2F2] dark:bg-[#2A1215] text-[#B91C1C] dark:text-[#FCA5A5] border-[#FECACA] dark:border-[#7F1D1D]',
      Icon: WifiOff,
      spin: false,
    };
  }
  if (status === 'syncing') {
    return {
      label: 'Syncing',
      badgeClass:
        'bg-[#FFFBEB] dark:bg-[#29200D] text-[#B45309] dark:text-[#FCD34D] border-[#FDE68A] dark:border-[#78350F]',
      Icon: RefreshCw,
      spin: true,
    };
  }
  return {
    label: 'Synced',
    badgeClass:
      'bg-[#ECFDF5] dark:bg-[#0D261C] text-[#1C6E46] dark:text-[#6FCB9F] border-[#A7F3D0] dark:border-[#1E4D36]',
    Icon: CheckCircle2,
    spin: false,
  };
}

export function SyncEventLogViewer() {
  const { persistenceService, syncStatus, isOnline, lastSyncedAt, forceSync } = useStack();
  const [filter, setFilter] = useState<LogFilter>('all');
  const [events, setEvents] = useState<SyncLogEntry[]>(() => {
    const initial = persistenceService.getSyncState();
    return [
      {
        id: `sync-init-${Date.now()}`,
        timestamp: initial.lastSyncedAt ?? new Date().toISOString(),
        status: initial.status,
        previousStatus: null,
        eventType: 'initial',
        isOnline: initial.isOnline,
        backend: initial.backend,
        activeOperations: initial.activeOperations,
        revision: initial.revision,
        title: initial.isOnline
          ? `Monitor initialized (${initial.status.toUpperCase()})`
          : 'Monitor initialized while offline',
        detail: `Connected to ${initial.backend === 'indexeddb' ? 'IndexedDB (idb)' : 'LocalStorage fallback'} at revision #${initial.revision}.`,
      },
    ];
  });

  const lastSnapshotRef = useRef<{
    status: PersistenceSyncStatus;
    isOnline: boolean;
    revision: number;
    activeOperations: number;
    lastSyncedAt: string | null;
  }>({
    status: persistenceService.getSyncState().status,
    isOnline: persistenceService.getSyncState().isOnline,
    revision: persistenceService.getSyncState().revision,
    activeOperations: persistenceService.getSyncState().activeOperations,
    lastSyncedAt: persistenceService.getSyncState().lastSyncedAt,
  });

  const counterRef = useRef<number>(1);
  const mountedSyncRef = useRef<boolean>(false);

  const appendEvent = (entry: Omit<SyncLogEntry, 'id'>) => {
    counterRef.current += 1;
    const id = `sync-evt-${Date.now()}-${counterRef.current}`;
    setEvents((prev) => [{ ...entry, id }, ...prev].slice(0, MAX_LOG_ENTRIES));
  };

  useEffect(() => {
    const unsubscribe = persistenceService.subscribe((next: PersistenceSyncState) => {
      const prev = lastSnapshotRef.current;
      const fingerprintUnchanged =
        prev.status === next.status &&
        prev.isOnline === next.isOnline &&
        prev.revision === next.revision &&
        prev.activeOperations === next.activeOperations &&
        prev.lastSyncedAt === next.lastSyncedAt;

      if (fingerprintUnchanged) {
        return;
      }

      const previousStatus = prev.status;
      const wasOnline = prev.isOnline;
      lastSnapshotRef.current = {
        status: next.status,
        isOnline: next.isOnline,
        revision: next.revision,
        activeOperations: next.activeOperations,
        lastSyncedAt: next.lastSyncedAt,
      };

      let eventType: SyncLogEntry['eventType'] = 'sync';
      let title = 'IndexedDB state updated';
      let detail = `Revision #${next.revision} on ${next.backend === 'indexeddb' ? 'IndexedDB' : 'LocalStorage fallback'}.`;

      if (wasOnline && !next.isOnline) {
        eventType = 'transition';
        title = 'Network offline — writes queued locally';
        detail =
          'Browser lost connectivity. Pending scenario & snapshot mutations remain safely cached in IndexedDB.';
      } else if (!wasOnline && next.isOnline) {
        eventType = 'transition';
        title =
          next.status === 'syncing'
            ? 'Connection restored — reconciling offline changes'
            : 'Connection restored — Online (Synced)';
        detail = `Offline-to-online transition detected (${next.backend}). Ready for workspace reconciliation.`;
      } else if (previousStatus !== next.status) {
        eventType = 'transition';
        if (next.status === 'syncing') {
          title = `Sync operation started (${next.activeOperations} active)`;
          detail = 'Writing & verifying local persistence object stores.';
        } else if (next.status === 'synced') {
          title =
            next.revision > prev.revision
              ? `Sync completed — Revision #${next.revision}`
              : 'All local stores verified (Synced)';
          detail = next.lastSyncedAt
            ? `Confirmed persistence commit at ${formatLogTime(next.lastSyncedAt)}.`
            : 'Storage verification completed cleanly.';
        } else {
          title = 'Entered offline persistence state';
          detail = 'Waiting for browser connectivity.';
        }
      } else if (next.revision > prev.revision) {
        eventType = 'reconcile';
        title = `Committed local persistence revision #${next.revision}`;
        detail = `Active stores committed and verified (${next.backend}).`;
      }

      appendEvent({
        timestamp: new Date().toISOString(),
        status: next.status,
        previousStatus,
        eventType,
        isOnline: next.isOnline,
        backend: next.backend,
        activeOperations: next.activeOperations,
        revision: next.revision,
        title,
        detail,
      });
    });

    return () => unsubscribe();
  }, [persistenceService]);

  // Also observe React-level syncStatus / forceSync transitions when no IDB mutation occurred
  useEffect(() => {
    if (!mountedSyncRef.current) {
      mountedSyncRef.current = true;
      return;
    }

    const prev = lastSnapshotRef.current;
    const effectiveOnline = isOnline;
    const derivedStatus: PersistenceSyncStatus = !effectiveOnline
      ? 'offline'
      : syncStatus === 'syncing'
        ? 'syncing'
        : 'synced';

    if (
      prev.status === derivedStatus &&
      prev.isOnline === effectiveOnline &&
      prev.lastSyncedAt === lastSyncedAt
    ) {
      return;
    }

    const previousStatus = prev.status;
    lastSnapshotRef.current = {
      ...prev,
      status: derivedStatus,
      isOnline: effectiveOnline,
      lastSyncedAt,
    };

    const isTransition = previousStatus !== derivedStatus || prev.isOnline !== effectiveOnline;
    const currentSnapshot = persistenceService.getSyncState();

    appendEvent({
      timestamp: new Date().toISOString(),
      status: derivedStatus,
      previousStatus,
      eventType: isTransition ? 'transition' : 'reconcile',
      isOnline: effectiveOnline,
      backend: currentSnapshot.backend,
      activeOperations: currentSnapshot.activeOperations,
      revision: currentSnapshot.revision,
      title:
        !prev.isOnline && effectiveOnline
          ? 'Connection restored — Online'
          : prev.isOnline && !effectiveOnline
            ? 'Network disconnected — Offline mode'
            : derivedStatus === 'syncing'
              ? 'Synchronizing workspace stores…'
              : 'Workspace state synchronized',
      detail: `Status ${previousStatus} → ${derivedStatus} (Rev #${currentSnapshot.revision}).`,
    });
  }, [syncStatus, isOnline, lastSyncedAt, persistenceService]);

  const filteredEvents = useMemo(() => {
    if (filter === 'all') return events;
    if (filter === 'transitions') return events.filter((e) => e.eventType === 'transition');
    if (filter === 'synced') return events.filter((e) => e.status === 'synced');
    return events.filter((e) => e.status === 'offline' || e.status === 'syncing');
  }, [events, filter]);

  const counts = useMemo(() => {
    return {
      all: events.length,
      transitions: events.filter((e) => e.eventType === 'transition').length,
      synced: events.filter((e) => e.status === 'synced').length,
      offline: events.filter((e) => e.status === 'offline' || e.status === 'syncing').length,
    };
  }, [events]);

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
              ({events.length} event{events.length === 1 ? '' : 's'})
            </span>
          </div>
          <p className="text-xs text-[#5F6576] dark:text-[#8E96B0]">
            Chronological telemetry stream from <span className="font-mono">LocalPersistenceService</span> tracking offline-to-online transitions and verification commits.
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
            data-testid="sync-log-clear-btn"
            onClick={() => setEvents([])}
            disabled={events.length === 0}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-semibold border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] text-[#5F6576] dark:text-[#8E96B0] hover:text-[#16213A] dark:hover:text-[#E7EBF5] transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <Trash2 className="w-3 h-3" strokeWidth={1.6} />
            <span>Clear Log</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          role="group"
          aria-label="Filter sync events"
          className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-[#F2EFE9] dark:bg-[#0F1529] p-0.5 border border-[#E4DFD6] dark:border-[#232B4A]"
        >
          {(
            [
              { id: 'all', label: 'All Events', count: counts.all },
              { id: 'transitions', label: 'Transitions', count: counts.transitions },
              { id: 'synced', label: 'Synced', count: counts.synced },
              { id: 'offline', label: 'Offline / Active', count: counts.offline },
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

        <div className="text-[11px] font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0]">
          Current State:{' '}
          <strong className="text-[#16213A] dark:text-[#E7EBF5] uppercase">
            {syncStatus}
          </strong>{' '}
          ({isOnline ? 'Online' : 'Offline'})
        </div>
      </div>

      {/* Chronological Event Timeline List */}
      {filteredEvents.length === 0 ? (
        <div className="py-8 text-center rounded-xl border border-dashed border-[#E4DFD6] dark:border-[#232B4A] text-xs text-[#5F6576] dark:text-[#8E96B0]">
          {events.length === 0
            ? 'Sync log cleared. Run a sync check, save a scenario, or toggle connectivity to record new events.'
            : 'No sync events match the selected filter.'}
        </div>
      ) : (
        <div className="max-h-72 overflow-y-auto divide-y divide-[#E4DFD6] dark:divide-[#232B4A] rounded-xl border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4]/70 dark:bg-[#0F1529]/70">
          {filteredEvents.map((entry) => {
            const meta = getStatusMeta(entry.status);
            const StatusIcon = meta.Icon;
            return (
              <div
                key={entry.id}
                data-testid="sync-log-entry"
                className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-white dark:hover:bg-[#141A32]/70 transition-colors"
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <span className="font-mono text-[11px] tabular-nums text-[#5F6576] dark:text-[#8E96B0] shrink-0 pt-0.5 sm:pt-0">
                    {formatLogTime(entry.timestamp)}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold shrink-0 ${meta.badgeClass}`}
                  >
                    <StatusIcon
                      className={`w-3 h-3 shrink-0 ${meta.spin ? 'animate-spin' : ''}`}
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                    <span>{meta.label}</span>
                  </span>

                  <div className="min-w-0">
                    <div className="font-semibold text-[#16213A] dark:text-[#E7EBF5] flex flex-wrap items-center gap-1.5">
                      <span className="truncate">{entry.title}</span>
                      {entry.previousStatus && entry.previousStatus !== entry.status && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#5F6576] dark:text-[#8E96B0] shrink-0">
                          <span>{entry.previousStatus}</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                          <span>{entry.status}</span>
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#5F6576] dark:text-[#8E96B0] truncate">
                      {entry.detail}
                    </div>
                  </div>
                </div>

                <div className="font-mono text-[11px] tabular-nums text-[#5F6576] dark:text-[#8E96B0] shrink-0 sm:text-right">
                  Rev #{entry.revision} · {entry.backend === 'indexeddb' ? 'idb' : 'fallback'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
