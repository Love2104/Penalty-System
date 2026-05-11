export const toE164 = (raw: string): string => {
  const digits = raw.replace(/[\s\-()]/g, '');

  if (digits.startsWith('+')) return digits;
  if (/^\d{10}$/.test(digits)) return `+91${digits}`;
  if (/^91\d{10}$/.test(digits)) return `+${digits}`;
  return `+${digits}`;
};

export const toIndianLocalNumber = (raw: string) =>
  raw.replace(/^\+?91/, '').replace(/\D/g, '').slice(-10);

export const formatIndianPhone = (raw: string) => {
  const localNumber = toIndianLocalNumber(raw);

  if (localNumber.length !== 10) {
    return raw;
  }

  return `+91 ${localNumber.slice(0, 5)} ${localNumber.slice(5)}`;
};

export const isPhoneLocalEmail = (value: string | null | undefined) =>
  typeof value === 'string' && value.endsWith('@phone.local');

export const getAuthUserLabel = (user: { phone: string | null; email: string | null }) =>
  user.phone ? formatIndianPhone(user.phone) : (user.email || 'No user loaded');
