import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname, basename } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { loadPrivateContent, publicFiles, validatePublicAssets, validateOutputPath, projectRoot } from '../../scripts/ending-build';

const root=mkdtempSync(resolve(projectRoot,'.dev-cache/ending-schema-'));
afterAll(()=>{
  const target=resolve(root);
  if(dirname(target)!==resolve(projectRoot,'.dev-cache')||!basename(target).startsWith('ending-schema-'))throw new Error('Refusing cleanup outside the owned QA directory');
  rmSync(target,{recursive:true,force:true});
});
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
const fixture=()=>({version:1,memories:[{id:'qa-fixture',caption:'QA_CANARY_ONLY_NOT_A_REAL_MEMORY',image:'images/qa.png',durationMs:6000,transition:'fade'}],message:{paragraphs:['QA_CANARY_MESSAGE_ONLY'],signature:'QA'}});
describe('Ending privacy build boundary',()=>{
  it('rejects a build cleanup target outside the resolved project directory',()=>{expect(()=>validateOutputPath(resolve(projectRoot,'..','escape-output'))).toThrow(/inside/);expect(()=>validateOutputPath(projectRoot)).toThrow(/root/);expect(()=>validateOutputPath(resolve(projectRoot,'web/dist'))).not.toThrow();});
  it('accepts only existing public files with their approved SHA-256, and no symlinks',()=>{expect(()=>validatePublicAssets()).not.toThrow();expect(publicFiles().length).toBeGreaterThan(100);});
  it('pins public text approvals to LF bytes used by Git checkouts on Vercel',()=>{
    const web=resolve(projectRoot,'web');
    const entries=JSON.parse(readFileSync(resolve(web,'public-assets.allowlist.json'),'utf8')) as Array<{path:string;sha256:string}>;
    for(const entry of entries.filter(e=>/\.(json|txt)$/.test(e.path))){
      const bytes=readFileSync(resolve(web,'public',entry.path),'utf8').replace(/\r\n/g,'\n');
      expect(createHash('sha256').update(bytes).digest('hex'),entry.path).toBe(entry.sha256);
    }
  });
  it('requires local private content and fails on absent input',()=>{expect(()=>loadPrivateContent(resolve(root,'absent'))).toThrow(/absent/);});
  it('validates real image bytes and rewrites only local build references without changing the source',()=>{
    const dir=resolve(root,'valid');mkdirSync(resolve(dir,'images'),{recursive:true});writeFileSync(resolve(dir,'images/qa.png'),png);const m=fixture();writeFileSync(resolve(dir,'memories.json'),JSON.stringify(m));
    const p=loadPrivateContent(dir);expect(p.content.memories[0]!.image).toBe('anniversary-media/memory-0.png');expect(p.images[0]!.bytes.equals(png)).toBe(true);expect(m.memories[0]!.image).toBe('images/qa.png');
  });
  it('rejects forged image extensions, missing images and malformed data before build',()=>{
    const dir=resolve(root,'invalid');mkdirSync(resolve(dir,'images'),{recursive:true});writeFileSync(resolve(dir,'images/qa.png'),'not a PNG');writeFileSync(resolve(dir,'memories.json'),JSON.stringify(fixture()));expect(()=>loadPrivateContent(dir)).toThrow(/signature/);
    const m=fixture();m.memories[0]!.image='images/absent.jpg';writeFileSync(resolve(dir,'memories.json'),JSON.stringify(m));expect(()=>loadPrivateContent(dir)).toThrow();
    writeFileSync(resolve(dir,'memories.json'),'{}');expect(()=>loadPrivateContent(dir)).toThrow(/manifest/);
  });
});
