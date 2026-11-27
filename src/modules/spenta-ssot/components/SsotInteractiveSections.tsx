import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Box,
  Cpu,
  FolderLock,
  Layers,
  MessageSquarePlus,
  Presentation,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BRIEFING_CHAPTERS,
  BriefingChapterSpec,
  COMPETITIVE_MOAT_ROWS,
  DUAL_SHORE_HUBS,
  EXECUTIVE_TEAM,
  INVESTOR_PERSONA_TRACKS,
  MACRO_HARDWARE_CATALYSTS,
  PASSIVE_IP_STREAMS,
  RD_ROADMAP_PHASES,
  SSOT_CASE_STUDIES,
  STARTUP_BENCHMARKS,
  UNIFIED_SAFE_TERMS,
  formatSsotCurrency,
} from '../../../data/unifiedSsotData';
import { useTheme } from '../../../context/ThemeContext';
import { useStack } from '../../../store/StackContext';
import { lazyWithRetry } from '../../../utils/lazyWithRetry';
import { getPanelPreloadHandlers, getTabPreloadHandlers } from '../../../utils/viewPreloaders';
import { useSsotBriefing } from '../context/SsotBriefingContext';
import { INSTITUTIONAL_EASE, SectionReveal, SectionRevealItem } from './SectionReveal';
import { SectionDivider } from './SectionDivider';

const DualShoreGlobe = lazyWithRetry(() =>
  import('../../../components/briefing/DualShoreGlobe').then((m) => ({
    default: m.DualShoreGlobe,
  })),
);

