import type { GameState } from '../../systems/GameState';
import type { StoryAction } from '../Chapter1Story';
import { C3 } from '../chapter3Flags';
import {
  C3_CHAPTER_END, C3_CHRONOLITH_INTRO, C3_CHRONOLITH_OUTRO, C3_GATE_OPEN, C3_HIDDEN_NAME, C3_PROMISE, C3_PUZZLE_HINT_A, C3_PUZZLE_HINT_B,
  C3_PUZZLE_HINT_C, C3_PUZZLE_INTRO, C3_PUZZLE_NOTE, C3_PUZZLE_SOLVED_A, C3_PUZZLE_SOLVED_B, C3_PUZZLE_SOLVED_C, C3_TEMPLE_CAMP,
  C3_TEMPLE_ENTRANCE, C3_TEMPLE_INSPECT_1, C3_TEMPLE_INSPECT_2, C3_TEMPLE_INSPECT_3, C3_TEMPLE_INSPECT_4,
} from '../../dialogue/chapter3';
import type { DialogueScript } from '../../dialogue/types';
import type { EncounterId } from '../../combat/encounters';
import {
  DIAL_TARGET, TemplePuzzleSession, activate, allSolved, gateIsOpen, gateNeedsOpening, solvedCount, type DialId, type Outcome, type PuzzleId,
} from '../../world/templePuzzle';

/** Flag kemajuan internal kuil yang bukan bagian kontrak C3 (hanya pengatur dialog sekali-putar). */
export const TEMPLE_FLAG = { introSeen: 'c3.puzzle_intro_seen' } as const;

/** Nama op `{type:'c3'}` yang dipahami TempleView (lihat docs/production/sprint3/T.md). */
export const TEMPLE_OPS = ['pillar_on', 'puzzle_reset', 'disc_on', 'disc_wrong', 'dial_set', 'puzzle_fx', 'gate_open', 'chronolith_wake', 'camp_rest'] as const;

/** Sesi teka-teki bersama (kemajuan sementara). Dibuat ulang setiap `onStart` (scene dimulai). */
export const templeSession = new TemplePuzzleSession();

const talk = (script: DialogueScript): StoryAction => ({ type: 'dialogue', script });
const flag = (f: string): StoryAction => ({ type: 'setFlag', flag: f });
const c3 = (op: (typeof TEMPLE_OPS)[number], arg?: string | number): StoryAction => (arg === undefined ? { type: 'c3', op } : { type: 'c3', op, arg });
const toast = (text: string): StoryAction => ({ type: 'toast', text });
const battle = (encounter: Extract<EncounterId, 'temple_oathguard' | 'temple_mixed' | 'chronolith'>): StoryAction => ({ type: 'battle', encounter });

const HINT: Record<PuzzleId, DialogueScript> = { A: C3_PUZZLE_HINT_A, B: C3_PUZZLE_HINT_B, C: C3_PUZZLE_HINT_C };
const SOLVED: Record<PuzzleId, DialogueScript> = { A: C3_PUZZLE_SOLVED_A, B: C3_PUZZLE_SOLVED_B, C: C3_PUZZLE_SOLVED_C };
const PUZZLE_FLAG: Record<PuzzleId, string> = { A: C3.puzzleA, B: C3.puzzleB, C: C3.puzzleC };
const INSPECT: Record<string, DialogueScript> = { inspect_1: C3_TEMPLE_INSPECT_1, inspect_2: C3_TEMPLE_INSPECT_2, inspect_3: C3_TEMPLE_INSPECT_3, inspect_4: C3_TEMPLE_INSPECT_4 };

/**
 * Keputusan cerita Kuil Jejak (C3-03..C3-07). MURNI: hanya mengembalikan StoryAction; flag di-commit lewat aksi setFlag SESUDAH dialog.
 * Idempoten (memutar ulang tidak mengubah hasil, tidak ada hadiah ganda) dan tanpa softlock: tiap rintangan punya petunjuk, salah = reset.
 * Kemajuan sementara teka-teki ada di `session` (default `templeSession`).
 */
