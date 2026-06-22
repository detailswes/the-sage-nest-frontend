import { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import NotificationBell from "../../components/admin/NotificationBell";
import LanguageSelector from "../../components/LanguageSelector";

// ─── Icons ────────────────────────────────────────────────────────────────────
const UsersIcon = ({ active }) => (
  <svg
    className={`w-5 h-5 flex-shrink-0 ${active ? "text-white" : "text-current"}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
    />
  </svg>
);

const LogoutIcon = () => (
  <svg
    className="w-5 h-5 flex-shrink-0 text-current"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75"
    />
  </svg>
);

const DocumentIcon = ({ active }) => (
  <svg
    className={`w-5 h-5 flex-shrink-0 ${active ? "text-white" : "text-current"}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
    />
  </svg>
);

const BookingsIcon = ({ active }) => (
  <svg
    className={`w-5 h-5 flex-shrink-0 ${active ? "text-white" : "text-current"}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
    />
  </svg>
);

const PaymentsIcon = ({ active }) => (
  <svg
    className={`w-5 h-5 flex-shrink-0 ${active ? "text-white" : "text-current"}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z"
    />
  </svg>
);

const ShieldIcon = ({ active }) => (
  <svg
    className={`w-5 h-5 flex-shrink-0 ${active ? "text-white" : "text-current"}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
    />
  </svg>
);

const NAV_ITEMS = [
  { path: "experts",         tKey: "nav.expertManagement", Icon: UsersIcon },
  { path: "parents",         tKey: "nav.parentManagement", Icon: UsersIcon },
  { path: "bookings",        tKey: "nav.bookingManagement", Icon: BookingsIcon },
  { path: "payments",        tKey: "nav.paymentOverview",   Icon: PaymentsIcon },
  { path: "legal-documents", tKey: "nav.legalDocuments",    Icon: DocumentIcon },
  { path: "compliance",      tKey: "nav.legalCompliance",   Icon: ShieldIcon },
];

// ─── Component ────────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const { t } = useTranslation("adminDashboard");
  const { user, logout } = useAuth();
  const location = useLocation();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const segments = location.pathname.split("/");
  const knownSections = ["experts", "parents", "bookings", "payments", "legal-documents", "compliance"];
  const activeSection = knownSections.find((s) => segments.includes(s)) ?? "experts";

  const initials = user?.name
    ? user.name.trim().split(/\s+/).map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "A";

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-[#f4eee5] bg-sage-stripes bg-stripe-size bg-repeat-x">

      {/* ── Mobile top bar (hidden on lg+) ── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-20 h-14 bg-[#dfe2d7] border-b border-[#c5ceba] flex items-center justify-between px-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg text-[#445446] hover:bg-[#c5ceba]/40 transition-colors"
          aria-label="Open menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <Link to="/dashboard/admin/experts" className="flex items-center gap-2" onClick={closeSidebar}>
          <img
            src="/assets/images/Sage-Nest_Final.svg"
            alt="Sage Nest"
            className="h-7"
            onError={(e) => { e.target.style.display = "none"; }}
          />
          <span className="text-[#445446] font-bold text-sm tracking-tight">Sage Nest</span>
        </Link>
        <div className="flex items-center justify-center w-9 h-9">
          <NotificationBell placement="topbar" />
        </div>
      </header>

      {/* ── Sidebar overlay (mobile only) ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-[#dfe2d7] border-r-2 border-[#c5ceba] flex flex-col z-30 transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        {/* Logo + mobile close button */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-[#c5ceba]">
          <Link
            to="/dashboard/admin/experts"
            className="flex items-center gap-2.5"
            onClick={closeSidebar}
          >
            <img
              src="/assets/images/Sage-Nest_Final.svg"
              alt="Sage Nest"
              className="h-8"
              onError={(e) => { e.target.style.display = "none"; }}
            />
            <span className="text-[#445446] font-bold text-base tracking-tight">Sage Nest</span>
          </Link>
          <button
            onClick={closeSidebar}
            className="lg:hidden p-1.5 rounded-lg text-[#445446] hover:bg-[#c5ceba]/40 transition-colors"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Admin badge + user info */}
        <div className="px-4 py-4 border-b border-[#c5ceba]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#445446] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 select-none">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-[#445446] truncate">{user?.name}</p>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#445446] text-white flex-shrink-0">
                  ADMIN
                </span>
              </div>
              <p className="text-xs text-[#5e6d5b] truncate mt-0.5">{user?.email}</p>
            </div>
            <div className="hidden lg:block">
              <NotificationBell />
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ path, tKey, Icon }) => {
            const isActive = activeSection === path;
            return (
              <Link
                key={path}
                to={path}
                onClick={closeSidebar}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-[#445446] text-white"
                    : "text-[#5e6d5b] hover:bg-[#dfe2d7] hover:text-[#445446]"
                }`}
              >
                <Icon active={isActive} />
                {t(tKey)}
              </Link>
            );
          })}
        </nav>

        {/* Language selector + Sign out */}
        <div className="p-3 border-t border-[#c5ceba] space-y-1">
          <LanguageSelector />
          <button
            onClick={() => { closeSidebar(); setShowSignOutConfirm(true); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-[#445446] text-white hover:bg-[#3a4a3b] active:scale-95 transition-all duration-150"
          >
            <LogoutIcon />
            {t("signOut")}
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="lg:ml-64 min-h-screen flex flex-col">
        <div className="flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 mt-14 lg:mt-0 overflow-x-hidden">
          <Outlet />
        </div>
      </main>

      {/* ── Sign-out confirmation ── */}
      {showSignOutConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowSignOutConfirm(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-[#1F2933] text-center mb-1">
              {t("signOutModal.title")}
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              {t("signOutModal.body")}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 py-2.5 px-4 rounded-lg border border-[#E4E7E4] text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {t("signOutModal.cancel")}
              </button>
              <button
                onClick={logout}
                className="flex-1 py-2.5 px-4 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors"
              >
                {t("signOutModal.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
