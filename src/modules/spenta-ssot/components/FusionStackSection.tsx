import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  Check,
  ChevronDown,
  Code2,
  Copy,
  Layers,
  MessageSquarePlus,
  Network,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import {
  BRIEFING_CHAPTERS,
  FUSION_LAYER_TECH_SPECS,
  INVESTOR_PERSONA_TRACKS,
} from '../../../data/unifiedSsotData';
import { CoreLayerId, useStack } from '../../../store/StackContext';
import { copyTextWithFallback } from '../../../utils/shareUrlCodec';
import { useSsotBriefing } from '../context/SsotBriefingContext';
import { INSTITUTIONAL_EASE } from './SectionReveal';

const LAYER_KEYS: CoreLayerId[] = ['L6', 'L5', 'L4', 'L3', 'L2', 'L1'];

type InspectorTabId = 'api' | 'sdk' | 'telemetry' | 'compliance';

const METHOD_BADGE_MAP: Record<string, string> = {
  POST: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/35',
  GET: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-500/35',
  WS: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/35',
  gRPC: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/35',
  MQTT: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/35',
};

const TELEMETRY_BY_LAYER: Record<
  CoreLayerId,
  Array<{ label: string; value: string; status: string }>
> = {
  L6: [
    { label: 'TTI / Edge Render', value: '94 ms', status: 'Nominal' },
    { label: 'Active Workspace Sync', value: '12.4 ms', status: 'Nominal' },
    { label: 'Browser Session Egress', value: '0 bytes PII', status: 'Air-Gapped' },
    { label: 'Audit Trail Coverage', value: '100.0%', status: 'Verified' },
  ],
  L5: [
    { label: 'OPA Confidence Gate', value: '>= 0.88', status: 'Enforced' },
    { label: 'Auto-Approved STP Rate', value: '91.4%', status: 'Nominal' },
    { label: 'HITL Escalation Queue', value: '8.6%', status: 'Monitored' },
    { label: 'Policy Eval Latency', value: '3.2 ms', status: 'Nominal' },
  ],
  L4: [
    { label: 'WebAR Bundle Payload', value: '14.2 MB', status: 'Optimal' },
    { label: 'Cleanroom Twin Frame Rate', value: '72–90 FPS', status: 'Nominal' },
    { label: 'Spatial Anchor Drift', value: '< 1.8 mm', status: 'Calibrated' },
    { label: 'Telemetry Sync Stream', value: 'gRPC / WebRTC', status: 'Active' },
  ],
  L3: [
    { label: 'PrimeOCR Throughput', value: '2.1s / form', status: 'Production' },
    { label: 'Bangla + English WER', value: '3.4%', status: 'Verified' },
    { label: 'Multi-Agent Tool Calls', value: '8 Orchestrated', status: 'Nominal' },
    { label: 'Cloud Token Burn', value: '$0.00 / req', status: 'Zero Egress' },
  ],
  L2: [
    { label: 'Quantized Inference p95', value: '42 ms', status: 'Nominal' },
    { label: 'Memory Enclave', value: 'AMD SEV-SNP', status: 'Locked' },
    { label: 'VRAM Allocation (T3 4x3090)', value: '74 / 96 GB', status: 'Balanced' },
    { label: 'Model Weights Signature', value: 'SHA-256 Attested', status: 'Verified' },
  ],
  L1: [
    { label: 'MQTT Broker Ingest', value: '14,200 msg/s', status: 'Nominal' },
    { label: 'Connected Edge Nodes', value: '80 Stations', status: 'Live' },
    { label: 'Optical RGB/Depth Sync', value: '60 Hz', status: 'Nominal' },
    { label: 'Packet Drop Rate', value: '0.01%', status: 'Nominal' },
  ],
};

