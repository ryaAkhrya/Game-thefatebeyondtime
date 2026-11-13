import { readFileSync, readdirSync, lstatSync, existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { webRoot, projectRoot, validatePublicAssets } from './ending-build.ts';
export function auditPublicBuild(output = resolve(webRoot, 'dist'), forbidden = []) {
  validatePublicAssets();
  const files = [];
  function visit(dir) { for (const name of readdirSync(dir)) { const p = resolve(dir, name); const s = lstatSync(p); if (s.isSymbolicLink()) throw Error('Symlink in build'); if (s.isDirectory()) visit(p); else files.push(p); } }
  visit(output);
  for (const p of files) {
    const name = relative(output, p);
    if (/anniversary-media|private-build|personal-private|(^|[\\/])memories\.json/i.test(name)) throw Error('Private file in public output: ' + name);
    const bytes = readFileSync(p);
    for (const marker of forbidden) if (bytes.includes(Buffer.from(marker))) throw Error('Private marker in public output: ' + name);
  }
  // Compare actual local content bytes/metadata when supplied, without printing any private values.
  const local = resolve(projectRoot, 'private/anniversary/memories.json');
  if (existsSync(local)) {
    const m = JSON.parse(readFileSync(local, 'utf8'));
    const markers = [...(m.memories ?? []).flatMap(x => [x.caption, x.note, x.date, x.group]), ...(m.message?.paragraphs ?? [])].filter(x => typeof x === 'string' && x.length >= 8);
    const photoBytes = (m.memories ?? []).map(x => {
      if (typeof x.image !== 'string' || !/^images\/[a-z0-9_./-]+\.(png|jpe?g|webp)$/i.test(x.image) || x.image.split('/').includes('..')) throw Error('Unsafe local image reference');
      return readFileSync(resolve(projectRoot, 'private/anniversary', x.image));
    });
    for (const p of files) {
      const b = readFileSync(p);
      if (markers.some(x => b.includes(Buffer.from(x))) || photoBytes.some(x => b.equals(x))) throw Error('Local private content detected in public output');
    }
  }
  return files.length;
}
if (process.argv[1]?.endsWith('audit-ending-build.mjs')) console.log(`Public build privacy PASS: ${auditPublicBuild()} files inspected.`);
