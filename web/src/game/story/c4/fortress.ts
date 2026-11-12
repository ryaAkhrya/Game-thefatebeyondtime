import type { GameState } from '../../systems/GameState';
import type { StoryAction } from '../Chapter1Story';
import { C4, type C4EncounterId } from '../chapter4Flags';
import { FORT } from './fortressFlags';
import {
  C4_AEGIS_TRIAL_DONE, C4_AEGIS_TRIAL_INTRO, C4_AFTER_TORVAN, C4_ARCHIVE_VELTHIA, C4_ARRIVAL, C4_BOSS_INTRO, C4_CONFRONT, C4_HEART_APPROACH,
  C4_HEART_LOCK_VELTHIA, C4_HEART_LOCK_YARIC, C4_HEART_OPEN, C4_MEMORY_A, C4_MEMORY_B, C4_MEMORY_ENTER, C4_OLD_MEMORY, C4_REPORT_A, C4_REPORT_B,
  C4_RETURN_GATE, C4_RIFTBORN_FIRST, C4_TORVAN_LEAVES, C4_TORVAN_REVEAL, C4_TOWER_FALL, C4_VARLGRIM_TRUTH, C4_VICTORY_LEAN,
} from '../../dialogue/chapter4';
import {
  F_ANCHOR_HINT, F_ARCHIVE_CLOAK, F_ARCHIVE_LOG, F_ARCHIVE_MEMORIAL, F_ARCHIVE_SHELF, F_BARRACKS_BUNK, F_BARRACKS_NAMES, F_BARRACKS_TABLE, F_BELL,
  F_BELL_DIAL, F_CHEST_PLATE, F_CHEST_POTION, F_CHEST_ROBE, F_DOOR_HEART, F_DOOR_SEAL, F_DOOR_SHORTCUT, F_HEART_EMBLEM, F_HEART_EMBLEM_OPEN,
  F_HEART_SEAL, F_HEART_WINDOW_FALLEN, F_HEART_WINDOW_SHUT, F_LANTERN_COLD, F_LANTERN_LIT, F_OUTER_CART, F_OUTER_GATE, F_OUTER_STATUE, F_RIFT_SOLVED,
  F_SEAL_FIRST, F_SEAL_NOLOG, F_SEAL_SOLVED, F_SHORTCUT_LEVER, F_SHORTCUT_NOTE, F_SHORTCUT_WINDOW, F_TRIAL_GATE, F_TRIAL_PLAQUE,
} from '../../dialogue/chapter4.fortress';
import type { DialogueScript } from '../../dialogue/types';
import {
  FortressPuzzleSession, RIFT_SEGMENTS, anchorTouch, isAnchorId, isSealId, riftSolved, sealActivate, sealsSolved, type RiftBits,
} from '../../world/fortressPuzzle';

/**
 * Nama op `{type:'c4'}` yang dipahami FortressView (lihat docs/production/sprint4/F.md). `to_aveloria` ditangani WorldScene (lead).
 */
export const FORTRESS_OPS = [
  'seal_on', 'seal_reset', 'seal_solved', 'door_open', 'anchor_touch', 'rift_solved', 'lantern_on', 'lever_pull', 'relic_glow', 'chest_open',
  'lock_yaric', 'lock_velthia', 'heart_open', 'tower_fall', 'echo_a', 'echo_b', 'varlgrim_arrive', 'varlgrim_to_wall', 'torvan_appear', 'torvan_leave',
  'to_aveloria',
] as const;
export type FortressOp = (typeof FORTRESS_OPS)[number];

/** Sesi teka-teki bersama (kemajuan sementara). Direset setiap `onStart` (scene dimulai). */
export const fortressSession = new FortressPuzzleSession();

const talk = (script: DialogueScript): StoryAction => ({ type: 'dialogue', script });
const flag = (f: string): StoryAction => ({ type: 'setFlag', flag: f });
const c4 = (op: FortressOp, arg?: string | number): StoryAction => (arg === undefined ? { type: 'c4', op } : { type: 'c4', op, arg });
const toast = (text: string): StoryAction => ({ type: 'toast', text });
const battle = (encounter: C4EncounterId): StoryAction => ({ type: 'battle', encounter });
const objective = (): StoryAction => ({ type: 'objective' });

