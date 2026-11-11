import type { GameState } from '../systems/GameState';
import type { StoryAction } from './Chapter1Story';
import { AveloriaStory } from './AveloriaStory';
import { C2 } from './chapter2Flags';
import { IDENTITY_FLAG } from './identity';
import { C2_AZIE, C2_DUO_INTRO, C2_DUO_OUTRO, C2_FAREWELL, C2_FRAGMENT_A, C2_FRAGMENT_B,
  C2_NAME_ECHO, C2_NAME_FOUND, C2_RECORDS, C2_RETURN, C2_SHADOW, C2_STONE, C2_TORVAN, C2_VEYRATH_INTRO, C2_VEYRATH_OUTRO, C2_ZIRA, c2Draft } from '../dialogue/chapter2';

const say = (id: string, text: string, label?: string): StoryAction[] => [{ type: 'dialogue', script: {
  id, nodes: [c2Draft(`${id}-X001`, text, 'SYSTEM', undefined, label)],
} }];
/** Pure decisions for the working Chapter II script. Outcomes are committed only after dialogues/battles finish. */
export class Chapter2Story {
  constructor(private readonly state: GameState) {}
  private has(flag: string): boolean { return this.state.hasFlag(flag); }
  private get area(): string { return this.state.snapshot()?.area ?? 'aveloria'; }
  objective(): string {
    if (this.has(C2.complete)) return 'Bab II selesai. Penyelidikan berlanjut nanti.';
    if (this.area === 'aveloria') {
      if (this.has(C2.fragments)) return 'Serahkan catatan pada Velthia di halaman.';
      if (this.has(C2.farewell)) return 'Ikuti jalan selatan menuju Liora.';
      if (this.has(C2.depart)) return 'Temui Velthia sebelum berangkat.';
      return 'Tanyakan dua catatan pada Azie di arsip.';
    }
    if (this.area === 'liora') return this.has(C2.zira) ? 'Ikuti penanda utara ke Hutan 2.' : 'Cari Zira dan dengarkan dua versi cerita.';
    if (!this.has(C2.forest)) return 'Periksa batu penanda di jalur timur.';
    if (!this.has(C2.torvan)) return 'Temui bocah di belokan hutan.';
    if (!this.has(C2.tutorial)) return 'Jelajahi jalur bersama Torvan.';
    if (!this.has(C2.secondMarker)) return 'Periksa penanda di cabang utara.';
    if (!this.has(C2.veyrath)) return 'Hadapi penjaga jalan lama.';
    if (!this.has(C2.fragmentA)) return 'Baca catatan di balik penjaga.';
    if (!this.has(C2.fragments)) return 'Periksa fragmen ramalan di samping catatan.';
    return 'Bawa temuan itu kembali ke Aveloria.';
  }
  onStart(): StoryAction[] {
    if (this.area !== 'forest_2') return [];
    if (this.has(C2.veyrath) && !this.has(C2.veyrathSeen)) return [
      { type: 'dialogue', script: C2_VEYRATH_OUTRO }, { type: 'setFlag', flag: C2.veyrathSeen },
    ];
    if (this.has(C2.tutorial) && !this.has(C2.tutorialSeen)) return [
      { type: 'dialogue', script: C2_DUO_OUTRO }, { type: 'setFlag', flag: C2.tutorialSeen },
    ];
    return [];
  }
  interact(id: string): StoryAction[] {
    if (this.area === 'aveloria') return this.city(id);
    if (this.area === 'liora') return this.village(id);
    return this.forest(id);
  }
  trigger(id: string): StoryAction[] {
    if (this.area !== 'forest_2') return [];
    if (id === 'forest2_shadow' && !this.has(C2.shadow)) return [
      { type: 'dialogue', script: C2_SHADOW }, { type: 'setFlag', flag: C2.shadow },
    ];
    if (id === 'forest2_tutorial' && this.has(C2.torvan) && !this.has(C2.tutorial)) return [
      { type: 'dialogue', script: C2_DUO_INTRO }, { type: 'battle', encounter: 'duo_tutorial' },
    ];
    if (id === 'forest2_veyrath' && this.has(C2.tutorial) && this.has(C2.secondMarker) && !this.has(C2.veyrath)) return this.veyrath();
    return [];
  }
  private city(id: string): StoryAction[] {
    if (id === 'azie') {
      if (this.has(C2.fragments)) return say('C2-09-AZIE', 'Ratu menunggu temuanmu di halaman. Aku akan membandingkan goresan kedua catatan.');
      return this.has(C2.depart) ? say('C2-01-REPEAT', 'Dua salinan itu kusimpan. Liora punya yang lebih tua.')
        : [{ type: 'dialogue', script: C2_AZIE }, { type: 'setFlag', flag: C2.depart }];
    }
    if (id === 'reports' && this.has(C2.depart)) return [{ type: 'dialogue', script: C2_RECORDS }];
    if (id === 'velthia') {
      if (this.has(C2.complete)) return [{ type: 'chapter2End' }];
      if (this.has(C2.fragments)) return [{ type: 'dialogue', script: C2_RETURN }, { type: 'setFlag', flag: C2.complete }, { type: 'chapter2End' }];
      if (!this.has(C2.depart)) return say('C2-WAIT', 'Azie masih memeriksa dua catatan. Temui dia dulu.');
      return this.has(C2.farewell) ? say('C2-02-REPEAT', 'Surat pengantarmu sudah siap. Penjaga Liora akan mengenali stempelnya.')
        : [{ type: 'dialogue', script: C2_FAREWELL }, { type: 'setFlag', flag: C2.farewell }];
    }
    if (id === 'liora_exit') return this.has(C2.farewell) ? [{ type: 'changeArea', area: 'liora' }]
      : [{ type: 'toast', text: 'Bicara dengan Azie dan Velthia sebelum berangkat.' }];
    if (id === 'derrria' || id === 'city_sign' || id === 'palace_door' || ['porter', 'vendor', 'sweeper', 'guard', 'talric'].includes(id)) return new AveloriaStory(this.state).interact(id);
    return [];
  }
  private village(id: string): StoryAction[] {
    if (id === 'zira') return this.has(C2.zira) ? say('C2-03-REPEAT', 'Dua ukiran ini masih perlu kusambung. Jalur lama di utara tidak akan pergi ke mana-mana.', 'Zira')
      : [{ type: 'dialogue', script: C2_ZIRA }, { type: 'setFlag', flag: C2.zira }];
    if (id === 'carving_a') return say('C2-CARVING-A', 'Ukiran pertama: garis retak menembus lambang tua. Tepi kayunya diperbaiki berulang kali.');
    if (id === 'carving_b') return say('C2-CARVING-B', 'Ukiran kedua: dua jalur mendekat, tetapi bagian tengahnya sudah aus.');
    if (id === 'village_guard') return say('C2-GUARD', this.has(C2.zira) ? 'Zira mengizinkanmu lewat? Ikuti batu penanda, jangan jejak penebang yang baru.' : 'Surat ratu itu cukup. Zira biasanya memperbaiki bingkai di tengah desa.', 'Penjaga desa');
    if (id === 'drying_worker') return say('C2-WORKER', 'Kayu ini dijemur untuk bingkai Zira. Yang lembap kusisihkan agar tidak merusak ukiran.', 'Pekerja kayu');
    if (id === 'liora_to_forest') return this.has(C2.zira) ? [{ type: 'changeArea', area: 'forest_2' }] : [{ type: 'toast', text: 'Temui Zira dulu.' }];
    if (id === 'liora_to_city') return [{ type: 'changeArea', area: 'aveloria' }];
    return [];
  }
  private forest(id: string): StoryAction[] {
    if (id === 'forest2_marker') return this.has(C2.forest) ? [{ type: 'dialogue', script: C2_STONE }]
      : [{ type: 'dialogue', script: C2_STONE }, { type: 'dialogue', script: C2_NAME_ECHO }, { type: 'setFlag', flag: IDENTITY_FLAG },
        { type: 'dialogue', script: C2_NAME_FOUND }, { type: 'setFlag', flag: C2.forest }];
    if (id === 'torvan') return this.has(C2.forest) && !this.has(C2.torvan)
      ? [{ type: 'dialogue', script: C2_TORVAN }, { type: 'joinTorvan' }]
      : say('C2-05-BLOCKED', 'Batu penanda di barat masih perlu diperiksa.');
    if (id === 'forest2_second_marker') return this.has(C2.secondMarker) ? say('C2-MARKER-REPEAT', 'Bekas penanda ini lebih tua dari jejak penebang di selatan.')
      : [{ type: 'dialogue', script: { id: 'C2-MARKER-SECOND', nodes: [c2Draft('C2-MARKER-X001', 'Dua garis pada batu ini berhenti sebelum lambang yang tertutup lumut. Jalan lama berbelok ke timur.')] } }, { type: 'setFlag', flag: C2.secondMarker }];
    if (id === 'forest2_rest') return [{ type: 'restParty' }, { type: 'toast', text: 'HP dan MP party pulih.' }];
    if (id === 'forest2_patrol') {
      if (!this.has(C2.tutorial)) return [{ type: 'toast', text: 'Jejak ini mengarah ke jalan yang belum aman.' }];
      if (this.has(C2.patrol)) return [{ type: 'toast', text: 'Patroli itu telah pergi. Jalan kembali tenang.' }];
      const data = this.state.snapshot()!;
      if (data.playtimeSec - (data.world.lastChapter2EncounterSec ?? 0) < 20) return [{ type: 'toast', text: 'Jejaknya masih segar. Periksa lagi setelah menjelajah.' }];
      return [{ type: 'battle', encounter: 'forest2_patrol' }];
    }
    if (id === 'veyrath') return this.has(C2.tutorial) && this.has(C2.secondMarker) && !this.has(C2.veyrath) ? this.veyrath()
      : [{ type: 'toast', text: 'Periksa jalur lama lebih dulu.' }];
    if (id === 'fragment_a' && this.has(C2.veyrath)) return this.has(C2.fragmentA) ? say('C2-08-A-REPEAT', 'Catatan penjaga lama itu menyebut Varlgrim, tetapi sebagian teks hilang.')
      : [{ type: 'dialogue', script: C2_FRAGMENT_A }, { type: 'setFlag', flag: C2.fragmentA }];
    if (id === 'fragment_b' && this.has(C2.fragmentA)) return this.has(C2.fragments) ? say('C2-08-B-REPEAT', 'Baris ramalan yang dicoret belum dapat dipulihkan dari fragmen ini.')
      : [{ type: 'dialogue', script: C2_FRAGMENT_B }, { type: 'setFlag', flag: C2.fragments }];
    if (id === 'forest2_to_city' && this.has(C2.fragments)) return [{ type: 'changeArea', area: 'aveloria' }];
    if (id === 'forest2_return') return [{ type: 'changeArea', area: 'liora' }];
    return [];
  }
  private veyrath(): StoryAction[] { return [{ type: 'dialogue', script: C2_VEYRATH_INTRO }, { type: 'battle', encounter: 'veyrath' }]; }
}
