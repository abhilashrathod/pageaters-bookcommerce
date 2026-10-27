import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { bookArtwork, bundleArtwork, categoryArtwork, collectionArtwork, splitSeries, wrap } from './artwork.ts';

// node:test's describe/it return promises the runner tracks itself.

void describe('wrap', () => {
  void it('wraps by words within the line length', () => {
    assert.deepEqual(wrap('A Touch of Darkness', 12, 3), ['A Touch of', 'Darkness']);
  });

  void it('ends overflowing text with an ellipsis', () => {
    assert.deepEqual(wrap('one two three four five six', 9, 2), ['one two', 'three…']);
    assert.deepEqual(wrap('Supercalifragilistic', 8, 2), ['Superca…']);
    assert.deepEqual(wrap('Supercalifragilistic ab cd ef gh', 8, 2), ['Superca…', 'ab cd…']);
    assert.deepEqual(wrap('abcdefgh next', 8, 1), ['abcdefg…']);
  });
});

void describe('splitSeries', () => {
  void it('moves a trailing series note into a subtitle', () => {
    assert.deepEqual(splitSeries('Thrive (Addicted #6)'), ['Thrive', 'Addicted #6']);
    assert.deepEqual(splitSeries('Circe'), ['Circe', undefined]);
    assert.deepEqual(splitSeries('A ( )'), ['A ( )', undefined]);
  });
});

void describe('artwork', () => {
  const all = () => [
    bookArtwork('BK-1', 'Thrive (Addicted #6)', 'Krista & Becca Ritchie'),
    bundleArtwork('BL-1', 'Poppy War Bundle', 3),
    collectionArtwork('CL-1', 'Dark Academia'),
    categoryArtwork('Romance'),
  ];

  void it('is identical on every run', () => {
    assert.deepEqual(all(), all());
  });

  void it('uses brand colours only and no external references', () => {
    for (const svg of all()) {
      const colours = new Set(svg.match(/#[0-9a-f]{6}/gi));
      for (const colour of colours) assert.ok(['#ff5f25', '#222222', '#ffffff', '#ff8a5e', '#ffd2c2', '#ffb08f'].includes(colour), colour);
      assert.doesNotMatch(svg, /href|url\(|<image|<script|foreignObject/);
    }
  });

  void it('escapes text', () => {
    const svg = bookArtwork('BK-1', '"><script>x</script>', 'A & B');
    assert.doesNotMatch(svg, /<script|"></);
    assert.match(svg, /A &#38; B/);
  });

  void it('labels bundles with their size', () => {
    assert.match(bundleArtwork('BL-1', 'Duo', 1), />1 BOOK</);
    assert.match(bundleArtwork('BL-1', 'Trio', 3), />3 BOOKS</);
  });

  void it('never draws negative shelf sizes', () => {
    for (let n = 0; n < 200; n++) assert.doesNotMatch(collectionArtwork(`CL-${n}`, 'x'), /(width|height)="-/);
  });
});
