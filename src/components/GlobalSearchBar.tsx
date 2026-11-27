import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Brain,
  Building2,
  Check,
  Cpu,
  History,
  Image,
  Layers,
  Moon,
  Plus,
  Presentation,
  Search,
  Sparkles,
  Sun,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  AGENTIC_VERTICALS,
  BLUEPRINT_PILLARS,
  CASE_STUDIES,
  COMPLIANCE_FRAMEWORKS,
  NAV_TABS,
  NavTab,
  PITCH_DECK_SLIDES,
  SERVER_TIERS,
  SOVEREIGN_STACK_LAYERS,
  SPENTA_APPS,
  STARTER_RECIPES,
} from '../data/spentaManifest';
import {
  BRIEFING_CHAPTERS,
  DATA_ROOM_DOCUMENTS,
  NINE_TIER_UNIT_ECONOMICS,
  formatSsotCurrency,
} from '../data/unifiedSsotData';
import { PendingNavFocus, useStack } from '../store/StackContext';
import { preloadTabView } from '../utils/viewPreloaders';

interface SearchEntry {
  id: string;
  kind:
    | 'Section'
    | 'Briefing'
    | 'Data Room'
    | 'Unit Economics'
    | 'Recipe'
    | 'App'
    | 'Infographic'
    | 'Pitch Slide'
    | 'Core Layer'
    | 'Server Tier'
    | 'Blueprint'
    | 'Case Study'
    | 'Action';
  title: string;
  subtitle: string;
  keywords: string;
  tab?: NavTab;
  focus?: Omit<PendingNavFocus, 'ts'>;
  appId?: string;
  recipeId?: string;
  onRun?: () => void;
}

const INFOGRAPHIC_INDEX: { id: string; title: string; subtitle: string; keywords: string }[] = [
  {
    id: 'ai-brain',
    title: 'Plate 01: Spenta Sovereign AI Brain',
    subtitle: 'Dual Capability Engine over L1–L6 Core across 8 domain hubs',
    keywords: 'infographic plate 01 diagram brain map hubs ecosystem architecture',
  },
  {
    id: 'l1-l6-stack',
    title: 'Plate 02: L1–L6 Sovereign Fusion Stack & 4-Tier Servers',
    subtitle: 'Hardware TEE (<50ms edge, 0.88 HITL) + Tier 1–4 server matrix',
    keywords: 'infographic plate 02 isolation security tee opa hitl server matrix',
  },
  {
    id: 'captive-ecosystem',
    title: 'Plate 03: Captive Ecosystem Synergies (BEST & X Ltd)',
    subtitle: 'BEST (65+ showrooms, 365 Exchange) & X Ltd (80 BaaS stations, 480 EVs)',
    keywords: 'infographic plate 03 best showrooms x ltd baas swap stations ev captive',
  },
  {
    id: 'financial-edge',
    title: 'Plate 04: FY2027–FY2031 Financial Trajectory & Dual-Shore Edge',
    subtitle: '$672K to $5.85M scale · 6.38× Cap. Eff. / 4.16×–6.24× SAFE ROI · $12.98/hr loaded Dhaka hub',
    keywords: 'infographic plate 04 financial trajectory dual shore dhaka safe roi fy2027 projections forecast',
  },
];

const POPULAR_SEARCH_TOPICS: { label: string; hint: string }[] = [
  { label: 'FY2027 Projections', hint: '5-Yr P&L' },
  { label: 'Spatial XR Portfolio', hint: '76.3% GM' },
  { label: 'AI Safety Protocols', hint: '0.88 HITL' },
  { label: 'SAFE Round Terms', hint: '$4.5M Cap' },
  { label: 'Healthcare ERP', hint: '$45/bed/mo' },
];

const RECENT_SEARCHES_STORAGE_KEY = 'spenta_recent_search_queries_v1';
const SEARCH_FREQUENCY_STORAGE_KEY = 'spenta_search_frequency_v1';
const MAX_RECENT_QUERIES = 5;
const MAX_TRENDING_QUERIES = 5;

interface SearchFrequencyEntry {
  query: string;
  count: number;
  lastSearchedAt: number;
}

const DEFAULT_TRENDING_SEARCHES: Record<string, SearchFrequencyEntry> = {
  'safe roi': { query: 'SAFE ROI', count: 5, lastSearchedAt: 5 },
  'fy2027 projections': { query: 'FY2027 Projections', count: 4, lastSearchedAt: 4 },
  'samsung biologics': { query: 'Samsung Biologics', count: 3, lastSearchedAt: 3 },
  'spatial xr portfolio': { query: 'Spatial XR Portfolio', count: 2, lastSearchedAt: 2 },
  '0.88 hitl': { query: '0.88 HITL', count: 1, lastSearchedAt: 1 },
};

function normalizeForMatch(value: string): string {
  return value.toLowerCase().replace(/[–—]/g, '-');
}

function escapeRegexToken(token: string): string {
  return token
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/[-–—]/g, '[-–—]');
}

