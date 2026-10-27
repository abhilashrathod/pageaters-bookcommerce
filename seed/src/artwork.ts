// Generated brand artwork (SVG) for catalog items without an image: books without a usable cover, bundles,
// collections and categories. Brand colours only (theme accent and primary). Output depends only on the item, so
// reruns produce identical files. Images get cropped to fit their card, so text stays in the middle.
import { hash } from './stock.ts';

const ACCENT = '#ff5f25';
const PRIMARY = '#222222';
const WHITE = '#ffffff';
const FONT = "Metropolis, -apple-system, 'Segoe UI', Roboto, sans-serif";

const escapeXml = (text: string) => text.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);

// Greedy word wrap by character count (a fair proxy for a proportional font at these sizes). Overlong text ends
// with an ellipsis on the last allowed line.
export function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.trim().split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= maxChars || !line) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  const cut = (l: string) => `${l.slice(0, maxChars - 1).trimEnd()}…`;
  const kept = lines.slice(0, maxLines).map((l) => (l.length > maxChars ? cut(l) : l));
  if (lines.length > maxLines) {
    // Drop whole words from the last line until the ellipsis fits; cut mid-word only for a single long word.
    let words = (kept[maxLines - 1] ?? '').split(' ');
    while (words.length > 1 && `${words.join(' ')}…`.length > maxChars) words = words.slice(0, -1);
    const last = words.join(' ');
    kept[maxLines - 1] = last.endsWith('…') ? last : last.length < maxChars ? `${last}…` : cut(last);
  }
  return kept;
}

// Centred lines of text around `cy`.
function textBlock(lines: string[], opts: { x: number; cy: number; size: number; weight: number; fill: string; lineHeight?: number }) {
  const step = opts.size * (opts.lineHeight ?? 1.18);
  const top = opts.cy - ((lines.length - 1) * step) / 2;
  return lines
    .map(
      (line, i) =>
        `<text x="${opts.x}" y="${(top + i * step).toFixed(1)}" dy="0.35em" text-anchor="middle" fill="${opts.fill}" font-family="${FONT}" font-size="${opts.size}" font-weight="${opts.weight}">${escapeXml(line)}</text>`,
    )
    .join('\n  ');
}

function svg(width: number, height: number, label: string, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(label)}">
  ${body}
