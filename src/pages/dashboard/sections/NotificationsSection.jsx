import { useState, useEffect } from 'react';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '../../../api/expertApi';

// ─── Toggle row ───────────────────────────────────────────────────────────────
const ToggleRow = ({ label, description, checked, onChange, disabled = false }) => (
  <div className="flex items-start justify-between gap-4 py-4">
    <div className="min-w-0">
      <p className={`text-sm font-medium ${disabled ? 'text-gray-400' : 'text-[#1F2933]'}`}>
        {label}
        {disabled && (
          <span className="ml-2 text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            Coming soon
          </span>
        )}
      </p>
      <p className={`text-xs mt-0.5 ${disabled ? 'text-gray-300' : 'text-gray-500'}`}>
        {description}
      </p>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#445446] focus:ring-offset-2 ${
        disabled
          ? 'cursor-not-allowed bg-gray-200'
          : checked
          ? 'bg-[#445446] cursor-pointer'
          : 'bg-gray-200 cursor-pointer'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
          checked && !disabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────
const NotificationsSection = () => {
  const [prefs, setPrefs] = useState({
    notify_new_booking:  true,
    notify_cancellation: true,
    notify_reminder:     true,
  });
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState(null); // { type: 'success'|'error', message: string }

  useEffect(() => {
    getNotificationPreferences()
      .then((data) => setPrefs(data))
      .catch(() => {}) // fall back to defaults
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (field, value) => {
    const prev = prefs;
    const next = { ...prefs, [field]: value };
    setPrefs(next); // optimistic update

    setSaving(true);
    try {
      const saved = await updateNotificationPreferences({ [field]: value });
      setPrefs((p) => ({ ...p, ...saved }));
      showToast('success', 'Preferences saved');
    } catch {
      setPrefs(prev); // revert on failure
      showToast('error', 'Failed to save — please try again');
    } finally {
      setSaving(false);
    }
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#1F2933]">Notification Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Choose which email notifications you receive for booking activity.
        </p>
      </div>

      {/* Email notifications card */}
      <div className="bg-white rounded-xl border border-[#E4E7E4] px-6">
        {/* Card header */}
        <div className="flex items-center gap-2.5 py-4 border-b border-[#E4E7E4]">
          <svg className="w-4 h-4 text-[#445446]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
          </svg>
          <span className="text-sm font-semibold text-[#1F2933]">Email notifications</span>
          {saving && (
            <div className="ml-auto w-4 h-4 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
          )}
        </div>

        {/* Toggles */}
        <div className="divide-y divide-[#F0F2F0]">
          <ToggleRow
            label="New booking"
            description="Receive an email when a parent books a session with you."
            checked={prefs.notify_new_booking}
            onChange={(v) => handleToggle('notify_new_booking', v)}
          />
          <ToggleRow
            label="Cancellation"
            description="Receive an email when a parent cancels a booking."
            checked={prefs.notify_cancellation}
            onChange={(v) => handleToggle('notify_cancellation', v)}
          />
          <ToggleRow
            label="Session reminders"
            description="Receive reminder emails 24 hours and 1 hour before each session."
            checked={prefs.notify_reminder}
            onChange={(v) => handleToggle('notify_reminder', v)}
          />
          <ToggleRow
            label="Message received"
            description="Receive an email when a parent sends you a message."
            checked={false}
            disabled
          />
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all z-50 ${
            toast.type === 'success' ? 'bg-[#445446]' : 'bg-red-500'
          }`}
        >
          {toast.type === 'success' ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default NotificationsSection;
