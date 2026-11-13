import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { press, selectMenu } from './battle-helpers.mjs';
import { faceCity, finishCityDialogue } from './phase5-helpers.mjs';
import { saveSlot } from './phase4-helpers.mjs';

const BASE=process.env.E2E_URL??'http://127.0.0.1:5173/';
const out=resolve(process.env.E2E_OUTPUT_DIR??'../.dev-cache/phase9');mkdirSync(out,{recursive:true});
const results=[],errors=[],requests=[],metrics={};
const check=(name,ok,detail='')=>{results.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}${!ok?' '+detail:''}`);};
const ending=p=>p.evaluate(()=>window.__tfbt.ending());
const state=p=>p.evaluate(()=>window.__tfbt.state());
async function waitStep(p,step){await p.waitForFunction(s=>window.__tfbt.ending()?.step===s&&!window.__tfbt.ending()?.changing,step,{timeout:15000});}
async function approachRelic(p){await p.keyboard.down('ArrowRight');try{await p.waitForFunction(()=>window.__tfbt.ending()?.x>=410,null,{timeout:12000});}finally{await p.keyboard.up('ArrowRight');}}
async function advance(p,next){await p.waitForFunction(()=>window.__tfbt.ending()?.canAdvance&&!window.__tfbt.ending()?.changing);await press(p,'Enter');await waitStep(p,next);}
async function shot(p,name){await p.screenshot({path:resolve(out,`p9_${name}.png`)});}
async function layout(p,name){const issues=await p.evaluate(()=>window.__tfbt.layoutIssues());check(`${name}: text layout`,!issues.length,issues.join(';'));}
async function reloadContinue(p){await p.reload();await p.waitForFunction(()=>window.__tfbt?.activeScenes().includes('TitleScene'));await selectMenu(p,'continue');await press(p,'Enter');await p.waitForFunction(()=>!!window.__tfbt.ending());}
async function finishDialogue(p){
  const lines=[];await p.waitForFunction(()=>!!window.__tfbt.ending()?.dialogue);
  for(let i=0;i<60;i++){
    const d=(await ending(p))?.dialogue;if(!d)return lines;
    if(!lines.some(l=>l.line===d.line&&l.page===d.page))lines.push(d);
    await p.waitForTimeout(380);await press(p,'Enter');
  }
  throw Error('Ending dialogue exceeded guard');
}
async function perf(p,name){metrics[name]=await p.evaluate(async()=>{const samples=[];let last=performance.now();for(let i=0;i<90;i++){const now=await new Promise(requestAnimationFrame);samples.push(now-last);last=now;}return {mean:samples.reduce((a,b)=>a+b,0)/samples.length,max:Math.max(...samples)};});}

const browser=await chromium.launch({channel:process.env.E2E_CHANNEL??'msedge',headless:true});
console.log(`Phase 9 | ${process.env.E2E_CHANNEL??'msedge'} ${browser.version()} | ${BASE}`);
try{
  const widths=process.env.E2E_P9_WIDTHS?.split(',').map(Number)??[1366,1920];
  for(const width of widths){
    const height=width===1920?1080:768,tag=`${width}`;
    const context=await browser.newContext({viewport:{width,height}});
    await context.addInitScript(()=>{
      localStorage.setItem('tfbt.settings.v1',JSON.stringify({schema:'settings_v1',values:{text_speed:'instant',screen_shake:false,reduced_flashes:true,mute_all:true,screen_scale:'fit'}}));
      // Observe before Phaser/DisplayController install their resize handlers;
      // visualViewport may trigger relayout before the window resize event.
      const observe=()=>{if(window.__tfbt?.ending()?.changing)window.__endingResizeDuringFade=true;};
      window.addEventListener('resize',observe,{capture:true});
      window.visualViewport?.addEventListener('resize',observe,{capture:true});
    });
    const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('response',r=>{if(r.status()>=400)requests.push(`${r.status()} ${r.url()}`);});p.on('requestfailed',r=>{if(!r.url().includes('favicon'))requests.push(r.url());});
    try{
      await p.goto(BASE+'?qa=1');await p.waitForFunction(()=>window.__tfbt?.activeScenes().includes('TitleScene'));
      if(width===1366){
        await p.evaluate(()=>window.__tfbt.qa.chapter4('return'));
        await p.waitForFunction(()=>!!window.__tfbt.world()?.dialogue);await finishCityDialogue(p);
        await p.waitForFunction(()=>!window.__tfbt.world()?.busy&&window.__tfbt.state().flags['c4.return_scene_seen']);
        const r=await p.evaluate(()=>window.__tfbt.world().interactables.find(i=>i.id==='velthia'));
        await p.evaluate(r=>window.__tfbt.qa.teleport(r.x+r.w/2,r.y+r.h+10),r);await faceCity(p,'up');
        await p.waitForFunction(()=>window.__tfbt.world()?.target==='velthia');await press(p,'Enter');await finishCityDialogue(p);
        await p.waitForFunction(()=>window.__tfbt.inputLayer()==='slice-end');
        check(`${tag}: actual C4-07 closing dialogue commits Chapter IV before ending`,(await state(p)).flags['chapter.4_complete']);
      }else{
        await p.evaluate(()=>window.__tfbt.qa.chapter4('complete'));
        await p.waitForFunction(()=>window.__tfbt.activeScenes().includes('WorldScene'));
        await p.waitForTimeout(350);await p.evaluate(()=>window.__tfbt.qa.openSliceEnd());await p.waitForFunction(()=>window.__tfbt.inputLayer()==='slice-end');
      }
      const before=await state(p);
      if(width===1920){
        await p.waitForFunction(()=>window.__tfbt.saveStatus().safe);await selectMenu(p,'save');await press(p,'Enter');await saveSlot(p,'slot2');
        check(`${tag}: completed Chapter IV legacy slot has no ending extension`,await p.evaluate(()=>!JSON.parse(localStorage.getItem('tfbt.save.v1.slot2')).data.ending));
        await press(p,'Escape');await selectMenu(p,'title');await press(p,'Enter');await p.waitForFunction(()=>window.__tfbt.activeScenes().includes('TitleScene'));
        await selectMenu(p,'continue');await press(p,'Enter');
      }else{
        check(`${tag}: Chapter IV card exposes an explicit continuation`,await p.evaluate(()=>window.__tfbt.sceneTexts('SliceEndScene').includes('Lanjutkan kisah')));
        await selectMenu(p,'explore');await press(p,'Enter');await p.waitForFunction(()=>window.__tfbt.inputLayer()==='world'&&!window.__tfbt.world()?.busy);
        await press(p,'Escape');await p.waitForFunction(()=>window.__tfbt.inputLayer()==='pause');await layout(p,`${tag} completed Chapter IV pause`);
        await selectMenu(p,'ending');await press(p,'Enter');
      }
      await waitStep(p,'era');
      check(`${tag}: Chapter IV continuation starts the modern era, with no World/HUD left`,await p.evaluate(()=>window.__tfbt.state().flags['chapter.4_complete']&&window.__tfbt.state().chapter==='MODERN'&&!window.__tfbt.activeScenes().some(s=>s==='WorldScene'||s==='HudScene')));
      await p.keyboard.down('Enter');await p.waitForTimeout(2300);await p.keyboard.down('Enter');check(`${tag}: held Enter cannot skip the opening`,(await ending(p)).step==='era');await p.keyboard.up('Enter');
      await p.waitForFunction(()=>window.__tfbt.ending()?.canAdvance);
      await p.evaluate(()=>{window.__endingResizeDuringFade=false;});
      await p.keyboard.press('Enter');await p.waitForFunction(()=>window.__tfbt.ending()?.changing);
      await p.setViewportSize({width:width-80,height:height-40});await waitStep(p,'walk');
      check(`${tag}: resizing during the beat fade commits the next beat without a softlock`,await p.evaluate(()=>window.__endingResizeDuringFade&&window.__tfbt.endingResources().textures===1));
      await p.setViewportSize({width,height});await p.waitForTimeout(1000);await shot(p,`${tag}_modern_opening`);await layout(p,`${tag} modern`);
      check(`${tag}: public scene contains no private module`,!(await ending(p)).privateContent);
      await press(p,'Enter');check(`${tag}: distant artefact needs approach`,(await ending(p)).step==='walk');
      await approachRelic(p);check(`${tag}: movement reaches the relic and respects bounds`,(await ending(p)).x>=398&&(await ending(p)).x<=418);
      await perf(p,`${tag}-modern`);
      await press(p,'Escape');await p.waitForFunction(()=>window.__tfbt.inputLayer()==='ending-pause');
      await selectMenu(p,'save');await press(p,'Enter');await p.waitForFunction(()=>window.__tfbt.inputLayer()==='save-load');check(`${tag}: modern save summary uses a localized chapter label`,await p.evaluate(()=>window.__tfbt.sceneTexts('SaveLoadScene').some(t=>t.startsWith('Interlude modern'))));await saveSlot(p,'slot1');
      check(`${tag}: manual modern save stores a safe checkpoint`,await p.evaluate(()=>JSON.parse(localStorage.getItem('tfbt.save.v1.slot1')).data.ending.step==='walk'));
      await press(p,'Escape');await press(p,'Escape');await reloadContinue(p);await waitStep(p,'walk');check(`${tag}: refresh continues modern, not Chapter IV`,(await state(p)).chapter==='MODERN');
      // Load the manual modern slot through the real Save/Load UI.
      await press(p,'Escape');await selectMenu(p,'save');await press(p,'Enter');await press(p,'ArrowRight');await selectMenu(p,'slot1');await press(p,'Enter');await press(p,'ArrowDown');await press(p,'Enter');await waitStep(p,'walk');
      check(`${tag}: loading modern manual slot routes directly to EndingScene`,!(await p.evaluate(()=>window.__tfbt.activeScenes().includes('WorldScene'))));
      await approachRelic(p);await advance(p,'artefact');
      await p.waitForFunction(()=>!!window.__tfbt.ending()?.dialogue);await shot(p,`${tag}_artefact`);
      const heldLine=(await ending(p)).dialogue.line,autoAtDialogue=await p.evaluate(()=>localStorage.getItem('tfbt.save.v1.auto'));
      await press(p,'Escape');await selectMenu(p,'settings');await press(p,'Enter');await p.waitForFunction(()=>window.__tfbt.inputLayer()==='settings');await press(p,'Escape');await press(p,'Escape');
      check(`${tag}: dialogue pause/settings preserves the same line and committed autosave`,(await ending(p)).dialogue.line===heldLine&&autoAtDialogue===await p.evaluate(()=>localStorage.getItem('tfbt.save.v1.auto')));

      const found=await finishDialogue(p);check(`${tag}: artefact dialogue is staged and interactive`,found.length===3);
      await advance(p,'archive');await p.waitForTimeout(1800);await shot(p,`${tag}_memory_archive`);await layout(p,`${tag} memory`);
      check(`${tag}: artefact outcome committed only after interaction`,(await state(p)).flags['modern.artefact_discovered']);
      check(`${tag}: muted memory SFX is suppressed`,await p.evaluate(()=>window.__tfbt.audio().totalPlayed===0&&window.__tfbt.audio().suppressed.SFX_ECHO_MEMORY?.muted>=1));
      await reloadContinue(p);await waitStep(p,'archive');check(`${tag}: memory fragment reload resumes the same beat`,(await state(p)).ending.step==='archive');
      await advance(p,'heirloom');await advance(p,'heart');await p.waitForTimeout(1900);await shot(p,`${tag}_memory_heart`);
      await advance(p,'awakening');const awakened=await finishDialogue(p);check(`${tag}: awakening uses three concise lines`,awakened.length===3&&awakened.some(l=>l.text.includes('hidup kita sekarang')));
      await advance(p,'remember');check(`${tag}: public story bypasses unavailable personal photos`,(await state(p)).flags['modern.memory_awakened']&&(await state(p)).flags['modern.complete']);
      await p.waitForTimeout(2400);await shot(p,`${tag}_aveloria_memory_frame`);await layout(p,`${tag} memory framing`);
      await advance(p,'cliff-arrival');await p.waitForTimeout(2450);await shot(p,`${tag}_cliff_epilogue`);const arrival=await finishDialogue(p);
      check(`${tag}: E-01 source dialogue, including the direction joke`,arrival.map(l=>l.line).join(',')==='E-01-L001,E-01-L002,E-01-L003,E-01-L004');
      await advance(p,'promise');const promise=await finishDialogue(p);check(`${tag}: all eight E-02 promise lines play`,promise.length===8&&promise.some(l=>l.text==='Kalau ingatan kita hilang, ya... kita kenalan lagi.'));
      await advance(p,'cloud-path');await advance(p,'cloud-heart');await advance(p,'silhouettes');await p.waitForTimeout(3300);await shot(p,`${tag}_silhouettes`);await perf(p,`${tag}-silhouettes`);
      check(`${tag}: cloud montage completes the epilogue before the title`,(await state(p)).flags['ending.promise']&&!(await state(p)).flags['ending.epilogue_complete']);
      await advance(p,'continued');await p.waitForTimeout(3100);await shot(p,`${tag}_to_be_continued`);await layout(p,`${tag} final card`);
      await advance(p,'credits');await p.waitForTimeout(1900);await shot(p,`${tag}_credits`);await layout(p,`${tag} credits`);
      if(width===1366){await advance(p,'credits');await p.waitForTimeout(1900);await layout(p,`${tag} credits contributors`);await advance(p,'credits');await p.waitForTimeout(1900);await layout(p,`${tag} credits licenses`);await advance(p,'complete');}
      else {await press(p,'Escape');await waitStep(p,'complete');check(`${tag}: credits skip safely commits completion`,(await state(p)).flags['ending.credits']);}
      const done=await state(p);
      check(`${tag}: completion, epilogue and credits persist`,done.flags['game.complete']&&done.flags['ending.epilogue_complete']&&done.storyBeat==='GAME-DONE');
      check(`${tag}: ending grants no duplicated items or rewards`,JSON.stringify(done.items)===JSON.stringify(before.items)&&JSON.stringify(done.rpg)===JSON.stringify(before.rpg));
      check(`${tag}: public ending shows no anniversary placeholder`,!(JSON.stringify(await ending(p)).includes('PESAN ANNIVERSARY')));
      await reloadContinue(p);await waitStep(p,'complete');check(`${tag}: completed Continue does not replay scenes`,(await ending(p)).step==='complete');await p.waitForFunction(()=>window.__tfbt.ending()?.canAdvance);await press(p,'Enter');
      await p.waitForFunction(()=>window.__tfbt.activeScenes().includes('TitleScene'));
      await p.evaluate(()=>window.__tfbt.qa.titleStorageNotice());await layout(p,`${tag} completed Title storage notice`);
      await selectMenu(p,'replay');const stored=await p.evaluate(()=>JSON.stringify({...localStorage}));const mainState=JSON.stringify(await state(p));await press(p,'Enter');await waitStep(p,'era');await advance(p,'walk');
      check(`${tag}: explicit replay does not write saves or change main game state`,stored===await p.evaluate(()=>JSON.stringify({...localStorage}))&&mainState===JSON.stringify(await state(p)));
      await press(p,'Escape');await selectMenu(p,'settings');await press(p,'Enter');await p.waitForFunction(()=>window.__tfbt.inputLayer()==='settings');await layout(p,`${tag} ending settings`);await press(p,'Escape');await press(p,'Escape');
      check(`${tag}: settings returns to the same replay beat`,(await ending(p)).step==='walk'&&!(await ending(p)).paused);
      // Change actual display setting through its menu and ensure ending is reconstructed.
      await press(p,'Escape');await selectMenu(p,'settings');await press(p,'Enter');
      await press(p,'ArrowDown',6);await p.waitForFunction(()=>window.__tfbt.focus()==='settings:scale');await press(p,'ArrowRight');await press(p,'Escape');await press(p,'Escape');await p.waitForTimeout(450);await layout(p,`${tag} pixel perfect`);await shot(p,`${tag}_pixel_perfect`);
      check(`${tag}: mute and reduced flashes remain respected`,await p.evaluate(()=>window.__tfbt.settings().mute_all&&window.__tfbt.settings().reduced_flashes));
      await press(p,'Escape');await selectMenu(p,'title');await press(p,'Enter');await p.waitForFunction(()=>window.__tfbt.activeScenes().includes('TitleScene'));check(`${tag}: pause exit releases ending input`,await p.evaluate(()=>window.__tfbt.inputLayer()==='title'));
      await selectMenu(p,'replay');await press(p,'Enter');await waitStep(p,'era');
      for(const [w,h] of [[1200,800],[800,1200]]){
        const frame=await p.evaluate(([w,h])=>window.__tfbt.qa.personalFrame({id:'qa-only',caption:'W'.repeat(220),image:'images/qa-only.png',durationMs:60000,transition:'pan',note:'W'.repeat(180),date:'W'.repeat(48),group:'W'.repeat(80)},{width:w,height:h}),[w,h]);
        check(`${tag}: ${w}x${h} synthetic photo retains aspect and stays inside the canvas`,Math.abs(frame.photo.width/frame.photo.height-w/h)<0.001&&frame.photo.x>=0&&frame.photo.y>=0&&frame.photo.x+frame.photo.width<=frame.canvas.w&&frame.photo.y+frame.photo.height<=frame.canvas.h);
        await layout(p,`${tag} synthetic ${w}x${h} max captions`);await shot(p,`${tag}_qa_frame_${w}x${h}`);
      }
      await p.evaluate(()=>window.__tfbt.qa.personalFrame({id:'qa-only',caption:'QA',image:'images/qa-only.png',durationMs:6000,transition:'hold'},{width:100,height:100},{paragraphs:['W'.repeat(450)],signature:'W'.repeat(80)}));
      await layout(p,`${tag} synthetic maximum private message`);await shot(p,`${tag}_qa_message_layout`);

    }catch(e){check(`${tag}: scenario exception`,false,e.stack);await shot(p,`${tag}_failure`).catch(()=>{});console.log(JSON.stringify(await ending(p)));}
    await context.close();
  }
}finally{await browser.close();}
check('No fatal JS errors',!errors.length,errors.join('\n'));check('No failed asset requests',!requests.length,requests.join('\n'));
writeFileSync(resolve(out,'phase9-results.json'),JSON.stringify({results,errors,requests,metrics},null,2));
console.log(`${results.filter(r=>r.ok).length}/${results.length} Phase 9 checks passed`);if(results.some(r=>!r.ok))process.exitCode=1;
