import axios from 'axios';
import { api } from './authApi';

const BASE_URL = process.env.REACT_APP_API_URL;

// ─── Public (no auth required) ───────────────────────────────────────────────

/** List all approved experts — used by parents browsing the platform */
export const listExperts = () =>
  axios.get(`${BASE_URL}/experts`).then((r) => r.data);

/** Get a single expert's public profile */
export const getExpertPublic = (id) =>
  axios.get(`${BASE_URL}/experts/${id}`).then((r) => r.data);

// ─── Profile ──────────────────────────────────────────────────────────────────
export const getMyProfile = () => api.get('/experts/me').then((r) => r.data);

export const updateMyProfile = (data) =>
  api.put('/experts/me', data).then((r) => r.data);

export const getMyProfileDraft = () =>
  api.get('/experts/me/draft').then((r) => r.data);

export const uploadProfileImage = (file) => {
  const fd = new FormData();
  fd.append('profile_image', file);
  return api
    .post('/experts/me/profile-image', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);
};

// ─── Qualifications ───────────────────────────────────────────────────────────
export const addQualification = ({ type, custom_name, document }) => {
  const fd = new FormData();
  fd.append('type', type);
  if (custom_name) fd.append('custom_name', custom_name);
  if (document) fd.append('document', document);
  return api
    .post('/experts/me/qualifications', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);
};

export const updateQualification = (id, { custom_name, document }) => {
  const fd = new FormData();
  if (custom_name !== undefined) fd.append('custom_name', custom_name);
  if (document) fd.append('document', document);
  return api
    .put(`/experts/me/qualifications/${id}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);
};

export const deleteQualification = (id) =>
  api.delete(`/experts/me/qualifications/${id}`).then((r) => r.data);

// ─── Certifications ───────────────────────────────────────────────────────────
export const addCertification = ({ name, document }) => {
  const fd = new FormData();
  fd.append('name', name);
  if (document) fd.append('document', document);
  return api
    .post('/experts/me/certifications', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);
};

export const updateCertification = (id, { name, document }) => {
  const fd = new FormData();
  if (name) fd.append('name', name);
  if (document) fd.append('document', document);
  return api
    .put(`/experts/me/certifications/${id}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);
};

export const deleteCertification = (id) =>
  api.delete(`/experts/me/certifications/${id}`).then((r) => r.data);

// ─── Insurance ────────────────────────────────────────────────────────────────
export const saveInsurance = ({ policy_expires_at, document }) => {
  const fd = new FormData();
  fd.append('policy_expires_at', policy_expires_at);
  if (document) fd.append('document', document);
  return api
    .put('/experts/me/insurance', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);
};

export const deleteInsurance = () =>
  api.delete('/experts/me/insurance').then((r) => r.data);

// ─── Business Information ──────────────────────────────────────────────────────
export const saveBusinessInfo = (data) =>
  api.put('/experts/me/business-info', data).then((r) => r.data);

// ─── Notification Preferences ─────────────────────────────────────────────────
export const getNotificationPreferences = () =>
  api.get('/experts/me/notification-preferences').then((r) => r.data);

export const updateNotificationPreferences = (prefs) =>
  api.put('/experts/me/notification-preferences', prefs).then((r) => r.data);

// ─── GDPR Data Export ─────────────────────────────────────────────────────────
export const exportMyData = () =>
  api.get('/experts/me/export').then((r) => r.data);

// ─── Services ─────────────────────────────────────────────────────────────────
export const listServices = () => api.get('/services').then((r) => r.data);
export const createService = (data) => api.post('/services', data).then((r) => r.data);
export const updateService = (id, data) => api.put(`/services/${id}`, data).then((r) => r.data);
export const deleteService = (id) => api.delete(`/services/${id}`).then((r) => r.data);
export const reorderServices = (ids) => api.put('/services/reorder', { ids }).then((r) => r.data);

// ─── Availability ─────────────────────────────────────────────────────────────
export const listAvailability = () => api.get('/availability').then((r) => r.data);
export const addAvailabilitySlot = (data) => api.post('/availability', data).then((r) => r.data);
export const removeAvailabilitySlot = (id) => api.delete(`/availability/${id}`).then((r) => r.data);
export const checkAvailabilityConflicts = (id) => api.get(`/availability/${id}/conflicts`).then((r) => r.data);