const SEAL_NAMES: Record<string, string> = { seal_dawn: 'Fajar', seal_noon: 'Siang', seal_dusk: 'Senja', seal_night: 'Malam' };
const CHESTS: Record<string, { flag: string; item: string; script: DialogueScript; name: string }> = {
  chest_potion: { flag: FORT.chestPotion, item: 'potion', script: F_CHEST_POTION, name: 'Potion' },
  chest_robe: { flag: FORT.chestRobe, item: 'keeper_robe', script: F_CHEST_ROBE, name: 'Jubah Pengawas' },
  chest_plate: { flag: FORT.chestPlate, item: 'warden_plate', script: F_CHEST_PLATE, name: 'Zirah Penjaga' },
};
const INSPECT: Record<string, DialogueScript> = {
  outer_statue: F_OUTER_STATUE, outer_cart: F_OUTER_CART, bell: F_BELL, bell_dial: F_BELL_DIAL, barracks_names: F_BARRACKS_NAMES,
  barracks_bunk: F_BARRACKS_BUNK, barracks_table: F_BARRACKS_TABLE, archive_memorial: F_ARCHIVE_MEMORIAL, archive_cloak: F_ARCHIVE_CLOAK,
  archive_shelf: F_ARCHIVE_SHELF, trial_plaque: F_TRIAL_PLAQUE, shortcut_window: F_SHORTCUT_WINDOW, shortcut_note: F_SHORTCUT_NOTE, heart_seal: F_HEART_SEAL,
};
const bitsArg = (b: RiftBits): string => b.map((x) => (x ? '1' : '0')).join('');

/**
 * Keputusan cerita Warden Fortress (C4-01..C4-06). MURNI: hanya mengembalikan StoryAction; flag di-commit lewat aksi setFlag
 * SESUDAH dialog (dan animasi view). Idempoten (memutar ulang tidak mengubah hasil, tidak ada hadiah ganda: peti memakai flag pada
 * giveItem) dan tanpa softlock: setiap rintangan punya petunjuk, salah = reset aman, keadaan teka-teki dapat dibalik.
 * Kemajuan sementara teka-teki ada di `session` (default `fortressSession`).
 */
export class FortressStory {
  constructor(private readonly state: GameState, private readonly session: FortressPuzzleSession = fortressSession) {}

  private get flags(): Readonly<Record<string, boolean>> { return this.state.snapshot()?.flags ?? {}; }
  private has(f: string): boolean { return this.state.hasFlag(f); }

  /** Teks tujuan (hanya Jurnal), selalu diturunkan dari flag. */
  objective(): string {
    const f = this.flags;
    if (!this.has(C4.entered)) return 'Masuki Benteng Kala.';
    if (this.has(C4.creatorReveal)) return 'Kembali ke Gerbang Luar, lalu pulang ke Aveloria.';
    if (this.has(C4.oldMemory)) return 'Ruang Gema belum selesai bicara.';
    if (this.has(C4.heartOpen)) {
      const seen = (this.has(C4.memoryA) ? 1 : 0) + (this.has(C4.memoryB) ? 1 : 0);
      return this.has(C4.towerFallen) ? `Periksa dua benda kuno di Ruang Gema (${seen}/2).` : 'Heart terbuka.';
    }
    if (this.has(C4.leanSeen)) return `Buka dua pengunci Heart bersama Velthia (${(this.has(C4.unlockYaric) ? 1 : 0) + (this.has(C4.unlockVelthia) ? 1 : 0)}/2).`;
    if (this.has(C4.varlgrim)) return 'Varlgrim telah jatuh. Dekati lambang Heart.';
    if (this.has(C4.checkpoint)) return 'Masuki Ruang Heart.';
    if (this.has(C4.aegisTrial)) return 'Nyalakan lentera jaga di Serambi Heart sebelum Ruang Heart.';
    if (this.has(C4.aegisLearned)) return riftSolved(f) ? 'Kembali ke Aula Lonceng: Ruang Uji Segel di sayap timur belum kau lewati.' : 'Hadapi uji Perlindungan di Ruang Uji Segel (sayap timur Aula Lonceng).';
    if (riftSolved(f)) return 'Kembali ke Aula Lonceng dan cari tahu apa yang dijaga di Arsip Penjaga (sayap barat).';
    if (sealsSolved(f)) return 'Lewati Koridor Retakan menuju Serambi Heart.';
    return 'Cari jalan melewati Aula Lonceng Berhenti. Arsip Penjaga ada di sayap barat.';
  }

