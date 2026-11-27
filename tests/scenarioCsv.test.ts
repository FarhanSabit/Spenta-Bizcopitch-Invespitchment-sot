import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseScenariosFromCsv,
  generateSampleScenariosCsv,
  exportScenariosToCsv,
} from '../src/utils/scenarioCsv';
import { InvestorCalculatorScenario } from '../src/utils/LocalPersistenceService';

test('generateSampleScenariosCsv generates valid CSV template', () => {
  const csv = generateSampleScenariosCsv();
  assert.ok(csv.length > 50, 'Template should not be empty');
  assert.ok(csv.includes('Name,Scenario,Growth Mode'), 'Template should contain expected header columns');
  assert.ok(csv.includes('Seed Angel SAFE'), 'Template should include sample row');

  const parsed = parseScenariosFromCsv(csv);
  assert.strictEqual(parsed.errors.length, 0);
  assert.strictEqual(parsed.scenarios.length, 3);
  assert.strictEqual(parsed.scenarios[0].name, 'Seed Angel SAFE');
  assert.strictEqual(parsed.scenarios[0].state.investmentK, 250);
  assert.strictEqual(parsed.scenarios[0].state.exitMultiple, 8);
  assert.strictEqual(parsed.scenarios[0].state.horizonYears, 5);
});

test('parseScenariosFromCsv parses custom CSV with quotes and custom header names', () => {
  const customCsv = `Scenario Name,Case,Growth,Check Size,Exit,Years,FX,Tax Rate,Dilution,Notes
"Strategic Sovereign Series A",upside,aggressive,1500,18,7,122.50,20%,5%,"Sovereign OS multi-ministry expansion, high ARR upside"
"Institutional Anchor",conservative,balanced,2000,10,5,123.00,25,0,"Conservative equity anchor"
`;

  const parsed = parseScenariosFromCsv(customCsv);
  assert.strictEqual(parsed.errors.length, 0);
  assert.strictEqual(parsed.scenarios.length, 2);

  const sc1 = parsed.scenarios[0];
  assert.strictEqual(sc1.name, 'Strategic Sovereign Series A');
  assert.strictEqual(sc1.state.scenario, 'upside');
  assert.strictEqual(sc1.state.growthMode, 'aggressive');
  assert.strictEqual(sc1.state.investmentK, 1500);
  assert.strictEqual(sc1.state.exitMultiple, 18);
  assert.strictEqual(sc1.state.horizonYears, 7);
  assert.strictEqual(sc1.state.taxRate, 20);
  assert.strictEqual(sc1.state.dilutionPct, 5);
  assert.strictEqual(sc1.description, 'Sovereign OS multi-ministry expansion, high ARR upside');

  const sc2 = parsed.scenarios[1];
  assert.strictEqual(sc2.name, 'Institutional Anchor');
  assert.strictEqual(sc2.state.scenario, 'conservative');
  assert.strictEqual(sc2.state.growthMode, 'conservative');
  assert.strictEqual(sc2.state.investmentK, 2000);
  assert.strictEqual(sc2.state.exitMultiple, 10);
  assert.strictEqual(sc2.state.horizonYears, 5);
});

test('parseScenariosFromCsv handles malformed or empty inputs gracefully', () => {
  const emptyResult = parseScenariosFromCsv('');
  assert.strictEqual(emptyResult.scenarios.length, 0);
  assert.ok(emptyResult.errors.length > 0);

  const headerOnly = parseScenariosFromCsv('Name,Scenario,Investment');
  assert.strictEqual(headerOnly.scenarios.length, 0);
  assert.ok(headerOnly.errors.length > 0);
});

test('exportScenariosToCsv round-trips cleanly through parseScenariosFromCsv', () => {
  const existingScenarios: InvestorCalculatorScenario[] = [
    {
      id: 'sc_roundtrip_1',
      name: 'Roundtrip Scenario A',
      description: 'Diligence notes with, comma and "quotes"',
      createdAt: '2026-11-27T00:00:00.000Z',
      updatedAt: '2026-11-27T00:00:00.000Z',
      state: {
        scenario: 'conservative',
        growthMode: 'aggressive',
        fxRate: 122.61,
        taxRate: 25,
        exitMultiple: 12,
        dilutionPct: 5,
        investmentK: 850,
        horizonYears: 6,
        compareGrowthScenarios: false,
        projectedChartMetric: 'value',
        subTab: 'pnl',
        mixPreset: 'fy31',
        mixScopeWeights: {
          one_time_builds: 24,
          recurring_saas: 44,
          managed_retainers: 14,
          ip_royalties: 12,
          captive_ecosystem: 6,
        },
        mixOpexRatioPct: 24,
      },
    },
  ];

  const exportedCsv = exportScenariosToCsv(existingScenarios);
  assert.ok(exportedCsv.includes('Roundtrip Scenario A'));

  const parsed = parseScenariosFromCsv(exportedCsv);
  assert.strictEqual(parsed.errors.length, 0);
  assert.strictEqual(parsed.scenarios.length, 1);
  assert.strictEqual(parsed.scenarios[0].name, 'Roundtrip Scenario A');
  assert.strictEqual(parsed.scenarios[0].state.scenario, 'conservative');
  assert.strictEqual(parsed.scenarios[0].state.investmentK, 850);
  assert.strictEqual(parsed.scenarios[0].state.exitMultiple, 12);
  assert.strictEqual(parsed.scenarios[0].state.horizonYears, 6);
});
