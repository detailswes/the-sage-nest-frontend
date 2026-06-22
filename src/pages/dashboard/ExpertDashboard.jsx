import { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { useGetMyProfileQuery, useListAvailabilityQuery } from "../../api/expertApi";
import { getProfileImageUrl } from "../../utils/imageUrl";
import {
  NavUserIcon, NavBriefcaseIcon, NavCalendarIcon,
  NavAppointmentsIcon, NavSettingsIcon, NavLogoutIcon,
} from "../../assets/icons";
import { LOGO_SVG } from "../../assets/images";

// ─── Nav config ──────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { key: "profile",      tKey: "nav.profile",      Icon: NavUserIcon },
  { key: "services",     tKey: "nav.services",     Icon: NavBriefcaseIcon },
  { key: "availability", tKey: "nav.availability", Icon: NavCalendarIcon },
  { key: "calendar",     tKey: "nav.calendar",     Icon: NavCalendarIcon },
  { key: "appointments", tKey: "nav.appointments", Icon: NavAppointmentsIcon },
  { key: "history",      tKey: "nav.history",      Icon: NavAppointmentsIcon },
  { key: "settings",     tKey: "nav.settings",     Icon: NavSettingsIcon },
];

// ─── Component ───────────────────────────────────────────────────────────────
const VALID_SECTIONS = [
  "profile",
  "services",
  "availability",
  "calendar",
  "appointments",
  "history",
  "settings",
];

const ExpertDashboard = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation('expertDashboard');
  const location = useLocation();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [imgError, setImgError] = useState(false);

  const { data: profile } = useGetMyProfileQuery();
  const { data: availSlots, isError: availError } = useListAvailabilityQuery();

  const sidebarImage = imgError ? null : getProfileImageUrl(profile?.profile_image);
  const expertStatus = profile?.status ?? null;
  const changeRequestNote = profile?.change_request_note || "";
  const isPublished = profile?.is_published ?? true;
  const hasAvailability = availError ? true : availSlots ? availSlots.length > 0 : null;

  // Derive active section from URL path
  const lastSegment = location.pathname.split("/").pop();
  const activeSection = VALID_SECTIONS.includes(lastSegment)
    ? lastSegment
    : "profile";

  const initials = user?.name
    ? user.name
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  return (
    <div className="min-h-screen bg-[#f4eee5] bg-sage-stripes bg-stripe-size bg-repeat-x flex">
      {/* ── Sidebar ── */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-[#dfe2d7] border-r-2 border-[#c5ceba] flex flex-col z-10">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-[#c5ceba]">
          <Link
            to="/dashboard/expert/profile"
            className="flex items-center gap-2.5"
          >
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

        {/* User info */}
        <div className="px-4 py-4 border-b border-[#c5ceba]">
          <div className="flex items-center gap-3">
            {sidebarImage ? (
              <img
                src={sidebarImage}
                alt={user?.name}
                className="w-9 h-9 rounded-full object-cover border border-[#c5ceba] flex-shrink-0"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#445446] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 select-none">
                {initials}
              </div>
            )}
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
                to={`/dashboard/expert/${key}`}
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
            onClick={() => setShowSignOutConfirm(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-[#445446] text-white hover:bg-[#3a4a3b] active:scale-95 transition-all duration-150"
          >
            <NavLogoutIcon />
            {t('signOut')}
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="ml-64 flex-1 min-h-screen">
        <div className="px-8 py-8">
          {/* Changes requested banner */}
          {expertStatus === "CHANGES_REQUESTED" && (
            <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    {t('banners.changesRequested.title')}
                  </p>
                  {changeRequestNote && (
                    <p className="text-sm text-amber-700 mt-1 whitespace-pre-wrap">
                      {changeRequestNote}
                    </p>
                  )}
                  <p className="text-xs text-amber-600 mt-2">
                    {t('banners.changesRequested.footer')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* No availability banner */}
          {expertStatus === "APPROVED" && hasAvailability === false && (
            <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                  />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-blue-800">
                    {t('banners.noAvailability.title')}
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    {t('banners.noAvailability.body')}
                  </p>
                  <Link
                    to="/dashboard/expert/availability"
                    className="inline-block mt-2.5 text-xs font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-900"
                  >
                    {t('banners.noAvailability.cta')}
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Unpublished banner */}
          {expertStatus === "APPROVED" && !isPublished && (
            <div className="mb-6 rounded-xl border border-orange-300 bg-orange-50 px-5 py-4">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                  />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-orange-800">
                    {t('banners.unpublished.title')}
                  </p>
                  <p className="text-sm text-orange-700 mt-1">
                    {t('banners.unpublished.body')}
                  </p>
                </div>
              </div>
            </div>
          )}

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
              {t('signOutModal.title')}
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              {t('signOutModal.body')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 py-2.5 px-4 rounded-lg border border-[#E4E7E4] text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {t('signOutModal.cancel')}
              </button>
              <button
                onClick={logout}
                className="flex-1 py-2.5 px-4 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors"
              >
                {t('signOutModal.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpertDashboard;
