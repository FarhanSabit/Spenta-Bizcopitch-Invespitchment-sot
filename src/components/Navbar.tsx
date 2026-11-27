import React, { useCallback, useState } from 'react';
import {
  ArrowUpRight,
  Contrast,
  FolderLock,
  Grid3x3,
  Layers,
  Menu,
  Moon,
  Search,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { NAV_TABS, NavTab } from '../data/spentaManifest';
import { useTheme } from '../context/ThemeContext';
import { useStack } from '../store/StackContext';
import { SpentaLogo } from './SpentaLogo';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import {
  getPanelPreloadHandlers,
  preloadTabView,
} from '../utils/viewPreloaders';

const PITCH_DECK_DESCRIPTION =
  'Pitch Deck: Interactive 18-slide investor presentation covering the $500K Seed SAFE round, L1–L6 sovereign AI architecture, 5-year financials, and 16:9 PDF export';

const DATA_ROOM_DESCRIPTION =
  'Data Room: Open confidential investor due diligence vault containing the Seed SAFE Memo, 5-Year Financial Model, Architecture Security Whitepaper, Cap Table, and Client Audit Reports';

const NAV_TAB_DESCRIPTIONS: Record<NavTab, string> = {
  'App Vault':
    'App Vault: Compose verified sovereign AI, ERP, fintech, and spatial XR stacks across 13 modules, explore the 3D Neural Core, and manage offline IndexedDB storage',
  'Investor Briefing':
    'Investor Briefing: Master Single Source of Truth covering the Dual-Engine thesis, $500K Seed SAFE terms, client deployments, and Q&A diligence',
  Infographics:
    'Infographics: Visual architecture blueprints, L1–L6 kernel data flows, deployment topologies, and sovereign enterprise moat comparisons',
  Financials:
    'Financials: Interactive 5-year P&L model, Seed SAFE investor ROI and MOIC calculator, 9-tier unit economics, and print-ready report',
  'Spenta Core':
    'Spenta Core: Technical specification of the L1–L6 sovereign AI kernel, air-gapped server tiers (T1–T4), and compliance controls',
  'The Brain':
    'The Brain: Interactive neural architecture graph mapping Spenta operational hubs, multi-agent orchestration, and data pipelines',
  'Pitch Deck': PITCH_DECK_DESCRIPTION,
  Resources:
    'Resources: Technical whitepapers, compliance briefs, brand assets, founder inquiry form, and investor feedback workspace',
};

export function Navbar() {
  const {
    theme,
    paletteMode,
    isHighContrastLight,
    toggleTheme,
    toggleHighContrastLight,
  } = useTheme();
  const {
    activeTab,
    setActiveTab,
    selectedIds,
    drawerOpen,
    setDrawerOpen,
    setCommandPaletteOpen,
    setAiAssistantOpen,
    setDataRoomOpen,
    mobileGridVisible,
    toggleMobileGrid,
    navigateToInvestorBriefing,
  } = useStack();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handlePreloadTab = useCallback(
    (tab: NavTab) => {
      if (tab !== activeTab) {
        preloadTabView(tab);
      }
    },
    [activeTab],
  );

  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 h-14 bg-[#FAF8F4]/92 dark:bg-[#0B1020]/92 backdrop-blur-md text-[#16213A] dark:text-[#E7EBF5] border-b border-[#E4DFD6] dark:border-[#232B4A] transition-colors no-print">
      <div className="max-w-[1440px] mx-auto px-3 sm:px-5 h-full flex items-center justify-between gap-2">
        {/* Zone 1: Brand Wordmark */}
        <button
          type="button"
          onMouseEnter={() => handlePreloadTab('App Vault')}
          onFocus={() => handlePreloadTab('App Vault')}
          onTouchStart={() => handlePreloadTab('App Vault')}
          onClick={() => handleSelectTab('App Vault')}
          className="flex items-center gap-2 shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3863] dark:focus-visible:ring-[#8FA6E8] rounded-md"
          aria-label="Spenta Sovereign OS Home — return to the App Vault module catalog"
          title="Return to App Vault home view"
        >
          <SpentaLogo className="h-7" tone={theme === 'dark' ? 'dark-bg' : 'light-bg'} />
        </button>

        {/* Zone 2: 8 Clean Single-Line Navigation Tabs */}
        <nav
          aria-label="Primary portal navigation"
          className="hidden lg:flex items-center gap-0.5 overflow-x-auto no-scrollbar min-w-0"
        >
          {NAV_TABS.map((tab) => {
            const active = activeTab === tab;
            const description = NAV_TAB_DESCRIPTIONS[tab];
            return (
              <button
                key={tab}
                type="button"
                aria-current={active ? 'page' : undefined}
                aria-label={description}
                title={description}
                onMouseEnter={() => handlePreloadTab(tab)}
                onFocus={() => handlePreloadTab(tab)}
                onTouchStart={() => handlePreloadTab(tab)}
                onClick={() => handleSelectTab(tab)}
                className={`relative whitespace-nowrap shrink-0 px-1.5 xl:px-2 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  active
                    ? 'text-[#0F172A] dark:text-[#E7EBF5] bg-[#EAE5DB] dark:bg-[#141A32] font-semibold'
                    : 'text-[#475569] dark:text-[#8E96B0] hover:text-[#0F172A] dark:hover:text-[#E7EBF5] hover:bg-[#F2EFE9]/80 dark:hover:bg-[#141A32]/70'
                }`}
              >
                {tab}
                {active && (
                  <span className="absolute inset-x-2 -bottom-[11px] h-[2px] bg-[#1F3863] dark:bg-[#8FA6E8] rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Master SSOT CTA + Data Room + Sync Status + Command Search + Theme Switchers + Stack Composer */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            {...getPanelPreloadHandlers('ssot-briefing')}
            onClick={() => navigateToInvestorBriefing()}
            aria-label="Launch Investor Master SSOT interactive briefing at /investor-briefing"
            title="Open the standalone SPENTA Investor Master SSOT briefing (/investor-briefing)"
            className="hidden sm:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-[#1F3863] hover:bg-[#162848] dark:bg-[#8FA6E8] dark:hover:bg-[#A6B9F0] text-white dark:text-[#0B1020] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <span className="hidden 2xl:inline">Launch Investor Master SSOT</span>
            <span className="hidden xl:inline 2xl:hidden">Investor Master SSOT</span>
            <span className="xl:hidden">Investor SSOT</span>
            <ArrowUpRight className="w-3.5 h-3.5 shrink-0" strokeWidth={1.85} />
          </button>

          <button
            type="button"
            {...getPanelPreloadHandlers('data-room')}
            onClick={() => setDataRoomOpen(true)}
            aria-label={DATA_ROOM_DESCRIPTION}
            title={DATA_ROOM_DESCRIPTION}
            className="hidden sm:inline-flex items-center gap-1.5 h-8 px-2 rounded-md bg-[#F2EFE9] dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] hover:border-[#1C6E46] dark:hover:border-[#6FCB9F] text-[#16213A] dark:text-[#E7EBF5] text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <FolderLock className="w-3.5 h-3.5 text-[#1C6E46] dark:text-[#6FCB9F] shrink-0" strokeWidth={1.65} />
            <span className="hidden xl:inline">Data Room</span>
          </button>

          <div className="hidden md:flex items-center shrink-0">
            <SyncStatusIndicator />
          </div>

          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="inline-flex items-center justify-between gap-1.5 h-9 sm:h-8 px-2 sm:w-32 md:w-36 lg:w-20 xl:w-28 2xl:w-36 rounded-md bg-[#F2EFE9] dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] hover:border-[#1F3863] dark:hover:border-[#8FA6E8] text-[#4A5163] dark:text-[#C8D0E4] text-xs transition-colors cursor-pointer whitespace-nowrap min-w-0"
            aria-label="Open Command Palette (Cmd+K)"
            title="Search apps, tabs, recipes, L1–L6… (⌘K)"
          >
            <span className="inline-flex items-center gap-1.5 min-w-0">
              <Search className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
              <span className="hidden xl:inline truncate text-[#5F6576] dark:text-[#8E96B0]">
                Search…
              </span>
            </span>
            <kbd className="hidden sm:inline-block shrink-0 font-mono text-[10px] text-[#5F6576] dark:text-[#8E96B0] bg-white dark:bg-[#0B1020] border border-[#E4DFD6] dark:border-[#232B4A] px-1.5 py-0.5 rounded leading-none">
              ⌘K
            </kbd>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            aria-pressed={paletteMode === 'nocturnal'}
            className="inline-flex items-center justify-center gap-1.5 h-9 sm:h-8 px-2 rounded-md bg-[#F2EFE9] dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] hover:border-[#1F3863] dark:hover:border-[#8FA6E8] text-[#16213A] dark:text-[#E7EBF5] text-xs font-medium transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            aria-label={
              paletteMode === 'nocturnal'
                ? 'Switch from Dark mode to Stone paper theme'
                : 'Switch from Stone light theme to Nocturnal Dark mode'
            }
            title={
              paletteMode === 'nocturnal'
                ? 'Nocturnal Dark active — click for Stone paper theme'
                : 'Click to toggle Nocturnal Dark / Stone paper theme'
            }
          >
            {paletteMode === 'nocturnal' ? (
              <Sun className="w-3.5 h-3.5 text-[#8FA6E8]" strokeWidth={1.75} />
            ) : (
              <Moon className="w-3.5 h-3.5 text-[#1F3863]" strokeWidth={1.75} />
            )}
          </button>

          <button
            type="button"
            onClick={toggleHighContrastLight}
            aria-pressed={isHighContrastLight}
            aria-label={
              isHighContrastLight
                ? 'Disable High-Contrast Light presentation mode and return to previous theme'
                : 'Enable High-Contrast Light presentation mode for investor briefings'
            }
            title={
              isHighContrastLight
                ? 'High-Contrast Light presentation mode active — click to restore previous theme'
                : 'Switch from Dark or Stone default to High-Contrast Light presentation mode for investor briefings'
            }
            className={`inline-flex items-center justify-center gap-1.5 h-9 sm:h-8 px-2 rounded-md border text-xs font-semibold transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
              isHighContrastLight
                ? 'bg-[#09090B] text-white border-[#09090B]'
                : 'bg-[#F2EFE9] dark:bg-[#141A32] border-[#E4DFD6] dark:border-[#232B4A] hover:border-[#1F3863] dark:hover:border-[#8FA6E8] text-[#16213A] dark:text-[#E7EBF5]'
            }`}
          >
            <Contrast className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
            <span className="hidden xl:inline">Light</span>
          </button>

          <button
            type="button"
            {...getPanelPreloadHandlers('stack-composer')}
            onClick={() => setDrawerOpen(!drawerOpen)}
            aria-expanded={drawerOpen}
            aria-label={`Stack Composer: Open selected module drawer (${selectedIds.length} modules selected) to review dependencies, server sizing, and architecture exports`}
            title={`Stack Composer (${selectedIds.length} selected): Inspect integration links, required T1–T4 server hardware, and cost breakdown`}
            className="inline-flex items-center gap-1.5 h-9 sm:h-8 px-2.5 sm:px-3 rounded-md bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Layers className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
            <span className="hidden sm:inline">Stack Composer</span>
            <span className="sm:hidden">Stack</span>
            <span className="font-mono tabular-nums bg-black/25 px-1.5 py-0.5 rounded text-[11px] leading-none">
              {selectedIds.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-md text-[#16213A] dark:text-[#E7EBF5] hover:bg-[#F2EFE9] dark:hover:bg-[#141A32] transition-colors cursor-pointer shrink-0"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="w-4 h-4" strokeWidth={1.75} />
            ) : (
              <Menu className="w-4 h-4" strokeWidth={1.75} />
            )}
          </button>
        </div>
      </div>

      {/* Responsive Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] px-4 py-3.5 space-y-3 shadow-xl">
          <button
            type="button"
            {...getPanelPreloadHandlers('ssot-briefing')}
            onClick={() => {
              setMobileMenuOpen(false);
              navigateToInvestorBriefing();
            }}
            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-[#1F3863] hover:bg-[#162848] dark:bg-[#8FA6E8] dark:hover:bg-[#A6B9F0] text-white dark:text-[#0B1020] text-xs font-semibold cursor-pointer"
          >
            <span>Launch Investor Master SSOT</span>
            <ArrowUpRight className="w-4 h-4 shrink-0" strokeWidth={1.85} />
          </button>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {NAV_TABS.map((tab) => {
              const active = activeTab === tab;
              const description = NAV_TAB_DESCRIPTIONS[tab];
              return (
                <button
                  key={tab}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  aria-label={description}
                  title={description}
                  onMouseEnter={() => handlePreloadTab(tab)}
                  onFocus={() => handlePreloadTab(tab)}
                  onTouchStart={() => handlePreloadTab(tab)}
                  onClick={() => handleSelectTab(tab)}
                  className={`min-h-[44px] px-3 py-2.5 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#1F3863] dark:bg-[#8FA6E8] text-white dark:text-[#0B1020] font-semibold'
                      : 'bg-white dark:bg-[#141A32] text-[#0F172A] dark:text-[#C8D0E4] hover:border-[#1F3863] dark:hover:border-[#8FA6E8] border border-[#DCD6CA] dark:border-[#232B4A]'
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {/* High-Contrast Presentation Mode Switch (Mobile Drawer) */}
          <div className="pt-2.5 border-t border-[#E4DFD6] dark:border-[#232B4A]">
            <button
              type="button"
              onClick={toggleHighContrastLight}
              role="switch"
              aria-checked={isHighContrastLight}
              aria-label={
                isHighContrastLight
                  ? 'Disable High-Contrast Light presentation mode and return to previous theme'
                  : 'Enable High-Contrast Light presentation mode for investor briefings'
              }
              title="Toggle high-contrast light presentation mode optimized for boardroom projectors and investor briefings"
              className="w-full min-h-[44px] flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] hover:border-[#1F3863] dark:hover:border-[#8FA6E8] transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2 text-left min-w-0">
                <Contrast className="w-4 h-4 shrink-0 text-[#1F3863] dark:text-[#8FA6E8]" strokeWidth={1.75} />
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5]">
                    High-Contrast Presentation Light
                  </span>
                  <span className="block text-[10px] font-mono text-[#5F6576] dark:text-[#8E96B0] truncate">
                    {isHighContrastLight
                      ? 'Active — crisp white & ink contrast for briefings'
                      : 'Switch from Dark/Stone to presentation light'}
                  </span>
                </span>
              </span>
              <span
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                  isHighContrastLight
                    ? 'bg-[#09090B]'
                    : 'bg-[#CFC8BC] dark:bg-[#2A355A]'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                    isHighContrastLight ? 'translate-x-4.5' : 'translate-x-1'
                  }`}
                />
              </span>
            </button>
          </div>

          {/* Mobile Sync Status & Force Sync */}
          <div className="md:hidden pt-2.5 border-t border-[#E4DFD6] dark:border-[#232B4A]">
            <SyncStatusIndicator compact />
          </div>

          {/* Mobile-only Display Density Setting for .bg-obsidian-grid */}
          <div className="md:hidden pt-2.5 border-t border-[#E4DFD6] dark:border-[#232B4A]">
            <button
              type="button"
              onClick={toggleMobileGrid}
              role="switch"
              aria-checked={mobileGridVisible}
              className="w-full min-h-[44px] flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] hover:border-[#1F3863] dark:hover:border-[#8FA6E8] transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2 text-left min-w-0">
                <Grid3x3
                  className={`w-4 h-4 shrink-0 ${
                    mobileGridVisible
                      ? 'text-[#1C6E46] dark:text-[#6FCB9F]'
                      : 'text-[#5F6576] dark:text-[#8E96B0]'
                  }`}
                  strokeWidth={1.75}
                />
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5]">
                    Swiss Architectural Grid
                  </span>
                  <span className="block text-[10px] font-mono text-[#5F6576] dark:text-[#8E96B0] truncate">
                    {mobileGridVisible
                      ? 'Active on mobile (.bg-obsidian-grid)'
                      : 'Hidden on mobile for clean density'}
                  </span>
                </span>
              </span>
              <span
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                  mobileGridVisible
                    ? 'bg-[#1C6E46] dark:bg-[#6FCB9F]'
                    : 'bg-[#CFC8BC] dark:bg-[#2A355A]'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white dark:bg-[#0B1020] transition-transform ${
                    mobileGridVisible ? 'translate-x-4.5' : 'translate-x-1'
                  }`}
                />
              </span>
            </button>
          </div>

          <div className="pt-2.5 border-t border-[#E4DFD6] dark:border-[#232B4A] flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              {...getPanelPreloadHandlers('data-room')}
              onClick={() => {
                setMobileMenuOpen(false);
                setDataRoomOpen(true);
              }}
              aria-label={DATA_ROOM_DESCRIPTION}
              title={DATA_ROOM_DESCRIPTION}
              className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] text-xs font-medium text-[#16213A] dark:text-[#E7EBF5] cursor-pointer"
            >
              <FolderLock className="w-3.5 h-3.5 text-[#1C6E46] dark:text-[#6FCB9F]" strokeWidth={1.5} />
              <span>Data Room</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setCommandPaletteOpen(true);
              }}
              aria-label="Command Search: Open Cmd+K launcher to jump across apps, tabs, recipes, and L1–L6 layers"
              title="Open Command Palette (⌘K)"
              className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] text-xs font-medium text-[#16213A] dark:text-[#E7EBF5] cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Command Search</span>
            </button>
            <button
              type="button"
              {...getPanelPreloadHandlers('ai-assistant')}
              onClick={() => {
                setMobileMenuOpen(false);
                setAiAssistantOpen(true);
              }}
              aria-label="AI Advisor: Open Spenta executive diligence assistant for architecture and Seed SAFE Q&A"
              title="Open Spenta AI Advisor"
              className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-[#1C6E46]/12 dark:bg-[#6FCB9F]/15 border border-[#1C6E46]/35 dark:border-[#6FCB9F]/35 text-xs font-semibold text-[#1C6E46] dark:text-[#6FCB9F] cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>AI Advisor</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
