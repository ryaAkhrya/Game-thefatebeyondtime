import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ready } from './battle-helpers.mjs';
import { battleSpriteVisibility } from './visual-helpers.mjs';

const base=process.env.E2E_URL??'http://127.0.0.1:4210/';
const out=resolve(process.env.E2E_OUTPUT_DIR??'../.dev-cache/phase10-browser');
mkdirSync(out,{recursive:true});
const results=[],errors=[],requests=[];
const check=(name,ok,detail='')=>{results.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}${ok?'':' '+detail}`);};
const cast={C02:'C02_CITY_EXPLORE',C03:'C03_CH2_EXPLORE',C04:'C04_CITY_EXPLORE',C05:'C05_CITY_EXPLORE',C06:'C06_CITY_EXPLORE',C07:'C07_CH2_EXPLORE',C08:'C08_NAMBO_EXPLORE',C09:'C09_CITY_EXPLORE'};
const browser=await chromium.launch({channel:process.env.E2E_CHANNEL??'msedge',headless:true});
try{
  for(const [width,height] of [[1366,768],[1920,1080]]){
    const context=await browser.newContext({viewport:{width,height}});
    await context.addInitScript(()=>localStorage.setItem('tfbt.settings.v1',JSON.stringify({schema:'settings_v1',values:{text_speed:'instant',screen_shake:false,reduced_flashes:true,mute_all:true}})));
    const page=await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    page.on('response',r=>{if(r.status()>=400)requests.push(r.url());});
    await page.goto(base+'?qa=1');await page.waitForFunction(()=>window.__tfbt?.activeScenes().includes('TitleScene'));
    for(const [id,key] of Object.entries(cast)){
      const bounds=await page.evaluate(key=>Array.from({length:24},(_,i)=>window.__tfbt.frameBounds(key,i)),key);
      check(`${width}: ${id} new exploration frames load with grounded feet and clear cell edges`,bounds.every(b=>b.bottom===46&&b.top>=1&&b.left>=1&&b.right<=30),JSON.stringify(bounds));
    }
    const worldBoss=await page.evaluate(()=>window.__tfbt.frameBounds('B02_ENCOUNTER',0,64,64));
    check(`${width}: Veyrath has dedicated world-scale pixels and a stable floor`,worldBoss.bottom===62&&worldBoss.height>=50&&worldBoss.left>=1&&worldBoss.right<=62,JSON.stringify(worldBoss));
    await page.evaluate(()=>window.__tfbt.qa.forest1Late());
    await page.waitForFunction(()=>window.__tfbt.world()?.nambo&&!window.__tfbt.world()?.busy);
    await page.evaluate(()=>window.__tfbt.qa.teleport(270,458));await page.keyboard.press('ArrowRight');await page.waitForTimeout(900);
    check(`${width}: Nambo and the unchanged Yaric appear together at native scale`,await page.evaluate(()=>window.__tfbt.world()?.nambo?.x===352&&window.__tfbt.world()?.player?.displayHeight===48));
    await page.screenshot({path:resolve(out,`p10_${width}_nambo_yaric.png`)});
    await page.goto(base+'?qa=1');await page.waitForFunction(()=>window.__tfbt?.activeScenes().includes('TitleScene'));
    await page.evaluate(()=>window.__tfbt.qa.chapter1Complete());
    await page.waitForFunction(()=>window.__tfbt.state()?.chapter==='II'&&window.__tfbt.inputLayer()==='world');
    check(`${width}: Chapter I flows into II with no continuation card`,await page.evaluate(()=>window.__tfbt.state().flags['chapter.1_complete']&&window.__tfbt.state().flags['chapter.2_started']&&!window.__tfbt.sceneTexts('SliceEndScene').length));
    await page.waitForFunction(()=>window.__tfbt.world()?.city);await page.waitForTimeout(900);
    const vel=await page.evaluate(()=>window.__tfbt.world().city.npcs.velthia);
    await page.evaluate(([x,y])=>window.__tfbt.qa.teleport(x-90,y+40),[vel.x,vel.y]);await page.waitForTimeout(900);
    await page.screenshot({path:resolve(out,`p10_${width}_velthia.png`)});
    for(const encounter of ['duo_tutorial','veyrath','forest2_patrol']){
      await page.goto(base+'?qa=1');await page.waitForFunction(()=>window.__tfbt?.activeScenes().includes('TitleScene'));
      await page.evaluate(e=>window.__tfbt.qa.chapter2('duo',e),encounter);await ready(page);await page.waitForTimeout(700);
      const ids=encounter==='forest2_patrol'?['M02','M03']:encounter==='veyrath'?['C03','B02']:['C03','M02'];
      for(const id of ids){
        const visible=await battleSpriteVisibility(page,id);
        check(`${width}: ${id} new battle art is visible in ${encounter}`,visible.probe?.visible&&visible.probe.alpha>.9&&visible.ratio>=.08&&visible.meanDelta>=20,JSON.stringify(visible));
      }
      const issues=await page.evaluate(()=>window.__tfbt.layoutIssues());
      check(`${width}: ${encounter} remains inside the UI layout`,issues.length===0,issues.join(';'));
      await page.screenshot({path:resolve(out,`p10_${width}_${encounter}.png`)});
    }
    await page.goto(base+'?qa=1');await page.waitForFunction(()=>window.__tfbt?.activeScenes().includes('TitleScene'));
    await page.evaluate(()=>window.__tfbt.qa.chapter2('duo'));await page.waitForFunction(()=>window.__tfbt.activeScenes().includes('WorldScene')&&!window.__tfbt.battle()&&window.__tfbt.world()?.area==='forest_2');await page.waitForTimeout(800);
    await page.evaluate(()=>window.__tfbt.qa.teleport(980,370));await page.waitForTimeout(900);
    check(`${width}: map capture shows the visible Veyrath encounter in WorldScene`,await page.evaluate(()=>window.__tfbt.activeScenes().includes('WorldScene')&&!window.__tfbt.battle()&&window.__tfbt.world()?.chapter2?.veyrathVisible));
    await page.screenshot({path:resolve(out,`p10_${width}_veyrath_world.png`)});
    await page.goto(base+'?qa=1');await page.waitForFunction(()=>window.__tfbt?.activeScenes().includes('TitleScene'));
    await page.evaluate(()=>window.__tfbt.qa.chapter4('camp'));await page.waitForFunction(()=>window.__tfbt.activeScenes().includes('WorldScene')&&window.__tfbt.world()?.area==='aveloria');await page.waitForTimeout(900);
    await page.evaluate(()=>window.__tfbt.qa.teleport(640,1240));await page.waitForTimeout(1000);
    check(`${width}: aftermath camp renders in the actual world without a battle overlay`,await page.evaluate(()=>window.__tfbt.activeScenes().includes('WorldScene')&&!window.__tfbt.battle()&&window.__tfbt.world()?.area==='aveloria'));
    await page.screenshot({path:resolve(out,`p10_${width}_camp.png`)});
    for(const [fixture,args,chapter] of [['chapter3',['c2end'],'III'],['chapter4',['c3end'],'IV']]){
      await page.goto(base+'?qa=1');await page.waitForFunction(()=>window.__tfbt?.activeScenes().includes('TitleScene'));
      const before=await page.evaluate(([fixture,args])=>{window.__tfbt.qa[fixture](...args);return window.__tfbt.state();},[fixture,args]);
      await page.waitForFunction(chapter=>window.__tfbt.state().chapter===chapter,chapter);
      const after=await page.evaluate(()=>window.__tfbt.state());
      check(`${width}: ${chapter} starts automatically without changing rewards or party`,JSON.stringify(before.rpg)===JSON.stringify(after.rpg)&&JSON.stringify(before.items)===JSON.stringify(after.items)&&JSON.stringify(before.party)===JSON.stringify(after.party)&&!await page.evaluate(()=>window.__tfbt.sceneTexts('SliceEndScene').length));
    }
    await page.goto(base+'?qa=1');await page.waitForFunction(()=>window.__tfbt?.activeScenes().includes('TitleScene'));
    await page.evaluate(()=>window.__tfbt.qa.chapter4('complete'));
    await page.waitForFunction(()=>window.__tfbt.ending()?.step==='walk',null,{timeout:15000});
    check(`${width}: modern opening runs into the walk scene without pressing continue`,await page.evaluate(()=>window.__tfbt.state().chapter==='MODERN'&&!window.__tfbt.activeScenes().includes('WorldScene')&&!window.__tfbt.sceneTexts('EndingScene').some(t=>/Enter.*lanjut/.test(t))));
    await context.close();
  }
}catch(error){
  writeFileSync(resolve(out,'phase10-failure.json'),JSON.stringify({results,errors,requests,error:String(error)},null,2));
  if(errors.length)console.error('Browser errors:',errors);
  throw error;
}finally{await browser.close();}
check('No browser JS/console errors',errors.length===0,errors.join(';'));
check('No missing public assets',requests.length===0,requests.join(';'));
const passed=results.filter(r=>r.ok).length;
writeFileSync(resolve(out,'phase10-results.json'),JSON.stringify({passed,total:results.length,results},null,2));
console.log(`${passed}/${results.length} Phase 10 passed`);
process.exitCode=passed===results.length?0:1;
