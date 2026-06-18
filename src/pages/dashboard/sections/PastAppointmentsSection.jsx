import { useState, useRef } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useGetPastAppointmentsQuery, useSaveExpertNoteMutation } from '../../../api/bookingApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso, lng = 'en') {
  return new Date(iso).toLocaleDateString(lng === 'it' ? 'it-IT' : 'en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatTime(iso, lng = 'en') {
  return new Date(iso).toLocaleTimeString(lng === 'it' ? 'it-IT' : 'en-GB', {
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(minutes) {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m ? `${h}h ${m}min` : `${h}h`;
}

function resolveStatus(booking) {
  const now = new Date();
  if (booking.status === 'CONFIRMED' && new Date(booking.scheduled_at) < now) return 'COMPLETED';
  return booking.status;
}

const STATUS_STYLES = {
  COMPLETED: 'bg-[#445446]/10 text-[#445446] border border-[#445446]/20',
  CANCELLED: 'bg-gray-100 text-gray-500 border border-gray-200',
  REFUNDED:  'bg-amber-50 text-amber-700 border border-amber-200',
};

// ─── Empty state ──────────────────────────────────────────────────────────────
const HistoryIcon = () => (
  <svg className="w-5 h-5 text-[#c5ceba]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

// ─── Pagination ───────────────────────────────────────────────────────────────
const Pagination = ({ page, pages, onChange }) => {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="p-2 rounded-lg text-gray-500 hover:text-[#445446] hover:bg-[#445446]/10 transition-colors disabled:opacity-30 disabled:cursor-default"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
      </button>
      <span className="text-sm text-gray-500">
        <Trans
          i18nKey="history.pagination.pageOf"
          ns="expertDashboard"
          values={{ page, pages }}
          components={{ bold: <span className="font-semibold text-[#1F2933]" /> }}
        />
      </span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === pages}
        className="p-2 rounded-lg text-gray-500 hover:text-[#445446] hover:bg-[#445446]/10 transition-colors disabled:opacity-30 disabled:cursor-default"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </div>
  );
};

// ─── Inline note editor ───────────────────────────────────────────────────────
const InlineNoteEditor = ({ bookingId, initialNote, onSaved }) => {
  const { t } = useTranslation('expertDashboard');
  const [note,      setNote]      = useState(initialNote || '');
  const [showSaved, setShowSaved] = useState(false);
  const timerRef = useRef(null);
  const [saveNote, { isLoading: isSaving, isError: isSaveError }] = useSaveExpertNoteMutation();

  const saveState = isSaving ? 'saving' : isSaveError ? 'error' : showSaved ? 'saved' : 'idle';

  const persist = async (value) => {
    clearTimeout(timerRef.current);
    setShowSaved(false);
    try {
      const res = await saveNote({ id: bookingId, note: value }).unwrap();
      setShowSaved(true);
      if (onSaved) onSaved(res.expert_note);
      timerRef.current = setTimeout(() => setShowSaved(false), 2000);
    } catch {
      // isSaveError handles display
    }
  };

  return (
    <div className="mt-2">
      <textarea
        value={note}
        onChange={(e) => { setNote(e.target.value); }}
        onBlur={() => persist(note)}
        placeholder={t('history.notes.placeholder')}
        rows={3}
        className="w-full text-sm text-[#1F2933] placeholder-gray-300 border border-[#c5ceba] rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[#445446] focus:border-[#445446] transition-colors"
      />
      <p className={`text-xs mt-1 transition-opacity ${saveState === 'idle' ? 'opacity-0' : 'opacity-100'} ${
        saveState === 'error' ? 'text-red-500' : 'text-gray-400'
      }`}>
        {saveState === 'saving' && t('history.notes.saving')}
        {saveState === 'saved'  && t('history.notes.saved')}
        {saveState === 'error'  && t('history.notes.saveFailed')}
      </p>
    </div>
  );
};

// ─── Row ──────────────────────────────────────────────────────────────────────
const Row = ({ booking }) => {
  const { t, i18n } = useTranslation('expertDashboard');
  const lng = i18n.language;
  const [expanded, setExpanded] = useState(false);
  const [note,     setNote]     = useState(booking.expert_note || '');
  const status = resolveStatus(booking);

  const isOnline = booking.format === 'ONLINE';
  const duration = booking.duration_minutes || booking.service?.duration_minutes || 0;

  return (
    <>
      <tr className="border-b border-[#dfe2d7] hover:bg-[#dfe2d7]/50 transition-colors">
        {/* Date / time */}
        <td className="px-4 py-3 whitespace-nowrap">
          <p className="text-sm font-medium text-[#1F2933]">{formatDate(booking.scheduled_at, lng)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{formatTime(booking.scheduled_at, lng)}</p>
        </td>

        {/* Parent */}
        <td className="px-4 py-3">
          <p className="text-sm font-medium text-[#1F2933]">{booking.parent?.name || '—'}</p>
          {booking.parent?.email && (
            <a href={`mailto:${booking.parent.email}`} className="text-xs text-[#445446] hover:underline">
              {booking.parent.email}
            </a>
          )}
        </td>

        {/* Service */}
        <td className="px-4 py-3">
          <p className="text-sm text-gray-700">{booking.service?.title || '—'}</p>
        </td>

        {/* Duration */}
        <td className="px-4 py-3 whitespace-nowrap">
          <p className="text-sm text-gray-600">{formatDuration(duration)}</p>
        </td>

        {/* Format */}
        <td className="px-4 py-3 whitespace-nowrap">
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            isOnline
              ? 'bg-blue-50 text-blue-600 border border-blue-100'
              : 'bg-[#445446]/10 text-[#445446] border border-[#445446]/20'
          }`}>
            {isOnline ? t('history.formats.ONLINE') : t('history.formats.IN_PERSON')}
          </span>
        </td>

        {/* Status */}
        <td className="px-4 py-3 whitespace-nowrap">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[status] || STATUS_STYLES.CANCELLED}`}>
            {t('history.status.' + status, { defaultValue: status })}
          </span>
        </td>

        {/* Actions */}
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpanded((v) => !v)}
              title={note ? t('history.notes.hasNoteBtn') : t('history.notes.addNoteBtn')}
              className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg border transition-colors ${
                note
                  ? 'text-[#445446] border-[#445446]/30 bg-[#445446]/5 hover:bg-[#445446]/10'
                  : 'text-gray-400 border-gray-200 hover:border-gray-300 hover:text-gray-600'
              }`}
            >
              <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
              </svg>
              {note ? t('history.notes.hasNoteBtn') : t('history.notes.addNoteBtn')}
            </button>
          </div>
        </td>
      </tr>

      {/* Expanded notes row */}
      {expanded && (
        <tr className="bg-[#dfe2d7]/30 border-b border-[#c5ceba]">
          <td colSpan={7} className="px-4 pb-4 pt-2">
            <p className="text-xs font-medium text-[#5e6d5b] uppercase tracking-wide mb-1">
              {t('history.notes.privateLabel')}
              <span className="ml-1 normal-case font-normal text-[#5e6d5b]/60">{t('history.notes.privateSub')}</span>
            </p>
            <InlineNoteEditor
              bookingId={booking.id}
              initialNote={note}
              onSaved={(v) => setNote(v || '')}
            />
          </td>
        </tr>
      )}
    </>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const PastAppointmentsSection = () => {
  const { t } = useTranslation('expertDashboard');
  const [page, setPage] = useState(1);

  const {
    data = { bookings: [], total: 0, page: 1, pages: 1 },
    isLoading: loading,
    isError,
  } = useGetPastAppointmentsQuery(page);

  const error = isError ? t('history.loadFailed') : '';
  const { bookings, total, pages } = data;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-[#445446]">{t('history.heading')}</h2>
        <p className="text-sm text-[#5e6d5b] font-medium mt-1">
          {t('history.subheading')}
          {total > 0 && <span className="ml-1 text-[#5e6d5b]/60">{t('history.totalCount', { count: total })}</span>}
        </p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-[#c5ceba] flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-[#dfe2d7]/50 flex items-center justify-center mb-3">
            <HistoryIcon />
          </div>
          <p className="text-sm font-semibold text-[#445446]">{t('history.empty.title')}</p>
          <p className="text-xs text-[#5e6d5b]/70 mt-1">{t('history.empty.body')}</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border-2 border-[#c5ceba] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="bg-[#445446] border-b border-[#3a4a3b]">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">{t('history.table.dateTime')}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">{t('history.table.parent')}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">{t('history.table.service')}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">{t('history.table.duration')}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">{t('history.table.format')}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">{t('history.table.status')}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">{t('history.table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <Row key={b.id} booking={b} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination page={page} pages={pages} onChange={setPage} />
        </>
      )}
    </div>
  );
};

export default PastAppointmentsSection;
