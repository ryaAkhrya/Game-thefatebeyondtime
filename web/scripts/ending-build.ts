import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, lstatSync, realpathSync, existsSync } from 'node:fs';
import { resolve, relative, sep, extname, isAbsolute, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { validateAnniversary, type AnniversaryContent } from '../src/game/ending/memorySchema.ts';

export const webRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const projectRoot = resolve(webRoot, '..');
const privateRoot = resolve(projectRoot, 'private/anniversary');
export const privateOut = resolve(projectRoot, 'private-build/anniversary');
const virtualId = '\0virtual:ending-content';

function inside(root: string, path: string): boolean { const r = relative(root, path); return !isAbsolute(r) && r !== '..' && !r.startsWith(`..${sep}`) && !resolve(path).startsWith('\\\\'); }
export function validateOutputPath(output: string): void {
  const target=resolve(output), realRoot=realpathSync(projectRoot);
  if(target===projectRoot||!inside(projectRoot,target))throw new Error('Build output must stay inside this project, below its root');
  // Vite may clear this directory recursively. Check every existing ancestor before it can do so.
  for(let path=target;path!==projectRoot;path=dirname(path)) {
    if(existsSync(path)&&(lstatSync(path).isSymbolicLink()||!inside(realRoot,realpathSync(path))))throw new Error('Build output may not traverse symbolic links or leave the project');
  }
}
export function publicFiles(root = resolve(webRoot, 'public')): string[] {
  const files: string[] = [];
  function visit(dir: string): void {
    for (const name of readdirSync(dir)) {
      const path = resolve(dir, name), stat = lstatSync(path);
      if (stat.isSymbolicLink()) throw new Error('Public assets may not contain symbolic links');
      if (stat.isDirectory()) visit(path); else files.push(relative(root, path).split(sep).join('/'));
    }
  }
  visit(root); return files.sort();
}
export function validatePublicAssets(): void {
  const entries = JSON.parse(readFileSync(resolve(webRoot, 'public-assets.allowlist.json'), 'utf8')) as Array<{ path: string; sha256: string }>;
  const allowed = new Map(entries.map(e => [e.path, e.sha256]));
  for (const path of publicFiles()) if (allowed.get(path) !== createHash('sha256').update(readFileSync(resolve(webRoot, 'public', path))).digest('hex') || /(^|\/)(private|personal-private|memories)(\/|$)/i.test(path)) throw new Error(`Unapproved public asset: ${path}. Personal media belongs in private/anniversary.`);
}

export function loadPrivateContent(root = privateRoot): { content: AnniversaryContent; images: Array<{ file: string; bytes: Buffer; source: string }> } {
  if (!existsSync(root)) throw new Error('Private anniversary content is absent; no private build was created.');
  const manifest = resolve(root, 'memories.json');
  if (!inside(realpathSync(root), realpathSync(manifest))) throw new Error('Private manifest escapes its local directory');
  const content = validateAnniversary(JSON.parse(readFileSync(manifest, 'utf8')));
  const images = content.memories.map((m, i) => {
    const source = resolve(root, m.image);
    if (!inside(realpathSync(root), realpathSync(source))) throw new Error('Image escapes the local private directory');
    const bytes = readFileSync(source);
    if (bytes.length === 0 || bytes.length > 25 * 1024 * 1024) throw new Error('Private image must be 1 byte–25 MB');
    // Validate file signature as well as extension; SVG/HTML is deliberately unsupported.
    const ext = extname(source).toLowerCase();
    const valid = ext === '.png' ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
      : ext === '.webp' ? bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
      : bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (!valid) throw new Error('Image signature does not match its extension');
    const file = `anniversary-media/memory-${i}${ext}`;
    m.image = file;
    return { file, bytes, source };
  });
  return { content, images };
}

/** No frontend environment secret. Public virtual module is literally null, even when local private data exists. */
export function endingBuild(mode: string): Plugin {
  const isPrivate = mode === 'anniversary';
  let payload: ReturnType<typeof loadPrivateContent> | null = null;
  return {
    name: 'ending-privacy-boundary', enforce: 'pre',
    config(_config, env) {
      validatePublicAssets();
      if (isPrivate) {
        if (env.command !== 'build' || process.env.TFBT_PRIVATE_BUILD_CONFIRM !== 'LOCAL_ONLY') throw new Error('Use npm run build:private -- --confirm-private-local explicitly.');
        payload = loadPrivateContent(); // validate before emptyOutDir can run
      }
      return { server: { fs: { strict: true, allow: [webRoot], deny: ['**/private/**', '**/private-build/**', '**/.env*', '**/.git/**'] } } };
    },
    configResolved(config) {
      const expected = isPrivate ? privateOut : resolve(webRoot, 'dist');
      if (resolve(config.root, config.build.outDir) !== expected) throw new Error('Output override rejected: private and public builds must remain isolated.');
      validateOutputPath(expected);
    },
    resolveId(id) { if (id === 'virtual:ending-content') return virtualId; },
    load(id) {
      if (!isPrivate && /[/\\](?:private|private-build)[/\\]/i.test(id)) throw new Error('Private imports are forbidden in a public bundle');
      if (id === virtualId) return `export default ${JSON.stringify(payload?.content ?? null)};`;
    },
    buildStart() { if (payload) for (const img of payload.images) this.emitFile({ type: 'asset', fileName: img.file, source: img.bytes }); },
  };
}
