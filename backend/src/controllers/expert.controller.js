const path = require('path');
const fs = require('fs');
const prisma = require('../prisma/client');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

const VALID_SESSION_FORMATS = ['ONLINE', 'IN_PERSON', 'BOTH'];

function isValidTimezone(tz) {
  try { Intl.DateTimeFormat(undefined, { timeZone: tz }); return true; }
  catch { return false; }
}

const VALID_QUALIFICATION_TYPES = [
  'LACTATION_CONSULTANT', 'BREASTFEEDING_COUNSELLOR', 'INFANT_SLEEP_CONSULTANT',
  'DOULA', 'MIDWIFE', 'BABY_OSTEOPATH', 'PAEDIATRIC_NUTRITIONIST',
  'EARLY_YEARS_SPECIALIST', 'POSTNATAL_PHYSIOTHERAPIST', 'PARENTING_COACH', 'OTHER',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deleteFile(fileUrl) {
  if (!fileUrl || !fileUrl.startsWith('/uploads/')) return;
  const filePath = path.join(UPLOADS_DIR, path.basename(fileUrl));
  if (fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch (_) {}
  }
}

function uploadedUrl(req) {
  return req.file ? `/uploads/${req.file.filename}` : null;
}

// ─── Profile ──────────────────────────────────────────────────────────────────

async function getMyProfile(req, res) {
  try {
    const expert = await prisma.expert.findUnique({
      where: { user_id: req.user.id },
      include: {
        user: { select: { email: true, created_at: true } },
        qualifications: { orderBy: { created_at: 'asc' } },
        certifications: { orderBy: { created_at: 'asc' } },
        insurance: true,
      },
    });
    if (!expert) return res.status(404).json({ error: 'Expert profile not found' });
    return res.json(expert);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function updateMyProfile(req, res) {
  const {
    bio, expertise, profile_image,
    summary, position, session_format,
    address_street, address_city, address_postcode,
    languages, timezone,
  } = req.body;

  // Validate session_format if provided
  if (session_format !== undefined && session_format !== null && session_format !== '') {
    if (!VALID_SESSION_FORMATS.includes(session_format)) {
      return res.status(400).json({ error: 'Invalid session_format value.' });
    }
  }

  // Validate summary length
  if (summary !== undefined && summary !== null && summary.length > 300) {
    return res.status(400).json({ error: 'Summary must be 300 characters or fewer.' });
  }

  // Validate timezone (IANA name)
  if (timezone !== undefined && timezone !== null && timezone !== '') {
    if (!isValidTimezone(timezone)) {
      return res.status(400).json({ error: 'Invalid timezone value.' });
    }
  }

  // Parse languages — accept JSON array or comma-separated string
  let parsedLanguages;
  if (languages !== undefined) {
    if (Array.isArray(languages)) {
      parsedLanguages = languages.filter(Boolean);
    } else if (typeof languages === 'string' && languages.trim()) {
      try {
        const parsed = JSON.parse(languages);
        parsedLanguages = Array.isArray(parsed) ? parsed.filter(Boolean) : [];
      } catch {
        parsedLanguages = languages.split(',').map((l) => l.trim()).filter(Boolean);
      }
    } else {
      parsedLanguages = [];
    }
  }

  try {
    const expert = await prisma.expert.update({
      where: { user_id: req.user.id },
      data: {
        ...(bio !== undefined && { bio }),
        ...(expertise !== undefined && { expertise }),
        ...(profile_image !== undefined && { profile_image }),
        ...(summary !== undefined && { summary }),
        ...(position !== undefined && { position }),
        ...(session_format !== undefined && {
          session_format: session_format || null,
        }),
        ...(address_street !== undefined && { address_street }),
        ...(address_city !== undefined && { address_city }),
        ...(address_postcode !== undefined && { address_postcode }),
        ...(parsedLanguages !== undefined && { languages: parsedLanguages }),
        ...(timezone !== undefined && timezone !== null && timezone !== '' && { timezone }),
      },
    });
    return res.json(expert);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function getExpertById(req, res) {
  const { id } = req.params;

  try {
    const expert = await prisma.expert.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: { select: { name: true, email: true } },
        services: { where: { is_active: true }, orderBy: { id: 'asc' } },
        availability: true,
        qualifications: { orderBy: { created_at: 'asc' } },
        certifications: { orderBy: { created_at: 'asc' } },
        insurance: true,
      },
    });
    if (!expert) return res.status(404).json({ error: 'Expert not found' });
    return res.json(expert);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function uploadProfileImage(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

  const newImagePath = `/uploads/${req.file.filename}`;

  try {
    const existing = await prisma.expert.findUnique({ where: { user_id: req.user.id } });
    if (existing?.profile_image?.startsWith('/uploads/')) {
      deleteFile(existing.profile_image);
    }

    const expert = await prisma.expert.update({
      where: { user_id: req.user.id },
      data: { profile_image: newImagePath },
    });

    return res.json({ profile_image: newImagePath, expert });
  } catch (err) {
    deleteFile(newImagePath);
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
}

// ─── Qualifications ───────────────────────────────────────────────────────────

async function addQualification(req, res) {
  const { type, custom_name } = req.body;

  if (!type || !VALID_QUALIFICATION_TYPES.includes(type)) {
    deleteFile(uploadedUrl(req));
    return res.status(400).json({ error: 'Invalid qualification type.' });
  }
  if (type === 'OTHER' && !custom_name?.trim()) {
    deleteFile(uploadedUrl(req));
    return res.status(400).json({ error: 'custom_name is required when type is OTHER.' });
  }

  try {
    const expert = await prisma.expert.findUnique({ where: { user_id: req.user.id } });
    if (!expert) return res.status(404).json({ error: 'Expert profile not found' });

    const qualification = await prisma.qualification.create({
      data: {
        expert_id: expert.id,
        type,
        custom_name: type === 'OTHER' ? custom_name.trim() : null,
        document_url: uploadedUrl(req),
      },
    });
    return res.status(201).json(qualification);
  } catch (err) {
    deleteFile(uploadedUrl(req));
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function updateQualification(req, res) {
  const { id } = req.params;
  const { custom_name } = req.body;
  const newDocUrl = uploadedUrl(req);

  try {
    const expert = await prisma.expert.findUnique({ where: { user_id: req.user.id } });
    if (!expert) return res.status(404).json({ error: 'Expert profile not found' });

    const existing = await prisma.qualification.findUnique({ where: { id: parseInt(id) } });
    if (!existing || existing.expert_id !== expert.id) {
      deleteFile(newDocUrl);
      return res.status(404).json({ error: 'Qualification not found' });
    }

    // If uploading a new doc, delete the old one
    if (newDocUrl && existing.document_url) deleteFile(existing.document_url);

    const updated = await prisma.qualification.update({
      where: { id: parseInt(id) },
      data: {
        ...(custom_name !== undefined && existing.type === 'OTHER' && { custom_name: custom_name.trim() }),
        ...(newDocUrl && { document_url: newDocUrl }),
      },
    });
    return res.json(updated);
  } catch (err) {
    deleteFile(newDocUrl);
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function deleteQualification(req, res) {
  const { id } = req.params;

  try {
    const expert = await prisma.expert.findUnique({ where: { user_id: req.user.id } });
    if (!expert) return res.status(404).json({ error: 'Expert profile not found' });

    const existing = await prisma.qualification.findUnique({ where: { id: parseInt(id) } });
    if (!existing || existing.expert_id !== expert.id) {
      return res.status(404).json({ error: 'Qualification not found' });
    }

    deleteFile(existing.document_url);
    await prisma.qualification.delete({ where: { id: parseInt(id) } });
    return res.json({ message: 'Qualification deleted' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ─── Certifications ───────────────────────────────────────────────────────────

async function addCertification(req, res) {
  const { name } = req.body;

  if (!name?.trim()) {
    deleteFile(uploadedUrl(req));
    return res.status(400).json({ error: 'Certification name is required.' });
  }

  try {
    const expert = await prisma.expert.findUnique({ where: { user_id: req.user.id } });
    if (!expert) return res.status(404).json({ error: 'Expert profile not found' });

    const certification = await prisma.certification.create({
      data: {
        expert_id: expert.id,
        name: name.trim(),
        document_url: uploadedUrl(req),
      },
    });
    return res.status(201).json(certification);
  } catch (err) {
    deleteFile(uploadedUrl(req));
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function updateCertification(req, res) {
  const { id } = req.params;
  const { name } = req.body;
  const newDocUrl = uploadedUrl(req);

  try {
    const expert = await prisma.expert.findUnique({ where: { user_id: req.user.id } });
    if (!expert) return res.status(404).json({ error: 'Expert profile not found' });

    const existing = await prisma.certification.findUnique({ where: { id: parseInt(id) } });
    if (!existing || existing.expert_id !== expert.id) {
      deleteFile(newDocUrl);
      return res.status(404).json({ error: 'Certification not found' });
    }

    if (newDocUrl && existing.document_url) deleteFile(existing.document_url);

    const updated = await prisma.certification.update({
      where: { id: parseInt(id) },
      data: {
        ...(name?.trim() && { name: name.trim() }),
        ...(newDocUrl && { document_url: newDocUrl }),
      },
    });
    return res.json(updated);
  } catch (err) {
    deleteFile(newDocUrl);
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function deleteCertification(req, res) {
  const { id } = req.params;

  try {
    const expert = await prisma.expert.findUnique({ where: { user_id: req.user.id } });
    if (!expert) return res.status(404).json({ error: 'Expert profile not found' });

    const existing = await prisma.certification.findUnique({ where: { id: parseInt(id) } });
    if (!existing || existing.expert_id !== expert.id) {
      return res.status(404).json({ error: 'Certification not found' });
    }

    deleteFile(existing.document_url);
    await prisma.certification.delete({ where: { id: parseInt(id) } });
    return res.json({ message: 'Certification deleted' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ─── Insurance ────────────────────────────────────────────────────────────────

async function saveInsurance(req, res) {
  const { policy_expires_at } = req.body;
  const newDocUrl = uploadedUrl(req);

  if (!policy_expires_at) {
    deleteFile(newDocUrl);
    return res.status(400).json({ error: 'policy_expires_at is required.' });
  }

  const expiryDate = new Date(policy_expires_at);
  if (isNaN(expiryDate.getTime())) {
    deleteFile(newDocUrl);
    return res.status(400).json({ error: 'Invalid policy_expires_at date.' });
  }
  if (expiryDate <= new Date()) {
    deleteFile(newDocUrl);
    return res.status(400).json({ error: 'Policy expiry date must be in the future.' });
  }

  try {
    const expert = await prisma.expert.findUnique({ where: { user_id: req.user.id } });
    if (!expert) return res.status(404).json({ error: 'Expert profile not found' });

    const existing = await prisma.insurance.findUnique({ where: { expert_id: expert.id } });

    // First creation requires a document
    if (!existing && !newDocUrl) {
      return res.status(400).json({ error: 'Insurance document is required.' });
    }

    // Replace old file if a new one was uploaded
    if (newDocUrl && existing?.document_url) deleteFile(existing.document_url);

    const insurance = await prisma.insurance.upsert({
      where: { expert_id: expert.id },
      update: {
        policy_expires_at: expiryDate,
        ...(newDocUrl && { document_url: newDocUrl }),
      },
      create: {
        expert_id: expert.id,
        document_url: newDocUrl,
        policy_expires_at: expiryDate,
      },
    });
    return res.json(insurance);
  } catch (err) {
    deleteFile(newDocUrl);
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function deleteInsurance(req, res) {
  try {
    const expert = await prisma.expert.findUnique({ where: { user_id: req.user.id } });
    if (!expert) return res.status(404).json({ error: 'Expert profile not found' });

    const existing = await prisma.insurance.findUnique({ where: { expert_id: expert.id } });
    if (!existing) return res.status(404).json({ error: 'No insurance record found' });

    deleteFile(existing.document_url);
    await prisma.insurance.delete({ where: { expert_id: expert.id } });
    return res.json({ message: 'Insurance record deleted' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  getMyProfile,
  updateMyProfile,
  getExpertById,
  uploadProfileImage,
  addQualification,
  updateQualification,
  deleteQualification,
  addCertification,
  updateCertification,
  deleteCertification,
  saveInsurance,
  deleteInsurance,
};
