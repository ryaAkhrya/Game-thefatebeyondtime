import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { press, selectMenu } from './battle-helpers.mjs';
const base=process.env.E2E_URL??'http://127.0.0.1:5173/';
const out=resolve(process.env.E2E_OUTPUT_DIR??'../.dev-cache/phase9-preview');mkdirSync(out,{recursive:true});
const results=[],errors=[];const check=(name,ok)=>{results.push({name,ok:!!ok});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const browser=await chromium.launch({channel:process.env.E2E_CHANNEL??'msedge',headless:true});
try{
  const context=await browser.newContext({viewport:{width:1366,height:768}});
  await context.addInitScript(()=>localStorage.setItem('tfbt.save.v1.slot3','QA_EXISTING_SLOT_DO_NOT_TOUCH'));
  const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base+'?qa=1&preview=ending');await p.waitForFunction(()=>window.__tfbt?.ending()?.replay);
  check('Direct local preview opens a non-saving ending replay',await p.evaluate(()=>window.__tfbt.ending().step==='era'&&localStorage.getItem('tfbt.save.v1.slot3')==='QA_EXISTING_SLOT_DO_NOT_TOUCH'&&!localStorage.getItem('tfbt.save.v1.auto')));
  await p.waitForFunction(()=>window.__tfbt.ending()?.canAdvance);await press(p,'Enter');await p.waitForFunction(()=>window.__tfbt.ending()?.step==='walk');
  await press(p,'Escape');await selectMenu(p,'settings');await press(p,'Enter');await p.waitForFunction(()=>window.__tfbt.inputLayer()==='settings');
  await press(p,'ArrowDown',5);await p.waitForFunction(()=>window.__tfbt.focus()==='settings:fullscreen');await press(p,'Enter');await p.waitForTimeout(800);
  const fs=await p.evaluate(()=>({enabled:document.fullscreenEnabled,active:!!document.fullscreenElement,setting:window.__tfbt.settings().fullscreen}));
  check('Fullscreen setting agrees with actual browser state',fs.active===fs.setting);if(fs.enabled)check('Installed Edge permits fullscreen from keyboard gesture',fs.active);
  if(fs.active){await press(p,'Enter');await p.waitForTimeout(500);}
  await press(p,'ArrowDown');await p.waitForFunction(()=>window.__tfbt.focus()==='settings:scale');await press(p,'ArrowRight');
  await press(p,'ArrowDown',2);await p.waitForFunction(()=>window.__tfbt.focus()==='settings:flash');await press(p,'ArrowLeft');await press(p,'Escape');await press(p,'Escape');
  check('Ending resumes after fullscreen, Pixel Perfect and reduced-flash changes',await p.evaluate(()=>window.__tfbt.ending()?.step==='walk'&&!window.__tfbt.ending().paused&&window.__tfbt.endingResources().textures===1&&window.__tfbt.settings().screen_scale==='pixel_perfect'&&!window.__tfbt.settings().reduced_flashes));
  await p.screenshot({path:resolve(out,'ending_preview_pixel_perfect.png')});
  for(let i=0;i<3;i++){
    await press(p,'Escape');await selectMenu(p,'title');await press(p,'Enter');await p.waitForFunction(()=>window.__tfbt.activeScenes().includes('TitleScene'));
    check(`Shutdown ${i+1} releases generated textures and all ending input layers`,await p.evaluate(()=>window.__tfbt.endingResources().textures===0&&window.__tfbt.endingResources().photos===0&&window.__tfbt.endingResources().inputLayers===1&&window.__tfbt.inputLayer()==='title'));
    if(i<2){await p.evaluate(()=>window.__tfbt.qa.chapter4('complete',undefined,{endingPreview:true}));await p.waitForFunction(()=>window.__tfbt.ending()?.step==='era');}
  }
  check('Review shortcut never overwrites a pre-existing browser slot or makes an autosave',await p.evaluate(()=>localStorage.getItem('tfbt.save.v1.slot3')==='QA_EXISTING_SLOT_DO_NOT_TOUCH'&&!localStorage.getItem('tfbt.save.v1.auto')));
  check('No fatal preview runtime errors',!errors.length);
  writeFileSync(resolve(out,'preview-results.json'),JSON.stringify({results,errors,fullscreen:fs},null,2));await context.close();
}finally{await browser.close();}
console.log(`${results.filter(x=>x.ok).length}/${results.length} preview checks passed`);if(results.some(x=>!x.ok))process.exitCode=1;
