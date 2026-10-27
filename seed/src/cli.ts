// Reads the raw dump (outside the repo) and writes the sanitised seed to seed/data.
// Usage: pnpm --filter @pageaters/seed sanitise [dump-dir]   (default: SEED_DUMP_DIR or ../pageaters-data-dump)
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { specs } from './collections.ts';
import { sanitise, type Doc, type Dump } from './sanitise.ts';
import { evaluate, scan } from './scan.ts';

const repoRoot = resolve(import.meta.dirname, '../..');
const dumpDir = resolve(process.argv[2] ?? process.env.SEED_DUMP_DIR ?? join(repoRoot, '../pageaters-data-dump'));
const outDir = join(repoRoot, 'seed/data');

const dump: Dump = {};
for (const spec of specs) {
  const file = join(dumpDir, `pageaters.${spec.dumpName}.json`);
  dump[spec.dumpName] = JSON.parse(await readFile(file, 'utf8')) as Doc[];
}

const { data, report } = sanitise(dump);

const lines = report.collections.map(({ name, read, written }) => `  ${name.padEnd(14)} ${String(read).padStart(4)} → ${written}`);
process.stdout.write(`${lines.join('\n')}\n  pruned refs to removed documents: ${report.prunedRefs}\n`);
if (report.unknownFields.length > 0) {
  process.stderr.write(
    `Unreviewed fields dropped (allowlist them in collections.ts only after review):\n  ${report.unknownFields.join('\n  ')}\n`,
  );
}

// Scan before writing, so flagged data never reaches seed/data.
const { flagged, rules, clean } = evaluate(Object.entries(data).flatMap(([name, docs]) => scan(name, docs)));
for (const { rule, found } of rules) {
  const status = found === rule.count ? '' : `  ← reviewed ${rule.count}, review again`;
  process.stdout.write(`  reviewed ${rule.kind} in ${rule.file}.${rule.path}: ${found} (${rule.reason})${status}\n`);
}
if (flagged.length > 0) {
  const flaggedLines = flagged.map((f) => `  ${f.kind}  ${f.file} ${f.docId} ${f.path}  ${f.masked}`);
  process.stderr.write(`Sensitive-data scan flagged ${flagged.length} value(s) (masked):\n${flaggedLines.join('\n')}\n`);
}
if (clean && report.unknownFields.length === 0) {
  await mkdir(outDir, { recursive: true });
  for (const [name, docs] of Object.entries(data)) {
    await writeFile(join(outDir, `${name}.json`), `${JSON.stringify(docs, null, 2)}\n`);
  }
  process.stdout.write(`Seed written to ${outDir}\n`);
} else {
  // exitCode rather than exit(): lets piped output flush.
  process.stderr.write('Not clean: seed/data left unchanged. Fix the dump or pipeline, or review the findings.\n');
  process.exitCode = 1;
}
