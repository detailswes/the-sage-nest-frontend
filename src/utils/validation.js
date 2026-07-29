// Requires a dot-atom local part and a domain made of valid, non-empty
// dot-separated labels (rejects stray commas/spaces/consecutive dots like
// "user@host,.com").
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export const validateEmail = (email) => {
  return EMAIL_REGEX.test(email);
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

// ─── Italian Codice Fiscale (client-side mirror of backend validation) ───────
// Same pattern + mod-26 checksum as src/utils/codiceFiscale.js on the backend.
// Client-side is for immediate feedback only — the server is still the gate.
const CODICE_FISCALE_PATTERN =
  /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/;

const CF_ODD_VALUES = {
  0: 1, 1: 0, 2: 5, 3: 7, 4: 9, 5: 13, 6: 15, 7: 17, 8: 19, 9: 21,
  A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21, K: 2, L: 4, M: 18,
  N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14, U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23,
};
const CF_EVEN_VALUES = {
  0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9,
  A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, H: 7, I: 8, J: 9, K: 10, L: 11, M: 12,
  N: 13, O: 14, P: 15, Q: 16, R: 17, S: 18, T: 19, U: 20, V: 21, W: 22, X: 23, Y: 24, Z: 25,
};
const CF_REMAINDER_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const normalizeCodiceFiscale = (raw) => (raw || '').trim().replace(/\s+/g, '').toUpperCase();

export const isValidCodiceFiscale = (raw) => {
  const normalized = normalizeCodiceFiscale(raw);
  if (!CODICE_FISCALE_PATTERN.test(normalized)) return false;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    const table = i % 2 === 0 ? CF_ODD_VALUES : CF_EVEN_VALUES;
    sum += table[normalized[i]] ?? 0;
  }
  return CF_REMAINDER_LETTERS[sum % 26] === normalized[15];
};
