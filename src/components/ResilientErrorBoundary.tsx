import React from 'react';
import { AlertTriangle, RefreshCw, RotateCcw, WifiOff } from 'lucide-react';
import { isChunkLoadError } from '../utils/lazyWithRetry';

export interface ResilientErrorBoundaryProps {
  children: React.ReactNode;
  scope?: 'portal' | 'view';
  resetKey?: string | number;
  contextLabel?: string;
  onReturnHome?: () => void;
}

interface ResilientErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

function classifyError(error: Error | null): 'chunk' | 'connectivity' | 'webgl' | 'runtime' {
  if (isChunkLoadError(error)) {
    return 'chunk';
  }
  const msg = (error?.message ?? '').toLowerCase();
  if (
    msg.includes('websocket') ||
    msg.includes('network') ||
    msg.includes('fetch') ||
    msg.includes('failed to load')
  ) {
    return 'connectivity';
  }
  if (msg.includes('webgl') || msg.includes('three') || msg.includes('context lost')) {
    return 'webgl';
  }
  return 'runtime';
}

export class ResilientErrorBoundary extends React.Component<
  ResilientErrorBoundaryProps,
  ResilientErrorBoundaryState
> {
  constructor(props: ResilientErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ResilientErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[Spenta ErrorBoundary]', this.props.contextLabel ?? 'Portal', error, info);
  }

  componentDidUpdate(prevProps: ResilientErrorBoundaryProps): void {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  private handleRetry = (): void => {
    if (isChunkLoadError(this.state.error)) {
      window.location.reload();
      return;
    }
    this.setState({ hasError: false, error: null });
  };

  private handleResetAndReload = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    const { hasError, error } = this.state;
    const { children, scope = 'view', contextLabel, onReturnHome } = this.props;

    if (!hasError) {
      return children;
    }

    const kind = classifyError(error);
    const title =
      kind === 'chunk'
        ? 'Updated Application Build Available'
        : kind === 'connectivity'
          ? 'Environment or Connectivity Interruption'
          : kind === 'webgl'
            ? '3D Graphics Context Interrupted'
            : `Unable to Render ${contextLabel ?? 'Workspace View'}`;

    const guidance =
      kind === 'chunk'
        ? 'A newer version of this view was published while your session was open. Reload to fetch the latest module bundle — your saved stack and workspace state are preserved.'
        : kind === 'connectivity'
          ? 'A network request, module chunk, or transport stream was interrupted. Your composed stack and application state remain intact.'
          : kind === 'webgl'
            ? 'The browser 3D graphics context paused or failed to initialize. Other workspace views remain fully operational.'
            : 'An unexpected component error occurred inside this view. Your navigation and saved stack state are preserved.';

    if (scope === 'portal') {
      return (
        <div className="min-h-screen bg-[#FAF8F4] dark:bg-[#0B1020] text-[#16213A] dark:text-[#E7EBF5] flex items-center justify-center p-6">
          <div
            role="alert"
            className="max-w-lg w-full rounded-2xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] p-6 sm:p-8 shadow-xl space-y-4"
          >
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-center">
              {kind === 'connectivity' || kind === 'chunk' ? (
                <WifiOff className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <div className="space-y-1.5">
              <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#1C6E46] dark:text-[#6FCB9F]">
                Spenta Sovereign OS · Recovery Guard
              </div>
              <h1 className="text-lg sm:text-xl font-bold">{title}</h1>
              <p className="text-xs sm:text-sm text-[#4A5568] dark:text-[#A4ADC6] leading-relaxed">
                {guidance}
              </p>
            </div>
            {error?.message && (
              <div className="rounded-lg bg-[#FAF8F4] dark:bg-[#0B1020] border border-[#E4DFD6] dark:border-[#232B4A] px-3 py-2 text-[11px] font-mono text-[#5F6576] dark:text-[#8E96B0] break-words">
                {error.message}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={this.handleRetry}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1F3863] dark:bg-[#8FA6E8] text-white dark:text-[#0B1020] text-xs font-semibold hover:opacity-95 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{kind === 'chunk' ? 'Reload Latest Version' : 'Restore Session'}</span>
              </button>
              <button
                type="button"
                onClick={this.handleResetAndReload}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0B1020] text-xs font-semibold hover:border-[#1F3863] cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reload Portal</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <section
        role="alert"
        className="rounded-2xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] p-6 sm:p-8 space-y-4"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-center shrink-0">
            {kind === 'connectivity' || kind === 'chunk' ? (
              <WifiOff className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            )}
          </div>
          <div className="space-y-1 min-w-0">
            <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#1C6E46] dark:text-[#6FCB9F]">
              Resilient View Boundary · {contextLabel ?? 'Active Workspace'}
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#16213A] dark:text-[#E7EBF5]">
              {title}
            </h2>
            <p className="text-xs sm:text-sm text-[#4A5568] dark:text-[#A4ADC6] leading-relaxed">
              {guidance}
            </p>
          </div>
        </div>

        {error?.message && (
          <div className="rounded-lg bg-[#FAF8F4] dark:bg-[#0B1020] border border-[#E4DFD6] dark:border-[#232B4A] px-3 py-2 text-[11px] font-mono text-[#5F6576] dark:text-[#8E96B0] break-words">
            {error.message}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={this.handleRetry}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1C6E46] dark:bg-[#6FCB9F] text-white dark:text-[#0B1020] text-xs font-semibold hover:opacity-95 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{kind === 'chunk' ? 'Reload Latest Version' : 'Retry View'}</span>
          </button>
          {onReturnHome && (
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                onReturnHome();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0B1020] text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5] hover:border-[#1F3863] cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Return to App Vault</span>
            </button>
          )}
        </div>
      </section>
    );
  }
}
