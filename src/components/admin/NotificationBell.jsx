import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminNotifications } from '../../api/adminApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso) {
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
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
      </svg>
    ),
  },
};

const DEFAULT_CONFIG = {
  color: 'bg-gray-100 text-gray-500',
  icon: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
    </svg>
  ),
};

// ─── Component ────────────────────────────────────────────────────────────────
const NotificationBell = () => {
  const navigate  = useNavigate();
  const wrapperRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [open,          setOpen]          = useState(false);
  const [dismissed,     setDismissed]     = useState(loadDismissed);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      const data = await getAdminNotifications();
      setNotifications(data);
    } catch {
      // Non-fatal — bell stays empty
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(id);
  }, [fetchNotifications]);

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
    // Show again if a newer submission arrived after the dismiss timestamp
    return !at || new Date(notif.createdAt) > new Date(at);
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
        <svg className="w-4.5 h-4.5 w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* ── Panel — opens to the right of the sidebar ── */}
      {open && (
        <div className="absolute top-0 left-full ml-3 w-80 bg-white rounded-xl border border-[#E4E7E4] shadow-xl z-50 overflow-hidden">
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
                <svg className="w-8 h-8 text-gray-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                </svg>
                <p className="text-sm font-medium text-gray-400">All caught up</p>
                <p className="text-xs text-gray-300 mt-0.5">No pending actions right now.</p>
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
                      <p className="text-[10px] text-gray-400 mt-1">{timeAgo(notif.createdAt)}</p>
                    </div>

                    {/* Dismiss */}
                    <button
                      onClick={(e) => dismiss(e, notif.id)}
                      className="flex-shrink-0 mt-0.5 p-0.5 rounded text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Dismiss"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer — refresh link */}
          <div className="px-4 py-2.5 border-t border-[#E4E7E4] bg-[#FAFBFA]">
            <button
              onClick={fetchNotifications}
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