export class TempleStory {
  constructor(private readonly state: GameState, private readonly session: TemplePuzzleSession = templeSession) {}

  private get flags(): Readonly<Record<string, boolean>> { return this.state.snapshot()?.flags ?? {}; }
  private has(f: string): boolean { return this.state.hasFlag(f); }

  /** Teks tujuan (Jurnal/HUD), selalu diturunkan dari flag. */
  objective(): string {
    const f = this.flags;
    if (this.has(C3.complete)) return 'Bab III selesai. Jalan menuju Benteng Kala menunggu.';
    if (this.has(C3.hiddenName)) return 'Pergi ke pintu keluar di sisi timur aula.';
    if (this.has(C3.chronolith)) return this.has(C3.chronolithOutroSeen) ? 'Periksa catatan pada dinding utara aula.' : 'Chronolith telah diam.';
    if (gateIsOpen(f)) return this.has(C3.checkpoint) ? 'Masuki aula Chronolith.' : 'Beristirahat di perkemahan, lalu masuki aula Chronolith.';
    if (gateNeedsOpening(f)) return 'Gerbang aula mulai bergeser.';
    if (this.has(C3.puzzleA) && this.has(C3.puzzleB)) return 'Arahkan ketiga alas di ruang gerbang menuju lingkaran.';
    return `Pulihkan lambang di dua ruang samping halaman (${solvedCount(f)}/2).`;
  }

  onStart(): StoryAction[] {
    this.session.reset();
    const out: StoryAction[] = [];
    if (!this.has(C3.templeEntered)) out.push(talk(C3_TEMPLE_ENTRANCE), flag(C3.templeEntered));
    // Pemulihan: semua teka-teki selesai tetapi gerbang belum di-commit (mis. keluar di tengah dialog)
    if (gateNeedsOpening(this.flags)) out.push(...this.openGate());
    if (this.has(C3.chronolith) && !this.has(C3.chronolithOutroSeen)) out.push(talk(C3_CHRONOLITH_OUTRO), flag(C3.chronolithOutroSeen), { type: 'objective' });
    return out;
  }

  interact(id: string): StoryAction[] {
    const f = this.flags;
    if (INSPECT[id]) return [talk(INSPECT[id]!)];
    switch (id) {
      case 'temple_exit':
        return [toast('Jalan setapak kembali ke hutan. Kuil ini belum selesai kau baca.')];
      case 'temple_note':
        return [...this.intro(), talk(C3_PUZZLE_NOTE), flag(C3.puzzleNote)];
      case 'a_mural': return [...this.intro(), talk(C3_PUZZLE_HINT_A)];
      case 'b_lamp': return [...this.intro(), talk(C3_PUZZLE_HINT_B)];
      case 'c_mural_l': case 'c_mural_r': return [...this.intro(), talk(C3_PUZZLE_HINT_C)];
      case 'temple_camp': return this.camp();
      case 'chronolith': return this.chronolith();
      case 'hall_record':
        if (!this.has(C3.chronolithOutroSeen)) return [toast('Catatan di dinding itu belum bisa dibaca. Chronolith masih berjaga.')];
        return [talk(C3_HIDDEN_NAME), flag(C3.hiddenName), { type: 'objective' }];
      case 'hall_exit':
        if (this.has(C3.complete)) return [{ type: 'chapter3End' }];
        if (!this.has(C3.hiddenName)) return [toast(this.has(C3.chronolith) ? 'Periksa catatan pada dinding utara aula dulu.' : 'Pintu ini belum bisa dilewati.')];
        return [talk(C3_PROMISE), flag(C3.promise), talk(C3_CHAPTER_END), flag(C3.complete), { type: 'chapter3End' }];
      default: break;
    }
    if (id.startsWith('a_pillar_') || id.startsWith('b_disc_') || id.startsWith('c_dial_')) return this.puzzle(id, f);
    return [];
  }

