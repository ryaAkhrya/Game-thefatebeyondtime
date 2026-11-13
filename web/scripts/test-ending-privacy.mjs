// Actual production-bundle boundary test. All content here is a labelled synthetic QA canary, never a personal memory.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { webRoot, projectRoot, privateOut } from './ending-build.ts';
import { auditPublicBuild } from './audit-ending-build.mjs';
const dir=resolve(projectRoot,'private/anniversary'),imageDir=resolve(dir,'images');
const orphan=resolve(webRoot,'public/phase9-qa-unapproved.txt');
const outputIndex=resolve(webRoot,'dist/index.html');
const marker='PHASE9_PRIVACY_CANARY_9be2d6e1';
const log=[];const pass=s=>{log.push(s);console.log('PASS '+s);};
const run=args=>spawnSync(process.execPath,args,{cwd:webRoot,env:{...process.env,TFBT_PRIVATE_BUILD_CONFIRM:''},encoding:'utf8'});
let ownsDir=false,ownsOrphan=false;
const oldPrivateOutput=existsSync(privateOut);
try{
  const explicit=run(['scripts/build-private.mjs']);assert.notEqual(explicit.status,0);assert.match(explicit.stderr,/Explicit local action/);assert.equal(existsSync(privateOut),oldPrivateOutput);pass('Private build without explicit action is rejected without creating output');
  const initial=existsSync(outputIndex)?createHash('sha256').update(readFileSync(outputIndex)).digest('hex'):null;
  if(existsSync(orphan))throw Error('QA orphan path already exists; refusing to overwrite');
  writeFileSync(orphan,marker);ownsOrphan=true;
  const rejected=run(['node_modules/vite/bin/vite.js','build']);assert.notEqual(rejected.status,0);assert.match(rejected.stdout+rejected.stderr,/Unapproved public asset/);
  if(initial)assert.equal(createHash('sha256').update(readFileSync(outputIndex)).digest('hex'),initial);pass('Real Vite build rejects an unapproved public file before clearing dist');
  unlinkSync(orphan);ownsOrphan=false;
  const bypass=run(['node_modules/vite/bin/vite.js','build','--mode','anniversary']);assert.notEqual(bypass.status,0);assert.match(bypass.stdout+bypass.stderr,/explicitly/);assert.equal(existsSync(privateOut),oldPrivateOutput);pass('Direct anniversary mode cannot bypass the explicit private command');
  const override=run(['node_modules/vite/bin/vite.js','build','--outDir',privateOut]);assert.notEqual(override.status,0);assert.match(override.stdout+override.stderr,/Output override rejected/);assert.equal(existsSync(privateOut),oldPrivateOutput);pass('Public output cannot be redirected into the private build directory');
  if(!existsSync(dir)){
    mkdirSync(imageDir,{recursive:true});ownsDir=true;
    writeFileSync(resolve(imageDir,'qa-canary.png'),Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64'));
    writeFileSync(resolve(dir,'memories.json'),JSON.stringify({version:1,memories:[{id:'qa-only',caption:marker,image:'images/qa-canary.png',durationMs:6000,transition:'fade'}],message:{paragraphs:[marker+'_MESSAGE'],signature:'QA'}}));
  }
  const built=run(['node_modules/vite/bin/vite.js','build']);assert.equal(built.status,0,built.stdout+built.stderr);pass('Public production build succeeds with a separate local private directory');
  const count=auditPublicBuild(undefined,[marker,marker+'_MESSAGE']);pass(`Actual public artifact contains no private metadata or photo bytes (${count} files)`);
  const ignore=spawnSync('git',['check-ignore','private/anniversary/memories.json','private-build/anniversary/index.html'],{cwd:projectRoot,encoding:'utf8'});assert.equal(ignore.status,0);assert.equal(ignore.stdout.trim().split(/\r?\n/).length,2);pass('Private inputs and outputs are ignored by Git');
  assert.equal(existsSync(privateOut),oldPrivateOutput);pass('No private build was created by public QA');
}finally{
  if(ownsOrphan)unlinkSync(orphan);
  if(ownsDir){unlinkSync(resolve(imageDir,'qa-canary.png'));unlinkSync(resolve(dir,'memories.json'));rmdirSync(imageDir);rmdirSync(dir);}
}
writeFileSync(resolve(projectRoot,'.dev-cache/logs/phase9-privacy-results.json'),JSON.stringify({checks:log,syntheticCanaryOnly:true},null,2));
