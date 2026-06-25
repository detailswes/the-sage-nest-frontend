import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetAdminNotificationsQuery } from '../../api/adminApi';
import { PencilDocumentIcon, GlobeLanguageIcon, BellIcon, XIcon } from '../../assets/icons';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24)    return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const STORAGE_KEY = 'admin_notif_dismissed';

function loadDismissed() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}

function saveDismissed(map) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

// ─── Notification type config (icon + colour) — extend as new types are added ─
const TYPE_CONFIG = {
  EXPERT_DRAFT_PENDING: {
    color: 'bg-amber-100 text-amber-600',
    icon: <PencilDocumentIcon className="w-3.5 h-3.5" />,
  },
  EXPERT_LANGUAGE_PENDING: {
    color: 'bg-blue-100 text-blue-600',
    icon: <GlobeLanguageIcon className="w-3.5 h-3.5" />,
  },
};

const DEFAULT_CONFIG = {
  color: 'bg-gray-100 text-gray-500',
  icon: <BellIcon className="w-3.5 h-3.5" />,
};

// ─── Component ────────────────────────────────────────────────────────────────
const NotificationBell = ({ placement = "sidebar" }) => {
  const navigate   = useNavigate();
  const wrapperRef = useRef(null);

  const { data: notifications = [], refetch } = useGetAdminNotificationsQuery(undefined, {
    pollingInterval: 60_000,
  });

  const [open,      setOpen]      = useState(false);
  const [dismissed, setDismissed] = useState(loadDismissed);

  // ── Click-outside to close ─────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // ── Dismissal helpers ──────────────────────────────────────────────────────
  const isVisible = (notif) => {
    const at = dismissed[notif.id];
    if (!at) return true;
    if (!notif.createdAt) return false;
    return new Date(notif.createdAt) > new Date(at);
  };

  const dismiss = (e, notifId) => {
    e.stopPropagation();
    const updated = { ...dismissed, [notifId]: new Date().toISOString() };
    setDismissed(updated);
    saveDismissed(updated);
  };

  const visibleNotifs = notifications.filter(isVisible);
  const count         = visibleNotifs.length;

  // ── Navigate + close ───────────────────────────────────────────────────────
  const handleClick = (href) => {
    setOpen(false);
    navigate(href);
  };

  return (
    <div ref={wrapperRef} className="relative flex-shrink-0">
      {/* ── Bell button ── */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={`relative p-1.5 rounded-lg transition-colors ${
          open ? 'bg-[#445446]/10 text-[#445446]' : 'text-gray-400 hover:text-[#1F2933] hover:bg-gray-100'
        }`}
        aria-label="Notifications"
      >
        <BellIcon className="w-[18px] h-[18px]" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* ── Panel ── */}
      {open && (
        <div
          className={
            placement === "topbar"
              ? "fixed top-14 left-0 right-0 sm:left-auto sm:right-2 sm:w-80 bg-white rounded-b-xl sm:rounded-xl border border-[#E4E7E4] shadow-xl z-50 overflow-hidden"
              : "absolute top-0 left-full ml-3 w-80 bg-white rounded-xl border border-[#E4E7E4] shadow-xl z-50 overflow-hidden"
          }
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E4E7E4]">
            <p className="text-sm font-semibold text-[#1F2933]">Notifications</p>
            {count > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-50 text-red-600 text-[10px] font-semibold">
                {count}
              </span>
            )}
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-[#F0F2F0]">
            {visibleNotifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-[#dfe2d7]/50 flex items-center justify-center mb-3">
                  <BellIcon className="w-4 h-4 text-[#c5ceba]" />
                </div>
                <p className="text-sm font-semibold text-[#445446]">All caught up</p>
                <p className="text-xs text-[#5e6d5b]/70 mt-0.5">No pending actions right now.</p>
              </div>
            ) : (
              visibleNotifs.map((notif) => {
                const cfg = TYPE_CONFIG[notif.type] ?? DEFAULT_CONFIG;
                return (
                  <div
                    key={notif.id}
                    className="group flex items-start gap-3 px-4 py-3 hover:bg-[#F5F7F5] cursor-pointer transition-colors"
                    onClick={() => handleClick(notif.href)}
                  >
                    {/* Icon */}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.color}`}>
                      {cfg.icon}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#1F2933] leading-snug">{notif.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-snug line-clamp-2">{notif.body}</p>
                      {timeAgo(notif.createdAt) && (
                        <p className="text-[10px] text-gray-400 mt-1">{timeAgo(notif.createdAt)}</p>
                      )}
                    </div>

                    {/* Dismiss */}
                    <button
                      onClick={(e) => dismiss(e, notif.id)}
                      className="flex-shrink-0 mt-0.5 p-0.5 rounded text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Dismiss"
                    >
                      <XIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer — refresh link */}
          <div className="px-4 py-2.5 border-t border-[#E4E7E4] bg-[#FAFBFA]">
            <button
              onClick={refetch}
              className="text-[11px] text-gray-400 hover:text-[#445446] transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
