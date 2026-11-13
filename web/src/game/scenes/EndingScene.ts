import Phaser from 'phaser';
import privateContent from 'virtual:ending-content';
import { DialogueBox } from '../../ui/components/DialogueBox';
import { MenuList } from '../../ui/components/MenuList';
import { Ui, TYPE, bindRelayout } from '../../ui/kit/ui';
import { COLORS } from '../config/palette';
import { SCENE_KEYS } from '../data/ids';
import { getServices, type Services } from '../systems/Services';
import { CinematicSequencer } from '../ending/CinematicSequencer';
import { ENDING_DIRECTION, CREDITS, PUBLIC_ECHO_FRAGMENTS, ENDING_NARRATION, ARTEFACT_SCRIPT, AWAKENING_SCRIPT, epilogueScript } from '../ending/direction';
import { ENDING_STEPS, endingCheckpoint, type EndingStep } from '../ending/progress';
import { EndingArt } from '../ending/EndingArt';
import { drawPersonalMemory, drawAnniversaryMessage } from '../ending/PersonalMemoryFrame';
import type { PersonalMemory, AnniversaryContent } from '../ending/memorySchema';

/** Modern era → Aveloria memory → credits. The save is always the start of a committed beat. */
export class EndingScene extends Phaser.Scene {
  private services!: Services;
  private ui!: Ui;
  private art?: EndingArt;
  private dialogue!: DialogueBox;
  private sequence!: CinematicSequencer<ReturnType<typeof this.beat>>;
  private step: EndingStep = 'era';
  private memoryIndex = 0;
  private creditIndex = 0;
  private messageIndex = 0;
  private playerX = 230;
  private releaseInput?: () => void;
  private releasePause?: () => void;
  private paused = false;
  private leaving = false;
  private changing = false;
  private pendingStep: EndingStep | null = null;
  private dialogueStarted = false;
  private dialogueFinished = false;
  private fade!: Phaser.GameObjects.Rectangle;
  private hint!: Phaser.GameObjects.Text;
  private revealObjects: Phaser.GameObjects.Components.Alpha[] = [];
  private pauseObjects: Phaser.GameObjects.GameObject[] = [];
  private pauseMenu?: MenuList;
  private status!: Phaser.GameObjects.Text;
  private replay = false;
  private photo?: Phaser.GameObjects.Image;
  private loadingMemory: number | null = null;

