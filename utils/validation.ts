export type ValidationResult = { valid: true } | { valid: false; error: string };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): ValidationResult {
  const trimmed = email.trim();
  if (!trimmed) return { valid: false, error: 'Email is required.' };
  if (!EMAIL_REGEX.test(trimmed)) return { valid: false, error: 'Enter a valid email address.' };
  return { valid: true };
}

export function validatePassword(password: string): ValidationResult {
  if (!password) return { valid: false, error: 'Password is required.' };
  if (password.length < 6) return { valid: false, error: 'Password must be at least 6 characters.' };
  return { valid: true };
}

export function validateUsername(username: string): ValidationResult {
  const trimmed = username.trim();
  if (!trimmed) return { valid: false, error: 'Username is required.' };
  if (trimmed.length < 3) return { valid: false, error: 'Username must be at least 3 characters.' };
  if (trimmed.length > 20) return { valid: false, error: 'Username must be 20 characters or fewer.' };
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return { valid: false, error: 'Username can only contain letters, numbers, and underscores.' };
  }
  return { valid: true };
}

export interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  accepted: boolean;
}

export interface RegisterFormErrors {
  username?: string;
  email?: string;
  password?: string;
  accepted?: string;
  [key: string]: string | undefined;
}

export function validateRegisterForm(data: RegisterFormData): RegisterFormErrors {
  const errors: RegisterFormErrors = {};
  const username = validateUsername(data.username);
  if (!username.valid) errors.username = username.error;
  const email = validateEmail(data.email);
  if (!email.valid) errors.email = email.error;
  const password = validatePassword(data.password);
  if (!password.valid) errors.password = password.error;
  if (!data.accepted) errors.accepted = 'Please accept the terms to continue.';
  return errors;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface LoginFormErrors {
  email?: string;
  password?: string;
  [key: string]: string | undefined;
}

export function validateLoginForm(data: LoginFormData): LoginFormErrors {
  const errors: LoginFormErrors = {};
  const email = validateEmail(data.email);
  if (!email.valid) errors.email = email.error;
  const password = validatePassword(data.password);
  if (!password.valid) errors.password = password.error;
  return errors;
}

export function isFormValid(errors: Record<string, string | undefined>): boolean {
  return Object.values(errors).every((v) => !v);
}
