import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useStack } from '../../store/StackContext';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  readonly [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionInstanceLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstanceLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

interface VoiceNavigatorButtonProps {
  onJumpToChapter?: (chapterId: string) => void;
}

export function VoiceNavigatorButton({ onJumpToChapter }: VoiceNavigatorButtonProps) {
  const {
    setActiveTab,
    setCurrency,
    setDrawerOpen,
    setDataRoomOpen,
    openIntelligenceModal,
    openContactModal,
    openBriefingSection,
    setAutoNotice,
  } = useStack();

  const [listening, setListening] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstanceLike | null>(null);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore stop errors on unmount
      }
    };
  }, []);

  const executeSpokenCommand = (rawTranscript: string) => {
    const q = rawTranscript.trim().toLowerCase();
    if (!q) return;

    const jumpChapter = (id: string, label: string) => {
      if (onJumpToChapter) {
        onJumpToChapter(id);
      } else {
        openBriefingSection(id);
      }
      setStatusMessage(`Navigated to ${label}`);
      setAutoNotice(`Voice Navigator: jumped to ${label}`);
    };

    if (q.includes('data room') || q.includes('diligence')) {
      setDataRoomOpen(true);
      setStatusMessage('Opened Data Room');
    } else if (q.includes('contact') || q.includes('term sheet') || q.includes('founder')) {
      openContactModal('Voice Inquiry — Seed SAFE Term Sheet');
      setStatusMessage('Opened Founder Contact');
    } else if (q.includes('intelligence') || q.includes('sentiment') || q.includes('feedback')) {
      openIntelligenceModal();
      setStatusMessage('Opened Investor Intelligence');
    } else if (q.includes('stack') || q.includes('composer')) {
      setDrawerOpen(true);
      setStatusMessage('Opened Stack Composer');
    } else if (q.includes('bdt') || q.includes('taka')) {
      setCurrency('BDT');
      setStatusMessage('Switched currency to BDT');
    } else if (q.includes('usd') || q.includes('dollar')) {
      setCurrency('USD');
      setStatusMessage('Switched currency to USD');
    } else if (q.includes('unit economics') || q.includes('nine tier') || q.includes('9 tier')) {
      jumpChapter('ssot-unit-economics', '9-Tier Unit Economics');
    } else if (q.includes('globe') || q.includes('dual shore') || q.includes('dhaka')) {
      jumpChapter('ssot-dual-shore', 'Dual-Shore 3D Globe');
    } else if (q.includes('case stud') || q.includes('prime bank') || q.includes('samsung')) {
      jumpChapter('ssot-case-studies', 'Verified Case Studies');
    } else if (q.includes('safe') || q.includes('terms') || q.includes('allocation')) {
      jumpChapter('ssot-safe-terms', 'Seed SAFE Terms');
    } else if (q.includes('fusion') || q.includes('layer')) {
      jumpChapter('ssot-fusion-stack', '6-Layer Fusion Stack');
    } else if (q.includes('financial') || q.includes('calculator') || q.includes('roi')) {
      setActiveTab('Financials');
      setStatusMessage('Switched to Financials');
    } else if (q.includes('core')) {
      setActiveTab('Spenta Core');
      setStatusMessage('Switched to Spenta Core');
    } else if (q.includes('brain')) {
      setActiveTab('The Brain');
      setStatusMessage('Switched to The Brain');
    } else if (q.includes('vault') || q.includes('apps')) {
      setActiveTab('App Vault');
      setStatusMessage('Switched to App Vault');
    } else if (q.includes('pitch') || q.includes('deck')) {
      setActiveTab('Pitch Deck');
      setStatusMessage('Switched to Pitch Deck');
    } else {
      setStatusMessage(`Heard "${rawTranscript}" — try "Unit Economics", "Data Room", or "Financials"`);
    }
  };

  const handleToggleVoice = () => {
    if (listening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      setListening(false);
      return;
    }

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setStatusMessage('Browser voice recognition unavailable — use Chapter Jump buttons or ⌘K.');
      window.setTimeout(() => setStatusMessage(null), 4500);
      return;
    }

    try {
      const recognition = new Ctor();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript ?? '';
        executeSpokenCommand(transcript);
      };
      recognition.onerror = () => {
        setListening(false);
        setStatusMessage('Microphone permission denied or unavailable.');
        window.setTimeout(() => setStatusMessage(null), 4000);
      };
      recognition.onend = () => {
        setListening(false);
      };
      recognitionRef.current = recognition;
      recognition.start();
      setListening(true);
      setStatusMessage('Listening… say "Unit Economics", "Data Room", or "Dual-Shore Globe"');
    } catch {
      setListening(false);
      setStatusMessage('Unable to start browser voice navigation.');
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={handleToggleVoice}
        aria-pressed={listening}
        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
          listening
            ? 'bg-[#E11D48] text-white border-[#E11D48]'
            : 'bg-white dark:bg-[#141A32] border-[#E4DFD6] dark:border-[#232B4A] text-[#16213A] dark:text-[#E7EBF5] hover:border-[#1F3863] dark:hover:border-[#8FA6E8]'
        }`}
        title="Client-side Web Speech voice navigation"
      >
        {listening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
        <span>{listening ? 'Stop Voice' : 'Voice Nav'}</span>
      </button>

      {statusMessage && (
        <div
          role="status"
          aria-live="polite"
          className="absolute right-0 top-full mt-2 z-30 w-72 p-2.5 rounded-lg bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] shadow-lg text-[11px] text-[#16213A] dark:text-[#E7EBF5]"
        >
          {statusMessage}
        </div>
      )}
    </div>
  );
}
