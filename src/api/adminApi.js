import { api } from './authApi';

export const listExperts          = (params = {}) => api.get('/admin/experts', { params }).then((r) => r.data);
export const approveExpert        = (id) => api.post(`/admin/experts/${id}/approve`).then((r) => r.data);
export const rejectExpert         = (id) => api.post(`/admin/experts/${id}/reject`).then((r) => r.data);
export const suspendExpert        = (id) => api.post(`/admin/experts/${id}/suspend`).then((r) => r.data);
export const reactivateExpert     = (id) => api.post(`/admin/experts/${id}/reactivate`).then((r) => r.data);
export const sendPasswordReset    = (id) => api.post(`/admin/experts/${id}/send-password-reset`).then((r) => r.data);
export const resendVerification   = (id) => api.post(`/admin/experts/${id}/resend-verification`).then((r) => r.data);
export const manuallyVerify       = (id) => api.post(`/admin/experts/${id}/verify`).then((r) => r.data);
export const exportTaxDataCsv     = (id, year) =>
  api.get(`/admin/experts/${id}/tax-export`, { params: { year }, responseType: 'blob' }).then((r) => r.data);

export const listExpertBookings   = (expertId) => api.get('/admin/bookings', { params: { expertId } }).then((r) => r.data);
export const adminManualRefund    = (bookingId, reason) => api.post(`/admin/bookings/${bookingId}/refund`, { reason }).then((r) => r.data);

export const getLegalDocuments    = () => api.get('/admin/legal-documents').then((r) => r.data);
export const bumpLegalDocument    = (type, version) => api.post('/admin/legal-documents/bump', { type, version }).then((r) => r.data);
