import { VELTHIA_COMMANDS } from '../story/chapter3Flags';

/**
 * Velthia (C02, Ratu Aveloria): penyihir tangan tanpa senjata. Semua angka DRAFT untuk playtest Chapter III.
 * Modul ini murni data/rumus agar BattleEngine, menu battle dan tes memakai satu sumber.
 * Ultimate Perlindungan (Chapter IV) TIDAK ada di sini; `velthia_ward` hanya memakai status `shield` yang
 * dirancang bisa dipakai ulang (amount + durasi) oleh Ultimate nanti.
 */
export type VelthiaCommand = (typeof VELTHIA_COMMANDS)[number];
/** enemy: satu musuh; ally: satu sekutu hidup (boleh diri sendiri); allies: semua sekutu hidup; yaric: khusus C01. */
export type VelthiaTarget = 'enemy' | 'ally' | 'allies' | 'yaric';
/** Petunjuk frame untuk BattleAtlas/presenter. */
export type VelthiaFrameKey = 'cast' | 'heal' | 'shield' | 'summon' | 'special';

export interface VelthiaSkillInfo {
  id: VelthiaCommand;
  name: string;
  description: string;
  /** Biaya MP. */
  mp: number;
  target: VelthiaTarget;
  /** Level minimal; terbuka otomatis saat level tercapai (tanpa poin jurus). */
  unlockLevel: number;
  frameKey: VelthiaFrameKey;
  /** Id VFX di pustaka `src/game/vfx` (sama dengan id perintah). */
  vfx: VelthiaCommand;
}

export const VELTHIA_SKILL_INFO: Readonly<Record<VelthiaCommand, VelthiaSkillInfo>> = {
  velthia_pulse: { id: 'velthia_pulse', name: 'Denyut Telapak', mp: 2, target: 'enemy', unlockLevel: 1, frameKey: 'cast', vfx: 'velthia_pulse',
    description: '2 MP. Satu lengkung cahaya dari telapak tangan menyerang satu musuh. Sihir: tidak terpengaruh DEF.' },
  velthia_mend: { id: 'velthia_mend', name: 'Sentuhan Pulih', mp: 4, target: 'ally', unlockLevel: 1, frameKey: 'heal', vfx: 'velthia_mend',
    description: '4 MP. Pulihkan HP satu sekutu (boleh diri sendiri). Tidak bisa dipakai pada HP penuh atau sekutu tumbang.' },
  velthia_ward: { id: 'velthia_ward', name: 'Selubung Kecil', mp: 5, target: 'ally', unlockLevel: 2, frameKey: 'shield', vfx: 'velthia_ward',
    description: '5 MP. Selubung cahaya pada satu sekutu menyerap sejumlah kerusakan selama 3 giliran pemiliknya. Bukan Ultimate Perlindungan.' },
  velthia_bloom: { id: 'velthia_bloom', name: 'Mekar Rimba', mp: 7, target: 'allies', unlockLevel: 3, frameKey: 'summon', vfx: 'velthia_bloom',
    description: '7 MP. Teman hutan kecil memanggil tunas: seluruh sekutu pulih sedikit di akhir 3 giliran mereka dan racun terhapus.' },
  velthia_concord: { id: 'velthia_concord', name: 'Selaras Langkah', mp: 6, target: 'yaric', unlockLevel: 4, frameKey: 'special', vfx: 'velthia_concord',
    description: '6 MP. Hanya jika Yaric di barisan. Serangan Yaric berikutnya 1,5x lebih kuat dan ia memulihkan 4 MP.' },
};
/** Daftar terurut (sama dengan VELTHIA_COMMANDS) untuk menu. */
export const VELTHIA_SKILLS: readonly VelthiaSkillInfo[] = VELTHIA_COMMANDS.map(id => VELTHIA_SKILL_INFO[id]);

export const VELTHIA_TUNING = {
  pulseMag: 1.5, pulseMdef: 0.5,
  mendBase: 16, mendMag: 1.2,
  wardBase: 16, wardMag: 1.3, wardTurns: 3,
  bloomPct: 0.08, bloomMin: 6, bloomTurns: 3,
  concordMult: 1.5, concordMp: 4,
} as const;

export function isVelthiaCommand(command: string): command is VelthiaCommand {
  return (VELTHIA_COMMANDS as readonly string[]).includes(command);
}
export function velthiaSkillsAtLevel(level: number): VelthiaCommand[] {
  return VELTHIA_SKILLS.filter(s => s.unlockLevel <= level).map(s => s.id);
}
export const pulseDamage = (mag: number, mdef: number): number => Math.max(1, Math.floor(mag * VELTHIA_TUNING.pulseMag - mdef * VELTHIA_TUNING.pulseMdef));
export const mendAmount = (mag: number): number => VELTHIA_TUNING.mendBase + Math.floor(mag * VELTHIA_TUNING.mendMag);
export const wardAmount = (mag: number): number => VELTHIA_TUNING.wardBase + Math.floor(mag * VELTHIA_TUNING.wardMag);
export const bloomAmount = (maxHP: number): number => Math.max(VELTHIA_TUNING.bloomMin, Math.ceil(maxHP * VELTHIA_TUNING.bloomPct));
