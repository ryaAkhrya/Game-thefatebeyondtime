import {
  C1_01_EXAMINE_GROUND,
  C1_01_EXAMINE_SWORD,
  C1_01_INTRO,
  C1_01_JOURNAL,
  C1_02_MEET,
  C1_02_REPEAT,
  C1_03_CHEST_EMPTY,
  C1_03_CHEST_OPEN,
  C1_03_SIGN_FIRST,
  C1_03_SIGN_REPEAT,
} from '../dialogue/chapter1';
import type { DialogueScript } from '../dialogue/types';
import type { GameState } from '../systems/GameState';
import { FIRST_HOLLOWLING_FLAG } from '../combat/BattleSession';
import { FIRST_HOLLOWLING_INTRO, FIRST_HOLLOWLING_VICTORY } from '../dialogue/firstHollowling';
import { AVELORIA_SIGN, BEFORE_MOURNFANG, MOURNFANG_INTRO, MOURNFANG_RESPONSE, MOURNFANG_VICTORY } from '../dialogue/mournfang';
import { BOSS_CHECKPOINT_FLAG, MOURNFANG_FLAG, MOURNFANG_VICTORY_SEEN, SLICE_COMPLETE, type EncounterId } from '../combat/encounters';
import { AveloriaStory } from './AveloriaStory';
import { Chapter2Story } from './Chapter2Story';
import { Chapter3Story } from './Chapter3Story';
import type { AreaId } from '../data/ids';

/** Flag cerita kanonik (docs/narrative/STORY_AND_SCENES.md). Dinaikkan hanya setelah event benar-benar selesai. */
export const FLAG = {
  awake: 'story.c1_awake',
  nambo: 'story.c1_nambo',
  loop: 'story.c1_loop',
  // progres internal (bukan flag cerita)
  introSeen: 'c1.intro_seen',
  examinedGround: 'c1.examined_ground',
  examinedSword: 'c1.examined_sword',
  signRead: 'c1.sign_read',
  loopNoticed: 'c1.loop_noticed',
  demoEnd: 'c1.demo_end',
  chestReward: 'reward.c1_chest_potion.claimed',
  hollowling: FIRST_HOLLOWLING_FLAG,
  victorySeen: 'c1.hollowling_victory_seen',
  mournfang: MOURNFANG_FLAG,
  mournfangVictorySeen: MOURNFANG_VICTORY_SEEN,
  bossCheckpoint: BOSS_CHECKPOINT_FLAG,
  sliceComplete: SLICE_COMPLETE,
} as const;

export const ITEM_POTION = 'potion';

/** Hasil keputusan story: urutan aksi yang dieksekusi WorldScene SECARA BERURUTAN (await dialog sebelum commit flag). */
export type StoryAction =
  | { type: 'dialogue'; script: DialogueScript }
  | { type: 'setFlag'; flag: string }
  | { type: 'objective' }
  | { type: 'toast'; text: string }
  | { type: 'giveItem'; item: string; count: number }
  | { type: 'npc'; id: 'nambo'; op: 'face_player' | 'step_aside' }
  | { type: 'openThicket' }
  | { type: 'openChest' }
  | { type: 'battle'; encounter?: EncounterId }
  | { type: 'forestEdge' }
  | { type: 'rest' }
  | { type: 'mournfangApproach' }
  | { type: 'sliceEnd' }
  | { type: 'cityStage'; stage: 'vista' | 'vistaEnd' | 'gate' | 'gateOpen' | 'archive' | 'audience' | 'audienceEnd' | 'evening' }
  | { type: 'cityBell'; number: 1 | 2 }
  | { type: 'chapterEnd' }
  | { type: 'shop' }
  | { type: 'changeArea'; area: Extract<AreaId, 'aveloria' | 'liora' | 'forest_2' | 'temple'> }
  | { type: 'joinTorvan' }
  | { type: 'restParty' }
  | { type: 'chapter2End' }
  // ---- Chapter III (Phase 7) ----
  /** Aksi view area generik (krisis Aveloria, Kuil Jejak); lihat world/AreaView3.ts. */
  | { type: 'c3'; op: string; arg?: string | number }
  /** Party aktif jadi Yaric + Velthia; Torvan jadi cadangan (progres tersimpan). */
  | { type: 'joinVelthia' }
  | { type: 'chapter3End' };

export interface StoryContext {
  /** Salinan periodik (0 = pertama) untuk papan/semak/peti. */
  copy?: number;
  /** Berapa kali pemain tergeser balik oleh pengulangan lorong. */
  wrapCount: number;
}

// Teks sistem (DRAFT_IMPL): petunjuk UI, bukan kalimat cerita. Ditandai di docs/production/PHASE1_REPORT.md.
export const TEXT = {
  gateHint: 'Periksa sekitar tempatmu bangun dulu.',
  thicketBlocked: 'Semak berduri menghalangi jalan setapak.',
  thicketOpened: 'Ada celah di semak sebelah utara.',
} as const;

