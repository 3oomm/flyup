export const unicodeLength = (value: string) => Array.from(value).length;

export const utf8ByteLength = (value: string) => new TextEncoder().encode(value).length;

export const isValidPasswordLength = (value: string) =>
  unicodeLength(value) >= 8 && utf8ByteLength(value) <= 72;

export const isValidHttpUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed || unicodeLength(trimmed) > 2048) return false;

  try {
    const parsed = new URL(trimmed);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      !!parsed.hostname &&
      !parsed.username &&
      !parsed.password;
  } catch {
    return false;
  }
};
