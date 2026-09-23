export function getSafeReturnTo(requested: string, origin: string): string {
  if (!requested.startsWith('/') || requested.startsWith('//')) return '';

  try {
    const target = new URL(requested, origin);
    return target.origin === origin ? `${target.pathname}${target.search}${target.hash}` : '';
  } catch {
    return '';
  }
}