export function FusionStackSection() {
  const {
    personaTrack,
    investorFeedback,
    openIntelligenceModal,
    navigateToItem,
  } = useStack();
  const {
    fusionViewMode,
    setFusionViewMode,
    activeLayer,
    setActiveLayer,
    pulsedSectionId,
    highlightedSectionId,
  } = useSsotBriefing();

  const [inspectorTab, setInspectorTab] = useState<InspectorTabId>('api');
  const [expandedDocsLayer, setExpandedDocsLayer] = useState<CoreLayerId | null>('L6');
  const [copiedCode, setCopiedCode] = useState(false);

  const chapter = BRIEFING_CHAPTERS[1];
  const activePersonaSpec =
    INVESTOR_PERSONA_TRACKS.find((t) => t.id === personaTrack) ?? INVESTOR_PERSONA_TRACKS[0];
  const noteCount = investorFeedback.filter(
    (f) => f.section === chapter.title || f.section.includes(chapter.shortTitle),
  ).length;
  const activeFusionSpec = FUSION_LAYER_TECH_SPECS[activeLayer];

  const handleCopySnippet = async () => {
    await copyTextWithFallback(activeFusionSpec.codeSample.code);
    setCopiedCode(true);
    window.setTimeout(() => setCopiedCode(false), 2000);
  };

  const isHighlighted = highlightedSectionId === 'ssot-fusion-stack';

  return (
    <section
      id="ssot-fusion-stack"
      className={`scroll-mt-24 relative overflow-hidden space-y-5 rounded-2xl p-5 sm:p-7 ssot-band-primary border border-slate-200 dark:border-slate-800/80 transition-all ${
        pulsedSectionId === 'ssot-fusion-stack' ? 'animate-section-header-pulse' : ''
      } ${
        isHighlighted
          ? 'ring-2 ring-cyan-500 dark:ring-cyan-400 ring-offset-4 ring-offset-slate-50 dark:ring-offset-[#05070B]'
          : ''
      }`}
    >
      {/* Subtle Ambient Orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none -left-24 -top-24 absolute w-[480px] h-[480px] rounded-full bg-cyan-500/8 blur-[140px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none -right-24 -bottom-24 absolute w-[420px] h-[420px] rounded-full bg-indigo-500/8 blur-[130px]"
      />

      {/* Chapter Header */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800/80">
        <div className="space-y-1">
          <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
            <span>Chapter {chapter.num}</span>
            {chapter.recommendedFor.includes(personaTrack) && (
              <>
                <span aria-hidden="true"> · </span>
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                  Priority for {activePersonaSpec.label}
                </span>
              </>
            )}
          </div>
          <h2 className="font-display-ssot text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight text-balance">
            {chapter.title}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-3xl">
            Vertically integrated L1–L6 sovereign pipeline. Switch between High-Level Overview and Technical Deep-Dive to inspect live APIs, SDKs, enclave telemetry, and compliance attestations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* High-Level Overview vs Technical Deep-Dive Toggle */}
          <div
            role="group"
            aria-label="Fusion Stack Detail Depth"
            className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800"
          >
            <button
              id="fusion-view-overview-btn"
              type="button"
              aria-pressed={fusionViewMode === 'overview'}
              onClick={() => setFusionViewMode('overview')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                fusionViewMode === 'overview'
                  ? 'bg-cyan-600 text-white dark:bg-cyan-500 dark:text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              High-Level Overview
            </button>
            <button
              id="fusion-view-deepdive-btn"
              type="button"
              aria-pressed={fusionViewMode === 'deep-dive'}
              onClick={() => setFusionViewMode('deep-dive')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                fusionViewMode === 'deep-dive'
                  ? 'bg-indigo-600 text-white dark:bg-indigo-500 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Technical Deep-Dive
            </button>
          </div>

          <button
            type="button"
            onClick={() => openIntelligenceModal(chapter.title)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-cyan-500 text-xs font-medium text-slate-900 dark:text-slate-100 cursor-pointer whitespace-nowrap"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            <span>{noteCount > 0 ? `Notes (${noteCount})` : 'Add Note'}</span>
          </button>
        </div>
      </div>

      {/* Mode 1 vs Mode 2 with AnimatePresence */}
      <AnimatePresence mode="wait">
        {fusionViewMode === 'overview' ? (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: INSTITUTIONAL_EASE }}
            className="relative z-10 space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {LAYER_KEYS.map((layerKey) => {
                const spec = FUSION_LAYER_TECH_SPECS[layerKey];
                const selected = activeLayer === layerKey;
                return (
                  <div
                    key={layerKey}
                    className={`service-card-3d p-5 rounded-2xl border flex flex-col justify-between gap-4 transition-colors ${
                      selected
                        ? 'bg-cyan-50/50 dark:bg-slate-900/90 border-cyan-500'
                        : 'bg-white dark:bg-slate-950/90 border-slate-200 dark:border-slate-800/80'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-bold text-cyan-700 dark:text-cyan-400">
                          {spec.layerId}
                        </span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold tabular-nums">
                          {spec.specs.latency}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {spec.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {spec.subtitle}
                      </p>
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                        <strong className="font-mono text-indigo-700 dark:text-indigo-400">
                          Value Impact:
                        </strong>{' '}
                        {spec.enterpriseImpact}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        {spec.specs.protocol} · SLA {spec.specs.uptimeSla}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveLayer(layerKey);
                          setExpandedDocsLayer(layerKey);
                          setFusionViewMode('deep-dive');
                        }}
                        className="text-xs font-semibold text-cyan-700 dark:text-cyan-400 hover:underline cursor-pointer whitespace-nowrap"
                      >
                        Deep-Dive →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={() => setFusionViewMode('deep-dive')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer transition-colors"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Expand Technical Deep-Dive &amp; API Contracts</span>
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="deep-dive"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: INSTITUTIONAL_EASE }}
            className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-5"
          >
            {/* Layer Selector Rail with Expandable techDocs Accordion */}
            <div className="lg:col-span-5 space-y-2.5">
              {LAYER_KEYS.map((layerKey) => {
                const spec = FUSION_LAYER_TECH_SPECS[layerKey];
                const selected = activeLayer === layerKey;
                const docsExpanded = expandedDocsLayer === layerKey;
                return (
                  <div
                    key={layerKey}
                    className={`rounded-xl border transition-colors overflow-hidden ${
                      selected
                        ? 'bg-indigo-50/60 dark:bg-slate-900 border-indigo-500 dark:border-indigo-400'
                        : 'bg-white dark:bg-slate-950/90 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActiveLayer(layerKey);
                        setExpandedDocsLayer((prev) => (prev === layerKey ? null : layerKey));
                      }}
                      className="w-full text-left p-3.5 cursor-pointer flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span className="font-bold text-indigo-700 dark:text-indigo-400">
                            {spec.layerId}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="text-emerald-700 dark:text-emerald-400 tabular-nums">
                            {spec.specs.latency}
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                          {spec.title}
                        </div>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${
                          docsExpanded ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''
                        }`}
                      />
                    </button>

                    <AnimatePresence initial={false}>
                      {docsExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: INSTITUTIONAL_EASE }}
                          className="overflow-hidden border-t border-slate-200 dark:border-slate-800/80"
                        >
                          <div className="p-3.5 bg-slate-50/80 dark:bg-slate-950/60 space-y-2 text-xs">
                            <div>
                              <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                                Touchpoints:
                              </span>{' '}
                              <span className="text-slate-600 dark:text-slate-400">
                                {spec.touchpoints}
                              </span>
                            </div>
                            <div>
                              <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                                Governance:
                              </span>{' '}
                              <span className="text-slate-600 dark:text-slate-400">
                                {spec.securityGovernance}
                              </span>
                            </div>
                            <div className="font-mono text-[11px] text-cyan-700 dark:text-cyan-400">
                              Stack: {spec.techStack.join(' · ')}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* 4-Tab Live API/SDK/Telemetry/Compliance Inspector */}
            <div className="lg:col-span-7 p-5 rounded-2xl bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    {activeFusionSpec.layerId} · {activeFusionSpec.specs.protocol} · SLA{' '}
                    {activeFusionSpec.specs.uptimeSla}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {activeFusionSpec.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    {activeFusionSpec.subtitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    navigateToItem('Spenta Core', { type: 'layer', id: activeLayer })
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Configure {activeLayer}</span>
                </button>
              </div>

              {/* 4-Tab Bar */}
              <div
                role="tablist"
                aria-label="Layer Technical Inspector"
                className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
              >
                {(
                  [
                    { id: 'api', label: 'API Contracts', icon: Network },
                    { id: 'sdk', label: 'SDK Code', icon: Code2 },
                    { id: 'telemetry', label: 'Live Telemetry', icon: Activity },
                    { id: 'compliance', label: 'Compliance', icon: ShieldCheck },
                  ] as const
                ).map((tab) => {
                  const Icon = tab.icon;
                  const active = inspectorTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setInspectorTab(tab.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab 1: API Contracts with Method Badges */}
              {inspectorTab === 'api' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
                      <div className="text-slate-500 dark:text-slate-400">Latency</div>
                      <div className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white mt-0.5">
                        {activeFusionSpec.specs.latency}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
                      <div className="text-slate-500 dark:text-slate-400">Throughput</div>
                      <div className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white mt-0.5">
                        {activeFusionSpec.specs.throughput}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
                      <div className="text-slate-500 dark:text-slate-400">Encryption</div>
                      <div className="font-mono font-semibold text-slate-900 dark:text-white mt-0.5">
                        {activeFusionSpec.specs.encryption}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
                      <div className="text-slate-500 dark:text-slate-400">Uptime SLA</div>
                      <div className="font-mono font-semibold tabular-nums text-emerald-700 dark:text-emerald-400 mt-0.5">
                        {activeFusionSpec.specs.uptimeSla}
                      </div>
                    </div>
                  </div>

                  {activeFusionSpec.endpoints.map((ep) => {
                    const badgeCls =
                      METHOD_BADGE_MAP[ep.method] ??
                      'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
                    return (
                      <div
                        key={ep.path}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-1.5"
                      >
                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                          <span
                            className={`px-2 py-0.5 rounded border text-[10px] font-bold ${badgeCls}`}
                          >
                            {ep.method}
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100 break-all">
                            {ep.path}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{ep.description}</p>
                        <pre className="text-[11px] font-mono text-slate-800 dark:text-slate-300 overflow-x-auto pt-1">
                          {ep.samplePayload}
                        </pre>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tab 2: SDK Code */}
              {inspectorTab === 'sdk' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      {activeFusionSpec.codeSample.title} ({activeFusionSpec.codeSample.language})
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleCopySnippet()}
                      className="inline-flex items-center gap-1 text-xs font-medium text-cyan-700 dark:text-cyan-400 hover:underline cursor-pointer"
                    >
                      {copiedCode ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                    </button>
                  </div>
                  <pre className="p-4 rounded-xl bg-[#05070B] text-slate-100 border border-slate-800 text-xs font-mono overflow-x-auto leading-relaxed">
                    {activeFusionSpec.codeSample.code}
                  </pre>
                </div>
              )}

              {/* Tab 3: Live Telemetry */}
              {inspectorTab === 'telemetry' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {TELEMETRY_BY_LAYER[activeLayer].map((metric) => (
                    <div
                      key={metric.label}
                      className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {metric.label}
                        </div>
                        <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                          {metric.value}
                        </div>
                      </div>
                      <span className="text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                        {metric.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 4: Compliance */}
              {inspectorTab === 'compliance' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeFusionSpec.complianceMapping.map((item) => (
                      <div
                        key={item}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 flex items-center gap-2.5"
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="text-xs font-semibold text-slate-900 dark:text-white">
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-mono text-slate-600 dark:text-slate-400">
                      Stack Components: {activeFusionSpec.techStack.join(' · ')}
                    </span>
                    <span className="inline-flex items-center gap-1 text-cyan-700 dark:text-cyan-400 font-semibold">
                      <Layers className="w-3.5 h-3.5" />
                      Zero Cloud PII Exfiltration
                    </span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
