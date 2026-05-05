import axios from 'axios';
import { api } from './authApi';

const BASE_URL = process.env.REACT_APP_API_URL;

// ─── Parent booking flow ──────────────────────────────────────────────────────

/** Create a booking and get back the Stripe client_secret */
export const createBooking = (data) =>
  api.post('/bookings', data).then((r) => r.data);

/** Get a single booking by ID (parent or expert) */
export const getBookingById = (id) =>
  api.get(`/bookings/${id}`).then((r) => r.data);

/** Get all bookings belonging to the logged-in parent */
export const getMyBookings = () =>
  api.get('/bookings/my').then((r) => r.data);

/** Cancel a booking; optionally provide { reason } in body */
export const cancelBooking = (id, reason) =>
  api.delete(`/bookings/${id}`, { data: { reason } }).then((r) => r.data);

/** Reschedule a confirmed booking to a new slot (no payment change) */
export const rescheduleBooking = (id, newScheduledAt) =>
  api.patch(`/bookings/${id}/reschedule`, { newScheduledAt }).then((r) => r.data);

// ─── Public slot availability ─────────────────────────────────────────────────

/** Returns available time slots for an expert on a given date */
export const getAvailableSlots = (expertId, date, serviceId) =>
  axios
    .get(`${BASE_URL}/availability/slots`, { params: { expertId, date, serviceId } })
    .then((r) => r.data);

// ─── Expert dashboard ─────────────────────────────────────────────────────────

export const getUpcomingAppointments = () =>
  api.get('/bookings/upcoming').then((r) => r.data);

export const getPastAppointments = (page = 1) =>
  api.get('/bookings/past', { params: { page } }).then((r) => r.data);

export const getCalendarBookings = (from, to) =>
  api.get('/bookings/calendar', { params: { from, to } }).then((r) => r.data);

export const markSessionLinkSent = (id) =>
  api.patch(`/bookings/${id}/link-sent`).then((r) => r.data);

export const markBookingComplete = (id, note) =>
  api.patch(`/bookings/${id}/complete`, { note }).then((r) => r.data);

export const saveExpertNote = (id, note) =>
  api.patch(`/bookings/${id}/expert-note`, { note }).then((r) => r.data);

/** Expert cancels a confirmed booking — always triggers a full refund to the parent */
export const expertCancelBooking = (id) =>
  api.post(`/bookings/${id}/expert-cancel`).then((r) => r.data);

/** Reconcile a stuck PENDING_PAYMENT booking by checking Stripe directly */
export const verifyPayment = (id) =>
  api.post(`/bookings/${id}/verify-payment`).then((r) => r.data);

/** Get the current T&C version and whether it has changed since the user last accepted */
export const getCurrentTcVersion = () =>
  api.get('/bookings/tc-version').then((r) => r.data);
