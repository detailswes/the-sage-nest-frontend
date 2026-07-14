import { createApi } from "@reduxjs/toolkit/query/react";
import axiosBaseQuery from "../store/baseQuery";

export const adminApi = createApi({
  reducerPath: "adminApi",
  baseQuery: axiosBaseQuery,
  tagTypes: [
    "Expert",
    "Parent",
    "Booking",
    "Transaction",
    "LegalDocument",
    "AdminNotification",
    "WebflowSync",
  ],
  endpoints: (builder) => ({
    // ── Expert list ───────────────────────────────────────────────────────────
    listExperts: builder.query({
      query: (params = {}) => ({ url: "/admin/experts", params }),
      providesTags: ["Expert"],
    }),
    exportExpertsXlsx: builder.mutation({
      query: (params = {}) => ({
        url: "/admin/experts/export",
        params,
        responseType: "blob",
      }),
    }),

    // ── Status actions ────────────────────────────────────────────────────────
    approveExpert: builder.mutation({
      query: (id) => ({ url: `/admin/experts/${id}/approve`, method: "POST" }),
      invalidatesTags: (result, error, id) => [
        "Expert",
        { type: "Expert", id },
      ],
    }),
    rejectExpert: builder.mutation({
      query: (id) => ({ url: `/admin/experts/${id}/reject`, method: "POST" }),
      invalidatesTags: (result, error, id) => [
        "Expert",
        { type: "Expert", id },
      ],
    }),
    suspendExpert: builder.mutation({
      query: (id) => ({ url: `/admin/experts/${id}/suspend`, method: "POST" }),
      invalidatesTags: (result, error, id) => [
        "Expert",
        { type: "Expert", id },
      ],
    }),
    reactivateExpert: builder.mutation({
      query: (id) => ({
        url: `/admin/experts/${id}/reactivate`,
        method: "POST",
      }),
      invalidatesTags: (result, error, id) => [
        "Expert",
        { type: "Expert", id },
      ],
    }),

    // ── Profile draft review ──────────────────────────────────────────────────
    approveProfileDraft: builder.mutation({
      query: (id) => ({
        url: `/admin/experts/${id}/draft/approve`,
        method: "POST",
      }),
      invalidatesTags: (result, error, id) => [
        "Expert",
        { type: "Expert", id },
      ],
    }),
    // arg: { id, note }
    rejectProfileDraft: builder.mutation({
      query: ({ id, note }) => ({
        url: `/admin/experts/${id}/draft/reject`,
        method: "POST",
        data: { note },
      }),
      invalidatesTags: (result, error, { id }) => [
        "Expert",
        { type: "Expert", id },
      ],
    }),

    // ── Moderation actions ────────────────────────────────────────────────────
    // arg: { id, note }
    requestChanges: builder.mutation({
      query: ({ id, note }) => ({
        url: `/admin/experts/${id}/request-changes`,
        method: "POST",
        data: { note },
      }),
      invalidatesTags: (result, error, { id }) => [
        "Expert",
        { type: "Expert", id },
      ],
    }),
    unpublishExpert: builder.mutation({
      query: (id) => ({
        url: `/admin/experts/${id}/unpublish`,
        method: "POST",
      }),
      invalidatesTags: (result, error, id) => [
        "Expert",
        { type: "Expert", id },
      ],
    }),
    republishExpert: builder.mutation({
      query: (id) => ({
        url: `/admin/experts/${id}/republish`,
        method: "POST",
      }),
      invalidatesTags: (result, error, id) => [
        "Expert",
        { type: "Expert", id },
      ],
    }),

    // ── Support tools ─────────────────────────────────────────────────────────
    sendPasswordReset: builder.mutation({
      query: (id) => ({
        url: `/admin/experts/${id}/send-password-reset`,
        method: "POST",
      }),
    }),
    resendVerification: builder.mutation({
      query: (id) => ({
        url: `/admin/experts/${id}/resend-verification`,
        method: "POST",
      }),
    }),
    manuallyVerify: builder.mutation({
      query: (id) => ({ url: `/admin/experts/${id}/verify`, method: "POST" }),
      invalidatesTags: (result, error, id) => [
        "Expert",
        { type: "Expert", id },
      ],
    }),

    // ── Tax export ────────────────────────────────────────────────────────────
    // arg: { id, year }
    exportTaxDataCsv: builder.mutation({
      query: ({ id, year }) => ({
        url: `/admin/experts/${id}/tax-export`,
        params: { year },
        responseType: "blob",
      }),
    }),
    // arg: { id, year, status? }
    getExpertYearlySummary: builder.query({
      query: ({ id, year, status = "ALL" }) => ({
        url: `/admin/experts/${id}/yearly-summary`,
        params: { year, status },
      }),
    }),

    // ── Language approvals ────────────────────────────────────────────────────
    // arg: { id, language }
    approveLanguage: builder.mutation({
      query: ({ id, language }) => ({
        url: `/admin/experts/${id}/languages/approve`,
        method: "POST",
        data: { language },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Expert", id }],
    }),
    rejectLanguage: builder.mutation({
      query: ({ id, language }) => ({
        url: `/admin/experts/${id}/languages/reject`,
        method: "POST",
        data: { language },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Expert", id }],
    }),

    // ── GDPR ──────────────────────────────────────────────────────────────────
    // arg: { id, confirmEmail }
    gdprDeleteExpert: builder.mutation({
      query: ({ id, confirmEmail }) => ({
        url: `/admin/experts/${id}/gdpr-delete`,
        method: "POST",
        data: { confirm_email: confirmEmail },
      }),
      invalidatesTags: ["Expert"],
    }),

    // ── Expert detail + bookings ──────────────────────────────────────────────
    getExpertDetail: builder.query({
      query: (id) => ({ url: `/admin/experts/${id}` }),
      providesTags: (result, error, id) => [{ type: "Expert", id }],
    }),
    listExpertBookings: builder.query({
      query: (expertId) => ({ url: "/admin/bookings", params: { expertId } }),
      providesTags: ["Booking"],
    }),
    // arg: { bookingId, reason, amount?, overrideReason? }
    adminManualRefund: builder.mutation({
      query: ({ bookingId, reason, amount, overrideReason }) => ({
        url: `/admin/bookings/${bookingId}/refund`,
        method: "POST",
        data: {
          reason,
          ...(amount != null ? { amount } : {}),
          ...(overrideReason ? { override_reason: overrideReason } : {}),
        },
      }),
      invalidatesTags: ["Booking", "Transaction"],
    }),
    listAllBookings: builder.query({
      query: (params = {}) => ({ url: "/admin/bookings/all", params }),
      providesTags: ["Booking"],
    }),
    getBookingDetail: builder.query({
      query: (id) => ({ url: `/admin/bookings/${id}` }),
      providesTags: (result, error, id) => [{ type: "Booking", id }],
    }),
    // arg: { id, reason }
    adminCancelBooking: builder.mutation({
      query: ({ id, reason }) => ({
        url: `/admin/bookings/${id}/cancel`,
        method: "POST",
        data: { reason },
      }),
      invalidatesTags: (result, error, { id }) => [
        "Booking",
        { type: "Booking", id },
      ],
    }),
    // arg: { id, disputed, reason }
    markBookingDisputed: builder.mutation({
      query: ({ id, disputed, reason }) => ({
        url: `/admin/bookings/${id}/dispute`,
        method: "POST",
        data: { disputed, reason },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Booking", id }],
    }),
    // arg: { id, note }
    updateBookingNote: builder.mutation({
      query: ({ id, note }) => ({
        url: `/admin/bookings/${id}/note`,
        method: "PUT",
        data: { note },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Booking", id }],
    }),

    // ── Legal documents ───────────────────────────────────────────────────────
    getLegalDocuments: builder.query({
      query: () => ({ url: "/admin/legal-documents" }),
      providesTags: ["LegalDocument"],
    }),
    // arg: { type, version }
    bumpLegalDocument: builder.mutation({
      query: ({ type, version }) => ({
        url: "/admin/legal-documents/bump",
        method: "POST",
        data: { type, version },
      }),
      invalidatesTags: ["LegalDocument"],
    }),

    // ── Audit log ─────────────────────────────────────────────────────────────
    // arg: { entityId, entityType?, page? }
    getAuditLog: builder.query({
      query: ({ entityId, entityType = "EXPERT", page = 1 }) => ({
        url: "/admin/audit-log",
        params: { entityId, entityType, page },
      }),
    }),

    // ── Parent list ───────────────────────────────────────────────────────────
    listParents: builder.query({
      query: (params = {}) => ({ url: "/admin/parents", params }),
      providesTags: ["Parent"],
    }),
    exportParentsXlsx: builder.mutation({
      query: (params = {}) => ({
        url: "/admin/parents/export",
        params,
        responseType: "blob",
      }),
    }),

    // ── Parent detail ─────────────────────────────────────────────────────────
    getParentDetail: builder.query({
      query: (id) => ({ url: `/admin/parents/${id}` }),
      providesTags: (result, error, id) => [{ type: "Parent", id }],
    }),
    listParentBookings: builder.query({
      query: (parentId) => ({ url: `/admin/parents/${parentId}/bookings` }),
      providesTags: ["Booking"],
    }),

    // ── Parent status actions ─────────────────────────────────────────────────
    activateParent: builder.mutation({
      query: (id) => ({ url: `/admin/parents/${id}/activate`, method: "POST" }),
      invalidatesTags: (result, error, id) => [
        "Parent",
        { type: "Parent", id },
      ],
    }),
    getParentSuspensionPreview: builder.query({
      query: (id) => ({ url: `/admin/parents/${id}/suspension-preview` }),
    }),
    suspendParent: builder.mutation({
      query: ({ id, reason } = {}) => ({
        url: `/admin/parents/${id}/suspend`,
        method: "POST",
        data: reason ? { reason } : undefined,
      }),
      invalidatesTags: (result, error, { id } = {}) => [
        "Parent",
        { type: "Parent", id },
      ],
    }),

    // ── Parent support tools ──────────────────────────────────────────────────
    sendParentPasswordReset: builder.mutation({
      query: (id) => ({
        url: `/admin/parents/${id}/send-password-reset`,
        method: "POST",
      }),
    }),
    resendParentVerification: builder.mutation({
      query: (id) => ({
        url: `/admin/parents/${id}/resend-verification`,
        method: "POST",
      }),
    }),
    manuallyVerifyParent: builder.mutation({
      query: (id) => ({ url: `/admin/parents/${id}/verify`, method: "POST" }),
      invalidatesTags: (result, error, id) => [
        "Parent",
        { type: "Parent", id },
      ],
    }),

    // ── Parent GDPR ───────────────────────────────────────────────────────────
    // arg: { id, confirmEmail }
    gdprDeleteParent: builder.mutation({
      query: ({ id, confirmEmail }) => ({
        url: `/admin/parents/${id}/gdpr-delete`,
        method: "POST",
        data: { confirm_email: confirmEmail },
      }),
      invalidatesTags: ["Parent"],
    }),

    // ── Compliance ────────────────────────────────────────────────────────────
    getParentComplianceList: builder.query({
      query: (params = {}) => ({ url: "/admin/compliance/parents", params }),
    }),

    // ── Transactions ──────────────────────────────────────────────────────────
    listTransactions: builder.query({
      query: (params = {}) => ({ url: "/admin/transactions", params }),
      providesTags: ["Transaction"],
    }),
    exportTransactionsCsv: builder.mutation({
      query: (params = {}) => ({
        url: "/admin/transactions/export",
        params,
        responseType: "blob",
      }),
    }),
    exportTransactionsXlsx: builder.mutation({
      query: (params = {}) => ({
        url: "/admin/transactions/export",
        params: { ...params, format: "xlsx" },
        responseType: "blob",
      }),
    }),
    adminRetryTransfer: builder.mutation({
      query: (id) => ({
        url: `/admin/bookings/${id}/retry-transfer`,
        method: "POST",
      }),
      invalidatesTags: ["Transaction", "Booking"],
    }),
    // arg: { id, note }
    adminMarkTransferResolved: builder.mutation({
      query: ({ id, note }) => ({
        url: `/admin/bookings/${id}/mark-transfer-resolved`,
        method: "POST",
        data: { note },
      }),
      invalidatesTags: ["Transaction", "Booking"],
    }),
    getRefundLog: builder.query({
      query: (params = {}) => ({ url: "/admin/refund-log", params }),
    }),

    // ── Notifications ─────────────────────────────────────────────────────────
    getAdminNotifications: builder.query({
      query: () => ({ url: "/admin/notifications" }),
      providesTags: ["AdminNotification"],
    }),

    // ── Webflow sync health ──────────────────────────────────────────────────
    getWebflowSyncFailures: builder.query({
      query: (params = {}) => ({ url: "/admin/webflow/failures", params }),
      providesTags: ["WebflowSync"],
    }),
    retryWebflowSyncFailure: builder.mutation({
      query: (id) => ({
        url: `/admin/webflow/failures/${id}/retry`,
        method: "POST",
      }),
      invalidatesTags: ["WebflowSync"],
    }),
    retryAllWebflowSyncFailures: builder.mutation({
      query: () => ({
        url: "/admin/webflow/failures/retry-bulk",
        method: "POST",
      }),
      invalidatesTags: ["WebflowSync"],
    }),
    syncAllWebflow: builder.mutation({
      query: () => ({
        url: "/admin/webflow/sync-all",
        method: "POST",
      }),
      invalidatesTags: ["WebflowSync", "Expert"],
    }),
  }),
});

export const {
  useListExpertsQuery,
  useExportExpertsXlsxMutation,
  useApproveExpertMutation,
  useRejectExpertMutation,
  useSuspendExpertMutation,
  useReactivateExpertMutation,
  useApproveProfileDraftMutation,
  useRejectProfileDraftMutation,
  useRequestChangesMutation,
  useUnpublishExpertMutation,
  useRepublishExpertMutation,
  useSendPasswordResetMutation,
  useResendVerificationMutation,
  useManuallyVerifyMutation,
  useExportTaxDataCsvMutation,
  useGetExpertYearlySummaryQuery,
  useApproveLanguageMutation,
  useRejectLanguageMutation,
  useGdprDeleteExpertMutation,
  useGetExpertDetailQuery,
  useListExpertBookingsQuery,
  useAdminManualRefundMutation,
  useListAllBookingsQuery,
  useGetBookingDetailQuery,
  useAdminCancelBookingMutation,
  useMarkBookingDisputedMutation,
  useUpdateBookingNoteMutation,
  useGetLegalDocumentsQuery,
  useBumpLegalDocumentMutation,
  useGetAuditLogQuery,
  useListParentsQuery,
  useExportParentsXlsxMutation,
  useGetParentDetailQuery,
  useListParentBookingsQuery,
  useActivateParentMutation,
  useGetParentSuspensionPreviewQuery,
  useLazyGetParentSuspensionPreviewQuery,
  useSuspendParentMutation,
  useSendParentPasswordResetMutation,
  useResendParentVerificationMutation,
  useManuallyVerifyParentMutation,
  useGdprDeleteParentMutation,
  useGetParentComplianceListQuery,
  useListTransactionsQuery,
  useExportTransactionsCsvMutation,
  useAdminRetryTransferMutation,
  useAdminMarkTransferResolvedMutation,
  useGetRefundLogQuery,
  useGetAdminNotificationsQuery,
  useExportTransactionsXlsxMutation,
  useGetWebflowSyncFailuresQuery,
  useRetryWebflowSyncFailureMutation,
  useRetryAllWebflowSyncFailuresMutation,
  useSyncAllWebflowMutation,
} = adminApi;