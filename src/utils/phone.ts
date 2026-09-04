import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

const DEFAULT_COUNTRY: CountryCode = "US";

export function normalizePhone(input: string | undefined | null, defaultCountry: CountryCode = DEFAULT_COUNTRY): string | undefined {
  if (!input) {
    return undefined;
  }
  const trimmed = input.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = parsePhoneNumberFromString(trimmed, defaultCountry);
  if (parsed?.isValid()) {
    return parsed.number;
  }

  const digits = trimmed.replace(/[^\d+]/g, "");
  if (digits.startsWith("+") && digits.length >= 8) {
    return digits;
  }
  if (/^\d{10}$/.test(digits)) {
    return `+1${digits}`;
  }
  if (/^\d{11}$/.test(digits) && digits.startsWith("1")) {
    return `+${digits}`;
  }
  return undefined;
}

export function maskPhone(phone: string | undefined): string | undefined {
  if (!phone) {
    return phone;
  }
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) {
    return "***";
  }
  return `***${digits.slice(-4)}`;
}
