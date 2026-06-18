import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL;

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-By': 'sage-nest',
  },
  withCredentials: true,
});

export const setAuthHeader = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// ─── Token refresh queue ──────────────────────────────────────────────────────
let isRefreshing = false;
let pendingQueue = [];

const resolveQueue = (token) => {
  pendingQueue.forEach((cb) => cb.resolve(token));
  pendingQueue = [];
};

const rejectQueue = (err) => {
  pendingQueue.forEach((cb) => cb.reject(err));
  pendingQueue = [];
};

// ─── 401 interceptor: auto-refresh then retry ─────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (original.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    // Skip public endpoints — they have no Authorization header and a 401 from
    // them means bad credentials, not an expired token.
    if (!original.headers?.['Authorization']) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then((newToken) => {
        original.headers['Authorization'] = `Bearer ${newToken}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post(
        `${BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true, headers: { 'X-Requested-By': 'sage-nest' } }
      );

      setAuthHeader(data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      window.dispatchEvent(
        new CustomEvent('auth:tokenRefreshed', {
          detail: { accessToken: data.accessToken, user: data.user, pp_update_required: data.pp_update_required },
        })
      );

      resolveQueue(data.accessToken);
      original.headers['Authorization'] = `Bearer ${data.accessToken}`;
      return api(original);
    } catch (refreshError) {
      rejectQueue(refreshError);
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth:logout'));
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
