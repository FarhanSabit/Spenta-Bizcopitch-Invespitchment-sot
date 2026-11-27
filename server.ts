import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  type AssistantPersona,
  type AllowedModel,
  type GroundingMode,
  generateFinancialSummary,
  runMapsGroundedBrief,
  runSearchGroundedBrief,
  runSpentaChat,
} from './server/gemini.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const isDev = process.env.NODE_ENV === 'development';
const isProd =
  !isDev &&
  (process.env.NODE_ENV === 'production' ||
    Boolean(process.env.K_SERVICE || process.env.CLOUD_RUN_JOB));

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      platform: 'Spenta Sovereign OS',
      runtime: 'nodejs',
    });
  });

  // Server-side multi-turn Gemini chatbot with optional Google Search or Google Maps Grounding
  app.post('/api/gemini/chat', async (req, res) => {
    try {
      const body = req.body || {};
      const persona: AssistantPersona =
        body.persona === 'investor' || body.persona === 'market' ? body.persona : 'architect';
      const model: AllowedModel =
        body.model === 'gemini-3.1-flash-lite' ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen';
      const groundingMode: GroundingMode | undefined =
        body.groundingMode === 'maps' ||
        body.groundingMode === 'search' ||
        body.groundingMode === 'none'
          ? body.groundingMode
          : undefined;

      const result = await runSpentaChat({
        messages: Array.isArray(body.messages) ? body.messages : [],
        persona,
        model,
        useSearchGrounding: Boolean(body.useSearchGrounding),
        groundingMode,
        latLng:
          body.latLng &&
          typeof body.latLng.latitude === 'number' &&
          typeof body.latLng.longitude === 'number'
            ? { latitude: body.latLng.latitude, longitude: body.latLng.longitude }
            : undefined,
        stackSummary: typeof body.stackSummary === 'string' ? body.stackSummary : undefined,
      });

      return res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate Gemini response.';
      const status = message.includes('GEMINI_API_KEY') ? 503 : 500;
      return res.status(status).json({ error: message });
    }
  });

  // Dedicated Google Search Grounding market & ROI benchmark endpoint (gemini-4-hydrogen)
  app.post('/api/gemini/search-grounding', async (req, res) => {
    try {
      const body = req.body || {};
      const query = typeof body.query === 'string' ? body.query : '';
      const rawCtx = body.context && typeof body.context === 'object' ? body.context : undefined;
      const context = rawCtx
        ? {
            productName: typeof rawCtx.productName === 'string' ? rawCtx.productName : undefined,
            scenarioLabel: typeof rawCtx.scenarioLabel === 'string' ? rawCtx.scenarioLabel : undefined,
            modeledRoiPct:
              typeof rawCtx.modeledRoiPct === 'number' && Number.isFinite(rawCtx.modeledRoiPct)
                ? rawCtx.modeledRoiPct
                : undefined,
            paybackMonths:
              typeof rawCtx.paybackMonths === 'number' && Number.isFinite(rawCtx.paybackMonths)
                ? rawCtx.paybackMonths
                : undefined,
            spentaThreeYrTcoUsd:
              typeof rawCtx.spentaThreeYrTcoUsd === 'number' &&
              Number.isFinite(rawCtx.spentaThreeYrTcoUsd)
                ? rawCtx.spentaThreeYrTcoUsd
                : undefined,
            westernThreeYrTcoUsd:
              typeof rawCtx.westernThreeYrTcoUsd === 'number' &&
              Number.isFinite(rawCtx.westernThreeYrTcoUsd)
                ? rawCtx.westernThreeYrTcoUsd
                : undefined,
          }
        : undefined;
      const result = await runSearchGroundedBrief(query, context);
      return res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search grounding request failed.';
      const status = message.includes('GEMINI_API_KEY') ? 503 : 500;
      return res.status(status).json({ error: message });
    }
  });

  // Dedicated Google Maps Grounding regional hub & target client market endpoint (gemini-4-hydrogen)
  app.post('/api/gemini/maps-grounding', async (req, res) => {
    try {
      const body = req.body || {};
      const query = typeof body.query === 'string' ? body.query : '';
      const hubLabel = typeof body.hubLabel === 'string' ? body.hubLabel : undefined;
      const latLng =
        body.latLng &&
        typeof body.latLng.latitude === 'number' &&
        typeof body.latLng.longitude === 'number'
          ? { latitude: body.latLng.latitude, longitude: body.latLng.longitude }
          : undefined;
      const result = await runMapsGroundedBrief(query, latLng, hubLabel);
      return res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Maps grounding request failed.';
      const status = message.includes('GEMINI_API_KEY') ? 503 : 500;
      return res.status(status).json({ error: message });
    }
  });

  // Institutional Seed SAFE Financial Summary Generator (gemini-4-hydrogen)
  app.post('/api/financial-summary', async (req, res) => {
    try {
      const body = req.body;
      if (!body || typeof body !== 'object') {
        return res.status(400).json({ error: 'Request body must be a JSON object.' });
      }

      const rawFx = Number(body.fxRate);
      const rawInv = Number(body.investmentUsd);
      const rawExit = Number(body.exitMultiple);
      const rawHorizon = Number(body.horizonYears);

      if (!Number.isFinite(rawInv) || rawInv < 10_000 || rawInv > 2_000_000) {
        return res.status(400).json({ error: 'Invalid investmentUsd parameter.' });
      }

      const conf =
        body.confidenceLevelPct === 90 || body.confidenceLevelPct === 99
          ? body.confidenceLevelPct
          : 95;

      const result = await generateFinancialSummary({
        currency: body.currency === 'BDT' ? 'BDT' : 'USD',
        fxRate: Number.isFinite(rawFx) && rawFx >= 80 && rawFx <= 200 ? rawFx : 122.61,
        scenario: body.scenario === 'upside' ? 'upside' : 'conservative',
        bearCase: Boolean(body.bearCase),
        investmentUsd: rawInv,
        exitMultiple: Number.isFinite(rawExit) && rawExit >= 4 && rawExit <= 25 ? rawExit : 10,
        horizonYears:
          Number.isFinite(rawHorizon) && rawHorizon >= 1 && rawHorizon <= 5
            ? Math.round(rawHorizon)
            : 5,
        persona:
          body.persona === 'technical' || body.persona === 'strategic'
            ? body.persona
            : 'financial',
        selectedTierCode:
          typeof body.selectedTierCode === 'string'
            ? body.selectedTierCode.slice(0, 32)
            : undefined,
        selectedTierName:
          typeof body.selectedTierName === 'string'
            ? body.selectedTierName.slice(0, 80)
            : undefined,
        netMarginPct:
          typeof body.netMarginPct === 'number' && Number.isFinite(body.netMarginPct)
            ? body.netMarginPct
            : undefined,
        monteCarloP10Usd:
          typeof body.monteCarloP10Usd === 'number' && Number.isFinite(body.monteCarloP10Usd)
            ? body.monteCarloP10Usd
            : undefined,
        monteCarloP50Usd:
          typeof body.monteCarloP50Usd === 'number' && Number.isFinite(body.monteCarloP50Usd)
            ? body.monteCarloP50Usd
            : undefined,
        monteCarloP90Usd:
          typeof body.monteCarloP90Usd === 'number' && Number.isFinite(body.monteCarloP90Usd)
            ? body.monteCarloP90Usd
            : undefined,
        confidenceLevelPct: conf,
      });

      return res.json(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to generate institutional financial summary.';
      const status = message.includes('GEMINI_API_KEY') ? 503 : 500;
      return res.status(status).json({ error: message });
    }
  });

  const distDir = path.join(__dirname, 'dist');
  const serveStatic = () => {
    app.use(
      '/assets',
      express.static(path.join(distDir, 'assets'), {
        immutable: true,
        maxAge: '1y',
        fallthrough: true,
      }),
    );
    app.use('/assets', (_req, res) => {
      res.status(404).setHeader('Cache-Control', 'no-store').type('text/plain').send('Asset not found');
    });
    app.use(express.static(distDir, { index: false }));
    app.use((req, res) => {
      if (/\.(?:js|mjs|cjs|css|map|wasm|json|svg|png|jpe?g|webp|woff2?)$/i.test(req.path)) {
        res.status(404).setHeader('Cache-Control', 'no-store').type('text/plain').send('Not found');
        return;
      }
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(distDir, 'index.html'));
    });
  };

  if (!isProd) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true, hmr: false, ws: false },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (viteErr) {
      if (fs.existsSync(path.join(distDir, 'index.html'))) {
        serveStatic();
      } else {
        throw viteErr;
      }
    }
  } else {
    serveStatic();
  }

  app.listen(PORT, HOST, () => {
    console.log(`Spenta Sovereign OS portal running on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
