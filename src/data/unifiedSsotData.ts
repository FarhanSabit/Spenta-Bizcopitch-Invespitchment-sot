import type { NavTab } from './spentaManifest';

export type SsotCurrency = 'USD' | 'BDT';
export type InvestorPersonaTrack = 'financial' | 'technical' | 'strategic';
export type ArModelPreset =
  | 'xr-glasses'
  | 'cleanroom-twin'
  | 'server-enclave'
  | 'financial-waterfall';

export interface ArPreviewTarget {
  sectionId: string;
  title: string;
  subtitle: string;
  preset: ArModelPreset;
}

export const DEFAULT_SSOT_FX_RATE = 122.61;

export function formatSsotCurrency(
  amountUsd: number,
  currency: SsotCurrency,
  fxRate: number = DEFAULT_SSOT_FX_RATE,
  options?: { compact?: boolean },
): string {
  const safeRate = Number.isFinite(fxRate) && fxRate > 0 ? fxRate : DEFAULT_SSOT_FX_RATE;
  const compact = options?.compact ?? false;
  if (currency === 'BDT') {
    const bdt = amountUsd * safeRate;
    if (compact) {
      if (Math.abs(bdt) >= 1_000_000_000) return `৳${(bdt / 1_000_000_000).toFixed(2)}B`;
      if (Math.abs(bdt) >= 1_000_000) return `৳${(bdt / 1_000_000).toFixed(1)}M`;
      if (Math.abs(bdt) >= 1_000) return `৳${Math.round(bdt / 1_000)}K`;
    }
    return `৳${Math.round(bdt).toLocaleString('en-US')}`;
  }

  if (compact) {
    if (Math.abs(amountUsd) >= 1_000_000_000) return `$${(amountUsd / 1_000_000_000).toFixed(2)}B`;
    if (Math.abs(amountUsd) >= 1_000_000) return `$${(amountUsd / 1_000_000).toFixed(2)}M`;
    if (Math.abs(amountUsd) >= 1_000) {
      const k = amountUsd / 1_000;
      return `$${Number.isInteger(k) ? k : k.toFixed(1)}K`;
    }
  }
  return `$${Math.round(amountUsd).toLocaleString('en-US')}`;
}

export interface SafeFundAllocation {
  id: string;
  percent: number;
  amountUsd: number;
  color: string;
  title: string;
  description: string;
  milestone: string;
}

export const UNIFIED_SAFE_TERMS = {
  instrument: 'YC Post-Money SAFE',
  raiseUsd: 500_000,
  postMoneyCapUsd: 4_500_000,
  discountPct: 20,
  impliedOwnershipPct: 11.11,
  targetRunwayMonths: 18,
  targetMrrUsd: 60_000,
  tamUsdBillions: 667.3,
  tamCagrPct: 41.1,
  dhakaHourlyLoadedUsd: 12.98,
  allocations: [
    {
      id: 'sdk-productization',
      percent: 40,
      amountUsd: 200_000,
      color: '#1F3863',
      title: 'Productize Fusion IP SDKs & SaaS Packaging',
      description:
        'Standardize PrimeOCR IDP and the procedural XR assessment engine into self-serve, multi-tenant enterprise SDKs and on-premise deployable containers.',
      milestone: 'Launch PrimeOCR self-serve developer portal with turnkey REST/Python SDKs.',
    },
    {
      id: 'global-enterprise-sales',
      percent: 35,
      amountUsd: 175_000,
      color: '#1C6E46',
      title: 'Global Enterprise Sales & Business Development',
      description:
        'Place dedicated onshore enterprise account directors in Sydney/Melbourne (Australia) and San Jose (USA) for regulated banking, mining, and healthcare procurement.',
      milestone: 'Close 8 qualified enterprise pilots across APAC and North America.',
    },
    {
      id: 'gpu-nodes-runway',
      percent: 25,
      amountUsd: 125_000,
      color: '#B45309',
      title: 'Dedicated GPU Nodes & 18-Month Operating Runway',
      description:
        'Procure on-premise high-throughput GPU inference clusters (NVIDIA L40S/H100) to guarantee bank-grade SLA compliance without public cloud egress.',
      milestone: 'Secure 18-month working capital runway and achieve $60,000 USD platform MRR.',
    },
  ] satisfies SafeFundAllocation[],
};

export interface BriefingChapterSpec {
  id: string;
  num: string;
  shortTitle: string;
  title: string;
  recommendedFor: InvestorPersonaTrack[];
}

export const BRIEFING_CHAPTERS: BriefingChapterSpec[] = [
  {
    id: 'ssot-dual-engine',
    num: '01',
    shortTitle: 'Dual-Engine',
    title: '01. Dual-Engine Commercialization & Value Exchange',
    recommendedFor: ['strategic', 'financial'],
  },
  {
    id: 'ssot-fusion-stack',
    num: '02',
    shortTitle: '6-Layer Fusion',
    title: '02. 6-Layer Sovereign Fusion Architecture & API Contracts',
    recommendedFor: ['technical'],
  },
  {
    id: 'ssot-roadmap',
    num: '03',
    shortTitle: 'R&D Roadmap',
    title: '03. R&D Technology Roadmap & Execution Sprints',
    recommendedFor: ['technical', 'strategic'],
  },
  {
    id: 'ssot-case-studies',
    num: '04',
    shortTitle: 'Case Studies',
    title: '04. Verified Enterprise Deployments',
    recommendedFor: ['strategic', 'financial', 'technical'],
  },
  {
    id: 'ssot-unit-economics',
    num: '05',
    shortTitle: '9-Tier Economics',
    title: '05. Recalibrated 9-Tier Unit Economics',
    recommendedFor: ['financial'],
  },
  {
    id: 'ssot-dual-shore',
    num: '06',
    shortTitle: 'Dual-Shore Globe',
    title: '06. Dual-Shore 3D Delivery Architecture',
    recommendedFor: ['strategic', 'financial'],
  },
  {
    id: 'ssot-moat',
    num: '07',
    shortTitle: 'Macro & Moat',
    title: '07. Macro Hardware Catalyst & Competitive Moat',
    recommendedFor: ['strategic', 'technical'],
  },
  {
    id: 'ssot-team-ip',
    num: '08',
    shortTitle: 'Team & Passive IP',
    title: '08. Executive Leadership & Passive IP Streams',
    recommendedFor: ['financial', 'strategic'],
  },
  {
    id: 'ssot-safe-terms',
    num: '09',
    shortTitle: 'Seed SAFE Terms',
    title: '09. Seed Round SAFE Terms & Capital Allocation',
    recommendedFor: ['financial'],
  },
];

export interface InvestorPersonaSpec {
  id: InvestorPersonaTrack;
  label: string;
  focusSummary: string;
  primaryCtaLabel: string;
  primaryChapterId: string;
}

