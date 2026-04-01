import { api } from './authApi';

// ── Expert list ───────────────────────────────────────────────────────────────
export const listExperts        = (params = {}) => api.get('/admin/experts', { params }).then((r) => r.data);

// ── Status actions ────────────────────────────────────────────────────────────
export const approveExpert      = (id) => api.post(`/admin/experts/${id}/approve`).then((r) => r.data);
export const rejectExpert       = (id) => api.post(`/admin/experts/${id}/reject`).then((r) => r.data);
export const suspendExpert      = (id) => api.post(`/admin/experts/${id}/suspend`).then((r) => r.data);
export const reactivateExpert   = (id) => api.post(`/admin/experts/${id}/reactivate`).then((r) => r.data);

// ── Moderation actions ────────────────────────────────────────────────────────
export const requestChanges     = (id, note) => api.post(`/admin/experts/${id}/request-changes`, { note }).then((r) => r.data);
export const unpublishExpert    = (id) => api.post(`/admin/experts/${id}/unpublish`).then((r) => r.data);
export const republishExpert    = (id) => api.post(`/admin/experts/${id}/republish`).then((r) => r.data);

// ── Support tools ─────────────────────────────────────────────────────────────
export const sendPasswordReset  = (id) => api.post(`/admin/experts/${id}/send-password-reset`).then((r) => r.data);
export const resendVerification = (id) => api.post(`/admin/experts/${id}/resend-verification`).then((r) => r.data);
export const manuallyVerify     = (id) => api.post(`/admin/experts/${id}/verify`).then((r) => r.data);

// ── Tax export ────────────────────────────────────────────────────────────────
export const exportTaxDataCsv   = (id, year) =>
  api.get(`/admin/experts/${id}/tax-export`, { params: { year }, responseType: 'blob' }).then((r) => r.data);

// ── GDPR ──────────────────────────────────────────────────────────────────────
export const gdprDeleteExpert   = (id, confirmEmail) =>
  api.post(`/admin/experts/${id}/gdpr-delete`, { confirm_email: confirmEmail }).then((r) => r.data);

// ── Bookings ──────────────────────────────────────────────────────────────────
export const listExpertBookings = (expertId) => api.get('/admin/bookings', { params: { expertId } }).then((r) => r.data);
export const adminManualRefund  = (bookingId, reason) => api.post(`/admin/bookings/${bookingId}/refund`, { reason }).then((r) => r.data);

// ── Legal documents ───────────────────────────────────────────────────────────
export const getLegalDocuments  = () => api.get('/admin/legal-documents').then((r) => r.data);
export const bumpLegalDocument  = (type, version) => api.post('/admin/legal-documents/bump', { type, version }).then((r) => r.data);

// ── Audit log ─────────────────────────────────────────────────────────────────
export const getAuditLog        = (entityId, entityType = 'EXPERT', page = 1) =>
  api.get('/admin/audit-log', { params: { entityId, entityType, page } }).then((r) => r.data);

// ── Parent list ───────────────────────────────────────────────────────────────
export const listParents        = (params = {}) => api.get('/admin/parents', { params }).then((r) => r.data);

// ── Parent bookings ───────────────────────────────────────────────────────────
export const listParentBookings = (parentId) => api.get(`/admin/parents/${parentId}/bookings`).then((r) => r.data);

// ── Parent status actions ─────────────────────────────────────────────────────
export const activateParent     = (id) => api.post(`/admin/parents/${id}/activate`).then((r) => r.data);
export const deactivateParent   = (id) => api.post(`/admin/parents/${id}/deactivate`).then((r) => r.data);
export const suspendParent      = (id) => api.post(`/admin/parents/${id}/suspend`).then((r) => r.data);

// ── Parent GDPR ───────────────────────────────────────────────────────────────
export const gdprDeleteParent   = (id, confirmEmail) =>
  api.post(`/admin/parents/${id}/gdpr-delete`, { confirm_email: confirmEmail }).then((r) => r.data);
