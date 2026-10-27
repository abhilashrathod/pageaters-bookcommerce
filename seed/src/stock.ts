// Generated stock levels. The real inventory is never read: values depend only on the document ID, so every
// run produces the same seed. About 5% of books are out of stock so the storefront shows that state; the rest
// get 1–1000 copies, enough that occasional demo orders (which still deduct stock) never empty them.

// FNV-1a: stable 32-bit hash of the document ID.
function hash(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// mulberry32: small seeded PRNG returning floats in [0, 1).
function random(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function between(next: () => number, min: number, max: number): number {
  return min + Math.floor(next() * (max - min + 1));
}

export function generateStock(id: string): number {
  const next = random(hash(id));
  return next() < 0.05 ? 0 : between(next, 1, 1000);
}
