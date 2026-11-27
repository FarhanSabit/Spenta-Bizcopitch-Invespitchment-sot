import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPerformanceMonitor,
  resolveInternalDeveloperFlag,
} from '../src/utils/performanceMonitor';

test('PerformanceMonitor tracks component render metrics, slow frames, and p95', () => {
  let now = 1000;
  const monitor = createPerformanceMonitor({
    slowThresholdMs: 16.6,
    maxSamples: 10,
    nowProvider: () => now,
  });

  monitor.recordRender('StackProvider', 'mount', 4.2, 4.5, 1001);
  monitor.recordRender('StackProvider', 'update', 8.0, 8.2, 1002);
  monitor.recordRender('Financials', 'mount', 22.5, 25.0, 1003);
  monitor.recordRender('Navbar', 'update', 1.3, 1.4, 1004);

  const summary = monitor.getSnapshot();
  assert.equal(summary.totalRenders, 4);
  assert.equal(summary.trackedComponents, 3);
  assert.equal(summary.slowRenders, 1);
  assert.equal(summary.hottestComponentId, 'Financials');
  assert.equal(summary.status, 'nominal');
  assert.ok(Math.abs(summary.avgRenderMs - 9.0) < 0.01);
  assert.equal(summary.p95RenderMs, 22.5);

  // Pushing p95 above 1.5x frame budget (24.9ms) escalates status to 'elevated'
  monitor.recordRender('The Brain', 'mount', 28.5, 30.0, 1005);
  assert.equal(monitor.getSnapshot().status, 'elevated');

  const stackMetric = summary.components.find((c) => c.id === 'StackProvider');
  assert.ok(stackMetric);
  assert.equal(stackMetric.renderCount, 2);
  assert.equal(stackMetric.minDurationMs, 4.2);
  assert.equal(stackMetric.maxDurationMs, 8.0);
  assert.equal(stackMetric.lastPhase, 'update');
  assert.equal(stackMetric.slowRenderCount, 0);

  // Verify bounded sample ring buffer
  for (let i = 0; i < 15; i++) {
    now += 10;
    monitor.recordRender('App Vault', 'update', 2.0, 2.0, now);
  }
  assert.equal(monitor.getSnapshot().recentSamples.length, 10);
});

test('PerformanceMonitor tracks JS heap memory, peak, delta, and unsupported fallback', () => {
  let now = 2000;
  let usedBytes = 32 * 1024 * 1024;
  const limitBytes = 256 * 1024 * 1024;

  const monitor = createPerformanceMonitor({
    nowProvider: () => now,
    memoryProvider: () => ({
      supported: true,
      usedJSHeapBytes: usedBytes,
      totalJSHeapBytes: 64 * 1024 * 1024,
      jsHeapLimitBytes: limitBytes,
      deviceMemoryGb: 8,
      domNodeCount: 950,
    }),
  });

  const first = monitor.sampleMemory(true);
  assert.equal(first.supported, true);
  assert.equal(first.deltaFromBaselineBytes, 0);
  assert.equal(first.peakUsedBytes, 32 * 1024 * 1024);
  assert.ok(first.heapUsagePct !== null && Math.abs(first.heapUsagePct - 12.5) < 0.01);

  now += 2000;
  usedBytes = 48 * 1024 * 1024;
  const second = monitor.sampleMemory(true);
  assert.equal(second.peakUsedBytes, 48 * 1024 * 1024);
  assert.equal(second.deltaFromBaselineBytes, 16 * 1024 * 1024);
  assert.equal(monitor.getSnapshot().memoryHistory.length, 2);

  monitor.reset();
  const afterReset = monitor.getSnapshot();
  assert.equal(afterReset.totalRenders, 0);
  assert.equal(afterReset.trackedComponents, 0);
  assert.equal(afterReset.memory.deltaFromBaselineBytes, 0);

  // Unsupported browser fallback (e.g. Safari/Firefox without performance.memory)
  const fallbackMonitor = createPerformanceMonitor({
    memoryProvider: () => ({
      supported: false,
      usedJSHeapBytes: null,
      totalJSHeapBytes: null,
      jsHeapLimitBytes: null,
      deviceMemoryGb: null,
      domNodeCount: 412,
    }),
  });
  const fallbackSnap = fallbackMonitor.sampleMemory(true);
  assert.equal(fallbackSnap.supported, false);
  assert.equal(fallbackSnap.usedJSHeapBytes, null);
  assert.equal(fallbackSnap.domNodeCount, 412);
});

test('resolveInternalDeveloperFlag limits System Health visibility to internal developers', () => {
  // Public shared production host without opt-in stays hidden
  const publicRes = resolveInternalDeveloperFlag({
    search: '',
    hostname: 'ais-pre-7bstzaj5k3usyhshccbmut-442037253514.asia-northeast1.run.app',
    isViteDev: false,
    storedValue: null,
  });
  assert.equal(publicRes.isInternalDeveloper, false);
  assert.equal(publicRes.source, 'public');

  // Query param ?dev=1 enables internal developer dashboard even on public host
  const queryEnableRes = resolveInternalDeveloperFlag({
    search: '?dev=1',
    hostname: 'ais-pre-7bstzaj5k3usyhshccbmut-442037253514.asia-northeast1.run.app',
    isViteDev: false,
    storedValue: null,
  });
  assert.equal(queryEnableRes.isInternalDeveloper, true);
  assert.equal(queryEnableRes.source, 'query');

  // Query param ?dev=0 disables even in dev environment
  const queryDisableRes = resolveInternalDeveloperFlag({
    search: '?dev=0',
    hostname: 'localhost',
    isViteDev: true,
    storedValue: '1',
  });
  assert.equal(queryDisableRes.isInternalDeveloper, false);
  assert.equal(queryDisableRes.source, 'query');

  // Internal dev host (ais-dev-*) or localhost enables automatically
  const devHostRes = resolveInternalDeveloperFlag({
    search: '',
    hostname: 'ais-dev-7bstzaj5k3usyhshccbmut-442037253514.asia-northeast1.run.app',
    isViteDev: false,
    storedValue: null,
  });
  assert.equal(devHostRes.isInternalDeveloper, true);
  assert.equal(devHostRes.source, 'localhost');

  // Explicit localStorage toggle persists across reloads
  const storedRes = resolveInternalDeveloperFlag({
    search: '',
    hostname: 'investor.spenta.ai',
    isViteDev: false,
    storedValue: '1',
  });
  assert.equal(storedRes.isInternalDeveloper, true);
  assert.equal(storedRes.source, 'storage');
});
