import { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { setAuthHeader, refreshAccessToken, logoutUser } from '../api/authApi';
import i18n, { STORAGE_KEY as LANG_STORAGE_KEY } from '../i18n';

const AuthContext = createContext(null);

// ─── Helpers ─────────────────────────────────────────────────────────────────
// Once a user is known (login, session restore, token refresh), their saved
// language preference wins over whatever localStorage/browser detection had
// guessed — it's an explicit, durable choice, not a changeable default.
const syncLanguageFromUser = (user) => {
  if (user?.language && ['en', 'it'].includes(user.language) && user.language !== i18n.language) {
    i18n.changeLanguage(user.language);
    localStorage.setItem(LANG_STORAGE_KEY, user.language);
  }
};

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem('user');
    if (!raw || raw === 'undefined' || raw === 'null') return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
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
        syncLanguageFromUser(data.user);
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
      localStorage.removeItem('user');
    };

    const handleTokenRefreshed = (e) => {
      applyToken(e.detail.accessToken);
      setUser(e.detail.user);
      // interceptor already updated localStorage
      syncLanguageFromUser(e.detail.user);
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
      syncLanguageFromUser(data.user);
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
    localStorage.removeItem('user');
  }, [applyToken]);

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
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
