export type RenderPhase = 'mount' | 'update' | 'nested-update';

export type SystemHealthStatus = 'nominal' | 'elevated' | 'degraded';

export interface ComponentRenderMetric {
  id: string;
  renderCount: number;
  lastDurationMs: number;
  baseDurationMs: number;
  avgDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  totalDurationMs: number;
  lastPhase: RenderPhase;
  slowRenderCount: number;
  lastRenderedAt: number;
}

export interface RenderSample {
  id: string;
  phase: RenderPhase;
  durationMs: number;
  baseDurationMs: number;
  timestamp: number;
}

export interface RawMemoryReading {
  supported: boolean;
  usedJSHeapBytes: number | null;
  totalJSHeapBytes: number | null;
  jsHeapLimitBytes: number | null;
  deviceMemoryGb: number | null;
  domNodeCount: number | null;
}

export interface MemorySnapshot extends RawMemoryReading {
  heapUsagePct: number | null;
  peakUsedBytes: number | null;
  deltaFromBaselineBytes: number | null;
  timestamp: number;
}

export interface MemoryHistoryPoint {
  timestamp: number;
  usedJSHeapBytes: number | null;
  domNodeCount: number | null;
}

export interface PerformanceHealthSummary {
  status: SystemHealthStatus;
  totalRenders: number;
  trackedComponents: number;
  avgRenderMs: number;
  p95RenderMs: number;
  slowRenders: number;
  slowThresholdMs: number;
  hottestComponentId: string | null;
  hottestComponentAvgMs: number;
  components: ComponentRenderMetric[];
  recentSamples: RenderSample[];
  memory: MemorySnapshot;
  memoryHistory: MemoryHistoryPoint[];
  uptimeMs: number;
  capturedAt: number;
}

export interface PerformanceMonitorOptions {
  slowThresholdMs?: number;
  maxSamples?: number;
  maxMemoryHistory?: number;
  notifyThrottleMs?: number;
  memoryProvider?: () => RawMemoryReading;
  nowProvider?: () => number;
}

export interface PerformanceMonitor {
  recordRender: (
    id: string,
    phase: RenderPhase,
    actualDurationMs: number,
    baseDurationMs?: number,
    timestampMs?: number,
  ) => void;
  measureSync: <T>(id: string, fn: () => T, phase?: RenderPhase) => T;
  sampleMemory: (forceHistoryAppend?: boolean) => MemorySnapshot;
  getSnapshot: () => PerformanceHealthSummary;
  subscribe: (listener: () => void) => () => void;
  reset: () => void;
}

interface ChromePerformanceWithMemory extends Performance {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

interface NavigatorWithDeviceMemory extends Navigator {
  deviceMemory?: number;
}

export const INTERNAL_DEV_STORAGE_KEY = 'spenta_internal_dev_mode';

export interface InternalDeveloperResolution {
  isInternalDeveloper: boolean;
  source: 'query' | 'storage' | 'dev-env' | 'localhost' | 'public';
}

export function resolveInternalDeveloperFlag(options?: {
  search?: string;
  hostname?: string;
  isViteDev?: boolean;
  storedValue?: string | null;
}): InternalDeveloperResolution {
  const search =
    options?.search !== undefined
      ? options.search
      : typeof window !== 'undefined'
        ? window.location.search
        : '';

  if (search) {
    try {
      const params = new URLSearchParams(search);
      const devParam = params.get('dev') ?? params.get('internal') ?? params.get('health');
      if (devParam === '1' || devParam === 'true') {
        return { isInternalDeveloper: true, source: 'query' };
      }
      if (devParam === '0' || devParam === 'false') {
        return { isInternalDeveloper: false, source: 'query' };
      }
    } catch {
      // ignore invalid query strings
    }
  }

  let stored = options?.storedValue;
  if (stored === undefined && typeof window !== 'undefined') {
    try {
      stored = window.localStorage.getItem(INTERNAL_DEV_STORAGE_KEY);
    } catch {
      stored = null;
    }
  }
  if (stored === '1' || stored === 'true') {
    return { isInternalDeveloper: true, source: 'storage' };
  }
  if (stored === '0' || stored === 'false') {
    return { isInternalDeveloper: false, source: 'storage' };
  }

  const hostname =
    options?.hostname !== undefined
      ? options.hostname
      : typeof window !== 'undefined'
        ? window.location.hostname
        : '';

  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.startsWith('ais-dev-')
  ) {
    return { isInternalDeveloper: true, source: 'localhost' };
  }

  const isViteDev =
    options?.isViteDev !== undefined
      ? options.isViteDev
      : Boolean(typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV);

  if (isViteDev) {
    return { isInternalDeveloper: true, source: 'dev-env' };
  }

  return { isInternalDeveloper: false, source: 'public' };
}

