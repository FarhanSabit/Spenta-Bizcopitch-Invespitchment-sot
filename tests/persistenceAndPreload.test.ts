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
});
