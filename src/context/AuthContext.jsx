import { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { setAuthHeader, refreshAccessToken, logoutUser, acceptPrivacyPolicyApi } from '../api/authApi';
import { ClipboardDocumentIcon } from '../assets/icons';
import i18n from '../i18n';

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
const PrivacyPolicyUpdateModal = ({ onAccept, onDecline, accepting }) => {
  const { t } = useTranslation('legal');
  return (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
    <div className="bg-white rounded-2xl border border-[#E4E7E4] shadow-xl w-full max-w-md p-8">
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <ClipboardDocumentIcon className="w-6 h-6 text-amber-600" />
        </div>
        <h2 className="text-lg font-semibold text-[#1F2933] mb-2">{t('ppModal.title')}</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          {t('ppModal.body')}
        </p>
      </div>

      <div className="bg-[#F5F7F5] rounded-xl border border-[#E4E7E4] p-4 mb-6 text-sm text-gray-600 leading-relaxed">
        <Trans i18nKey="ppModal.readFull" ns="legal" components={[
          // eslint-disable-next-line jsx-a11y/anchor-has-content
          <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#445446] font-medium underline" />,
        ]} />
      </div>

      <button
        onClick={onAccept}
        disabled={accepting}
        className="w-full py-3 px-4 bg-[#445446] hover:bg-[#3a4a3b] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed mb-3"
      >
        {accepting ? t('ppModal.acceptingBtn') : t('ppModal.acceptBtn')}
      </button>
      <button
        onClick={onDecline}
        disabled={accepting}
        className="w-full py-2 px-4 text-sm text-gray-500 hover:text-[#1F2933] transition-colors disabled:opacity-60"
      >
        {t('ppModal.declineBtn')}
      </button>
    </div>
  </div>
  );
};

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
  const ppPendingRef = useRef(false); // deferred PP modal for booking routes

  const applyToken = useCallback((token) => {
    setAccessTokenState(token);
    setAuthHeader(token);
  }, []);

  // PP modal is suppressed on booking routes — shown only on the parent dashboard.
  const isBookingRoute = () => {
    const p = window.location.pathname;
    return p === '/book' || p.startsWith('/checkout') || p.startsWith('/booking');
  };

  const showOrDeferPp = useCallback(() => {
    if (isBookingRoute()) {
      ppPendingRef.current = true;
    } else {
      setTimeout(() => setPpUpdateRequired(true), 800);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        if (data.pp_update_required && data.user?.role !== 'ADMIN') {
          showOrDeferPp();
        }
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

  // ─── Cross-tab PP acceptance sync ──────────────────────────────────────────
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'pp_accepted') setPpUpdateRequired(false);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

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
      if (e.detail.pp_update_required && e.detail.user?.role !== 'ADMIN') {
        setTimeout(() => setPpUpdateRequired(true), 800);
      }
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
      if (data.pp_update_required && data.user?.role !== 'ADMIN') {
        setTimeout(() => setPpUpdateRequired(true), 800);
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
      await acceptPrivacyPolicyApi(i18n.language);
      setPpUpdateRequired(false);
      // Signal other open tabs to dismiss their modals too
      localStorage.setItem('pp_accepted', Date.now().toString());
    } catch {
      // Keep modal open on failure — user can retry
    } finally {
      setPpAccepting(false);
    }
  }, []);

  // Called by the parent dashboard on mount to fire any deferred PP modal.
  const triggerPpCheck = useCallback(() => {
    if (ppPendingRef.current) {
      ppPendingRef.current = false;
      setPpUpdateRequired(true);
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
    <AuthContext.Provider value={{ user, accessToken, login, logout, loading, updateUser, triggerPpCheck }}>
      {children}
      {ppUpdateRequired && window.location.pathname !== '/privacy-policy' && (
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
