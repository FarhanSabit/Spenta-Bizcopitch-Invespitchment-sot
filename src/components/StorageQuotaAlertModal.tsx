import React from 'react';
import { AlertTriangle, HardDrive, Sparkles, X, ShieldAlert } from 'lucide-react';

interface StorageQuotaAlertModalProps {
  isOpen: boolean;
  usagePct: number;
  usedBytes: number;
  quotaBytes: number;
  onClose: () => void;
  onRunCleanup: () => void;
  onOptimizeSpace: () => void;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(2)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

export function StorageQuotaAlertModal({
  isOpen,
  usagePct,
  usedBytes,
  quotaBytes,
  onClose,
  onRunCleanup,
  onOptimizeSpace,
}: StorageQuotaAlertModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="storage-quota-alert-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-[#FECACA] dark:border-[#7F1D1D] bg-white dark:bg-[#141A32] p-6 shadow-2xl space-y-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#FEF2F2] dark:bg-[#2A1215] border border-[#FECACA] dark:border-[#7F1D1D] flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-[#DC2626] dark:text-[#FCA5A5]" strokeWidth={1.75} />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider bg-[#FEF2F2] dark:bg-[#2A1215] text-[#DC2626] dark:text-[#FCA5A5] mb-1">
                Storage Quota Warning ({usagePct.toFixed(1)}%)
              </div>
              <h3
                id="storage-quota-alert-title"
                className="text-lg font-bold text-[#16213A] dark:text-[#E7EBF5] tracking-tight"
              >
                Browser IndexedDB Quota Threshold Exceeded (80%)
              </h3>
              <p className="text-xs text-[#5F6576] dark:text-[#A4ADC6] mt-1 leading-relaxed">
                Your local application storage footprint has reached <span className="font-mono font-semibold text-[#16213A] dark:text-[#E7EBF5]">{formatBytes(usedBytes)}</span> of the estimated <span className="font-mono font-semibold text-[#16213A] dark:text-[#E7EBF5]">{formatBytes(quotaBytes)}</span> browser limit.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close quota alert modal"
            className="p-1.5 rounded-lg text-[#5F6576] hover:text-[#16213A] dark:hover:text-[#E7EBF5] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#5F6576] dark:text-[#8E96B0]">Allocation Utilization</span>
            <span className="font-bold text-[#DC2626] dark:text-[#FCA5A5]">{usagePct.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-[#E4DFD6] dark:bg-[#232B4A] h-3 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-[#DC2626] transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(5, usagePct))}%` }}
            />
          </div>
        </div>

        {/* Actionable Tips */}
        <div className="p-4 rounded-xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] space-y-2.5">
          <h4 className="text-xs font-bold text-[#16213A] dark:text-[#E7EBF5] uppercase tracking-wide">
            Recommended Action Plan:
          </h4>
          <ul className="text-xs text-[#5F6576] dark:text-[#A4ADC6] space-y-1.5 list-disc list-inside">
            <li>Switch Cache Persistence Strategy to <strong className="text-[#16213A] dark:text-[#E7EBF5]">Optimize for Space</strong> to automatically purge stale checkpoints.</li>
            <li>Run an immediate Auto-Cleanup to remove workspace snapshots older than 30 days.</li>
            <li>Export critical investor scenarios as CSV and clear unused local cache.</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-[#E4DFD6] dark:border-[#232B4A] flex flex-wrap items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] text-[#16213A] dark:text-[#E7EBF5] hover:opacity-90 cursor-pointer"
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={() => {
              onOptimizeSpace();
              onClose();
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-[#1F3863] dark:border-[#8FA6E8] bg-[#EBF1FA] dark:bg-[#1A2342] text-[#1F3863] dark:text-[#8FA6E8] hover:opacity-90 cursor-pointer"
          >
            Optimize for Space
          </button>
          <button
            type="button"
            onClick={() => {
              onRunCleanup();
              onClose();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#DC2626] hover:bg-[#B91C1C] text-white cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Run Auto-Cleanup Now</span>
          </button>
        </div>
      </div>
    </div>
  );
}
