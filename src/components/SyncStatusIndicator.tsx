import React, { useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, WifiOff } from 'lucide-react';
import { useStack } from '../store/StackContext';
import { PersistenceSyncState } from '../utils/LocalPersistenceService';

interface SyncStatusIndicatorProps {
  compact?: boolean;
}

function formatSyncTime(iso: string | null): string {
  if (!iso) return 'Not yet synced';
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function SyncStatusIndicator({ compact = false }: SyncStatusIndicatorProps) {
  const { persistenceService, syncStatus, isOnline, lastSyncedAt, forceSync } = useStack();
  const [observedState, setObservedState] = useState<PersistenceSyncState>(() =>
    persistenceService.getSyncState(),
  );
  const [tooltipOpen, setTooltipOpen] = useState<boolean>(false);

  useEffect(() => {
    return persistenceService.subscribe((next) => {
      setObservedState(next);
    });
  }, [persistenceService]);

  const effectiveOnline = isOnline && observedState.isOnline;
  const effectiveStatus = !effectiveOnline
    ? 'offline'
    : syncStatus === 'syncing' || observedState.status === 'syncing'
      ? 'syncing'
      : 'synced';
  const effectiveLastSyncedAt = lastSyncedAt ?? observedState.lastSyncedAt;

  const queuedOfflineChanges = observedState.pendingUnsyncedCount ?? 0;
  const activeWrites = observedState.activeOperations ?? 0;
  const totalPendingChanges = queuedOfflineChanges + activeWrites;
  const pendingStores = observedState.pendingUnsyncedStores ?? [];

  const nextAutoSyncLabel =
    effectiveStatus === 'offline'
      ? 'Automatic on reconnect'
      : effectiveStatus === 'syncing'
        ? 'In progress now'
        : totalPendingChanges > 0
          ? 'Pending auto-reconcile'
          : 'Auto-save on edit (150ms debounce)';

  const pendingSummaryText = `${totalPendingChanges} pending unsynced change${
    totalPendingChanges === 1 ? '' : 's'
  } in IndexedDB`;

  const statusConfig =
    effectiveStatus === 'offline'
      ? {
          label: 'Offline',
          colorClass: 'text-[#B91C1C] dark:text-[#FCA5A5]',
          Icon: WifiOff,
          spin: false,
          detail: `Offline — ${pendingSummaryText} before next automatic sync on reconnect.`,
        }
      : effectiveStatus === 'syncing'
        ? {
            label: 'Syncing',
            colorClass: 'text-[#B45309] dark:text-[#FCD34D]',
            Icon: RefreshCw,
            spin: true,
            detail: `Synchronizing local IndexedDB stores — ${pendingSummaryText}.`,
          }
        : {
            label: 'Synced',
            colorClass: 'text-[#1C6E46] dark:text-[#6FCB9F]',
            Icon: CheckCircle2,
            spin: false,
            detail: `IndexedDB synced (${observedState.backend}) · ${pendingSummaryText} · Last sync ${formatSyncTime(effectiveLastSyncedAt)}`,
          };

  const StatusIcon = statusConfig.Icon;
  const forceDisabled = !effectiveOnline || effectiveStatus === 'syncing';

  const handleForceSync = () => {
    void forceSync();
  };

  return (
    <div
      className={`relative inline-flex items-center rounded-md border border-[#E4DFD6] dark:border-[#232B4A] bg-[#F2EFE9] dark:bg-[#141A32] shrink-0 whitespace-nowrap ${
        compact ? 'w-full justify-between h-11 px-3' : 'h-8'
      }`}
      role="status"
      aria-live="polite"
      title={statusConfig.detail}
      onMouseEnter={() => setTooltipOpen(true)}
      onMouseLeave={() => setTooltipOpen(false)}
      onFocus={() => setTooltipOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setTooltipOpen(false);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setTooltipOpen(false);
        }
      }}
    >
      <span
        className={`inline-flex items-center gap-1.5 text-[11px] font-medium whitespace-nowrap ${
          compact ? '' : 'pl-2 pr-2'
        } ${statusConfig.colorClass}`}
      >
        <StatusIcon
          className={`w-3.5 h-3.5 shrink-0 ${statusConfig.spin ? 'animate-spin' : ''}`}
          strokeWidth={1.75}
          aria-hidden="true"
        />
        <span data-testid="sync-status-label">{statusConfig.label}</span>
      </span>

      <span
        className="h-4 w-px bg-[#DFD9CE] dark:bg-[#232B4A] shrink-0"
        aria-hidden="true"
      />

      <button
        type="button"
        onClick={handleForceSync}
        disabled={forceDisabled}
        aria-label={
          !effectiveOnline
            ? `Force Sync unavailable while offline (${pendingSummaryText})`
            : effectiveStatus === 'syncing'
              ? `Synchronization in progress (${pendingSummaryText})`
              : `Force Sync local IndexedDB storage (${pendingSummaryText})`
        }
        title={
          !effectiveOnline
            ? `Connection unavailable — ${pendingSummaryText} queued until reconnect`
            : `Re-verify local IndexedDB stores (${pendingSummaryText} · Last sync: ${formatSyncTime(effectiveLastSyncedAt)})`
        }
        className={`inline-flex items-center gap-1 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3863] dark:focus-visible:ring-[#8FA6E8] rounded-r-md ${
          compact ? 'px-2.5 py-1.5 min-h-[36px]' : 'px-2 h-full'
        } ${
          forceDisabled
            ? 'text-[#949CAE] dark:text-[#5B6482] cursor-not-allowed'
            : 'text-[#1F3863] dark:text-[#8FA6E8] hover:bg-[#E8E3D9] dark:hover:bg-[#1C2444] cursor-pointer'
        }`}
      >
        <RefreshCw
          className={`w-3 h-3 shrink-0 ${effectiveStatus === 'syncing' ? 'animate-spin' : ''}`}
          strokeWidth={1.75}
          aria-hidden="true"
        />
        <span>Force Sync</span>
      </button>

      {/* Detailed Hover / Focus Tooltip */}
      {tooltipOpen && (
        <div
          role="tooltip"
          data-testid="sync-status-tooltip"
          className={`absolute top-full mt-2 z-50 w-72 sm:w-80 rounded-xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] p-3.5 shadow-xl text-left whitespace-normal ${
            compact ? 'left-0' : 'right-0'
          }`}
        >
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#E4DFD6] dark:border-[#232B4A]">
            <span className={`text-xs font-bold ${statusConfig.colorClass}`}>
              IndexedDB {statusConfig.label}
            </span>
            <span className="text-[11px] font-mono text-[#5F6576] dark:text-[#8E96B0]">
              {observedState.backend === 'fallback' ? 'LocalStorage fallback' : 'IndexedDB (idb)'}
            </span>
          </div>

          <div className="mt-2.5 space-y-2 text-[11px]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[#5F6576] dark:text-[#8E96B0]">
                Pending Unsynced Changes
              </span>
              <span
                data-testid="sync-tooltip-pending-count"
                className={`font-mono tabular-nums font-bold ${
                  totalPendingChanges > 0
                    ? 'text-[#B45309] dark:text-[#FCD34D]'
                    : 'text-[#1C6E46] dark:text-[#6FCB9F]'
                }`}
              >
                {totalPendingChanges}
              </span>
            </div>

            <div className="text-[#4A5568] dark:text-[#A4ADC6] leading-snug">
              {totalPendingChanges === 0
                ? 'All local IndexedDB object stores are reconciled with 0 pending changes.'
                : `${totalPendingChanges} unsynced local change${totalPendingChanges === 1 ? '' : 's'} remaining in IndexedDB before the next automatic sync.`}
            </div>

            {pendingStores.length > 0 && (
              <div className="font-mono text-[10px] text-[#5F6576] dark:text-[#8E96B0] break-words">
                Queued stores: {pendingStores.join(' · ')}
              </div>
            )}

            <div className="pt-2 border-t border-[#E4DFD6] dark:border-[#232B4A] space-y-1 font-mono tabular-nums text-[10px] text-[#5F6576] dark:text-[#8E96B0]">
              <div className="flex items-center justify-between gap-2">
                <span>Next Auto-Sync</span>
                <span className="text-[#16213A] dark:text-[#E7EBF5] font-medium">
                  {nextAutoSyncLabel}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>Last Synced</span>
                <span className="text-[#16213A] dark:text-[#E7EBF5]">
                  {formatSyncTime(effectiveLastSyncedAt)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>Store Revision</span>
                <span className="text-[#16213A] dark:text-[#E7EBF5]">
                  #{observedState.revision}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
