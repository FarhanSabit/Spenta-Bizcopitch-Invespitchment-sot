import React from 'react';

const CHUNK_RELOAD_STORAGE_KEY = 'spenta_chunk_reload_ts_v1';
const CHUNK_RELOAD_COOLDOWN_MS = 15_000;

export function isChunkLoadError(error: unknown): boolean {
  const message = (
    error instanceof Error ? `${error.name} ${error.message}` : String(error ?? '')
  ).toLowerCase();

  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('importing a module script failed') ||
    message.includes('error loading dynamically imported module') ||
    message.includes('loading chunk') ||
    message.includes('chunkloaderror') ||
    message.includes('unable to preload css')
  );
}

/**
 * Reloads the page at most once per cooldown window when a stale build hash
 * causes a dynamic module chunk fetch to fail.
 */
export function triggerChunkReloadOnce(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const now = Date.now();
    const lastReloadRaw = window.sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY);
    const lastReloadTs = lastReloadRaw ? Number(lastReloadRaw) : 0;

    if (Number.isFinite(lastReloadTs) && now - lastReloadTs < CHUNK_RELOAD_COOLDOWN_MS) {
      return false;
    }

    window.sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, String(now));
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}

/**
 * Registers Vite's `vite:preloadError` listener so stale deployment chunks
 * recover cleanly without crashing into an error boundary.
 */
export function installVitePreloadErrorHandler(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    triggerChunkReloadOnce();
  });
}

/**
 * Drop-in replacement for `React.lazy` that retries once on transient network
 * blips and performs a single guarded page reload if a stale deployment hash
 * causes a chunk fetch failure.
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    try {
      return await importer();
    } catch (firstError) {
      if (!isChunkLoadError(firstError)) {
        throw firstError;
      }

      await new Promise((resolve) => window.setTimeout(resolve, 250));

      try {
        return await importer();
      } catch (secondError) {
        if (isChunkLoadError(secondError) && triggerChunkReloadOnce()) {
          return new Promise<{ default: T }>(() => {
            // Keep Suspense visible while the browser reloads the latest bundle manifest.
          });
        }
        throw secondError;
      }
    }
  });
}
