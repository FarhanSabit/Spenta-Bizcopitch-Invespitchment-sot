import React from 'react';

export type DividerAccent = 'cyan' | 'emerald' | 'indigo' | 'purple';

const ACCENT_TOKENS: Record<
  DividerAccent,
  {
    track: string;
    beam: string;
    diamond: string;
    ring: string;
    label: string;
  }
> = {
  cyan: {
    track: 'via-cyan-500/35 dark:via-cyan-400/40',
    beam: 'from-transparent via-cyan-600/75 dark:via-cyan-300/90 to-transparent',
    diamond: 'bg-cyan-600 dark:bg-cyan-400 shadow-[0_0_10px_1px_rgba(8,145,178,0.35)] dark:shadow-[0_0_14px_3px_rgba(34,211,238,0.45)]',
    ring: 'border-cyan-600/50 dark:border-cyan-400/60',
    label: 'text-cyan-700 dark:text-cyan-300 border-cyan-600/25 dark:border-cyan-400/30 bg-cyan-50/90 dark:bg-slate-950/90',
  },
  emerald: {
    track: 'via-emerald-500/35 dark:via-emerald-400/40',
    beam: 'from-transparent via-emerald-600/75 dark:via-emerald-300/90 to-transparent',
    diamond: 'bg-emerald-600 dark:bg-emerald-400 shadow-[0_0_10px_1px_rgba(5,150,105,0.35)] dark:shadow-[0_0_14px_3px_rgba(52,211,153,0.45)]',
    ring: 'border-emerald-600/50 dark:border-emerald-400/60',
    label: 'text-emerald-700 dark:text-emerald-300 border-emerald-600/25 dark:border-emerald-400/30 bg-emerald-50/90 dark:bg-slate-950/90',
  },
  indigo: {
    track: 'via-indigo-500/35 dark:via-indigo-400/40',
    beam: 'from-transparent via-indigo-600/75 dark:via-indigo-300/90 to-transparent',
    diamond: 'bg-indigo-600 dark:bg-indigo-400 shadow-[0_0_10px_1px_rgba(79,70,229,0.35)] dark:shadow-[0_0_14px_3px_rgba(129,140,248,0.45)]',
    ring: 'border-indigo-600/50 dark:border-indigo-400/60',
    label: 'text-indigo-700 dark:text-indigo-300 border-indigo-600/25 dark:border-indigo-400/30 bg-indigo-50/90 dark:bg-slate-950/90',
  },
  purple: {
    track: 'via-purple-500/35 dark:via-purple-400/40',
    beam: 'from-transparent via-purple-600/75 dark:via-purple-300/90 to-transparent',
    diamond: 'bg-purple-600 dark:bg-purple-400 shadow-[0_0_10px_1px_rgba(147,51,234,0.35)] dark:shadow-[0_0_14px_3px_rgba(192,132,252,0.45)]',
    ring: 'border-purple-600/50 dark:border-purple-400/60',
    label: 'text-purple-700 dark:text-purple-300 border-purple-600/25 dark:border-purple-400/30 bg-purple-50/90 dark:bg-slate-950/90',
  },
};

export function SectionDivider({
  accent = 'cyan',
  label,
}: {
  accent?: DividerAccent;
  label: string;
}) {
  const tokens = ACCENT_TOKENS[accent];

  return (
    <div
      className="section-divider ssot-no-print relative py-2 max-w-[1440px] mx-auto px-4 sm:px-6 flex items-center justify-center overflow-hidden"
      aria-hidden="true"
    >
      {/* 1px Gradient Track with sweeping light beam */}
      <div
        className={`relative w-full h-px bg-gradient-to-r from-transparent ${tokens.track} to-transparent overflow-hidden`}
      >
        <div
          className={`animate-divider-sweep absolute top-0 left-0 h-full w-1/3 bg-gradient-to-r ${tokens.beam}`}
        />
      </div>

      {/* Central Rotated Diamond Core + Accent Chapter Label */}
      <div
        className={`absolute flex items-center gap-2.5 px-3 py-1 rounded-md border text-[10px] font-mono font-semibold tracking-wider uppercase whitespace-nowrap shadow-xs transition-colors backdrop-blur-sm select-none pointer-events-none ${tokens.label}`}
      >
        <span className="relative flex items-center justify-center w-3 h-3 shrink-0">
          <span
            className={`animate-divider-pulse absolute inset-0 rounded-[2px] rotate-45 border ${tokens.ring}`}
          />
          <span className={`w-2 h-2 rotate-45 rounded-[1px] ${tokens.diamond}`} />
        </span>
        <span className="text-slate-700 dark:text-slate-200">{label}</span>
      </div>
    </div>
  );
}
