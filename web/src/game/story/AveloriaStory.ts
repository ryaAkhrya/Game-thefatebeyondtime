import { BELL_FIRST, BELL_SECOND, CITIZEN_TEXT, CITY_ARCHIVE, CITY_AUDIENCE, CITY_GATE, CITY_VISTA, DERRRIA_GREETING, REPORTS, draft } from '../dialogue/aveloria';
import type { GameState } from '../systems/GameState';
import type { StoryAction } from './Chapter1Story';
import { CITY_FLAG as F } from './aveloriaFlags';

/** Pure outcomes. No grants, combat, party joins or next-chapter flags in this safe zone. */
export class AveloriaStory {
  constructor(private readonly state: GameState) {}
  private has(flag: string): boolean { return this.state.hasFlag(flag); }
  objective(): string {
    if (this.has(F.complete)) return 'Bab I selesai. Jelajahi Aveloria.';
    if (this.has(F.velthia)) return 'Kembali ke halaman istana.';
    if (this.has(F.archive)) return 'Temui Velthia di ruang pertemuan.';
    if (this.has(F.gate)) return 'Temui Azie di timur plaza.';
    return 'Dekati gerbang Aveloria.';
  }
  onStart(): StoryAction[] {
    return this.has(F.vista) ? [] : [
      { type: 'cityStage', stage: 'vista' }, { type: 'dialogue', script: CITY_VISTA },
      { type: 'setFlag', flag: F.vista }, { type: 'cityStage', stage: 'vistaEnd' },
    ];
  }
  trigger(id: string): StoryAction[] {
    if (id === 'city_gate' && !this.has(F.gate)) return this.gate();
    if (id === 'city_audience' && this.has(F.archive) && !this.has(F.velthia)) return this.audience();
    if (id === 'city_bells' && this.has(F.velthia) && !this.has(F.complete)) return this.bells();
    return [];
  }
  interact(id: string): StoryAction[] {
    if (id === 'talric') return this.has(F.gate) ? this.say('C1-06-REPEAT', 'C06', 'SUSPICIOUS', 'Azie menyimpan laporan di timur plaza. Aku akan mendengar keterangannya juga.') : this.gate();
    if (id === 'azie' && this.has(F.gate)) return this.has(F.archive)
      ? this.say('C1-07-REPEAT', 'C05', 'NEUTRAL', this.has(F.complete) ? 'Laporan menara belum lengkap. Aku tidak akan menulis kesimpulan sebelum membandingkannya.' : 'Ratu menunggumu di ruang pertemuan, lewat halaman utara.')
      : [{ type: 'cityStage', stage: 'archive' }, { type: 'dialogue', script: CITY_ARCHIVE }, { type: 'setFlag', flag: F.archive }];
    if (id === 'velthia' && this.has(F.archive)) return this.has(F.complete) ? [{ type: 'chapterEnd' }]
      : this.has(F.velthia) ? this.say('C1-08-REPEAT', 'C02', 'NEUTRAL', 'Mari ke halaman. Aku ingin memastikan penjaga menerima instruksiku.') : this.audience();
    if (id === 'derrria' && this.has(F.gate)) return [{ type: 'dialogue', script: DERRRIA_GREETING }, { type: 'shop' }];
    if (id === 'reports' && this.has(F.gate)) return [{ type: 'dialogue', script: REPORTS }];
    if (id === 'palace_door') return this.has(F.archive) ? [] : [{ type: 'toast', text: 'Temui Azie di timur plaza dulu.' }];
    if (id === 'city_sign') return [{ type: 'dialogue', script: { id: 'C1-CITY-SIGN', nodes: [draft('C1-CITY-SIGN-X001', 'SYSTEM', undefined, 'Utara: istana. Timur: arsip dan laporan. Barat: pasar.')] } }];
    const citizen = CITIZEN_TEXT[id];
    if (citizen) return [{ type: 'dialogue', script: { id: `C1-CITIZEN-${id}`, nodes: [draft(`C1-CITIZEN-${id}-X001`, 'SYSTEM', undefined, citizen[this.has(F.complete) ? 2 : 1], citizen[0])] } }];
    return [];
  }
  private gate(): StoryAction[] {
    return [{ type: 'cityStage', stage: 'gate' }, { type: 'dialogue', script: CITY_GATE }, { type: 'setFlag', flag: F.gate }, { type: 'cityStage', stage: 'gateOpen' }];
  }
  private audience(): StoryAction[] {
    return [{ type: 'cityStage', stage: 'audience' }, { type: 'dialogue', script: CITY_AUDIENCE }, { type: 'setFlag', flag: F.velthia }, { type: 'cityStage', stage: 'audienceEnd' }];
  }
  private bells(): StoryAction[] {
    return [
      { type: 'cityStage', stage: 'evening' }, { type: 'cityBell', number: 1 }, { type: 'dialogue', script: BELL_FIRST },
      { type: 'cityBell', number: 2 }, { type: 'dialogue', script: BELL_SECOND },
      { type: 'setFlag', flag: F.complete }, { type: 'chapterEnd' },
    ];
  }
  private say(id: string, speaker: Parameters<typeof draft>[1], expression: Parameters<typeof draft>[2], text: string): StoryAction[] {
    return [{ type: 'dialogue', script: { id, nodes: [draft(`${id}-X001`, speaker, expression, text)] } }];
  }
}
