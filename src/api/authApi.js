import axios from "axios";
import { api, setAuthHeader } from "../lib/axiosInstance";

export { api, setAuthHeader };

const BASE_URL = process.env.REACT_APP_API_URL;

// ─── Auth API calls ──────────────────────────────────────────────────────────
export const loginUser = async (data) => {
  const response = await api.post("/auth/login", data);
  return response.data;
};

export const registerUser = async (data) => {
  const response = await api.post("/auth/register", data);
  return response.data;
};

export const refreshAccessToken = async () => {
  const response = await axios.post(
    `${BASE_URL}/auth/refresh`,
    {},
    { withCredentials: true, headers: { "X-Requested-By": "sage-nest" } },
  );
  return response.data;
};

export const logoutUser = async () => {
  await api.post("/auth/logout");
};

export const verifyEmail = async ({ userId, verificationCode }) => {
  const response = await api.post("/auth/verify-email", {
    userId,
    verificationCode,
  });
  return response.data;
};

export const resendVerificationApi = async (email, returnTo) => {
  const response = await api.post("/auth/resend-verification", {
    email,
    ...(returnTo ? { returnTo } : {}),
  });
  return response.data;
};

export const forgotPasswordApi = async (email) => {
  const response = await api.post("/auth/forgot-password", { email });
  return response.data;
};

export const resetPasswordApi = async ({ token, password }) => {
  const response = await api.post("/auth/reset-password", { token, password });
  return response.data;
};

export const getProfileApi = async () => {
  const response = await api.get("/auth/profile");
  return response.data;
};

export const updateProfileApi = async ({ name, phone, city, timezone }) => {
  const response = await api.patch("/auth/profile", {
    name,
    phone,
    city,
    timezone,
  });
  return response.data;
};

export const updateEmailApi = async ({ email, password }) => {
  const response = await api.patch("/auth/profile/email", { email, password });
  return response.data;
};

export const changePasswordApi = async ({ currentPassword, newPassword }) => {
  const response = await api.patch("/auth/profile/password", {
    currentPassword,
    newPassword,
  });
  return response.data;
};

export const deleteAccountApi = async ({ password }) => {
  const response = await api.delete("/auth/account", { data: { password } });
  return response.data;
};

export const acceptPrivacyPolicyApi = async (language) => {
  const response = await api.post("/auth/accept-pp", { language });
  return response.data;
};

export const exportMyDataApi = async () => {
  const response = await api.get("/auth/data-export");
  return response.data;
};

export const getParentNotificationPrefsApi = async () => {
  const response = await api.get("/auth/notification-preferences");
  return response.data;
};

export const getLegalConsentsApi = async () => {
  const response = await api.get("/auth/legal-consents");
  return response.data;
};

export const updateMarketingConsentApi = async (consent) => {
  const response = await api.patch("/auth/marketing-consent", { consent });
  return response.data;
};

export const updateParentNotificationPrefsApi = async (prefs) => {
  const response = await api.patch("/auth/notification-preferences", prefs);
  return response.data;
};

export const getLegalVersionsApi = () =>
  axios.get(`${BASE_URL}/auth/legal-versions`).then((r) => r.data);

// ── 2FA ───────────────────────────────────────────────────────────────────────
export const verifyOtpApi = async ({ otp_token, code }) => {
  const response = await api.post("/auth/verify-otp", { otp_token, code });
  return response.data;
};

export const resendOtpApi = async ({ otp_token }) => {
  const response = await api.post("/auth/resend-otp", { otp_token });
  return response.data;
};

export const get2FAStatusApi = async () => {
  const response = await api.get("/auth/2fa/status");
  return response.data;
};

export const sendSetupOtpApi = async ({ purpose }) => {
  const response = await api.post("/auth/2fa/send-otp", { purpose });
  return response.data;
};

export const enable2FAApi = async ({ code }) => {
  const response = await api.post("/auth/2fa/enable", { code });
  return response.data;
};

export const disable2FAApi = async ({ code }) => {
  const response = await api.post("/auth/2fa/disable", { code });
  return response.data;
};
