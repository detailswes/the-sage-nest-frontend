import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getProfileApi,
  updateProfileApi,
  updateEmailApi,
  changePasswordApi,
  deleteAccountApi,
} from "../../api/authApi";

// ─── Section wrapper ──────────────────────────────────────────────────────────
const Section = ({ title, description, children }) => (
  <div className="bg-white rounded-2xl border border-[#E4E7E4] overflow-hidden">
    <div className="px-6 py-5 border-b border-[#E4E7E4]">
      <h3 className="text-base font-semibold text-[#1F2933]">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      )}
    </div>
    <div className="px-6 py-6">{children}</div>
  </div>
);

// ─── Field row ────────────────────────────────────────────────────────────────
const Field = ({ label, children }) => (
  <div>
    <label className="block text-sm font-medium text-[#1F2933] mb-1.5">
      {label}
    </label>
    {children}
  </div>
);

const Input = ({ error, ...props }) => (
  <input
    {...props}
    className={`w-full px-4 py-3 rounded-lg border text-sm text-[#1F2933] placeholder-gray-400 bg-white transition focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] ${
      error ? "border-red-400" : "border-[#E4E7E4]"
    }`}
  />
);

// ─── Feedback banner ──────────────────────────────────────────────────────────
const Banner = ({ type, message }) => {
  if (!message) return null;
  const styles =
    type === "success"
      ? "bg-green-50 border-green-200 text-green-700"
      : "bg-red-50 border-red-200 text-red-600";
  return (
    <div className={`px-4 py-3 rounded-lg border text-sm ${styles}`}>
      {message}
    </div>
  );
};

