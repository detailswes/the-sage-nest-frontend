const prisma = require('../prisma/client');

async function getExpertIdForUser(userId) {
  const expert = await prisma.expert.findUnique({ where: { user_id: userId } });
  return expert ? expert.id : null;
}

// GET /bookings/upcoming — next 10 upcoming bookings for this expert (Req 1)
async function getUpcomingAppointments(req, res) {
  try {
    const expert_id = await getExpertIdForUser(req.user.id);
    if (!expert_id) return res.status(404).json({ error: 'Expert profile not found' });

    const now = new Date();
    const bookings = await prisma.booking.findMany({
      where: {
        expert_id,
        scheduled_at: { gt: now },
        status: { not: 'CANCELLED' },
      },
      orderBy: { scheduled_at: 'asc' },
      take: 10,
      include: {
        parent:  { select: { name: true } },
        service: { select: { title: true, duration_minutes: true, format: true } },
      },
    });

    return res.json(bookings);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// GET /bookings/calendar?from=ISO&to=ISO — bookings for a date range (calendar view)
async function getCalendarBookings(req, res) {
  const { from, to } = req.query;

  try {
    const expert_id = await getExpertIdForUser(req.user.id);
    if (!expert_id) return res.status(404).json({ error: 'Expert profile not found' });

    const where = {
      expert_id,
      status: { not: 'CANCELLED' },
    };

    if (from || to) {
      where.scheduled_at = {};
      if (from) where.scheduled_at.gte = new Date(from);
      if (to)   where.scheduled_at.lte = new Date(to);
    }

    const bookings = await prisma.booking.findMany({
      where,
      orderBy: { scheduled_at: 'asc' },
      include: {
        parent:  { select: { name: true } },
        service: { select: { title: true } },
      },
    });

    return res.json(bookings);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// PATCH /bookings/:id/link-sent — mark session link as sent
async function markSessionLinkSent(req, res) {
  const { id } = req.params;

  try {
    const expert_id = await getExpertIdForUser(req.user.id);
    if (!expert_id) return res.status(404).json({ error: 'Expert profile not found' });

    const booking = await prisma.booking.findUnique({ where: { id: parseInt(id) } });
    if (!booking || booking.expert_id !== expert_id) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const updated = await prisma.booking.update({
      where: { id: parseInt(id) },
      data: { session_link_sent: true },
    });

    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { getUpcomingAppointments, getCalendarBookings, markSessionLinkSent };