export const INVESTOR_PERSONA_TRACKS: InvestorPersonaSpec[] = [
  {
    id: 'financial',
    label: 'Financial Track',
    focusSummary: 'Prioritizes 9-Tier Unit Economics, 5-Year P&L ROI, Passive IP margins, and SAFE terms.',
    primaryCtaLabel: 'Jump to 9-Tier Economics',
    primaryChapterId: 'ssot-unit-economics',
  },
  {
    id: 'technical',
    label: 'Technical Track',
    focusSummary: 'Prioritizes L1–L6 Fusion API contracts, on-prem GPU enclaves, R&D roadmap, and compliance.',
    primaryCtaLabel: 'Jump to 6-Layer Fusion',
    primaryChapterId: 'ssot-fusion-stack',
  },
  {
    id: 'strategic',
    label: 'Strategic Track',
    focusSummary: 'Prioritizes Dual-Engine moat, Big Tech spatial hardware wave, verified deployments, and global delivery.',
    primaryCtaLabel: 'Jump to Case Studies',
    primaryChapterId: 'ssot-case-studies',
  },
];

export interface UnitEconomicsTier {
  id: string;
  category: 'A' | 'B' | 'C';
  categoryLabel: string;
  code: string;
  name: string;
  minUsd: number;
  maxUsd: number;
  baselineUsd: number;
  deliveryTimeline: string;
  scopeSummary: string;
  teamAllocation: string[];
  cogsPercent: number;
  grossMarginPercent: number;
  cacPercent: number;
  overheadPercent: number;
  netMarginPercent: number;
  costBreakdownUsd: {
    engineeringLabor: number;
    spatialDesignLabor: number;
    cloudCompute: number;
    salesCac: number;
    overheadReserve: number;
  };
  recommendedAppIds: string[];
}

export const NINE_TIER_UNIT_ECONOMICS: UnitEconomicsTier[] = [
  {
    id: 'tier-a1',
    category: 'A',
    categoryLabel: 'Micro-Project Activation',
    code: 'Model A1',
    name: 'Entry Micro-Project Pilot',
    minUsd: 500,
    maxUsd: 1500,
    baselineUsd: 1200,
    deliveryTimeline: '5–7 Days',
    scopeSummary: 'Single WebAR product try-on or rapid document OCR proof-of-concept.',
    teamAllocation: ['1 Full-Stack XR Eng', '1 Technical Artist'],
    cogsPercent: 58,
    grossMarginPercent: 42.0,
    cacPercent: 10,
    overheadPercent: 12,
    netMarginPercent: 20.0,
    costBreakdownUsd: {
      engineeringLabor: 420,
      spatialDesignLabor: 220,
      cloudCompute: 56,
      salesCac: 120,
      overheadReserve: 144,
    },
    recommendedAppIds: ['branding_geo'],
  },
  {
    id: 'tier-a2',
    category: 'A',
    categoryLabel: 'Micro-Project Activation',
    code: 'Model A2',
    name: 'Standard Micro-Project Baseline',
    minUsd: 1500,
    maxUsd: 3000,
    baselineUsd: 2200,
    deliveryTimeline: '2 Weeks',
    scopeSummary: 'Multi-SKU WebAR catalog module or WhatsApp voice intake assistant.',
    teamAllocation: ['1 AI/XR Engineer', '1 3D Asset Specialist', '0.25 PM'],
    cogsPercent: 60,
    grossMarginPercent: 40.0,
    cacPercent: 10,
    overheadPercent: 11.5,
    netMarginPercent: 18.5,
    costBreakdownUsd: {
      engineeringLabor: 780,
      spatialDesignLabor: 440,
      cloudCompute: 100,
      salesCac: 220,
      overheadReserve: 253,
    },
    recommendedAppIds: ['branding_geo', 'voice_ai'],
  },
  {
    id: 'tier-a3',
    category: 'A',
    categoryLabel: 'Micro-Project Activation',
    code: 'Model A3',
    name: 'Advanced Micro-Project Cap',
    minUsd: 3500,
    maxUsd: 5000,
    baselineUsd: 4500,
    deliveryTimeline: '3 Weeks',
    scopeSummary: 'Interactive showroom activation + branded 3D showcase + lead capture.',
    teamAllocation: ['2 Engineers', '1 3D Generalist', '0.5 QA'],
    cogsPercent: 59,
    grossMarginPercent: 41.0,
    cacPercent: 10,
    overheadPercent: 11.5,
    netMarginPercent: 19.5,
    costBreakdownUsd: {
      engineeringLabor: 1550,
      spatialDesignLabor: 900,
      cloudCompute: 205,
      salesCac: 450,
      overheadReserve: 517,
    },
    recommendedAppIds: ['branding_geo', 'spatial_xr'],
  },
  {
    id: 'tier-b1',
    category: 'B',
    categoryLabel: 'Mid-Market Commercial',
    code: 'Model B1',
    name: 'Mid-Market Entry Solution',
    minUsd: 5000,
    maxUsd: 12000,
    baselineUsd: 10000,
    deliveryTimeline: '4–6 Weeks',
    scopeSummary: 'Single-site PrimeOCR KYC pipeline or interactive real estate digital twin.',
    teamAllocation: ['2 AI/Backend Eng', '1 Spatial Artist', '0.5 Architect'],
    cogsPercent: 62,
    grossMarginPercent: 38.0,
    cacPercent: 9.5,
    overheadPercent: 10.5,
    netMarginPercent: 18.0,
    costBreakdownUsd: {
      engineeringLabor: 3900,
      spatialDesignLabor: 1700,
      cloudCompute: 600,
      salesCac: 950,
      overheadReserve: 1050,
    },
    recommendedAppIds: ['icr_ops', 'genai_bi'],
  },
  {
    id: 'tier-b2',
    category: 'B',
    categoryLabel: 'Mid-Market Commercial',
    code: 'Model B2',
    name: 'Mid-Market Standard Commercial',
    minUsd: 12000,
    maxUsd: 20000,
    baselineUsd: 16000,
    deliveryTimeline: '6–8 Weeks',
    scopeSummary: 'Departmental VR training module or hospital indoor wayfinding + triage kiosk.',
    teamAllocation: ['3 Engineers', '2 3D Artists', '0.5 Delivery Lead'],
    cogsPercent: 60,
    grossMarginPercent: 40.0,
    cacPercent: 10,
    overheadPercent: 11,
    netMarginPercent: 19.0,
    costBreakdownUsd: {
      engineeringLabor: 5800,
      spatialDesignLabor: 2900,
      cloudCompute: 900,
      salesCac: 1600,
      overheadReserve: 1760,
    },
    recommendedAppIds: ['spatial_xr', 'healthcare_erp'],
  },
  {
    id: 'tier-b3',
    category: 'B',
    categoryLabel: 'Mid-Market Commercial',
    code: 'Model B3',
    name: 'Mid-Market Advanced Solution',
    minUsd: 20000,
    maxUsd: 30000,
    baselineUsd: 25000,
    deliveryTimeline: '8–10 Weeks',
    scopeSummary: 'Multi-branch Sovereign AI assistant suite + WhatsApp Voice ERP integration.',
    teamAllocation: ['3 Senior Eng', '2 Spatial/UI Eng', '1 Solutions Architect'],
    cogsPercent: 58,
    grossMarginPercent: 42.0,
    cacPercent: 10,
    overheadPercent: 11,
    netMarginPercent: 21.0,
    costBreakdownUsd: {
      engineeringLabor: 9200,
      spatialDesignLabor: 3900,
      cloudCompute: 1400,
      salesCac: 2500,
      overheadReserve: 2750,
    },
    recommendedAppIds: ['icr_ops', 'voice_ai', 'genai_bi'],
  },
  {
    id: 'tier-c1',
    category: 'C',
    categoryLabel: 'Enterprise Sovereign Platform',
    code: 'Model C1',
    name: 'Enterprise Tier 1 Platform',
    minUsd: 40000,
    maxUsd: 60000,
    baselineUsd: 50000,
    deliveryTimeline: '12–16 Weeks',
    scopeSummary: 'Private VPC Sovereign OS deployment with PrimeOCR + 3 vertical AI agents.',
    teamAllocation: ['4 Core AI Eng', '2 3D/XR Eng', '1 Security Architect', '1 PM'],
    cogsPercent: 57,
    grossMarginPercent: 43.0,
    cacPercent: 9.5,
    overheadPercent: 11,
    netMarginPercent: 22.5,
    costBreakdownUsd: {
      engineeringLabor: 18500,
      spatialDesignLabor: 7000,
      cloudCompute: 3000,
      salesCac: 4750,
      overheadReserve: 5500,
    },
    recommendedAppIds: ['icr_ops', 'genai_bi', 'mis_erp', 'cyber_sla'],
  },
  {
    id: 'tier-c2',
    category: 'C',
    categoryLabel: 'Enterprise Sovereign Platform',
    code: 'Model C2',
    name: 'Enterprise Tier 2 Deployment',
    minUsd: 60000,
    maxUsd: 80000,
    baselineUsd: 70000,
    deliveryTimeline: '16–20 Weeks',
    scopeSummary: 'Air-gapped on-prem GPU enclave + cleanroom VR certification twin + ERP bridge.',
    teamAllocation: ['5 Core Eng', '3 Spatial Eng', '1 Principal Architect', '1 QA Lead'],
    cogsPercent: 55,
    grossMarginPercent: 45.0,
    cacPercent: 9.5,
    overheadPercent: 11,
    netMarginPercent: 24.5,
    costBreakdownUsd: {
      engineeringLabor: 25000,
      spatialDesignLabor: 9500,
      cloudCompute: 4000,
      salesCac: 6650,
      overheadReserve: 7700,
    },
    recommendedAppIds: ['icr_ops', 'spatial_xr', 'cyber_sla', 'mis_erp'],
  },
  {
    id: 'tier-c3',
    category: 'C',
    categoryLabel: 'Enterprise Sovereign Platform',
    code: 'Model C3',
    name: 'Enterprise Tier 3 Flagship',
    minUsd: 80000,
    maxUsd: 100000,
    baselineUsd: 90000,
    deliveryTimeline: '20–24 Weeks',
    scopeSummary: 'Full 6-layer Sovereign Fusion OS across multi-site hospital/banking consortium.',
    teamAllocation: ['6 Principal/Core Eng', '3 XR Directors', '1 CISO Advisor', '1 Dedicated PM'],
    cogsPercent: 55,
    grossMarginPercent: 45.0,
    cacPercent: 9.0,
    overheadPercent: 11,
    netMarginPercent: 25.0,
    costBreakdownUsd: {
      engineeringLabor: 32500,
      spatialDesignLabor: 12000,
      cloudCompute: 5000,
      salesCac: 8100,
      overheadReserve: 9900,
    },
    recommendedAppIds: ['icr_ops', 'genai_bi', 'healthcare_erp', 'spatial_xr', 'voice_ai', 'cyber_sla'],
  },
];

