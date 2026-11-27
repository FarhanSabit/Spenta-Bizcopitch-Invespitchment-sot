import React, { useState } from 'react';
import {
  Activity,
  ArrowUp,
  FolderLock,
  Mail,
  Presentation,
  Share2,
} from 'lucide-react';
import { BRIEFING_CHAPTERS } from '../../../data/unifiedSsotData';
import { useStack } from '../../../store/StackContext';
import { useSsotBriefing } from '../context/SsotBriefingContext';

const RAIL_NODES = [
  { id: 'ssot-hero', num: '00', label: 'Executive Hero & 3D Stack' },
  ...BRIEFING_CHAPTERS.map((ch) => ({
    id: ch.id,
    num: ch.num,
    label: ch.title,
  })),
];

export function SectionNavigator() {
  const { setDataRoomOpen, openIntelligenceModal, openContactModal } = useStack();
  const {
    activeSectionId,
    scrollToSection,
    setShareModalOpen,
    setPitchDeckModalOpen,
  } = useSsotBriefing();

  const [hoveredTooltip, setHoveredTooltip] = useState<{
    label: string;
    y: number;
  } | null>(null);

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
          className="fixed z-40 pointer-events-none px-2.5 py-1.5 rounded-lg bg-[#0B1020] text-white border border-[#22D3EE]/35 text-[11px] font-mono shadow-xl whitespace-nowrap ssot-no-print"
        >
          {hoveredTooltip.label}
        </div>
      )}

      {/* Unified Right-Edge Rail (Progress Nodes + Quick Action Tools) */}
      <aside
        aria-label="SSOT Section Progress & Quick Actions"
        className="ssot-right-rail ssot-no-print hidden md:flex fixed right-3 top-1/2 -translate-y-1/2 z-30 flex-col items-center gap-2 max-h-[calc(100vh-8rem)] overflow-y-auto no-scrollbar py-2 px-1.5 rounded-2xl bg-white/95 dark:bg-[#141A32]/95 border border-[#E4DFD6] dark:border-[#232B4A] shadow-lg"
      >
        {/* Progress Nodes */}
        <div className="flex flex-col items-center gap-1">
          {RAIL_NODES.map((node) => {
            const active = activeSectionId === node.id;
            return (
              <button
                key={node.id}
                type="button"
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
                className={`w-7 h-7 rounded-lg font-mono text-[10px] font-semibold transition-all cursor-pointer flex items-center justify-center ${
                  active
                    ? 'bg-[#1F3863] text-white dark:bg-[#8FA6E8] dark:text-[#0B1020] scale-105'
                    : 'text-[#5F6576] dark:text-[#8E96B0] hover:bg-[#F2EFE9] dark:hover:bg-[#1E2747] hover:text-[#16213A] dark:hover:text-[#E7EBF5]'
                }`}
              >
                {node.num}
              </button>
            );
          })}
        </div>

        <span className="w-5 h-px bg-[#E4DFD6] dark:bg-[#232B4A] shrink-0" />

        {/* Quick-Action Tools */}
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={() => setDataRoomOpen(true)}
            onMouseEnter={(e) =>
              setHoveredTooltip({ label: 'Open Data Room', y: e.clientY })
            }
            onMouseLeave={() => setHoveredTooltip(null)}
            aria-label="Open Data Room"
            className="w-7 h-7 rounded-lg text-[#E11D48] hover:bg-[#E11D48]/10 flex items-center justify-center cursor-pointer transition-colors"
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
            className="w-7 h-7 rounded-lg text-[#1C6E46] dark:text-[#6FCB9F] hover:bg-[#1C6E46]/10 flex items-center justify-center cursor-pointer transition-colors"
          >
            <Activity className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setPitchDeckModalOpen(true)}
            onMouseEnter={(e) =>
              setHoveredTooltip({ label: 'Open Pitch Deck', y: e.clientY })
            }
            onMouseLeave={() => setHoveredTooltip(null)}
            aria-label="Open Pitch Deck"
            className="w-7 h-7 rounded-lg text-[#1F3863] dark:text-[#8FA6E8] hover:bg-[#1F3863]/10 flex items-center justify-center cursor-pointer transition-colors"
          >
            <Presentation className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setShareModalOpen(true)}
            onMouseEnter={(e) =>
              setHoveredTooltip({ label: 'Share Deep Link', y: e.clientY })
            }
            onMouseLeave={() => setHoveredTooltip(null)}
            aria-label="Share Briefing"
            className="w-7 h-7 rounded-lg text-[#5F6576] dark:text-[#8E96B0] hover:bg-[#F2EFE9] dark:hover:bg-[#1E2747] flex items-center justify-center cursor-pointer transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => openContactModal()}
            onMouseEnter={(e) =>
              setHoveredTooltip({ label: 'Contact Founders', y: e.clientY })
            }
            onMouseLeave={() => setHoveredTooltip(null)}
            aria-label="Contact Founders"
            className="w-7 h-7 rounded-lg text-[#5F6576] dark:text-[#8E96B0] hover:bg-[#F2EFE9] dark:hover:bg-[#1E2747] flex items-center justify-center cursor-pointer transition-colors"
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
            className="w-7 h-7 rounded-lg text-[#5F6576] dark:text-[#8E96B0] hover:bg-[#F2EFE9] dark:hover:bg-[#1E2747] flex items-center justify-center cursor-pointer transition-colors"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>
    </>
  );
}
