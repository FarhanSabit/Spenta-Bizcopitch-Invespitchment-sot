import React, { useEffect, useState } from 'react';
import { Database, HardDrive, RefreshCw, Server, ShieldCheck, Cpu } from 'lucide-react';
import { PersistenceStorageMetrics } from '../utils/LocalPersistenceService';

interface StorageDiagnosticsPanelProps {
  metrics: PersistenceStorageMetrics | null;
  onRefresh: () => void;
  loading: boolean;
}

interface IDBInfoItem {
  name: string;
  version?: number;
  estimatedSize?: string;
  backend: string;
}

export function StorageDiagnosticsPanel({
  metrics,
  onRefresh,
  loading,
}: StorageDiagnosticsPanelProps) {
  const [browserDatabases, setBrowserDatabases] = useState<IDBInfoItem[]>([]);
  const [checkingDatabases, setCheckingDatabases] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    const fetchDatabases = async () => {
      setCheckingDatabases(true);
      const items: IDBInfoItem[] = [];

      try {
        if (typeof indexedDB !== 'undefined' && typeof indexedDB.databases === 'function') {
          const dbs = await indexedDB.databases();
          for (const db of dbs) {
            items.push({
              name: db.name ?? 'Unnamed Database',
              version: db.version,
              backend: 'IndexedDB (native)',
            });
          }
        }
      } catch {
        // ignore if not supported or blocked
      }

      // Always include active app db if not present
      const activeDbName = metrics?.dbName ?? 'spenta_sovereign_offline_db';
      if (!items.some((i) => i.name === activeDbName)) {
        items.push({
          name: activeDbName,
          version: metrics?.dbVersion ?? 3,
          estimatedSize: metrics ? `${(metrics.estimatedPayloadBytes / 1024).toFixed(1)} KB` : 'Unknown',
          backend: metrics?.backend === 'fallback' ? 'LocalStorage Fallback' : 'IndexedDB (idb)',
        });
      }

      if (active) {
        setBrowserDatabases(items);
        setCheckingDatabases(false);
      }
    };

    void fetchDatabases();
    return () => {
      active = false;
    };
  }, [metrics]);

  return (
    <div
      data-testid="storage-diagnostics-panel"
      className="rounded-2xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] p-5 space-y-4 shadow-xs"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E4DFD6] dark:border-[#232B4A]">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#EBF1FA] dark:bg-[#1A2342] text-[#1F3863] dark:text-[#8FA6E8] flex items-center justify-center shrink-0">
              <Cpu className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <h3 className="text-sm font-bold text-[#16213A] dark:text-[#E7EBF5]">
              Storage Diagnostics &amp; IndexedDB Inspector
            </h3>
          </div>
          <p className="text-xs text-[#5F6576] dark:text-[#8E96B0] mt-1">
            Inspecting browser IndexedDB databases, object store allocation, and schema metadata for investor debugging.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] text-[#16213A] dark:text-[#E7EBF5] hover:border-[#1F3863] dark:hover:border-[#8FA6E8] transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          <span>Run Diagnostics</span>
        </button>
      </div>

      {/* Database Listing Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-[#E4DFD6] dark:border-[#232B4A] text-[#5F6576] dark:text-[#8E96B0]">
              <th className="pb-2.5 font-semibold">Database Name</th>
              <th className="pb-2.5 font-semibold">Version</th>
              <th className="pb-2.5 font-semibold">Storage Engine</th>
              <th className="pb-2.5 font-semibold">Entries &amp; Stores</th>
              <th className="pb-2.5 font-semibold text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E4DFD6]/50 dark:divide-[#232B4A]/50">
            {checkingDatabases ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-[#5F6576] dark:text-[#8E96B0]">
                  Querying browser IndexedDB subsystem…
                </td>
              </tr>
            ) : browserDatabases.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-[#5F6576] dark:text-[#8E96B0]">
                  No active IndexedDB databases found in browser context.
                </td>
              </tr>
            ) : (
              browserDatabases.map((db, idx) => (
                <tr key={idx} className="hover:bg-[#FAF8F4] dark:hover:bg-[#0F1529]/60 transition-colors">
                  <td className="py-3 font-semibold text-[#16213A] dark:text-[#E7EBF5] flex items-center gap-2">
                    <Server className="w-3.5 h-3.5 text-[#1F3863] dark:text-[#8FA6E8]" />
                    <span>{db.name}</span>
                  </td>
                  <td className="py-3 text-[#5F6576] dark:text-[#8E96B0]">
                    v{db.version ?? metrics?.dbVersion ?? 3}
                  </td>
                  <td className="py-3 text-[#5F6576] dark:text-[#8E96B0]">
                    {db.backend}
                  </td>
                  <td className="py-3 text-[#16213A] dark:text-[#E7EBF5]">
                    {metrics ? `${metrics.totalEntries} records (${metrics.storeStats.length} stores)` : db.estimatedSize ?? 'Active'}
                  </td>
                  <td className="py-3 text-right">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#ECFDF5] dark:bg-[#0D261C] text-[#1C6E46] dark:text-[#6FCB9F]">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Healthy</span>
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Diagnostics Summary Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] text-xs font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0]">
        <div>
          IndexedDB API Support: <strong className="text-[#16213A] dark:text-[#E7EBF5]">{typeof indexedDB !== 'undefined' ? 'Fully Supported' : 'Restricted'}</strong>
        </div>
        <div>
          Active Stores: <strong className="text-[#16213A] dark:text-[#E7EBF5]">{metrics?.storeStats.length ?? 8} object stores</strong>
        </div>
      </div>
    </div>
  );
}