export interface FusionLayerEndpointSpec {
  method: 'GET' | 'POST' | 'WS' | 'gRPC' | 'MQTT';
  path: string;
  description: string;
  samplePayload: string;
}

export interface FusionLayerTechSpec {
  layerId: 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6';
  level: number;
  title: string;
  subtitle: string;
  techStack: string[];
  touchpoints: string;
  securityGovernance: string;
  enterpriseImpact: string;
  specs: {
    latency: string;
    throughput: string;
    protocol: string;
    uptimeSla: string;
    encryption: string;
  };
  endpoints: FusionLayerEndpointSpec[];
  codeSample: {
    language: string;
    title: string;
    code: string;
  };
  complianceMapping: string[];
}

export const FUSION_LAYER_TECH_SPECS: Record<'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6', FusionLayerTechSpec> = {
  L6: {
    layerId: 'L6',
    level: 6,
    title: 'Application & Enterprise Delivery Contracts',
    subtitle: 'Zero-install WebXR viewports, mobile field units, and WhatsApp Voice ERP gateways',
    techStack: ['WebXR HTML5/Wasm', 'Flutter', 'React Native', 'WhatsApp Business API', 'REST / GraphQL'],
    touchpoints: 'In-browser 3D viewports, executive analytics consoles, mobile field apps, voice ERP bots.',
    securityGovernance: 'RBAC token claims, TLS 1.3 transport, zero sensitive data caching on public proxies.',
    enterpriseImpact: 'Embeds spatial computing and AI directly inside channels teams already use daily.',
    specs: {
      latency: '< 16ms (60 FPS WebXR)',
      throughput: '45,000 active sessions/node',
      protocol: 'HTTPS / WebSockets / WebXR Wasm',
      uptimeSla: '99.99%',
      encryption: 'TLS 1.3 / E2E RBAC',
    },
    endpoints: [
      {
        method: 'GET',
        path: '/api/v2/viewport/session/init',
        description: 'Initializes a WebXR spatial canvas session and handshakes ARCore/ARKit/WebGL2 capabilities.',
        samplePayload: '{ "sessionId": "xr_99f2b8a1", "viewportType": "WebXR_Wasm", "displayRefreshRate": 90 }',
      },
      {
        method: 'POST',
        path: '/api/v2/conversational/voice-erp',
        description: 'Parses encrypted WhatsApp Voice ERP audio notes into structured ERP ledger actions.',
        samplePayload: '{ "messageId": "wa_44810", "detectedIntent": "INVENTORY_QUERY", "sku": "PHARMA-SOP-901" }',
      },
    ],
    codeSample: {
      language: 'TypeScript',
      title: 'WebXR Spatial Viewport Client Init',
      code: `const runtime = await SpentaXRRuntime.initialize({
  renderer: 'WebGPU_Fallback_WebGL2',
  targetFps: 60,
  zeroEgressMode: true,
  telemetryHub: 'wss://enclave.spenta.internal/v2/telemetry',
});`,
    },
    complianceMapping: ['SOC 2 Type II CC6.1', 'HIPAA §164.312(a)', 'WCAG 2.2 AA'],
  },
  L5: {
    layerId: 'L5',
    level: 5,
    title: 'Cloud Orchestration & Vector Memory Contracts',
    subtitle: 'High-throughput event streaming, pgvector embeddings, and air-gapped Kubernetes clusters',
    techStack: ['Kubernetes (K8s)', 'PostgreSQL + pgvector', 'Milvus', 'Apache Kafka', 'MinIO S3'],
    touchpoints: 'KYC document vector search, spatial POI indexing, 10,000+ IoT telemetry events/sec.',
    securityGovernance: '100% On-Premise or Private VPC deployment with AES-256-GCM at rest and in transit.',
    enterpriseImpact: 'Instant sub-10ms retrieval across millions of enterprise documents with zero cloud egress.',
    specs: {
      latency: '< 8ms (1536-dim HNSW)',
      throughput: '120,000 Kafka events/sec',
      protocol: 'gRPC / pgvector / Kafka',
      uptimeSla: '99.995%',
      encryption: 'AES-256-GCM (3× Replication)',
    },
    endpoints: [
      {
        method: 'POST',
        path: '/api/v2/vector/search-knn',
        description: 'Cosine similarity search over multi-modal KYC document and spatial mesh embeddings.',
        samplePayload: '{ "collection": "primebank_kyc_vectors", "topK": 5, "minSimilarityScore": 0.89 }',
      },
      {
        method: 'gRPC',
        path: 'spenta.storage.v2.EventStreamService/PublishEvent',
        description: 'Air-gapped Kafka topic telemetry ingest with deterministic schema enforcement.',
        samplePayload: '{ "topic": "scada.factory.sensors", "partitionKey": "cleanroom_zone_04" }',
      },
    ],
    codeSample: {
      language: 'Rust',
      title: 'Air-Gapped Vector Query Service',
      code: `sqlx::query_as!(
  DocumentMatch,
  "SELECT id, 1 - (embedding <=> $1) AS score FROM enterprise_vector_index ORDER BY embedding <=> $1 LIMIT $2",
  embedding,
  limit
).fetch_all(pool).await`,
    },
    complianceMapping: ['PCI-DSS v4.0 Req 3', 'GDPR Art. 32', 'ISO/IEC 27001 A.10'],
  },
  L4: {
    layerId: 'L4',
    level: 4,
    title: 'Immersive Spatial Simulation Engine Contracts',
    subtitle: 'Photorealistic real-time rendering, deterministic cleanroom physics, and digital twins',
    techStack: ['Unreal Engine 5 (Nanite/Lumen)', 'Unity 3D', 'Apple ARKit', 'Google ARCore', 'OpenXR'],
    touchpoints: 'Hospital wayfinding twins, VR cleanroom operator certifications, WebGL/glTF pipelines.',
    securityGovernance: 'Air-gapped simulation runtimes, signed binary checksums, local asset compilation.',
    enterpriseImpact: 'Cuts industrial training incidents by 96% and prototyping cycles from months to days.',
    specs: {
      latency: '< 11.1ms (90 Hz XR)',
      throughput: '1.2B polys (Nanite)',
      protocol: 'OpenXR / glTF / WebGL2',
      uptimeSla: '99.95%',
      encryption: 'Signed Binary Checksums',
    },
    endpoints: [
      {
        method: 'WS',
        path: 'wss://twin.spenta.internal/v2/pose-sync',
        description: 'Streams 6-DoF spatial anchors and multi-user avatar telemetry at 90Hz.',
        samplePayload: '{ "sceneId": "apollo_hospital_fl2", "pose": [0.12, 1.68, -4.4], "fps": 90 }',
      },
    ],
    codeSample: {
      language: 'C++',
      title: 'OpenXR 6-DoF Pose Injector',
      code: `SpentaPoseFrame frame = runtime.SamplePredictedPose(xrDisplayTime);
twinOrchestrator.SyncCleanroomAnchor(frame.orientation, frame.position);`,
    },
    complianceMapping: ['GMP Annex 11 Audit Trail', 'ISO 14644 Cleanroom SOPs'],
  },
  L3: {
    layerId: 'L3',
    level: 3,
    title: 'Machine Intelligence & Multimodal Reasoning Contracts',
    subtitle: 'Self-hosted Vision LLMs, PrimeOCR entity extraction, and 0.88 HITL confidence gating',
    techStack: ['LLaMA 3.2 Vision', 'LayoutLMv3', 'TensorRT-LLM', 'OPA Policy Engine', 'Whisper v3'],
    touchpoints: 'PrimeOCR KYC verification (<30s), Bengali/English voice commands, 8 vertical AI agents.',
    securityGovernance: '0.88 confidence HITL escalation gate, zero external API calls, deterministic audit log.',
    enterpriseImpact: 'Eliminates 90% of manual document keying while maintaining bank-grade accuracy.',
    specs: {
      latency: '< 420ms / page (TensorRT)',
      throughput: '2,400 docs/min/node',
      protocol: 'gRPC / OpenAI-Compatible Local',
      uptimeSla: '99.98%',
      encryption: 'NVIDIA Confidential GPU TEE',
    },
    endpoints: [
      {
        method: 'POST',
        path: '/api/v2/primeocr/extract',
        description: 'Runs air-gapped hybrid OCR + LayoutLM verification with automatic HITL threshold check.',
        samplePayload: '{ "docType": "NID_PASSPORT_KYC", "confidence": 0.964, "hitlRequired": false }',
      },
    ],
    codeSample: {
      language: 'Python',
      title: 'Air-Gapped PrimeOCR Inference Handler',
      code: `result = prime_vision.extract(image_bytes, backend="tensorrt_fp8")
if result.confidence < 0.88:
    return hitl_queue.escalate(result, reviewer_role="compliance_officer")`,
    },
    complianceMapping: ['Bangladesh Bank ICT Guidelines', 'SOC 2 CC7.2', 'EU AI Act High-Risk Log'],
  },
  L2: {
    layerId: 'L2',
    level: 2,
    title: 'Edge Processing & Protocol Network Contracts',
    subtitle: 'Quantized on-device Wasm/ONNX neural filtering and sub-50ms MQTT telemetry routing',
    techStack: ['Rust Wasm', 'ONNX Runtime', 'MQTT 5.0', 'WireGuard Mesh', 'BLE Beacons'],
    touchpoints: 'Smart-glass video pre-filtering, hospital BLE indoor positioning, factory SCADA edge gateways.',
    securityGovernance: 'Zero-trust WireGuard enclave tunnels, hardware-pinned mTLS certificates.',
    enterpriseImpact: 'Filters 85% of raw sensor noise at the edge to eliminate backhaul bottlenecks.',
    specs: {
      latency: '< 18ms edge inference',
      throughput: '8,500 MQTT msg/sec/gateway',
      protocol: 'MQTT 5.0 / WireGuard / Wasm',
      uptimeSla: '99.99%',
      encryption: 'mTLS + ChaCha20-Poly1305',
    },
    endpoints: [
      {
        method: 'MQTT',
        path: 'spenta/edge/{siteId}/telemetry/filtered',
        description: 'Publishes quantized anomaly events from edge boxes to Layer 5 Kafka clusters.',
        samplePayload: '{ "siteId": "dhaka_hub_01", "sensor": "lidar_bay_2", "anomalyScore": 0.04 }',
      },
    ],
    codeSample: {
      language: 'Rust',
      title: 'Wasm Edge Filter Logic',
      code: `#[no_mangle]
pub extern "C" fn filter_frame(confidence: f32) -> i32 {
    if confidence >= 0.88 { 1 } else { 0 }
}`,
    },
    complianceMapping: ['NIST SP 800-207 Zero Trust', 'IEC 62443 Industrial Edge'],
  },
  L1: {
    layerId: 'L1',
    level: 1,
    title: 'Physical Sensing & Hardware Enclave Ingest',
    subtitle: 'Smart glasses, LiDAR scanners, NVIDIA on-prem inference racks, and IIoT sensor arrays',
    techStack: ['Meta Ray-Ban / Android XR', 'Apple Vision Pro', 'LiDAR / 6-DoF IMU', 'NVIDIA L40S / H100'],
    touchpoints: 'Wearable outward RGB cameras, spatial microphones, on-premise GPU server appliances.',
    securityGovernance: 'TPM 2.0 hardware root of trust, air-gapped VLAN isolation, tamper-evident boot.',
    enterpriseImpact: 'Turns mass-market spatial eyewear and local GPUs into sovereign enterprise sensors.',
    specs: {
      latency: '< 4ms IMU packetization',
      throughput: '4K 60fps RGB + LiDAR depth',
      protocol: 'USB4 / PCIe Gen5 / Local 10GbE',
      uptimeSla: '99.99%',
      encryption: 'TPM 2.0 Hardware Attestation',
    },
    endpoints: [
      {
        method: 'gRPC',
        path: 'spenta.hardware.v2.EnclaveHealth/Attest',
        description: 'Verifies hardware TPM attestation and GPU thermal/VRAM readiness on boot.',
        samplePayload: '{ "node": "tier3-l40s-01", "tpmVerified": true, "vramFreeGb": 44.2 }',
      },
    ],
    codeSample: {
      language: 'C++',
      title: 'Zero-Copy IMU Packetization',
      code: `ImuPacket pkt = sensorRing.AcquireZeroCopy();
enclaveBus.DispatchSigned(pkt, tpmSigner.CurrentKey());`,
    },
    complianceMapping: ['FIPS 140-3 Hardware Root', 'ISO 27001 Physical Enclave'],
  },
};

