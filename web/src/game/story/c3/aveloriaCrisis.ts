import {
  C3_AZIE_DEMAND, C3_CRISIS_WATCH, C3_DECISION, C3_DEPART, C3_EVAC_ORDER, C3_NOBLES_DOUBT, C3_NPC_AZIE_WATCH, C3_NPC_CITIZEN_1, C3_NPC_CITIZEN_2,
  C3_NPC_CITIZEN_3, C3_NPC_CITIZEN_4, C3_NPC_EVAC_DONE, C3_NPC_NOBLE, C3_NPC_TALRIC_BUSY, C3_NPC_TORVAN_HELPING, C3_TALRIC_EVAC, C3_TORVAN_STAYS,
  C3_VELTHIA_REFUSES,
} from '../../dialogue/chapter3';
import { DERRRIA_GREETING, REPORTS, draft } from '../../dialogue/aveloria';
import type { DialogueScript } from '../../dialogue/types';
import type { GameState } from '../../systems/GameState';
import type { StoryAction } from '../Chapter1Story';
import { C3 } from '../chapter3Flags';
import { AVELORIA_AUDIENCE, AVELORIA_COUNCIL, AVELORIA_TEMPLE_EXIT, ID_NOBLE, ID_TORVAN } from '../../world/aveloriaCrisis';

/**
 * Aveloria dalam krisis retakan waktu (Chapter III, C3-01 dan C3-02 sampai keberangkatan). MURNI (tanpa Phaser).
 *
 * Alur (tiap flag di-commit SESUDAH dialognya; setiap rantai dapat dilanjutkan dari tengah, jadi tidak ada softlock):
 *   start -> [onStart: c3 crisisOpen, C3_CRISIS_WATCH] -> crisisSeen
 *   crisisSeen -> (masuk halaman istana `c3_audience` / bicara Azie / Velthia) [c3 audienceGather, C3_AZIE_DEMAND] -> azieDemand
 *                 [C3_VELTHIA_REFUSES] -> velthiaRefuses; [C3_NOBLES_DOUBT, C3_EVAC_ORDER, c3 evacStart] -> evacOrdered
 *   evacOrdered -> (bicara Talric di gerbang) [C3_TALRIC_EVAC, c3 evacFinish] -> evacDone
 *   evacDone -> (masuk ruang pertemuan `city_audience` / bicara Velthia) [C3_DECISION] -> decision
 *   decision -> (bicara Torvan) [c3 torvanFace, C3_TORVAN_STAYS] -> torvanStays -> joinVelthia -> velthiaJoined
 *   velthiaJoined -> (pemicu `c3_temple_exit` di selatan gerbang) [C3_DEPART] -> departed -> changeArea 'temple'
 */
const CITIZEN_LINES: Record<string, DialogueScript> = {
  porter: C3_NPC_CITIZEN_1, vendor: C3_NPC_CITIZEN_2, sweeper: C3_NPC_CITIZEN_3, guard: C3_NPC_CITIZEN_4,
};

export class AveloriaCrisisStory {
  constructor(private readonly state: GameState) {}
  private has(flag: string): boolean { return this.state.hasFlag(flag); }
  private toast(text: string): StoryAction[] { return [{ type: 'toast', text }]; }

  /** Bab III aktif di Aveloria bila flag mulai terpasang (Chapter1Story mengalihkan ke kelas ini). */
  get active(): boolean { return this.has(C3.start); }

  objective(): string {
    if (!this.has(C3.start)) return 'Jelajahi Aveloria.';
    if (this.has(C3.departed)) return 'Lanjutkan ke Kuil Jejak.';
    if (this.has(C3.velthiaJoined)) return 'Keluar lewat gerbang selatan menuju Kuil Jejak.';
    if (this.has(C3.decision)) return 'Bicara dengan Torvan di dekat gerbang.';
    if (this.has(C3.evacDone)) return 'Temui Velthia di ruang pertemuan.';
    if (this.has(C3.evacOrdered)) return 'Temui Talric di gerbang kota.';
    if (this.has(C3.crisisSeen)) return 'Temui Azie dan Velthia di tangga istana.';
    return 'Lihat keadaan Aveloria.';
  }

  /** Pembukaan krisis saat memasuki Aveloria dengan Bab III dimulai; sekali (flag crisisSeen). */
  onStart(): StoryAction[] {
    if (!this.has(C3.start) || this.has(C3.crisisSeen)) return [];
    return [
      { type: 'c3', op: 'crisisOpen' },
      { type: 'dialogue', script: C3_CRISIS_WATCH },
      { type: 'setFlag', flag: C3.crisisSeen },
      { type: 'objective' },
    ];
  }

  trigger(id: string): StoryAction[] {
    if (!this.has(C3.start)) return [];
    if (id === AVELORIA_AUDIENCE) return this.has(C3.crisisSeen) && !this.has(C3.evacOrdered) ? this.audience() : [];
    if (id === AVELORIA_COUNCIL) return this.has(C3.evacDone) && !this.has(C3.decision) ? this.decision() : [];
    if (id === AVELORIA_TEMPLE_EXIT) return this.exit();
    return [];
  }

