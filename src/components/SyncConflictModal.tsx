import React from 'react';
import { AlertTriangle, ShieldAlert, X, RefreshCw, HardDrive } from 'lucide-react';

interface SyncConflictModalProps {
  isOpen: boolean;
  title: string;
  detail: string;
  localRevision: number;
  serverRevision: number;
  onKeepLocal: () => void;
  onOverwriteServer: () => void;
}

export function SyncConflictModal({
  isOpen,
  title,
  detail,
  localRevision,
  serverRevision,
  onKeepLocal,
  onOverwriteServer,
}: SyncConflictModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sync-conflict-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4"
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
                Sync Conflict / Version Mismatch
              </div>
              <h3
                id="sync-conflict-title"
                className="text-lg font-bold text-[#16213A] dark:text-[#E7EBF5] tracking-tight"
              >
                {title}
              </h3>
              <p className="text-xs text-[#5F6576] dark:text-[#A4ADC6] mt-1.5 leading-relaxed">
                {detail}
              </p>
            </div>
          </div>
        </div>

        {/* Revision Comparison Box */}
        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] text-xs font-mono tabular-nums">
          <div>
            <span className="text-[#5F6576] dark:text-[#8E96B0] block text-[10px]">LOCAL STORE</span>
            <span className="font-bold text-[#16213A] dark:text-[#E7EBF5] text-sm">
              Revision v{localRevision}
            </span>
          </div>
          <div>
            <span className="text-[#5F6576] dark:text-[#8E96B0] block text-[10px]">SERVER / INCOMING</span>
            <span className="font-bold text-[#1F3863] dark:text-[#8FA6E8] text-sm">
              Revision v{serverRevision}
            </span>
          </div>
        </div>

        {/* Choice Explanation */}
        <div className="text-xs text-[#5F6576] dark:text-[#A4ADC6] space-y-1">
          <p>Please select how to resolve this synchronization disparity:</p>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-[#7D8599]">
            <li><strong>Keep Local:</strong> Preserves your current client modifications and bumps local sequence revision.</li>
            <li><strong>Overwrite with Server:</strong> Replaces local cached object stores with authoritative server snapshot state.</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-[#E4DFD6] dark:border-[#232B4A] flex items-center justify-end gap-3">
          <button
            type="button"
            data-testid="conflict-keep-local-btn"
            onClick={onKeepLocal}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] text-[#16213A] dark:text-[#E7EBF5] hover:opacity-90 cursor-pointer"
          >
            Keep Local (Authoritative)
          </button>
          <button
            type="button"
            data-testid="conflict-overwrite-server-btn"
            onClick={onOverwriteServer}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#1F3863] text-white dark:bg-[#8FA6E8] dark:text-[#0B1020] hover:opacity-90 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Overwrite with Server</span>
          </button>
        </div>
      </div>
    </div>
  );
}
