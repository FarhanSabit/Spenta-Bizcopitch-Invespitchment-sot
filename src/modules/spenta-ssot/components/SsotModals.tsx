import React, { Suspense, useEffect, useState } from 'react';
import { Check, Compass, Copy, Download, Loader2, Presentation, Share2, X } from 'lucide-react';
import {
  BRIEFING_CHAPTERS,
  INVESTOR_PERSONA_TRACKS,
} from '../../../data/unifiedSsotData';
import { useStack } from '../../../store/StackContext';
import { copyTextWithFallback } from '../../../utils/shareUrlCodec';
import { lazyWithRetry } from '../../../utils/lazyWithRetry';
import { useSsotBriefing } from '../context/SsotBriefingContext';

const PitchDeckView = lazyWithRetry(() =>
  import('../../../components/PitchDeckView').then((m) => ({ default: m.PitchDeckView })),
);

export function ShareBriefingModal() {
  const { currency, personaTrack, investorCalculatorState } = useStack();
  const {
    shareModalOpen,
    setShareModalOpen,
    shareUrl,
    activeSectionId,
    fusionViewMode,
    sessionSid,
  } = useSsotBriefing();

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!shareModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShareModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shareModalOpen, setShareModalOpen]);

  if (!shareModalOpen) return null;

  const handleCopy = async () => {
    const ok = await copyTextWithFallback(shareUrl);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ssot-share-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1020]/70 ssot-no-print"
      onClick={() => setShareModalOpen(false)}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Share2 className="w-4 h-4 text-[#1F3863] dark:text-[#8FA6E8]" />
            <h2
              id="ssot-share-modal-title"
              className="text-sm font-bold text-[#16213A] dark:text-[#E7EBF5]"
            >
              Share Briefing Deep Link
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setShareModalOpen(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5F6576] hover:bg-[#F2EFE9] dark:hover:bg-[#1E2747] cursor-pointer"
            aria-label="Close share dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-[#5F6576] dark:text-[#8E96B0] leading-relaxed">
            Anyone opening this URL lands directly on <span className="font-mono">/investor-briefing</span> with your active section, persona track, scenario, currency, and Fusion Stack inspection depth restored automatically.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono">
            <div className="p-2.5 rounded-lg bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A]">
              <span className="block text-[#5F6576] dark:text-[#8E96B0]">section</span>
              <span className="font-semibold text-[#16213A] dark:text-[#E7EBF5]">{activeSectionId}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A]">
              <span className="block text-[#5F6576] dark:text-[#8E96B0]">persona</span>
              <span className="font-semibold text-[#16213A] dark:text-[#E7EBF5]">{personaTrack}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A]">
              <span className="block text-[#5F6576] dark:text-[#8E96B0]">scenario</span>
              <span className="font-semibold text-[#16213A] dark:text-[#E7EBF5]">
                {investorCalculatorState.scenario}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A]">
              <span className="block text-[#5F6576] dark:text-[#8E96B0]">currency</span>
              <span className="font-semibold text-[#16213A] dark:text-[#E7EBF5]">{currency}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A]">
              <span className="block text-[#5F6576] dark:text-[#8E96B0]">view</span>
              <span className="font-semibold text-[#16213A] dark:text-[#E7EBF5]">{fusionViewMode}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A]">
              <span className="block text-[#5F6576] dark:text-[#8E96B0]">sid</span>
              <span className="font-semibold text-[#16213A] dark:text-[#E7EBF5]">{sessionSid}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] font-mono text-xs text-[#16213A] dark:text-[#E7EBF5]"
            />
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1F3863] dark:bg-[#8FA6E8] text-white dark:text-[#0B1020] text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied URL' : 'Copy Link'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OnboardingWizardModal() {
  const { currency, setCurrency, personaTrack, setPersonaTrack } = useStack();
  const {
    onboardingModalOpen,
    setOnboardingModalOpen,
    scrollToSection,
    setFusionViewMode,
  } = useSsotBriefing();

  useEffect(() => {
    if (!onboardingModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOnboardingModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onboardingModalOpen, setOnboardingModalOpen]);

  if (!onboardingModalOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ssot-onboarding-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1020]/70 ssot-no-print"
      onClick={() => setOnboardingModalOpen(false)}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#1C6E46] dark:text-[#6FCB9F]" />
            <h2
              id="ssot-onboarding-title"
              className="text-sm font-bold text-[#16213A] dark:text-[#E7EBF5]"
            >
              Investor Diligence Guided Setup
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setOnboardingModalOpen(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5F6576] hover:bg-[#F2EFE9] dark:hover:bg-[#1E2747] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5]">
              1. Choose Your Diligence Persona
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {INVESTOR_PERSONA_TRACKS.map((track) => (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => setPersonaTrack(track.id)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                    personaTrack === track.id
                      ? 'bg-[#1F3863] text-white border-[#1F3863] dark:bg-[#8FA6E8] dark:text-[#0B1020]'
                      : 'bg-white dark:bg-[#141A32] border-[#E4DFD6] dark:border-[#232B4A]'
                  }`}
                >
                  <div className="text-xs font-bold">{track.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5]">
              2. Display Currency &amp; Architecture Depth
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(['USD', 'BDT'] as const).map((cur) => (
                <button
                  key={cur}
                  type="button"
                  onClick={() => setCurrency(cur)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold cursor-pointer ${
                    currency === cur
                      ? 'bg-[#1C6E46] text-white border-[#1C6E46] dark:bg-[#6FCB9F] dark:text-[#0B1020]'
                      : 'bg-white dark:bg-[#141A32] border-[#E4DFD6] dark:border-[#232B4A]'
                  }`}
                >
                  {cur}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setFusionViewMode('deep-dive');
                  setOnboardingModalOpen(false);
                  scrollToSection('ssot-fusion-stack');
                }}
                className="px-3 py-1.5 rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] text-xs font-semibold cursor-pointer"
              >
                Open L1–L6 Technical Deep-Dive
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5]">
              3. Jump Straight to Key Chapter
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {BRIEFING_CHAPTERS.slice(0, 6).map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => {
                    setOnboardingModalOpen(false);
                    scrollToSection(ch.id);
                  }}
                  className="px-3 py-2 rounded-lg bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] hover:border-[#1F3863] text-left text-xs font-medium cursor-pointer truncate"
                >
                  {ch.num}. {ch.shortTitle}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PitchDeckModal() {
  const {
    pitchDeckModalOpen,
    setPitchDeckModalOpen,
    exportingOneClickSummary,
    triggerOneClickSummary,
  } = useSsotBriefing();

  useEffect(() => {
    if (!pitchDeckModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPitchDeckModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pitchDeckModalOpen, setPitchDeckModalOpen]);

  if (!pitchDeckModalOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ssot-pitchdeck-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-[#0B1020]/75 ssot-no-print"
      onClick={() => setPitchDeckModalOpen(false)}
    >
      <div
        className="w-full max-w-6xl max-h-[92vh] flex flex-col rounded-2xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Presentation className="w-4 h-4 text-[#1F3863] dark:text-[#8FA6E8]" />
            <h2
              id="ssot-pitchdeck-modal-title"
              className="text-sm font-bold text-[#16213A] dark:text-[#E7EBF5]"
            >
              Spenta Master Investor Pitch Deck (Interactive &amp; Exportable)
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={exportingOneClickSummary}
              onClick={() => void triggerOneClickSummary()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1F3863] dark:bg-[#8FA6E8] text-white dark:text-[#0B1020] text-xs font-semibold cursor-pointer disabled:opacity-60"
            >
              {exportingOneClickSummary ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{exportingOneClickSummary ? 'Exporting…' : 'Export SSOT Brief'}</span>
            </button>
            <button
              type="button"
              onClick={() => setPitchDeckModalOpen(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5F6576] hover:bg-[#F2EFE9] dark:hover:bg-[#1E2747] cursor-pointer"
              aria-label="Close pitch deck modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <Suspense
            fallback={
              <div className="h-64 flex items-center justify-center text-xs font-mono text-[#5F6576] dark:text-[#8E96B0]">
                Loading Interactive Pitch Deck…
              </div>
            }
          >
            <PitchDeckView />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