/**
 * Keputusan cerita C1-01..C1-03 berbasis flag di GameState. MURNI (tanpa Phaser) sehingga idempotensi,
 * urutan, dan ketiadaan softlock dapat diuji. Tidak mengubah GameState sendiri: perubahan terjadi lewat
 * StoryAction.setFlag/giveItem yang dijalankan setelah dialog selesai.
 */
export class Chapter1Story {
  constructor(private readonly state: GameState) {}

  private has(flag: string): boolean {
    return this.state.hasFlag(flag);
  }

  get awake(): boolean {
    return this.has(FLAG.awake);
  }
  get namboDone(): boolean {
    return this.has(FLAG.nambo);
  }
  get loopNoticed(): boolean {
    return this.has(FLAG.loopNoticed);
  }
  get loopDone(): boolean {
    return this.has(FLAG.loop);
  }
  get examinedCount(): number {
    return (this.has(FLAG.examinedGround) ? 1 : 0) + (this.has(FLAG.examinedSword) ? 1 : 0);
  }

  /** Teks tujuan di HUD, diturunkan dari flag (selalu konsisten dengan state). */
  objective(): string | null {
    if (this.state.snapshot()?.chapter === 'III') return new Chapter3Story(this.state).objective();
    if (this.state.snapshot()?.chapter === 'II') return new Chapter2Story(this.state).objective();
    if (this.state.snapshot()?.area === 'aveloria') return new AveloriaStory(this.state).objective();
    if (!this.has(FLAG.introSeen)) return null;
    if (!this.awake) return `Periksa sekitar (${this.examinedCount}/2)`;
    if (!this.namboDone) return 'Cari jalan keluar dari hutan.';
    if (this.has(FLAG.sliceComplete)) return 'Bersambung di Aveloria.';
    if (this.has(FLAG.mournfang)) return 'Lanjutkan ke arah Aveloria.';
    if (this.state.snapshot()?.area === 'forest_edge') return 'Ikuti jejak jalan ke timur.';
    if (this.has(FLAG.hollowling)) return 'Lanjutkan lewat ujung jalan utara.';
    return 'Ikuti jalan sampai gerbang batu.';
  }

  /** Aksi saat game dimulai: intro C1-01 sekali. */
  onStart(): StoryAction[] {
    if (this.state.snapshot()?.chapter === 'III') return new Chapter3Story(this.state).onStart();
    if (this.state.snapshot()?.chapter === 'II') return new Chapter2Story(this.state).onStart();
    if (this.state.snapshot()?.area === 'aveloria') return new AveloriaStory(this.state).onStart();
    if (this.has(FLAG.mournfang) && !this.has(FLAG.mournfangVictorySeen)) return [
      { type: 'dialogue', script: MOURNFANG_VICTORY },
      { type: 'setFlag', flag: FLAG.mournfangVictorySeen }, { type: 'objective' },
    ];
    if (this.has(FLAG.hollowling) && !this.has(FLAG.victorySeen)) return [
      { type: 'dialogue', script: FIRST_HOLLOWLING_VICTORY },
      { type: 'setFlag', flag: FLAG.victorySeen },
      { type: 'objective' },
    ];
    if (this.has(FLAG.introSeen)) return [];
    return [
      { type: 'dialogue', script: C1_01_INTRO },
      { type: 'setFlag', flag: FLAG.introSeen },
      { type: 'objective' },
    ];
  }

  interact(id: string, ctx: StoryContext): StoryAction[] {
    if (this.state.snapshot()?.chapter === 'III') return new Chapter3Story(this.state).interact(id);
    if (this.state.snapshot()?.chapter === 'II') return new Chapter2Story(this.state).interact(id);
    if (this.state.snapshot()?.area === 'aveloria') return new AveloriaStory(this.state).interact(id);
    const base = id.split('#')[0]!;
    switch (base) {
      case 'forest_exit':
        return this.has(FLAG.hollowling) && this.has(FLAG.victorySeen) ? [{ type: 'forestEdge' }] : [];
      case 'rest':
        return this.state.snapshot()?.area === 'forest_edge' && this.has(FLAG.hollowling)
          ? [{ type: 'rest' }, { type: 'toast', text: 'HP dan MP pulih.' }] : [];
      case 'aveloria_sign':
        return [{ type: 'dialogue', script: AVELORIA_SIGN }];
      case 'slice_exit':
        return this.has(FLAG.mournfang) && this.has(FLAG.mournfangVictorySeen)
          ? [{ type: 'setFlag', flag: FLAG.sliceComplete }, { type: 'objective' }, { type: 'sliceEnd' }] : [];
      case 'ground_tracks':
        return this.examine(C1_01_EXAMINE_GROUND, FLAG.examinedGround, FLAG.examinedSword);
      case 'sword':
        return this.examine(C1_01_EXAMINE_SWORD, FLAG.examinedSword, FLAG.examinedGround);
      case 'nambo':
        if (!this.awake) return [];
        return this.namboDone ? [{ type: 'dialogue', script: C1_02_REPEAT }] : this.meetNambo();
      case 'sign':
        return this.readSign(ctx);
      case 'thicket':
        return this.loopNoticed ? [] : [{ type: 'toast', text: TEXT.thicketBlocked }];
      case 'chest':
        if (!this.has(FLAG.loopNoticed)) return [];
        if (this.has(FLAG.chestReward)) return [{ type: 'dialogue', script: C1_03_CHEST_EMPTY }];
        return [
          { type: 'openChest' },
          { type: 'giveItem', item: ITEM_POTION, count: 1 }, // idempoten lewat flag reward
          { type: 'dialogue', script: C1_03_CHEST_OPEN },
        ];
      default:
        return [];
    }
  }

