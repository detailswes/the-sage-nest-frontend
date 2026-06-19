import { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import NotificationBell from "../../components/admin/NotificationBell";
import LanguageSelector from "../../components/LanguageSelector";
import {
  NavUsersIcon, NavLogoutIcon, NavDocumentIcon,
  NavBookingsIcon, NavPaymentsIcon, NavShieldIcon,
} from "../../assets/icons";
import { LOGO_SVG } from "../../assets/images";

const NAV_ITEMS = [
  { path: "experts",         tKey: "nav.expertManagement", Icon: NavUsersIcon },
  { path: "parents",         tKey: "nav.parentManagement", Icon: NavUsersIcon },
  { path: "bookings",        tKey: "nav.bookingManagement", Icon: NavBookingsIcon },
  { path: "payments",        tKey: "nav.paymentOverview",   Icon: NavPaymentsIcon },
  { path: "legal-documents", tKey: "nav.legalDocuments",    Icon: NavDocumentIcon },
  { path: "compliance",      tKey: "nav.legalCompliance",   Icon: NavShieldIcon },
];

// ─── Component ────────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const { t } = useTranslation("adminDashboard");
  const { user, logout } = useAuth();
  const location = useLocation();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const segments = location.pathname.split("/");
  const knownSections = ["experts", "parents", "bookings", "payments", "legal-documents", "compliance"];
  const activeSection = knownSections.find((s) => segments.includes(s)) ?? "experts";

  const initials = user?.name
    ? user.name
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "A";

  return (
    <div className="min-h-screen bg-[#f4eee5] bg-sage-stripes bg-stripe-size bg-repeat-x flex">
      {/* ── Sidebar ── */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-[#dfe2d7] border-r-2 border-[#c5ceba] flex flex-col z-10">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-[#c5ceba]">
          <Link to="/dashboard/admin/experts" className="flex items-center gap-2.5">
            <img
              src={LOGO_SVG}
              alt="Sage Nest"
              className="h-8"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
            <span className="text-[#445446] font-bold text-base tracking-tight">
              Sage Nest
            </span>
          </Link>
        </div>

        {/* Admin badge + user info */}
        <div className="px-4 py-4 border-b border-[#c5ceba]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#445446] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 select-none">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-[#445446] truncate">
                  {user?.name}
                </p>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#445446] text-white flex-shrink-0">
                  ADMIN
                </span>
              </div>
              <p className="text-xs text-[#5e6d5b] truncate mt-0.5">
                {user?.email}
              </p>
            </div>
            <NotificationBell />
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
            onClick={() => setShowSignOutConfirm(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-[#445446] text-white hover:bg-[#3a4a3b] active:scale-95 transition-all duration-150"
          >
            <NavLogoutIcon />
            {t("signOut")}
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="ml-64 flex-1 min-h-screen">
        <div className="px-8 py-8">
          <Outlet />
        </div>
      </main>

      {/* ── Sign-out confirmation ── */}
      {showSignOutConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSignOutConfirm(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 mx-auto mb-4">
              <svg
                className="w-6 h-6 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75"
                />
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
