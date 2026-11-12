/**
 * Tabel spesifikasi VFX (data murni, bisa diperiksa tes). Satu `VfxSpec` per id efek; tiap spec terdiri dari layer:
 *  - anim   : sprite diam yang menelusuri frame atlas
 *  - burst  : partikel diskret (balistik / naik / berkumpul), tiap partikel = SATU sprite dari frame atlas
 *  - travel : proyektil dari sumber ke target (+ jejak hantu diskret)
 *  - link   : rangkaian simpul di sepanjang lengkung antara dua titik (velthia_concord)
 * Phase 8 menambah: layer `descent` (benda jatuh membesar menurut kemajuan: meteor), `loop` + `persistent` (efek yang berjalan sampai
 * Vfx.start().stop()), `byLevel`/`minLevel` (tingkat 1..3 lewat opts.level: retak Perlindungan).
 * plus `children` (efek lain yang dipicu) dan `shake` (callback guncangan kamera panggung, opsional).
 *
 * Konvensi arah: seni digambar menghadap KANAN. Posisi dx dan sudut partikel bersifat relatif-arah (0 derajat = depan,
 * -90 = atas layar); `flip:true` mencerminkan semuanya (dipakai Yaric yang berdiri di kanan dan menghadap kiri).
 */
export type VfxAnchor = 'source' | 'target';

interface LayerBase {
  /** jeda sebelum layer mulai (ms) */
  delayMs?: number;
  /** titik acuan: sumber (x,y pemanggilan) atau target (opts.target) */
  at?: VfxAnchor;
  dx?: number;
  dy?: number;
  /** offset depth terhadap depth dasar efek (negatif = di bawah petarung) */
  depth?: number;
  /** layer hanya dijalankan bila opts.level >= minLevel (bawaan level = 1) */
  minLevel?: 1 | 2 | 3;
}
export interface AnimLayer extends LayerBase {
  kind: 'anim';
  frames: readonly string[];
  frameMs: number | readonly number[];
  loops?: number;
  /** berputar tanpa henti (hanya untuk spec `persistent`); stop() mengganti ke frame exit spec */
  loop?: boolean;
  /** frame menurut opts.level (indeks 0 = level 1); `frames` tetap diisi sebagai acuan (= level 1) */
  byLevel?: readonly (readonly string[])[];
  instances?: readonly { dx: number; dy: number; delayMs?: number; flip?: boolean; depth?: number }[];
}
export interface BurstLayer extends LayerBase {
  kind: 'burst';
  motion: 'ballistic' | 'gather';
  frames: readonly string[];
  /** frame pengganti 120 ms terakhir (mis. kerikil) */
  endFrame?: string;
  /** frame dipilih menurut umur (bukan acak): untuk gelembung */
  animate?: boolean;
  count: number;
  /** jendela waktu kemunculan (0 = serentak) */
  spawnMs?: number;
  lifeMs: readonly [number, number];
  /** px/detik */
  speed: readonly [number, number];
  /** derajat relatif arah hadap: 0 = depan, -90 = atas; rentang boleh melewati -180..180 */
  angle: readonly [number, number];
  /** px/detik^2 (positif = turun, negatif = naik) */
  gravity?: number;
  spawnRx?: number;
  spawnRy?: number;
  sway?: { amp: number; hz: number };
  /** tanah relatif y awal: partikel berhenti/memantul di sini */
  groundDy?: number;
  bounce?: number;
  /** gather: radius cincin asal partikel dan pemipihan elips */
  ring?: number;
  squash?: number;
}
export interface TravelLayer extends LayerBase {
  kind: 'travel';
  frames: readonly string[];
  frameMs: number;
  durationMs: number;
  ease: 'linear' | 'out' | 'in';
  /** jarak bila opts.target tidak diberikan */
  defaultReach: number;
  /** angkat lintasan (px, ke atas) di tengah perjalanan */
  arc?: number;
  trail?: { frames: readonly string[]; everyMs: number; lifeMs: number };
}
export interface LinkLayer extends LayerBase {
  kind: 'link';
  nodeFrames: readonly string[];
  endFrames: readonly string[];
  growMs: number;
  holdMs: number;
  shrinkMs: number;
  spacing: number;
  lift: number;
  maxNodes: number;
  endFrameMs: number;
}
/** benda jatuh dari titik awal ke titik tabrak (anchor layer): frame dipilih menurut kemajuan (makin dekat makin besar) */
export interface DescentLayer extends LayerBase {
  kind: 'descent';
  /** urut kecil -> besar */
  frames: readonly string[];
  /** durasi bawaan (ms); opts.durationMs menggantikan */
  defaultDurationMs: number;
  /** tinggi awal di atas titik tabrak bila opts.from kosong (px, dikali scale) */
  fallPx: number;
  /** pergeseran x awal searah hadap bila opts.from kosong */
  defaultDx?: number;
  trail?: { frames: readonly string[]; everyMs: number; lifeMs: number; spread?: number };
}
export type VfxLayer = AnimLayer | BurstLayer | TravelLayer | LinkLayer | DescentLayer;

export interface VfxChild { id: string; delayMs?: number; dx?: number; dy?: number; at?: VfxAnchor }