  interact(id: string): StoryAction[] {
    if (!this.has(C3.start)) return [];
    if (id === 'azie') return this.has(C3.crisisSeen) && !this.has(C3.evacOrdered) ? this.audience() : [{ type: 'dialogue', script: C3_NPC_AZIE_WATCH }];
    if (id === 'velthia') {
      if (this.has(C3.crisisSeen) && !this.has(C3.evacOrdered)) return this.audience();
      if (this.has(C3.evacOrdered) && !this.has(C3.evacDone)) return this.toast('Temui Talric di gerbang kota lebih dulu.');
      if (this.has(C3.evacDone) && !this.has(C3.decision)) return this.decision();
      return [];
    }
    if (id === 'talric') {
      if (this.has(C3.evacOrdered) && !this.has(C3.evacDone)) return [
        { type: 'dialogue', script: C3_TALRIC_EVAC }, { type: 'c3', op: 'evacFinish' }, { type: 'setFlag', flag: C3.evacDone }, { type: 'objective' },
      ];
      return [{ type: 'dialogue', script: this.has(C3.evacDone) ? C3_NPC_EVAC_DONE : C3_NPC_TALRIC_BUSY }];
    }
    if (id === ID_TORVAN) return this.has(C3.decision) && !this.has(C3.velthiaJoined) ? this.torvan() : [{ type: 'dialogue', script: C3_NPC_TORVAN_HELPING }];
    if (id === ID_NOBLE) return [{ type: 'dialogue', script: C3_NPC_NOBLE }];
    if (id === 'guard' && this.has(C3.evacDone)) return [{ type: 'dialogue', script: C3_NPC_EVAC_DONE }];
    const citizen = CITIZEN_LINES[id];
    if (citizen) return [{ type: 'dialogue', script: citizen }];
    if (id === 'derrria') return [{ type: 'dialogue', script: DERRRIA_GREETING }, { type: 'shop' }];
    if (id === 'reports') return [{ type: 'dialogue', script: REPORTS }];
    if (id === 'city_sign') return [{ type: 'dialogue', script: { id: 'C3-CITY-SIGN', nodes: [draft('C3-CITY-SIGN-X001', 'SYSTEM', undefined, 'Utara: istana. Timur: arsip dan laporan. Barat: pasar.')] } }];
    return [];
  }

  /** Tuntutan Azie -> penolakan Velthia -> keraguan bangsawan -> perintah evakuasi; melanjutkan dari flag yang sudah ada. */
  private audience(): StoryAction[] {
    const a: StoryAction[] = [];
    if (!this.has(C3.azieDemand)) a.push({ type: 'c3', op: 'audienceGather' }, { type: 'dialogue', script: C3_AZIE_DEMAND }, { type: 'setFlag', flag: C3.azieDemand });
    if (!this.has(C3.velthiaRefuses)) a.push({ type: 'dialogue', script: C3_VELTHIA_REFUSES }, { type: 'setFlag', flag: C3.velthiaRefuses });
    a.push({ type: 'dialogue', script: C3_NOBLES_DOUBT }, { type: 'dialogue', script: C3_EVAC_ORDER },
      { type: 'c3', op: 'evacStart' }, { type: 'setFlag', flag: C3.evacOrdered }, { type: 'objective' });
    return a;
  }

  /** Keputusan Velthia ikut ke kuil (lambang pusaka) di ruang pertemuan. */
  private decision(): StoryAction[] {
    return [{ type: 'dialogue', script: C3_DECISION }, { type: 'setFlag', flag: C3.decision }, { type: 'objective' }];
  }

  /** Torvan tinggal membantu warga; party aktif jadi Yaric + Velthia (sekali). */
  private torvan(): StoryAction[] {
    const a: StoryAction[] = [];
    if (!this.has(C3.torvanStays)) a.push({ type: 'c3', op: 'torvanFace' }, { type: 'dialogue', script: C3_TORVAN_STAYS }, { type: 'setFlag', flag: C3.torvanStays });
    if (!this.has(C3.velthiaJoined)) a.push({ type: 'joinVelthia' }, { type: 'setFlag', flag: C3.velthiaJoined });
    a.push({ type: 'objective' });
    return a;
  }

  /** Pemicu keluar kota: keberangkatan hanya setelah party berubah; tidak pernah mengunci pemain di kota. */
  private exit(): StoryAction[] {
    if (this.has(C3.departed)) return [{ type: 'changeArea', area: 'temple' }];
    if (this.has(C3.velthiaJoined)) return [{ type: 'dialogue', script: C3_DEPART }, { type: 'setFlag', flag: C3.departed }, { type: 'changeArea', area: 'temple' }];
    if (this.has(C3.decision)) return this.toast('Bicara dengan Torvan di dekat gerbang sebelum berangkat.');
    if (this.has(C3.evacDone)) return this.toast('Temui Velthia di ruang pertemuan sebelum berangkat.');
    return this.toast('Urusan di Aveloria belum selesai.');
  }
}