function HighlightText({ text, tokens }: { text: string; tokens: string[] }) {
  if (!tokens.length || !text) return <>{text}</>;
  const uniqueEscaped = Array.from(new Set(tokens.map(escapeRegexToken).filter(Boolean))).sort(
    (a, b) => b.length - a.length,
  );
  if (!uniqueEscaped.length) return <>{text}</>;

  const regex = new RegExp(`(${uniqueEscaped.join('|')})`, 'gi');
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(regex)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }
    if (match[0]) {
      parts.push(
        <mark
          key={`${start}-${match[0]}`}
          className="bg-[#1C6E46]/18 dark:bg-[#6FCB9F]/22 text-[#124E31] dark:text-[#9BE8C2] rounded-[2px] px-0.5 font-semibold"
        >
          {match[0]}
        </mark>,
      );
    }
    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? <>{parts}</> : <>{text}</>;
}

function loadRecentQueries(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .slice(0, MAX_RECENT_QUERIES);
  } catch {
    return [];
  }
}

function loadSearchFrequencies(): Record<string, SearchFrequencyEntry> {
  try {
    const raw = window.localStorage.getItem(SEARCH_FREQUENCY_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_TRENDING_SEARCHES };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ...DEFAULT_TRENDING_SEARCHES };
    }
    const sanitized: Record<string, SearchFrequencyEntry> = {};
    for (const [key, val] of Object.entries(parsed)) {
      if (
        val &&
        typeof val === 'object' &&
        typeof (val as SearchFrequencyEntry).query === 'string' &&
        (val as SearchFrequencyEntry).query.trim().length > 0 &&
        typeof (val as SearchFrequencyEntry).count === 'number' &&
        (val as SearchFrequencyEntry).count > 0
      ) {
        const entry = val as SearchFrequencyEntry;
        sanitized[key] = {
          query: entry.query.trim(),
          count: Math.floor(entry.count),
          lastSearchedAt: typeof entry.lastSearchedAt === 'number' ? entry.lastSearchedAt : 0,
        };
      }
    }
    return sanitized;
  } catch {
    return { ...DEFAULT_TRENDING_SEARCHES };
  }
}

