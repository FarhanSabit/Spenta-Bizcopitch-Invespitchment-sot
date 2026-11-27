import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createPreloadRegistry } from '../src/utils/viewPreloaders.ts';
import { LocalPersistenceService } from '../src/utils/LocalPersistenceService.ts';

describe('createPreloadRegistry (once-only speculative preloading)', () => {
  it('invokes the dynamic loader strictly once across repeated hover/focus triggers', async () => {
    const registry = createPreloadRegistry({ shouldSkipSpeculative: () => false });
    let calls = 0;
    const loader = async () => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 15));
      return { default: 'FinancialsView' };
    };

    const p1 = registry.preloadOnce('tab:Financials', loader);
    const p2 = registry.preloadOnce('tab:Financials', loader);
    assert.equal(registry.getStatus('tab:Financials'), 'loading');
    assert.equal(p1, p2, 'In-flight preload calls must share the same promise');

    await p1;
    assert.equal(registry.getStatus('tab:Financials'), 'loaded');

    const p3 = registry.preloadOnce('tab:Financials', loader);
    assert.equal(p3, null, 'Already-loaded view must not trigger another fetch');
    assert.equal(calls, 1, 'Loader must be called strictly once');
  });

  it('skips preloading when a view is already marked loaded', () => {
    const registry = createPreloadRegistry({ shouldSkipSpeculative: () => false });
    let calls = 0;
    registry.markLoaded('tab:The Brain');
    const result = registry.preloadOnce('tab:The Brain', async () => {
      calls += 1;
      return {};
    });
    assert.equal(result, null);
    assert.equal(calls, 0);
  });

  it('allows retry after a transient failure and respects Data Saver skip check', async () => {
    let skip = true;
    const registry = createPreloadRegistry({ shouldSkipSpeculative: () => skip });
    let attempts = 0;

    assert.equal(
      registry.preloadOnce('tab:Pitch Deck', async () => {
        attempts += 1;
        return {};
      }),
      null,
    );
    assert.equal(attempts, 0);

    skip = false;
    await registry.preloadOnce('tab:Pitch Deck', async () => {
      attempts += 1;
      throw new Error('offline');
    });
    assert.equal(registry.getStatus('tab:Pitch Deck'), 'idle');

    await registry.preloadOnce('tab:Pitch Deck', async () => {
      attempts += 1;
      return { ok: true };
    });
    assert.equal(registry.getStatus('tab:Pitch Deck'), 'loaded');
    assert.equal(attempts, 2);
  });
});

