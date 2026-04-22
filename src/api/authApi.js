import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL;

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // send the HTTP-only refresh token cookie on every request
});

// Set or clear the Authorization header on the shared instance
export const setAuthHeader = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// ─── Token refresh queue ─────────────────────────────────────────────────────
// Prevents multiple parallel refresh calls when several requests 401 at once.
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

// ─── 401 interceptor: auto-refresh then retry ────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Only intercept 401s that haven't been retried yet
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    // Skip refresh endpoint itself to avoid infinite loop
    if (original.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    // Skip public endpoints (login, register, etc.) — they have no Authorization
    // header and a 401 from them means bad credentials, not an expired token.
    if (!original.headers?.['Authorization']) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue this request until the ongoing refresh finishes
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
      // Use plain axios with withCredentials so the cookie is sent automatically
      const { data } = await axios.post(
        `${BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true }
      );

      setAuthHeader(data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Notify AuthContext of the new token
      window.dispatchEvent(
        new CustomEvent('auth:tokenRefreshed', {
          detail: { accessToken: data.accessToken, user: data.user },
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

// ─── Auth API calls ──────────────────────────────────────────────────────────
export const loginUser = async (data) => {
  const response = await api.post('/auth/login', data);
  return response.data;
};

export const registerUser = async (data) => {
  const response = await api.post('/auth/register', data);
  return response.data;
};

export const refreshAccessToken = async () => {
  // Cookie is sent automatically — no token in body
  const response = await axios.post(
    `${BASE_URL}/auth/refresh`,
    {},
    { withCredentials: true }
  );
  return response.data;
};

export const logoutUser = async () => {
  // Cookie is cleared server-side — nothing to pass in body
  await api.post('/auth/logout');
};

export const verifyEmail = async ({ userId, verificationCode }) => {
  const response = await api.post('/auth/verify-email', { userId, verificationCode });
  return response.data;
};

export const resendVerificationApi = async (email) => {
  const response = await api.post('/auth/resend-verification', { email });
  return response.data;
};

export const forgotPasswordApi = async (email) => {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
};

export const resetPasswordApi = async ({ token, password }) => {
  const response = await api.post('/auth/reset-password', { token, password });
  return response.data;
};

export const getProfileApi = async () => {
  const response = await api.get('/auth/profile');
  return response.data;
};

export const updateProfileApi = async ({ name, phone }) => {
  const response = await api.patch('/auth/profile', { name, phone });
  return response.data;
};

export const updateEmailApi = async ({ email, password }) => {
  const response = await api.patch('/auth/profile/email', { email, password });
  return response.data;
};

export const changePasswordApi = async ({ currentPassword, newPassword }) => {
  const response = await api.patch('/auth/profile/password', { currentPassword, newPassword });
  return response.data;
};

export const deleteAccountApi = async ({ password }) => {
  const response = await api.delete('/auth/account', { data: { password } });
  return response.data;
};

export const acceptPrivacyPolicyApi = async () => {
  const response = await api.post('/auth/accept-pp');
  return response.data;
};

export const getLegalVersionsApi = () =>
  axios.get(`${BASE_URL}/auth/legal-versions`).then((r) => r.data);

// ── 2FA ───────────────────────────────────────────────────────────────────────
export const verifyOtpApi = async ({ otp_token, code }) => {
  const response = await api.post('/auth/verify-otp', { otp_token, code });
  return response.data;
};

export const resendOtpApi = async ({ otp_token }) => {
  const response = await api.post('/auth/resend-otp', { otp_token });
  return response.data;
};

export const get2FAStatusApi = async () => {
  const response = await api.get('/auth/2fa/status');
  return response.data;
};

export const sendSetupOtpApi = async ({ purpose }) => {
  const response = await api.post('/auth/2fa/send-otp', { purpose });
  return response.data;
};

export const enable2FAApi = async ({ code }) => {
  const response = await api.post('/auth/2fa/enable', { code });
  return response.data;
};

export const disable2FAApi = async ({ code }) => {
  const response = await api.post('/auth/2fa/disable', { code });
  return response.data;
};