</svg>
`;
}

// Splits a trailing series note into a subtitle: "Thrive (Addicted #6)" → ["Thrive", "Addicted #6"].
export function splitSeries(title: string): [string, string | undefined] {
  const match = /^(.+?)\s*\(([^()]+)\)\s*$/.exec(title.trim());
  const series = match?.[2]?.trim();
  return match?.[1] && series ? [match[1], series] : [title.trim(), undefined];
}

// Book cover: accent cover with a dark spine, or the reverse, picked per book.
export function bookArtwork(id: string, title: string, author: string): string {
  const dark = hash(id) % 2 === 1;
  const [cover, spine, rule] = dark ? [PRIMARY, ACCENT, ACCENT] : [ACCENT, PRIMARY, WHITE];
  const [main, series] = splitSeries(title);
  const titleLines = wrap(main, 16, series ? 3 : 4);
  const titleCy = series ? 370 : 400;
  const seriesY = titleCy + (titleLines.length * 52 * 1.18) / 2 + 48;
  return svg(
    600,
    900,
    `${title} by ${author}`,
    `<rect width="600" height="900" fill="${cover}"/>
  <rect width="56" height="900" fill="${spine}"/>
  <rect x="56" width="6" height="900" fill="${WHITE}" fill-opacity="0.25"/>
  <rect x="120" y="150" width="420" height="4" fill="${rule}"/>
  ${textBlock(titleLines, { x: 330, cy: titleCy, size: 52, weight: 700, fill: WHITE })}
  ${series ? textBlock(wrap(series, 26, 1), { x: 330, cy: seriesY, size: 28, weight: 500, fill: WHITE }) : ''}
  <rect x="120" y="650" width="420" height="4" fill="${rule}"/>
  ${textBlock(wrap(author, 22, 2), { x: 330, cy: 730, size: 32, weight: 500, fill: WHITE })}`,
  );
}

// Bundle: a stack of books with the bundle's title and size.
export function bundleArtwork(id: string, title: string, count: number): string {
  const books = [
    { y: 330, w: 420, fill: ACCENT },
    { y: 270, w: 380, fill: WHITE },
    { y: 210, w: 440, fill: '#ff8a5e' },
  ];
  const offset = (hash(id) % 3) * 10 - 10;
  const stack = books
    .map(
      (b, i) =>
        `<rect x="${500 - b.w / 2 + (i % 2 === 0 ? offset : -offset)}" y="${b.y}" width="${b.w}" height="52" rx="6" fill="${b.fill}"/>
  <rect x="${500 - b.w / 2 + (i % 2 === 0 ? offset : -offset) + 24}" y="${b.y}" width="8" height="52" fill="${PRIMARY}" fill-opacity="0.2"/>`,
    )
    .join('\n  ');
  return svg(
    1000,
    1000,
    title,
    `<rect width="1000" height="1000" fill="${PRIMARY}"/>
  ${stack}
  ${textBlock(wrap(title, 24, 3), { x: 500, cy: 560, size: 54, weight: 700, fill: WHITE })}
  <text x="500" y="720" text-anchor="middle" fill="${ACCENT}" font-family="${FONT}" font-size="34" font-weight="600" letter-spacing="4">${count} ${count === 1 ? 'BOOK' : 'BOOKS'}</text>`,
  );
}

// Collection: a shelf of spines under the title, centred on the canvas so a wide card crop (down to
// about 1200×345) keeps the title and spines.
export function collectionArtwork(id: string, title: string): string {
  const h = hash(id);
  const fills = [PRIMARY, WHITE, '#ffd2c2', PRIMARY, '#ffb08f'];
  const gap = 8;
  const spines = Array.from({ length: 14 }, (_, i) => ({
    width: 46 + ((h >>> (i * 2)) % 5) * 6,
    height: 90 + ((h >>> (i + 5)) % 6) * 12,
    fill: fills[(i + h) % fills.length] ?? PRIMARY,
  }));
  const shelf = spines.reduce((total, spine) => total + spine.width, 0) + gap * (spines.length - 1);
  let x = (1200 - shelf) / 2;
  const rects = spines.map((spine) => {
    const rect = `<rect x="${x}" y="${630 - spine.height}" width="${spine.width}" height="${spine.height}" rx="4" fill="${spine.fill}"/>`;
    x += spine.width + gap;
    return rect;
  });
  return svg(
    1200,
    900,
    title,
    `<rect width="1200" height="900" fill="${ACCENT}"/>
  ${rects.join('\n  ')}
  <rect x="${(1200 - shelf) / 2 - 40}" y="630" width="${shelf + 80}" height="12" rx="3" fill="${PRIMARY}"/>
  ${textBlock(wrap(title, 22, 2), { x: 600, cy: 345, size: 64, weight: 700, fill: WHITE })}`,
  );
}

// Category: an open book mark above the title.
export function categoryArtwork(title: string): string {
  return svg(
    1000,
    1000,
    title,
    `<rect width="1000" height="1000" fill="${PRIMARY}"/>
  <path d="M500 330 C440 290 360 280 300 290 L300 520 C360 510 440 520 500 560 Z" fill="${ACCENT}"/>
  <path d="M500 330 C560 290 640 280 700 290 L700 520 C640 510 560 520 500 560 Z" fill="${ACCENT}" fill-opacity="0.8"/>
  <rect x="497" y="330" width="6" height="230" fill="${PRIMARY}"/>
  ${textBlock(wrap(title, 18, 2), { x: 500, cy: 680, size: 64, weight: 700, fill: WHITE })}`,
  );
}
