const sgMail = require('@sendgrid/mail');
const { verificationEmailHtml } = require('./email_templates/verificationEmail');
const { passwordResetEmailHtml } = require('./email_templates/passwordResetEmail');

// ─── Init (lazy — called after dotenv has loaded) ─────────────────────────────
let _initialized = false;

const initSendGrid = () => {
  if (_initialized) return;
  if (!process.env.SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY is not set in environment');
  }
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  _initialized = true;
};

// ─── Verify config (call once at server startup) ──────────────────────────────
const verifyEmailConnection = () => {
  try {
    initSendGrid();
    console.log('✅ SendGrid email configured');
  } catch (err) {
    console.warn('⚠️  SendGrid not configured:', err.message);
  }
};

// ─── Base sender ─────────────────────────────────────────────────────────────
/**
 * @param {{ to: string, subject: string, html: string, text?: string }} options
 */
const sendEmail = async ({ to, subject, html, text }) => {
  initSendGrid();
  return sgMail.send({
    from: {
      name: 'Sage Nest',
      email: process.env.EMAIL_FROM,
    },
    to,
    subject,
    text: text || subject,
    html,
  });
};

// ─── HTML layout wrapper ──────────────────────────────────────────────────────
const layout = (bodyContent) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sage Nest</title>
</head>
<body style="margin:0;padding:0;background:#F5F7F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7F5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <span style="font-size:20px;font-weight:700;color:#1F2933;letter-spacing:-0.3px;">Sage Nest</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;border:1px solid #E4E7E4;padding:40px 36px;">
              ${bodyContent}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#9CA3AF;">
                © ${new Date().getFullYear()} Sage Nest. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

// ─── Button helper ────────────────────────────────────────────────────────────
const btn = (href, label) =>
  `<a href="${href}" style="display:inline-block;background:#445446;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;margin-top:8px;">${label}</a>`;

// ─── Template senders ─────────────────────────────────────────────────────────

/**
 * Welcome email after successful registration.
 * @param {{ to: string, name: string, role: 'EXPERT'|'PARENT' }} param0
 */
const sendWelcomeEmail = ({ to, name, role }) => {
  const roleNote =
    role === 'EXPERT'
      ? 'Complete your profile and connect your Stripe account to start receiving bookings.'
      : "Browse experts and book your first session whenever you're ready.";

  return sendEmail({
    to,
    subject: 'Welcome to Sage Nest!',
    text: `Hi ${name}, welcome to Sage Nest! ${roleNote}`,
    html: layout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1F2933;">Welcome, ${name}!</h1>
      <p style="margin:0 0 20px;font-size:15px;color:#4B5563;line-height:1.6;">
        You're now part of Sage Nest — a community connecting families with trusted child-care experts.
      </p>
      <p style="margin:0 0 28px;font-size:14px;color:#6B7280;line-height:1.6;">
        ${roleNote}
      </p>
      ${btn(`${process.env.CLIENT_URL}/dashboard`, 'Go to Dashboard')}
    `),
  });
};

/**
 * Notify an expert that their profile has been approved.
 * @param {{ to: string, name: string }} param0
 */
const sendExpertApprovedEmail = ({ to, name }) =>
  sendEmail({
    to,
    subject: 'Your Sage Nest expert profile has been approved!',
    text: `Hi ${name}, great news — your expert profile has been approved. You can now receive bookings.`,
    html: layout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1F2933;">You're approved!</h1>
      <p style="margin:0 0 20px;font-size:15px;color:#4B5563;line-height:1.6;">
        Hi ${name}, your expert profile on Sage Nest has been reviewed and <strong>approved</strong>.
        Parents can now discover and book your services.
      </p>
      <p style="margin:0 0 28px;font-size:14px;color:#6B7280;line-height:1.6;">
        Make sure your availability is up to date so parents can find the right time to book with you.
      </p>
      ${btn(`${process.env.CLIENT_URL}/dashboard`, 'View My Profile')}
    `),
  });

/**
 * Notify an expert that their profile has been rejected.
 * @param {{ to: string, name: string, reason?: string }} param0
 */
const sendExpertRejectedEmail = ({ to, name, reason }) =>
  sendEmail({
    to,
    subject: 'Update on your Sage Nest expert application',
    text: `Hi ${name}, unfortunately your expert profile was not approved at this time.${reason ? ` Reason: ${reason}` : ''}`,
    html: layout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1F2933;">Application update</h1>
      <p style="margin:0 0 20px;font-size:15px;color:#4B5563;line-height:1.6;">
        Hi ${name}, after reviewing your application we're unable to approve your expert profile at this time.
      </p>
      ${reason ? `
      <div style="background:#FEF3C7;border:1px solid #FCD34D;border-radius:8px;padding:16px;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;color:#92400E;line-height:1.5;"><strong>Reason:</strong> ${reason}</p>
      </div>` : ''}
      <p style="margin:0 0 28px;font-size:14px;color:#6B7280;line-height:1.6;">
        You're welcome to update your profile and reapply. If you have questions, please reach out to our support team.
      </p>
      ${btn(`${process.env.CLIENT_URL}/dashboard`, 'Update My Profile')}
    `),
  });

/**
 * Password reset email.
 * Template lives in email_templates/passwordResetEmail.js
 * @param {{ to: string, name: string, resetToken: string }} param0
 */
const sendPasswordResetEmail = ({ to, name, resetToken }) => {
  const resetUrl =
    `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

  return sendEmail({
    to,
    subject: 'Reset your Sage Nest password',
    text: `Hi ${name}, reset your password here (expires in 1 hour): ${resetUrl}`,
    html: passwordResetEmailHtml({ name, resetUrl }),
  });
};

/**
 * Expert email verification.
 * Template lives in email_templates/verificationEmail.js
 * @param {{ to: string, name: string, userId: number, verificationCode: string }} param0
 */
const sendVerificationEmail = ({ to, name, userId, verificationCode }) => {
  const verificationUrl =
    `${process.env.CLIENT_URL}/verify-email` +
    `?auth_user=true&userId=${userId}&verificationCode=${verificationCode}`;

  return sendEmail({
    to,
    subject: 'Verify your Sage Nest email address',
    text: `Hi ${name}, please verify your email: ${verificationUrl}`,
    html: verificationEmailHtml({ name, verificationUrl }),
  });
};

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
  sendEmail,
  verifyEmailConnection,
  sendWelcomeEmail,
  sendExpertApprovedEmail,
  sendExpertRejectedEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
};
