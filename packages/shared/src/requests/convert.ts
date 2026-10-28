// The API's Joi 14 validators run with `convert: true`, so numbers and booleans may arrive as strings (query
// strings always do). These preprocessors reproduce Joi 14's conversions exactly; a value they can't convert is
// returned unchanged, so the zod type check rejects it with the field's error code, as Joi did.

const NUMERIC_STRING = /^\s*[+-]?\d+(?:\.\d+)?(?:e([+-]?\d+))?\s*$/i;

// Joi 14's normalisers used regexes such as /\.?0+e/ and /0+$/, which backtrack quadratically on long runs of
// zeros (a 100k-character quantity took seconds). These loops give the same results in linear time; each names
// the Joi regex it replaces.

// /^\+/ → ''
const dropLeadingPlus = (text: string) => (text.startsWith('+') ? text.slice(1) : text);

// /^(-?)0+([1-9])/ → '$1$2': drop leading zeros before a non-zero digit.
const dropLeadingZeros = (text: string) => {
  const start = text.startsWith('-') ? 1 : 0;
  let end = start;
  while (text[end] === '0') end += 1;
  const next = text[end];
  const nonZeroDigitNext = next !== undefined && next >= '1' && next <= '9';
  return end > start && nonZeroDigitNext ? text.slice(0, start) + text.slice(end) : text;
};

// /0+$/ → ''
const dropTrailingZeros = (text: string) => {
  let end = text.length;
  while (end > 0 && text[end - 1] === '0') end -= 1;
  return text.slice(0, end);
};

// /\.?0+e/ → 'e' (first match): the zeros, and a dot just before them, in front of the first 'e' preceded by a zero.
const dropZerosBeforeExponent = (text: string) => {
  for (let e = text.indexOf('e'); e !== -1; e = text.indexOf('e', e + 1)) {
    let start = e;
    while (start > 0 && text[start - 1] === '0') start -= 1;
    if (start === e) continue;
    if (start > 0 && text[start - 1] === '.') start -= 1;
    return text.slice(0, start) + text.slice(e);
  }
  return text;
};

const normalizeExponent = (text: string) => dropLeadingZeros(dropLeadingPlus(dropZerosBeforeExponent(text).replace('e+', 'e')));

const normalizeDecimal = (text: string) => {
  let normalized = dropLeadingPlus(text);
  // /\.0+$/ → '': a fraction made only of zeros.
  const dot = normalized.indexOf('.');
  if (dot !== -1 && dot < normalized.length - 1 && dropTrailingZeros(normalized).length === dot + 1) {
    normalized = normalized.slice(0, dot);
  }
  normalized = dropLeadingZeros(normalized);
  return normalized.includes('.') && normalized.endsWith('0') ? dropTrailingZeros(normalized) : normalized;
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
