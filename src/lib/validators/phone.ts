export const pakistaniPhoneMessage = 'Phone number must start with 0 and be exactly 11 digits (e.g. 03001234567).';

export function normalizePhoneInput(value: string) {
  return value.replace(/[()\s.-]/g, '').trim();
}

export function isValidPakistaniPhone(value: string) {
  const normalized = normalizePhoneInput(value);

  if (!normalized) {
    return false;
  }

  // Must start with '0' and be exactly 11 digits
  return /^0\d{10}$/.test(normalized);
}