  onStart(): StoryAction[] {
    this.session.reset();
    const out: StoryAction[] = [];
    if (!this.has(C4.entered)) out.push(talk(C4_ARRIVAL), flag(C4.entered), objective());
    // Pemulihan adegan yang terputus (keluar di tengah dialog): setiap langkah hanya muncul bila flag-nya belum ada.
    if (this.has(C4.aegisTrial) && !this.has(FORT.trialDoneSeen)) out.push(talk(C4_AEGIS_TRIAL_DONE), flag(FORT.trialDoneSeen), objective());
    if (this.has(C4.varlgrim) && !this.has(C4.leanSeen)) out.push(talk(C4_VICTORY_LEAN), flag(C4.leanSeen), objective());
    if ((this.has(C4.leanSeen) || this.has(C4.varlgrim)) && !this.has(FORT.heartApproachSeen)) out.push(talk(C4_HEART_APPROACH), flag(FORT.heartApproachSeen), objective());
    if (this.has(C4.unlockYaric) && this.has(C4.unlockVelthia) && !this.has(C4.heartOpen)) out.push(...this.openHeart());
    else if (this.has(C4.heartOpen) && !this.has(C4.towerFallen)) out.push(...this.towerFall());
    if (this.has(C4.oldMemory) && !this.has(C4.creatorReveal)) out.push(...this.finale());
    return out;
  }

  interact(id: string): StoryAction[] {
    if (INSPECT[id]) return [talk(INSPECT[id]!)];
    if (CHESTS[id]) return this.chest(id);
    switch (id) {
      case 'courier_a': return [talk(C4_REPORT_A), flag(C4.reportA)];
      case 'courier_b': return [talk(C4_REPORT_B), flag(C4.reportB)];
      case 'outer_gate':
        return this.has(C4.creatorReveal) ? [talk(C4_RETURN_GATE), c4('to_aveloria')] : [talk(F_OUTER_GATE)];
      case 'door_seal': return sealsSolved(this.flags) ? [] : [talk(F_DOOR_SEAL)];
      case 'door_shortcut': return this.has(FORT.shortcutOpen) ? [] : [talk(F_DOOR_SHORTCUT)];
      case 'trial_gate': return this.has(C4.aegisLearned) ? [toast('Gerbang besi sudah terbuka.')] : [talk(F_TRIAL_GATE)];
      case 'archive_log': return [talk(F_ARCHIVE_LOG), flag(FORT.logRead)];
      case 'archive_relic': return this.relic();
      case 'trial_pedestal': return this.trial();
      case 'lantern_rest': return this.lantern();
      case 'hall_lantern': case 'corridor_lantern': return this.freeRest();
      case 'door_heart': return this.has(C4.checkpoint) ? [] : [talk(F_DOOR_HEART)];
      case 'shortcut_lever': return this.lever();
      case 'heart_emblem': return [talk(this.has(C4.heartOpen) ? F_HEART_EMBLEM_OPEN : F_HEART_EMBLEM)];
      case 'heart_window':
        if (this.has(C4.towerFallen)) return [talk(F_HEART_WINDOW_FALLEN)];
        return this.has(C4.heartOpen) ? [toast('Jendela itu sudah terbuka. Lihat ke arah Aveloria.')] : [talk(F_HEART_WINDOW_SHUT)];
      case 'heart_lock_yaric': return this.lock('yaric');
      case 'heart_lock_velthia': return this.lock('velthia');
      case 'echo_a': return this.memory('a');
      case 'echo_b': return this.memory('b');
      case 'anchor_a': case 'anchor_b': return this.anchor(id);
      default: break;
    }
    if (isSealId(id)) return this.seal(id);
    return [];
  }

  trigger(id: string): StoryAction[] {
    switch (id) {
      case 'fortress_court_fight':
        if (this.has(C4.fightCourt)) return [];
        return [...(this.has(FORT.riftbornSeen) ? [] : [talk(C4_RIFTBORN_FIRST), flag(FORT.riftbornSeen)]), battle('fortress_riftborn')];
      case 'fortress_hall_fight':
        return this.has(C4.fightHall) ? [] : [toast('Batu besar di tengah aula mulai bergerak.'), battle('fortress_gravorn')];
      case 'fortress_guardpost':
        return this.has(C4.fightGuard) ? [] : [toast('Seorang penjaga berzirah dan sesosok bayangan berbalik ke arahmu.'), battle('fortress_guardpost')];
      case 'fortress_rift_fight':
        return this.has(C4.fightRift) ? [] : [toast('Lantai di depan bergetar. Sesuatu keluar dari retakan.'), battle('fortress_rift')];
      case 'heart_confront': return this.confront();
      case 'echo_enter':
        return this.has(C4.heartOpen) && !this.has(FORT.echoEntered) ? [talk(C4_MEMORY_ENTER), flag(FORT.echoEntered)] : [];
      default: return [];
    }
  }