  trigger(id: string, _ctx: StoryContext): StoryAction[] {
    if (this.state.snapshot()?.chapter === 'III') return new Chapter3Story(this.state).trigger(id);
    if (this.state.snapshot()?.chapter === 'II') return new Chapter2Story(this.state).trigger(id);
    if (this.state.snapshot()?.area === 'aveloria') return new AveloriaStory(this.state).trigger(id);
    const base = id.split('#')[0]!;
    switch (base) {
      case 'boss_checkpoint':
        return this.has(FLAG.hollowling) && !this.has(FLAG.bossCheckpoint) ? [
          { type: 'dialogue', script: BEFORE_MOURNFANG }, { type: 'rest' }, { type: 'toast', text: 'HP dan MP pulih.' },
        ] : [];
      case 'mournfang':
        return this.state.snapshot()?.area === 'forest_edge' && this.has(FLAG.hollowling) && !this.has(FLAG.mournfang) ? [
          { type: 'dialogue', script: MOURNFANG_INTRO }, { type: 'mournfangApproach' },
          { type: 'dialogue', script: MOURNFANG_RESPONSE }, { type: 'battle', encounter: 'mournfang' },
        ] : [];
      case 'gate_hint':
        return this.awake ? [] : [{ type: 'toast', text: TEXT.gateHint }];
      case 'nambo_zone':
        return this.awake && !this.namboDone ? this.meetNambo() : [];
      case 'trail_enter':
        return this.loopNoticed && !this.loopDone ? [{ type: 'setFlag', flag: FLAG.loop }, { type: 'objective' }] : [];
      case 'demo_end':
        return this.loopDone && this.namboDone && !this.has(FLAG.hollowling)
          ? [{ type: 'dialogue', script: FIRST_HOLLOWLING_INTRO }, { type: 'battle' }] : [];
      default:
        return [];
    }
  }

  private examine(script: DialogueScript, flag: string, otherFlag: string): StoryAction[] {
    const actions: StoryAction[] = [{ type: 'dialogue', script }];
    const firstTime = !this.has(flag);
    if (firstTime) actions.push({ type: 'setFlag', flag }, { type: 'objective' });
    // C1-01 selesai bila kedua objek sudah diperiksa
    if (!this.awake && this.has(otherFlag) && firstTime) {
      actions.push({ type: 'dialogue', script: C1_01_JOURNAL }, { type: 'setFlag', flag: FLAG.awake }, { type: 'objective' });
    }
    return actions;
  }

  private meetNambo(): StoryAction[] {
    return [
      { type: 'npc', id: 'nambo', op: 'face_player' },
      { type: 'dialogue', script: C1_02_MEET },
      { type: 'setFlag', flag: FLAG.nambo },
      { type: 'npc', id: 'nambo', op: 'step_aside' },
      { type: 'objective' },
    ];
  }

  private readSign(ctx: StoryContext): StoryAction[] {
    // Setelah pengulangan disadari, papan hanya dibaca ulang.
    if (this.loopNoticed) return [{ type: 'dialogue', script: C1_03_SIGN_FIRST }];

    const actions: StoryAction[] = [];
    const signAlreadyRead = this.has(FLAG.signRead);
    if (!signAlreadyRead) actions.push({ type: 'dialogue', script: C1_03_SIGN_FIRST }, { type: 'setFlag', flag: FLAG.signRead });

    // "Papan yang tadi?": salinan periodik berikutnya (copy > 0) atau setelah tergeser balik oleh pengulangan lorong.
    const isRepeat = (ctx.copy ?? 0) > 0 || ctx.wrapCount > 0;
    if (isRepeat) {
      actions.push(
        { type: 'dialogue', script: C1_03_SIGN_REPEAT },
        { type: 'setFlag', flag: FLAG.loopNoticed },
        { type: 'openThicket' },
        { type: 'toast', text: TEXT.thicketOpened },
      );
    } else if (signAlreadyRead) {
      actions.push({ type: 'dialogue', script: C1_03_SIGN_FIRST });
    }
    return actions;
  }
}
