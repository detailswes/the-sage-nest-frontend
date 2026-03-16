const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { getUpcomingAppointments, getCalendarBookings, markSessionLinkSent } = require('../controllers/booking.controller');

// All routes require authentication
router.use(authenticate);

// GET /bookings/upcoming — next 10 upcoming bookings for expert dashboard (Req 1)
router.get('/upcoming', getUpcomingAppointments);

// GET /bookings/calendar?from=ISO&to=ISO — bookings for calendar view (Req 3)
router.get('/calendar', getCalendarBookings);

// PATCH /bookings/:id/link-sent — mark session link as sent (Req 1)
router.patch('/:id/link-sent', markSessionLinkSent);

module.exports = router;