// ─── Personal Info section ────────────────────────────────────────────────────
const PersonalInfoSection = ({ profile, onUpdated }) => {
  const [name, setName] = useState(profile.name || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState(null);

  const handleSave = async () => {
    if (!name.trim()) {
      setBanner({ type: "error", message: "Name is required." });
      return;
    }
    setLoading(true);
    setBanner(null);
    try {
      const updated = await updateProfileApi({
        name: name.trim(),
        phone: phone.trim() || null,
      });
      onUpdated(updated);
      setBanner({ type: "success", message: "Profile updated successfully." });
    } catch (err) {
      setBanner({
        type: "error",
        message: err?.response?.data?.error || "Could not save changes.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Section
      title="Personal information"
      description="Your name and contact details."
    >
      <div className="space-y-4">
        <Banner type={banner?.type} message={banner?.message} />
        <Field label="Full name">
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Smith"
          />
        </Field>
        <Field label="Phone number">
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+44 7700 900000"
          />
        </Field>
        <div className="flex justify-end pt-1">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-5 py-2.5 bg-[#445446] hover:bg-[#3a4a3b] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </Section>
  );
};

// ─── Email section ────────────────────────────────────────────────────────────
const EmailSection = ({ profile, onLogout }) => {
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState(null);
  const [emailSent, setEmailSent] = useState(false);

  const handleChange = async () => {
    if (!newEmail.trim() || !password) {
      setBanner({
        type: "error",
        message: "New email and current password are required.",
      });
      return;
    }
    setLoading(true);
    setBanner(null);
    try {
      await updateEmailApi({ email: newEmail.trim(), password });
      setEmailSent(true);
    } catch (err) {
      setBanner({
        type: "error",
        message: err?.response?.data?.error || "Could not update email.",
      });
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <Section
        title="Email address"
        description="Used to log in and receive notifications."
      >
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-[#445446]/10 flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-6 h-6 text-[#445446]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
              />
            </svg>
          </div>
          <p className="text-sm font-semibold text-[#1F2933] mb-1">
            Verify your new email
          </p>
          <p className="text-sm text-gray-500 mb-4">
            We sent a verification link to <strong>{newEmail}</strong>.<br />
            Click it to activate your new address. You have been signed out.
          </p>
          <button
            onClick={onLogout}
            className="text-sm text-[#445446] font-medium hover:underline"
          >
            Sign in with new email
          </button>
        </div>
      </Section>
    );
  }

  return (
    <Section
      title="Email address"
      description="Used to log in and receive notifications."
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between px-4 py-3 bg-[#F5F7F5] rounded-lg border border-[#E4E7E4]">
          <span className="text-sm text-[#1F2933] font-medium">
            {profile.email}
          </span>
          {profile.is_verified ? (
            <span className="text-xs text-green-600 font-medium">Verified</span>
          ) : (
            <span className="text-xs text-amber-600 font-medium">
              Unverified
            </span>
          )}
        </div>

        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="text-sm text-[#445446] font-medium hover:underline"
          >
            Change email address
          </button>
        ) : (
          <div className="space-y-4 pt-1">
            <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              Changing your email will sign you out. You must verify the new
              address before logging back in.
            </div>
            <Banner type={banner?.type} message={banner?.message} />
            <Field label="New email address">
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="new@example.com"
              />
            </Field>
            <Field label="Confirm with current password">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your current password"
              />
            </Field>
            <div className="flex gap-3 justify-end pt-1">
              <button
                onClick={() => {
                  setShowForm(false);
                  setBanner(null);
                  setNewEmail("");
                  setPassword("");
                }}
                className="px-4 py-2.5 text-sm font-medium border border-[#E4E7E4] rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleChange}
                disabled={loading}
                className="px-5 py-2.5 bg-[#445446] hover:bg-[#3a4a3b] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {loading ? "Sending…" : "Send verification"}
              </button>
            </div>
          </div>
        )}
      </div>
    </Section>
  );
};

// ─── Change Password section ──────────────────────────────────────────────────
const ChangePasswordSection = ({ onLogout }) => {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState(null);

  const handleSave = async () => {
    if (!current || !next || !confirm) {
      setBanner({ type: "error", message: "All fields are required." });
      return;
    }
    if (next.length < 8) {
      setBanner({
        type: "error",
        message: "New password must be at least 8 characters.",
      });
      return;
    }
    if (next !== confirm) {
      setBanner({ type: "error", message: "New passwords do not match." });
      return;
    }
    setLoading(true);
    setBanner(null);
    try {
      await changePasswordApi({ currentPassword: current, newPassword: next });
      setBanner({
        type: "success",
        message:
          "Password changed. You have been signed out of all other sessions.",
      });
      setCurrent("");
      setNext("");
      setConfirm("");
      // Sign out current session too — user should re-login with new password
      setTimeout(onLogout, 2000);
    } catch (err) {
      setBanner({
        type: "error",
        message: err?.response?.data?.error || "Could not change password.",
      });
      setLoading(false);
    }
  };

  return (
    <Section
      title="Change password"
      description="Requires your current password for confirmation."
    >
      <div className="space-y-4">
        <Banner type={banner?.type} message={banner?.message} />
        <Field label="Current password">
          <Input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="Enter current password"
          />
        </Field>
        <Field label="New password">
          <Input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="Minimum 8 characters"
          />
        </Field>
        <Field label="Confirm new password">
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat new password"
          />
        </Field>
        <div className="flex justify-end pt-1">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-5 py-2.5 bg-[#445446] hover:bg-[#3a4a3b] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? "Updating…" : "Update password"}
          </button>
        </div>
      </div>
    </Section>
  );
};

// ─── Delete Account section ───────────────────────────────────────────────────
const DeleteAccountSection = ({ onLogout }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (!password) {
      setError("Please enter your password to confirm.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await deleteAccountApi({ password });
      onLogout();
    } catch (err) {
      const errData = err?.response?.data;
      setError(errData?.error || "Could not delete account. Please try again.");
      if (errData?.has_upcoming_bookings || errData?.has_pending_transactions) {
        setShowConfirm(false);
        setPassword("");
      }
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-red-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-red-100">
        <h3 className="text-base font-semibold text-red-600">Delete account</h3>
        <p className="text-sm text-gray-500 mt-0.5">
          Permanently erase your personal data. This cannot be undone.
        </p>
      </div>
      <div className="px-6 py-6">
        {error && !showConfirm && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}
        {!showConfirm ? (
          <div className="space-y-4">
            <div className="text-sm text-gray-600 leading-relaxed space-y-2">
              <p>Deleting your account will immediately and permanently remove:</p>
              <ul className="list-disc list-inside text-gray-500 space-y-1 pl-2">
                <li>Your name, email address, and phone number</li>
                <li>Your password and login access</li>
              </ul>
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
                You must cancel any upcoming bookings and wait for all transactions
                to be settled before your account can be deleted.
              </p>
            </div>
            <button
              onClick={() => setShowConfirm(true)}
              className="px-5 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-sm font-medium rounded-lg transition-colors"
            >
              Delete my account
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              This action is <strong>permanent and irreversible</strong>. All
              your personal data will be erased immediately.
            </div>
            <Field label="Enter your password to confirm">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your current password"
                error={!!error}
              />
            </Field>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setPassword("");
                  setError("");
                }}
                className="flex-1 py-2.5 text-sm font-medium border border-[#E4E7E4] rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {loading ? "Deleting…" : "Yes, delete my account"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
const ParentProfilePage = () => {
  const { logout, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getProfileApi()
      .then(setProfile)
      .catch(() => setError("Could not load your profile."))
      .finally(() => setLoading(false));
  }, []);

  const handleProfileUpdated = (updated) => {
    setProfile((prev) => ({ ...prev, ...updated }));
    if (updateUser) updateUser(updated);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
        {error || "Could not load profile."}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-7">
        <h2 className="text-xl font-semibold text-[#1F2933]">My Profile</h2>
        <p className="text-sm text-gray-500 mt-1">
          Manage your personal information and account settings.
        </p>
      </div>

      <div className="space-y-6">
        <PersonalInfoSection
          profile={profile}
          onUpdated={handleProfileUpdated}
        />
        <EmailSection profile={profile} onLogout={logout} />
        <ChangePasswordSection onLogout={logout} />
        <DeleteAccountSection onLogout={logout} />
      </div>
    </div>
  );
};

export default ParentProfilePage;
