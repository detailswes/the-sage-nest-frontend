import { createApi } from '@reduxjs/toolkit/query/react';
import axiosBaseQuery from '../store/baseQuery';

export const userApi = createApi({
  reducerPath: 'userApi',
  baseQuery: axiosBaseQuery,
  tagTypes: ['UserProfile', 'TwoFAStatus', 'NotificationPrefs', 'LegalConsents'],
  endpoints: (builder) => ({
    getProfile: builder.query({
      query: () => ({ url: '/auth/profile' }),
      providesTags: ['UserProfile'],
    }),
    updateProfile: builder.mutation({
      query: (data) => ({ url: '/auth/profile', method: 'PATCH', data }),
      invalidatesTags: ['UserProfile'],
    }),
    updateEmail: builder.mutation({
      query: (data) => ({ url: '/auth/profile/email', method: 'PATCH', data }),
    }),
    changePassword: builder.mutation({
      query: (data) => ({ url: '/auth/profile/password', method: 'PATCH', data }),
    }),
    deleteAccount: builder.mutation({
      query: (data) => ({ url: '/auth/account', method: 'DELETE', data }),
    }),
    exportMyData: builder.mutation({
      query: () => ({ url: '/auth/data-export' }),
    }),
    get2FAStatus: builder.query({
      query: () => ({ url: '/auth/2fa/status' }),
      providesTags: ['TwoFAStatus'],
    }),
    sendSetupOtp: builder.mutation({
      query: (data) => ({ url: '/auth/2fa/send-otp', method: 'POST', data }),
    }),
    enable2FA: builder.mutation({
      query: (data) => ({ url: '/auth/2fa/enable', method: 'POST', data }),
      invalidatesTags: ['TwoFAStatus'],
    }),
    disable2FA: builder.mutation({
      query: (data) => ({ url: '/auth/2fa/disable', method: 'POST', data }),
      invalidatesTags: ['TwoFAStatus'],
    }),
    getNotificationPrefs: builder.query({
      query: () => ({ url: '/auth/notification-preferences' }),
      providesTags: ['NotificationPrefs'],
    }),
    updateNotificationPrefs: builder.mutation({
      query: (data) => ({ url: '/auth/notification-preferences', method: 'PATCH', data }),
      invalidatesTags: ['NotificationPrefs'],
    }),
    getLegalConsents: builder.query({
      query: () => ({ url: '/auth/legal-consents' }),
      providesTags: ['LegalConsents'],
    }),
    updateMarketingConsent: builder.mutation({
      query: (consent) => ({ url: '/auth/marketing-consent', method: 'PATCH', data: { consent } }),
      invalidatesTags: ['LegalConsents'],
    }),
    getLegalVersions: builder.query({
      query: () => ({ url: '/auth/legal-versions' }),
    }),
    verifyEmail: builder.mutation({
      query: (data) => ({ url: '/auth/verify-email', method: 'POST', data }),
    }),
  }),
});

export const {
  useGetProfileQuery,
  useUpdateProfileMutation,
  useUpdateEmailMutation,
  useChangePasswordMutation,
  useDeleteAccountMutation,
  useExportMyDataMutation,
  useGet2FAStatusQuery,
  useSendSetupOtpMutation,
  useEnable2FAMutation,
  useDisable2FAMutation,
  useGetNotificationPrefsQuery,
  useUpdateNotificationPrefsMutation,
  useGetLegalConsentsQuery,
  useUpdateMarketingConsentMutation,
  useGetLegalVersionsQuery,
  useVerifyEmailMutation,
} = userApi;
