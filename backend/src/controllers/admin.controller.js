const crypto = require("crypto");
const prisma = require("../prisma/client");
const { sendPasswordResetEmail, sendVerificationEmail } = require("../utils/email");

const PAGE_LIMIT = 10;
const VALID_STATUSES = ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"];
const VALID_QUALIFICATION_TYPES = [
  "LACTATION_CONSULTANT", "BREASTFEEDING_COUNSELLOR", "INFANT_SLEEP_CONSULTANT",
  "DOULA", "MIDWIFE", "BABY_OSTEOPATH", "PAEDIATRIC_NUTRITIONIST",
  "EARLY_YEARS_SPECIALIST", "POSTNATAL_PHYSIOTHERAPIST", "PARENTING_COACH", "OTHER",
];
const VALID_CLUSTERS = ["FOR_MUM", "FOR_BABY", "PACKAGE", "GIFT"];

// List all experts — paginated + filtered + searched
async function listExperts(req, res) {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || PAGE_LIMIT));
  const skip  = (page - 1) * limit;
  const { status, search, city, qualification, cluster } = req.query;

  // Base: only EXPERT role accounts
  const baseWhere = { user: { role: "EXPERT" } };

  // Build full where clause (for table rows)
  const where = { ...baseWhere };

  if (status && VALID_STATUSES.includes(status)) {
    where.status = status;
  }

  // Name search — case-insensitive contains on user.name
  if (search?.trim()) {
    where.user = { ...where.user, name: { contains: search.trim(), mode: "insensitive" } };
  }

  // City filter — case-insensitive contains
  if (city?.trim()) {
    where.address_city = { contains: city.trim(), mode: "insensitive" };
  }

  // Qualification type filter
  if (qualification && VALID_QUALIFICATION_TYPES.includes(qualification)) {
    where.qualifications = { some: { type: qualification } };
  }

  // Service cluster filter
  if (cluster && VALID_CLUSTERS.includes(cluster)) {
    where.services = { some: { cluster } };
  }

  // Include all data needed for detail modal — loaded once, no extra round-trips
  const include = {
    user:           { select: { name: true, email: true, created_at: true, is_verified: true } },
    qualifications: { orderBy: { created_at: "asc" } },
    certifications: { orderBy: { created_at: "asc" } },
    insurance:      true,
    services:       { orderBy: { id: "asc" } },
  };

  try {
    const [total, data, pendingCount, approvedCount, rejectedCount, suspendedCount] =
      await Promise.all([
        prisma.expert.count({ where }),
        prisma.expert.findMany({ where, include, orderBy: { id: "asc" }, skip, take: limit }),
        prisma.expert.count({ where: { ...baseWhere, status: "PENDING" } }),
        prisma.expert.count({ where: { ...baseWhere, status: "APPROVED" } }),
        prisma.expert.count({ where: { ...baseWhere, status: "REJECTED" } }),
        prisma.expert.count({ where: { ...baseWhere, status: "SUSPENDED" } }),
      ]);

    return res.json({
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      counts: {
        all:       pendingCount + approvedCount + rejectedCount + suspendedCount,
        PENDING:   pendingCount,
        APPROVED:  approvedCount,
        REJECTED:  rejectedCount,
        SUSPENDED: suspendedCount,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}

// Approve an expert
async function approveExpert(req, res) {
  const { id } = req.params;
  try {
    const expert = await prisma.expert.findUnique({ where: { id: parseInt(id) } });
    if (!expert) return res.status(404).json({ error: "Expert not found" });
    const updated = await prisma.expert.update({
      where: { id: parseInt(id) },
      data: { status: "APPROVED" },
    });
    return res.json({ message: "Expert approved", expert: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}

// Reject an expert
async function rejectExpert(req, res) {
  const { id } = req.params;
  try {
    const expert = await prisma.expert.findUnique({ where: { id: parseInt(id) } });
    if (!expert) return res.status(404).json({ error: "Expert not found" });
    const updated = await prisma.expert.update({
      where: { id: parseInt(id) },
      data: { status: "REJECTED" },
    });
    return res.json({ message: "Expert rejected", expert: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}

// Toggle: APPROVED ↔ REJECTED
async function toggleApproval(req, res) {
  const { id } = req.params;
  try {
    const expert = await prisma.expert.findUnique({ where: { id: parseInt(id) } });
    if (!expert) return res.status(404).json({ error: "Expert not found" });
    const newStatus = expert.status === "APPROVED" ? "REJECTED" : "APPROVED";
    const updated = await prisma.expert.update({
      where: { id: parseInt(id) },
      data: { status: newStatus },
    });
    return res.json({
      message: `Expert ${newStatus === "APPROVED" ? "approved" : "rejected"}`,
      expert: updated,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}

// ─── New account management actions ──────────────────────────────────────────

// Send a password reset email to an expert
async function sendPasswordReset(req, res) {
  const { id } = req.params;
  try {
    const expert = await prisma.expert.findUnique({
      where: { id: parseInt(id) },
      include: { user: true },
    });
    if (!expert) return res.status(404).json({ error: "Expert not found" });

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: expert.user_id },
      data: { reset_token: resetToken, reset_token_expires_at: resetTokenExpiresAt },
    });

    sendPasswordResetEmail({
      to: expert.user.email,
      name: expert.user.name,
      resetToken,
    }).catch((err) => console.error("Failed to send password reset email:", err.message));

    return res.json({ sent: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}

// Resend verification email to an unverified expert
async function resendVerification(req, res) {
  const { id } = req.params;
  try {
    const expert = await prisma.expert.findUnique({
      where: { id: parseInt(id) },
      include: { user: true },
    });
    if (!expert) return res.status(404).json({ error: "Expert not found" });

    if (expert.user.is_verified) {
      return res.status(400).json({ error: "Expert email is already verified." });
    }

    const verificationCode = crypto.randomBytes(32).toString("hex");
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.user.update({
      where: { id: expert.user_id },
      data: { verification_code: verificationCode, verification_expires_at: verificationExpiresAt },
    });

    sendVerificationEmail({
      to: expert.user.email,
      name: expert.user.name,
      userId: expert.user_id,
      verificationCode,
    }).catch((err) => console.error("Failed to resend verification email:", err.message));

    return res.json({ sent: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}

// Manually mark an expert's email as verified
async function manuallyVerify(req, res) {
  const { id } = req.params;
  try {
    const expert = await prisma.expert.findUnique({
      where: { id: parseInt(id) },
      include: { user: true },
    });
    if (!expert) return res.status(404).json({ error: "Expert not found" });

    if (expert.user.is_verified) {
      return res.status(400).json({ error: "Expert email is already verified." });
    }

    await prisma.user.update({
      where: { id: expert.user_id },
      data: {
        is_verified: true,
        verification_code: null,
        verification_expires_at: null,
      },
    });

    console.log(`[ADMIN] User ${expert.user_id} (${expert.user.email}) manually verified by admin ${req.user?.id}`);

    return res.json({ verified: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}

// Suspend an approved expert
async function suspendExpert(req, res) {
  const { id } = req.params;
  try {
    const expert = await prisma.expert.findUnique({ where: { id: parseInt(id) } });
    if (!expert) return res.status(404).json({ error: "Expert not found" });

    if (expert.status === "SUSPENDED") {
      return res.status(400).json({ error: "Expert is already suspended." });
    }

    const updated = await prisma.expert.update({
      where: { id: parseInt(id) },
      data: { status: "SUSPENDED" },
    });

    console.log(`[ADMIN] Expert ${id} suspended by admin ${req.user?.id}`);

    return res.json({ message: "Expert suspended", expert: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}

// Reactivate a suspended expert (restores to APPROVED)
async function reactivateExpert(req, res) {
  const { id } = req.params;
  try {
    const expert = await prisma.expert.findUnique({ where: { id: parseInt(id) } });
    if (!expert) return res.status(404).json({ error: "Expert not found" });

    if (expert.status !== "SUSPENDED") {
      return res.status(400).json({ error: "Expert is not suspended." });
    }

    const updated = await prisma.expert.update({
      where: { id: parseInt(id) },
      data: { status: "APPROVED" },
    });

    console.log(`[ADMIN] Expert ${id} reactivated by admin ${req.user?.id}`);

    return res.json({ message: "Expert reactivated", expert: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}

module.exports = {
  listExperts,
  approveExpert,
  rejectExpert,
  toggleApproval,
  sendPasswordReset,
  resendVerification,
  manuallyVerify,
  suspendExpert,
  reactivateExpert,
};
