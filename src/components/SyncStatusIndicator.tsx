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

  const statusConfig =
    effectiveStatus === 'offline'
      ? {
          label: 'Offline',
          colorClass: 'text-[#B91C1C] dark:text-[#FCA5A5]',
          Icon: WifiOff,
          spin: false,
          detail: 'Offline — changes are stored locally in IndexedDB until connection returns.',
        }
      : effectiveStatus === 'syncing'
        ? {
            label: 'Syncing',
            colorClass: 'text-[#B45309] dark:text-[#FCD34D]',
            Icon: RefreshCw,
            spin: true,
            detail: 'Synchronizing local IndexedDB stores…',
          }
        : {
            label: 'Synced',
            colorClass: 'text-[#1C6E46] dark:text-[#6FCB9F]',
            Icon: CheckCircle2,
            spin: false,
            detail: `IndexedDB synced (${observedState.backend}) · Last update ${formatSyncTime(effectiveLastSyncedAt)}`,
          };

  const StatusIcon = statusConfig.Icon;
  const forceDisabled = !effectiveOnline || effectiveStatus === 'syncing';

  const handleForceSync = () => {
    void forceSync();
  };

  return (
    <div
      className={`inline-flex items-center rounded-md border border-[#E4DFD6] dark:border-[#232B4A] bg-[#F2EFE9] dark:bg-[#141A32] shrink-0 whitespace-nowrap ${
        compact ? 'w-full justify-between h-11 px-3' : 'h-8'
      }`}
      role="status"
      aria-live="polite"
      title={statusConfig.detail}
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
            ? 'Force Sync unavailable while offline'
            : effectiveStatus === 'syncing'
              ? 'Synchronization in progress'
              : 'Force Sync local IndexedDB storage against master workspace state'
        }
        title={
          !effectiveOnline
            ? 'Connection unavailable — reconnect to run Force Sync'
            : `Re-verify local IndexedDB stores against workspace state (Last sync: ${formatSyncTime(effectiveLastSyncedAt)})`
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
    </div>
  );
}