export interface SsotCaseStudy {
  id: string;
  client: string;
  industry: string;
  engine: 'Operations Engine' | 'Experience Engine' | 'Dual-Engine Fusion';
  headline: string;
  solution: string;
  techStack: string[];
  metrics: { label: string; value: string; detail: string }[];
  quote: string;
  stackAppIds: string[];
  arPreset: ArModelPreset;
}

export const SSOT_CASE_STUDIES: SsotCaseStudy[] = [
  {
    id: 'prime-bank',
    client: 'Prime Bank',
    industry: 'Regulated Banking',
    engine: 'Operations Engine',
    headline: 'On-Premise Hybrid PrimeOCR Slashes KYC Verification from 20m to Under 30s',
    solution:
      'Deployed air-gapped LLaMA 3.2 Vision + LayoutLM extraction pipeline inside bank premises with 0.88 HITL compliance routing and zero external API egress.',
    techStack: ['PrimeOCR', 'LayoutLMv3', 'PostgreSQL pgvector', 'On-Prem GPU Enclave'],
    metrics: [
      { label: '3-Year Verified ROI', value: '450%', detail: 'Measured across branch onboarding ops' },
      { label: 'KYC Turnaround', value: '< 30s', detail: 'Down from 18–20 min manual keying' },
      { label: 'Data Egress', value: '0%', detail: '100% air-gapped sovereign compliance' },
    ],
    quote:
      'Reduced branch document verification queues by over 90% without a single customer record leaving our internal datacenter.',
    stackAppIds: ['icr_ops', 'genai_bi', 'cyber_sla'],
    arPreset: 'server-enclave',
  },
  {
    id: 'samsung-biologics',
    client: 'Samsung Biologics',
    industry: 'Biopharma Cleanroom',
    engine: 'Experience Engine',
    headline: 'Certified Procedural VR Cleanroom Training for High-Containment Operators',
    solution:
      'Built deterministic UE5 cleanroom digital twin with real-time contamination physics and automated GMP SOP compliance scoring.',
    techStack: ['Unreal Engine 5', 'OpenXR', 'Procedural LMS', 'Telemetry Audit'],
    metrics: [
      { label: 'Incident Reduction', value: '-96%', detail: 'Contamination protocol errors in drills' },
      { label: 'Certification Speed', value: '3.2×', detail: 'Faster operator onboarding readiness' },
      { label: 'Facility Downtime', value: '0 hrs', detail: 'Zero physical cleanroom occupancy lost' },
    ],
    quote:
      'Operators complete complex sterile gowning and bioreactor SOPs in virtual containment before ever stepping onto the production floor.',
    stackAppIds: ['spatial_xr', 'workflow_ai'],
    arPreset: 'cleanroom-twin',
  },
  {
    id: 'isho-furniture',
    client: 'ISHO Furniture',
    industry: 'Omnichannel Retail',
    engine: 'Experience Engine',
    headline: 'Frictionless Browser-Native WebAR 3D Product Try-On at Scale',
    solution:
      'Zero-app-download WebXR catalog enabling shoppers to place true-to-scale furniture inside their rooms directly from mobile Safari and Chrome.',
    techStack: ['WebXR Wasm', 'glTF PBR Pipeline', 'Three.js', 'Mobile Commerce SDK'],
    metrics: [
      { label: 'Conversion Lift', value: '+38%', detail: 'On WebAR-enabled catalog SKUs' },
      { label: 'Return Reduction', value: '-27%', detail: 'Eliminates dimensional fit surprises' },
      { label: 'Install Friction', value: '0 MB', detail: 'Instant browser launch under 2s' },
    ],
    quote:
      'Shoppers preview true-scale pieces in their own living rooms in two taps—turning mobile browsing into high-intent orders.',
    stackAppIds: ['branding_geo', 'spatial_xr'],
    arPreset: 'xr-glasses',
  },
  {
    id: 'apollo-hospital',
    client: 'Apollo JMI Hospital',
    industry: 'Healthcare Infrastructure',
    engine: 'Dual-Engine Fusion',
    headline: 'Interactive 3D Hospital Twin for Indoor Wayfinding & Automated Triage',
    solution:
      'Fused multi-floor 3D spatial twin with BLE wayfinding and conversational patient intake kiosks across outpatient departments.',
    techStack: ['3D Facility Twin', 'BLE Indoor Nav', 'Voice Intake AI', 'HIPAA VPC'],
    metrics: [
      { label: 'Check-In Wait Time', value: '-54%', detail: 'Automated triage & routing kiosks' },
      { label: 'Wayfinding Accuracy', value: '±1.2m', detail: 'Turn-by-turn multi-floor guidance' },
      { label: 'Staff Reallocation', value: '18 hrs/day', detail: 'Freed from directional desk inquiries' },
    ],
    quote:
      'Patients navigate diagnostics and surgical wings effortlessly while front-desk staff focus on critical care coordination.',
    stackAppIds: ['spatial_xr', 'voice_ai', 'healthcare_erp'],
    arPreset: 'cleanroom-twin',
  },
  {
    id: 'flagship-brands',
    client: 'Coca-Cola, Adidas & Suzuki',
    industry: 'Experiential MarTech',
    engine: 'Experience Engine',
    headline: 'Anamorphic 3D Billboards & Gesture Floor Games for Flagship Launches',
    solution:
      'Delivered high-impact spatial brand activations combining real-time computer vision gesture tracking and anamorphic 3D LED spectacles.',
    techStack: ['UE5 Real-Time', 'LiDAR / CV Tracking', 'Anamorphic 3D', 'Lead Telemetry'],
    metrics: [
      { label: 'Avg. Dwell Time', value: '4.8×', detail: 'Versus standard digital signage' },
      { label: 'Activation Reach', value: '2.4M+', detail: 'Combined on-ground & social impressions' },
      { label: 'Gross Margin', value: '76.3%', detail: 'Reusable Spenta spatial templates' },
    ],
    quote:
      'Turned physical launch venues into viral, measurable customer acquisition engines within a 3-week turnaround.',
    stackAppIds: ['branding_geo', 'spatial_xr'],
    arPreset: 'xr-glasses',
  },
  {
    id: 'labaid-virtued',
    client: 'LABAID VirtuED 3D',
    industry: 'Medical EdTech',
    engine: 'Dual-Engine Fusion',
    headline: 'Curriculum-Aligned 3D Human Anatomy & Surgical Dissection Simulation',
    solution:
      'Built an interactive multi-layer 3D anatomy platform with procedural assessment rubrics and offline classroom caching.',
    techStack: ['WebGL2 / Three.js', 'Procedural LMS', '3D Anatomy Assets', 'Offline IndexedDB'],
    metrics: [
      { label: 'Retention Gain', value: '+62%', detail: 'Measured in pre-clinical lab exams' },
      { label: 'Lab Cost Saved', value: '70%', detail: 'Reduced consumable specimen spend' },
      { label: 'Offline Uptime', value: '100%', detail: 'Runs reliably in low-bandwidth labs' },
    ],
    quote:
      'Medical cohorts repeat complex anatomical dissections safely on demand, with instant automated mastery telemetry.',
    stackAppIds: ['spatial_xr', 'healthcare_erp'],
    arPreset: 'xr-glasses',
  },
];