describe('LocalPersistenceService (offline-first storage v3)', () => {
  it('saves, loads, exports, imports, and clears calculator state, named scenarios, chart projections, session data, workspace snapshots, investor feedback, diligence prefs, and contact inquiries', async () => {
    const svc = new LocalPersistenceService('spenta_unit_test_db', 3);

    const calcState = {
      scenario: 'upside' as const,
      growthMode: 'aggressive' as const,
      fxRate: 122.61,
      taxRate: 22,
      exitMultiple: 12,
      dilutionPct: 10,
      investmentK: 250,
      horizonYears: 4,
      compareGrowthScenarios: true,
      projectedChartMetric: 'moic' as const,
      subTab: 'pnl' as const,
      mixPreset: 'fy31' as const,
      mixScopeWeights: { one_time_builds: 24, recurring_saas: 44 },
      mixOpexRatioPct: 24,
    };

    await svc.saveCalculatorState(calcState);

    const savedScenario = await svc.saveScenario({
      name: 'Board Upside $250K',
      description: '4-year aggressive projection at 12x exit',
      state: calcState,
    });
    assert.ok(savedScenario.id);
    assert.equal(savedScenario.name, 'Board Upside $250K');

    const loadedScenario = await svc.getScenario(savedScenario.id);
    assert.equal(loadedScenario?.state.investmentK, 250);

    const scenarioList = await svc.listCalculatorScenarios();
    assert.equal(scenarioList.length, 1);

    await svc.saveChartProjection(
      'investor_roi_series',
      [
        { year: 'FY2027', stakeValueK: 120, moic: 0.48 },
        { year: 'FY2030', stakeValueK: 1120, moic: 4.48 },
      ],
      { investmentK: 250, horizonYears: 4 },
    );

    await svc.saveUserSession({
      activeTab: 'Investor Briefing',
      selectedIds: ['icr_ops', 'genai_bi'],
      deploymentTarget: 'on-prem',
      hitlConfidence: 0.94,
      savedProposalsCount: 2,
      neuralCoreSystem: 'solar-map',
    });

    const snapshot = await svc.saveWorkspaceSnapshot({
      name: 'Investor Demo Checkpoint',
      activeTab: 'Investor Briefing',
      selectedIds: ['icr_ops', 'genai_bi'],
      deploymentTarget: 'on-prem',
      hitlConfidence: 0.94,
      calculatorState: calcState,
    });
    assert.ok(snapshot.id);

    const loadedSnapshot = await svc.getWorkspaceSnapshot(snapshot.id);
    assert.equal(loadedSnapshot?.name, 'Investor Demo Checkpoint');
    assert.equal(loadedSnapshot?.calculatorState.horizonYears, 4);

    const snapshotList = await svc.listWorkspaceSnapshots();
    assert.equal(snapshotList.length, 1);

    // v3 stores: Diligence Prefs, Investor Feedback + Replies, Contact Inquiries
    await svc.saveDiligencePrefs({
      currency: 'BDT',
      personaTrack: 'financial',
      bookmarkedDocIds: ['dr-safe-memo', 'dr-5yr-pnl'],
    });
    const loadedPrefs = await svc.loadDiligencePrefs();
    assert.equal(loadedPrefs?.currency, 'BDT');
    assert.equal(loadedPrefs?.personaTrack, 'financial');
    assert.deepEqual(loadedPrefs?.bookmarkedDocIds, ['dr-safe-memo', 'dr-5yr-pnl']);

    const feedback = await svc.saveInvestorFeedback({
      section: '05. Recalibrated 9-Tier Unit Economics',
      text: 'Strong gross margin expansion from Model A1 to C3.',
      priority: 'High',
      sentimentScore: 5,
    });
    assert.ok(feedback.id);
    const updatedFeedback = await svc.addFeedbackReply(
      feedback.id,
      'Confirmed — Tier C3 leverages reusable L1–L6 containers.',
    );
    assert.equal(updatedFeedback?.replies.length, 1);
    assert.equal((await svc.listInvestorFeedback()).length, 1);

    const inquiry = await svc.saveContactInquiry({
      name: 'A. Rahman',
      email: 'ar@fund.vc',
      organization: 'Apex Ventures',
      topic: 'Seed SAFE Term Sheet',
      checkSize: '$100K–$250K',
      message: 'Requesting SAFE memo and Prime Bank case study walkthrough.',
    });
    assert.ok(inquiry.id);
    assert.equal((await svc.listContactInquiries()).length, 1);

    const calc = await svc.loadCalculatorState();
    assert.equal(calc?.investmentK, 250);
    assert.equal(calc?.horizonYears, 4);
    assert.equal(calc?.compareGrowthScenarios, true);
    assert.ok(calc?.updatedAt);

    const proj = await svc.loadChartProjection<{ year: string; moic: number }[]>(
      'investor_roi_series',
    );
    assert.equal(proj?.data.length, 2);
    assert.equal(proj?.data[1].moic, 4.48);

    const session = await svc.loadUserSession();
    assert.equal(session?.activeTab, 'Investor Briefing');
    assert.equal(session?.hitlConfidence, 0.94);
    assert.deepEqual(session?.selectedIds, ['icr_ops', 'genai_bi']);

    const bundle = await svc.exportAllOfflineData();
    assert.equal(Object.keys(bundle.stores.calculatorScenarios).length, 1);
    assert.equal(Object.keys(bundle.stores.workspaceSnapshots).length, 1);
    assert.equal(Object.keys(bundle.stores.investorFeedback).length, 1);
    assert.equal(Object.keys(bundle.stores.contactInquiries).length, 1);
    assert.equal(Object.keys(bundle.stores.diligencePrefs).length, 1);

    const metricsBeforeClear = await svc.getStorageMetrics();
    assert.equal(metricsBeforeClear.totalEntries, 8);
    assert.equal(metricsBeforeClear.scenarioEntries, 1);
    assert.equal(metricsBeforeClear.workspaceEntries, 1);
    assert.ok(metricsBeforeClear.estimatedPayloadBytes > 0);
    assert.equal(metricsBeforeClear.storeStats.length, 8);

    const reconcile = await svc.reconcileAndVerify();
    assert.equal(reconcile.ok, true);
    assert.equal(reconcile.verifiedStores, 8);
    assert.equal(reconcile.totalEntries, 8);

    await svc.clearAll();
    const metricsAfterClear = await svc.getStorageMetrics();
    assert.equal(metricsAfterClear.totalEntries, 0);
    assert.equal(metricsAfterClear.scenarioEntries, 0);
    assert.equal(metricsAfterClear.workspaceEntries, 0);
    assert.equal(await svc.loadCalculatorState(), null);
    assert.equal((await svc.listCalculatorScenarios()).length, 0);
    assert.equal((await svc.listWorkspaceSnapshots()).length, 0);
    assert.equal((await svc.listInvestorFeedback()).length, 0);
    assert.equal((await svc.listContactInquiries()).length, 0);
    assert.equal(await svc.loadDiligencePrefs(), null);

    await svc.importAllOfflineData(bundle);
    const restored = await svc.loadCalculatorState();
    assert.equal(restored?.investmentK, 250);
    assert.equal(restored?.projectedChartMetric, 'moic');
    assert.equal((await svc.listCalculatorScenarios()).length, 1);
    assert.equal((await svc.listWorkspaceSnapshots()).length, 1);
    assert.equal((await svc.listInvestorFeedback()).length, 1);
    assert.equal((await svc.listContactInquiries()).length, 1);
    assert.equal((await svc.loadDiligencePrefs())?.currency, 'BDT');

    await svc.deleteCalculatorScenario(savedScenario.id);
    await svc.deleteWorkspaceSnapshot(snapshot.id);
    await svc.deleteInvestorFeedback(feedback.id);
    await svc.deleteContactInquiry(inquiry.id);
    assert.equal((await svc.listCalculatorScenarios()).length, 0);
    assert.equal((await svc.listWorkspaceSnapshots()).length, 0);
    assert.equal((await svc.listInvestorFeedback()).length, 0);
    assert.equal((await svc.listContactInquiries()).length, 0);
  });

  it('emits live syncing, synced, and offline state updates via subscribe()', async () => {
    const svc = new LocalPersistenceService('spenta_observer_test_db', 3);
    const observedStatuses: string[] = [];
    const unsubscribe = svc.subscribe((snapshot) => {
      observedStatuses.push(snapshot.status);
    });

    assert.equal(observedStatuses[0], 'synced');
    await svc.saveScenario({
      name: 'Observer Check',
      state: {
        scenario: 'conservative',
        growthMode: 'conservative',
        fxRate: 122.61,
        taxRate: 22,
        exitMultiple: 10,
        dilutionPct: 10,
        investmentK: 100,
        horizonYears: 5,
        compareGrowthScenarios: false,
        projectedChartMetric: 'value',
        subTab: 'roi',
        mixPreset: 'fy27',
        mixScopeWeights: { one_time_builds: 50, recurring_saas: 30 },
        mixOpexRatioPct: 28,
      },
    });
    assert.ok(observedStatuses.includes('syncing'));
    assert.equal(svc.getSyncState().status, 'synced');
    assert.ok(svc.getSyncState().revision >= 1);

    svc.setOnlineStatus(false);
    assert.equal(svc.getSyncState().status, 'offline');
    svc.setOnlineStatus(true);
    assert.equal(svc.getSyncState().status, 'synced');

    unsubscribe();
    await svc.clearAll();
  });

  it('caches investor briefing data offline and exports top-level scenarios & workspaceSnapshots arrays', async () => {
    const svc = new LocalPersistenceService('spenta_briefing_cache_test_db', 3);

    const calcState = {
      scenario: 'upside' as const,
      growthMode: 'aggressive' as const,
      fxRate: 122.61,
      taxRate: 25,
      exitMultiple: 12,
      dilutionPct: 10,
      investmentK: 500,
      horizonYears: 5,
      compareGrowthScenarios: true,
      projectedChartMetric: 'moic' as const,
      subTab: 'roi' as const,
      mixPreset: 'fy31' as const,
      mixScopeWeights: { one_time_builds: 24, recurring_saas: 44 },
      mixOpexRatioPct: 24,
    };

    const scenario = await svc.saveScenario({
      name: 'Alpha Sovereign Scenario',
      state: calcState,
    });
    const snapshot = await svc.saveWorkspaceSnapshot({
      name: 'Briefing Snapshot Alpha',
      activeTab: 'App Vault',
      selectedIds: ['icr_ops'],
      deploymentTarget: 'on-prem',
      hitlConfidence: 0.92,
      calculatorState: calcState,
    });

    const cached = await svc.saveInvestorBriefingCache({
      chaptersCount: 9,
      tiersCount: 9,
      caseStudiesCount: 4,
      dataRoomDocsCount: 8,
      safeTermsSnapshot: { raiseUsd: 500000, postMoneyCapUsd: 4500000 },
      activeSection: 'ssot-unit-economics',
      personaTrack: 'financial',
      currency: 'BDT',
      scenario: 'upside',
      bookmarkedDocIds: ['dr-safe-memo', 'dr-safe-memo', 'dr-5yr-pnl'],
      feedbackCount: 2,
      payload: { offlineReady: true },
    });

    assert.equal(cached.chaptersCount, 9);
    assert.deepEqual(cached.bookmarkedDocIds, ['dr-safe-memo', 'dr-5yr-pnl']);

    const loaded = await svc.loadInvestorBriefingCache();
    assert.equal(loaded?.activeSection, 'ssot-unit-economics');
    assert.equal(loaded?.currency, 'BDT');
    assert.equal(loaded?.tiersCount, 9);

    const bundle = await svc.exportAllOfflineData();
    assert.equal(bundle.scenarios?.length, 1);
    assert.equal(bundle.scenarios?.[0].id, scenario.id);
    assert.equal(bundle.workspaceSnapshots?.length, 1);
    assert.equal(bundle.workspaceSnapshots?.[0].id, snapshot.id);

    await svc.clearAll();
  });

  it('purges workspace snapshots older than 30 days while preserving recent and auto-saved checkpoints', async () => {
    const svc = new LocalPersistenceService('spenta_cleanup_test_db', 3);
    const calcState = {
      scenario: 'conservative' as const,
      growthMode: 'conservative' as const,
      fxRate: 122.61,
      taxRate: 22,
      exitMultiple: 10,
      dilutionPct: 10,
      investmentK: 150,
      horizonYears: 5,
      compareGrowthScenarios: false,
      projectedChartMetric: 'value' as const,
      subTab: 'roi' as const,
      mixPreset: 'fy27' as const,
      mixScopeWeights: { one_time_builds: 50, recurring_saas: 30 },
      mixOpexRatioPct: 28,
    };

    const recentSnap = await svc.saveWorkspaceSnapshot({
      name: 'Recent Q4 Checkpoint',
      activeTab: 'App Vault',
      selectedIds: ['icr_ops'],
      deploymentTarget: 'on-prem',
      hitlConfidence: 0.91,
      calculatorState: calcState,
    });

    // Save an auto-saved default checkpoint (must always be preserved regardless of age)
    await svc.saveWorkspaceSnapshot({
      id: 'latest_workspace_snapshot',
      name: 'Auto-Saved Workspace',
      activeTab: 'App Vault',
      selectedIds: ['icr_ops'],
      deploymentTarget: 'on-prem',
      hitlConfidence: 0.91,
      calculatorState: calcState,
    });

    // Simulate running cleanup 45 days in the future after saving one more snapshot at day +20
    const futureNow = Date.now() + 45 * 86_400_000;
    const midSnap = await svc.saveWorkspaceSnapshot({
      name: 'Mid-Window Snapshot',
      activeTab: 'Financials',
      selectedIds: ['icr_ops'],
      deploymentTarget: 'on-prem',
      hitlConfidence: 0.91,
      calculatorState: calcState,
    });
    // Backdate only midSnap? Instead pass custom nowMs such that recentSnap is 45 days old and test cutoff!
    // At futureNow = now + 45d, both recentSnap and midSnap are 45 days old, so create a snapshot timestamped at futureNow - 5d via importAllOfflineData.
    const bundle = await svc.exportAllOfflineData();
    const freshSnap = {
      ...midSnap,
      id: 'ws_snap_fresh_5d',
      name: 'Fresh 5-Day Snapshot',
      createdAt: new Date(futureNow - 5 * 86_400_000).toISOString(),
      updatedAt: new Date(futureNow - 5 * 86_400_000).toISOString(),
    };
    bundle.stores.workspaceSnapshots[freshSnap.id] = freshSnap;
    await svc.importAllOfflineData(bundle);

    const cleanup = await svc.purgeOldSnapshots(30, futureNow);
    assert.equal(cleanup.purgedCount, 2);
    assert.ok(cleanup.purgedIds.includes(recentSnap.id));
    assert.ok(cleanup.purgedIds.includes(midSnap.id));
    assert.ok(cleanup.freedBytesEstimate > 0);

    const remaining = await svc.listWorkspaceSnapshots();
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].id, 'ws_snap_fresh_5d');

    const autoSaved = await svc.getWorkspaceSnapshot('latest_workspace_snapshot');
    assert.ok(autoSaved);

    await svc.clearAll();
  });

  it('tracks pending unsynced IndexedDB changes while offline and clears them after online reconcile', async () => {
    const svc = new LocalPersistenceService('spenta_pending_queue_test_db', 3);
    assert.equal(svc.getSyncState().pendingUnsyncedCount, 0);

    svc.setOnlineStatus(false);
    await svc.saveScenario({
      name: 'Offline Draft Scenario',
      state: {
        scenario: 'upside',
        growthMode: 'aggressive',
        fxRate: 122.61,
        taxRate: 25,
        exitMultiple: 12,
        dilutionPct: 0,
        investmentK: 500,
        horizonYears: 5,
        compareGrowthScenarios: false,
        projectedChartMetric: 'value',
        subTab: 'pnl',
        mixPreset: 'fy31',
        mixScopeWeights: { one_time_builds: 24, recurring_saas: 44 },
        mixOpexRatioPct: 24,
      },
    });
    await svc.saveDiligencePrefs({
      personaTrack: 'technical',
      currency: 'USD',
      bookmarkedDocIds: ['dr-safe-memo'],
    });

    const offlineSyncState = svc.getSyncState();
    assert.equal(offlineSyncState.status, 'offline');
    assert.equal(offlineSyncState.pendingUnsyncedCount, 2);
    assert.ok(offlineSyncState.pendingUnsyncedStores.includes('calculatorScenarios'));
    assert.ok(offlineSyncState.pendingUnsyncedStores.includes('diligencePrefs'));

    // Reconcile once connectivity returns
    svc.setOnlineStatus(true);
    const reconcileResult = await svc.reconcileAndVerify();
    assert.equal(reconcileResult.ok, true);
    assert.equal(svc.getSyncState().pendingUnsyncedCount, 0);
    assert.deepEqual(svc.getSyncState().pendingUnsyncedStores, []);

    await svc.clearAll();
  });

  it('records chronological audit events for Scenario saved, Sync failed, and Auto-cleanup performed', async () => {
    const svc = new LocalPersistenceService('spenta_audit_log_test_db', 3);
    svc.clearAuditLog();
    assert.equal(svc.getAuditLog().length, 0);

    // 1. Scenario saved event
    await svc.saveScenario({
      name: 'Seed SAFE Scenario v1',
      state: {
        scenario: 'conservative',
        growthMode: 'conservative',
        fxRate: 122.61,
        taxRate: 25,
        exitMultiple: 10,
        dilutionPct: 0,
        investmentK: 350,
        horizonYears: 5,
        compareGrowthScenarios: false,
        projectedChartMetric: 'value',
        subTab: 'pnl',
        mixPreset: 'fy31',
        mixScopeWeights: { one_time_builds: 30, recurring_saas: 50 },
        mixOpexRatioPct: 20,
      },
    });

    const afterSave = svc.getAuditLog();
    assert.ok(afterSave.length >= 1);
    const saveEvt = afterSave.find((e) => e.title === 'Scenario saved');
    assert.ok(saveEvt, 'Should log a "Scenario saved" audit event');
    assert.equal(saveEvt.category, 'scenario');
    assert.equal(saveEvt.status, 'synced');
    assert.ok(saveEvt.detail.includes('Seed SAFE Scenario v1'));

    // 2. Auto-cleanup performed event
    const cleanupResult = await svc.purgeOldSnapshots(30);
    assert.equal(cleanupResult.purgedCount, 0);
    const afterCleanup = svc.getAuditLog();
    const cleanupEvt = afterCleanup.find((e) => e.title === 'Auto-cleanup performed');
    assert.ok(cleanupEvt, 'Should log an "Auto-cleanup performed" audit event');
    assert.equal(cleanupEvt.category, 'cleanup');

    // 3. Sync failed event
    svc.recordAuditEvent({
      title: 'Sync failed',
      detail: 'Network timeout during IndexedDB verification.',
      status: 'offline',
      category: 'sync',
    });

    const afterFail = svc.getAuditLog();
    const failEvt = afterFail.find((e) => e.title === 'Sync failed');
    assert.ok(failEvt, 'Should log a "Sync failed" audit event');
    assert.equal(failEvt.category, 'sync');
    assert.equal(failEvt.status, 'offline');

    // 4. Clear audit log
    svc.clearAuditLog();
    assert.equal(svc.getAuditLog().length, 0);
    await svc.clearAll();
  });
});