export function SsotChapterHeader({
  chapter,
  subtitle,
  rightAction,
}: {
  chapter: BriefingChapterSpec;
  subtitle: string;
  rightAction?: React.ReactNode;
}) {
  const { personaTrack, investorFeedback, openIntelligenceModal } = useStack();
  const { pulsedSectionId } = useSsotBriefing();
  const isPriority = chapter.recommendedFor.includes(personaTrack);
  const feedbackCount = investorFeedback.filter((f) => f.section === chapter.id).length;
  const activePersonaLabel =
    INVESTOR_PERSONA_TRACKS.find((p) => p.id === personaTrack)?.label ?? personaTrack;
  const isPulsed = pulsedSectionId === chapter.id;

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-3.5 border-b border-slate-200 dark:border-slate-800 rounded-lg transition-all ${
        isPulsed ? 'animate-section-header-pulse px-2 py-1' : ''
      }`}
    >
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-mono text-slate-500 dark:text-slate-400">
          <span className="text-cyan-700 dark:text-cyan-400 font-semibold">
            Chapter {chapter.num}
          </span>
          {isPriority && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                Recommended for {activePersonaLabel}
              </span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <button
            type="button"
            {...getPanelPreloadHandlers('investor-intelligence')}
            onClick={() => openIntelligenceModal(chapter.id)}
            className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            <span>Notes ({feedbackCount})</span>
          </button>
        </div>
        <h2 className="font-display-ssot text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight text-balance">
          {chapter.title}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-3xl">{subtitle}</p>
      </div>
      {rightAction && <div className="shrink-0">{rightAction}</div>}
    </div>
  );
}

/* ============================================================================
   01. DUAL-ENGINE COMMERCIALIZATION + ANIMATED SVG SYNERGY FLYWHEEL
   ============================================================================ */
export function DualEngineSection() {
  const { currency, investorCalculatorState } = useStack();
  const { highlightedSectionId } = useSsotBriefing();
  const [activeTab, setActiveTab] = useState<'experience' | 'operations'>('experience');
  const fxRate = investorCalculatorState.fxRate;
  const highlighted = highlightedSectionId === 'ssot-dual-engine';

  const engineSpecs = {
    experience: {
      badge: 'Engine 01 · Land & Expand Entry Wedge',
      title: 'The Experience Engine (Spatial XR & Digital Twins)',
      summary:
        'Captures enterprise buyers rapidly with zero-install WebAR commerce (ISHO), real-time Unreal Engine 5 hospital twins (Apollo), and procedural cleanroom VR certifications (Samsung Biologics).',
      ticket: `${formatSsotCurrency(1200, currency, fxRate)} – ${formatSsotCurrency(45000, currency, fxRate)}`,
      marginLabel: 'Up to 76.3% Gross Margin',
      deliverables: [
        'USDZ / GLB WebAR Commerce Embeds',
        'Unreal Engine 5 / Pixel Streaming Twins',
        'Quest 3 & visionOS Procedural Safety Modules',
      ],
    },
    operations: {
      badge: 'Engine 02 · High-Retention Sovereign Expansion',
      title: 'The Operations Engine (PrimeOCR, Voice ERP & 8 AI Agents)',
      summary:
        'Converts initial spatial buyers into multi-year sovereign infrastructure enclaves running self-hosted LLaMA 3.2 Vision KYC pipelines, Bengali/English Voice ERP, and 0.88 HITL reasoning workflows.',
      ticket: `${formatSsotCurrency(40000, currency, fxRate)} – ${formatSsotCurrency(100000, currency, fxRate)}+`,
      marginLabel: '450% Verified Client ROI',
      deliverables: [
        'Air-Gapped PrimeOCR & LayoutLMv3 Document Pipeline',
        'OPA Rego 0.88 Confidence Gate + Immutable Audit Log',
        'PostgreSQL 17 + pgvector Enterprise Sovereign Enclave',
      ],
    },
  };

  const activeSpec = engineSpecs[activeTab];

  return (
    <SectionReveal>
      <section
        id="ssot-dual-engine"
        className={`relative ssot-band-primary scroll-mt-24 rounded-3xl p-4 sm:p-6 space-y-6 overflow-hidden transition-all duration-300 ${
          highlighted ? 'ring-2 ring-cyan-500/60 shadow-[0_0_28px_rgba(8,145,178,0.16)]' : ''
        }`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 right-8 w-80 h-44 rounded-full bg-cyan-500/10 blur-[90px]"
        />

        <SsotChapterHeader
          chapter={BRIEFING_CHAPTERS[0]}
          subtitle="Two synergistic commercial engines convert low-friction spatial pilots into recurring air-gapped enterprise operating systems."
          rightAction={
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800 ssot-no-print">
              <button
                id="engine-tab-experience"
                type="button"
                onClick={() => setActiveTab('experience')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'experience'
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Experience Engine
              </button>
              <button
                id="engine-tab-operations"
                type="button"
                onClick={() => setActiveTab('operations')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'operations'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Operations Engine
              </button>
            </div>
          }
        />

        {/* Animated Engine Focus Switcher + SVG Synergy Flywheel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: INSTITUTIONAL_EASE }}
                className="service-card-3d h-full p-6 rounded-2xl bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="text-xs font-mono font-semibold text-cyan-700 dark:text-cyan-400">
                    {activeSpec.badge}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {activeSpec.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {activeSpec.summary}
                  </p>
                  <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 pt-1">
                    {activeSpec.deliverables.map((item) => (
                      <li key={item} className="font-mono">
                        · {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono tabular-nums">
                  <span className="text-slate-600 dark:text-slate-400">
                    Contract Band: {activeSpec.ticket}
                  </span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                    {activeSpec.marginLabel}
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="lg:col-span-5 p-5 rounded-2xl bg-slate-950 text-slate-100 border border-slate-800 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-cyan-400 font-semibold">SPENTA SYNERGY FLYWHEEL</span>
              <span className="text-emerald-400">L4 Spatial → L5 AI Ops</span>
            </div>

            <svg
              viewBox="0 0 360 190"
              className="w-full h-44"
              role="img"
              aria-label="Dual-Engine Spatial Wedge to Sovereign AI Flywheel"
            >
              <ellipse
                cx="180"
                cy="95"
                rx="125"
                ry="62"
                fill="none"
                stroke="#1E293B"
                strokeWidth="2"
              />
              <ellipse
                cx="180"
                cy="95"
                rx="125"
                ry="62"
                fill="none"
                stroke="#22D3EE"
                strokeWidth="2"
                className="animate-data-flow"
              />
              <g className="animate-node-glow">
                <rect x="20" y="72" width="110" height="46" rx="10" fill="#0F172A" stroke="#22D3EE" />
                <text x="75" y="92" textAnchor="middle" fill="#22D3EE" fontSize="10" fontFamily="JetBrains Mono">
                  EXPERIENCE
                </text>
                <text x="75" y="106" textAnchor="middle" fill="#E2E8F0" fontSize="9" fontFamily="Plus Jakarta Sans">
                  WebAR &amp; UE5 Wedge
                </text>
              </g>
              <g className="animate-node-glow">
                <rect x="230" y="72" width="110" height="46" rx="10" fill="#0F172A" stroke="#34D399" />
                <text x="285" y="92" textAnchor="middle" fill="#34D399" fontSize="10" fontFamily="JetBrains Mono">
                  OPERATIONS
                </text>
                <text x="285" y="106" textAnchor="middle" fill="#E2E8F0" fontSize="9" fontFamily="Plus Jakarta Sans">
                  Air-Gapped AI Enclave
                </text>
              </g>
              <circle cx="180" cy="33" r="6" fill="#A855F7" />
              <text x="180" y="21" textAnchor="middle" fill="#C084FC" fontSize="9" fontFamily="JetBrains Mono">
                ZERO-EGRESS TRUST (2.4 MO PAYBACK)
              </text>
              <circle cx="180" cy="157" r="6" fill="#22D3EE" />
              <text x="180" y="176" textAnchor="middle" fill="#94A3B8" fontSize="9" fontFamily="JetBrains Mono">
                PASSIVE IP + DHAKA $12.98/HR R&amp;D
              </text>
            </svg>

            <div className="text-[11px] font-mono text-slate-400 text-center">
              Pilots acquire trust in 2–6 weeks; Operations contracts lock in 84% recurring retention.
            </div>
          </div>
        </div>
      </section>
    </SectionReveal>
  );
}

/* ============================================================================
   01B. INTERACTIVE D3-STYLE VALUE EXCHANGE NETWORK GRAPH
   ============================================================================ */
interface ValueNode {
  id: string;
  label: string;
  sublabel: string;
  x: number;
  y: number;
  color: string;
  metric: string;
  flowDetail: string;
}

const VALUE_EXCHANGE_NODES: ValueNode[] = [
  {
    id: 'core',
    label: 'SPENTA CORE',
    sublabel: 'L1–L6 Fusion OS',
    x: 260,
    y: 125,
    color: '#22D3EE',
    metric: '100% Air-Gapped Control Plane',
    flowDetail:
      'Central orchestration fusing Meta Ray-Ban / Quest 3 sensor telemetry, PostgreSQL 17 vector state, and OPA 0.88 governance policies.',
  },
  {
    id: 'experience',
    label: 'EXPERIENCE WEDGE',
    sublabel: 'WebAR · UE5 Twins',
    x: 92,
    y: 52,
    color: '#38BDF8',
    metric: '$1.2K–$45K Ticket · 76.3% GM',
    flowDetail:
      'Delivers zero-install ISHO AR commerce and Apollo/Samsung VR twins that win rapid enterprise C-suite sponsorship.',
  },
  {
    id: 'operations',
    label: 'OPERATIONS ENCLAVE',
    sublabel: 'PrimeOCR · Voice ERP',
    x: 428,
    y: 52,
    color: '#34D399',
    metric: '$40K–$100K+ · 450% ROI',
    flowDetail:
      'Extracts KYC documents and orchestrates 8 enterprise AI agents strictly inside client VPCs with zero public cloud egress.',
  },
  {
    id: 'dhaka',
    label: 'DHAKA 20-FTE HUB',
    sublabel: '$12.98/hr Loaded R&D',
    x: 92,
    y: 198,
    color: '#818CF8',
    metric: '85%+ Cost Arbitrage Moat',
    flowDetail:
      'Onshore San Jose and Sydney directors paired with 20 specialized AI/UE5 engineers in Dhaka sustain SaaS-grade margins on bespoke builds.',
  },
  {
    id: 'ip',
    label: 'PASSIVE IP & ROYALTIES',
    sublabel: 'UE5 Fab · SaaS Micro-Tools',
    x: 428,
    y: 198,
    color: '#C084FC',
    metric: '84%–95% Gross Margin',
    flowDetail:
      'Reusable 3D BIM templates, Unity shaders, and compliance LMS licenses spin out of client projects to compound passive cash flow.',
  },
];

export function ValueExchangeSection() {
  const { highlightedSectionId } = useSsotBriefing();
  const [selectedNodeId, setSelectedNodeId] = useState<string>('core');
  const activeNode =
    VALUE_EXCHANGE_NODES.find((n) => n.id === selectedNodeId) ?? VALUE_EXCHANGE_NODES[0];
  const highlighted = highlightedSectionId === 'ssot-value-exchange';

  return (
    <SectionReveal>
      <section
        id="ssot-value-exchange"
        className={`relative ssot-band-alt scroll-mt-24 rounded-3xl p-4 sm:p-6 space-y-5 overflow-hidden transition-all duration-300 ${
          highlighted ? 'ring-2 ring-emerald-500/60 shadow-[0_0_28px_rgba(16,185,129,0.16)]' : ''
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400">
              Interactive Value Exchange Graph
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Capital, Data &amp; IP Circulation Across Spenta Engines
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Click any network node to inspect mechanics
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          <div className="lg:col-span-7 rounded-2xl bg-slate-950 border border-slate-800 p-3">
            <svg
              viewBox="0 0 520 250"
              className="w-full h-60"
              role="img"
              aria-label="Interactive Value Exchange Network Topology"
            >
              {VALUE_EXCHANGE_NODES.filter((n) => n.id !== 'core').map((n) => (
                <line
                  key={`edge-${n.id}`}
                  x1={260}
                  y1={125}
                  x2={n.x}
                  y2={n.y}
                  stroke={n.id === selectedNodeId ? n.color : '#334155'}
                  strokeWidth={n.id === selectedNodeId ? 2.5 : 1.5}
                  className="animate-data-flow"
                />
              ))}

              {VALUE_EXCHANGE_NODES.map((node) => {
                const isSelected = node.id === selectedNodeId;
                return (
                  <g
                    key={node.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedNodeId(node.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedNodeId(node.id);
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <rect
                      x={node.x - 68}
                      y={node.y - 24}
                      width={136}
                      height={48}
                      rx={10}
                      fill={isSelected ? '#0F172A' : '#090D16'}
                      stroke={node.color}
                      strokeWidth={isSelected ? 2.4 : 1.2}
                    />
                    <text
                      x={node.x}
                      y={node.y - 4}
                      textAnchor="middle"
                      fill={node.color}
                      fontSize="10"
                      fontWeight="700"
                      fontFamily="JetBrains Mono"
                    >
                      {node.label}
                    </text>
                    <text
                      x={node.x}
                      y={node.y + 12}
                      textAnchor="middle"
                      fill="#CBD5E1"
                      fontSize="9"
                      fontFamily="Plus Jakarta Sans"
                    >
                      {node.sublabel}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="lg:col-span-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeNode.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.22, ease: INSTITUTIONAL_EASE }}
                className="p-5 rounded-2xl bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <div className="text-xs font-mono font-bold text-cyan-700 dark:text-cyan-400">
                  {activeNode.label} · {activeNode.sublabel}
                </div>
                <div className="text-base font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                  {activeNode.metric}
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {activeNode.flowDetail}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>
    </SectionReveal>
  );
}

/* ============================================================================
   03. R&D ROADMAP & 04. EXECUTION SPRINTS WITH STAGGERED PROGRESS BARS
   ============================================================================ */
const EXECUTION_SPRINTS = [
  {
    id: 'sprint-ocr',
    name: 'PrimeOCR Air-Gapped v3 & OPA Gate',
    track: 'Vision AI',
    quarter: 'Q2 2026',
    pct: 96,
    note: 'Bank KYC deployed (<30s SLA)',
  },
  {
    id: 'sprint-xr',
    name: 'Samsung Cleanroom UE5 Spatial SDK',
    track: 'Spatial XR',
    quarter: 'Q3 2026',
    pct: 84,
    note: '-96% operator safety error verified',
  },
  {
    id: 'sprint-glasses',
    name: 'Meta Ray-Ban & Android XR Ingest Adapter',
    track: 'Spatial XR',
    quarter: 'Q4 2026',
    pct: 62,
    note: 'MQTT / WebRTC edge ingestion',
  },
  {
    id: 'sprint-enclave',
    name: 'Self-Service Sovereign AI Installer (K8s)',
    track: 'Vision AI',
    quarter: 'Q1 2027',
    pct: 48,
    note: 'Seed SAFE 40% R&D milestone',
  },
];

export function RoadmapAndSprintsSection() {
  const { highlightedSectionId } = useSsotBriefing();
  const [trackFilter, setTrackFilter] = useState<'ALL' | 'Spatial XR' | 'Vision AI'>('ALL');

  const visibleSprints = useMemo(() => {
    if (trackFilter === 'ALL') return EXECUTION_SPRINTS;
    return EXECUTION_SPRINTS.filter((s) => s.track === trackFilter);
  }, [trackFilter]);

  return (
    <>
      <SectionReveal>
        <section
          id="ssot-roadmap"
          className={`relative ssot-band-primary scroll-mt-24 rounded-3xl p-4 sm:p-6 space-y-5 overflow-hidden transition-all duration-300 ${
            highlightedSectionId === 'ssot-roadmap'
              ? 'ring-2 ring-purple-500/60 shadow-[0_0_28px_rgba(147,51,234,0.16)]'
              : ''
          }`}
        >
          <SsotChapterHeader
            chapter={BRIEFING_CHAPTERS[2]}
            subtitle="Disciplined productization milestones moving from proven on-premise deployments to scalable SDK & spatial hardware recurring revenue."
            rightAction={
              <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800 ssot-no-print">
                {(['ALL', 'Spatial XR', 'Vision AI'] as const).map((tr) => (
                  <button
                    key={tr}
                    type="button"
                    onClick={() => setTrackFilter(tr)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold cursor-pointer ${
                      trackFilter === tr
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {tr}
                  </button>
                ))}
              </div>
            }
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {RD_ROADMAP_PHASES.map((phase, idx) => (
              <SectionRevealItem key={phase.quarter} delay={idx * 0.06}>
                <div className="h-full p-5 rounded-2xl bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-purple-700 dark:text-purple-400">
                        {phase.quarter}
                      </span>
                      <span
                        className={
                          phase.status === 'Completed'
                            ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                            : 'text-slate-500 dark:text-slate-400'
                        }
                      >
                        {phase.status}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {phase.horizon}
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                        {phase.title}
                      </h3>
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                      {phase.deliverables.map((d) => (
                        <li key={d} className="leading-relaxed">
                          · {d}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-xs font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                    Target: {phase.targetKpi}
                  </div>
                </div>
              </SectionRevealItem>
            ))}
          </div>
        </section>
      </SectionReveal>

      <SectionDivider accent="cyan" label="04 · Execution Sprints" />

      <SectionReveal>
        <section
          id="ssot-milestones"
          className={`ssot-band-alt scroll-mt-24 rounded-3xl p-4 sm:p-6 space-y-4 transition-all duration-300 ${
            highlightedSectionId === 'ssot-milestones'
              ? 'ring-2 ring-cyan-500/60 shadow-[0_0_28px_rgba(8,145,178,0.16)]'
              : ''
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-xs font-mono font-semibold text-cyan-700 dark:text-cyan-400">
                Engineering Sprint Velocity
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Active Delivery Milestones ({trackFilter})
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              {visibleSprints.length} Active Tracks
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleSprints.map((sp, i) => (
              <div
                key={sp.id}
                className="p-4 rounded-xl bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-slate-900 dark:text-white">{sp.name}</span>
                  <span className="font-mono font-bold tabular-nums text-cyan-700 dark:text-cyan-400">
                    {sp.pct}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-900 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${sp.pct}%` }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.75, delay: i * 0.08, ease: INSTITUTIONAL_EASE }}
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  <span>{sp.track} · {sp.quarter}</span>
                  <span>{sp.note}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </SectionReveal>
    </>
  );
}

/* ============================================================================
   07. MARKET PULSE CANVAS + TAM TRAJECTORY + COMPETITIVE MOAT
   ============================================================================ */
function MarketPulseCanvas({ isDark }: { isDark: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let phase = 0;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const cx = w * 0.82;
      const cy = h * 0.45;
      phase += 0.015;

      for (let i = 0; i < 4; i += 1) {
        const radius = 40 + ((i * 42 + phase * 18) % 165);
        const alpha = Math.max(0.02, 0.14 * (1 - radius / 170));
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = isDark
          ? `rgba(34, 211, 238, ${alpha.toFixed(3)})`
          : `rgba(8, 145, 178, ${alpha.toFixed(3)})`;
        ctx.lineWidth = 1.25;
        ctx.stroke();
      }

      rafId = window.requestAnimationFrame(render);
    };

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      return;
    }

    rafId = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(rafId);
  }, [isDark]);

  return (
    <canvas
      ref={canvasRef}
      width={680}
      height={260}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 w-full h-full opacity-75"
    />
  );
}

const TAM_TRAJECTORY_DATA = [
  { year: '2026', tamBillion: 119.4 },
  { year: '2027', tamBillion: 168.5 },
  { year: '2028', tamBillion: 237.8 },
  { year: '2029', tamBillion: 335.5 },
  { year: '2030', tamBillion: 473.4 },
  { year: '2031', tamBillion: 667.3 },
];

export function CompetitiveMoatSection() {
  const { theme } = useTheme();
  const { highlightedSectionId } = useSsotBriefing();
  const isDark = theme === 'dark';

  return (
    <SectionReveal>
      <section
        id="ssot-moat"
        className={`relative ssot-band-primary scroll-mt-24 rounded-3xl p-4 sm:p-6 space-y-6 overflow-hidden transition-all duration-300 ${
          highlightedSectionId === 'ssot-moat'
            ? 'ring-2 ring-cyan-500/60 shadow-[0_0_28px_rgba(8,145,178,0.16)]'
            : ''
        }`}
      >
        <MarketPulseCanvas isDark={isDark} />

        <div className="relative z-10 space-y-5">
          <SsotChapterHeader
            chapter={BRIEFING_CHAPTERS[6]}
            subtitle="Big Tech hardware mass production creates the sensory ingest wave; Spenta owns the air-gapped enterprise software & dual-shore cost moat."
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {MACRO_HARDWARE_CATALYSTS.map((cat) => (
                <div
                  key={cat.id}
                  className="p-4 rounded-xl bg-white/95 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 space-y-2"
                >
                  <div className="text-xs font-mono text-cyan-700 dark:text-cyan-400 font-semibold flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5" />
                    <span>{cat.vendor}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {cat.headline}
                  </h3>
                  <div className="text-xs font-mono tabular-nums text-emerald-700 dark:text-emerald-400 font-semibold">
                    {cat.metric}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {cat.spentaAdvantage}
                  </p>
                </div>
              ))}
            </div>

            <div className="lg:col-span-5 p-5 rounded-2xl bg-white/95 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-3">
              <div>
                <div className="text-xs font-mono font-semibold text-cyan-700 dark:text-cyan-400">
                  Physical AI &amp; Spatial XR Addressable Market
                </div>
                <div className="flex items-baseline justify-between mt-0.5">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    5-Year TAM Growth ($667.3B)
                  </h3>
                  <span className="text-xs font-mono font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                    41.1% CAGR
                  </span>
                </div>
              </div>

              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={TAM_TRAJECTORY_DATA}
                    margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="ssotTamFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={isDark ? '#22D3EE' : '#0891B2'} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={isDark ? '#22D3EE' : '#0891B2'} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? 'rgba(51,65,85,0.45)' : 'rgba(148,163,184,0.35)'}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `$${v}B`}
                    />
                    <Tooltip
                      formatter={(val) => [`$${Number(val ?? 0).toFixed(1)}B`, 'Global TAM']}
                      contentStyle={{
                        backgroundColor: isDark ? '#0B101B' : '#FFFFFF',
                        borderColor: isDark ? '#334155' : '#CBD5E1',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="tamBillion"
                      stroke={isDark ? '#22D3EE' : '#0891B2'}
                      strokeWidth={2.4}
                      fill="url(#ssotTamFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 4-Way Competitive Matrix with Highlighted Spenta Column */}
          <div className="rounded-2xl bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Capability Dimension</th>
                    <th className="px-4 py-3 font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/35">
                      Spenta Sovereign Fusion
                    </th>
                    <th className="px-4 py-3 font-semibold">Western Agencies</th>
                    <th className="px-4 py-3 font-semibold">Commodity Outsourcers</th>
                    <th className="px-4 py-3 font-semibold">Rigid SaaS Vendors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {COMPETITIVE_MOAT_ROWS.map((row) => (
                    <tr key={row.attribute}>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                        {row.attribute}
                      </td>
                      <td className="px-4 py-3 font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20">
                        {row.spenta}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {row.westernAgencies}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {row.commodityOutsourcers}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {row.rigidSaas}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {STARTUP_BENCHMARKS.map((bm) => (
              <div
                key={bm.name}
                className="p-3.5 rounded-xl bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 space-y-1"
              >
                <div className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                  {bm.name}
                </div>
                <div className="text-[11px] font-medium text-cyan-700 dark:text-cyan-400">
                  {bm.category} · {bm.valuationOrScale}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  {bm.spentaParallel}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </SectionReveal>
  );
}

/* ============================================================================
   06. DUAL-SHORE DELIVERY GLOBE + LIVE HUB SYNC STRIP
   ============================================================================ */
export function DualShoreSection() {
  const { highlightedSectionId } = useSsotBriefing();
  return (
    <SectionReveal>
      <section
        id="ssot-dual-shore"
        className={`ssot-band-alt scroll-mt-24 rounded-3xl p-4 sm:p-6 space-y-5 transition-all duration-300 ${
          highlightedSectionId === 'ssot-dual-shore'
            ? 'ring-2 ring-cyan-500/60 shadow-[0_0_28px_rgba(8,145,178,0.16)]'
            : ''
        }`}
      >
        <SsotChapterHeader
          chapter={BRIEFING_CHAPTERS[5]}
          subtitle="Global onshore client sponsorship in San Jose and Sydney/Melbourne fused with our 20-FTE Dhaka Sovereign AI & 3D Studio Hub."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {DUAL_SHORE_HUBS.map((hub) => (
            <div
              key={hub.id}
              className="p-3.5 rounded-xl bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 space-y-1"
            >
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-cyan-700 dark:text-cyan-400">{hub.name}</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold tabular-nums">
                  {hub.latencyToDhakaMs === 0 ? 'Core Hub' : `${hub.latencyToDhakaMs}ms RTT`}
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-900 dark:text-white">{hub.role}</div>
              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                {hub.headcountLabel}
              </div>
            </div>
          ))}
        </div>

        <Suspense
          fallback={
            <div className="h-[420px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 animate-pulse" />
          }
        >
          <DualShoreGlobe />
        </Suspense>
      </section>
    </SectionReveal>
  );
}

/* ============================================================================
   04. VERIFIED ENTERPRISE CASE STUDIES WITH ENGINE FILTER TABS
   ============================================================================ */
export function CaseStudiesSection() {
  const { openArPreview, loadCaseStudyStack } = useStack();
  const { highlightedSectionId } = useSsotBriefing();
  const [engineFilter, setEngineFilter] = useState<'All' | 'Operations' | 'Experience' | 'Dual'>(
    'All',
  );

  const visibleStudies = useMemo(() => {
    if (engineFilter === 'All') return SSOT_CASE_STUDIES;
    return SSOT_CASE_STUDIES.filter((cs) => cs.engine.toLowerCase().includes(engineFilter.toLowerCase()));
  }, [engineFilter]);

  return (
    <SectionReveal>
      <section
        id="ssot-case-studies"
        className={`ssot-band-primary scroll-mt-24 rounded-3xl p-4 sm:p-6 space-y-5 transition-all duration-300 ${
          highlightedSectionId === 'ssot-case-studies'
            ? 'ring-2 ring-indigo-500/60 shadow-[0_0_28px_rgba(79,70,229,0.16)]'
            : ''
        }`}
      >
        <SsotChapterHeader
          chapter={BRIEFING_CHAPTERS[3]}
          subtitle="Production client deployments across banking, biopharma, retail, healthcare, and education—each inspectable in 3D or loadable into the Stack Composer."
          rightAction={
            <div className="inline-flex flex-wrap rounded-xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800 ssot-no-print">
              {(['All', 'Operations', 'Experience', 'Dual'] as const).map((eng) => (
                <button
                  key={eng}
                  type="button"
                  onClick={() => setEngineFilter(eng)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold cursor-pointer ${
                    engineFilter === eng
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {eng}
                </button>
              ))}
            </div>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {visibleStudies.map((cs, i) => (
            <SectionRevealItem key={cs.id} delay={i * 0.05}>
              <article className="h-full p-5 rounded-2xl bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-4">
                <div className="space-y-3">
                  <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-indigo-700 dark:text-indigo-400">
                      {cs.client}
                    </span>
                    <span aria-hidden="true"> · </span>
                    <span>{cs.industry}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{cs.engine}</span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                    {cs.headline}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {cs.solution}
                  </p>

                  <div className="grid grid-cols-3 gap-2.5 pt-1">
                    {cs.metrics.map((m) => (
                      <div
                        key={m.label}
                        className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                      >
                        <div className="text-base font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                          {m.value}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-900 dark:text-white">
                          {m.label}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                          {m.detail}
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs italic text-slate-500 dark:text-slate-400 pt-1">
                    “{cs.quote}”
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    {cs.techStack.join(' · ')}
                  </span>
                  <div className="flex items-center gap-2 ssot-no-print">
                    <button
                      type="button"
                      {...getPanelPreloadHandlers('spatial-ar')}
                      onClick={() =>
                        openArPreview({
                          sectionId: cs.id,
                          title: `${cs.client} — Spatial Twin Preview`,
                          subtitle: cs.headline,
                          preset: cs.arPreset,
                        })
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 hover:border-cyan-500 cursor-pointer whitespace-nowrap"
                    >
                      <Box className="w-3.5 h-3.5" />
                      <span>3D View</span>
                    </button>
                    <button
                      type="button"
                      {...getPanelPreloadHandlers('stack-composer')}
                      onClick={() => loadCaseStudyStack(cs.stackAppIds, cs.client)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Load Stack</span>
                    </button>
                  </div>
                </div>
              </article>
            </SectionRevealItem>
          ))}
        </div>
      </section>
    </SectionReveal>
  );
}

/* ============================================================================
   08. EXECUTIVE LEADERSHIP & INTERACTIVE PASSIVE IP STREAMS
   ============================================================================ */
export function TeamAndPassiveIpSection() {
  const { currency, investorCalculatorState } = useStack();
  const { highlightedSectionId } = useSsotBriefing();
  const [selectedStreamId, setSelectedStreamId] = useState<string>(PASSIVE_IP_STREAMS[0].id);
  const fxRate = investorCalculatorState.fxRate;
  const activeStream =
    PASSIVE_IP_STREAMS.find((s) => s.id === selectedStreamId) ?? PASSIVE_IP_STREAMS[0];

  return (
    <SectionReveal>
      <section
        id="ssot-team-ip"
        className={`ssot-band-alt scroll-mt-24 rounded-3xl p-4 sm:p-6 space-y-6 transition-all duration-300 ${
          highlightedSectionId === 'ssot-team-ip'
            ? 'ring-2 ring-purple-500/60 shadow-[0_0_28px_rgba(147,51,234,0.16)]'
            : ''
        }`}
      >
        <SsotChapterHeader
          chapter={BRIEFING_CHAPTERS[7]}
          subtitle="Dual-shore leadership spanning Silicon Valley, Sydney, and Dhaka paired with 5 high-margin non-client passive IP & asset royalty streams."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {EXECUTIVE_TEAM.map((member) => (
            <div
              key={member.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-600 text-white font-mono text-sm font-bold flex items-center justify-center shrink-0">
                  {member.initials}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {member.name}
                  </h3>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {member.location}
                  </div>
                </div>
              </div>
              <div className="text-xs font-semibold text-cyan-700 dark:text-cyan-400">
                {member.role}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {member.bio}
              </p>
              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800">
                {member.focusAreas.join(' · ')}
              </div>
            </div>
          ))}
        </div>

        {/* Interactive Tabbed Passive IP Stream Inspector */}
        <div className="rounded-2xl bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Non-Client Passive IP &amp; Creator Commerce Streams</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Inspect payout splits, gross/net margins, and precedent benchmarks for each passive flywheel channel.
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-emerald-700 dark:text-emerald-400 font-semibold">
              84%–95% Gross Margin Band
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {PASSIVE_IP_STREAMS.map((stream) => (
              <button
                key={stream.id}
                type="button"
                onClick={() => setSelectedStreamId(stream.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
                  activeStream.id === stream.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                }`}
              >
                {stream.title}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeStream.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: INSTITUTIONAL_EASE }}
              className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-4 items-center"
            >
              <div className="md:col-span-7 space-y-1.5">
                <div className="text-xs font-mono text-purple-700 dark:text-purple-400 font-semibold">
                  {activeStream.platform}
                </div>
                <div className="text-base font-bold text-slate-900 dark:text-white">
                  {activeStream.title}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {activeStream.mechanics}
                </p>
              </div>
              <div className="md:col-span-5 grid grid-cols-2 gap-2.5 text-xs font-mono tabular-nums">
                <div className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Monthly Range</div>
                  <div className="font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                    {formatSsotCurrency(activeStream.minMonthlyUsd, currency, fxRate, {
                      compact: true,
                    })}{' '}
                    –{' '}
                    {formatSsotCurrency(activeStream.maxMonthlyUsd, currency, fxRate, {
                      compact: true,
                    })}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Gross Margin</div>
                  <div className="font-bold text-cyan-700 dark:text-cyan-400 mt-0.5">
                    {activeStream.grossMargin}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </SectionReveal>
  );
}

/* ============================================================================
   09. SEED ROUND SAFE TERMS & CAPITAL ALLOCATION
   ============================================================================ */
export function SafeTermsSection() {
  const { theme } = useTheme();
  const { currency, investorCalculatorState, openArPreview, setDataRoomOpen, openContactModal, navigateToItem } =
    useStack();
  const { highlightedSectionId, setPitchDeckModalOpen } = useSsotBriefing();
  const isDark = theme === 'dark';
  const fxRate = investorCalculatorState.fxRate;

  const highlightTiles = [
    {
      label: 'Target Seed Raise',
      value: formatSsotCurrency(UNIFIED_SAFE_TERMS.raiseUsd, currency, fxRate),
      sub: 'YC Post-Money SAFE',
    },
    {
      label: 'Valuation Cap',
      value: formatSsotCurrency(UNIFIED_SAFE_TERMS.postMoneyCapUsd, currency, fxRate, {
        compact: true,
      }),
      sub: `${UNIFIED_SAFE_TERMS.impliedOwnershipPct}% Initial Equity`,
    },
    {
      label: 'SAFE Discount',
      value: `${UNIFIED_SAFE_TERMS.discountPct}%`,
      sub: 'Series A Protection',
    },
    {
      label: 'Disciplined Runway',
      value: `${UNIFIED_SAFE_TERMS.targetRunwayMonths} Months`,
      sub: 'Backed by Dhaka $12.98/hr R&D',
    },
  ];

  return (
    <SectionReveal>
      <section
        id="ssot-safe-terms"
        className={`ssot-band-primary scroll-mt-24 rounded-3xl p-4 sm:p-6 space-y-5 transition-all duration-300 ${
          highlightedSectionId === 'ssot-safe-terms'
            ? 'ring-2 ring-emerald-500/60 shadow-[0_0_28px_rgba(16,185,129,0.16)]'
            : ''
        }`}
      >
        <SsotChapterHeader
          chapter={BRIEFING_CHAPTERS[8]}
          subtitle="Standard YC Post-Money SAFE structured for 18 months of disciplined runway, SDK productization, and APAC/US enterprise expansion."
          rightAction={
            <button
              type="button"
              {...getPanelPreloadHandlers('spatial-ar')}
              onClick={() =>
                openArPreview({
                  sectionId: 'ssot-safe-terms',
                  title: 'Seed SAFE 5-Year Value Trajectory (3D)',
                  subtitle: '$500K Raise @ $4.5M Post-Money Cap · 20% Discount',
                  preset: 'financial-waterfall',
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer whitespace-nowrap ssot-no-print"
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D Trajectory</span>
            </button>
          }
        />

        {/* 4 Sequential Highlight Tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {highlightTiles.map((tile, idx) => (
            <motion.div
              key={tile.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.4, delay: 0.05 * (idx + 1), ease: INSTITUTIONAL_EASE }}
              className="p-4 rounded-xl bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800"
            >
              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                {tile.label}
              </div>
              <div className="text-lg font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400 mt-0.5">
                {tile.value}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">{tile.sub}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <div className="lg:col-span-5 p-5 rounded-2xl bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                Capital Deployment Breakdown
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                {formatSsotCurrency(UNIFIED_SAFE_TERMS.raiseUsd, currency, fxRate)} Seed Allocation
              </h3>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={UNIFIED_SAFE_TERMS.allocations}
                    dataKey="amountUsd"
                    nameKey="title"
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={3}
                  >
                    {UNIFIED_SAFE_TERMS.allocations.map((entry) => (
                      <Cell key={entry.id} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => formatSsotCurrency(Number(val ?? 0), currency, fxRate)}
                    contentStyle={{
                      backgroundColor: isDark ? '#0B101B' : '#FFFFFF',
                      borderColor: isDark ? '#334155' : '#CBD5E1',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col justify-between gap-4">
            <div className="space-y-3">
              {UNIFIED_SAFE_TERMS.allocations.map((tranche) => (
                <div
                  key={tranche.id}
                  className="p-4 rounded-xl bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 space-y-1.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {tranche.title}
                    </h4>
                    <span className="text-xs font-mono tabular-nums font-bold text-cyan-700 dark:text-cyan-400">
                      {tranche.percent}% · {formatSsotCurrency(tranche.amountUsd, currency, fxRate)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {tranche.description}
                  </p>
                  <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                    Milestone: {tranche.milestone}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 ssot-no-print">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  {...getPanelPreloadHandlers('data-room')}
                  onClick={() => setDataRoomOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer whitespace-nowrap"
                >
                  <FolderLock className="w-3.5 h-3.5" />
                  <span>Inspect Data Room</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPitchDeckModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer whitespace-nowrap"
                >
                  <Presentation className="w-3.5 h-3.5" />
                  <span>Open Pitch Deck Modal</span>
                </button>
                <button
                  type="button"
                  {...getTabPreloadHandlers('Pitch Deck')}
                  onClick={() => navigateToItem('Pitch Deck')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer whitespace-nowrap"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Full Deck View</span>
                </button>
              </div>

              <button
                type="button"
                {...getPanelPreloadHandlers('founder-contact')}
                onClick={() => openContactModal('Seed SAFE Term Sheet ($500K @ $4.5M Cap)')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Request Term Sheet</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </SectionReveal>
  );
}
