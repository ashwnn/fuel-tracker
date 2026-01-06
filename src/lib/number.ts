/**
 * Robust number parsing & formatting helpers
 * Accepts numbers, numeric strings, or Decimal-like objects and returns
 * JS numbers or null when not convertible.
 */
export function toNumber(value: any): number | null {
  if (value == null) return null;
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof value === 'object') {
    // Decimal.js or prisma Decimal may have toNumber/toString
    if (typeof value.toNumber === 'function') {
      try {
        return value.toNumber();
      } catch (_) {
        // fallthrough
      }
    }
    if (typeof value.toString === 'function') {
      const n = Number(value.toString());
      return Number.isFinite(n) ? n : null;
    }
  }
  return null;
}

export function formatNumber(value: any, decimals = 2, fallback = '-') {
  const n = toNumber(value);
  if (n == null || !Number.isFinite(n)) return fallback;
  return n.toFixed(decimals);
}
