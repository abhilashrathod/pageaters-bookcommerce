import type { Doc } from './sanitise.ts';

// Sensitive-data scan for the sanitised seed. Matches are reported masked; a human decides what is real.
// Patterns carry the `g` flag for `matchAll`; don't reuse them with `.test()`/`.exec()` (stateful `lastIndex`).

interface Detector {
  // A fixed kind, or a classifier that names the kind of a match (undefined = not sensitive).
  kind: string | ((match: string) => string | undefined);
  pattern: RegExp;
}

// Digit runs with separators: mobile, landline, toll-free, Aadhaar, card and bank account numbers.
export function classifyNumber(match: string): string | undefined {
  let digits = match.replace(/\D/g, '');
  if (digits.length < 9) return undefined;
  // ISBN-13s quoted in blurbs and bios.
  if (/^97[89]\d{10}$/.test(digits)) return undefined;
  if (/^(?:1800|1860)\d{6,7}$/.test(digits)) return 'phone';
  const international = /^\+?\s*\(?91/.test(match) && digits.length === 12;
  if (international) digits = digits.slice(2);
  if (/^0\d{9,10}$/.test(digits)) return 'phone';
  if (digits.length === 10 && (international || /^[6-9]/.test(digits))) return 'phone';
  if (digits.length === 12) return 'aadhaar-or-card';
  return 'long-number';
}

const detectors: readonly Detector[] = [
  { kind: 'email', pattern: /[\w.+-]+@[\w-]+\.[\w.-]+/g },
  // UPI IDs: `name@bank`, no dot after the `@` (so not an email).
  { kind: 'upi', pattern: /[\w.-]+@[a-z]{2,}(?![\w.-])/gi },
  // Numbers labelled as an ISBN are skipped.
  { kind: classifyNumber, pattern: /(?<!\d|ISBN:?\s*[\d-]*)\+?\(?\d[\d\s.()/-]{7,}\d(?!\d)/g },
  { kind: 'gstin', pattern: /\b\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[\dA-Z]\b/gi },
  { kind: 'pan', pattern: /\b[A-Z]{5}\d{4}[A-Z]\b/gi },
  { kind: 'ifsc', pattern: /\b[A-Z]{4}0[A-Z\d]{6}\b/gi },
  // The old store's domains and handles (`pageaters.com`, `@pageaters_in`…). No reviewed rule exempts them. The plain
  // name is the demo's own brand and stays.
  { kind: 'brand', pattern: /pageaters\.[a-z]|@pageaters/gi },
  { kind: 'url', pattern: /\bhttps?:\/\/[^\s"'<>)]+|\bwww\.[^\s"'<>)]+/gi },
  { kind: 'social-handle', pattern: /(?<![\w.])@[A-Za-z_][\w.]{2,}/g },
  {
    kind: 'business-term',
    pattern: /\b(?:wholesale|supplier|vendor|margin|cost price|purchase price|whatsapp|call us|contact us|gst)\b/gi,
  },
];

export interface Finding {
  file: string;
  docId: string;
  path: string;
  kind: string;
  masked: string;
}

// Findings triaged as not sensitive (PLAN Phase 2 step 2). A rule accepts only its kind, file and field, only the
// listed terms when given, and only the reviewed count: any change in the dump or pipeline needs a new review.
export interface Reviewed {
  kind: string;
  file: string;
  path: string;
  terms?: readonly string[];
  count: number;
  reason: string;
}

export const reviewed: readonly Reviewed[] = [
  { kind: 'url', file: 'authors', path: 'intro', count: 17, reason: "authors' own public websites in publisher bios" },
  { kind: 'social-handle', file: 'authors', path: 'intro', count: 24, reason: "authors' public social accounts in publisher bios" },
  {
    kind: 'business-term',
    file: 'store-books',
    path: 'description',
    terms: ['vendor', 'supplier', 'call us'],
    count: 3,
    reason: 'words in book blurbs (plot copy)',
  },
];

// Keeps the first two characters, the host of a link (never its userinfo), or the matched brand/business term.
export function mask(kind: string, value: string): string {
  if (kind === 'url') {
    const authority = /^(?:https?:\/\/)?([^/?#]*)/i.exec(value)?.[1] ?? '';
    return `${authority.slice(authority.lastIndexOf('@') + 1)}/…`;
  }
  if (kind === 'brand' || kind === 'business-term') return value.toLowerCase();
  return `${value.slice(0, 2)}${'*'.repeat(Math.max(value.length - 2, 0))}`;
}

// Structural values are skipped only when they have the expected shape; any other value is flagged.
const STRUCTURAL_KEYS = new Set(['_id', '$oid', '$date']);
const IDENTIFIERS: readonly { key: RegExp; value: RegExp }[] = [
  { key: /^\w+Id$/, value: /^[A-Za-z]+-\d+$/ },
  // Normalised by the pipeline: digits and a trailing X.
  { key: /^ISBN$/, value: /^(?:\d{9,12}[\dX])?$/ },
];
// Uploaded image names end in `-<10-char random id>-<13-digit upload time>.<ext>`; only the title slug is scanned.
const IMAGE_KEYS = /^(?:poster|images|avatar|thumbnail|imageUrl)$/;
const UPLOAD_SUFFIX = /-[A-Za-z\d]{10}-\d{13}\.[a-z\d]{3,4}$/i;

interface Value {
  path: string;
  text: string;
  // An identifier field whose value doesn't have the identifier shape.
  unexpected: boolean;
}

function* values(value: unknown, path: string, key: string): Generator<Value> {
  if (typeof value === 'string' && IMAGE_KEYS.test(key)) {
    yield { path, text: value.replace(UPLOAD_SUFFIX, ''), unexpected: false };
  } else if (typeof value === 'string') {
    const identifier = IDENTIFIERS.find((id) => id.key.test(key));
    if (!identifier?.value.test(value)) yield { path, text: value, unexpected: identifier !== undefined };
  } else if (typeof value === 'number' && Number.isInteger(value) && Math.abs(value) >= 1e8) {
    yield { path, text: String(value), unexpected: false };
  } else if (Array.isArray(value)) {
    for (const item of value) yield* values(item, `${path}[]`, key);
  } else if (typeof value === 'object' && value !== null) {
    for (const [child, item] of Object.entries(value)) {
      if (!STRUCTURAL_KEYS.has(child)) yield* values(item, path ? `${path}.${child}` : child, child);
    }
  }
}

export function scan(file: string, docs: Doc[]): Finding[] {
  const findings: Finding[] = [];
  for (const doc of docs) {
    const docId = (doc._id as { $oid?: string } | undefined)?.$oid ?? '?';
    for (const { path, text, unexpected } of values(doc, '', '')) {
      if (unexpected) findings.push({ file, docId, path, kind: 'unexpected-identifier', masked: mask('', text) });
      for (const { kind, pattern } of detectors) {
        for (const match of text.matchAll(pattern)) {
          const name = typeof kind === 'string' ? kind : kind(match[0]);
          if (name) findings.push({ file, docId, path, kind: name, masked: mask(name, match[0]) });
        }
      }
    }
  }
  return findings;
}

function accepts(rule: Reviewed, finding: Finding): boolean {
  return (
    rule.kind === finding.kind &&
    rule.file === finding.file &&
    rule.path === finding.path &&
    (!rule.terms || rule.terms.includes(finding.masked))
  );
}

export interface Evaluation {
  flagged: Finding[];
  rules: { rule: Reviewed; found: number }[];
  // Nothing flagged and every reviewed rule matched exactly its reviewed count.
  clean: boolean;
}

export function evaluate(findings: Finding[]): Evaluation {
  const flagged = findings.filter((finding) => !reviewed.some((rule) => accepts(rule, finding)));
  const rules = reviewed.map((rule) => ({ rule, found: findings.filter((finding) => accepts(rule, finding)).length }));
  return { flagged, rules, clean: flagged.length === 0 && rules.every(({ rule, found }) => found === rule.count) };
}
