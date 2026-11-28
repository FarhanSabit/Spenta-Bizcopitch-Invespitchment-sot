import test from 'node:test';
import assert from 'node:assert/strict';
import { syncLogger } from '../src/utils/SyncLogger';

test('SyncLogger records, retrieves, clears, and notifies subscribers of IndexedDB operation logs', () => {
  syncLogger.clearLogs();
  assert.strictEqual(syncLogger.getLogs().length, 0);

  const rec = syncLogger.log(
    'scenario',
    'synced',
    'Scenario saved',
    'Saved test scenario successfully to IndexedDB store',
    { scenarioId: 'sc_test_1' },
  );

  assert.ok(rec.id);
  assert.strictEqual(rec.eventType, 'scenario');
  assert.strictEqual(rec.status, 'synced');
  assert.strictEqual(rec.title, 'Scenario saved');

  const logs = syncLogger.getLogs();
  assert.strictEqual(logs.length, 1);
  assert.strictEqual(logs[0].id, rec.id);

  let notifiedCount = 0;
  const unsubscribe = syncLogger.subscribe((updated) => {
    notifiedCount++;
  });

  assert.strictEqual(notifiedCount, 1); // immediate callback upon subscribe

  syncLogger.log('cleanup', 'synced', 'Auto-cleanup performed', 'Purged 0 snapshots');
  assert.strictEqual(notifiedCount, 2);

  syncLogger.clearLogs();
  assert.strictEqual(syncLogger.getLogs().length, 0);

  unsubscribe();
});
