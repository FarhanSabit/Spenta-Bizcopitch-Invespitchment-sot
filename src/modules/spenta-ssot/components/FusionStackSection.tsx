import React, { useState } from 'react';
import {
  Activity,
  Check,
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

const LAYER_KEYS: CoreLayerId[] = ['L6', 'L5', 'L4', 'L3', 'L2', 'L1'];

type InspectorTabId = 'api' | 'sdk' | 'telemetry' | 'compliance';

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
    { label: 'Telemetry Telemetry Stream', value: 'gRPC / WebRTC', status: 'Active' },
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
  } = useSsotBriefing();

  const [inspectorTab, setInspectorTab] = useState<InspectorTabId>('api');
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

  return (
    <section
      id="ssot-fusion-stack"
      className={`scroll-mt-24 space-y-5 rounded-2xl p-1 transition-all ${
        pulsedSectionId === 'ssot-fusion-stack' ? 'animate-section-header-pulse' : ''
      }`}
    >
      {/* Chapter Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 pb-4 border-b border-[#E4DFD6] dark:border-[#232B4A]">
        <div className="space-y-1">
          <div className="text-xs font-mono text-[#5F6576] dark:text-[#8E96B0]">
            <span>Chapter {chapter.num}</span>
            {chapter.recommendedFor.includes(personaTrack) && (
              <>
                <span aria-hidden="true"> · </span>
                <span className="text-[#1C6E46] dark:text-[#6FCB9F] font-semibold">
                  Priority for {activePersonaSpec.label}
                </span>
              </>
            )}
          </div>
          <h2 className="font-display-ssot text-xl sm:text-2xl font-bold text-[#16213A] dark:text-[#E7EBF5] tracking-tight text-balance">
            {chapter.title}
          </h2>
          <p className="text-sm text-[#5F6576] dark:text-[#8E96B0] max-w-3xl">
            Vertically integrated L1–L6 sovereign pipeline. Switch between High-Level Overview and Technical Deep-Dive to inspect live APIs, SDKs, enclave telemetry, and compliance attestations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* High-Level Overview vs Technical Deep-Dive Toggle */}
          <div
            role="group"
            aria-label="Fusion Stack Detail Depth"
            className="inline-flex rounded-lg bg-[#F2EFE9] dark:bg-[#0F1529] p-1 border border-[#E4DFD6] dark:border-[#232B4A]"
          >
            <button
              type="button"
              aria-pressed={fusionViewMode === 'overview'}
              onClick={() => setFusionViewMode('overview')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                fusionViewMode === 'overview'
                  ? 'bg-white dark:bg-[#141A32] text-[#16213A] dark:text-[#E7EBF5] shadow-xs'
                  : 'text-[#5F6576] dark:text-[#8E96B0]'
              }`}
            >
              High-Level Overview
            </button>
            <button
              type="button"
              aria-pressed={fusionViewMode === 'deep-dive'}
              onClick={() => setFusionViewMode('deep-dive')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                fusionViewMode === 'deep-dive'
                  ? 'bg-[#1F3863] text-white dark:bg-[#8FA6E8] dark:text-[#0B1020]'
                  : 'text-[#5F6576] dark:text-[#8E96B0]'
              }`}
            >
              Technical Deep-Dive
            </button>
          </div>

          <button
            type="button"
            onClick={() => openIntelligenceModal(chapter.title)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] hover:border-[#1F3863] text-xs font-medium text-[#16213A] dark:text-[#E7EBF5] cursor-pointer whitespace-nowrap"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            <span>{noteCount > 0 ? `Notes (${noteCount})` : 'Add Note'}</span>
          </button>
        </div>
      </div>

      {/* Mode 1: High-Level Overview Grid */}
      {fusionViewMode === 'overview' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {LAYER_KEYS.map((layerKey) => {
            const spec = FUSION_LAYER_TECH_SPECS[layerKey];
            const selected = activeLayer === layerKey;
            return (
              <div
                key={layerKey}
                className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 transition-colors ${
                  selected
                    ? 'bg-white dark:bg-[#141A32] border-[#1F3863] dark:border-[#8FA6E8]'
                    : 'bg-white dark:bg-[#141A32] border-[#E4DFD6] dark:border-[#232B4A]'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-[#1F3863] dark:text-[#8FA6E8]">
                      {spec.layerId}
                    </span>
                    <span className="text-[#1C6E46] dark:text-[#6FCB9F] font-semibold">
                      {spec.specs.latency}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#16213A] dark:text-[#E7EBF5]">
                    {spec.title}
                  </h3>
                  <p className="text-xs text-[#5F6576] dark:text-[#8E96B0] leading-relaxed">
                    {spec.subtitle}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#E4DFD6] dark:border-[#232B4A] flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-[#5F6576] dark:text-[#8E96B0]">
                    {spec.specs.protocol} · SLA {spec.specs.uptimeSla}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveLayer(layerKey);
                      setFusionViewMode('deep-dive');
                    }}
                    className="text-xs font-semibold text-[#1F3863] dark:text-[#8FA6E8] hover:underline cursor-pointer whitespace-nowrap"
                  >
                    Inspect Specs →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Mode 2: Technical Deep-Dive with 4-Tab Live Inspector */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Layer Selector Rail */}
          <div className="lg:col-span-4 space-y-2">
            {LAYER_KEYS.map((layerKey) => {
              const spec = FUSION_LAYER_TECH_SPECS[layerKey];
              const selected = activeLayer === layerKey;
              return (
                <button
                  key={layerKey}
                  type="button"
                  onClick={() => setActiveLayer(layerKey)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-colors cursor-pointer ${
                    selected
                      ? 'bg-[#1F3863] text-white border-[#1F3863] dark:bg-[#8FA6E8] dark:text-[#0B1020] dark:border-[#8FA6E8]'
                      : 'bg-white dark:bg-[#141A32] border-[#E4DFD6] dark:border-[#232B4A] hover:border-[#1F3863]/50 dark:hover:border-[#8FA6E8]/50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold">{spec.layerId}</span>
                    <span className="opacity-85">{spec.specs.latency}</span>
                  </div>
                  <div className="text-sm font-semibold mt-1">{spec.title}</div>
                </button>
              );
            })}
          </div>

          {/* 4-Tab Live API/SDK/Telemetry/Compliance Inspector */}
          <div className="lg:col-span-8 p-5 rounded-2xl bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="text-xs font-mono text-[#5F6576] dark:text-[#8E96B0]">
                  {activeFusionSpec.layerId} · {activeFusionSpec.specs.protocol} · SLA{' '}
                  {activeFusionSpec.specs.uptimeSla}
                </div>
                <h3 className="text-lg font-bold text-[#16213A] dark:text-[#E7EBF5]">
                  {activeFusionSpec.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#5F6576] dark:text-[#8E96B0]">
                  {activeFusionSpec.subtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  navigateToItem('Spenta Core', { type: 'layer', id: activeLayer })
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1F3863] hover:bg-[#162848] dark:bg-[#8FA6E8] dark:hover:bg-[#A6B9F0] text-white dark:text-[#0B1020] text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Configure {activeLayer} in Spenta Core</span>
              </button>
            </div>

            {/* 4-Tab Bar */}
            <div
              role="tablist"
              aria-label="Layer Technical Inspector"
              className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#F2EFE9] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A]"
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
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-white dark:bg-[#141A32] text-[#16213A] dark:text-[#E7EBF5] shadow-xs'
                        : 'text-[#5F6576] dark:text-[#8E96B0] hover:text-[#16213A] dark:hover:text-[#E7EBF5]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab 1: API Contracts */}
            {inspectorTab === 'api' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A]">
                    <div className="text-[#5F6576] dark:text-[#8E96B0]">Latency</div>
                    <div className="font-mono font-semibold text-[#16213A] dark:text-[#E7EBF5] mt-0.5">
                      {activeFusionSpec.specs.latency}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A]">
                    <div className="text-[#5F6576] dark:text-[#8E96B0]">Throughput</div>
                    <div className="font-mono font-semibold text-[#16213A] dark:text-[#E7EBF5] mt-0.5">
                      {activeFusionSpec.specs.throughput}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A]">
                    <div className="text-[#5F6576] dark:text-[#8E96B0]">Encryption</div>
                    <div className="font-mono font-semibold text-[#16213A] dark:text-[#E7EBF5] mt-0.5">
                      {activeFusionSpec.specs.encryption}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A]">
                    <div className="text-[#5F6576] dark:text-[#8E96B0]">Uptime SLA</div>
                    <div className="font-mono font-semibold text-[#1C6E46] dark:text-[#6FCB9F] mt-0.5">
                      {activeFusionSpec.specs.uptimeSla}
                    </div>
                  </div>
                </div>

                {activeFusionSpec.endpoints.map((ep) => (
                  <div
                    key={ep.path}
                    className="p-3 rounded-lg bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] space-y-1"
                  >
                    <div className="text-xs font-mono text-[#1F3863] dark:text-[#8FA6E8] font-semibold">
                      {ep.method} {ep.path}
                    </div>
                    <p className="text-xs text-[#5F6576] dark:text-[#8E96B0]">{ep.description}</p>
                    <pre className="text-[11px] font-mono text-[#16213A] dark:text-[#C8D0E4] overflow-x-auto pt-1">
                      {ep.samplePayload}
                    </pre>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 2: SDK Code */}
            {inspectorTab === 'sdk' && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5]">
                    {activeFusionSpec.codeSample.title} ({activeFusionSpec.codeSample.language})
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleCopySnippet()}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#1F3863] dark:text-[#8FA6E8] hover:underline cursor-pointer"
                  >
                    {copiedCode ? (
                      <Check className="w-3.5 h-3.5 text-[#1C6E46]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-[#0B1020] text-[#E7EBF5] text-xs font-mono overflow-x-auto leading-relaxed">
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
                    className="p-4 rounded-xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-xs text-[#5F6576] dark:text-[#8E96B0]">
                        {metric.label}
                      </div>
                      <div className="text-lg font-bold font-mono tabular-nums text-[#16213A] dark:text-[#E7EBF5] mt-0.5">
                        {metric.value}
                      </div>
                    </div>
                    <span className="text-xs font-mono font-semibold text-[#1C6E46] dark:text-[#6FCB9F]">
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
                      className="p-3.5 rounded-xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] flex items-center gap-2.5"
                    >
                      <ShieldCheck className="w-4 h-4 text-[#1C6E46] dark:text-[#6FCB9F] shrink-0" />
                      <span className="text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5]">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="p-3.5 rounded-xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-mono text-[#5F6576] dark:text-[#8E96B0]">
                    Stack Components: {activeFusionSpec.techStack.join(' · ')}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[#1F3863] dark:text-[#8FA6E8] font-semibold">
                    <Layers className="w-3.5 h-3.5" />
                    Zero Cloud PII Exfiltration
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
