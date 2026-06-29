import { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import {
  NavUpcomingIcon, NavPastIcon, NavProfileIcon, NavLogoutIcon,
  MenuIcon, XIcon, SignOutIcon,
} from "../../assets/icons";
import { LOGO_SVG } from "../../assets/images";

// ─── Nav config ───────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { key: "upcoming", tKey: "nav.upcomingBookings", Icon: NavUpcomingIcon },
  { key: "past", tKey: "nav.pastBookings", Icon: NavPastIcon },
  { key: "profile", tKey: "nav.myProfile", Icon: NavProfileIcon },
];

const VALID_SECTIONS = ["upcoming", "past", "profile"];

// ─── Component ────────────────────────────────────────────────────────────────
const ParentDashboard = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { t } = useTranslation("parentDashboard");
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const lastSegment = location.pathname.split("/").pop();
  const activeSection = VALID_SECTIONS.includes(lastSegment)
    ? lastSegment
    : "upcoming";

  const initials = user?.name
    ? user.name
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

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
          <MenuIcon />
        </button>
        <a href="https://the-sage-nest.webflow.io/" className="flex items-center gap-2" onClick={closeSidebar}>
          <img
            src={LOGO_SVG}
            alt="Sage Nest"
            className="h-7"
            onError={(e) => { e.target.style.display = "none"; }}
          />
          <span className="text-[#445446] font-bold text-sm tracking-tight">Sage Nest</span>
        </a>
        <div className="w-9" />
      </header>

      {/* ── Sidebar backdrop (mobile only) ── */}
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
          <a
            href="https://the-sage-nest.webflow.io/"
            className="flex items-center gap-2.5"
            onClick={closeSidebar}
          >
            <img
              src={LOGO_SVG}
              alt="Sage Nest"
              className="h-8"
              onError={(e) => { e.target.style.display = "none"; }}
            />
            <span className="text-[#445446] font-bold text-base tracking-tight">
              Sage Nest
            </span>
          </a>
          <button
            onClick={closeSidebar}
            className="lg:hidden p-1.5 rounded-lg text-[#445446] hover:bg-[#c5ceba]/40 transition-colors"
            aria-label="Close menu"
          >
            <XIcon />
          </button>
        </div>

        {/* User info */}
        <div className="px-4 py-4 border-b border-[#c5ceba]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#445446] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 select-none">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#445446] truncate">
                {user?.name}
              </p>
              <p className="text-xs text-[#5e6d5b] truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ key, tKey, Icon }) => {
            const isActive = activeSection === key;
            return (
              <Link
                key={key}
                to={`/dashboard/parent/${key}`}
                onClick={closeSidebar}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
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

        {/* Sign out */}
        <div className="p-3 border-t border-[#c5ceba]">
          <button
            onClick={() => { closeSidebar(); setShowSignOutConfirm(true); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-[#445446] text-white hover:bg-[#3a4a3b] active:scale-95 transition-all duration-150"
          >
            <NavLogoutIcon />
            {t("nav.signOut")}
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="lg:ml-64 min-h-screen flex flex-col">
        <div className="flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 mt-14 lg:mt-0 overflow-x-hidden">
          <Outlet />
        </div>
      </main>

      {/* ── Sign-out confirmation modal ── */}
      {showSignOutConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSignOutConfirm(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 mx-auto mb-4">
              <SignOutIcon className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-base font-semibold text-[#1F2933] text-center mb-1">
              {t("signOutModal.title")}
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              {t("signOutModal.message")}
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

export default ParentDashboard;
