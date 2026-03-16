const prisma = require('../prisma/client');

async function getExpertIdForUser(userId) {
  const expert = await prisma.expert.findUnique({ where: { user_id: userId } });
  return expert ? expert.id : null;
}

async function addAvailability(req, res) {
  const { day_of_week, start_time, end_time } = req.body;

  if (day_of_week === undefined || !start_time || !end_time) {
    return res.status(400).json({ error: 'day_of_week, start_time, and end_time are required' });
  }

  try {
    const expert_id = await getExpertIdForUser(req.user.id);
    if (!expert_id) return res.status(404).json({ error: 'Expert profile not found' });

    const availability = await prisma.availability.create({
      data: { expert_id, day_of_week: parseInt(day_of_week), start_time, end_time },
    });
    return res.status(201).json(availability);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function listAvailability(req, res) {
  try {
    const expert_id = await getExpertIdForUser(req.user.id);
    if (!expert_id) return res.status(404).json({ error: 'Expert profile not found' });

    const slots = await prisma.availability.findMany({
      where: { expert_id },
      orderBy: [{ day_of_week: 'asc' }, { start_time: 'asc' }],
    });
    return res.json(slots);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function removeAvailability(req, res) {
  const { id } = req.params;

  try {
    const expert_id = await getExpertIdForUser(req.user.id);
    if (!expert_id) return res.status(404).json({ error: 'Expert profile not found' });

    const slot = await prisma.availability.findUnique({ where: { id: parseInt(id) } });
    if (!slot || slot.expert_id !== expert_id) {
      return res.status(404).json({ error: 'Availability slot not found' });
    }

    await prisma.availability.delete({ where: { id: parseInt(id) } });
    return res.json({ message: 'Availability slot removed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { addAvailability, listAvailability, removeAvailability };
