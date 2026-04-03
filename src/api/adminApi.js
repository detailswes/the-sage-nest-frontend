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
export const exportTaxDataCsv       = (id, year) =>
  api.get(`/admin/experts/${id}/tax-export`, { params: { year }, responseType: 'blob' }).then((r) => r.data);

export const getExpertYearlySummary = (id, year, status = "ALL") =>
  api.get(`/admin/experts/${id}/yearly-summary`, { params: { year, status } }).then((r) => r.data);

// ── GDPR ──────────────────────────────────────────────────────────────────────
export const gdprDeleteExpert   = (id, confirmEmail) =>
  api.post(`/admin/experts/${id}/gdpr-delete`, { confirm_email: confirmEmail }).then((r) => r.data);

// ── Bookings ──────────────────────────────────────────────────────────────────
export const getExpertDetail       = (id) => api.get(`/admin/experts/${id}`).then((r) => r.data);
export const listExpertBookings    = (expertId) => api.get('/admin/bookings', { params: { expertId } }).then((r) => r.data);
export const adminManualRefund     = (bookingId, reason, amount) => api.post(`/admin/bookings/${bookingId}/refund`, { reason, ...(amount != null ? { amount } : {}) }).then((r) => r.data);
export const listAllBookings       = (params = {}) => api.get('/admin/bookings/all', { params }).then((r) => r.data);
export const getBookingDetail      = (id) => api.get(`/admin/bookings/${id}`).then((r) => r.data);
export const adminCancelBooking    = (id, reason) => api.post(`/admin/bookings/${id}/cancel`, { reason }).then((r) => r.data);
export const markBookingDisputed   = (id, disputed, reason) => api.post(`/admin/bookings/${id}/dispute`, { disputed, reason }).then((r) => r.data);
export const updateBookingNote     = (id, note) => api.put(`/admin/bookings/${id}/note`, { note }).then((r) => r.data);

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

// ── Transactions (Payment Overview) ──────────────────────────────────────────
export const listTransactions      = (params = {}) => api.get('/admin/transactions', { params }).then((r) => r.data);
export const exportTransactionsCsv = (params = {}) =>
  api.get('/admin/transactions/export', { params, responseType: 'blob' }).then((r) => r.data);
