// ISBNs as typed in the old admin: hyphens, stray whitespace, invisible marks, `n/a`, a space inside the number,
// or several ISBNs in one field.

// Digits (and a trailing X) only; keeps the first ISBN when several were typed. Unusable input becomes ''.
export function normaliseIsbn(raw: string): string {
  const clean = raw.replace(/[^\dX]/gi, '').toUpperCase();
  if (clean.length > 13 && clean.length % 13 === 0) return clean.slice(0, 13);
  return clean;
}

export function isValidIsbn(isbn: string): boolean {
  if (/^\d{13}$/.test(isbn)) {
    const sum = [...isbn].reduce((total, digit, i) => total + Number(digit) * (i % 2 === 0 ? 1 : 3), 0);
    return sum % 10 === 0;
  }
  if (/^\d{9}[\dX]$/.test(isbn)) {
    const sum = [...isbn].reduce((total, char, i) => total + (char === 'X' ? 10 : Number(char)) * (10 - i), 0);
    return sum % 11 === 0;
  }
  return false;
}