  constructor() { super(SCENE_KEYS.Ending); }
  init(data: { replay?: boolean }): void {
    this.replay = !!data.replay; this.step = 'era'; this.memoryIndex = 0; this.creditIndex = 0; this.messageIndex = 0;
    this.playerX = 230; this.leaving = false; this.paused = false; this.changing = false; this.pendingStep = null;
    this.loadingMemory = null;
    this.releaseInput = undefined; this.releasePause = undefined; this.pauseObjects = []; this.art = undefined;
  }
  create(): void {
    this.services = getServices(this); this.ui = new Ui(this);
    const d = this.services.gameState.snapshot();
    if (!d?.flags['chapter.4_complete']) { this.services.router.arrive(this); this.services.router.goto(this, SCENE_KEYS.Title); return; }
    if (!this.replay && d.ending) { this.step = d.ending.step; this.memoryIndex = d.ending.memoryIndex; }
    // A public build can safely resume a private checkpoint without loading any private module or media.
    if (this.step === 'memories' && (!privateContent || this.memoryIndex >= privateContent.memories.length)) { this.step = 'remember'; this.memoryIndex = 0; }
    if (this.step === 'message' && !privateContent) this.step = 'complete';
    this.services.audio.stopBgm(); this.services.router.arrive(this);
    this.dialogue = new DialogueBox(this, this.services, { silent: true, onBack: () => this.openPause() });
    this.enter(this.step);
    this.releaseInput = this.services.input.pushLayer('ending', e => {
      if (this.changing || this.leaving) return;
      if (e.intent === 'back') { if (this.step === 'credits') this.finishCredits(); else this.openPause(); return; }
      if (e.intent === 'confirm' && !e.repeat && this.sequence.canAdvance && this.loadingMemory === null) {
        if (this.step === 'walk') { if (this.playerX >= 398) this.advance(); }
        else if (!this.hasDialogue() || this.dialogueFinished) this.advance();
      }
    });
    bindRelayout(this, () => {
      // Shared relayout kills tweens before rebuilding. Commit a pending fade at
      // this safe boundary so resizing/fullscreen cannot strand changing=true.
      if (this.pendingStep) { this.enter(this.pendingStep); return; }
      this.art?.destroy(); this.dialogue.build(); this.build(); if (this.paused) this.buildPause();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.leaving = true; this.releasePause?.(); this.releaseInput?.(); this.art?.destroy();
      this.services.checkpoints.setSafe(false); this.services.audio.stopBgm();
      privateContent?.memories.forEach((_m, i) => { if (this.textures.exists(`ending-private-${i}`)) this.textures.remove(`ending-private-${i}`); });
    });
  }
  private beat() {
    const memory = privateContent?.memories[this.memoryIndex];
    const base = ENDING_DIRECTION[this.step];
    return this.step === 'memories' && memory ? { ...base, minMs: Math.max(2000, Math.round(memory.durationMs * 0.65)), autoMs: memory.durationMs, transition: memory.transition }
      : { ...base, transition: 'fade' as const };
  }
  private enter(step: EndingStep): void {
    this.step = step; this.changing = false; this.pendingStep = null; this.dialogueStarted = false; this.dialogueFinished = false;
    this.loadingMemory = null;
    this.sequence = new CinematicSequencer([this.beat()]);
    if (!this.replay) {
      this.services.gameState.load(endingCheckpoint(this.services.gameState.snapshot()!, step, step === 'memories' ? this.memoryIndex : 0));
      this.services.checkpoints.setSafe(true); this.services.checkpoints.requestAutosave(); this.services.checkpoints.flush(); this.services.checkpoints.setSafe(false);
    }
    this.children.removeAll(true); this.art?.destroy(); this.dialogue.build(); this.build();
    if (step === 'memories') this.loadPhoto();
    if (step === 'archive') this.services.audio.playSfx('SFX_ECHO_MEMORY', { volume: 0.28, rate: 0.8 });
    if (step === 'walk' || step === 'remember' || step === 'credits') {
      this.services.audio.stopBgm();
      this.services.audio.playBgm(step === 'walk' ? 'BGM_MODERN' : step === 'remember' ? 'BGM_EPILOGUE' : 'BGM_CREDITS');
    }
    if (step === 'message' || step === 'complete') this.services.audio.stopBgm();
  }
  private build(): void {
    const ui=this.ui; this.revealObjects=[]; this.photo=undefined; this.cameras.main.setBackgroundColor('#17131f'); this.art=new EndingArt(this);
    const title=(y: number, value: string, size: number=TYPE.display, color: number=COLORS.paper): Phaser.GameObjects.Text => {
      const t=ui.text(ui.dw/2,y,value,{family:'display',size,originX:0.5,align:'center',color,depth:10});this.revealObjects.push(t);return t;
    };
    if(this.step==='era') { title(225,ENDING_NARRATION.era.text,24);ui.motif(ui.dw/2,286,100,12,10); }
    if(this.step==='archive'||this.step==='heirloom'||this.step==='heart') {
      const t=ui.text(ui.dw/2,440,PUBLIC_ECHO_FRAGMENTS[this.step].caption,{size:TYPE.dialogue,originX:0.5,depth:10});this.revealObjects.push(t);
    }
    if(this.step==='remember'){title(85,'Aveloria',20);const t=ui.text(ui.dw/2,121,ENDING_NARRATION.remember.text,{size:TYPE.body,originX:0.5,depth:10});this.revealObjects.push(t);}
    if(this.step==='continued'){const t=title(244,'To Be Continued',27);t.setLetterSpacing(ui.u(3));ui.motif(ui.dw/2,305,100,12,10);}
    if(this.step==='credits') {
      const page=CREDITS[this.creditIndex]!;title(121,page.heading,27,COLORS.bitterLime);if(page.subheading)title(164,page.subheading,15);
      page.lines.forEach((line,i)=>{const t=ui.text(ui.dw/2,241+i*37,line,{size:i===0?TYPE.small:TYPE.heading,originX:0.5,depth:10,align:'center',width:700});this.revealObjects.push(t);});
    }
    if(this.step==='memories' && privateContent){
      const frame=drawPersonalMemory(ui,privateContent.memories[this.memoryIndex]!,`ending-private-${this.memoryIndex}`);
      this.revealObjects.push(...frame.objects);this.photo=frame.photo;
    }
    if(this.step==='message' && privateContent){
      title(92,'P.S.',23,COLORS.bitterLime);
      this.revealObjects.push(...drawAnniversaryMessage(ui,privateContent.message,this.messageIndex));
    }
    if(this.step==='complete'){title(192,'THE FATE',28);title(237,'BEYOND TIME',17,COLORS.bitterLime);}
    this.hint=ui.text(ui.dw/2,505,'',{size:TYPE.small,originX:0.5,color:COLORS.paperDim,depth:20});
    this.status=ui.text(ui.dw/2,477,'',{size:TYPE.small,originX:0.5,color:COLORS.warn,depth:20});
    this.fade=ui.rect(0,0,ui.dw,ui.dh,COLORS.night,1,200);
  }
  private loadPhoto(): void {
    if (!privateContent) return;
    const index=this.memoryIndex, memory=privateContent.memories[index];
    if (!memory) return;
    const key=`ending-private-${index}`;
    // Keep one full-resolution photograph resident; no eager gallery download.
    privateContent.memories.forEach((_m,i)=>{if(i!==index&&this.textures.exists(`ending-private-${i}`))this.textures.remove(`ending-private-${i}`);});
    if (this.textures.exists(key)) return;
    this.loadingMemory = index;
    const failed = (file: Phaser.Loader.File): void => {
      if (file.key !== key) return;
      this.load.off('loaderror', failed);
      if (!this.leaving && this.step === 'memories' && this.memoryIndex === index) {
        this.loadingMemory = null; this.sequence = new CinematicSequencer([this.beat()]);
        console.warn('[ending] Private image unavailable; continuing with the supplied caption.');
      }
    };
    this.load.on('loaderror', failed);
    this.load.once(`filecomplete-image-${key}`,()=>{
      this.load.off('loaderror', failed);
      if (this.leaving) { if(this.textures.exists(key))this.textures.remove(key);return; }
      if(this.step==='memories'&&this.memoryIndex===index){this.loadingMemory=null;this.sequence=new CinematicSequencer([this.beat()]);this.children.removeAll(true);this.art?.destroy();this.dialogue.build();this.build();if(this.paused)this.buildPause();}
    });
    this.load.image(key,memory.image);this.load.start();
  }
  private hasDialogue(): boolean { return ['artefact','awakening','cliff-arrival','promise'].includes(this.step); }
  private advance(): void {
    if(this.changing||this.leaving||!this.sequence.canAdvance||this.loadingMemory!==null)return;
    if(this.step==='complete'){this.leave();return;}
    if(this.step==='credits'){
      if(this.creditIndex+1<CREDITS.length){this.creditIndex++;this.change('credits');return;}
      this.finishCredits();return;
    }
    if(this.step==='message'&&privateContent&&this.messageIndex+1<privateContent.message.paragraphs.length){this.messageIndex++;this.change('message');return;}
    if(this.step==='memories'&&privateContent&&this.memoryIndex+1<privateContent.memories.length){this.memoryIndex++;this.change('memories');return;}
    let next=ENDING_STEPS[ENDING_STEPS.indexOf(this.step)+1]!;
    if(next==='memories'&&(!privateContent||privateContent.memories.length===0))next='remember';
    if(next==='message'&&!privateContent)next='complete';
    this.change(next);
  }
  private finishCredits(): void { if(this.sequence.canAdvance&&!this.changing)this.change(privateContent?'message':'complete'); }
  private change(next: EndingStep): void {
    this.changing=true;this.pendingStep=next;this.services.checkpoints.setSafe(false);
    this.tweens.add({targets:this.fade,alpha:1,duration:450,onComplete:()=>{if(!this.leaving&&this.pendingStep===next)this.enter(next);}});
  }
  private leave(): void {this.leaving=true;this.services.router.goto(this,SCENE_KEYS.Title);}
  private openPause(): void {
    if(this.paused||this.changing||this.leaving)return;
    this.paused=true;this.services.checkpoints.setSafe(!this.replay);this.buildPause();
    this.releasePause=this.services.input.pushLayer('ending-pause',e=>{if(e.intent==='back')this.closePause();else this.pauseMenu?.handleIntent(e);});
  }
  private buildPause(): void {
    const before=new Set(this.children.list),ui=this.ui;
    ui.rect(0,0,ui.dw,ui.dh,COLORS.night,0.96,300);ui.text(ui.dw/2,131,'JEDA',{family:'display',size:TYPE.display,originX:0.5,depth:301});
    ui.text(ui.dw/2,183,this.replay?'Putar ulang · data simpan tetap utuh':'Melanjutkan dari awal adegan yang tersimpan.',{size:TYPE.small,originX:0.5,depth:301});
    this.pauseMenu=new MenuList(this,{ui,x:ui.dw/2,y:232,width:260,rowHeight:39,align:'center',depth:302,items:[{id:'resume',label:'Lanjutkan'},{id:'save',label:'Simpan / Muat',disabled:this.replay},{id:'settings',label:'Pengaturan'},{id:'title',label:'Ke Judul'}],onConfirm:item=>{
      if(item.id==='resume')this.closePause();else if(item.id==='save')this.services.router.openOverlay(this,SCENE_KEYS.SaveLoad);else if(item.id==='settings')this.services.router.openOverlay(this,SCENE_KEYS.Settings);else this.leave();
    }});
    this.pauseObjects=this.children.list.filter(o=>!before.has(o));
  }
  private closePause(): void {this.releasePause?.();this.releasePause=undefined;this.pauseMenu?.destroy();this.pauseObjects.forEach(o=>o.destroy());this.pauseObjects=[];this.paused=false;this.services.checkpoints.setSafe(false);}
  override update(_time:number,delta:number):void {
    if(this.leaving||this.paused||!this.sequence||document.hidden)return;
    if (!this.replay) this.services.gameState.tick(delta/1000);
    const auto=this.sequence.update(delta),ms=this.sequence.time;
    let moving=false;
    if(this.step==='walk'&&!this.changing){const dir=this.services.input.getMoveDirection();if(dir==='left'||dir==='right'){const old=this.playerX;this.playerX=Phaser.Math.Clamp(this.playerX+(dir==='right'?1:-1)*Math.min(delta,50)*0.075,180,418);moving=old!==this.playerX;}}
    this.art?.render(this.step,ms,this.playerX,moving,this.services.settings.get('reduced_flashes'));
    if(!this.changing)this.fade.setAlpha(1-this.sequence.fade);
    const textAlpha=Math.min(1,Math.max(0,(ms-450)/700));this.revealObjects.forEach(o=>o.setAlpha(textAlpha));
    if(this.photo&&privateContent?.memories[this.memoryIndex]?.transition==='pan')this.photo.x=this.ui.u(this.ui.dw/2)+Math.round((Math.min(1,ms/privateContent.memories[this.memoryIndex]!.durationMs)-0.5)*this.ui.u(12));
    this.dialogue.update(delta);
    if(this.hasDialogue()&&!this.dialogueStarted&&ms>(this.step==='cliff-arrival'?2300:1300)&&!this.changing){
      this.dialogueStarted=true;
      const script=this.step==='artefact'?ARTEFACT_SCRIPT:this.step==='awakening'?AWAKENING_SCRIPT:epilogueScript(this.step==='promise'?'E-02':'E-01');
      void this.dialogue.play(script).then(()=>{if(!this.leaving)this.dialogueFinished=true;});
    }
    this.hint.setVisible(!this.dialogue.active&&!this.changing&&this.loadingMemory===null);
    this.hint.setText(this.step==='walk'?(this.playerX>=398?'Enter  periksa lambang      Esc  jeda':'←  →  berjalan      Esc  jeda'):this.step==='credits'?'Enter  lanjut      Esc  lewati kredit':this.step==='complete'?'Enter  kembali ke judul':this.sequence.canAdvance?'Enter  lanjut      Esc  jeda':'');
    if(!this.replay&&!this.services.saves.isAvailable)this.status.setText('Penyimpanan browser tidak tersedia.');
    else if(!this.replay&&this.services.checkpoints.lastMessage.startsWith('Gagal'))this.status.setText(this.services.checkpoints.lastMessage);
    if(auto&&!this.dialogue.active&&!this.changing&&this.loadingMemory===null)this.advance();
  }
  /** QA supplies synthetic pixels/text in its isolated context; this never loads local private data. */
  qaPersonalFrame(memory: PersonalMemory, size: { width: number; height: number }, message?: AnniversaryContent['message']): object {
    if (!this.replay) throw new Error('Layout QA requires a non-saving replay');
    this.paused=true; this.children.removeAll(true); this.art?.destroy();
    const key='ending-qa-frame'; if(this.textures.exists(key))this.textures.remove(key);
    const tex=this.textures.createCanvas(key,size.width,size.height)!;
    const c=tex.getContext();c.fillStyle='#47626a';c.fillRect(0,0,size.width,size.height);
    c.fillStyle='#e8d5b5';c.fillRect(0,0,20,20);c.fillRect(size.width-20,size.height-20,20,20);tex.refresh();
    if(message)drawAnniversaryMessage(this.ui,message,0);
    const frame=message?null:drawPersonalMemory(this.ui,memory,key);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{if(this.textures.exists(key))this.textures.remove(key);});
    return {photo:frame?.photo?.getBounds(),scale:frame?.photo?.scaleX,canvas:{w:this.ui.layout.pixelWidth,h:this.ui.layout.pixelHeight}};
  }
  debugState():object {return {step:this.step,time:this.sequence?.time,canAdvance:this.sequence?.canAdvance,memoryIndex:this.memoryIndex,creditIndex:this.creditIndex,messageIndex:this.messageIndex,x:this.playerX,paused:this.paused,changing:this.changing,replay:this.replay,dialogue:this.dialogue?.debug,privateContent:!!privateContent};}
}