export interface VfxSpec {
  id: string;
  /** kunci atlas (VFX_ATLASES) tempat semua frame layer berada */
  atlas: string;
  /** batas atas durasi (ms); efek dihentikan paksa setelah ini */
  durationMs: number;
  /** batas atas sprite aktif bersamaan oleh efek ini (termasuk anak) */
  maxParticles: number;
  /** efek berkilau tinggi: diganti varian tenang bila Reduced Flashes aktif */
  flashy: boolean;
  /** depth dasar (panggung < 20) */
  depth?: number;
  layers: readonly VfxLayer[];
  children?: readonly VfxChild[];
  /** guncangan kamera panggung (dipanggil lewat opsi screenShake) */
  shake?: { ms: number; intensity: number; delayMs?: number };
  /** efek persisten (layer anim `loop`): berjalan sampai stop(); exit = frame peluruhan piksel. Via play() berhenti sendiri di durationMs. */
  persistent?: { exit: { frames: readonly string[]; frameMs: number } };
  /** varian tenang: pemetaan nama frame + skala jumlah partikel */
  calm?: { frameMap: Readonly<Record<string, string>>; particleScale: number };
}

const seq = (prefix: string, from: number, to: number, suffix = ''): string[] => Array.from({ length: to - from + 1 }, (_, i) => `${prefix}_${from + i}${suffix}`);
const calmMap = (prefix: string, nums: number[]): Record<string, string> => Object.fromEntries(nums.map((n) => [`${prefix}_${n}`, `${prefix}_${n}_c`]));
const ALL: readonly [number, number] = [-180, 180];