export function GlobalSearchBar() {
  const {
    theme,
    toggleTheme,
    commandPaletteOpen,
    setCommandPaletteOpen,
    navigateToItem,
    selectedIds,
    toggleApp,
    applyRecipe,
    setAiAssistantOpen,
    currency,
    investorCalculatorState,
    setDataRoomOpen,
    openIntelligenceModal,
    openContactModal,
    openBriefingSection,
  } = useStack();

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [recentQueries, setRecentQueries] = useState<string[]>(loadRecentQueries);
  const [searchFrequencies, setSearchFrequencies] =
    useState<Record<string, SearchFrequencyEntry>>(loadSearchFrequencies);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const recordedCurrentQueryRef = useRef<string | null>(null);

  const persistRecentQueries = (next: string[]) => {
    setRecentQueries(next);
    try {
      window.localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  };

  const persistSearchFrequencies = (next: Record<string, SearchFrequencyEntry>) => {
    setSearchFrequencies(next);
    try {
      window.localStorage.setItem(SEARCH_FREQUENCY_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  };

  const recordSearchQuery = (rawQuery: string, forceIncrement = false) => {
    const cleaned = rawQuery.trim();
    if (!cleaned) return;
    const normalizedKey = cleaned.toLowerCase();

    const nextRecent = [
      cleaned,
      ...recentQueries.filter((q) => q.toLowerCase() !== normalizedKey),
    ].slice(0, MAX_RECENT_QUERIES);
    persistRecentQueries(nextRecent);

    if (!forceIncrement && recordedCurrentQueryRef.current === normalizedKey) {
      return;
    }
    recordedCurrentQueryRef.current = normalizedKey;

    const existing = searchFrequencies[normalizedKey];
    const nextFrequencies: Record<string, SearchFrequencyEntry> = {
      ...searchFrequencies,
      [normalizedKey]: {
        query: cleaned,
        count: (existing?.count ?? 0) + 1,
        lastSearchedAt: Date.now(),
      },
    };
    persistSearchFrequencies(nextFrequencies);
  };

  const removeRecentQuery = (target: string) => {
    const next = recentQueries.filter((q) => q !== target);
    persistRecentQueries(next);
  };

  useEffect(() => {
    const onStorageSync = (e: StorageEvent) => {
      if (e.key === RECENT_SEARCHES_STORAGE_KEY) {
        setRecentQueries(loadRecentQueries());
      } else if (e.key === SEARCH_FREQUENCY_STORAGE_KEY) {
        setSearchFrequencies(loadSearchFrequencies());
      }
    };
    window.addEventListener('storage', onStorageSync);
    return () => window.removeEventListener('storage', onStorageSync);
  }, []);

  const trendingSearches = useMemo<SearchFrequencyEntry[]>(() => {
    return Object.values(searchFrequencies)
      .filter((entry) => entry.count > 0 && entry.query.trim().length > 0)
      .sort((a, b) => b.count - a.count || b.lastSearchedAt - a.lastSearchedAt)
      .slice(0, MAX_TRENDING_QUERIES);
  }, [searchFrequencies]);

  const index = useMemo<SearchEntry[]>(() => {
    const items: SearchEntry[] = [];

    // 1-Click Industry Recipes
    STARTER_RECIPES.forEach((recipe) => {
      items.push({
        id: `recipe-${recipe.id}`,
        kind: 'Recipe',
        title: `Load Recipe: ${recipe.name}`,
        subtitle: `${recipe.pattern} · ${recipe.ids.length} verified modules`,
        keywords: `recipe pack starter ${recipe.name} ${recipe.pattern} ${recipe.description}`,
        recipeId: recipe.id,
      });
    });

    // 8 Portal Sections
    const sectionDescs: Record<NavTab, string> = {
      'App Vault': 'Composable 13-app catalog, Architecture Matrix & 3D Neural Core',
      'Investor Briefing':
        'Master SSOT briefing, 9-Tier Unit Economics, Dual-Shore 3D Globe & Seed SAFE Terms',
      Infographics: '4 high-resolution 16:9 presentation plates & full-screen lightbox',
      Financials: 'FY2027–FY2031 P&L, Quick Generate Brief, FX/Tax & 13-Product GM Table',
      'Spenta Core': 'L1–L6 Fusion Stack, 4-Tier Server Matrix & Configuration Audit Log',
      'The Brain': 'Operational Tech Radar, 0.88 HITL Gate Simulator & 3D Neural Core',
      'Pitch Deck': '18-Slide Master Investor Presentation with 16:9 PDF export',
      Resources: 'Governed Case Studies, Compliance Readiness & Proposal Builder',
    };
    const extraSectionKeywords: Partial<Record<NavTab, string>> = {
      'App Vault': 'spatial xr portfolio catalog 13 modules showreel',
      'Investor Briefing':
        'master ssot invespitchment unit economics 9 tier dual shore globe safe terms data room d3 voice',
      Financials: 'fy2027 projections forecast safe round terms valuation cap roi',
      'Spenta Core': 'ai safety protocols governance tee opa',
      'The Brain': 'ai safety protocols hitl gate guardrails governance',
      'Pitch Deck': 'fy2027 projections safe round terms spatial xr portfolio',
      Resources: 'ai safety protocols compliance security audit',
    };
    NAV_TABS.forEach((tab) => {
      items.push({
        id: `sec-${tab}`,
        kind: 'Section',
        title: tab,
        subtitle: sectionDescs[tab],
        keywords: `${tab} ${sectionDescs[tab]} ${extraSectionKeywords[tab] ?? ''} section tab page`,
        tab,
      });
    });

    // Quick Actions (Theme + Investor Briefing Modals)
    items.push(
      {
        id: 'action-data-room',
        kind: 'Action',
        title: 'Open Investor Data Room',
        subtitle: 'Searchable diligence index, bookmarked memos & cross-tab deep links',
        keywords: 'data room diligence memo documents safe financials bookmarks',
        onRun: () => setDataRoomOpen(true),
      },
      {
        id: 'action-intelligence-d3',
        kind: 'Action',
        title: 'Open Investor Intelligence (D3 Analytics)',
        subtitle: 'Live D3 sentiment trend curve, chapter feedback heatmap & SAFE ROI sync',
        keywords: 'd3 analytics sentiment heatmap intelligence feedback investor dashboard',
        onRun: () => openIntelligenceModal(),
      },
      {
        id: 'action-founder-contact',
        kind: 'Action',
        title: 'Request Term Sheet / Founder Contact',
        subtitle: 'Offline-first diligence inquiry for Seed SAFE ($500K @ $4.5M Cap)',
        keywords: 'term sheet contact founder safe inquiry seed round email',
        onRun: () => openContactModal('Seed SAFE Term Sheet & Data Room Request'),
      },
      {
        id: 'action-theme',
        kind: 'Action',
        title: theme === 'dark' ? 'Switch to Stone Light Mode' : 'Switch to Nocturnal Navy Mode',
        subtitle: 'Toggle Spenta Stone Light and Nocturnal Navy color tokens across all views',
        keywords: 'theme dark light mode stone nocturnal navy appearance toggle',
        onRun: () => toggleTheme(),
      },
    );

    // Master SSOT Briefing Chapters
    BRIEFING_CHAPTERS.forEach((chapter) => {
      items.push({
        id: `briefing-${chapter.id}`,
        kind: 'Briefing',
        title: `SSOT ${chapter.title}`,
        subtitle: `Investor Briefing · Tracks: ${chapter.recommendedFor.join(', ')}`,
        keywords: `investor briefing master ssot ${chapter.shortTitle} ${chapter.title} ${chapter.recommendedFor.join(' ')}`,
        onRun: () => openBriefingSection(chapter.id),
      });
    });

    // 9-Tier Unit Economics
    NINE_TIER_UNIT_ECONOMICS.forEach((tier) => {
      const baselineLabel = formatSsotCurrency(
        tier.baselineUsd,
        currency,
        investorCalculatorState.fxRate,
        { compact: true },
      );
      items.push({
        id: `ue-${tier.id}`,
        kind: 'Unit Economics',
        title: `${tier.code}: ${tier.name}`,
        subtitle: `${baselineLabel} baseline · ${tier.grossMarginPercent.toFixed(1)}% GM · ${tier.deliveryTimeline}`,
        keywords: `unit economics tier ${tier.code} ${tier.name} ${tier.categoryLabel} ${tier.scopeSummary}`,
        onRun: () => openBriefingSection('ssot-unit-economics'),
      });
    });

    // Data Room Documents
    DATA_ROOM_DOCUMENTS.forEach((doc) => {
      items.push({
        id: `dr-${doc.id}`,
        kind: 'Data Room',
        title: `${doc.code}: ${doc.title}`,
        subtitle: `${doc.category} · ${doc.format}`,
        keywords: `data room ${doc.code} ${doc.title} ${doc.category} ${doc.keywords}`,
        onRun: () => setDataRoomOpen(true),
      });
    });

    // 13 Composable Apps
    SPENTA_APPS.forEach((app) => {
      const portfolioTag = app.engine.toLowerCase().includes('experience') || app.id === 'spatial-xr'
        ? 'portfolio spatial xr 3d showreel'
        : '';
      items.push({
        id: `app-${app.id}`,
        kind: 'App',
        title: app.name,
        subtitle: `${app.setupLabel} · ${app.gmPct.toFixed(1)}% GM · ${app.proofClient}`,
        keywords: `${app.name} ${app.shortName} ${app.tagline} ${app.category} ${app.proofClient} ${app.engine} ${app.deployment.join(' ')} ${portfolioTag}`,
        tab: 'App Vault',
        focus: { type: 'app', id: app.id },
        appId: app.id,
      });
    });

    // Interactive Chaptered 1080p Showreel Studio
    items.push({
      id: 'vault-showreel-studio',
      kind: 'Section',
      title: 'Interactive Chaptered 1080p Showreel Studio',
      subtitle: '9 clickable chapters · Spatial XR Portfolio, Samsung Biologics & Solar System VR',
      keywords: 'showreel studio video spatial xr portfolio 3d chapters samsung biologics',
      tab: 'App Vault',
      focus: { type: 'showreel', id: 'showreel-studio' },
    });

    // 4 Infographics Plates
    INFOGRAPHIC_INDEX.forEach((inf) => {
      items.push({
        id: `inf-${inf.id}`,
        kind: 'Infographic',
        title: inf.title,
        subtitle: inf.subtitle,
        keywords: `${inf.title} ${inf.subtitle} ${inf.keywords}`,
        tab: 'Infographics',
        focus: { type: 'infographic', id: inf.id },
      });
    });

    // L1-L6 Sovereign Core Layers
    SOVEREIGN_STACK_LAYERS.forEach((layer) => {
      items.push({
        id: `layer-${layer.id}`,
        kind: 'Core Layer',
        title: `${layer.id}: ${layer.title}`,
        subtitle: layer.subtitle,
        keywords: `${layer.id} ${layer.title} ${layer.subtitle} ${layer.protocols.join(' ')} ${layer.slaMetric} ai safety protocols governance audit`,
        tab: 'Spenta Core',
        focus: { type: 'layer', id: layer.id },
      });
    });

    // 4 Server PC Tiers
    ([1, 2, 3, 4] as const).forEach((tid) => {
      const t = SERVER_TIERS[tid];
      items.push({
        id: `tier-${t.id}`,
        kind: 'Server Tier',
        title: `${t.code} — ${t.name}`,
        subtitle: `${t.capex} · ${t.hardware}`,
        keywords: `${t.code} ${t.name} ${t.hardware} ${t.vramRam} ${t.capex} ${t.speed} server pc hardware`,
        tab: 'Spenta Core',
        focus: { type: 'tier', id: String(t.id) },
      });
    });

    // 18 Pitch Deck Slides
    PITCH_DECK_SLIDES.forEach((slide) => {
      const kpiText = (slide.kpis ?? []).map((k) => `${k.label} ${k.value}`).join(' ');
      const bulletText = (slide.bullets ?? []).join(' ');
      items.push({
        id: `slide-${slide.num}`,
        kind: 'Pitch Slide',
        title: `Slide ${String(slide.num).padStart(2, '0')}: ${slide.title}`,
        subtitle: `${slide.section} · ${slide.subtitle}`,
        keywords: `slide ${slide.num} ${slide.section} ${slide.title} ${slide.subtitle} ${kpiText} ${bulletText} projections portfolio ai safety protocols safe round terms pitch deck investor pdf`,
        tab: 'Pitch Deck',
        focus: { type: 'slide', id: String(slide.num) },
      });
    });

    // Blueprint Pillars & Agentic Verticals
    BLUEPRINT_PILLARS.forEach((p) => {
      items.push({
        id: `bp-${p.id}`,
        kind: 'Blueprint',
        title: `${p.code}: ${p.title}`,
        subtitle: p.metrics.join(' · '),
        keywords: `${p.title} ${p.summary} ${p.tags.join(' ')} blueprint brain radar`,
        tab: 'The Brain',
        focus: { type: 'blueprint', id: p.title },
      });
    });

    AGENTIC_VERTICALS.forEach((v) => {
      items.push({
        id: `vert-${v.id}`,
        kind: 'Blueprint',
        title: `Agentic Vertical: ${v.name}`,
        subtitle: `Think · Learn · Solve — ${v.proof}`,
        keywords: `${v.name} ${v.think} ${v.learn} ${v.solve} ${v.proof} agentic vertical hitl`,
        tab: 'The Brain',
        focus: { type: 'blueprint', id: v.name },
      });
    });

    // Case Studies & Compliance
    CASE_STUDIES.forEach((cs) => {
      items.push({
        id: `cs-${cs.id}`,
        kind: 'Case Study',
        title: `${cs.client} — ${cs.solution}`,
        subtitle: `${cs.sector} · ${cs.headlineMetric}`,
        keywords: `${cs.client} ${cs.solution} ${cs.sector} ${cs.region} ${cs.headlineMetric} ${cs.summary} case study`,
        tab: 'Resources',
        focus: { type: 'case', id: cs.sector },
      });
    });

    COMPLIANCE_FRAMEWORKS.forEach((fw) => {
      items.push({
        id: `fw-${fw.id}`,
        kind: 'Case Study',
        title: `Compliance: ${fw.code} (${fw.name})`,
        subtitle: fw.scope,
        keywords: `${fw.code} ${fw.name} ${fw.scope} compliance security audit`,
        tab: 'Resources',
      });
    });

    // Coding-Agent Prompt Pack & 4-Theme Comparison Studio
    items.push(
      {
        id: 'studio-prompt-pack',
        kind: 'Section',
        title: 'Prompt Pack & 4-Theme Design Studio',
        subtitle: 'Download Universal Markdown P0/P1/P2 prompts, sandboxed 4-theme preview & matrix',
        keywords:
          'prompt pack markdown p0 p1 p2 coding agent cursor claude windsurf design studio theme template',
        tab: 'Resources',
        focus: { type: 'studio', id: 'prompt-theme-studio' },
      },
      {
        id: 'studio-theme-comparison',
        kind: 'Section',
        title: '4-Way Theme Comparison: Spenta Web v2, MMIS v2, Spenta Dhaka & Spenta OS',
        subtitle: 'Isolated light/dark preview sandbox, verified hex tokens & Markdown comparison table',
        keywords:
          'spenta-web-v2 mmis-intel-dashboards-v2 spenta-dhaka comparison table theme tokens swatches design pov',
        tab: 'Resources',
        focus: { type: 'studio', id: 'theme-comparison' },
      },
    );

    return items;
  }, [
    theme,
    toggleTheme,
    currency,
    investorCalculatorState.fxRate,
    setDataRoomOpen,
    openIntelligenceModal,
    openContactModal,
    openBriefingSection,
  ]);

  const searchTokens = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    const words = q.split(/\s+/).filter(Boolean);
    return Array.from(new Set(words.length > 1 ? [q, ...words] : words));
  }, [query]);

  const results = useMemo(() => {
    const q = normalizeForMatch(query.trim());
    if (!q) {
      return [
        ...index.filter((i) => i.kind === 'Recipe'),
        ...index.filter((i) => i.kind === 'Section').slice(0, 5),
        ...index.filter((i) => i.kind === 'App').slice(0, 3),
        ...index.filter((i) => i.kind === 'Action'),
      ];
    }
    const tokens = q.split(/\s+/).filter(Boolean);
    return index
      .map((item) => {
        const hay = normalizeForMatch(`${item.title} ${item.subtitle} ${item.keywords}`);
        if (!tokens.every((t) => hay.includes(t))) return null;
        const titleLower = normalizeForMatch(item.title);
        let score = 0;
        if (titleLower.startsWith(q)) score += 30;
        else if (titleLower.includes(q)) score += 18;
        if (item.kind === 'App') score += 9;
        if (item.kind === 'Recipe') score += 8;
        if (item.kind === 'Infographic' || item.kind === 'Section') score += 6;
        return { item, score };
      })
      .filter((x): x is { item: SearchEntry; score: number } => x !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((x) => x.item);
  }, [query, index]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, commandPaletteOpen]);

  // Global Cmd+K / Ctrl+K shortcut to open & focus search bar from anywhere in the app
  useEffect(() => {
    const focusInput = () => {
      window.requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
      window.setTimeout(() => {
        if (document.activeElement !== inputRef.current) {
          inputRef.current?.focus();
          inputRef.current?.select();
        }
      }, 20);
    };

    const onGlobalKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        e.stopPropagation();
        if (!commandPaletteOpen) {
          setCommandPaletteOpen(true);
          focusInput();
        } else if (document.activeElement !== inputRef.current) {
          focusInput();
        } else {
          setCommandPaletteOpen(false);
        }
      } else if (e.key === '/' && !commandPaletteOpen) {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName;
        if ((tag && ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) || target?.isContentEditable) {
          return;
        }
        e.preventDefault();
        setCommandPaletteOpen(true);
        focusInput();
      } else if (e.key === 'Escape' && commandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', onGlobalKey, true);
    return () => window.removeEventListener('keydown', onGlobalKey, true);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  useEffect(() => {
    if (commandPaletteOpen) {
      setIsInputFocused(true);
      window.requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setIsInputFocused(false);
      setQuery('');
      recordedCurrentQueryRef.current = null;
    }
  }, [commandPaletteOpen]);

  const handleSelect = (entry: SearchEntry) => {
    if (query.trim()) {
      recordSearchQuery(query);
    }
    if (entry.recipeId) {
      applyRecipe(entry.recipeId);
    } else if (entry.onRun) {
      entry.onRun();
    } else if (entry.tab) {
      navigateToItem(entry.tab, entry.focus);
    }
    setCommandPaletteOpen(false);
    setQuery('');
    recordedCurrentQueryRef.current = null;
  };

  const handleRerunSavedQuery = (savedQuery: string) => {
    recordSearchQuery(savedQuery, true);
    setQuery(savedQuery);
    setActiveIndex(0);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      if (results[activeIndex]) {
        e.preventDefault();
        handleSelect(results[activeIndex]);
      } else if (query.trim()) {
        recordSearchQuery(query);
      }
    } else if (e.key === 'Escape') {
      setCommandPaletteOpen(false);
    }
  };

  const renderKindIcon = (kind: SearchEntry['kind']) => {
    const props = { className: 'w-4 h-4 shrink-0', strokeWidth: 1.5 };
    switch (kind) {
      case 'App':
        return <Layers {...props} className="w-4 h-4 shrink-0 text-emerald-500" />;
      case 'Recipe':
        return <Sparkles {...props} className="w-4 h-4 shrink-0 text-emerald-400" />;
      case 'Infographic':
        return <Image {...props} className="w-4 h-4 shrink-0 text-zinc-400" />;
      case 'Pitch Slide':
        return <Presentation {...props} className="w-4 h-4 shrink-0 text-amber-500" />;
      case 'Core Layer':
      case 'Server Tier':
        return <Cpu {...props} className="w-4 h-4 shrink-0 text-zinc-400" />;
      case 'Blueprint':
        return <Brain {...props} className="w-4 h-4 shrink-0 text-emerald-500" />;
      case 'Case Study':
        return <Building2 {...props} className="w-4 h-4 shrink-0 text-zinc-400" />;
      case 'Action':
        return theme === 'dark' ? (
          <Sun {...props} className="w-4 h-4 shrink-0 text-zinc-400" />
        ) : (
          <Moon {...props} className="w-4 h-4 shrink-0 text-zinc-500" />
        );
      default:
        return <ArrowRight {...props} className="w-4 h-4 shrink-0 text-zinc-400" />;
    }
  };

  if (!commandPaletteOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0B1020]/70 backdrop-blur-xs flex items-start justify-center pt-[8vh] sm:pt-[10vh] px-3 sm:px-6 no-print"
      onClick={() => setCommandPaletteOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Spenta Command Palette"
    >
      <div
        id="global-search-bar-container"
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full md:w-1/2 min-w-[50vw] bg-[#FAF8F4] dark:bg-[#141A32] text-[#16213A] dark:text-[#E7EBF5] rounded-xl border border-[#E4DFD6] dark:border-[#232B4A] shadow-2xl overflow-hidden"
      >
        {/* Search Input Row */}
        <div className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 bg-white dark:bg-[#0F1529] border-b border-[#E4DFD6] dark:border-[#232B4A]">
          <Search className="w-4 h-4 text-[#5F6576] dark:text-[#8E96B0] shrink-0" strokeWidth={1.5} />
          <input
            ref={inputRef}
            autoFocus
            type="text"
            value={query}
            onFocus={() => setIsInputFocused(true)}
            onBlur={(e) => {
              const nextFocus = e.relatedTarget as Node | null;
              if (!nextFocus || !containerRef.current?.contains(nextFocus)) {
                setIsInputFocused(false);
              }
            }}
            onChange={(e) => {
              recordedCurrentQueryRef.current = null;
              setQuery(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Jump to tabs, search 13 modules, apply stack recipes, inspect L1–L6..."
            aria-label="Command Palette Search"
            className="w-full flex-1 min-w-0 bg-transparent text-sm text-[#16213A] dark:text-[#E7EBF5] placeholder:text-[#7B8294] dark:placeholder:text-[#8E96B0] focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                recordedCurrentQueryRef.current = null;
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 text-[#5F6576] hover:text-[#16213A] dark:hover:text-white cursor-pointer"
              aria-label="Clear query"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          )}
          <kbd className="hidden sm:inline-block font-mono text-[10px] text-[#5F6576] dark:text-[#8E96B0] bg-[#F2EFE9] dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] px-1.5 py-0.5 rounded">
            ESC
          </kbd>
        </div>

        {/* Scrollable Dropdown Menu */}
        <div className="max-h-[64vh] overflow-y-auto">
          {/* Focus Dropdown: Popular Searches (5 Curated Investor Topics) */}
          {isInputFocused && !query.trim() && (
            <div
              role="region"
              aria-label="Popular Searches"
              onMouseDown={(e) => e.preventDefault()}
              className="border-b border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#10162B] px-4 py-2.5"
            >
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#5F6576] dark:text-[#8E96B0] mb-2">
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles
                    className="w-3 h-3 text-[#1C6E46] dark:text-[#6FCB9F]"
                    strokeWidth={1.7}
                  />
                  <span>Popular Searches</span>
                </span>
                <span>Investor Topics</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_SEARCH_TOPICS.map((topic) => (
                  <button
                    key={topic.label}
                    type="button"
                    onClick={() => handleRerunSavedQuery(topic.label)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] hover:border-[#1C6E46] dark:hover:border-[#6FCB9F] hover:bg-[#F2EFE9] dark:hover:bg-[#1C2545] text-left transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-medium text-[#16213A] dark:text-[#E7EBF5]">
                      {topic.label}
                    </span>
                    <span className="font-mono text-[10px] text-[#7B8294] dark:text-[#8E96B0]">
                      {topic.hint}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Persistent Recent Searches (Last 5 User Queries Saved Across Sessions) */}
          {!query.trim() && (
            <div
              role="region"
              aria-label="Recent Searches"
              onMouseDown={(e) => e.preventDefault()}
              className="border-b border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#10162B]"
            >
              <div className="px-4 py-1.5 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#5F6576] dark:text-[#8E96B0] border-b border-[#E4DFD6]/70 dark:border-[#232B4A]/70">
                <span>
                  Recent Searches{' '}
                  {recentQueries.length > 0 ? `(Last ${recentQueries.length})` : ''}
                </span>
                {recentQueries.length > 0 && (
                  <button
                    type="button"
                    onClick={() => persistRecentQueries([])}
                    className="text-[10px] font-semibold normal-case tracking-normal text-[#5F6576] dark:text-[#8E96B0] hover:text-[#E11D48] dark:hover:text-rose-400 cursor-pointer"
                  >
                    Clear history
                  </button>
                )}
              </div>
              {recentQueries.length === 0 ? (
                <div className="px-4 py-2 text-[11px] text-[#7B8294] dark:text-[#8E96B0]">
                  No recent queries saved yet — press Enter or select a result to keep your last 5 searches across sessions.
                </div>
              ) : (
                <div className="divide-y divide-[#E4DFD6]/60 dark:divide-[#232B4A]/60">
                  {recentQueries.map((savedQuery) => (
                    <div
                      key={savedQuery}
                      className="px-4 py-2 flex items-center justify-between gap-2 hover:bg-[#F2EFE9] dark:hover:bg-[#1C2545] transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => handleRerunSavedQuery(savedQuery)}
                        className="flex-1 min-w-0 flex items-center gap-2.5 text-left cursor-pointer"
                      >
                        <History
                          className="w-3.5 h-3.5 text-[#1C6E46] dark:text-[#6FCB9F] shrink-0"
                          strokeWidth={1.6}
                        />
                        <span className="text-xs font-medium text-[#16213A] dark:text-[#E7EBF5] truncate">
                          {savedQuery}
                        </span>
                        <span className="text-[10px] font-mono text-[#7B8294] dark:text-[#8E96B0] shrink-0">
                          Re-run
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRecentQuery(savedQuery)}
                        aria-label={`Remove recent query ${savedQuery}`}
                        className="p-1 rounded text-[#7B8294] hover:text-[#16213A] dark:hover:text-white cursor-pointer"
                      >
                        <X className="w-3 h-3" strokeWidth={1.6} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Trending Searches: 5 Most Popular Investor Topics Sorted by Selection Frequency */}
          {!query.trim() && trendingSearches.length > 0 && (
            <div
              role="region"
              aria-label="Trending Searches"
              onMouseDown={(e) => e.preventDefault()}
              className="border-b border-[#E4DFD6] dark:border-[#232B4A] bg-[#F5F2EB] dark:bg-[#0E1426]"
            >
              <div className="px-4 py-1.5 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#5F6576] dark:text-[#8E96B0] border-b border-[#E4DFD6]/70 dark:border-[#232B4A]/70">
                <span className="inline-flex items-center gap-1.5">
                  <TrendingUp
                    className="w-3 h-3 text-[#1C6E46] dark:text-[#6FCB9F]"
                    strokeWidth={1.7}
                  />
                  <span>Trending Searches · Top 5 by Frequency</span>
                </span>
                <button
                  type="button"
                  onClick={() => persistSearchFrequencies({ ...DEFAULT_TRENDING_SEARCHES })}
                  className="text-[10px] font-semibold normal-case tracking-normal text-[#5F6576] dark:text-[#8E96B0] hover:text-[#16213A] dark:hover:text-[#E7EBF5] cursor-pointer"
                >
                  Reset
                </button>
              </div>
              <div className="divide-y divide-[#E4DFD6]/60 dark:divide-[#232B4A]/60">
                {trendingSearches.map((item, rankIdx) => (
                  <button
                    key={item.query.toLowerCase()}
                    type="button"
                    onClick={() => handleRerunSavedQuery(item.query)}
                    className="w-full px-4 py-2 flex items-center justify-between gap-3 text-left hover:bg-[#EAE5DB] dark:hover:bg-[#1C2545] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-4 font-mono text-[10px] font-semibold text-[#7B8294] dark:text-[#8E96B0] shrink-0">
                        #{rankIdx + 1}
                      </span>
                      <TrendingUp
                        className="w-3.5 h-3.5 text-[#1C6E46] dark:text-[#6FCB9F] shrink-0"
                        strokeWidth={1.6}
                      />
                      <span className="text-xs font-medium text-[#16213A] dark:text-[#E7EBF5] truncate">
                        {item.query}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/80 dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] text-[#4A5163] dark:text-[#C8D0E4] shrink-0">
                      {item.count}× selected
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results List */}
          {results.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-xs text-[#5F6576] dark:text-[#8E96B0]">
                No direct portal matches for{' '}
                <strong className="text-[#16213A] dark:text-[#E7EBF5]">&ldquo;{query}&rdquo;</strong>.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (query.trim()) recordSearchQuery(query);
                  setCommandPaletteOpen(false);
                  setAiAssistantOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#1C6E46] hover:bg-[#165838] dark:bg-[#6FCB9F] dark:text-[#0B1020] text-white text-xs font-semibold cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Ask Spenta AI Advisor</span>
              </button>
            </div>
          ) : (
            <div
              role="listbox"
              className="divide-y divide-[#E4DFD6] dark:divide-[#232B4A]"
            >
              {results.map((entry, idx) => {
                const isActive = idx === activeIndex;
                const inStack = entry.appId ? selectedIds.includes(entry.appId) : false;
                const visibleHay = normalizeForMatch(`${entry.title} ${entry.subtitle} ${entry.kind}`);
                const hiddenMatchedTokens = searchTokens.filter(
                  (t) => !t.includes(' ') && !visibleHay.includes(normalizeForMatch(t)),
                );

                return (
                  <div
                    key={entry.id}
                    role="option"
                    aria-selected={isActive}
                    onMouseEnter={() => {
                      setActiveIndex(idx);
                      if (entry.tab) {
                        preloadTabView(entry.tab);
                      }
                    }}
                    onClick={() => handleSelect(entry)}
                    className={`px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-[#F2EFE9] dark:bg-[#1C2545]'
                        : 'bg-transparent hover:bg-[#F2EFE9]/70 dark:hover:bg-[#1C2545]/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {renderKindIcon(entry.kind)}
                      <div className="min-w-0">
                        <div className="text-xs sm:text-[13px] font-medium text-[#16213A] dark:text-[#E7EBF5] truncate">
                          <HighlightText text={entry.title} tokens={searchTokens} />
                        </div>
                        <div className="text-[11px] text-[#5F6576] dark:text-[#8E96B0] truncate mt-0.5 font-mono">
                          <HighlightText text={entry.subtitle} tokens={searchTokens} />
                          {hiddenMatchedTokens.length > 0 && (
                            <span className="ml-1.5">
                              ·{' '}
                              <HighlightText
                                text={hiddenMatchedTokens.join(' · ')}
                                tokens={searchTokens}
                              />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {entry.appId && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleApp(entry.appId!);
                          }}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded font-mono text-[10px] font-semibold border transition-colors cursor-pointer ${
                            inStack
                              ? 'bg-[#1C6E46]/12 dark:bg-[#6FCB9F]/15 text-[#1C6E46] dark:text-[#6FCB9F] border-[#1C6E46]/40 dark:border-[#6FCB9F]/40'
                              : 'bg-white dark:bg-[#0F1529] text-[#4A5163] dark:text-[#C8D0E4] border-[#E4DFD6] dark:border-[#232B4A] hover:border-[#1F3863] dark:hover:border-[#8FA6E8]'
                          }`}
                        >
                          {inStack ? (
                            <Check className="w-3 h-3" strokeWidth={1.5} />
                          ) : (
                            <Plus className="w-3 h-3" strokeWidth={1.5} />
                          )}
                          <span>{inStack ? 'In Stack' : 'Add'}</span>
                        </button>
                      )}
                      <span className="font-mono text-[10px] text-[#7B8294] dark:text-[#8E96B0] uppercase tracking-wider">
                        <HighlightText text={entry.kind} tokens={searchTokens} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Palette Footer */}
        <div className="px-4 py-2 bg-[#F2EFE9] dark:bg-[#0B1020] border-t border-[#E4DFD6] dark:border-[#232B4A] flex items-center justify-between text-[10px] font-mono text-[#5F6576] dark:text-[#8E96B0]">
          <span>
            {query.trim()
              ? `${results.length} matches`
              : 'Quick Navigation · Recent & Trending Searches · 13 Modules'}
          </span>
          <span className="hidden sm:inline">↑↓ Navigate · ↵ Open · ⌘K / Ctrl+K Focus</span>
        </div>
      </div>
    </div>
  );
}
