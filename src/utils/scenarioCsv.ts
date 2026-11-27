import {
  InvestorCalculatorScenario,
  InvestorCalculatorState,
} from './LocalPersistenceService';

export const DEFAULT_CALC_STATE: InvestorCalculatorState = {
  scenario: 'conservative',
  growthMode: 'conservative',
  fxRate: 122.61,
  taxRate: 25,
  exitMultiple: 10,
  dilutionPct: 0,
  investmentK: 500,
  horizonYears: 5,
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
};

export interface ParsedCsvScenario {
  name: string;
  description?: string;
  state: InvestorCalculatorState;
}

export interface CsvParseResult {
  scenarios: ParsedCsvScenario[];
  errors: string[];
  totalRowsProcessed: number;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizeHeaderKey(header: string): string {
  return header
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function parseScenariosFromCsv(csvText: string): CsvParseResult {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return {
      scenarios: [],
      errors: ['CSV file is empty or does not contain a header row and at least one data row.'],
      totalRowsProcessed: 0,
    };
  }

  const rawHeaders = parseCsvLine(lines[0]);
  const headerMap: Record<string, number> = {};
  rawHeaders.forEach((h, idx) => {
    const norm = normalizeHeaderKey(h);
    if (norm) headerMap[norm] = idx;
  });

  const getCol = (row: string[], ...aliases: string[]): string | undefined => {
    for (const alias of aliases) {
      const norm = normalizeHeaderKey(alias);
      if (headerMap[norm] !== undefined) {
        const val = row[headerMap[norm]];
        if (val !== undefined && val !== '') return val;
      }
    }
    return undefined;
  };

  const scenarios: ParsedCsvScenario[] = [];
  const errors: string[] = [];

  for (let r = 1; r < lines.length; r++) {
    const row = parseCsvLine(lines[r]);
    if (row.length === 0 || (row.length === 1 && !row[0])) continue;

    const rawName = getCol(row, 'name', 'scenarioname', 'title', 'label', 'scenario');
    const name = rawName ? rawName.replace(/^["']|["']$/g, '').trim() : `Imported Scenario ${r}`;

    const rawDesc = getCol(row, 'description', 'notes', 'memo', 'summary');
    const description = rawDesc ? rawDesc.replace(/^["']|["']$/g, '').trim() : undefined;

    const rawScenario = (getCol(row, 'scenario', 'case', 'scenariotype', 'tier') ?? '').toLowerCase();
    const scenario: InvestorCalculatorState['scenario'] =
      rawScenario.includes('upside') || rawScenario.includes('bull') || rawScenario.includes('high')
        ? 'upside'
        : 'conservative';

    const rawGrowth = (getCol(row, 'growthmode', 'growth', 'mode') ?? '').toLowerCase();
    const growthMode: InvestorCalculatorState['growthMode'] =
      rawGrowth.includes('aggressive') || rawGrowth.includes('high')
        ? 'aggressive'
        : 'conservative';

    const rawInvK = getCol(row, 'investmentk', 'checksize', 'investment', 'check', 'invested');
    const parsedInvK = rawInvK ? parseFloat(rawInvK.replace(/[^0-9.-]/g, '')) : NaN;
    const investmentK = Number.isFinite(parsedInvK) && parsedInvK > 0 ? parsedInvK : 500;

    const rawExit = getCol(row, 'exitmultiple', 'multiple', 'exit', 'exitmult');
    const parsedExit = rawExit ? parseFloat(rawExit.replace(/[^0-9.-]/g, '')) : NaN;
    const exitMultiple = Number.isFinite(parsedExit) && parsedExit > 0 ? parsedExit : 10;

    const rawHorizon = getCol(row, 'horizonyears', 'horizon', 'years', 'timeline');
    const parsedHorizon = rawHorizon ? parseInt(rawHorizon.replace(/[^0-9]/g, ''), 10) : NaN;
    const horizonYears = Number.isFinite(parsedHorizon) && parsedHorizon >= 1 && parsedHorizon <= 15 ? parsedHorizon : 5;

    const rawFx = getCol(row, 'fxrate', 'fx', 'bdtusd', 'exchangerate');
    const parsedFx = rawFx ? parseFloat(rawFx.replace(/[^0-9.-]/g, '')) : NaN;
    const fxRate = Number.isFinite(parsedFx) && parsedFx > 0 ? parsedFx : 122.61;

    const rawTax = getCol(row, 'taxrate', 'tax');
    const parsedTax = rawTax ? parseFloat(rawTax.replace(/[^0-9.-]/g, '')) : NaN;
    const taxRate = Number.isFinite(parsedTax) && parsedTax >= 0 && parsedTax <= 100 ? parsedTax : 25;

    const rawDilution = getCol(row, 'dilutionpct', 'dilution');
    const parsedDilution = rawDilution ? parseFloat(rawDilution.replace(/[^0-9.-]/g, '')) : NaN;
    const dilutionPct = Number.isFinite(parsedDilution) && parsedDilution >= 0 && parsedDilution <= 100 ? parsedDilution : 0;

    const rawOpex = getCol(row, 'mixopexratiopct', 'opexratio', 'opex');
    const parsedOpex = rawOpex ? parseFloat(rawOpex.replace(/[^0-9.-]/g, '')) : NaN;
    const mixOpexRatioPct = Number.isFinite(parsedOpex) && parsedOpex >= 0 && parsedOpex <= 100 ? parsedOpex : 24;

    const state: InvestorCalculatorState = {
      ...DEFAULT_CALC_STATE,
      scenario,
      growthMode,
      investmentK,
      exitMultiple,
      horizonYears,
      fxRate,
      taxRate,
      dilutionPct,
      mixOpexRatioPct,
      mixScopeWeights: { ...DEFAULT_CALC_STATE.mixScopeWeights },
    };

    scenarios.push({
      name,
      description,
      state,
    });
  }

  if (scenarios.length === 0) {
    errors.push('No valid scenario rows could be parsed from the CSV.');
  }

  return {
    scenarios,
    errors,
    totalRowsProcessed: lines.length - 1,
  };
}

export function generateSampleScenariosCsv(): string {
  const headers = [
    'Name',
    'Scenario',
    'Growth Mode',
    'Investment ($K)',
    'Exit Multiple',
    'Horizon Years',
    'FX Rate (BDT/USD)',
    'Tax Rate (%)',
    'Dilution (%)',
    'Description',
  ];

  const rows = [
    [
      '"Seed Angel SAFE"',
      'conservative',
      'conservative',
      '250',
      '8',
      '5',
      '122.61',
      '25',
      '0',
      '"Conservative angel allocation for Sovereign OS deployment"',
    ],
    [
      '"Series Seed Core Upside"',
      'upside',
      'aggressive',
      '500',
      '14',
      '5',
      '122.61',
      '22',
      '8',
      '"High-growth institutional tranche with accelerated Sovereign IP rollout"',
    ],
    [
      '"Venture Anchor Growth"',
      'conservative',
      'aggressive',
      '750',
      '12',
      '6',
      '122.61',
      '25',
      '10',
      '"Balanced growth across enterprise App Vault captive licensing"',
    ],
  ];

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function exportScenariosToCsv(scenarios: InvestorCalculatorScenario[]): string {
  const headers = [
    'Name',
    'Scenario',
    'Growth Mode',
    'Investment ($K)',
    'Exit Multiple',
    'Horizon Years',
    'FX Rate (BDT/USD)',
    'Tax Rate (%)',
    'Dilution (%)',
    'Opex Ratio (%)',
    'Description',
    'Updated At',
  ];

  const rows = scenarios.map((item) => [
    `"${item.name.replace(/"/g, '""')}"`,
    item.state.scenario,
    item.state.growthMode,
    item.state.investmentK,
    item.state.exitMultiple,
    item.state.horizonYears,
    item.state.fxRate,
    item.state.taxRate,
    item.state.dilutionPct,
    item.state.mixOpexRatioPct,
    `"${(item.description ?? '').replace(/"/g, '""')}"`,
    item.updatedAt,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
