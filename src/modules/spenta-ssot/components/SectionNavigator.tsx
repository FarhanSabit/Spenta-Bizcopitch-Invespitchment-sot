import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  ArrowUp,
  Check,
  FolderLock,
  Link2,
  Mail,
  MessageSquarePlus,
  Presentation,
  Printer,
  Share2,
  Sliders,
} from 'lucide-react';
import { BRIEFING_CHAPTERS } from '../../../data/unifiedSsotData';
import { useStack } from '../../../store/StackContext';
import {
  SENTIMENT_FILTER_MAP,
  SentimentMood,
  useSsotBriefing,
  useSsotSentiment,
} from '../context/SsotBriefingContext';
import { buildInvestorBriefingShareUrl, copyTextWithFallback } from '../../../utils/shareUrlCodec';

const RAIL_NODES = [
  { id: 'ssot-hero', num: '00', label: 'Executive Hero & 3D Stack' },
  ...BRIEFING_CHAPTERS.map((ch) => ({
    id: ch.id,
    num: ch.num,
    label: ch.title,
  })),
];

export function SectionNavigator() {
  const {
    currency,
    personaTrack,
    investorCalculatorState,
    setAutoNotice,
    setDataRoomOpen,
    openIntelligenceModal,
    openContactModal,
  } = useStack();
  const {
    activeSectionId,
    scrollProgressPct,
    scrollToSection,
    fusionViewMode,
    sessionSid,
    setShareModalOpen,
    setPitchDeckModalOpen,
  } = useSsotBriefing();
  const { sentimentMood, setSentimentMood, avgSentiment } = useSsotSentiment();

  const [hoveredTooltip, setHoveredTooltip] = useState<{
    label: string;
    y: number;
  } | null>(null);
  const [sentimentOpen, setSentimentOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const handleCopyDeepLink = async () => {
    const deepLinkUrl = buildInvestorBriefingShareUrl({
      section: activeSectionId,
      persona: personaTrack,
      scenario: investorCalculatorState.scenario,
      currency,
      view: fusionViewMode,
      sid: sessionSid,
    });
    const ok = await copyTextWithFallback(deepLinkUrl);
    if (ok) {
      setCopiedLink(true);
      setAutoNotice(
        `Copied briefing link (${activeSectionId} · ${personaTrack} · ${investorCalculatorState.scenario})`,
      );
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => {
        setCopiedLink(false);
      }, 2200);
    } else {
      setShareModalOpen(true);
    }
  };

  return (
    <>
      {/* Cursor-following temporary section tooltip */}
      {hoveredTooltip && (
        <div
          role="tooltip"
          style={{
            top: Math.max(68, Math.min(window.innerHeight - 48, hoveredTooltip.y - 14)),
            right: '4.5rem',
          }}
          className="fixed z-[80] pointer-events-none px-2.5 py-1.5 rounded-lg bg-[#05070B] text-white border border-cyan-400/35 text-[11px] font-mono shadow-xl whitespace-nowrap ssot-no-print"
        >
          {hoveredTooltip.label}
        </div>
      )}

      {/* Sentiment Mood HUD Popover */}
      {sentimentOpen && (
        <>
          <div
            className="fixed inset-0 z-[74] ssot-no-print"
            onClick={() => setSentimentOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-label="Investor Sentiment Visual Calibration"
            className="fixed right-16 bottom-24 z-[78] w-72 rounded-2xl bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-2xl p-3.5 space-y-2.5 ssot-no-print"
          >
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-slate-900 dark:text-white">
                Sentiment Filter
              </span>
              <span className="tabular-nums text-emerald-700 dark:text-emerald-400 font-semibold">
                Avg {avgSentiment}/5
              </span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {(Object.keys(SENTIMENT_FILTER_MAP) as SentimentMood[]).map((moodKey) => {
                const info = SENTIMENT_FILTER_MAP[moodKey];
                const active = sentimentMood === moodKey;
                return (
                  <button
                    key={moodKey}
                    type="button"
                    onClick={() => {
                      setSentimentMood(moodKey);
                      setSentimentOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg border transition-colors cursor-pointer ${
                      active
                        ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-800 dark:text-cyan-300'
                        : 'bg-slate-50 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <div className="text-[11px] font-mono font-bold">{info.label}</div>
                    <div className="text-[10px] opacity-85 leading-snug mt-0.5">
                      {info.summary}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Unified Right-Edge Rail (Progress Nodes + Vertical Spine + Quick Action Tools) */}
      <aside
        id="section-navigator-rail"
        aria-label="SSOT Section Progress & Quick Actions"
        className="ssot-right-rail ssot-no-print hidden md:flex fixed right-[max(0.5rem,env(safe-area-inset-right))] lg:right-3 xl:right-4 top-[max(4.75rem,calc(env(safe-area-inset-top)+4.5rem))] bottom-[max(5rem,calc(env(safe-area-inset-bottom)+4.5rem))] z-[75] flex-col items-center justify-center pointer-events-none"
      >
        <div className="pointer-events-auto flex flex-col items-center gap-1.5 max-h-full overflow-y-auto overscroll-contain no-scrollbar py-2 px-1.5 rounded-2xl bg-white/92 dark:bg-slate-950/92 backdrop-blur-xl border border-slate-200 dark:border-slate-800/90 shadow-xl">
          {/* Tabular Scroll Progress Readout */}
          <span
            aria-label={`Scroll progress ${scrollProgressPct} percent`}
            className="text-[9px] font-mono font-bold tabular-nums text-cyan-700 dark:text-cyan-400 px-1 py-0.5 select-none"
          >
            {scrollProgressPct}%
          </span>

          {/* Progress Nodes over Vertical Spine */}
          <div className="relative flex flex-col items-center gap-1">
            <div
              aria-hidden="true"
              className="absolute top-2 bottom-2 w-0.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden pointer-events-none"
            >
              <div
                style={{ height: `${scrollProgressPct}%` }}
                className="w-full bg-gradient-to-b from-cyan-400 via-sky-500 to-teal-400 transition-[height] duration-100"
              />
            </div>

            {RAIL_NODES.map((node) => {
              const active = activeSectionId === node.id;
              return (
                <button
                  key={node.id}
                  type="button"
                  data-testid={`section-navigator-node-${node.id}`}
                  onClick={() => scrollToSection(node.id)}
                  onMouseEnter={(e) =>
                    setHoveredTooltip({ label: node.label, y: e.clientY })
                  }
                  onMouseMove={(e) =>
                    setHoveredTooltip({ label: node.label, y: e.clientY })
                  }
                  onMouseLeave={() => setHoveredTooltip(null)}
                  aria-label={`Jump to ${node.label}`}
                  aria-current={active ? 'location' : undefined}
                  className={`relative z-10 w-6 h-6 xl:w-[26px] xl:h-[26px] rounded-lg font-mono text-[10px] transition-all duration-200 ease-out transform-gpu hover:scale-[1.18] focus-visible:scale-[1.18] active:scale-95 cursor-pointer flex items-center justify-center shrink-0 border ${
                    active
                      ? 'ssot-rail-node-glow bg-cyan-500/20 border-cyan-500 text-cyan-900 dark:text-cyan-200 dark:border-cyan-400 font-bold'
                      : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold hover:border-cyan-500/60 hover:text-slate-900 dark:hover:text-white hover:shadow-sm'
                  }`}
                >
                  {node.num}
                </button>
              );
            })}
          </div>

          <span className="w-6 h-px bg-slate-200 dark:bg-slate-800 shrink-0" />

          {/* Quick-Action Tools */}
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => setSentimentOpen((v) => !v)}
              onMouseEnter={(e) =>
                setHoveredTooltip({
                  label: `Sentiment: ${SENTIMENT_FILTER_MAP[sentimentMood].label}`,
                  y: e.clientY,
                })
              }
              onMouseLeave={() => setHoveredTooltip(null)}
              aria-label="Sentiment Visual Filter"
              className={`w-6 h-6 xl:w-[26px] xl:h-[26px] rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
                sentimentOpen
                  ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'
                  : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setDataRoomOpen(true)}
              onMouseEnter={(e) =>
                setHoveredTooltip({ label: 'Open Data Room', y: e.clientY })
              }
              onMouseLeave={() => setHoveredTooltip(null)}
              aria-label="Open Data Room"
              className="w-6 h-6 xl:w-[26px] xl:h-[26px] rounded-lg text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 flex items-center justify-center cursor-pointer transition-colors"
            >
              <FolderLock className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => openIntelligenceModal()}
              onMouseEnter={(e) =>
                setHoveredTooltip({ label: 'Investor Intelligence (D3)', y: e.clientY })
              }
              onMouseLeave={() => setHoveredTooltip(null)}
              aria-label="Investor Intelligence"
              className="w-6 h-6 xl:w-[26px] xl:h-[26px] rounded-lg text-cyan-700 dark:text-cyan-400 hover:bg-cyan-500/10 flex items-center justify-center cursor-pointer transition-colors"
            >
              <Activity className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setPitchDeckModalOpen(true)}
              onMouseEnter={(e) =>
                setHoveredTooltip({ label: 'Open 12-Slide Pitch Deck', y: e.clientY })
              }
              onMouseLeave={() => setHoveredTooltip(null)}
              aria-label="Open Pitch Deck"
              className="w-6 h-6 xl:w-[26px] xl:h-[26px] rounded-lg text-[#1F3863] dark:text-[#8FA6E8] hover:bg-[#1F3863]/10 flex items-center justify-center cursor-pointer transition-colors"
            >
              <Presentation className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              data-testid="section-navigator-copy-link"
              onClick={() => void handleCopyDeepLink()}
              onMouseEnter={(e) =>
                setHoveredTooltip({
                  label: copiedLink
                    ? 'Copied Briefing Link!'
                    : `Copy Link (${activeSectionId} · ${personaTrack} · ${investorCalculatorState.scenario})`,
                  y: e.clientY,
                })
              }
              onMouseMove={(e) =>
                setHoveredTooltip({
                  label: copiedLink
                    ? 'Copied Briefing Link!'
                    : `Copy Link (${activeSectionId} · ${personaTrack} · ${investorCalculatorState.scenario})`,
                  y: e.clientY,
                })
              }
              onMouseLeave={() => setHoveredTooltip(null)}
              aria-label="Copy Link"
              title="Copy Link with active section, persona, and scenario"
              className={`w-6 h-6 xl:w-[26px] xl:h-[26px] rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
                copiedLink
                  ? 'bg-[#1C6E46] text-white dark:bg-[#6FCB9F] dark:text-[#0B1020]'
                  : 'text-[#0891B2] dark:text-[#22D3EE] hover:bg-[#0891B2]/10 dark:hover:bg-[#22D3EE]/10'
              }`}
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              onMouseEnter={(e) =>
                setHoveredTooltip({ label: 'Share Deep Link Options', y: e.clientY })
              }
              onMouseLeave={() => setHoveredTooltip(null)}
              aria-label="Share Briefing"
              className="w-6 h-6 xl:w-[26px] xl:h-[26px] rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 flex items-center justify-center cursor-pointer transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              onMouseEnter={(e) =>
                setHoveredTooltip({ label: 'Print Clean PDF Briefing', y: e.clientY })
              }
              onMouseLeave={() => setHoveredTooltip(null)}
              aria-label="Print Briefing"
              className="w-6 h-6 xl:w-[26px] xl:h-[26px] rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 flex items-center justify-center cursor-pointer transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => scrollToSection('ssot-feedback-widget')}
              onMouseEnter={(e) =>
                setHoveredTooltip({ label: 'Leave Diligence Feedback', y: e.clientY })
              }
              onMouseLeave={() => setHoveredTooltip(null)}
              aria-label="Leave Feedback"
              className="w-6 h-6 xl:w-[26px] xl:h-[26px] rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 flex items-center justify-center cursor-pointer transition-colors"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => openContactModal()}
              onMouseEnter={(e) =>
                setHoveredTooltip({ label: 'Contact Founders', y: e.clientY })
              }
              onMouseLeave={() => setHoveredTooltip(null)}
              aria-label="Contact Founders"
              className="w-6 h-6 xl:w-[26px] xl:h-[26px] rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 flex items-center justify-center cursor-pointer transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => scrollToSection('ssot-hero')}
              onMouseEnter={(e) =>
                setHoveredTooltip({ label: 'Scroll to Top', y: e.clientY })
              }
              onMouseLeave={() => setHoveredTooltip(null)}
              aria-label="Scroll to Top"
              className="w-6 h-6 xl:w-[26px] xl:h-[26px] rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 flex items-center justify-center cursor-pointer transition-colors"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
