import React, { useState } from 'react';
import {
  Activity,
  ArrowLeft,
  ChevronDown,
  Compass,
  FolderLock,
  Menu,
  Moon,
  Presentation,
  Search,
  Share2,
  Sun,
  Wrench,
  X,
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { useStack } from '../../../store/StackContext';
import { SpentaLogo } from '../../../components/SpentaLogo';
import { SyncStatusIndicator } from '../../../components/SyncStatusIndicator';
import { useSsotBriefing } from '../context/SsotBriefingContext';
import { getPanelPreloadHandlers } from '../../../utils/viewPreloaders';

const QUICK_SECTION_LINKS = [
  { id: 'ssot-hero', label: 'Executive' },
  { id: 'ssot-dual-engine', label: '01 Thesis' },
  { id: 'ssot-fusion-stack', label: '02 Fusion L1–L6' },
  { id: 'ssot-case-studies', label: '04 Proof' },
  { id: 'ssot-unit-economics', label: '05 Economics' },
  { id: 'ssot-safe-terms', label: '09 SAFE' },
];

export function SsotNavbar() {
  const { theme, paletteMode, toggleTheme } = useTheme();
  const {
    currency,
    setCurrency,
    exitInvestorBriefing,
    setDataRoomOpen,
    openIntelligenceModal,
    openContactModal,
    setCommandPaletteOpen,
  } = useStack();
  const {
    activeSectionId,
    scrollToSection,
    setShareModalOpen,
    setOnboardingModalOpen,
    setPitchDeckModalOpen,
  } = useSsotBriefing();

  const [toolsOpen, setToolsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleReturnToMainApp = () => {
    setMobileMenuOpen(false);
    setToolsOpen(false);
    exitInvestorBriefing();
  };

  return (
    <header className="sticky top-0 z-40 h-14 bg-[#FAF8F4]/95 dark:bg-[#0B1020]/95 backdrop-blur-md border-b border-[#E4DFD6] dark:border-[#232B4A] ssot-no-print">
      <div className="max-w-[1520px] mx-auto px-3 sm:px-5 h-full flex items-center justify-between gap-2">
        {/* Left: Back to Main App CTA + Brand */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={handleReturnToMainApp}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-[#F2EFE9] dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] hover:border-[#1F3863] dark:hover:border-[#8FA6E8] text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title="Return to main Spentech Pitching WebApp"
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Back to Spentech Pitching WebApp</span>
            <span className="sm:hidden">Back</span>
          </button>

          <span className="hidden md:inline-block h-4 w-px bg-[#CFC8BC] dark:bg-[#232B4A] shrink-0" />

          <button
            type="button"
            onClick={() => scrollToSection('ssot-hero')}
            className="hidden md:flex items-center gap-2 shrink-0 cursor-pointer"
            aria-label="Spenta Investor Master SSOT top"
          >
            <SpentaLogo className="h-6" tone={theme === 'dark' ? 'dark-bg' : 'light-bg'} />
            <span className="text-[11px] font-mono font-semibold text-[#1C6E46] dark:text-[#6FCB9F] whitespace-nowrap">
              MASTER SSOT
            </span>
          </button>
        </div>

        {/* Center: Smooth In-Page Section Links (#section-id without resetting route) */}
        <nav
          aria-label="Investor Master SSOT Sections"
          className="hidden xl:flex items-center gap-1 overflow-x-auto no-scrollbar min-w-0"
        >
          {QUICK_SECTION_LINKS.map((item) => {
            const active = activeSectionId === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection(item.id);
                }}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-[#EAE5DB] dark:bg-[#141A32] text-[#16213A] dark:text-[#E7EBF5] font-semibold'
                    : 'text-[#5F6576] dark:text-[#8E96B0] hover:text-[#16213A] dark:hover:text-[#E7EBF5]'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Right: SyncStatusIndicator, Currency, Tools Overflow Menu (1024px-1679px), Full Tool Strip (1680px+), Theme */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="hidden md:flex items-center">
            <SyncStatusIndicator />
          </div>

          {/* Currency Switcher */}
          <div
            role="group"
            aria-label="SSOT Currency"
            className="hidden sm:inline-flex rounded-lg bg-[#F2EFE9] dark:bg-[#141A32] p-0.5 border border-[#E4DFD6] dark:border-[#232B4A]"
          >
            {(['USD', 'BDT'] as const).map((cur) => (
              <button
                key={cur}
                type="button"
                aria-pressed={currency === cur}
                onClick={() => setCurrency(cur)}
                className={`px-2 py-1 rounded text-[11px] font-mono font-semibold cursor-pointer transition-colors ${
                  currency === cur
                    ? 'bg-[#1F3863] text-white dark:bg-[#8FA6E8] dark:text-[#0B1020]'
                    : 'text-[#5F6576] dark:text-[#8E96B0]'
                }`}
              >
                {cur}
              </button>
            ))}
          </div>

          {/* Wide Desktop (>= 1680px / min-[1680px]): Direct Tool Buttons */}
          <div className="hidden min-[1680px]:flex items-center gap-1.5">
            <button
              type="button"
              {...getPanelPreloadHandlers('data-room')}
              onClick={() => setDataRoomOpen(true)}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              <FolderLock className="w-3.5 h-3.5" />
              <span>Data Room</span>
            </button>
            <button
              type="button"
              {...getPanelPreloadHandlers('investor-intelligence')}
              onClick={() => openIntelligenceModal()}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5] hover:border-[#1F3863] cursor-pointer whitespace-nowrap"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Intelligence</span>
            </button>
            <button
              type="button"
              onClick={() => setPitchDeckModalOpen(true)}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5] hover:border-[#1F3863] cursor-pointer whitespace-nowrap"
            >
              <Presentation className="w-3.5 h-3.5" />
              <span>Pitch Deck</span>
            </button>
            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5] hover:border-[#1F3863] cursor-pointer whitespace-nowrap"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
            <button
              type="button"
              onClick={() => setOnboardingModalOpen(true)}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5] hover:border-[#1F3863] cursor-pointer whitespace-nowrap"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Guided Tour</span>
            </button>
          </div>

          {/* Compact Laptop / Desktop (1024px–1679px): Responsive Tools Overflow Menu */}
          <div className="relative hidden lg:block min-[1680px]:hidden">
            <button
              type="button"
              aria-expanded={toolsOpen}
              onClick={() => setToolsOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-[#1F3863] dark:bg-[#8FA6E8] text-white dark:text-[#0B1020] text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Tools</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {toolsOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setToolsOpen(false)}
                  aria-hidden="true"
                />
                <div className="absolute right-0 mt-2 w-56 z-50 rounded-xl bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] shadow-2xl p-1.5 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setToolsOpen(false);
                      setDataRoomOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[#16213A] dark:text-[#E7EBF5] hover:bg-[#F2EFE9] dark:hover:bg-[#1E2747] cursor-pointer text-left"
                  >
                    <FolderLock className="w-3.5 h-3.5 text-[#E11D48]" />
                    <span>Confidential Data Room</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setToolsOpen(false);
                      openIntelligenceModal();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[#16213A] dark:text-[#E7EBF5] hover:bg-[#F2EFE9] dark:hover:bg-[#1E2747] cursor-pointer text-left"
                  >
                    <Activity className="w-3.5 h-3.5 text-[#1C6E46] dark:text-[#6FCB9F]" />
                    <span>Investor Intelligence (D3)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setToolsOpen(false);
                      setPitchDeckModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[#16213A] dark:text-[#E7EBF5] hover:bg-[#F2EFE9] dark:hover:bg-[#1E2747] cursor-pointer text-left"
                  >
                    <Presentation className="w-3.5 h-3.5 text-[#1F3863] dark:text-[#8FA6E8]" />
                    <span>Interactive Pitch Deck</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setToolsOpen(false);
                      setShareModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[#16213A] dark:text-[#E7EBF5] hover:bg-[#F2EFE9] dark:hover:bg-[#1E2747] cursor-pointer text-left"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share Briefing Deep Link</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setToolsOpen(false);
                      setOnboardingModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[#16213A] dark:text-[#E7EBF5] hover:bg-[#F2EFE9] dark:hover:bg-[#1E2747] cursor-pointer text-left"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Diligence Guided Tour</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setToolsOpen(false);
                      openContactModal();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[#16213A] dark:text-[#E7EBF5] hover:bg-[#F2EFE9] dark:hover:bg-[#1E2747] cursor-pointer text-left"
                  >
                    <span className="font-mono text-[11px] font-bold">@</span>
                    <span>Contact Founders</span>
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="inline-flex items-center justify-center gap-1 h-8 px-2 rounded-lg bg-[#F2EFE9] dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] hover:border-[#1F3863] text-xs font-mono text-[#16213A] dark:text-[#E7EBF5] cursor-pointer"
            aria-label="Open OmniSearch (Cmd+K)"
            title="OmniSearch (⌘K)"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">⌘K</span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#F2EFE9] dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] hover:border-[#1F3863] cursor-pointer"
            aria-label="Toggle Light/Dark theme"
          >
            {paletteMode === 'nocturnal' ? (
              <Sun className="w-3.5 h-3.5 text-[#8FA6E8]" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-[#1F3863]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="lg:hidden inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#F2EFE9] dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] text-[#16213A] dark:text-[#E7EBF5] cursor-pointer"
            aria-label="Toggle mobile briefing menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#FAF8F4] dark:bg-[#0F1529] border-b border-[#E4DFD6] dark:border-[#232B4A] px-4 py-3 space-y-3 shadow-xl">
          <button
            type="button"
            onClick={handleReturnToMainApp}
            className="w-full min-h-[42px] inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#1F3863] dark:bg-[#8FA6E8] text-white dark:text-[#0B1020] text-xs font-semibold cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>← Back to Spentech Pitching WebApp</span>
          </button>

          <SyncStatusIndicator compact />

          <div className="grid grid-cols-2 gap-1.5">
            {QUICK_SECTION_LINKS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  setMobileMenuOpen(false);
                  scrollToSection(item.id);
                }}
                className="px-3 py-2 rounded-lg bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] text-xs font-medium text-[#16213A] dark:text-[#E7EBF5]"
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-[#E4DFD6] dark:border-[#232B4A]">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setDataRoomOpen(true);
              }}
              className="px-3 py-2 rounded-lg bg-[#E11D48] text-white text-xs font-semibold cursor-pointer"
            >
              Data Room
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setPitchDeckModalOpen(true);
              }}
              className="px-3 py-2 rounded-lg bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5] cursor-pointer"
            >
              Pitch Deck
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                openIntelligenceModal();
              }}
              className="px-3 py-2 rounded-lg bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5] cursor-pointer"
            >
              Intelligence
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setShareModalOpen(true);
              }}
              className="px-3 py-2 rounded-lg bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5] cursor-pointer"
            >
              Share Link
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
