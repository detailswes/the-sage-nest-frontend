import { useState } from 'react';
import {
  useGetNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
} from '../../../api/expertApi';
import { EnvelopeIcon, CheckIcon, XIcon } from '../../../assets/icons';

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
const defaultPrefs = { notify_new_booking: true, notify_cancellation: true };

const NotificationsSection = () => {
  const [localPrefs, setLocalPrefs] = useState(null);
  const [toast, setToast]           = useState(null);

  const { data: fetchedPrefs, isLoading: loading } = useGetNotificationPreferencesQuery();
  const [updatePrefs, { isLoading: saving }]       = useUpdateNotificationPreferencesMutation();

  const prefs = localPrefs ?? fetchedPrefs ?? defaultPrefs;

  const handleToggle = async (field, value) => {
    const base = localPrefs ?? fetchedPrefs ?? defaultPrefs;
    setLocalPrefs({ ...base, [field]: value }); // optimistic
    try {
      await updatePrefs({ [field]: value }).unwrap();
      setLocalPrefs(null);
      showToast('success', 'Preferences saved');
    } catch {
      setLocalPrefs(null); // revert to server state
      showToast('error', 'Failed to save — please try again');
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
        <h2 className="text-xl font-semibold text-[#445446]">Notification Settings</h2>
        <p className="text-sm text-[#5e6d5b] font-medium mt-1">
          Choose which email notifications you receive for booking activity.
        </p>
      </div>

      {/* Email notifications card */}
      <div className="bg-white rounded-2xl border-2 border-[#c5ceba] px-6">
        {/* Card header */}
        <div className="flex items-center gap-2.5 py-4 border-b border-[#c5ceba]">
          <EnvelopeIcon className="w-4 h-4 text-[#445446]" />
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
            <CheckIcon className="w-4 h-4" />
          ) : (
            <XIcon className="w-4 h-4" />
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default NotificationsSection;