export interface ExecutiveTeamMember {
  id: string;
  name: string;
  role: string;
  location: string;
  initials: string;
  bio: string;
  focusAreas: string[];
}

export const EXECUTIVE_TEAM: ExecutiveTeamMember[] = [
  {
    id: 'sait-fatemi',
    name: 'Sait Fatemi',
    role: 'Founder & Chief Executive Officer',
    location: 'San Jose, CA · Dhaka',
    initials: 'SF',
    bio: 'Architect of Spenta’s dual-shore Sovereign OS & Physical AI model. 8+ years specializing in real-time WebXR simulation engines, spatial computing pipelines, and enterprise software architecture.',
    focusAreas: ['Dual-Shore Strategy', 'Spatial Computing', 'Enterprise Architecture'],
  },
  {
    id: 'noman-hossain',
    name: 'Dr. Noman Hossain',
    role: 'Chief Technology Officer & Head of AI',
    location: 'Dhaka Engineering Lab',
    initials: 'NH',
    bio: 'Ph.D. in Multimodal Computer Vision and Document Intelligence. Lead architect of the self-hosted PrimeOCR engine and quantized on-premise LLaMA 3.2 Vision inference pipelines.',
    focusAreas: ['PrimeOCR IDP', 'On-Premise LLMs', '0.88 HITL Governance'],
  },
  {
    id: 'marcus-vance',
    name: 'Marcus Vance',
    role: 'VP of Global Enterprise & APAC BD',
    location: 'Sydney · San Jose',
    initials: 'MV',
    bio: '15+ years scaling enterprise software procurement across Australia, Southeast Asia, and North America across regulated mining, banking, and hospital networks.',
    focusAreas: ['APAC & US Enterprise', 'Regulated Procurement', 'Partner Channels'],
  },
  {
    id: 'ayesha-rahman',
    name: 'Ayesha Rahman',
    role: 'Director of 3D Pipeline & Digital Twins',
    location: 'Dhaka Studio HQ',
    initials: 'AR',
    bio: 'Technical artist and procedural 3D simulation director overseeing Spenta’s AAA spatial studio, cleanroom physics digital twins, and Epic Fab creator asset distribution.',
    focusAreas: ['UE5 Digital Twins', 'Procedural VR', '3D IP Libraries'],
  },
];

