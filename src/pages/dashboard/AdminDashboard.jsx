import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// ─── Icons ────────────────────────────────────────────────────────────────────
const UsersIcon = ({ active }) => (
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
    className={`w-5 h-5 flex-shrink-0 ${active ? 'text-[#445446]' : 'text-current'}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
);

const NAV_ITEMS = [
  { path: 'experts',          label: 'Expert Management', Icon: UsersIcon },
  { path: 'legal-documents',  label: 'Legal Documents',   Icon: DocumentIcon },
];

// ─── Component ────────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const lastSegment = location.pathname.split('/').pop();
  const activeSection = ['experts', 'legal-documents'].includes(lastSegment) ? lastSegment : 'experts';

  const initials = user?.name
    ? user.name.trim().split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'A';

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

        {/* Admin badge + user info */}
        <div className="px-4 py-4 border-b border-[#E4E7E4]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#445446] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 select-none">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-[#1F2933] truncate">{user?.name}</p>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#445446] text-white flex-shrink-0">
                  ADMIN
                </span>
              </div>
              <p className="text-xs text-gray-400 truncate mt-0.5">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ path, label, Icon }) => {
            const isActive = activeSection === path;
            return (
              <Link
                key={path}
                to={path}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
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
            <h3 className="text-base font-semibold text-[#1F2933] text-center mb-1">Sign out?</h3>
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

export default AdminDashboard;
