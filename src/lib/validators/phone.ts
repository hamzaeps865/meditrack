export const pakistaniPhoneMessage = 'Enter a valid Pakistani mobile number (e.g. 03001234567 or +92 300 1234567).';

export function normalizePhoneInput(value: string) {
  return value.replace(/[()\s.-]/g, '').trim();
}

export function isValidPakistaniPhone(value: string) {
  const normalized = normalizePhoneInput(value);

  if (!normalized) {
    return false;
  }

  const withoutPlus = normalized.startsWith('+') ? normalized.slice(1) : normalized;

  if (withoutPlus.startsWith('92')) {
    return /^92(?:3\d{9})$/.test(withoutPlus);
  }

  return /^(03\d{9}|3\d{9})$/.test(withoutPlus);
}
