// Generated stock levels. The real inventory is never read: values depend only on the document ID, so every
// run produces the same seed. The API rejects add-to-cart above `inventory` and hides `inventory: 0` books
// from category pages, so almost everything is stocked; a few books are low or out of stock to exercise
// those states. Books inside a bundle are always stocked: one empty book blocks the whole bundle.

const AVAILABLE = 'available';

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

export function generateStock(id: string, availability: unknown, inBundle = false): number {
  const next = random(hash(id));
  // Procurement, import and pre-order books are always orderable.
  if (availability !== AVAILABLE) return between(next, 10, 40);
  const roll = next();
  if (inBundle) return between(next, 5, 40);
  if (roll < 0.04) return 0;
  if (roll < 0.1) return between(next, 1, 2);
  return between(next, 5, 40);
}