const specs: VfxSpec[] = [
  // ------------------------------------------------ Yaric / umum
  { id: 'greatsword_trail', atlas: 'vfx_combat', durationMs: 260, maxParticles: 1, flashy: true,
    layers: [{ kind: 'anim', frames: seq('gs', 1, 5), frameMs: 45 }],
    calm: { frameMap: calmMap('gs', [1, 2, 3, 4, 5]), particleScale: 1 } },
  { id: 'impact_hit', atlas: 'vfx_combat', durationMs: 340, maxParticles: 7, flashy: true,
    layers: [
      { kind: 'anim', frames: seq('hit', 1, 4), frameMs: 50 },
      { kind: 'burst', motion: 'ballistic', frames: ['spark_a', 'spark_b', 'spark_c'], count: 6, lifeMs: [140, 260], speed: [60, 130], angle: ALL, gravity: 200 },
    ],
    calm: { frameMap: calmMap('hit', [1, 2]), particleScale: 0.5 } },
  { id: 'impact_heavy', atlas: 'vfx_combat', durationMs: 520, maxParticles: 9, flashy: true,
    shake: { ms: 120, intensity: 0.005 },
    layers: [
      { kind: 'anim', frames: seq('hvy', 1, 5), frameMs: [50, 55, 60, 70, 90] },
      { kind: 'burst', motion: 'ballistic', frames: ['deb_stone_c', 'deb_pebble', 'spark_a'], count: 8, lifeMs: [250, 450], speed: [90, 180], angle: [-170, -10], gravity: 520 },
    ],
    calm: { frameMap: calmMap('hvy', [1, 2]), particleScale: 0.5 } },
  { id: 'ground_slam_crack', atlas: 'vfx_combat', durationMs: 1150, maxParticles: 19, flashy: false,
    shake: { ms: 160, intensity: 0.007 },
    layers: [{ kind: 'anim', frames: seq('crack', 1, 7), frameMs: [45, 45, 50, 55, 65, 420, 220], depth: -7 }],
    children: [{ id: 'dust_puff', delayMs: 30, dx: -30 }, { id: 'dust_puff', delayMs: 70, dx: 30 }, { id: 'debris_burst', delayMs: 80 }] },
  { id: 'debris_burst', atlas: 'vfx_combat', durationMs: 1000, maxParticles: 14, flashy: false,
    layers: [{ kind: 'burst', motion: 'ballistic', frames: ['deb_stone_a', 'deb_stone_b', 'deb_stone_c', 'deb_dirt_a', 'deb_dirt_b', 'deb_slab'], endFrame: 'deb_pebble',
      count: 14, lifeMs: [650, 950], speed: [80, 200], angle: [-125, -55], gravity: 560, spawnRx: 10, groundDy: 10, bounce: 0.3 }] },
  { id: 'dust_puff', atlas: 'vfx_combat', durationMs: 420, maxParticles: 2, flashy: false,
    layers: [{ kind: 'anim', frames: seq('dust', 1, 5), frameMs: 70, instances: [{ dx: -8, dy: 0 }, { dx: 8, dy: 0, delayMs: 50, flip: true }] }] },

  // ------------------------------------------------ Torvan (sudut tajam, hijau/cokelat)
  { id: 'torvan_leaf_bolt', atlas: 'vfx_nature', durationMs: 780, maxParticles: 14, flashy: false,
    layers: [
      { kind: 'travel', frames: seq('nbolt', 1, 3), frameMs: 60, durationMs: 340, ease: 'linear', defaultReach: 96, arc: 8,
        trail: { frames: ['nleaf_a', 'nleaf_b', 'nleaf_c'], everyMs: 66, lifeMs: 260 } },
      { kind: 'anim', frames: seq('nburst', 1, 4), frameMs: 60, delayMs: 340, at: 'target' },
      { kind: 'burst', motion: 'ballistic', frames: ['nleaf_a', 'nleaf_b', 'nleaf_c', 'ntwig_a', 'ntwig_b'], count: 7, delayMs: 340, at: 'target', lifeMs: [250, 420], speed: [50, 120], angle: ALL, gravity: 260 },
    ] },
  { id: 'torvan_vine', atlas: 'vfx_nature', durationMs: 900, maxParticles: 7, flashy: false,
    layers: [
      { kind: 'anim', frames: seq('nvine', 1, 7), frameMs: [70, 70, 70, 70, 90, 380, 110] },
      { kind: 'burst', motion: 'ballistic', frames: ['ndirt_a', 'ndirt_b', 'nspore'], count: 6, delayMs: 60, lifeMs: [250, 400], speed: [40, 90], angle: [-150, -30], gravity: 300, spawnRx: 10 },
    ] },
  { id: 'torvan_support', atlas: 'vfx_nature', durationMs: 1320, maxParticles: 7, flashy: false,
    layers: [
      { kind: 'anim', frames: seq('nsup', 1, 6), frameMs: [80, 80, 80, 80, 260, 120] },
      { kind: 'burst', motion: 'ballistic', frames: ['nspore', 'nleaf_a', 'nleaf_b'], count: 6, delayMs: 100, spawnMs: 400, lifeMs: [500, 800], speed: [18, 34], angle: [-100, -80],
        gravity: -4, spawnRx: 10, spawnRy: 6, dy: 8, sway: { amp: 3, hz: 1.2 } },
    ] },
  { id: 'forest_summon_small', atlas: 'vfx_nature', durationMs: 760, maxParticles: 9, flashy: false,
    layers: [
      { kind: 'anim', frames: seq('nsum', 1, 7), frameMs: [60, 60, 60, 70, 300, 90, 90] },
      { kind: 'burst', motion: 'ballistic', frames: ['ndirt_a', 'ndirt_b', 'nleaf_a', 'nleaf_b'], count: 8, delayMs: 80, lifeMs: [300, 500], speed: [50, 110], angle: [-160, -20], gravity: 340 },
    ] },

  // ------------------------------------------------ Velthia (lengkung, simetris, plum + lime + emas pucat)
  { id: 'velthia_pulse', atlas: 'vfx_velthia', durationMs: 660, maxParticles: 3, flashy: true,
    layers: [
      { kind: 'anim', frames: seq('vpalm', 1, 4), frameMs: 70 },
      { kind: 'travel', frames: seq('varc', 1, 3), frameMs: 70, delayMs: 180, durationMs: 240, ease: 'out', defaultReach: 88 },
      { kind: 'anim', frames: seq('vhit', 1, 4), frameMs: 55, delayMs: 420, at: 'target' },
    ],
    calm: { frameMap: { ...calmMap('varc', [1, 2, 3]), ...calmMap('vhit', [1, 2]) }, particleScale: 1 } },
  { id: 'velthia_mend', atlas: 'vfx_velthia', durationMs: 1420, maxParticles: 13, flashy: false,
    layers: [
      { kind: 'anim', frames: seq('vmend', 1, 4), frameMs: 80, depth: -3, instances: [{ dx: 0, dy: 14 }, { dx: 0, dy: 14, delayMs: 220 }, { dx: 0, dy: 14, delayMs: 440 }] },
      { kind: 'burst', motion: 'ballistic', frames: ['vmote_a', 'vmote_c', 'vmote_d', 'vmote_b'], count: 10, spawnMs: 500, lifeMs: [600, 900], speed: [26, 44], angle: [-95, -85],
        gravity: -4, spawnRx: 14, spawnRy: 8, dy: 10, sway: { amp: 3, hz: 1.5 } },
    ] },
  { id: 'velthia_ward', atlas: 'vfx_velthia', durationMs: 900, maxParticles: 5, flashy: false,
    layers: [{ kind: 'anim', frames: seq('vward', 1, 6), frameMs: [70, 70, 70, 90, 420, 160] }],
    children: [{ id: 'shield_hit_spark', delayMs: 330 }] },
  { id: 'velthia_bloom', atlas: 'vfx_velthia', durationMs: 1200, maxParticles: 9, flashy: false,
    layers: [
      { kind: 'anim', frames: seq('vbloom', 1, 7), frameMs: [80, 80, 80, 80, 80, 260, 140] },
      { kind: 'burst', motion: 'ballistic', frames: ['vpetal_a', 'vpetal_b', 'vpetal_c'], count: 8, delayMs: 380, lifeMs: [500, 800], speed: [20, 45], angle: [-150, -30],
        gravity: 80, spawnRx: 8, dy: -20, sway: { amp: 2, hz: 1.2 } },
    ] },
  { id: 'velthia_concord', atlas: 'vfx_velthia', durationMs: 1080, maxParticles: 18, flashy: false,
    layers: [{ kind: 'link', nodeFrames: seq('vnode', 1, 3), endFrames: seq('vsigil', 1, 4), growMs: 260, holdMs: 560, shrinkMs: 240, spacing: 9, lift: 10, maxNodes: 16, endFrameMs: 100 }] },
  { id: 'shield_hit_spark', atlas: 'vfx_velthia', durationMs: 200, maxParticles: 1, flashy: true,
    layers: [{ kind: 'anim', frames: seq('vspark', 1, 4), frameMs: 45 }],
    calm: { frameMap: calmMap('vspark', [1, 2]), particleScale: 1 } },
  { id: 'heal_sparkle', atlas: 'vfx_velthia', durationMs: 1220, maxParticles: 8, flashy: false,
    layers: [{ kind: 'burst', motion: 'ballistic', frames: ['vmote_a', 'vmote_b', 'vmote_c', 'vmote_d'], count: 8, spawnMs: 400, lifeMs: [500, 800], speed: [22, 40], angle: [-100, -80],
      gravity: -4, spawnRx: 12, spawnRy: 8, dy: 6, sway: { amp: 2, hz: 1.5 } }] },

  // ------------------------------------------------ musuh
  { id: 'hollowling_claw', atlas: 'vfx_enemy', durationMs: 440, maxParticles: 7, flashy: false,
    layers: [
      { kind: 'anim', frames: seq('hclaw', 1, 5), frameMs: [50, 50, 60, 80, 90] },
      { kind: 'burst', motion: 'ballistic', frames: ['hshard_a', 'hshard_b'], count: 6, delayMs: 100, lifeMs: [200, 320], speed: [50, 110], angle: ALL, gravity: 260 },
    ] },
  { id: 'mournfang_slash', atlas: 'vfx_enemy', durationMs: 540, maxParticles: 9, flashy: false,
    shake: { ms: 110, intensity: 0.004, delayMs: 90 },
    layers: [
      { kind: 'anim', frames: seq('mslash', 1, 6), frameMs: [45, 45, 50, 55, 70, 160] },
      { kind: 'burst', motion: 'ballistic', frames: ['mshard_a', 'mshard_b'], count: 8, delayMs: 100, lifeMs: [250, 420], speed: [70, 150], angle: [-160, -20], gravity: 380 },
    ] },
  { id: 'veyrath_strike', atlas: 'vfx_enemy', durationMs: 470, maxParticles: 7, flashy: false,
    layers: [
      { kind: 'anim', frames: seq('vstrike', 1, 6), frameMs: [40, 40, 60, 70, 60, 90] },
      { kind: 'burst', motion: 'ballistic', frames: ['ysp_a', 'ysp_b'], count: 6, delayMs: 190, lifeMs: [150, 260], speed: [60, 130], angle: [-60, 60], gravity: 100 },
    ] },
  { id: 'status_poison', atlas: 'vfx_enemy', durationMs: 1420, maxParticles: 7, flashy: false,
    layers: [
      { kind: 'anim', frames: seq('pcloud', 1, 4), frameMs: 120, loops: 2, depth: 1 },
      { kind: 'burst', motion: 'ballistic', frames: seq('pbub', 1, 4), animate: true, count: 6, spawnMs: 600, lifeMs: [500, 800], speed: [14, 26], angle: [-100, -80],
        gravity: -2, spawnRx: 10, spawnRy: 4, dy: 4, sway: { amp: 2, hz: 1.4 } },
    ] },

  // ------------------------------------------------ Chronolith
  { id: 'chronolith_charge', atlas: 'vfx_chrono', durationMs: 1080, maxParticles: 15, flashy: true,
    layers: [
      { kind: 'anim', frames: seq('ccharge', 1, 8), frameMs: [90, 90, 90, 90, 90, 90, 100, 160] },
      { kind: 'burst', motion: 'gather', frames: ['cmote_a', 'cmote_b', 'cmote_c'], count: 14, spawnMs: 560, lifeMs: [350, 500], speed: [0, 0], angle: [0, 0], ring: 30, squash: 0.8 },
    ],
    calm: { frameMap: calmMap('ccharge', [5, 6, 7, 8]), particleScale: 0.5 } },
  { id: 'chronolith_slam', atlas: 'vfx_chrono', durationMs: 1060, maxParticles: 25, flashy: false,
    shake: { ms: 200, intensity: 0.009, delayMs: 20 },
    layers: [
      { kind: 'anim', frames: seq('cslam', 1, 7), frameMs: [50, 50, 55, 60, 70, 90, 120], depth: -7 },
      { kind: 'anim', frames: seq('cpillar', 1, 4), frameMs: [60, 60, 160, 90], depth: 1, instances: [
        { dx: -36, dy: 12, delayMs: 30 }, { dx: -18, dy: 15, delayMs: 60 }, { dx: 18, dy: 15, delayMs: 90, flip: true }, { dx: 36, dy: 12, delayMs: 120, flip: true }, { dx: 0, dy: 16, delayMs: 150 }] },
    ],
    children: [{ id: 'debris_burst', delayMs: 40 }, { id: 'dust_puff', delayMs: 80, dx: -40 }, { id: 'dust_puff', delayMs: 100, dx: 40 }] },
  { id: 'chronolith_temporal', atlas: 'vfx_chrono', durationMs: 700, maxParticles: 9, flashy: false,
    layers: [
      { kind: 'anim', frames: seq('crewind', 1, 7), frameMs: 80 },
      { kind: 'burst', motion: 'gather', frames: ['cmote_c'], count: 8, spawnMs: 320, lifeMs: [250, 350], speed: [0, 0], angle: [0, 0], ring: 34, squash: 0.36 },
    ] },

  // ================================================ Phase 8 (Bab IV): Varlgrim, Riftborn, Gravorn, meteor, Perlindungan, Heart
  // ------------------------------------------------ Varlgrim (atlas vfx_varlgrim; kayu + jeda teal + amber)
  { id: 'temporal_bind', atlas: 'vfx_varlgrim', durationMs: 900, maxParticles: 9, flashy: false,
    layers: [
      { kind: 'anim', frames: seq('tbind', 1, 6), frameMs: [70, 70, 70, 80, 420, 100] },
      { kind: 'burst', motion: 'gather', frames: ['tmote_a', 'tmote_b'], count: 8, spawnMs: 240, lifeMs: [250, 340], speed: [0, 0], angle: [0, 0], ring: 30, squash: 0.9 },
    ] },
  { id: 'time_distortion', atlas: 'vfx_varlgrim', durationMs: 850, maxParticles: 8, flashy: true,
    layers: [
      { kind: 'anim', frames: seq('tdist', 1, 6), frameMs: [60, 70, 80, 90, 90, 100] },
      { kind: 'burst', motion: 'ballistic', frames: ['tmote_a', 'tmote_b'], count: 7, delayMs: 120, spawnMs: 240, lifeMs: [300, 460], speed: [18, 40], angle: ALL, gravity: 0, spawnRx: 50, spawnRy: 20 },
    ],
    calm: { frameMap: calmMap('tdist', [2, 3, 4]), particleScale: 0.5 } },
  { id: 'staff_impact', atlas: 'vfx_varlgrim', durationMs: 640, maxParticles: 7, flashy: true,
    shake: { ms: 110, intensity: 0.005 },
    layers: [
      { kind: 'anim', frames: seq('simp', 1, 5), frameMs: [50, 60, 70, 80, 120] },
      { kind: 'burst', motion: 'ballistic', frames: ['tsplint_a', 'tsplint_b', 'tdust_p'], count: 6, delayMs: 40, lifeMs: [250, 420], speed: [70, 140], angle: [-165, -15], gravity: 420 },
    ],
    calm: { frameMap: calmMap('simp', [1, 2]), particleScale: 0.5 } },
  { id: 'fracture_mark', atlas: 'vfx_varlgrim', durationMs: 3000, maxParticles: 1, flashy: false,
    persistent: { exit: { frames: ['fmark_x1', 'fmark_x2', 'fmark_x3'], frameMs: 70 } },
    layers: [{ kind: 'anim', frames: seq('fmark', 1, 4), frameMs: 140, loop: true }] },
  { id: 'fracture_strike', atlas: 'vfx_varlgrim', durationMs: 640, maxParticles: 7, flashy: true,
    shake: { ms: 80, intensity: 0.004, delayMs: 40 },
    layers: [
      { kind: 'anim', frames: seq('fstr', 1, 6), frameMs: [40, 60, 60, 70, 80, 100] },
      { kind: 'burst', motion: 'ballistic', frames: ['tmote_a', 'tmote_b'], count: 6, delayMs: 60, lifeMs: [200, 340], speed: [40, 100], angle: ALL, gravity: 120, spawnRx: 8, spawnRy: 20 },
    ],
    calm: { frameMap: calmMap('fstr', [2, 3]), particleScale: 0.5 } },
  { id: 'seal_pulse', atlas: 'vfx_varlgrim', durationMs: 1000, maxParticles: 10, flashy: true,
    layers: [
      { kind: 'anim', frames: seq('spsrc', 1, 4), frameMs: [60, 70, 80, 120], depth: -7 },
      { kind: 'travel', frames: seq('spwave', 1, 3), frameMs: 70, delayMs: 120, durationMs: 360, ease: 'linear', defaultReach: 200, trail: { frames: ['tmote_a', 'tmote_b'], everyMs: 66, lifeMs: 200 } },
      { kind: 'anim', frames: seq('sphit', 1, 5), frameMs: [50, 60, 80, 100, 120], delayMs: 480, at: 'target', depth: -7 },
    ],
    calm: { frameMap: calmMap('sphit', [1, 2, 3]), particleScale: 1 } },
  { id: 'phase_shift', atlas: 'vfx_varlgrim', durationMs: 1000, maxParticles: 7, flashy: true,
    layers: [
      { kind: 'anim', frames: seq('pshift', 1, 8), frameMs: [60, 60, 60, 70, 70, 80, 80, 100] },
      { kind: 'burst', motion: 'ballistic', frames: ['tmote_b', 'tmote_a'], count: 6, delayMs: 100, spawnMs: 300, lifeMs: [400, 600], speed: [20, 40], angle: [-100, -80], gravity: -4, spawnRx: 20, spawnRy: 10 },
    ],
    calm: { frameMap: calmMap('pshift', [2, 3, 4, 5, 6]), particleScale: 0.5 } },
  { id: 'keeper_stance', atlas: 'vfx_varlgrim', durationMs: 800, maxParticles: 7, flashy: false, depth: 3,
    shake: { ms: 90, intensity: 0.003, delayMs: 60 },
    layers: [
      { kind: 'anim', frames: seq('kstance', 1, 5), frameMs: [60, 60, 70, 300, 160] },
      { kind: 'burst', motion: 'ballistic', frames: ['tdust_p', 'tsplint_b'], count: 6, delayMs: 80, lifeMs: [250, 400], speed: [30, 70], angle: [-150, -30], gravity: 240, spawnRx: 14 },
    ] },

  // ------------------------------------------------ Riftborn + Gravorn (atlas vfx_rift)
  { id: 'riftborn_lash', atlas: 'vfx_rift', durationMs: 460, maxParticles: 7, flashy: false,
    layers: [
      { kind: 'anim', frames: seq('rlash', 1, 5), frameMs: [40, 50, 60, 60, 80] },
      { kind: 'burst', motion: 'ballistic', frames: ['rshard_a', 'rshard_b', 'rshard_c'], count: 6, delayMs: 80, lifeMs: [150, 260], speed: [50, 110], angle: ALL, gravity: 200 },
    ] },
  { id: 'riftborn_surge', atlas: 'vfx_rift', durationMs: 720, maxParticles: 9, flashy: true,
    shake: { ms: 110, intensity: 0.005, delayMs: 100 },
    layers: [
      { kind: 'anim', frames: seq('rsurge', 1, 7), frameMs: [50, 60, 70, 90, 70, 70, 90] },
      { kind: 'burst', motion: 'ballistic', frames: ['rshard_a', 'rshard_b', 'rshard_c'], count: 8, delayMs: 120, lifeMs: [250, 420], speed: [60, 130], angle: [-170, -10], gravity: 300 },
    ],
    calm: { frameMap: calmMap('rsurge', [3, 4, 5]), particleScale: 0.5 } },
  { id: 'gravorn_slam', atlas: 'vfx_rift', durationMs: 900, maxParticles: 8, flashy: false,
    shake: { ms: 150, intensity: 0.007, delayMs: 140 },
    layers: [
      { kind: 'anim', frames: seq('gslam', 1, 7), frameMs: [70, 70, 50, 60, 70, 90, 150] },
      { kind: 'burst', motion: 'ballistic', frames: ['gchip_a', 'gchip_b'], count: 7, delayMs: 140, lifeMs: [300, 500], speed: [80, 160], angle: [-150, -30], gravity: 520, spawnRx: 10 },
    ] },

  // ------------------------------------------------ Meteor Varlgrim (atlas vfx_meteor; (x,y) sky_hold = pusat siluet, descent/impact/aftermath = titik tabrak di tanah)
  { id: 'meteor_sky_hold', atlas: 'vfx_meteor', durationMs: 6000, maxParticles: 1, flashy: false, depth: 3,
    persistent: { exit: { frames: ['mhold_x1', 'mhold_x2', 'mhold_x3'], frameMs: 90 } },
    layers: [{ kind: 'anim', frames: seq('mhold', 1, 6), frameMs: 200, loop: true }] },
  { id: 'meteor_descent', atlas: 'vfx_meteor', durationMs: 1700, maxParticles: 12, flashy: false, depth: 12,
    layers: [{ kind: 'descent', frames: seq('mdesc', 1, 6), defaultDurationMs: 1200, fallPx: 260,
      trail: { frames: ['mem_a', 'mem_b', 'mem_c', 'mrock_a', 'mash_a'], everyMs: 66, lifeMs: 420, spread: 46 } }] },
  { id: 'meteor_impact', atlas: 'vfx_meteor', durationMs: 1500, maxParticles: 30, flashy: true, depth: 11,
    shake: { ms: 280, intensity: 0.012 },
    layers: [
      { kind: 'anim', frames: seq('mimp', 1, 6), frameMs: [60, 70, 90, 100, 140, 200] },
      { kind: 'anim', frames: seq('mring', 1, 6), frameMs: [60, 70, 80, 90, 100, 120], delayMs: 40, depth: -5 },
      { kind: 'anim', frames: seq('mcrack', 1, 5), frameMs: [60, 70, 80, 100, 700], delayMs: 40, depth: -8 },
      { kind: 'burst', motion: 'ballistic', frames: ['mrock_a', 'mrock_b', 'mrock_c', 'mrock_d'], count: 10, lifeMs: [500, 900], speed: [110, 260], angle: [-165, -15], gravity: 520, spawnRx: 20, groundDy: 6, bounce: 0.3 },
      { kind: 'burst', motion: 'ballistic', frames: ['mem_a', 'mem_b', 'mem_c'], count: 8, lifeMs: [400, 800], speed: [60, 180], angle: [-170, -10], gravity: 160, spawnRx: 14 },
      { kind: 'burst', motion: 'ballistic', frames: ['mash_a', 'mash_b'], count: 8, delayMs: 100, spawnMs: 200, lifeMs: [700, 1100], speed: [20, 60], angle: [-150, -30], gravity: -10, spawnRx: 60 },
    ],
    calm: { frameMap: calmMap('mimp', [1, 2]), particleScale: 0.5 } },
  { id: 'meteor_aftermath', atlas: 'vfx_meteor', durationMs: 3400, maxParticles: 25, flashy: false, depth: 11,
    layers: [
      { kind: 'anim', frames: seq('maft', 1, 5), frameMs: [500, 500, 500, 500, 400], depth: -8 },
      { kind: 'burst', motion: 'ballistic', frames: seq('msmk', 1, 4), animate: true, count: 8, spawnMs: 1400, lifeMs: [1400, 1900], speed: [10, 24], angle: [-105, -75], gravity: -6, spawnRx: 70, spawnRy: 4, sway: { amp: 3, hz: 0.6 } },
      { kind: 'burst', motion: 'ballistic', frames: ['mem_a', 'mem_b', 'mem_c'], count: 8, spawnMs: 1200, lifeMs: [800, 1400], speed: [14, 36], angle: [-110, -70], gravity: -4, spawnRx: 60, sway: { amp: 2, hz: 0.8 } },
      { kind: 'burst', motion: 'ballistic', frames: ['mash_a', 'mash_b'], count: 8, spawnMs: 1800, lifeMs: [1000, 1500], speed: [10, 20], angle: [-120, -60], gravity: 10, spawnRx: 90, spawnRy: 10, sway: { amp: 2, hz: 0.5 } },
    ] },

  // ------------------------------------------------ Perlindungan / Aegis (atlas vfx_aegis; (x,y) form/hold/stress/fade = titik tengah garis tanah KEDUA sekutu)
  { id: 'aegis_charge', atlas: 'vfx_aegis', durationMs: 1000, maxParticles: 13, flashy: true,
    layers: [
      { kind: 'anim', frames: seq('acharge', 1, 6), frameMs: [70, 80, 90, 110, 140, 160] },
      { kind: 'burst', motion: 'gather', frames: ['amote_a', 'amote_b'], count: 12, spawnMs: 450, lifeMs: [250, 400], speed: [0, 0], angle: [0, 0], ring: 34, squash: 0.8 },
    ],
    calm: { frameMap: calmMap('acharge', [4, 5, 6]), particleScale: 0.5 } },
  { id: 'aegis_form', atlas: 'vfx_aegis', durationMs: 1600, maxParticles: 11, flashy: true, depth: 11,
    layers: [
      { kind: 'anim', frames: seq('aform', 1, 8), frameMs: [60, 70, 80, 90, 110, 110, 110, 200] },
      { kind: 'burst', motion: 'ballistic', frames: ['amote_b', 'amote_c', 'amote_a'], count: 10, delayMs: 350, spawnMs: 400, lifeMs: [500, 800], speed: [20, 50], angle: [-120, -60], gravity: -6, spawnRx: 70, spawnRy: 6, dy: -10 },
    ],
    calm: { frameMap: calmMap('aform', [5, 6, 7, 8]), particleScale: 0.5 } },
  { id: 'aegis_hold', atlas: 'vfx_aegis', durationMs: 6000, maxParticles: 1, flashy: false, depth: 11,
    persistent: { exit: { frames: seq('afade', 1, 4), frameMs: 70 } },
    layers: [{ kind: 'anim', frames: seq('ahold', 1, 4), frameMs: 220, loop: true }] },
  { id: 'aegis_stress', atlas: 'vfx_aegis', durationMs: 900, maxParticles: 19, flashy: false, depth: 12,
    shake: { ms: 140, intensity: 0.006 },
    layers: [
      { kind: 'anim', frames: seq('astress1', 1, 4), byLevel: [seq('astress1', 1, 4), seq('astress2', 1, 4), seq('astress3', 1, 4)], frameMs: [50, 60, 80, 160] },
      { kind: 'burst', motion: 'ballistic', frames: ['ashard_a', 'ashard_b', 'ashard_c'], count: 4, dy: -112, lifeMs: [300, 500], speed: [40, 100], angle: [-170, -10], gravity: 300, spawnRx: 10 },
      { kind: 'burst', motion: 'ballistic', frames: ['ashard_a', 'ashard_b', 'ashard_c'], count: 6, minLevel: 2, delayMs: 40, dy: -100, lifeMs: [300, 520], speed: [50, 120], angle: [-175, -5], gravity: 300, spawnRx: 40 },
      { kind: 'burst', motion: 'ballistic', frames: ['ashard_a', 'ashard_b', 'amote_c'], count: 8, minLevel: 3, delayMs: 80, dy: -80, lifeMs: [350, 600], speed: [50, 140], angle: [-175, -5], gravity: 320, spawnRx: 70 },
    ] },
  { id: 'aegis_fade', atlas: 'vfx_aegis', durationMs: 1200, maxParticles: 9, flashy: false, depth: 11,
    layers: [
      { kind: 'anim', frames: seq('afade', 1, 4), frameMs: [70, 80, 90, 110] },
      { kind: 'burst', motion: 'ballistic', frames: ['amote_a', 'amote_c'], count: 8, spawnMs: 250, lifeMs: [500, 800], speed: [18, 40], angle: [-110, -70], gravity: -4, spawnRx: 70, spawnRy: 20, sway: { amp: 2, hz: 1.2 } },
    ] },

  // ------------------------------------------------ Heart (atlas vfx_heart)
  { id: 'heart_lock_glow', atlas: 'vfx_heart', durationMs: 6000, maxParticles: 1, flashy: false,
    persistent: { exit: { frames: ['hlock_x1', 'hlock_x2', 'hlock_x3'], frameMs: 80 } },
    layers: [{ kind: 'anim', frames: seq('hlock', 1, 4), frameMs: 260, loop: true }] },
  { id: 'heart_unseal', atlas: 'vfx_heart', durationMs: 1400, maxParticles: 11, flashy: true,
    layers: [
      { kind: 'anim', frames: seq('hunseal', 1, 7), frameMs: [60, 70, 80, 100, 100, 100, 150] },
      { kind: 'burst', motion: 'ballistic', frames: ['hmote_a', 'hmote_b', 'hmote_c'], count: 10, delayMs: 150, spawnMs: 300, lifeMs: [600, 900], speed: [20, 50], angle: [-110, -70], gravity: -6, spawnRx: 14, dy: -20, sway: { amp: 2, hz: 1 } },
    ],
    calm: { frameMap: calmMap('hunseal', [3, 4, 5, 6]), particleScale: 0.5 } },
  { id: 'tower_dust', atlas: 'vfx_heart', durationMs: 2800, maxParticles: 1, flashy: false,
    layers: [{ kind: 'anim', frames: seq('tdustf', 1, 8), frameMs: [220, 260, 300, 320, 340, 360, 400, 500] }] },
];