export function readBrowserMemory(): RawMemoryReading {
  const perf = typeof performance !== 'undefined' ? (performance as ChromePerformanceWithMemory) : null;
  const mem = perf?.memory;
  const nav = typeof navigator !== 'undefined' ? (navigator as NavigatorWithDeviceMemory) : null;

  const supported = Boolean(
    mem &&
      typeof mem.usedJSHeapSize === 'number' &&
      Number.isFinite(mem.usedJSHeapSize) &&
      typeof mem.jsHeapSizeLimit === 'number' &&
      Number.isFinite(mem.jsHeapSizeLimit),
  );

  let domNodeCount: number | null = null;
  if (typeof document !== 'undefined' && document.documentElement) {
    try {
      domNodeCount = document.getElementsByTagName('*').length;
    } catch {
      domNodeCount = null;
    }
  }

  return {
    supported,
    usedJSHeapBytes: supported && mem ? mem.usedJSHeapSize : null,
    totalJSHeapBytes: supported && mem ? mem.totalJSHeapSize : null,
    jsHeapLimitBytes: supported && mem ? mem.jsHeapSizeLimit : null,
    deviceMemoryGb:
      nav && typeof nav.deviceMemory === 'number' && Number.isFinite(nav.deviceMemory)
        ? nav.deviceMemory
        : null,
    domNodeCount,
  };
}

function defaultNowMs(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.timeOrigin ? performance.timeOrigin + performance.now() : Date.now();
  }
  return Date.now();
}

