export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// European phone: international (+3x/+4x E.164) or local format (7–15 digits)
export const validatePhone = (phone) => {
  const normalized = phone.trim().replace(/[\s\-().]/g, '');
  if (normalized.startsWith('+')) {
    // All European ITU country codes start with +3x or +4x (e.g. +44 UK, +39 Italy, +353 Ireland)
    return /^\+[34]\d{7,13}$/.test(normalized);
  }
  // Local format: 7–15 digits, optional leading 0
  return /^0?\d{6,14}$/.test(normalized);
};

// Returns array of { key, ok } pairs. key maps to auth.json passwordStrength.*
export const checkPasswordStrength = (password) => [
  { key: 'passwordStrength.minLength', ok: password.length >= 8 },
  { key: 'passwordStrength.uppercase', ok: /[A-Z]/.test(password) },
  { key: 'passwordStrength.lowercase', ok: /[a-z]/.test(password) },
  { key: 'passwordStrength.number',    ok: /[0-9]/.test(password) },
  { key: 'passwordStrength.special',   ok: /[^a-zA-Z0-9]/.test(password) },
];

// Returns an object of { field: 'auth:validation.*' } keys — translate at call site
export const validateLoginForm = ({ email, password }) => {
  const errors = {};

  if (!email)                 errors.email    = 'validation.emailRequired';
  else if (!validateEmail(email)) errors.email = 'validation.emailInvalid';

  if (!password)              errors.password = 'validation.passwordRequired';

  return errors;
};

export const validateRegisterForm = ({ name, email, password, confirmPassword, phone, role }) => {
  const errors = {};

  if (!name || !name.trim()) errors.name = 'validation.nameRequired';

  if (!email)                     errors.email = 'validation.emailRequired';
  else if (!validateEmail(email)) errors.email = 'validation.emailInvalid';

  if (!password) {
    errors.password = 'validation.passwordRequired';
  } else {
    const unmet = checkPasswordStrength(password).filter((c) => !c.ok);
    if (unmet.length > 0) errors.password = 'validation.passwordWeak';
  }

  if (!confirmPassword)               errors.confirmPassword = 'validation.confirmPasswordRequired';
  else if (password !== confirmPassword) errors.confirmPassword = 'validation.passwordsMismatch';

  if (role === 'PARENT') {
    if (!phone || !phone.trim())  errors.phone = 'validation.phoneRequired';
    else if (!validatePhone(phone)) errors.phone = 'validation.phoneInvalid';
  }

  return errors;
};
