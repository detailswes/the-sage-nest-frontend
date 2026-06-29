import { createApi } from '@reduxjs/toolkit/query/react';
import axiosBaseQuery from '../store/baseQuery';

export const bookingApi = createApi({
  reducerPath: 'bookingApi',
  baseQuery: axiosBaseQuery,
  tagTypes: ['Booking', 'UpcomingAppointment', 'PastAppointment', 'CalendarBooking', 'SlotLock'],
  endpoints: (builder) => ({

    // ─── Parent booking flow ───────────────────────────────────────────────────
    createBooking: builder.mutation({
      query: (data) => ({ url: '/bookings', method: 'POST', data }),
      invalidatesTags: ['Booking', 'UpcomingAppointment'],
    }),
    getBookingById: builder.query({
      query: (id) => ({ url: `/bookings/${id}` }),
      providesTags: (result, error, id) => [{ type: 'Booking', id }],
    }),
    getMyBookings: builder.query({
      query: () => ({ url: '/bookings/my' }),
      providesTags: ['Booking'],
    }),
    // arg: { id, reason? }
    cancelBooking: builder.mutation({
      query: ({ id, reason }) => ({ url: `/bookings/${id}`, method: 'DELETE', data: { reason } }),
      invalidatesTags: (result, error, { id }) => ['Booking', { type: 'Booking', id }],
    }),
    // arg: { id, newScheduledAt }
    rescheduleBooking: builder.mutation({
      query: ({ id, newScheduledAt }) => ({ url: `/bookings/${id}/reschedule`, method: 'PATCH', data: { newScheduledAt } }),
      invalidatesTags: (result, error, { id }) => ['Booking', { type: 'Booking', id }, 'UpcomingAppointment', 'CalendarBooking'],
    }),

    // ─── Public slot availability ──────────────────────────────────────────────
    // arg: { expertId, date, serviceId }
    getAvailableSlots: builder.query({
      query: ({ expertId, date, serviceId }) => ({ url: '/availability/slots', params: { expertId, date, serviceId } }),
    }),
    // arg: { expertId, year, month, serviceId }
    // Returns array of date strings; consumer converts to Set if needed.
    getAvailableDatesInMonth: builder.query({
      query: ({ expertId, year, month, serviceId }) => ({
        url: '/availability/available-dates',
        params: { expertId, year, month, serviceId },
      }),
      transformResponse: (response) => response.available_dates,
    }),

    // ─── Expert dashboard ──────────────────────────────────────────────────────
    getUpcomingAppointments: builder.query({
      query: () => ({ url: '/bookings/upcoming' }),
      providesTags: ['UpcomingAppointment'],
    }),
    // arg: page? (number, default 1)
    getPastAppointments: builder.query({
      query: (page = 1) => ({ url: '/bookings/past', params: { page } }),
      providesTags: ['PastAppointment'],
    }),
    // arg: { from, to }
    getCalendarBookings: builder.query({
      query: ({ from, to }) => ({ url: '/bookings/calendar', params: { from, to } }),
      providesTags: ['CalendarBooking'],
    }),
    markSessionLinkSent: builder.mutation({
      query: (id) => ({ url: `/bookings/${id}/link-sent`, method: 'PATCH' }),
      invalidatesTags: (result, error, id) => [{ type: 'Booking', id }, 'UpcomingAppointment'],
    }),
    // arg: { id, note? }
    markBookingComplete: builder.mutation({
      query: ({ id, note }) => ({ url: `/bookings/${id}/complete`, method: 'PATCH', data: { note } }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Booking', id }, 'UpcomingAppointment', 'PastAppointment'],
    }),
    // arg: { id, note }
    saveExpertNote: builder.mutation({
      query: ({ id, note }) => ({ url: `/bookings/${id}/expert-note`, method: 'PATCH', data: { note } }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Booking', id }],
    }),
    expertCancelBooking: builder.mutation({
      query: (id) => ({ url: `/bookings/${id}/expert-cancel`, method: 'POST' }),
      invalidatesTags: (result, error, id) => ['Booking', { type: 'Booking', id }, 'UpcomingAppointment', 'CalendarBooking'],
    }),
    verifyPayment: builder.mutation({
      query: (id) => ({ url: `/bookings/${id}/verify-payment`, method: 'POST' }),
      invalidatesTags: (result, error, id) => [{ type: 'Booking', id }],
    }),
    abandonBooking: builder.mutation({
      query: (id) => ({ url: `/bookings/${id}/abandon`, method: 'POST' }),
      invalidatesTags: (result, error, id) => ['Booking', { type: 'Booking', id }],
    }),
    // arg: { id, delay_minutes, note? }
    notifyImLate: builder.mutation({
      query: ({ id, delay_minutes, note }) => ({
        url:    `/bookings/${id}/im-late`,
        method: 'POST',
        data:   { delay_minutes, note },
      }),
      invalidatesTags: (result, error, { id }) => ['Booking', { type: 'Booking', id }],
    }),

    // ─── T&C version ──────────────────────────────────────────────────────────
    getCurrentTcVersion: builder.query({
      query: () => ({ url: '/bookings/tc-version' }),
    }),
    acceptTc: builder.mutation({
      query: () => ({ url: '/bookings/accept-tc', method: 'POST' }),
    }),

    // ─── Slot locking ──────────────────────────────────────────────────────────
    // arg: { expertId, slotStart }
    lockSlot: builder.mutation({
      query: ({ expertId, slotStart }) => ({ url: '/availability/lock-slot', method: 'POST', data: { expertId, slotStart } }),
      providesTags: ['SlotLock'],
    }),
    releaseLock: builder.mutation({
      query: (lockId) => ({ url: `/availability/lock-slot/${lockId}`, method: 'DELETE' }),
      invalidatesTags: ['SlotLock'],
    }),
  }),
});

export const {
  useCreateBookingMutation,
  useGetBookingByIdQuery,
  useGetMyBookingsQuery,
  useCancelBookingMutation,
  useRescheduleBookingMutation,
  useGetAvailableSlotsQuery,
  useGetAvailableDatesInMonthQuery,
  useGetUpcomingAppointmentsQuery,
  useGetPastAppointmentsQuery,
  useGetCalendarBookingsQuery,
  useMarkSessionLinkSentMutation,
  useMarkBookingCompleteMutation,
  useSaveExpertNoteMutation,
  useExpertCancelBookingMutation,
  useVerifyPaymentMutation,
  useAbandonBookingMutation,
  useGetCurrentTcVersionQuery,
  useAcceptTcMutation,
  useLockSlotMutation,
  useReleaseLockMutation,
  useNotifyImLateMutation,
} = bookingApi;
