export type SyncLogEventType = 'scenario' | 'snapshot' | 'cleanup' | 'sync' | 'export' | 'system';
export type SyncLogOperationStatus = 'synced' | 'offline' | 'syncing' | 'failed' | 'pending';

export interface SyncLogRecord {
  id: string;
  timestamp: string;
  eventType: SyncLogEventType;
  status: SyncLogOperationStatus;
  title: string;
  detail: string;
  metadata?: Record<string, unknown>;
}

const SYNC_LOGGER_STORAGE_KEY = 'spenta_sync_logger_records_v1';
const MAX_LOG_RECORDS = 250;

class SyncLoggerService {
  private listeners: ((logs: SyncLogRecord[]) => void)[] = [];
  private records: SyncLogRecord[] = [];

  constructor() {
    this.records = this.loadFromStorage();
  }

  private loadFromStorage(): SyncLogRecord[] {
    try {
      const raw = window.localStorage.getItem(SYNC_LOGGER_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as SyncLogRecord[]) : [];
    } catch {
      return [];
    }
  }

  private saveToStorage(): void {
    try {
      window.localStorage.setItem(
        SYNC_LOGGER_STORAGE_KEY,
        JSON.stringify(this.records.slice(0, MAX_LOG_RECORDS)),
      );
    } catch {
      // ignore quota errors
    }
  }

  public log(
    eventType: SyncLogEventType,
    status: SyncLogOperationStatus,
    title: string,
    detail: string,
    metadata?: Record<string, unknown>,
  ): SyncLogRecord {
    const record: SyncLogRecord = {
      id: `sync-log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      eventType,
      status,
      title,
      detail,
      metadata,
    };

    this.records = [record, ...this.records].slice(0, MAX_LOG_RECORDS);
    this.saveToStorage();
    this.notifyListeners();
    return record;
  }

  public getLogs(): SyncLogRecord[] {
    return [...this.records];
  }

  public clearLogs(): void {
    this.records = [];
    try {
      window.localStorage.removeItem(SYNC_LOGGER_STORAGE_KEY);
    } catch {
      // ignore
    }
    this.notifyListeners();
  }

  public subscribe(listener: (logs: SyncLogRecord[]) => void): () => void {
    this.listeners.push(listener);
    listener(this.getLogs());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    const current = this.getLogs();
    for (const l of this.listeners) {
      try {
        l(current);
      } catch {
        // ignore listener errors
      }
    }
  }
}

export const syncLogger = new SyncLoggerService();
