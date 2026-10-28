// The API's Joi 14 validators run with `convert: true`, so numbers and booleans may arrive as strings (query
// strings always do). These preprocessors reproduce Joi 14's conversions exactly; a value they can't convert is
// returned unchanged, so the zod type check rejects it with the field's error code, as Joi did.

const NUMERIC_STRING = /^\s*[+-]?\d+(?:\.\d+)?(?:e([+-]?\d+))?\s*$/i;

const normalizeExponent = (text: string) =>
  text
    .replace(/\.?0+e/, 'e')
    .replace(/e\+/, 'e')
    .replace(/^\+/, '')
    .replace(/^(-?)0+([1-9])/, '$1$2');

const normalizeDecimal = (text: string) => {
  const normalized = text
    .replace(/^\+/, '')
    .replace(/\.0+$/, '')
    .replace(/^(-?)0+([1-9])/, '$1$2');
  return normalized.includes('.') && normalized.endsWith('0') ? normalized.replace(/0+$/, '') : normalized;
};

// Joi 14 `number()`: a decimal string ('2', ' 3 ', '+2', '1.0', '1e1') becomes a number, unless parsing would
// lose information ('00', '-0', '1E1' are "unsafe" and rejected). Hex, binary, '.5' and '' are rejected.
export function joiNumber(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const match = NUMERIC_STRING.exec(value);
  if (!match) return value;
  const text = value.trim();
  const parsed = parseFloat(text);
  // Joi checks for a lower-case 'e' only, so '1E1' takes the decimal branch and fails it.
  if (text.includes('e')) {
    const exponent = match[1] ?? '';
    const roundTrip = normalizeExponent(`${String(parsed / Math.pow(10, Number(exponent)))}e${exponent}`);
    return roundTrip === normalizeExponent(text) ? parsed : value;
  }
  return parsed.toString() === normalizeDecimal(text) ? parsed : value;
}

// Joi 14 `boolean()`: 'true' and 'false' in any letter case become booleans; nothing else converts (not '1',
// 'yes', ' true' or the number 1).
export function joiBoolean(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const lower = value.toLowerCase();
  if (lower === 'true') return true;
  if (lower === 'false') return false;
  return value;
}
