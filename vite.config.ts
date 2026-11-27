import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function disableHmrWebSocketPlugin(): Plugin {
  let hmrDisabled = false;
  return {
    name: 'disable-hmr-websocket',
    apply: 'serve',
    enforce: 'post',
    configResolved(resolved) {
      hmrDisabled = resolved.server.hmr === false || resolved.server.ws === false;
    },
    transform(code, id) {
      if (hmrDisabled && id.replace(/\\/g, '/').includes('/vite/dist/client/client.mjs')) {
        return {
          code: code.replace(
            'transport.connect(createHMRHandler(handleMessage));',
            '/* HMR disabled: WebSocket connect suppressed */',
          ),
          map: null,
        };
      }
      return undefined;
    },
  };
}

export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss(), disableHmrWebSocketPlugin()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/');

          // Keep Vite's virtual preload helper out of lazy PDF/chart chunks so the entry bundle never eagerly preloads jsPDF
          if (normalized.includes('vite/preload-helper') || normalized.includes('commonjsHelpers')) {
            return 'vendor-react';
          }

          if (!normalized.includes('node_modules')) return undefined;

          // 3D Engine & Controls (Loaded on demand with 3D canvas tabs)
          if (normalized.includes('/three/addons/') || normalized.includes('/three/examples/')) {
            return 'vendor-three-addons';
          }
          if (normalized.includes('/three/')) {
            return 'vendor-three-core';
          }

          // Charts & Data Visualization (Granular split: recharts, d3, victory, and Redux state)
          if (normalized.includes('/recharts/')) {
            return 'vendor-charts-recharts';
          }
          if (normalized.includes('/d3-')) {
            return 'vendor-charts-d3';
          }
          if (normalized.includes('/victory-vendor/') || normalized.includes('/victory/')) {
            return 'vendor-charts-victory';
          }
          if (
            normalized.includes('/@reduxjs/toolkit/') ||
            normalized.includes('/react-redux/') ||
            normalized.includes('/immer/') ||
            normalized.includes('/reselect/') ||
            normalized.includes('/redux/')
          ) {
            return 'vendor-charts-state';
          }

          // PDF Generation & Document Export (Granular split: jspdf, html2canvas, canvg, dompurify, compression)
          if (normalized.includes('/jspdf/')) {
            return 'vendor-pdf-jspdf';
          }
          if (normalized.includes('/html2canvas/')) {
            return 'vendor-pdf-html2canvas';
          }
          if (normalized.includes('/canvg/')) {
            return 'vendor-pdf-canvg';
          }
          if (normalized.includes('/dompurify/')) {
            return 'vendor-pdf-dompurify';
          }
          if (
            normalized.includes('/fflate/') ||
            normalized.includes('/fast-png/') ||
            normalized.includes('/pako/')
          ) {
            return 'vendor-pdf-compression';
          }

          // Animations & Motion
          if (
            normalized.includes('/framer-motion/') ||
            normalized.includes('/motion-dom/') ||
            normalized.includes('/motion-utils/')
          ) {
            return 'vendor-framer-motion';
          }
          if (normalized.includes('/gsap/')) {
            return 'vendor-gsap';
          }

          // Icons
          if (normalized.includes('/lucide-react/')) {
            return 'vendor-icons';
          }

          // React Core Framework
          if (
            normalized.includes('/react/') ||
            normalized.includes('/react-dom/') ||
            normalized.includes('/scheduler/')
          ) {
            return 'vendor-react';
          }

          return undefined;
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
    hmr: false,
    ws: false,
  },
});