export interface RdRoadmapPhase {
  quarter: string;
  horizon: string;
  title: string;
  status: 'Completed' | 'In Progress' | 'Scheduled';
  deliverables: string[];
  targetKpi: string;
}

export const RD_ROADMAP_PHASES: RdRoadmapPhase[] = [
  {
    quarter: 'Q1–Q2',
    horizon: 'Foundation & Enclave Core',
    title: 'PrimeOCR v2 + Air-Gapped Tier 1–4 Enclaves',
    status: 'Completed',
    deliverables: [
      'Self-hosted LLaMA 3.2 Vision + LayoutLMv3 TensorRT pipeline',
      '0.88 HITL escalation workflow & immutable OPA compliance ledger',
      'Zero-install WebXR commerce viewer (<2s cold load)',
    ],
    targetKpi: '450% Prime Bank 3-Yr ROI verified',
  },
  {
    quarter: 'Q3–Q4',
    horizon: 'Productized SDKs & APAC Scale',
    title: 'Self-Serve Fusion SDKs & Procedural VR LMS',
    status: 'In Progress',
    deliverables: [
      'Multi-tenant PrimeOCR REST/Python developer SDK portal',
      'Cleanroom & surgical VR LMS automated certification scoring',
      'WhatsApp Voice ERP multilingual Bengali/English voice actions',
    ],
    targetKpi: '8 enterprise pilots closed across APAC & US',
  },
  {
    quarter: 'FY2028',
    horizon: 'Physical AI & Wearable Ingest',
    title: 'Smart-Glasses Edge SDK & Autonomous Twin Sync',
    status: 'Scheduled',
    deliverables: [
      'Android XR & Meta Ray-Ban real-time RGB/Audio telemetry bridge',
      'Bi-directional SCADA + UE5 factory digital twin live sync',
      'Passive 3D Asset & Dataset IP marketplace expansion',
    ],
    targetKpi: '$60K+ platform MRR · 70%+ blended SaaS/IP margin',
  },
];

export interface PassiveIpStream {
  id: string;
  title: string;
  platform: string;
  payoutSplit: string;
  minMonthlyUsd: number;
  maxMonthlyUsd: number;
  grossMargin: string;
  netMargin: string;
  mechanics: string;
  precedent: string;
}

