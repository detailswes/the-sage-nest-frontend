import { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { setAuthHeader, refreshAccessToken, logoutUser, acceptPrivacyPolicyApi } from '../api/authApi';

const AuthContext = createContext(null);

// ─── Helpers ─────────────────────────────────────────────────────────────────
const readStoredUser = () => {
  try {
    const raw = localStorage.getItem('user');
    if (!raw || raw === 'undefined' || raw === 'null') return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

// ─── PP Re-acceptance Modal ───────────────────────────────────────────────────
const PrivacyPolicyUpdateModal = ({ onAccept, onDecline, accepting }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
    <div className="bg-white rounded-2xl border border-[#E4E7E4] shadow-xl w-full max-w-md p-8">
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-[#1F2933] mb-2">Privacy Policy Updated</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          Our Privacy Policy has been updated. Please review and accept the new version to continue using Sage Nest.
        </p>
      </div>

      <div className="bg-[#F5F7F5] rounded-xl border border-[#E4E7E4] p-4 mb-6 text-sm text-gray-600 leading-relaxed">
        You can read the full updated{' '}
        <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#445446] font-medium underline">
          Privacy Policy
        </a>{' '}
        before accepting.
      </div>

      <button
        onClick={onAccept}
        disabled={accepting}
        className="w-full py-3 px-4 bg-[#445446] hover:bg-[#3a4a3b] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed mb-3"
      >
        {accepting ? 'Saving…' : 'I accept the updated Privacy Policy'}
      </button>
      <button
        onClick={onDecline}
        disabled={accepting}
        className="w-full py-2 px-4 text-sm text-gray-500 hover:text-[#1F2933] transition-colors disabled:opacity-60"
      >
        Decline and log out
      </button>
    </div>
  </div>
);

// ─── Provider ────────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  // Initialise user synchronously from localStorage so GuestRoute/PrivateRoute
  // work on the very first render without waiting for the async refresh call.
  const [user, setUser] = useState(readStoredUser);
  const [accessToken, setAccessTokenState] = useState(null);
  // loading stays true only while we're waiting for the background refresh.
  // If there is no stored user there is nothing to restore.
  const [loading, setLoading] = useState(() => !!readStoredUser());
  const [ppUpdateRequired, setPpUpdateRequired] = useState(false);
  const [ppAccepting, setPpAccepting]           = useState(false);

  const applyToken = useCallback((token) => {
    setAccessTokenState(token);
    setAuthHeader(token);
  }, []);

  // Prevents React StrictMode's double-invocation from firing two concurrent
  // refresh calls, which causes the second one to 401 (token already rotated).
  const initAuthRan = useRef(false);

  // ─── Restore access token on app load ──────────────────────────────────────
  useEffect(() => {
    if (initAuthRan.current) return;
    initAuthRan.current = true;

    const initAuth = async () => {
      if (!readStoredUser()) {
        // No stored user — nothing to restore.
        setLoading(false);
        return;
      }

      try {
        // Cookie is sent automatically — no token needed in the call
        const data = await refreshAccessToken();
        applyToken(data.accessToken);
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
      } catch (err) {
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          // Cookie rejected by the server — force re-login.
          localStorage.removeItem('user');
          setUser(null);
        }
        // For network errors or 5xx: keep the optimistic user state intact.
        // Any protected API call will 401 → the interceptor will retry refresh.
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [applyToken]);

  // ─── Events from axios interceptor ─────────────────────────────────────────
  useEffect(() => {
    const handleLogout = () => {
      applyToken(null);
      setUser(null);
      setPpUpdateRequired(false);
      localStorage.removeItem('user');
    };

    const handleTokenRefreshed = (e) => {
      applyToken(e.detail.accessToken);
      setUser(e.detail.user);
      // interceptor already updated localStorage
    };

    window.addEventListener('auth:logout', handleLogout);
    window.addEventListener('auth:tokenRefreshed', handleTokenRefreshed);
    return () => {
      window.removeEventListener('auth:logout', handleLogout);
      window.removeEventListener('auth:tokenRefreshed', handleTokenRefreshed);
    };
  }, [applyToken]);

  // ─── Public API ────────────────────────────────────────────────────────────
  const login = useCallback(
    (data) => {
      if (!data?.accessToken || !data?.user) {
        console.error('[AuthContext] login() received unexpected data shape:', data);
        return;
      }
      applyToken(data.accessToken);
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      if (data.pp_update_required) {
        setPpUpdateRequired(true);
      }
    },
    [applyToken]
  );

  const logout = useCallback(async () => {
    try {
      await logoutUser(); // server clears the HTTP-only cookie
    } catch {
      // Best-effort
    }
    applyToken(null);
    setUser(null);
    setPpUpdateRequired(false);
    localStorage.removeItem('user');
  }, [applyToken]);

  const handlePpAccept = useCallback(async () => {
    setPpAccepting(true);
    try {
      await acceptPrivacyPolicyApi();
      setPpUpdateRequired(false);
    } catch {
      // Keep modal open on failure — user can retry
    } finally {
      setPpAccepting(false);
    }
  }, []);

  // Updates the user in state + localStorage after a profile edit
  const updateUser = useCallback((partial) => {
    setUser((prev) => {
      const updated = { ...prev, ...partial };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessToken, login, logout, loading, updateUser }}>
      {children}
      {ppUpdateRequired && (
        <PrivacyPolicyUpdateModal
          onAccept={handlePpAccept}
          onDecline={logout}
          accepting={ppAccepting}
        />
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