export const VFX_SPECS: Readonly<Record<string, VfxSpec>> = Object.fromEntries(specs.map((s) => [s.id, s]));
export const VFX_IDS: readonly string[] = specs.map((s) => s.id);
/** Batas global sprite VFX aktif bersamaan (kontrak Phase 7). */
export const VFX_MAX_LIVE = 64;

// ---------------------------------------------------------------- analisis data (dipakai tes)
function layerPeak(l: VfxLayer): number {
  switch (l.kind) {
    case 'anim': return l.instances?.length ?? 1;
    case 'burst': return l.count;
    case 'travel': return 1 + (l.trail ? Math.ceil(l.trail.lifeMs / l.trail.everyMs) + 1 : 0);
    case 'link': return l.maxNodes + 2;
    case 'descent': return 1 + (l.trail ? Math.ceil(l.trail.lifeMs / l.trail.everyMs) + 1 : 0);
  }
}
function layerEnd(l: VfxLayer): number {
  const d = l.delayMs ?? 0;
  switch (l.kind) {
    case 'anim': {
      const total = (Array.isArray(l.frameMs) ? (l.frameMs as readonly number[]).reduce((a, b) => a + b, 0) : (l.frameMs as number) * l.frames.length) * (l.loops ?? 1);
      const lastInst = Math.max(0, ...(l.instances ?? []).map((i) => i.delayMs ?? 0));
      return d + lastInst + total;
    }
    case 'burst': return d + (l.spawnMs ?? 0) + l.lifeMs[1];
    case 'travel': return d + l.durationMs + (l.trail?.lifeMs ?? 0);
    case 'link': return d + l.growMs + l.holdMs + l.shrinkMs;
    case 'descent': return d + l.defaultDurationMs + (l.trail?.lifeMs ?? 0);
  }
}
/** Jumlah sprite puncak yang mungkin dipakai spec (termasuk efek anak). */
export function peakSprites(spec: VfxSpec): number {
  return spec.layers.reduce((a, l) => a + layerPeak(l), 0) + (spec.children ?? []).reduce((a, c) => a + peakSprites(VFX_SPECS[c.id]!), 0);
}
/** Waktu selesai terlama (ms) menurut data layer, anak, dan guncangan. */
export function specEndMs(spec: VfxSpec): number {
  const own = Math.max(0, ...spec.layers.map(layerEnd));
  const kids = (spec.children ?? []).map((c) => (c.delayMs ?? 0) + specEndMs(VFX_SPECS[c.id]!));
  return Math.max(own, ...kids, spec.shake ? (spec.shake.delayMs ?? 0) + spec.shake.ms : 0);
}
/** Semua nama frame yang dirujuk spec (termasuk frame varian tenang). */
export function specFrames(spec: VfxSpec): string[] {
  const out: string[] = [];
  for (const l of spec.layers) {
    if (l.kind === 'anim' && l.byLevel) for (const set of l.byLevel) out.push(...set);
    if (l.kind === 'anim' || l.kind === 'burst') { out.push(...l.frames); if (l.kind === 'burst' && l.endFrame) out.push(l.endFrame); }
    else if (l.kind === 'travel' || l.kind === 'descent') { out.push(...l.frames); if (l.trail) out.push(...l.trail.frames); }
    else out.push(...l.nodeFrames, ...l.endFrames);
  }
  if (spec.persistent) out.push(...spec.persistent.exit.frames);
  if (spec.calm) out.push(...Object.values(spec.calm.frameMap));
  return out;
}