export const PASSIVE_IP_STREAMS: PassiveIpStream[] = [
  {
    id: 'asset-royalties',
    title: '3D Digital Asset Royalties',
    platform: 'Epic Fab · Unity Asset Store · TurboSquid',
    payoutSplit: '88% Creator Keep (Epic Fab)',
    minMonthlyUsd: 4500,
    maxMonthlyUsd: 14000,
    grossMargin: '92%',
    netMargin: '78%',
    mechanics: 'Modular medical, industrial cleanroom, and architectural twin kits spun off from client R&D.',
    precedent: 'Synty Studios & KitBash3D multi-million catalog model',
  },
  {
    id: 'spatial-creator',
    title: 'Spatial Creator Economy & AR Templates',
    platform: 'WebXR Marketplace · Snap/Meta Effects',
    payoutSplit: '70–85% Net Revenue',
    minMonthlyUsd: 3000,
    maxMonthlyUsd: 9500,
    grossMargin: '89%',
    netMargin: '74%',
    mechanics: 'Reusable retail try-on shaders, gesture floor game engines, and anamorphic templates.',
    precedent: 'Shopify AR & WebXR SaaS template ecosystems',
  },
  {
    id: 'gamified-lms',
    title: 'Productized Gamified LMS Micro-SaaS',
    platform: 'Direct B2B Seat Licensing',
    payoutSplit: '100% Direct ARR',
    minMonthlyUsd: 6000,
    maxMonthlyUsd: 22000,
    grossMargin: '86%',
    netMargin: '71%',
    mechanics: 'Turnkey SOP safety simulations billed per active operator seat across pharma & mining.',
    precedent: 'Labster & Strivr recurring seat licenses',
  },
  {
    id: 'hardware-media',
    title: '3D Hardware Teardown & Technical Media',
    platform: 'YouTube · Enterprise Sponsorships',
    payoutSplit: 'AdSense + B2B Sponsors',
    minMonthlyUsd: 2000,
    maxMonthlyUsd: 7500,
    grossMargin: '84%',
    netMargin: '68%',
    mechanics: 'High-retention spatial engineering breakdowns driving organic inbound enterprise leads.',
    precedent: 'Branch Education 3D engineering media moat',
  },
  {
    id: 'compute-referrals',
    title: 'Sovereign Compute & GPU Enclave Referrals',
    platform: 'Hardware OEM & Private Cloud Partners',
    payoutSplit: '8–15% Hardware/Cluster RevShare',
    minMonthlyUsd: 2500,
    maxMonthlyUsd: 10000,
    grossMargin: '95%',
    netMargin: '88%',
    mechanics: 'Turnkey Tier 1–4 NVIDIA inference rack specifications bundled with Sovereign OS deals.',
    precedent: 'Enterprise SI hardware partner rebates',
  },
];

export interface MacroCatalystItem {
  id: string;
  vendor: string;
  headline: string;
  metric: string;
  spentaAdvantage: string;
}

export const MACRO_HARDWARE_CATALYSTS: MacroCatalystItem[] = [
  {
    id: 'meta-rayban',
    vendor: 'Meta Smart Eyewear',
    headline: 'Mass-Market Wearable Camera & Audio Base',
    metric: '7M+ units shipped (2025)',
    spentaAdvantage: 'Spenta L1–L2 edge pipelines turn consumer eyewear streams into enterprise field SOP copilots.',
  },
  {
    id: 'android-xr',
    vendor: 'Google · Samsung · Qualcomm',
    headline: 'Android XR Open Spatial Ecosystem',
    metric: 'Cross-OEM OpenXR Standard',
    spentaAdvantage: 'WebXR Wasm + OpenXR contracts deploy once across headsets, tablets, and mobile browsers.',
  },
  {
    id: 'apple-vision',
    vendor: 'Apple visionOS',
    headline: 'High-Precision Enterprise Spatial Computing',
    metric: '4K/eye Surgical & Twin Fidelity',
    spentaAdvantage: 'Photorealistic UE5/glTF hospital & biopharma twins run natively on visionOS & WebGL fallbacks.',
  },
  {
    id: 'nvidia-local',
    vendor: 'NVIDIA L40S / H100 & Local Vision LLMs',
    headline: 'Affordable On-Premise Sovereign Inference',
    metric: '10× lower cost vs. 2023 cloud',
    spentaAdvantage: 'Enables regulated banks & hospitals to run PrimeOCR & 8 AI agents with 0% data egress.',
  },
];

export interface CompetitorMoatRow {
  attribute: string;
  spenta: string;
  westernAgencies: string;
  commodityOutsourcers: string;
  rigidSaas: string;
}

export const COMPETITIVE_MOAT_ROWS: CompetitorMoatRow[] = [
  {
    attribute: 'Blended Engineering Cost',
    spenta: '$12.98/hr loaded Dhaka hub + US/AU architects',
    westernAgencies: '$150–$250/hr onshore billing',
    commodityOutsourcers: '$25–$45/hr (high rework)',
    rigidSaas: 'High per-seat lock-in',
  },
  {
    attribute: 'Data Sovereignty & On-Premise',
    spenta: '100% Air-Gapped / Private VPC (0% egress)',
    westernAgencies: 'Public cloud APIs (OpenAI/AWS)',
    commodityOutsourcers: 'Minimal security governance',
    rigidSaas: 'Multi-tenant public cloud only',
  },
  {
    attribute: 'Spatial XR + Physical AI Fusion',
    spenta: 'Unified L1–L6 stack (XR + OCR + Voice ERP)',
    westernAgencies: 'Siloed XR or web shops',
    commodityOutsourcers: 'No real-time UE5/LLM IP',
    rigidSaas: '2D forms only, zero spatial layer',
  },
  {
    attribute: 'Land-and-Expand Entry Ticket',
    spenta: '$1.2K pilot → $90K+ enterprise enclave',
    westernAgencies: '$75K+ minimum engagement',
    commodityOutsourcers: 'Staff aug without product IP',
    rigidSaas: 'Annual rigid enterprise contracts',
  },
  {
    attribute: 'Gross Margin Profile',
    spenta: '42%–76%+ blended (reusable IP + SaaS)',
    westernAgencies: '28%–35% labor-capped',
    commodityOutsourcers: '18%–25% commodity margin',
    rigidSaas: '75%+ (high CAC & churn)',
  },
];

export interface StartupBenchmark {
  name: string;
  category: string;
  valuationOrScale: string;
  spentaParallel: string;
}

export const STARTUP_BENCHMARKS: StartupBenchmark[] = [
  {
    name: 'STRIVR',
    category: 'Enterprise VR Training',
    valuationOrScale: '$200M+ Enterprise Scale',
    spentaParallel: 'Cleanroom & industrial procedural VR LMS with lower delivery cost.',
  },
  {
    name: 'OPERATOR XR [ASX:XRG]',
    category: 'Defense & Regulated XR',
    valuationOrScale: 'ASX-Listed Defense XR',
    spentaParallel: 'Air-gapped on-premise simulation enclaves for APAC regulated sectors.',
  },
  {
    name: 'LABSTER',
    category: 'Virtual Science Labs',
    valuationOrScale: '$147M+ Raised',
    spentaParallel: 'LABAID VirtuED 3D medical anatomy & curriculum-aligned assessments.',
  },
  {
    name: 'SYNTY & KITBASH3D',
    category: '3D Digital Asset IP',
    valuationOrScale: 'High-Margin Passive Royalties',
    spentaParallel: 'Monetizes reusable cleanroom, hospital & architectural 3D kits on Epic Fab.',
  },
  {
    name: 'BRANCH EDUCATION',
    category: '3D Technical Media',
    valuationOrScale: 'Millions of Organic Views',
    spentaParallel: 'Hardware teardown 3D content driving zero-CAC enterprise inbound demand.',
  },
];

