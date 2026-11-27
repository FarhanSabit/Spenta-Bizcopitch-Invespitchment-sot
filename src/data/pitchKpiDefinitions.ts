export interface KpiDefinitionMeta {
  category: string;
  definition: string;
  benchmark?: string;
}

const KPI_DEFINITIONS: Record<string, KpiDefinitionMeta> = {
  // Cover & SAFE Round Terms
  'capital raise': {
    category: 'Round Instrument',
    definition:
      'Total seed raise structured as a single Post-Money SAFE tranche to fund 18–24 months of product packaging, compliance audits, and enterprise onboarding.',
    benchmark: '45% Eng · 30% Compliance · 15% GTM · 10% Hardware Reserve',
  },
  instrument: {
    category: 'Round Instrument',
    definition:
      'Y Combinator standard Post-Money Simple Agreement for Future Equity locking investor ownership percentage prior to Series A priced conversion.',
    benchmark: '45/30/15/10 canonical Use of Funds allocation',
  },
  'valuation cap': {
    category: 'SAFE Conversion Math',
    definition:
      'Maximum effective valuation at which the $500K SAFE converts into preferred equity—guaranteeing an 11.11% pre-Series A ownership stake alongside a 20% conversion discount.',
    benchmark: '$500K / $4.5M Post-Money Cap = 11.11% stake',
  },
  terms: {
    category: 'SAFE Conversion Math',
    definition:
      '$4.5M post-money valuation cap paired with a 20% discount to the Series A share price—giving seed investors whichever conversion calculation yields more shares.',
    benchmark: 'Standard institutional seed protection',
  },
  'safe cap & discount': {
    category: 'SAFE Conversion Math',
    definition:
      'Invested $500K converts at an 11.11% ownership baseline ($4.5M post-money cap) or a 20% discount to the next priced round, whichever is more favorable to the SAFE holder.',
    benchmark: 'Zero hidden side-car warrants or ratchets',
  },
  'capital efficiency': {
    category: 'Operating Efficiency',
    definition:
      'Ratio of cumulative 5-year net profit ($3.189M) to initial SAFE capital raised ($500K)—measuring operational cash generation independent of exit valuation multiples.',
    benchmark: 'Distinct from Equity Exit ROI (4.16×–6.24×)',
  },
  'modeled safe roi': {
    category: 'Equity Exit Multiple',
    definition:
      'Projected return on $500K SAFE equity if exited or marked at 10×–15× FY2031 EBITDA ($18.72M–$28.08M Enterprise Value at 11.11% ownership), excluding retained cash.',
    benchmark: 'Reported separately from 6.38× Capital Efficiency',
  },
  'safe exit roi (10×–15×)': {
    category: 'Equity Exit Multiple',
    definition:
      'Modeled investor equity multiple at 10×–15× Year 5 EBITDA ($1.872M FY2031 EBITDA), valuing an 11.11% SAFE stake at $2.08M–$3.12M before retained cash distributions.',
    benchmark: 'Base conservative model (~0.5825× haircut applied)',
  },

  // Executive Thesis & Market
  'composable apps': {
    category: 'Platform Architecture',
    definition:
      'Thirteen independently deployable enterprise AI, ERP, Voice, Fintech, and Spatial XR applications built on one shared L1–L6 kernel (PostgreSQL, Kafka, OPA).',
    benchmark: 'Odoo-style land-and-expand composability',
  },
  'cost edge vs west': {
    category: 'Dual-Shore Arbitrage',
    definition:
      'Delivered project pricing discount versus US/EU/AU systems integrators ($120–$180/hr), enabled by Spenta’s $12.98/hr fully loaded Dhaka R&D enclave.',
    benchmark: 'Preserves 55%–60% target consolidated gross margin',
  },
  'spenta cost edge': {
    category: 'Dual-Shore Arbitrage',
    definition:
      'Structural 40%–60% client build savings versus Western agencies while protecting gross margins via reusable L1–L6 components and Dhaka R&D economics.',
    benchmark: '20-FTE Dhaka pod at $45K/mo total hub budget',
  },
  'conservative client roi': {
    category: 'Enterprise Value Proof',
    definition:
      'Baseline 3-year client return modeled conservatively across workflow automation, OCR headcount savings, and zero hyperscaler LLM token fees.',
    benchmark: 'Realized banking proofs exceed 450%–580%',
  },
  'global ai spend': {
    category: 'Addressable Macro',
    definition:
      'Projected global enterprise and infrastructure AI expenditure driving sovereign, air-gapped on-premises deployment mandates in regulated sectors.',
    benchmark: 'Regulated BFSI & Healthcare lead on-prem adoption',
  },
  'spatial computing': {
    category: 'Addressable Macro',
    definition:
      'Global Spatial Computing, industrial VR simulation, and WebAR commerce market opportunity powering Spenta’s 76.3% GM Experience Engine.',
    benchmark: 'Proven across Samsung Biologics, Apollo JMI & ISHO',
  },
  'global health worker deficit': {
    category: 'Clinical Demand Driver',
    definition:
      'WHO-projected global clinical workforce shortage creating urgent hospital demand for AI shift handover, nurse rostering, Rx OCR, and VR onboarding.',
    benchmark: 'Anchors Spenta’s $45/bed/mo AI Healthcare ERP',
  },

  // Dual Capability Engine & Margins
  'operations engine gm': {
    category: 'Gross Margin Profile',
    definition:
      'Gross margin band spanning initial sovereign service pods (29.1%–34.9% GM) up through recurring AI Healthcare ERP (58.0% GM) and Dataset IP (65.1% GM).',
    benchmark: 'Scales toward 55%–60% blended company GM by FY2031',
  },
  'experience xr/3d gm': {
    category: 'Gross Margin Profile',
    definition:
      'Gross margin achieved on Unreal Engine 5 digital twins, VirtuTrain360 cleanroom VR, and WebAR spatial pipelines leveraging reusable Dhaka 3D libraries.',
    benchmark: 'Validated on Samsung Biologics & Apollo twins',
  },
  'xr line gm': {
    category: 'Gross Margin Profile',
    definition:
      'High-margin Experience Engine gross profitability driven by modular PBR environments, photogrammetry reuse, and multi-client 3D asset compounding.',
    benchmark: 'Anchored by 70%–88% marketplace IP royalties',
  },
  '3d ip royalties': {
    category: 'Recurring IP Revenue',
    definition:
      'Net margin earned from packaging sanitized architectural and clinical 3D geometry into Epic Fab, UEFN, and enterprise twin asset catalogs.',
    benchmark: 'Zero marginal replication cost per license',
  },
  'high-margin ip lines': {
    category: 'Catalog Portfolio Mix',
    definition:
      'Software and spatial IP lines (Spatial XR 76.3%, Datasets 65.1%, Healthcare ERP 58.0%) that drive consolidated gross margin expansion from Y2 through Y5.',
    benchmark: 'Target 56% of FY2031 revenue mix',
  },
  'core delivery pods': {
    category: 'Catalog Portfolio Mix',
    definition:
      'Predictable enterprise land-and-expand builds (ICR $48.5K, Fintech $39.8K, Legacy Mod $34K, IoT Edge $29.4K, GenAI BI $22.3K) that establish long-term client lock-in.',
    benchmark: 'Self-funds operations from Year 1 onward',
  },
  'data ip corpus': {
    category: 'Proprietary Data Moat',
    definition:
      'Annotated regional corpus spanning 1.4M+ agricultural/clinical images, handwritten Bangla/EN scripts, and code-switched audio unattainable via generic public scraping.',
    benchmark: 'Powers offline VLM & OCR domain accuracy',
  },

  // Healthcare ERP
  'site setup': {
    category: 'Healthcare SaaS Economics',
    definition:
      'One-time clinical onboarding, HL7/FHIR integration, and local Server PC deployment fee per hospital campus before recurring per-bed billing begins.',
    benchmark: 'Included in Model A/B hospital rollouts',
  },
  '150-bed site arr': {
    category: 'Healthcare SaaS Economics',
    definition:
      'Annual recurring software license generated by a single 150-bed hospital at $45/bed/mo ($81,000/yr), compared against ~$48K/yr for smaller ~90-bed clinics.',
    benchmark: '58.0% conservative SaaS gross margin',
  },
  'per-bed pricing': {
    category: 'Healthcare SaaS Economics',
    definition:
      'Modular hospital SaaS pricing covering AI Shift Handover, Smart Nurse Rostering, Rx OCR, and FHIR interoperability running completely on-premises.',
    benchmark: 'Scales linearly as multi-hospital groups expand',
  },
  'conservative gm': {
    category: 'Healthcare SaaS Economics',
    definition:
      'Stress-tested gross margin on Healthcare ERP after factoring clinical support, HL7 integration overhead, and ongoing model tuning.',
    benchmark: 'Pre-scale floor prior to SaaS maturity',
  },

  // Proof Metrics (BankOCR, ISHO, Jotax, Captive)
  'form speed': {
    category: 'BankOCR Telemetry',
    definition:
      'End-to-end local inference latency to parse multi-page handwritten Bangla/English KYC and loan dossiers inside an air-gapped bank enclave.',
    benchmark: 'Measured in production (1.2M+ documents)',
  },
  'extraction speed': {
    category: 'BankOCR Telemetry',
    definition:
      'Average document-intelligence cycle per loan or KYC application using self-hosted LLaMA 3.2 Vision + LayoutLMv3 + Tesseract OCR.',
    benchmark: 'Replaces 15–25 minutes of manual banking data entry',
  },
  'hitl gate': {
    category: 'Deterministic Governance',
    definition:
      'Open Policy Agent (OPA) confidence threshold requiring mandatory human maker-checker verification whenever an AI extraction scores below 0.88.',
    benchmark: '"Autopilot Suggests, Captain Signs"',
  },
  'hitl opa gate': {
    category: 'Deterministic Governance',
    definition:
      'Policy-as-code guardrail isolating probabilistic neural outputs from core banking/ERP ledgers until confidence ≥0.88 or human sign-off is cryptographically logged.',
    benchmark: 'Compliant with Bangladesh Bank ICT v4.0 & HIPAA',
  },
  'banking proof roi': {
    category: 'Realized Proof Benchmark',
    definition:
      'Observed ROI achieved in production banking document automation deployments—explicitly separated from Spenta’s conservative 250%–350% baseline enterprise model.',
    benchmark: 'Prime Bank 1.2M+ OCR dossier proof',
  },
  deployment: {
    category: 'Sovereign Infrastructure',
    definition:
      'Zero external PII egress deployment running on client-owned Server PCs or dedicated Private VPCs inside national regulatory boundaries.',
    benchmark: 'Supports fully air-gapped network topologies',
  },
  standards: {
    category: 'Clinical Interoperability',
    definition:
      'Native support for HL7/FHIR medical data exchange alongside HIPAA privacy controls, enabling zero-friction EHR and VirtuED AR integration.',
    benchmark: 'Aligned toward TGA / FDA SaMD / DGDA tracks',
  },
  vertical: {
    category: 'Enterprise Validation',
    definition:
      'Global regulated biopharmaceutical GMP manufacturing environment demanding zero-defect sterile cleanroom protocol adherence.',
    benchmark: 'Validated via Samsung Biologics VirtuTrain360',
  },
  platform: {
    category: 'Proprietary XR Stack',
    definition:
      'Spenta’s enterprise VR simulation platform pairing Unreal Engine 5 photorealistic cleanrooms with automated SOP telemetry and trainer sign-off.',
    benchmark: '76.3% Gross Margin Experience IP',
  },
  'isho conversion lift': {
    category: 'Retail Commerce Telemetry',
    definition:
      'Observed e-commerce checkout uplift when furniture shoppers preview true-scale 3D products directly in mobile Safari/Chrome via zero-app WebAR.',
    benchmark: 'Paired with AI-Native SEO/GEO discovery',
  },
  'isho return drop': {
    category: 'Retail Commerce Telemetry',
    definition:
      'Measured reduction in dimension-mismatch product returns after buyers inspect 3D WebAR furniture placement in their real room prior to checkout.',
    benchmark: 'Direct bottom-line logistics margin recovery',
  },
  'jotax report time': {
    category: 'Nordic BI Benchmark',
    definition:
      'Compression in executive financial and tax reporting turnaround achieved by conversational GenAI BI over 28+ virtualized legacy database relations.',
    benchmark: 'Production deployment in Finland (Jotax Oy)',
  },
  'jotax bi accuracy': {
    category: 'Nordic BI Benchmark',
    definition:
      'Validated SQL query accuracy enforced by schema-grounded, read-only OPA sandboxes preventing LLM column or join hallucinations.',
    benchmark: '96% verified accuracy across live legacy tables',
  },
  'best footprint': {
    category: 'Captive Rollout Channel',
    definition:
      'Retail electronics branch footprint deploying Spenta’s Modular Stock MIS, RBAC HRM, 365 Exchange circular CRM, and AI-Native GEO.',
    benchmark: 'Immediate Year 1 production testbed',
  },
  'x ltd baas network': {
    category: 'Captive Rollout Channel',
    definition:
      'Live Battery-as-a-Service (BaaS) swapping infrastructure streaming real-time MQTT pack health and telemetry into Spenta’s <50ms edge inference bus.',
    benchmark: 'Powers activity-based Scope 3 climate ledger',
  },
  'connected ev fleet': {
    category: 'Captive Rollout Channel',
    definition:
      'Operational commercial electric vehicles generating real-world charge-cycle, thermal anomaly, and route-dispatch datasets.',
    benchmark: 'Synchronized with 80 BaaS swap stations',
  },

  // Hardware Tiers
  'tier 4 edge': {
    category: 'Sovereign Server Matrix',
    definition:
      'Compact 2× used RTX 3090 (48GB VRAM) + 128GB DDR5 branch appliance running 33B–70B quantized models locally at 25–45 tok/s.',
    benchmark: 'Ideal for clinic, showroom, or substation nodes',
  },
  'tier 3 baseline': {
    category: 'Sovereign Server Matrix',
    definition:
      'Spenta’s flagship price-performance office server: 4× used RTX 3090 (96GB VRAM), 256GB DDR5, 10TB NVMe + 50TB HDD.',
    benchmark: 'Pays back CapEx in ~90–120 days vs cloud GPUs',
  },
  'tier 2 moe rack': {
    category: 'Sovereign Server Matrix',
    definition:
      'Rackmount 4× RTX 3090 / 2× RTX 5090 + AMD EPYC 9004 512GB DDR5 ECC cluster serving 200B–300B Mixture-of-Experts models across multi-department teams.',
    benchmark: 'High-concurrency hospital/bank branch node',
  },
  'tier 1 m3 ultra': {
    category: 'Sovereign Server Matrix',
    definition:
      'Apple Mac Studio M3 Ultra with 512GB Unified RAM (819 GB/s memory bandwidth) sustaining 300B+ frontier reasoning at 18–35+ tok/s in a silent desktop chassis.',
    benchmark: 'Flagship executive C-suite AI appliance',
  },

  // Dual-Shore Operations & Financials
  'fully loaded rate': {
    category: 'Dhaka Hub Economics',
    definition:
      'True hourly engineering cost combining $11.50/hr base Dhaka developer payroll plus $1.48/hr secure office, power, and compliance enclave overhead.',
    benchmark: '~$18.54/hr effective cost at 70% billable utilization',
  },
  'y1 dhaka budget': {
    category: 'Operating Burn Profile',
    definition:
      'Full annual cost of Spenta’s 20-FTE Dhaka engineering pod (64.8M BDT at 120 BDT/USD = $45K/mo), enabling positive Year 1 EBITDA on $672K revenue.',
    benchmark: 'Fraction of a single Silicon Valley team’s burn',
  },
  'western 20-fte pod': {
    category: 'Cost Arbitrage Reference',
    definition:
      'Equivalent 20-person senior AI, UE5 XR, and SecOps engineering team costed at Western market rates ($115–$150/hr fully burdened).',
    benchmark: '8×–11× higher fixed payroll than Spenta Dhaka',
  },
  'y1 (fy2027)': {
    category: '5-Year Base Trajectory',
    definition:
      'Reconciled Year 1 conservative revenue baseline anchored by turnkey enterprise pilots and captive BEST / X Ltd deployments ($82K EBITDA).',
    benchmark: 'Self-sustaining from Year 1 with positive EBITDA',
  },
  'y3 (fy2029)': {
    category: '5-Year Base Trajectory',
    definition:
      'Year 3 revenue milestone ($780K EBITDA) after applying Spenta’s ~0.5825× conservatism haircut to the $4.80M unscaled Healthcare ERP hospital pipeline.',
    benchmark: 'Recurring SaaS + SLA begins compounding',
  },
  'y5 (fy2031)': {
    category: '5-Year Base Trajectory',
    definition:
      'Year 5 scale milestone ($1.872M EBITDA, 32% EBITDA margin) as high-margin Healthcare SaaS ARR (44% mix) and 3D/Dataset IP (12% mix) expand consolidated GM to 55%–60%.',
    benchmark: 'Anchors $18.72M–$28.08M EV at 10×–15× EBITDA',
  },
  '5-yr cum. ebitda': {
    category: '5-Year Base Trajectory',
    definition:
      'Cumulative pre-tax operating cashflow from FY2027 through FY2031 ($82K + $390K + $780K + $1.128M + $1.872M), generating $3.189M cumulative net profit at 25% effective tax.',
    benchmark: '6.38× Capital Efficiency on $500K SAFE',
  },

  // Leadership, Comparables, Funnel & Milestones
  'core leaders': {
    category: 'Executive Roster',
    definition:
      'Four verified principals spanning ANZ corporate governance (Marium Maam), L1–L6 Systems Architecture (Farhan Sabit), Unity/WebAR (Swapon Islam), and UE5 Digital Twins (Sharif Abir).',
    benchmark: 'Backed by Clinical & Regulatory Advisors',
  },
  'dhaka r&d hub': {
    category: 'Engineering Enclave',
    definition:
      'Full-stack AI/ML, UE5/Unity XR, Rust/Wasm IIoT, and 24/7 SecOps engineering pod operating continuously from Dhaka under San Jose & AU leadership.',
    benchmark: '100+ delivered enterprise & interactive builds',
  },
  'delivered projects': {
    category: 'Execution Track Record',
    definition:
      'Cumulative production software, enterprise BI, and interactive XR/3D engagements delivered across the GenDev → GxDx Solutions → Spenta Technology lineage.',
    benchmark: '9+ global & regional enterprise brands',
  },
  'strivr benchmark': {
    category: 'Global Peer Comparable',
    definition:
      'US enterprise VR workforce training leader validating Fortune 500 willingness to pay for spatial SOP certification—without Spenta’s integrated on-prem ERP & Document AI.',
    benchmark: 'Validates VirtuTrain360 enterprise category',
  },
  'labster benchmark': {
    category: 'Global Peer Comparable',
    definition:
      'Virtual science & medical simulation leader validating +30% cohort learning recall—paired in Spenta with Bangla/EN VirtuED AR and Hospital ERP upsell.',
    benchmark: 'Spenta n=240 medical VR cohort matched +30% recall',
  },
  'gate 1–2': {
    category: 'GTM Qualification Funnel',
    definition:
      '14-day Architecture & Pre-Trust Diagnostic auditing client data residency, Server PC BOM, OPA 0.88 boundaries, and a signed 25%–35% ROI business case.',
    benchmark: 'Eliminates un-scoped POCs before engineering starts',
  },
  'gate 3–4': {
    category: 'GTM Qualification Funnel',
    definition:
      '60-day fixed-scope Model A Sovereign Pilot running inside the client firewall in shadow validation alongside human officers before production cutover.',
    benchmark: 'High pilot-to-ARR conversion discipline',
  },
  'gate 5–6': {
    category: 'GTM Qualification Funnel',
    definition:
      'Multi-site Model B/C expansion federating additional Spenta modules (Voice AI, Cyber SLA, Digital Twins) across hospital beds, bank branches, or retail stores.',
    benchmark: 'Drives net revenue retention across accounts',
  },
  'target mrr (12 mo)': {
    category: 'Execution Milestone',
    definition:
      '12-month recurring revenue run-rate target driven by 6–8 anchor hospital, BFSI, and captive enterprise accounts onboarding to SaaS & Cyber SLA retainers.',
    benchmark: 'Equivalent to $720K annualized recurring run-rate',
  },
  'anchor sites': {
    category: 'Execution Milestone',
    definition:
      'Priority enterprise production sites targeted across Q4 2026–Q2 2027 spanning SAARC, ANZ, and existing multinational partner relationships.',
    benchmark: 'De-risked via warm pipeline & captive rollouts',
  },
  'disciplined roi band': {
    category: '100%-Confidence Policy',
    definition:
      'Strict 25% floor to 35% ceiling annualized ROI modeling corridor on total investment over 3–5 years—eliminating speculative hockey-stick multipliers.',
    benchmark: '1.00× Conservative Floor to 1.12× Mix Cap',
  },

  // CTO Technical & AI Safety / Climate Tracks
  'core kernel': {
    category: 'Technical Architecture',
    definition:
      'Standardized six-layer stack: L1 IIoT Sensing, L2 Hardware TEEs, L3 Sovereign Neural Core, L4 Spatial Fusion, L5 Kafka/PostgreSQL/OPA Governance, and L6 Omni-Channel UI.',
    benchmark: 'Single shared bus across all 13 apps',
  },
  'edge latency': {
    category: 'Technical Architecture',
    definition:
      'Sub-50 millisecond local inference round-trip achieved via Rust/WebAssembly (Wasm) edge containers and quantized models running directly beside MQTT equipment.',
    benchmark: 'Verified across 80 X Ltd EV swap stations',
  },
  'cloud pii egress': {
    category: 'Zero-Trust Privacy',
    definition:
      'Zero bytes of raw customer PII, medical charts, or bank ledgers leave client infrastructure—enforced by air-gapped network policies and hardware TEE encryption.',
    benchmark: 'Meets HIPAA & BB ICT v4.0 strict residency',
  },
  'processed volume': {
    category: 'Production Scale Proof',
    definition:
      'Over 1.2 million real banking KYC, trade finance, and loan documents processed in production inside enterprise firewalls.',
    benchmark: 'Prime Bank / BFSI production deployment',
  },
  'curated corpus': {
    category: 'Proprietary Dataset IP',
    definition:
      '1.4M+ curated, regionally annotated domain images supporting high-precision computer vision across agriculture, clinical notes, and local scripts.',
    benchmark: 'Commercialized as 65.1% GM Dataset Packs',
  },
  'taxonomy scope': {
    category: 'Proprietary Dataset IP',
    definition:
      'Thirty-eight fine-grained visual classification labels verified by domain specialists for offline mobile AR diagnostics.',
    benchmark: 'Zero external cloud inference dependency',
  },
  'dataset line gm': {
    category: 'Catalog Profitability',
    definition:
      'Conservative gross margin achieved on licensing curated, PII-scrubbed regional datasets and RAG evaluation corpora to enterprise buyers.',
    benchmark: 'Repeatable zero-token licensing revenue',
  },
  'law firm review': {
    category: 'Enterprise Ops Proof',
    definition:
      '65% reduction in contract clause extraction and precedent verification turnaround via air-gapped Corrective RAG running inside legal infrastructure.',
    benchmark: 'Strict client privilege & zero third-party API leak',
  },
  'logistics on-time': {
    category: 'Enterprise Ops Proof',
    definition:
      '25% uplift in on-time fleet dispatch and route adherence powered by real-time telemetry scheduling and edge anomaly alerts.',
    benchmark: 'Paired with −18% fleet fuel burn',
  },
  'fleet fuel burn': {
    category: 'Enterprise Ops Proof',
    definition:
      '18% operational fuel and energy reduction delivered through dynamic dispatch optimization across commercial logistics and EV swap networks.',
    benchmark: 'Feeds verified Scope 3 sustainability reporting',
  },
  'medical vr cohort': {
    category: 'Clinical Study Validation',
    definition:
      'Controlled cohort evaluation of n=240 medical learners trained on Spenta’s VirtuED AR/VR modules, demonstrating +30% clinical recall over textbook instruction.',
    benchmark: 'Validated with LABAID clinical partners',
  },
  'frame target': {
    category: 'XR Performance SLA',
    definition:
      'Sustained 60–90 frames-per-second stereographic rendering inside Unreal Engine 5 and OpenXR headsets to prevent motion fatigue during surgical/GMP rehearsals.',
    benchmark: 'Optimized LOD + baked lighting pipelines',
  },
  'pilot failure rate': {
    category: 'Enterprise AI Safety',
    definition:
      'Industry failure rate where AI pilots stall prior to production because probabilistic models lack bounded decision contracts and human escalation paths.',
    benchmark: 'Capability-Clarity Paradox benchmark',
  },
  'zero value capture': {
    category: 'Enterprise AI Safety',
    definition:
      'Share of enterprise AI initiatives failing to register measurable ROI due to unverified hallucinations, shadow PII leakage, or infosec rejection.',
    benchmark: 'Resolved via Spenta’s 4-Pillar Pre-Trust Audit',
  },
  'root cause': {
    category: 'Enterprise AI Safety',
    definition:
      'Gaps in objective clarity, boundary enforcement, and proxy-metric guardrails—not raw LLM intelligence—cause most enterprise AI project cancellations.',
    benchmark: 'Engineered before deployment in L5 OPA',
  },
  'opa threshold': {
    category: 'Deterministic Governance',
    definition:
      'Minimum 0.88 model confidence score enforced deterministically by Open Policy Agent rules outside the LLM; outputs below 0.88 pause for human Captain Sign-Off.',
    benchmark: 'Prevents King Midas / specification gaming bugs',
  },
  'audit lineage': {
    category: 'Forensic Compliance',
    definition:
      '100% cryptographic lineage capturing SHA-256 input digest, exact model weight version, confidence score, and human approver ID in Kafka.',
    benchmark: 'Audit-ready for SOC 2, ISO 27001 & HIPAA',
  },
  'kill-switch': {
    category: 'Operational Safety',
    definition:
      'Immediate L5 policy circuit-breaker able to freeze autonomous actions, revert to read-only advisory mode, or roll back model weights with zero downtime.',
    benchmark: 'Hard guardrail external to probabilistic AI',
  },
  'compute carbon drop': {
    category: 'Green AI Telemetry',
    definition:
      '84% reduction in compute energy per 10,000 documents (2.9 kWh quantized Tier 3 on-prem vs ~18.4 kWh hyperscaler GPU cluster + transit).',
    benchmark: 'Measured directly at Server PC power sensors',
  },
  'edge fleet proof': {
    category: 'Climate & Mobility Proof',
    definition:
      'Live telemetry network across 80 X Ltd battery-swapping stations and 480 commercial EVs executing <50ms edge scheduling.',
    benchmark: 'Replaces ±40% spend-based ESG guesswork',
  },
  'reporting grade': {
    category: 'Climate & ESG',
    definition:
      'Activity-based Scope 3 emissions ledger derived directly from GPU watt-hour sensors and BaaS station meters for verifiable corporate sustainability audits.',
    benchmark: 'Eliminates coarse spend-based carbon estimates',
  },

  // 45/30/15/10 Use of Funds Buckets
  'core engineering & sovereign ai': {
    category: 'Use of Funds · 45% ($225K)',
    definition:
      'Funds the 20-FTE Dhaka engineering enclave to harden the L1–L6 kernel, zero-touch on-prem Server PC installers, and multi-site AI Healthcare ERP packaging.',
    benchmark: 'Largest allocation ensuring rapid productization',
  },
  'compliance & clinical validation': {
    category: 'Use of Funds · 30% ($150K)',
    definition:
      'Covers SOC 2 Type II & ISO 27001 external readiness audits, HIPAA security hardening, and regulatory clinical validation pathways across TGA, FDA SaMD, and DGDA.',
    benchmark: 'Unlocks Tier-1 hospital & BFSI procurement',
  },
  'enterprise gtm & partnerships': {
    category: 'Use of Funds · 15% ($75K)',
    definition:
      'Supports enterprise architectural diagnostics, pilot conversion travel across San Jose, Australia, and Dhaka, plus partner co-selling.',
    benchmark: 'Targets 6–8 anchor accounts & $60K MRR in 12 mo',
  },
  'on-prem hardware & reserve': {
    category: 'Use of Funds · 10% ($50K)',
    definition:
      'Equips portable Tier 3 Server PC demo rigs ($8.5K–$10.5K each) for live shadow-validation customer pilots alongside a disciplined working capital buffer.',
    benchmark: 'Hardware CapEx amortizes across client pilots',
  },
};

export function getKpiDefinition(label: string, value: string): KpiDefinitionMeta {
  const normalized = label.trim().toLowerCase();
  const exact = KPI_DEFINITIONS[normalized];
  if (exact) return exact;

  // Smart fallback if any new metric label is added dynamically
  return {
    category: 'Verified Portal Metric',
    definition: `${label} (${value}) is anchored to Spenta Sovereign OS’s reconciled financial, technical, or clinical proof dataset—governed under the 25%–35% confidence band and L5 OPA audit framework.`,
    benchmark: 'See Institutional Glossary below for full methodology',
  };
}
