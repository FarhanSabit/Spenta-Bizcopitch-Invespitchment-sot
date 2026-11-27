import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Bookmark,
  Check,
  Copy,
  FileText,
  FolderLock,
  Printer,
  Search,
  X,
} from 'lucide-react';
import {
  DATA_ROOM_DOCUMENTS,
  DataRoomDocument,
  UNIFIED_SAFE_TERMS,
  formatSsotCurrency,
} from '../../data/unifiedSsotData';
import { useStack } from '../../store/StackContext';
import { copyTextWithFallback } from '../../utils/shareUrlCodec';

type CategoryFilter = 'All' | DataRoomDocument['category'] | 'Bookmarked';

export function DataRoomModal() {
  const {
    dataRoomOpen,
    setDataRoomOpen,
    bookmarkedDocIds,
    toggleDocBookmark,
    navigateToItem,
    openBriefingSection,
    openContactModal,
    currency,
    investorCalculatorState,
  } = useStack();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('All');
  const [copiedMemo, setCopiedMemo] = useState(false);

  useEffect(() => {
    if (!dataRoomOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDataRoomOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dataRoomOpen, setDataRoomOpen]);

  const filteredDocs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DATA_ROOM_DOCUMENTS.filter((doc) => {
      if (category === 'Bookmarked' && !bookmarkedDocIds.includes(doc.id)) return false;
      if (category !== 'All' && category !== 'Bookmarked' && doc.category !== category) {
        return false;
      }
      if (!q) return true;
      const haystack = `${doc.code} ${doc.title} ${doc.category} ${doc.summary} ${doc.keywords}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [query, category, bookmarkedDocIds]);

  if (!dataRoomOpen) return null;

  const fx = investorCalculatorState.fxRate;

  const handleOpenDocument = (doc: DataRoomDocument) => {
    setDataRoomOpen(false);
    if (doc.targetTab === 'Investor Briefing' && doc.targetSectionId) {
      openBriefingSection(doc.targetSectionId);
    } else {
      navigateToItem(doc.targetTab);
    }
  };

  const handleCopyExecutiveMemo = async () => {
    const lines = [
      'SPENTA SOVEREIGN OS & INTELLIGENT REALITY — EXECUTIVE DATA ROOM BRIEF',
      `Instrument: ${UNIFIED_SAFE_TERMS.instrument}`,
      `Raise Target: ${formatSsotCurrency(UNIFIED_SAFE_TERMS.raiseUsd, currency, fx)} (${UNIFIED_SAFE_TERMS.impliedOwnershipPct}% pre-dilution @ ${formatSsotCurrency(UNIFIED_SAFE_TERMS.postMoneyCapUsd, currency, fx)} post-money cap · ${UNIFIED_SAFE_TERMS.discountPct}% discount)`,
      `Dual-Shore Edge: San Jose / Australia Front-Office + 20-FTE Dhaka R&D Hub ($${UNIFIED_SAFE_TERMS.dhakaHourlyLoadedUsd}/hr loaded)`,
      `Active FX Rate: 1 USD = ${fx.toFixed(2)} BDT`,
      '',
      'Data Room Index:',
      ...DATA_ROOM_DOCUMENTS.map((d) => `- [${d.code}] ${d.title} (${d.category})`),
    ];
    await copyTextWithFallback(lines.join('\n'));
    setCopiedMemo(true);
    window.setTimeout(() => setCopiedMemo(false), 2200);
  };

  const categories: CategoryFilter[] = [
    'All',
    'Financials',
    'Architecture',
    'Commercial Proof',
    'Legal & Terms',
    'Bookmarked',
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="spenta-dataroom-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#0B1020]/70 no-print"
      onClick={() => setDataRoomOpen(false)}
    >
      <div
        className="w-full max-w-4xl max-h-[88vh] flex flex-col rounded-2xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#1F3863]/10 dark:bg-[#8FA6E8]/15 flex items-center justify-center shrink-0">
              <FolderLock className="w-4 h-4 text-[#1F3863] dark:text-[#8FA6E8]" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <h2
                id="spenta-dataroom-title"
                className="text-base sm:text-lg font-bold text-[#16213A] dark:text-[#E7EBF5] truncate"
              >
                Investor Due Diligence Data Room
              </h2>
              <p className="text-xs text-[#5F6576] dark:text-[#8E96B0] truncate">
                {DATA_ROOM_DOCUMENTS.length} verified dossiers · {bookmarkedDocIds.length} bookmarked offline
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void handleCopyExecutiveMemo()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] text-xs font-medium text-[#16213A] dark:text-[#E7EBF5] hover:border-[#1F3863] dark:hover:border-[#8FA6E8] transition-colors cursor-pointer whitespace-nowrap"
            >
              {copiedMemo ? <Check className="w-3.5 h-3.5 text-[#1C6E46] dark:text-[#6FCB9F]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedMemo ? 'Memo Copied' : 'Copy Brief'}</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E4DFD6] dark:border-[#232B4A] bg-[#FAF8F4] dark:bg-[#0F1529] text-xs font-medium text-[#16213A] dark:text-[#E7EBF5] hover:border-[#1F3863] dark:hover:border-[#8FA6E8] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={() => setDataRoomOpen(false)}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-[#5F6576] dark:text-[#8E96B0] hover:bg-[#F2EFE9] dark:hover:bg-[#1E2747] transition-colors cursor-pointer"
              aria-label="Close Data Room"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="px-5 py-3.5 border-b border-[#E4DFD6] dark:border-[#232B4A] space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#5F6576] dark:text-[#8E96B0] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search SAFE terms, Prime Bank ROI, L1–L6 contracts, 9-tier unit economics…"
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] text-sm text-[#16213A] dark:text-[#E7EBF5] placeholder:text-[#8A90A0] focus:outline-none focus:border-[#1F3863] dark:focus:border-[#8FA6E8]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((cat) => {
              const active = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-[#1F3863] text-white dark:bg-[#8FA6E8] dark:text-[#0B1020]'
                      : 'bg-[#F2EFE9] dark:bg-[#141A32] text-[#5F6576] dark:text-[#8E96B0] hover:text-[#16213A] dark:hover:text-[#E7EBF5]'
                  }`}
                >
                  {cat === 'Bookmarked' ? `Bookmarked (${bookmarkedDocIds.length})` : cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
          {filteredDocs.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <FileText className="w-8 h-8 mx-auto text-[#8A90A0]" strokeWidth={1.5} />
              <div className="text-sm font-semibold text-[#16213A] dark:text-[#E7EBF5]">
                No matching data room dossiers
              </div>
              <p className="text-xs text-[#5F6576] dark:text-[#8E96B0]">
                Clear your search query or switch back to All Categories to inspect the full diligence index.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setCategory('All');
                }}
                className="mt-2 px-3.5 py-2 rounded-lg bg-[#1F3863] text-white dark:bg-[#8FA6E8] dark:text-[#0B1020] text-xs font-semibold cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            filteredDocs.map((doc) => {
              const isBookmarked = bookmarkedDocIds.includes(doc.id);
              return (
                <div
                  key={doc.id}
                  className="p-4 rounded-xl bg-white dark:bg-[#141A32] border border-[#E4DFD6] dark:border-[#232B4A] hover:border-[#1F3863]/50 dark:hover:border-[#8FA6E8]/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-[#5F6576] dark:text-[#8E96B0] font-mono tabular-nums">
                      <span className="font-semibold text-[#1F3863] dark:text-[#8FA6E8]">
                        {doc.code}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{doc.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{doc.format}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-[#16213A] dark:text-[#E7EBF5]">
                      {doc.title}
                    </h3>
                    <p className="text-xs text-[#5F6576] dark:text-[#8E96B0] leading-relaxed">
                      {doc.summary}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleDocBookmark(doc.id)}
                      aria-pressed={isBookmarked}
                      className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-colors cursor-pointer ${
                        isBookmarked
                          ? 'bg-[#1C6E46]/12 border-[#1C6E46]/40 text-[#1C6E46] dark:bg-[#6FCB9F]/15 dark:border-[#6FCB9F]/40 dark:text-[#6FCB9F]'
                          : 'border-[#E4DFD6] dark:border-[#232B4A] text-[#5F6576] dark:text-[#8E96B0] hover:text-[#16213A] dark:hover:text-[#E7EBF5]'
                      }`}
                      title={isBookmarked ? 'Remove offline bookmark' : 'Bookmark for due diligence'}
                      aria-label={isBookmarked ? `Remove bookmark for ${doc.title}` : `Bookmark ${doc.title}`}
                    >
                      <Bookmark
                        className="w-4 h-4"
                        fill={isBookmarked ? 'currentColor' : 'none'}
                        strokeWidth={1.75}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenDocument(doc)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1F3863] hover:bg-[#162848] dark:bg-[#8FA6E8] dark:hover:bg-[#A6B9F0] text-white dark:text-[#0B1020] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <span>Open in {doc.targetTab}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer CTA */}
        <div className="px-5 py-3.5 border-t border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-[#5F6576] dark:text-[#8E96B0] font-mono tabular-nums">
            Seed SAFE: {formatSsotCurrency(UNIFIED_SAFE_TERMS.raiseUsd, currency, fx)} · Cap{' '}
            {formatSsotCurrency(UNIFIED_SAFE_TERMS.postMoneyCapUsd, currency, fx)} ·{' '}
            {UNIFIED_SAFE_TERMS.discountPct}% Discount
          </div>
          <button
            type="button"
            onClick={() => {
              setDataRoomOpen(false);
              openContactModal('Request Term Sheet & Full Data Room Access');
            }}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>Request Term Sheet &amp; Founder Call</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
