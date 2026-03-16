const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const prisma = require("../prisma/client");
const { sendVerificationEmail, sendPasswordResetEmail } = require("../utils/email");

const ACCESS_TOKEN_EXPIRES = "15m";
const REFRESH_TOKEN_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES }
  );
}

function generateRefreshToken() {
  return crypto.randomBytes(64).toString("hex");
}

async function storeRefreshToken(userId, token) {
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_MS);
  await prisma.refreshToken.create({
    data: { token, user_id: userId, expires_at: expiresAt },
  });
}

function userPayload(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

// ─── Register ───────────────────────────────────────────────────────────────
async function register(req, res) {
  const { email, password, role, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const assignedRole = ["EXPERT", "PARENT"].includes(role) ? role : "EXPERT";

    // EXPERTs start unverified; PARENTs are auto-verified
    const isExpert = assignedRole === "EXPERT";
    const verificationCode = isExpert
      ? crypto.randomBytes(32).toString("hex")
      : null;
    const verificationExpiresAt = isExpert
      ? new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      : null;

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password_hash,
        role: assignedRole,
        is_verified: !isExpert,
        verification_code: verificationCode,
        verification_expires_at: verificationExpiresAt,
      },
    });

    if (isExpert) {
      await prisma.expert.create({ data: { user_id: user.id } });

      // Send verification email — fire-and-forget (don't block the response)
      sendVerificationEmail({
        to: user.email,
        name: user.name,
        userId: user.id,
        verificationCode,
      }).catch((err) =>
        console.error("Failed to send verification email:", err.message)
      );

      return res.status(201).json({
        verification_email_sent: true,
        email: user.email,
      });
    }

    // PARENT: issue tokens immediately (no verification required)
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();
    await storeRefreshToken(user.id, refreshToken);

    return res.status(201).json({
      accessToken,
      refreshToken,
      user: userPayload(user),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}

// ─── Verify Email ────────────────────────────────────────────────────────────
async function verifyEmail(req, res) {
  const { userId, verificationCode } = req.body;

  if (!userId || !verificationCode) {
    return res.status(400).json({ error: "userId and verificationCode are required" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.is_verified) {
      return res.json({ already_verified: true });
    }

    if (
      user.verification_expires_at &&
      new Date() > user.verification_expires_at
    ) {
      return res.status(410).json({
        error: "Verification link has expired. Please register again.",
        expired: true,
      });
    }

    if (user.verification_code !== verificationCode) {
      return res.status(400).json({ error: "Invalid verification link." });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        is_verified: true,
        verification_code: null,
        verification_expires_at: null,
      },
    });

    return res.json({ verified: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}

// ─── Login ───────────────────────────────────────────────────────────────────
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { expert: { select: { status: true } } },
    });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (user.role === "EXPERT" && !user.is_verified) {
      return res.status(403).json({
        error: "Please verify your email address before logging in.",
        email_not_verified: true,
        email: user.email,
      });
    }

    if (user.role === "EXPERT" && user.expert?.status === "SUSPENDED") {
      return res.status(403).json({
        error: "Your account has been suspended. Please contact support.",
        account_suspended: true,
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();
    await storeRefreshToken(user.id, refreshToken);

    return res.json({
      accessToken,
      refreshToken,
      user: userPayload(user),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}

// ─── Refresh ─────────────────────────────────────────────────────────────────
async function refresh(req, res) {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token required" });
  }

  try {
    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!stored || new Date() > stored.expires_at) {
      if (stored) {
        await prisma.refreshToken.delete({ where: { token: refreshToken } });
      }
      return res.status(401).json({ error: "Invalid or expired refresh token" });
    }

    // Rotate: delete old, issue new
    await prisma.refreshToken.delete({ where: { token: refreshToken } });

    const user = await prisma.user.findUnique({ where: { id: stored.user_id } });
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken();
    await storeRefreshToken(user.id, newRefreshToken);

    return res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: userPayload(user),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}

// ─── Logout ──────────────────────────────────────────────────────────────────
async function logout(req, res) {
  const { refreshToken } = req.body;

  if (refreshToken) {
    try {
      await prisma.refreshToken.delete({ where: { token: refreshToken } });
    } catch {
      // Token may already be gone — that's fine
    }
  }

  return res.json({ message: "Logged out successfully" });
}

// ─── Resend Verification Email ────────────────────────────────────────────────
async function resendVerification(req, res) {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    // Silently succeed if user not found or already verified (prevents enumeration)
    if (!user || user.is_verified) {
      return res.json({ sent: true });
    }

    // Server-side cooldown: block if last email was sent < 60 seconds ago.
    // verification_expires_at is set to now+24h, so if it's > now+23h59m → sent < 1min ago.
    if (user.verification_expires_at) {
      const cooldownThreshold = new Date(Date.now() + (24 * 60 - 1) * 60 * 1000);
      if (user.verification_expires_at > cooldownThreshold) {
        return res.status(429).json({ error: "Please wait a moment before requesting another email." });
      }
    }

    const verificationCode = crypto.randomBytes(32).toString("hex");
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verification_code: verificationCode,
        verification_expires_at: verificationExpiresAt,
      },
    });

    sendVerificationEmail({
      to: user.email,
      name: user.name,
      userId: user.id,
      verificationCode,
    }).catch((err) =>
      console.error("Failed to resend verification email:", err.message)
    );

    return res.json({ sent: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}

// ─── Forgot Password ──────────────────────────────────────────────────────────
async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success — prevents enumeration of registered emails
    if (!user) {
      return res.json({ sent: true });
    }

    // Server-side cooldown: block if a token was issued < 1 minute ago
    if (user.reset_token_expires_at) {
      const cooldownThreshold = new Date(Date.now() + (60 * 60 - 60) * 1000);
      if (user.reset_token_expires_at > cooldownThreshold) {
        return res.status(429).json({ error: "Please wait before requesting another reset email." });
      }
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { reset_token: resetToken, reset_token_expires_at: resetTokenExpiresAt },
    });

    sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetToken,
    }).catch((err) =>
      console.error("Failed to send password reset email:", err.message)
    );

    return res.json({ sent: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}

// ─── Reset Password ───────────────────────────────────────────────────────────
async function resetPassword(req, res) {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: "Token and new password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  try {
    const user = await prisma.user.findFirst({ where: { reset_token: token } });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset link." });
    }

    if (new Date() > user.reset_token_expires_at) {
      // Clear the stale token
      await prisma.user.update({
        where: { id: user.id },
        data: { reset_token: null, reset_token_expires_at: null },
      });
      return res.status(410).json({
        error: "This reset link has expired. Please request a new one.",
        expired: true,
      });
    }

    const password_hash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password_hash, reset_token: null, reset_token_expires_at: null },
    });

    // Invalidate all active sessions for security
    await prisma.refreshToken.deleteMany({ where: { user_id: user.id } });

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}

module.exports = { register, login, refresh, logout, verifyEmail, resendVerification, forgotPassword, resetPassword };
