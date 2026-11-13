import { C4_RETURN_AVELORIA } from '../../dialogue/chapter4';
import {
  C4_AVE_AZIE, C4_AVE_BELL, C4_AVE_DERRRIA, C4_AVE_FENCE_SIGN, C4_AVE_GUARD, C4_AVE_PORTER, C4_AVE_RES_A, C4_AVE_RES_B, C4_AVE_RES_C, C4_AVE_ROSTER_CLOSE,
  C4_AVE_SIGN, C4_AVE_TALRIC, C4_AVE_TALRIC_AFTER, C4_AVE_VELTHIA_AFTER, C4_AVE_VELTHIA_CLOSE, C4_AVE_VENDOR,
} from '../../dialogue/chapter4.aveloria';
import type { DialogueScript } from '../../dialogue/types';
import type { GameState } from '../../systems/GameState';
import type { StoryAction } from '../Chapter1Story';
import { C4 } from '../chapter4Flags';
import { AVELORIA_C4_IDS } from '../../world/aveloriaC4';

/**
 * Aveloria sesudah menara tua runtuh (Chapter IV, C4-07 "Kembali kepada rakyat"). MURNI (tanpa Phaser).
 *
 * Alur (tiap flag di-commit SESUDAH dialognya; dapat dilanjutkan dari tengah, tidak ada softlock):
 *   returned (diatur lead saat tiba) -> onStart: [c4 returnOpen, C4_RETURN_AVELORIA] -> returnSeen
 *   returnSeen -> pemain menjelajah dan bicara dengan Talric/Azie/Derrria/warga/penjaga atau memeriksa lonceng dan tanda
 *   returnSeen -> bicara dengan Velthia ATAU periksa papan daftar warga: dialog penutup -> `chapter.4_complete` (sekali; idempoten)
 * Sesudah flag complete, renderer mengantar ke adegan berikutnya secara otomatis; tanpa hadiah tambahan.
 * Torvan tidak hadir. `returned` TIDAK diatur di sini (lead).
 */
const RESIDENT_LINES: Readonly<Record<string, DialogueScript>> = {
  c4_res_vendor: C4_AVE_VENDOR, c4_res_porter: C4_AVE_PORTER, c4_res_a: C4_AVE_RES_A, c4_res_b: C4_AVE_RES_B, c4_res_c: C4_AVE_RES_C, c4_res_guard: C4_AVE_GUARD,
};

export class AveloriaC4Story {
  constructor(private readonly state: GameState) {}
  private has(flag: string): boolean { return this.state.hasFlag(flag); }
  private toast(text: string): StoryAction[] { return [{ type: 'toast', text }]; }

  /** Cerita Aveloria Bab IV aktif sesudah lead mengantar pemain kembali (flag `returned`). */
  get active(): boolean { return this.has(C4.returned); }

  /** Hanya untuk Jurnal (bukan banner HUD). */
  objective(): string {
    if (!this.has(C4.returned)) return 'Jelajahi Aveloria.';
    if (this.has(C4.complete)) return 'Bab IV selesai.';
    if (this.has(C4.returnSeen)) return 'Tutup hari ini: bicara dengan Velthia atau periksa papan daftar warga di tempat penampungan.';
    return 'Temui Talric, Azie, dan Velthia di tempat penampungan, di luar gerbang kota.';
  }

  /** Adegan kembali (C4-07) sekali saat tiba; commit `returnSeen` sesudah dialog. */
  onStart(): StoryAction[] {
    if (!this.active || this.has(C4.returnSeen)) return [];
    return this.returnScene(true);
  }

  /** Aveloria Bab IV tidak memiliki pemicu area (pemain bebas menjelajah). */
  trigger(_id: string): StoryAction[] { return []; }

  interact(id: string): StoryAction[] {
    if (!this.active) return [];
    const ids = AVELORIA_C4_IDS;
    // sebelum adegan kembali selesai, menemui Talric/Azie/Velthia memainkan adegan itu (tanpa koreografi kamera)
    if ((id === ids.talric || id === ids.azie || id === ids.velthia) && !this.has(C4.returnSeen)) return this.returnScene(false);
    if (id === ids.velthia) return this.has(C4.complete) ? [{ type: 'dialogue', script: C4_AVE_VELTHIA_AFTER }] : this.close(C4_AVE_VELTHIA_CLOSE);
    if (id === ids.roster) {
      if (!this.has(C4.returnSeen)) return this.toast('Temui Talric, Azie, dan Velthia lebih dulu.');
      return this.has(C4.complete) ? [{ type: 'dialogue', script: C4_AVE_ROSTER_CLOSE }] : this.close(C4_AVE_ROSTER_CLOSE);
    }
    if (id === ids.talric) return [{ type: 'dialogue', script: this.has(C4.complete) ? C4_AVE_TALRIC_AFTER : C4_AVE_TALRIC }];
    if (id === ids.azie) return [{ type: 'dialogue', script: C4_AVE_AZIE }];
    if (id === ids.derrria) return [{ type: 'dialogue', script: C4_AVE_DERRRIA }];
    const resident = RESIDENT_LINES[id];
    if (resident) return [{ type: 'dialogue', script: resident }];
    if (id === ids.bell) return [{ type: 'dialogue', script: C4_AVE_BELL }];
    if (id === ids.fenceSign) return [{ type: 'dialogue', script: C4_AVE_FENCE_SIGN }];
    if (id === ids.sign) return [{ type: 'dialogue', script: C4_AVE_SIGN }];
    return [];
  }

  private returnScene(withOpen: boolean): StoryAction[] {
    const a: StoryAction[] = [];
    if (withOpen) a.push({ type: 'c4', op: 'returnOpen' });
    a.push({ type: 'dialogue', script: C4_RETURN_AVELORIA }, { type: 'setFlag', flag: C4.returnSeen }, { type: 'objective' });
    return a;
  }

  /** Menutup hari: dialog lalu `chapter.4_complete` sekali (tidak ada hadiah). Memanggil ulang sesudah selesai tidak menambah apa pun. */
  private close(script: DialogueScript): StoryAction[] {
    const a: StoryAction[] = [{ type: 'dialogue', script }];
    if (!this.has(C4.complete)) a.push({ type: 'setFlag', flag: C4.complete }, { type: 'objective' });
    return a;
  }
}