  // ---------------------------------------------------------------- bagian
  private chest(id: string): StoryAction[] {
    const ch = CHESTS[id]!;
    if (this.has(ch.flag)) return [toast('Peti ini sudah kosong.')];
    if (id === 'chest_plate' && !this.has(C4.aegisTrial)) return [toast('Peti perlengkapan terkunci selama penguji di tengah ruangan masih berjaga.')];
    // giveItem membawa flag-nya sendiri (WorldScene memberi dan menyetel flag sekali): tidak ada hadiah ganda.
    return [c4('chest_open', id), talk(ch.script), { type: 'giveItem', item: ch.item, count: 1, flag: ch.flag }, toast(`Mendapat ${ch.name}.`)];
  }

  private relic(): StoryAction[] {
    if (this.has(C4.aegisLearned)) return [toast('Pusaka itu tenang. Perlindungan sudah bergema pada Velthia.')];
    return [c4('relic_glow'), talk(C4_ARCHIVE_VELTHIA), flag(C4.aegisLearned), toast('Dari kejauhan terdengar besi berat bergeser.'), objective()];
  }

  private trial(): StoryAction[] {
    if (this.has(C4.aegisTrial)) return [toast('Penguji sudah runtuh. Lingkaran di lantai diam.')];
    if (!this.has(C4.aegisLearned)) return [toast('Alas ini tidak bereaksi. Pusaka yang cocok belum bergema.')];
    return [...(this.has(FORT.trialIntroSeen) ? [] : [talk(C4_AEGIS_TRIAL_INTRO), flag(FORT.trialIntroSeen)]), battle('fortress_aegis_trial')];
  }

  private lantern(): StoryAction[] {
    if (!this.has(C4.aegisTrial)) return [talk(F_LANTERN_COLD)];
    const first = !this.has(C4.checkpoint);
    // Istirahat berulang: hanya memulihkan HP/MP (tanpa hadiah). Flag checkpoint idempoten.
    return [
      c4('lantern_on'), ...(first ? [talk(F_LANTERN_LIT)] : []), { type: 'restParty4' },
      ...(first ? [c4('door_open', 'heart')] : []), flag(C4.checkpoint),
      toast(first ? 'HP dan MP pulih. Titik pemulihan sebelum Ruang Heart tersimpan. Pintu Heart terbuka.' : 'HP dan MP pulih.'), objective(),
    ];
  }

  /** Lentera istirahat bebas (Aula Lonceng, depan Koridor): hanya memulihkan HP/MP; TANPA flag, TANPA checkpoint, TANPA hadiah; dapat diulang. */
  private freeRest(): StoryAction[] {
    return [{ type: 'restParty4' }, toast('HP dan MP pulih.')];
  }

  private lever(): StoryAction[] {
    if (this.has(FORT.shortcutOpen)) return [toast('Tuas sudah ditarik. Pintu di bawah sana terbuka.')];
    return [talk(F_SHORTCUT_LEVER), c4('lever_pull'), c4('door_open', 'shortcut'), flag(FORT.shortcutOpen), toast('Jalan pintas ke Aula Lonceng terbuka.')];
  }

  private seal(id: string): StoryAction[] {
    const f = this.flags;
    const first = !this.has(FORT.sealHintSeen) && !this.has(FORT.logRead) && !sealsSolved(f);
    const out: StoryAction[] = first ? [talk(F_SEAL_FIRST), flag(FORT.sealHintSeen)] : [];
    const res = sealActivate(id, f, this.session);
    switch (res.kind) {
      case 'ignored': return out;
      case 'already': return [toast('Segel ini sudah menyala.')];
      case 'progress': return [...out, c4('seal_on', res.id), toast(`Segel ${SEAL_NAMES[res.id]} menyala (${res.step}/${res.total}).`)];
      case 'wrong':
        return [...out, c4('seal_reset'), ...(this.has(FORT.logRead) ? [toast('Semua segel padam. Urutannya keliru; mulai lagi dari awal.')] : [talk(F_SEAL_NOLOG)])];
      case 'solved':
        return [...out, c4('seal_on', res.id), c4('seal_solved'), talk(F_SEAL_SOLVED), c4('door_open', 'seal'), flag(FORT.sealsSolved), objective()];
    }
  }

