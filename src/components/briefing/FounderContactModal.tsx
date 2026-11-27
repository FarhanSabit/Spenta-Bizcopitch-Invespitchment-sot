import React, { useEffect, useState } from 'react';
import { Check, Copy, Mail, Send, Trash2, X } from 'lucide-react';
import { SPENTA_CONTACT_EMAIL } from '../../data/spentaManifest';
import { useStack } from '../../store/StackContext';
import { copyTextWithFallback } from '../../utils/shareUrlCodec';

const CHECK_SIZE_OPTIONS = [
  '$25K – $50K (Angel)',
  '$100K – $250K (Syndicate / Micro-VC)',
  '$250K – $500K (Lead Seed SAFE)',
  'Enterprise Pilot / Strategic Partnership',
];

export function FounderContactModal() {
  const {
    contactModalOpen,
    contactModalTopic,
    closeContactModal,
    contactInquiries,
    submitContactInquiry,
    deleteContactInquiry,
    selectedApps,
  } = useStack();

  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState(contactModalTopic);
  const [checkSize, setCheckSize] = useState(CHECK_SIZE_OPTIONS[1]);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setTopic(contactModalTopic);
  }, [contactModalTopic]);

  useEffect(() => {
    if (!contactModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeContactModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [contactModalOpen, closeContactModal]);

  if (!contactModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!name.trim() || !email.trim() || !email.includes('@')) {
      setErrorMsg('Please provide your name and a valid email address.');
      return;
    }
    const saved = await submitContactInquiry({
      name,
      organization: organization || 'Independent Investor',
      email,
      topic,
      checkSize,
      message:
        message.trim() ||
        `Interested in ${topic}. Active portal modules reviewed: ${selectedApps.map((a) => a.shortName).join(', ')}.`,
    });
    setSavedNotice(`Saved offline inquiry "${saved.topic}" to IndexedDB.`);
    setMessage('');
    window.setTimeout(() => setSavedNotice(null), 4000);
  };

  const buildInquiryText = (inq: {
    name: string;
    organization: string;
    email: string;
    topic: string;
    checkSize: string;
    message: string;
  }) =>
    [
      `Topic: ${inq.topic}`,
      `From: ${inq.name} (${inq.organization}) <${inq.email}>`,
      `Allocation / Scope: ${inq.checkSize}`,
      '',
      inq.message,
    ].join('\n');

  const handleCopyInquiry = async (id: string, text: string) => {
    await copyTextWithFallback(text);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 2000);
  };

  const mailtoHref = `mailto:${SPENTA_CONTACT_EMAIL}?subject=${encodeURIComponent(
    `[Spenta Seed SAFE] ${topic}`,
  )}&body=${encodeURIComponent(
    buildInquiryText({
      name: name || 'Investor Partner',
      organization: organization || 'Fund / Enterprise',
      email: email || '',
      topic,
      checkSize,
      message: message || 'Requesting the Seed SAFE term sheet and founder walkthrough.',
    }),
  )}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="spenta-contact-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#0B1020]/70 no-print"
      onClick={closeContactModal}
    >
      <div
        className="w-full max-w-3xl max-h-[88vh] flex flex-col rounded-2xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] flex items-center justify-between gap-4">
          <div>
            <h2
              id="spenta-contact-modal-title"
              className="text-base sm:text-lg font-bold text-[#16213A] dark:text-[#E7EBF5]"
            >
              Direct Founder &amp; Term-Sheet Inquiry
            </h2>
            <p className="text-xs text-[#5F6576] dark:text-[#8E96B0]">
              Saved locally to IndexedDB for zero-server reliability · Optional email handoff to {SPENTA_CONTACT_EMAIL}
            </p>
          </div>
          <button
            type="button"
            onClick={closeContactModal}
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-[#5F6576] dark:text-[#8E96B0] hover:bg-[#F2EFE9] dark:hover:bg-[#1E2747] transition-colors cursor-pointer"
            aria-label="Close Founder Contact Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            {errorMsg && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-[#E11D48]/10 border border-[#E11D48]/35 text-xs font-medium text-[#BE123C] dark:text-[#FDA4AF]"
              >
                {errorMsg}
              </div>
            )}
            {savedNotice && (
              <div
                role="status"
                className="p-3 rounded-lg bg-[#1C6E46]/12 border border-[#1C6E46]/35 text-xs font-medium text-[#1C6E46] dark:text-[#6FCB9F]"
              >
                {savedNotice}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <label className="space-y-1 block">
                <span className="text-xs font-medium text-[#16213A] dark:text-[#E7EBF5]">
                  Full Name
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Chen"
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] text-sm text-[#16213A] dark:text-[#E7EBF5] focus:outline-none focus:border-[#1F3863] dark:focus:border-[#8FA6E8]"
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-xs font-medium text-[#16213A] dark:text-[#E7EBF5]">
                  Organization / Fund
                </span>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="Pacific DeepTech Ventures"
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] text-sm text-[#16213A] dark:text-[#E7EBF5] focus:outline-none focus:border-[#1F3863] dark:focus:border-[#8FA6E8]"
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-xs font-medium text-[#16213A] dark:text-[#E7EBF5]">
                  Work Email
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@fund.vc"
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] text-sm text-[#16213A] dark:text-[#E7EBF5] focus:outline-none focus:border-[#1F3863] dark:focus:border-[#8FA6E8]"
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-xs font-medium text-[#16213A] dark:text-[#E7EBF5]">
                  Allocation / Engagement Band
                </span>
                <select
                  value={checkSize}
                  onChange={(e) => setCheckSize(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] text-sm text-[#16213A] dark:text-[#E7EBF5] focus:outline-none focus:border-[#1F3863] dark:focus:border-[#8FA6E8]"
                >
                  {CHECK_SIZE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="space-y-1 block">
              <span className="text-xs font-medium text-[#16213A] dark:text-[#E7EBF5]">
                Inquiry Topic
              </span>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] text-sm text-[#16213A] dark:text-[#E7EBF5] focus:outline-none focus:border-[#1F3863] dark:focus:border-[#8FA6E8]"
              />
            </label>

            <label className="space-y-1 block">
              <span className="text-xs font-medium text-[#16213A] dark:text-[#E7EBF5]">
                Due Diligence Questions or Notes
              </span>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Share questions on SAFE cap mechanics, on-prem GPU sizing, or pilot timelines…"
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] text-sm text-[#16213A] dark:text-[#E7EBF5] focus:outline-none focus:border-[#1F3863] dark:focus:border-[#8FA6E8]"
              />
            </label>

            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
              <a
                href={mailtoHref}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] text-xs font-medium text-[#16213A] dark:text-[#E7EBF5] hover:border-[#1F3863] dark:hover:border-[#8FA6E8] transition-colors whitespace-nowrap"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Open in Email Client</span>
              </a>

              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Save Inquiry Offline</span>
              </button>
            </div>
          </form>

          {/* Saved Offline Inquiries */}
          <div className="pt-4 border-t border-[#E4DFD6] dark:border-[#232B4A] space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5]">
                Saved Offline Inquiries ({contactInquiries.length})
              </h3>
              <span className="text-[11px] font-mono text-[#5F6576] dark:text-[#8E96B0]">
                IndexedDB Local Vault
              </span>
            </div>

            {contactInquiries.length === 0 ? (
              <p className="text-xs text-[#5F6576] dark:text-[#8E96B0] py-2">
                No saved drafts yet. Submit the form above to archive a founder inquiry locally for offline meetings.
              </p>
            ) : (
              <div className="space-y-2">
                {contactInquiries.map((inq) => (
                  <div
                    key={inq.id}
                    className="p-3 rounded-xl bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5] truncate">
                        {inq.topic}
                      </div>
                      <div className="text-[11px] text-[#5F6576] dark:text-[#8E96B0] truncate">
                        {inq.name} · {inq.organization} · {inq.checkSize}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => void handleCopyInquiry(inq.id, buildInquiryText(inq))}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#E4DFD6] dark:border-[#232B4A] text-[11px] font-medium text-[#16213A] dark:text-[#E7EBF5] hover:border-[#1F3863] cursor-pointer"
                      >
                        {copiedId === inq.id ? <Check className="w-3 h-3 text-[#1C6E46]" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedId === inq.id ? 'Copied' : 'Copy'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteContactInquiry(inq.id)}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-md text-[#5F6576] hover:text-[#E11D48] cursor-pointer"
                        aria-label={`Delete inquiry ${inq.topic}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
