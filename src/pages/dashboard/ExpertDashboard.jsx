import { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyProfile } from '../../api/expertApi';
import { getProfileImageUrl } from '../../utils/imageUrl';

// ─── Icons ───────────────────────────────────────────────────────────────────
const UserIcon = ({ active }) => (
  <svg
    className={`w-5 h-5 flex-shrink-0 ${active ? 'text-[#445446]' : 'text-current'}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
    />
  </svg>
);

const BriefcaseIcon = ({ active }) => (
  <svg
    className={`w-5 h-5 flex-shrink-0 ${active ? 'text-[#445446]' : 'text-current'}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0"
    />
  </svg>
);

const CalendarIcon = ({ active }) => (
  <svg
    className={`w-5 h-5 flex-shrink-0 ${active ? 'text-[#445446]' : 'text-current'}`}
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

const AppointmentsIcon = ({ active }) => (
  <svg
    className={`w-5 h-5 flex-shrink-0 ${active ? 'text-[#445446]' : 'text-current'}`}
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

// ─── Nav config ──────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { key: 'profile',      label: 'Profile',               Icon: UserIcon },
  { key: 'services',     label: 'Services',              Icon: BriefcaseIcon },
  { key: 'availability', label: 'Availability',          Icon: CalendarIcon },
  { key: 'calendar',     label: 'Calendar',              Icon: CalendarIcon },
  { key: 'appointments', label: 'Upcoming Appointments', Icon: AppointmentsIcon },
];

// ─── Component ───────────────────────────────────────────────────────────────
const VALID_SECTIONS = ['profile', 'services', 'availability', 'calendar', 'appointments'];

const ExpertDashboard = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [sidebarImage, setSidebarImage] = useState(null);

  useEffect(() => {
    getMyProfile()
      .then((data) => setSidebarImage(getProfileImageUrl(data.profile_image)))
      .catch(() => {}); // silently fall back to initials
  }, []);

  // Derive active section from URL path
  const lastSegment = location.pathname.split('/').pop();
  const activeSection = VALID_SECTIONS.includes(lastSegment) ? lastSegment : 'profile';

  const initials = user?.name
    ? user.name.trim().split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <div className="min-h-screen bg-[#F5F7F5] flex">
      {/* ── Sidebar ── */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-[#E4E7E4] flex flex-col z-10">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-[#E4E7E4] gap-2.5">
          <img
            src="/assets/images/Sage-Nest_Final.svg"
            alt="Sage Nest"
            className="h-8"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <span className="text-[#1F2933] font-bold text-base tracking-tight">Sage Nest</span>
        </div>

        {/* User info */}
        <div className="px-4 py-4 border-b border-[#E4E7E4]">
          <div className="flex items-center gap-3">
            {sidebarImage ? (
              <img
                src={sidebarImage}
                alt={user?.name}
                className="w-9 h-9 rounded-full object-cover border border-[#E4E7E4] flex-shrink-0"
                onError={() => setSidebarImage(null)}
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#445446] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 select-none">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#1F2933] truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ key, label, Icon }) => {
            const isActive = activeSection === key;
            return (
              <Link
                key={key}
                to={`/dashboard/expert/${key}`}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[#445446]/10 text-[#445446]'
                    : 'text-gray-500 hover:text-[#1F2933] hover:bg-gray-50'
                }`}
              >
                <Icon active={isActive} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="p-3 border-t border-[#E4E7E4]">
          <button
            onClick={() => setShowSignOutConfirm(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all duration-150"
          >
            <LogoutIcon />
            Sign out
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
          onClick={(e) => { if (e.target === e.currentTarget) setShowSignOutConfirm(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-[#1F2933] text-center mb-1">
              Sign out?
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Are you sure you want to sign out of your account?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 py-2.5 px-4 rounded-lg border border-[#E4E7E4] text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={logout}
                className="flex-1 py-2.5 px-4 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors"
              >
                Yes, sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpertDashboard;