  private anchor(id: string): StoryAction[] {
    const f = this.flags;
    const out: StoryAction[] = this.has(FORT.riftHintSeen) || !isAnchorId(id) ? [] : [talk(F_ANCHOR_HINT), flag(FORT.riftHintSeen)];
    const res = anchorTouch(id, f, this.session);
    switch (res.kind) {
      case 'ignored': return out;
      case 'already': return [toast('Jangkar ini sudah terkunci pada tempatnya.')];
      case 'toggle':
        return [...out, c4('anchor_touch', `${res.anchor}:${bitsArg(res.state)}`), toast(`Lorong bergeser. Potongan sejajar: ${res.aligned}/${RIFT_SEGMENTS}.`)];
      case 'solved':
        return [...out, c4('anchor_touch', `${res.anchor}:${bitsArg(res.state)}`), c4('rift_solved'), talk(F_RIFT_SOLVED), flag(FORT.riftAligned), objective()];
    }
  }

  private confront(): StoryAction[] {
    if (!this.has(C4.checkpoint) || this.has(C4.varlgrim)) return [];
    return [
      ...(this.has(C4.confront) ? [] : [talk(C4_CONFRONT), flag(C4.confront)]),
      ...(this.has(FORT.bossIntroSeen) ? [] : [talk(C4_BOSS_INTRO), flag(FORT.bossIntroSeen)]),
      battle('varlgrim'),
    ];
  }

  private lock(who: 'yaric' | 'velthia'): StoryAction[] {
    if (!this.has(C4.leanSeen)) return [toast('Pengunci itu diam. Varlgrim masih berdiri di antara kalian dan lambang Heart.')];
    const mine = who === 'yaric' ? C4.unlockYaric : C4.unlockVelthia;
    const other = who === 'yaric' ? C4.unlockVelthia : C4.unlockYaric;
    if (this.has(mine)) return [toast(this.has(other) ? 'Kedua pengunci sudah menyala.' : 'Pengunci ini sudah menyala. Tinggal sisi yang satunya.')];
    const out: StoryAction[] = [
      c4(who === 'yaric' ? 'lock_yaric' : 'lock_velthia'), talk(who === 'yaric' ? C4_HEART_LOCK_YARIC : C4_HEART_LOCK_VELTHIA), flag(mine),
    ];
    if (this.has(other)) out.push(...this.openHeart());
    else out.push(objective());
    return out;
  }

  /** Kedua pengunci menyala: Heart terbuka, jendela busur terbuka, lalu debu menara dari kejauhan. */
  private openHeart(): StoryAction[] {
    return [c4('heart_open'), talk(C4_HEART_OPEN), flag(C4.heartOpen), ...this.towerFall()];
  }
  private towerFall(): StoryAction[] {
    return [c4('tower_fall'), talk(C4_TOWER_FALL), flag(C4.towerFallen), objective()];
  }

  private memory(which: 'a' | 'b'): StoryAction[] {
    if (!this.has(C4.heartOpen)) return [];
    const mine = which === 'a' ? C4.memoryA : C4.memoryB;
    const other = which === 'a' ? C4.memoryB : C4.memoryA;
    if (this.has(mine)) return [toast('Benda ini hanya gema. Ia sudah selesai bicara.')];
    const out: StoryAction[] = [c4(which === 'a' ? 'echo_a' : 'echo_b'), talk(which === 'a' ? C4_MEMORY_A : C4_MEMORY_B), flag(mine)];
    if (this.has(other)) out.push(talk(C4_OLD_MEMORY), flag(C4.oldMemory), ...this.finale());
    else out.push(objective());
    return out;
  }

  /** Pengakuan Varlgrim, Torvan dan penutup. Setiap bagian hanya bila flag-nya belum ada (aman dilanjutkan dari save). */
  private finale(): StoryAction[] {
    const out: StoryAction[] = [];
    if (!this.has(C4.varlgrimTruth)) out.push(c4('varlgrim_arrive'), talk(C4_VARLGRIM_TRUTH), c4('varlgrim_to_wall'), flag(C4.varlgrimTruth), flag(C4.varlgrimStays));
    if (!this.has(FORT.torvanLeft)) out.push(c4('torvan_appear'), talk(C4_TORVAN_REVEAL), talk(C4_TORVAN_LEAVES), c4('torvan_leave'), flag(FORT.torvanLeft));
    if (!this.has(C4.creatorReveal)) out.push(talk(C4_AFTER_TORVAN), flag(C4.creatorReveal), objective());
    return out;
  }
}