export interface DataRoomDocument {
  id: string;
  code: string;
  title: string;
  category: 'Financials' | 'Architecture' | 'Legal & Terms' | 'Commercial Proof';
  summary: string;
  format: string;
  targetTab: NavTab;
  targetSectionId?: string;
  keywords: string;
}

export const DATA_ROOM_DOCUMENTS: DataRoomDocument[] = [
  {
    id: 'dr-safe-memo',
    code: 'DD-01',
    title: 'Seed Round YC Post-Money SAFE Memo ($500K @ $4.5M Cap)',
    category: 'Legal & Terms',
    summary: 'Complete financing terms, 20% discount mechanics, 11.11% pre-dilution ownership, and 40/35/25 fund allocation.',
    format: 'Interactive Memo · PDF Ready',
    targetTab: 'Investor Briefing',
    targetSectionId: 'ssot-safe-terms',
    keywords: 'safe cap valuation 500k 4.5m discount equity terms allocation runway',
  },
  {
    id: 'dr-5yr-pnl',
    code: 'DD-02',
    title: 'Reconciled 5-Year P&L & Investor ROI Sensitivity Model (FY2027–FY2031)',
    category: 'Financials',
    summary: 'Conservative vs. Aggressive growth comparison, 5-scope revenue mix modeler, FX sensitivity, and CSV export.',
    format: 'Live Model · CSV Export',
    targetTab: 'Financials',
    keywords: 'pnl revenue ebitda roi calculator moic growth scenarios conservative aggressive fy2027 fy2031',
  },
  {
    id: 'dr-9tier-economics',
    code: 'DD-03',
    title: 'Recalibrated 9-Tier Unit Economics Waterfall (Model A1–C3)',
    category: 'Financials',
    summary: 'Granular COGS, Gross Margin (38%–45%), CAC, Overhead, and Net Margin breakdown from $1.2K pilots to $90K enclaves.',
    format: 'Waterfall Analytics · USD/BDT',
    targetTab: 'Investor Briefing',
    targetSectionId: 'ssot-unit-economics',
    keywords: 'unit economics tiers margin cogs cac overhead waterfall a1 b1 c1 bdt usd',
  },
  {
    id: 'dr-l1-l6-contracts',
    code: 'DD-04',
    title: '6-Layer Sovereign Fusion Architecture & API/Compliance Contracts',
    category: 'Architecture',
    summary: 'REST, gRPC, WebSocket, and MQTT specifications across L1–L6 with SOC 2, HIPAA, PCI-DSS, and ISO 27001 mappings.',
    format: 'Technical Spec · Live Core',
    targetTab: 'Spenta Core',
    keywords: 'architecture l1 l6 fusion stack api grpc websocket rust compliance soc2 hipaa pci',
  },
  {
    id: 'dr-primebank-proof',
    code: 'DD-05',
    title: 'Prime Bank & Samsung Biologics Verified Deployment Dossier',
    category: 'Commercial Proof',
    summary: '450% 3-Year ROI PrimeOCR KYC metrics, -96% cleanroom VR incident reduction, ISHO WebAR, and Apollo Hospital twin.',
    format: 'Case Studies · Stack Presets',
    targetTab: 'Investor Briefing',
    targetSectionId: 'ssot-case-studies',
    keywords: 'case studies prime bank samsung biologics isho apollo hospital labaid roi proof',
  },
  {
    id: 'dr-app-vault-bom',
    code: 'DD-06',
    title: '13-App Sovereign OS Vault & Hardware Sizing BoM Matrix',
    category: 'Architecture',
    summary: 'Interactive module composer calculating setup capex, recurring ARR, gross margins, and Tier 1–4 server requirements.',
    format: 'Interactive Vault · JSON Export',
    targetTab: 'App Vault',
    keywords: 'app vault stack composer server tier hardware bom setup arr proposal',
  },
  {
    id: 'dr-pitch-deck',
    code: 'DD-07',
    title: 'Executive 12-Slide Investor Pitch Deck',
    category: 'Commercial Proof',
    summary: 'Boardroom-ready slide narrative covering TAM ($667.3B), Dual-Engine model, Dual-Shore arbitrage, and ask.',
    format: 'Slide Deck · Print Ready',
    targetTab: 'Pitch Deck',
    keywords: 'pitch deck slides presentation vision tam market catalyst',
  },
  {
    id: 'dr-neural-brain',
    code: 'DD-08',
    title: '3D Sovereign Neural Core & Dual-Shore Delivery Topology',
    category: 'Architecture',
    summary: 'Interactive 3D domain hub graph and San Jose / Sydney ↔ Dhaka delivery hub arbitrage observatory.',
    format: 'Interactive 3D WebGL',
    targetTab: 'The Brain',
    keywords: '3d brain neural core globe dual shore dhaka san jose sydney',
  },
];

export interface DualShoreHubSpec {
  id: 'san-jose' | 'sydney' | 'dhaka';
  name: string;
  region: string;
  role: string;
  lat: number;
  lon: number;
  latencyToDhakaMs: number;
  headcountLabel: string;
  costHighlight: string;
  responsibilities: string[];
}

export const DUAL_SHORE_HUBS: DualShoreHubSpec[] = [
  {
    id: 'san-jose',
    name: 'San Jose, CA',
    region: 'North America Front-Office',
    role: 'Enterprise Architecture & US Investor Relations',
    lat: 37.3382,
    lon: -121.8863,
    latencyToDhakaMs: 218,
    headcountLabel: 'Founder & Solutions Architects',
    costHighlight: 'Onshore enterprise procurement & Silicon Valley hardware partnerships',
    responsibilities: [
      'Direct Fortune 500 & healthcare executive sponsorship',
      'Hardware ecosystem alignment (Meta, NVIDIA, Apple, Google)',
      'Seed SAFE governance & US corporate contracting',
    ],
  },
  {
    id: 'sydney',
    name: 'Sydney & Melbourne',
    region: 'APAC Commercial Hub',
    role: 'Mining, Banking & Hospital Enterprise Expansion',
    lat: -33.8688,
    lon: 151.2093,
    latencyToDhakaMs: 132,
    headcountLabel: 'VP Enterprise & Account Directors',
    costHighlight: '4-hour timezone overlap with Dhaka R&D studio',
    responsibilities: [
      'APAC mining & industrial VR safety training deployments',
      'Regulated banking & hospital digital twin sales cycles',
      'Regional channel partnerships across ANZ & ASEAN',
    ],
  },
  {
    id: 'dhaka',
    name: 'Dhaka R&D Hub',
    region: 'Core Engineering & 3D Studio HQ',
    role: '20-FTE Sovereign AI, PrimeOCR & UE5 Production Engine',
    lat: 23.8103,
    lon: 90.4125,
    latencyToDhakaMs: 0,
    headcountLabel: '20-FTE Dedicated AI & XR Specialists',
    costHighlight: '$12.98/hr fully loaded cost — 85%+ arbitrage vs. Western agencies',
    responsibilities: [
      'Core L1–L6 Fusion OS, PrimeOCR & on-prem LLM engineering',
      '24/7 AAA Unreal Engine 5, WebXR & procedural twin studio',
      'Direct banking & hospital delivery across South Asia',
    ],
  },
];