  trigger(id: string): StoryAction[] {
    switch (id) {
      case 'temple_chamber_w': case 'temple_chamber_e': case 'temple_inner':
        return this.intro();
      case 'temple_fight1':
        return this.has(C3.templeFight1) ? [] : [toast('Sosok berzirah dengan jubah merah berbalik ke arahmu.'), battle('temple_oathguard')];
      case 'temple_fight2':
        return this.has(C3.templeFight2) ? [] : [toast('Cahaya-cahaya ungu berkumpul di sekitar seorang penjaga.'), battle('temple_mixed')];
      case 'temple_chronolith':
        return this.chronolith(true);
      default: return [];
    }
  }

  // ---------------------------------------------------------------- bagian
  private intro(): StoryAction[] {
    return this.has(TEMPLE_FLAG.introSeen) ? [] : [talk(C3_PUZZLE_INTRO), flag(TEMPLE_FLAG.introSeen)];
  }

  private camp(): StoryAction[] {
    const out: StoryAction[] = [];
    if (!this.has(C3.campSeen)) out.push(talk(C3_TEMPLE_CAMP), flag(C3.campSeen));
    // Istirahat berulang: hanya memulihkan HP/MP (tidak ada hadiah). Flag checkpoint idempoten.
    out.push(c3('camp_rest'), { type: 'restParty' }, flag(C3.checkpoint), toast('HP dan MP pulih. Titik pemulihan sebelum aula tersimpan.'), { type: 'objective' });
    return out;
  }

  private chronolith(fromTrigger = false): StoryAction[] {
    if (this.has(C3.chronolith)) return fromTrigger ? [] : [toast('Chronolith sudah diam. Batu itu tidak bergerak lagi.')];
    if (!gateIsOpen(this.flags)) return fromTrigger ? [] : [toast('Gerbang aula belum terbuka.')];
    const out: StoryAction[] = [c3('chronolith_wake')];
    if (!this.has(C3.chronolithIntroSeen)) out.push(talk(C3_CHRONOLITH_INTRO), flag(C3.chronolithIntroSeen));
    out.push(battle('chronolith'));
    return out;
  }

  private openGate(): StoryAction[] {
    return [c3('gate_open'), talk(C3_GATE_OPEN), flag(C3.gateOpen), flag(C3.checkpoint), { type: 'objective' }];
  }

  private puzzle(id: string, f: Readonly<Record<string, boolean>>): StoryAction[] {
    const out = this.intro();
    const res: Outcome = activate(id, f, this.session);
    switch (res.kind) {
      case 'ignored': return out;
      case 'already': return [...out, toast(res.puzzle === 'C' ? 'Alas ini sudah terkunci pada arahnya.' : 'Bagian ini sudah pulih.')];
      case 'locked': return [...out, toast('Alas ini membeku. Pulihkan dulu lambang di dua ruang samping.')];
      case 'progress': return [...out, c3('pillar_on', res.id), toast(`Lambang menyala (${res.step}/${res.total}).`)];
      case 'wrong':
        return res.puzzle === 'A'
          ? [...out, c3('puzzle_reset', 'A'), toast('Lambang meredup. Urutannya salah, mulai lagi dari awal.'), talk(HINT.A)]
          : [...out, c3('disc_wrong', res.id), toast('Segel tidak bergerak.'), talk(HINT.B)];
      case 'dial': return [...out, c3('dial_set', `${res.id}:${res.pos}`)];
      case 'solved': {
        const solved: PuzzleId = res.puzzle;
        const acts: StoryAction[] = [...out];
        if (solved === 'A') acts.push(c3('pillar_on', res.id));
        if (solved === 'B') acts.push(c3('disc_on', res.id));
        if (solved === 'C') acts.push(c3('dial_set', `${res.id}:${DIAL_TARGET[res.id as DialId]}`));
        acts.push(c3('puzzle_fx', solved), talk(SOLVED[solved]), flag(PUZZLE_FLAG[solved]), { type: 'objective' });
        // Semua teka-teki selesai -> gerbang aula terbuka (hanya bila yang baru selesai adalah yang terakhir).
        if (allSolved({ ...f, [PUZZLE_FLAG[solved]]: true })) acts.push(...this.openGate());
        return acts;
      }
    }
  }
}
