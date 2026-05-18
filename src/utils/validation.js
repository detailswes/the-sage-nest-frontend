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

// Returns array of unmet criteria labels (empty = all passed)
export const checkPasswordStrength = (password) => [
  { label: 'At least 8 characters',        ok: password.length >= 8 },
  { label: 'One uppercase letter',          ok: /[A-Z]/.test(password) },
  { label: 'One lowercase letter',          ok: /[a-z]/.test(password) },
  { label: 'One number',                    ok: /[0-9]/.test(password) },
  { label: 'One special character (!, @, #, $…)', ok: /[^a-zA-Z0-9]/.test(password) },
];

export const validateLoginForm = ({ email, password }) => {
  const errors = {};

  if (!email) {
    errors.email = 'Email is required.';
  } else if (!validateEmail(email)) {
    errors.email = 'Please enter a valid email address.';
  }

  if (!password) {
    errors.password = 'Password is required.';
  }

  return errors;
};

export const validateRegisterForm = ({ name, email, password, confirmPassword, phone, role }) => {
  const errors = {};

  if (!name || !name.trim()) {
    errors.name = 'Name is required.';
  }

  if (!email) {
    errors.email = 'Email is required.';
  } else if (!validateEmail(email)) {
    errors.email = 'Please enter a valid email address.';
  }

  if (!password) {
    errors.password = 'Password is required.';
  } else {
    const unmet = checkPasswordStrength(password).filter((c) => !c.ok);
    if (unmet.length > 0) {
      errors.password = unmet[0].label + ' is required.';
    }
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Please confirm your password.';
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  if (role === 'PARENT') {
    if (!phone || !phone.trim()) {
      errors.phone = 'Phone number is required.';
    } else if (!validatePhone(phone)) {
      errors.phone = 'Please enter a valid phone number (e.g. +44 7700 900000).';
    }
  }

  return errors;
};