export function createPerformanceMonitor(options?: PerformanceMonitorOptions): PerformanceMonitor {
  const slowThresholdMs = options?.slowThresholdMs ?? 16.6;
  const maxSamples = options?.maxSamples ?? 32;
  const maxMemoryHistory = options?.maxMemoryHistory ?? 24;
  const notifyThrottleMs = options?.notifyThrottleMs ?? 450;
  const memoryProvider = options?.memoryProvider ?? readBrowserMemory;
  const nowProvider = options?.nowProvider ?? defaultNowMs;

  let createdAt = nowProvider();
  let componentMap = new Map<string, ComponentRenderMetric>();
  let recentSamples: RenderSample[] = [];
  let memoryHistory: MemoryHistoryPoint[] = [];
  let totalRenders = 0;
  let totalDurationSum = 0;
  let slowRenders = 0;
  let baselineUsedBytes: number | null = null;
  let peakUsedBytes: number | null = null;
  let lastMemorySnapshot: MemorySnapshot = {
    supported: false,
    usedJSHeapBytes: null,
    totalJSHeapBytes: null,
    jsHeapLimitBytes: null,
    heapUsagePct: null,
    peakUsedBytes: null,
    deltaFromBaselineBytes: null,
    deviceMemoryGb: null,
    domNodeCount: null,
    timestamp: createdAt,
  };

  const listeners = new Set<() => void>();
  let notifyTimer: ReturnType<typeof setTimeout> | null = null;
  let lastNotifiedAt = 0;
  let cachedSummary: PerformanceHealthSummary | null = null;

  const scheduleNotify = () => {
    cachedSummary = null;
    if (listeners.size === 0 || notifyTimer !== null) return;

    const elapsed = Date.now() - lastNotifiedAt;
    const delay = elapsed >= notifyThrottleMs ? 120 : Math.max(120, notifyThrottleMs - elapsed);
    notifyTimer = setTimeout(() => {
      notifyTimer = null;
      lastNotifiedAt = Date.now();
      listeners.forEach((listener) => listener());
    }, delay);
  };

  const recordRender: PerformanceMonitor['recordRender'] = (
    id,
    phase,
    actualDurationMs,
    baseDurationMs,
    timestampMs,
  ) => {
    if (!id) return;
    const duration =
      typeof actualDurationMs === 'number' && Number.isFinite(actualDurationMs)
        ? Math.max(0, actualDurationMs)
        : 0;
    const base =
      typeof baseDurationMs === 'number' && Number.isFinite(baseDurationMs)
        ? Math.max(0, baseDurationMs)
        : duration;
    const ts =
      typeof timestampMs === 'number' && Number.isFinite(timestampMs) ? timestampMs : nowProvider();

    const isSlow = duration > slowThresholdMs;
    totalRenders += 1;
    totalDurationSum += duration;
    if (isSlow) slowRenders += 1;

    const existing = componentMap.get(id);
    if (existing) {
      const nextCount = existing.renderCount + 1;
      const nextTotal = existing.totalDurationMs + duration;
      componentMap.set(id, {
        id,
        renderCount: nextCount,
        lastDurationMs: duration,
        baseDurationMs: base,
        avgDurationMs: nextTotal / nextCount,
        minDurationMs: Math.min(existing.minDurationMs, duration),
        maxDurationMs: Math.max(existing.maxDurationMs, duration),
        totalDurationMs: nextTotal,
        lastPhase: phase,
        slowRenderCount: existing.slowRenderCount + (isSlow ? 1 : 0),
        lastRenderedAt: ts,
      });
    } else {
      componentMap.set(id, {
        id,
        renderCount: 1,
        lastDurationMs: duration,
        baseDurationMs: base,
        avgDurationMs: duration,
        minDurationMs: duration,
        maxDurationMs: duration,
        totalDurationMs: duration,
        lastPhase: phase,
        slowRenderCount: isSlow ? 1 : 0,
        lastRenderedAt: ts,
      });
    }

    recentSamples.unshift({
      id,
      phase,
      durationMs: duration,
      baseDurationMs: base,
      timestamp: ts,
    });
    if (recentSamples.length > maxSamples) {
      recentSamples.length = maxSamples;
    }

    scheduleNotify();
  };

  const measureSync: PerformanceMonitor['measureSync'] = (id, fn, phase = 'update') => {
    const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
    try {
      return fn();
    } finally {
      const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
      recordRender(id, phase, Math.max(0, end - start));
    }
  };

  const sampleMemory: PerformanceMonitor['sampleMemory'] = (forceHistoryAppend = false) => {
    const raw = memoryProvider();
    const ts = nowProvider();

    let heapUsagePct: number | null = null;
    let deltaFromBaselineBytes: number | null = null;

    if (raw.supported && raw.usedJSHeapBytes !== null && raw.jsHeapLimitBytes !== null) {
      heapUsagePct =
        raw.jsHeapLimitBytes > 0
          ? Math.min(100, Math.max(0, (raw.usedJSHeapBytes / raw.jsHeapLimitBytes) * 100))
          : null;
      if (baselineUsedBytes === null) {
        baselineUsedBytes = raw.usedJSHeapBytes;
      }
      if (peakUsedBytes === null || raw.usedJSHeapBytes > peakUsedBytes) {
        peakUsedBytes = raw.usedJSHeapBytes;
      }
      deltaFromBaselineBytes = raw.usedJSHeapBytes - baselineUsedBytes;
    }

    lastMemorySnapshot = {
      ...raw,
      heapUsagePct,
      peakUsedBytes,
      deltaFromBaselineBytes,
      timestamp: ts,
    };

    const lastHistoryPoint = memoryHistory[memoryHistory.length - 1];
    if (forceHistoryAppend || !lastHistoryPoint || ts - lastHistoryPoint.timestamp >= 800) {
      memoryHistory.push({
        timestamp: ts,
        usedJSHeapBytes: raw.usedJSHeapBytes,
        domNodeCount: raw.domNodeCount,
      });
      if (memoryHistory.length > maxMemoryHistory) {
        memoryHistory = memoryHistory.slice(memoryHistory.length - maxMemoryHistory);
      }
    }

    scheduleNotify();
    return lastMemorySnapshot;
  };

  const getSnapshot: PerformanceMonitor['getSnapshot'] = () => {
    if (cachedSummary) return cachedSummary;

    const components = Array.from(componentMap.values()).sort(
      (a, b) => b.totalDurationMs - a.totalDurationMs || b.renderCount - a.renderCount,
    );

    const avgRenderMs = totalRenders > 0 ? totalDurationSum / totalRenders : 0;

    let p95RenderMs = 0;
    if (recentSamples.length > 0) {
      const sorted = [...recentSamples].map((s) => s.durationMs).sort((a, b) => a - b);
      const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
      p95RenderMs = sorted[idx] ?? 0;
    }

    let hottestComponentId: string | null = null;
    let hottestComponentAvgMs = 0;
    for (const metric of components) {
      if (metric.avgDurationMs >= hottestComponentAvgMs) {
        hottestComponentAvgMs = metric.avgDurationMs;
        hottestComponentId = metric.id;
      }
    }

    const heapPct = lastMemorySnapshot.heapUsagePct ?? 0;
    let status: SystemHealthStatus = 'nominal';
    if (avgRenderMs > 32 || p95RenderMs > 50 || heapPct > 85) {
      status = 'degraded';
    } else if (avgRenderMs > slowThresholdMs || p95RenderMs > slowThresholdMs * 1.5 || heapPct > 70) {
      status = 'elevated';
    }

    const nowTs = nowProvider();
    cachedSummary = {
      status,
      totalRenders,
      trackedComponents: components.length,
      avgRenderMs,
      p95RenderMs,
      slowRenders,
      slowThresholdMs,
      hottestComponentId,
      hottestComponentAvgMs,
      components,
      recentSamples: [...recentSamples],
      memory: lastMemorySnapshot,
      memoryHistory: [...memoryHistory],
      uptimeMs: Math.max(0, nowTs - createdAt),
      capturedAt: nowTs,
    };

    return cachedSummary;
  };

  const subscribe: PerformanceMonitor['subscribe'] = (listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const reset: PerformanceMonitor['reset'] = () => {
    createdAt = nowProvider();
    componentMap = new Map();
    recentSamples = [];
    memoryHistory = [];
    totalRenders = 0;
    totalDurationSum = 0;
    slowRenders = 0;
    baselineUsedBytes = null;
    peakUsedBytes = null;
    cachedSummary = null;
    sampleMemory(true);
    lastNotifiedAt = Date.now();
    listeners.forEach((listener) => listener());
  };

  return {
    recordRender,
    measureSync,
    sampleMemory,
    getSnapshot,
    subscribe,
    reset,
  };
}
