import { ITEMS } from '../rpg/definitions';
import { itemUseReason, useConsumable } from '../rpg/inventory';
import { VELTHIA_SKILL_INFO, VELTHIA_TUNING, bloomAmount, isVelthiaCommand, mendAmount, pulseDamage, velthiaSkillsAtLevel, wardAmount, type VelthiaCommand } from '../rpg/velthia';
/** Pure combat model. All balance values are DRAFT, independent of Phaser and wall-clock time. */
export interface Stats { HP: number; MP: number; ATK: number; DEF: number; MAG: number; MDEF: number; SPD: number }
/**
 * shield: menyerap `amount` kerusakan sebelum HP (dipakai ulang oleh Ultimate Perlindungan Chapter IV nanti; durasi = giliran pemilik).
 * regen: pulihkan `amount` HP di akhir giliran pemilik. concord: serangan berikutnya Yaric x1.5. chrono_guard: kerusakan masuk x0.5.
 */
export type StatusId = 'poison' | 'stun' | 'atk_up' | 'def_up' | 'shield' | 'regen' | 'concord' | 'chrono_guard';
export interface StatusEffect { id: StatusId; turns: number; /** hanya shield (sisa serap) dan regen (HP per giliran) */ amount?: number }
export type ChronolithIntent = 'chrono_sweep' | 'chrono_charge' | 'chrono_slam' | 'chrono_guard' | 'chrono_rewind';
export type Intent = 'strike' | 'windup' | 'sweep' | 'recover' | 'knight_strike' | 'knight_guard' | 'knight_thrust' | 'knight_recover' | 'oath_strike' | 'oath_brace' | ChronolithIntent;
export interface BattleActor {
  id: string; name: string; side: 'player' | 'enemy'; stats: Stats;
  hp: number; mp: number; defending: boolean; statuses: StatusEffect[];
  skills?: string[];
  /** Boss intention survives the full player response turn; presentation only reads it. */
  intent?: Intent;
  /** Chronolith/Oathguard: penghitung pola deterministik (tanpa RNG). */
  aiStep?: number;
  /** Chronolith: fase 1/2 (fase 2 di HP <= 50%). */
  phase?: 1 | 2;
  /** Chronolith: jumlah hantaman yang sudah ditelegraf (rotasi target). */
  slams?: number;
  /** Chronolith: target hantaman yang sudah ditelegraf (ada selama intent chrono_slam). */
  intentTargetId?: string; intentTargetName?: string;
}
export type EnemyCommand = 'boss_windup' | 'boss_sweep' | 'boss_recover' | 'knight_guard' | 'knight_thrust' | 'knight_recover' | 'oath_brace' | ChronolithIntent;
export type Command = 'attack' | 'ground_slam' | 'ranting_nakal' | 'bukan_aku' | 'tunas_bandel' | 'potion' | 'defend' | 'run' | 'stunned' | VelthiaCommand | EnemyCommand;
export type Outcome = 'victory' | 'defeat' | 'escaped' | null;
export interface PendingAction { token: number; actorId: string; command: Command; targetId?: string; impacted: boolean }
export interface BattleTick { actorId: string; kind: 'poison' | 'regen'; amount: number }
export interface BattleState {
  actors: BattleActor[]; order: string[]; cursor: number; turn: number;
  items: Record<string, number>; allowRun: boolean; outcome: Outcome;
  pending: PendingAction | null; log: string[];
  /** Efek akhir giliran dari finish() terakhir (racun/regen) untuk presenter. */
  ticks: BattleTick[];
}
/** Satu efek pada satu target; presenter memutar sesuai `kind`. */
export interface EffectResult {
  targetId: string;
  kind: 'damage' | 'heal' | 'shield' | 'regen' | 'buff' | 'mp' | 'guard' | 'shift' | 'telegraph' | 'none';
  amount: number; absorbed?: number; status?: StatusId;
}
/** Petunjuk frame BattleAtlas: kunci standar atau khusus (cast/heal/shield/summon/guard/special). */
export type FrameKeyHint = 'attack' | 'anticipation' | 'cast' | 'heal' | 'shield' | 'summon' | 'guard' | 'special' | 'idle_a';
export interface ImpactResult {
  /** HP nyata yang berubah pada `targetId` (kerusakan setelah serapan, atau pemulihan). */
  amount: number; targetId: string; text: string;
  actorId: string; command: Command; skillId?: string; frameKey: FrameKeyHint;
  targetIds: string[]; effects: EffectResult[]; absorbed: number;
  /** chrono_charge: target & hantaman berikutnya. chrono_rewind: urutan giliran baru. */
  telegraph?: { targetId: string; next: ChronolithIntent };
  order?: string[];
}
export const GROUND_SLAM = { cost: 4, power: 1.65 } as const;
export const POTION_HEAL = ITEMS.potion!.healHP!;
export const YARIC_STATS: Stats = { HP: 96, MP: 12, ATK: 20, DEF: 8, MAG: 5, MDEF: 7, SPD: 10 };
export const HOLLOWLING_STATS: Stats = { HP: 112, MP: 0, ATK: 19, DEF: 6, MAG: 3, MDEF: 5, SPD: 7 };
export const TORVAN_SKILL_COST = { ranting_nakal: 3, bukan_aku: 2, tunas_bandel: 4 } as const;
/** Pola Chronolith DRAFT: tiap `chrono_charge` selalu diikuti satu ronde pemain penuh sebelum `chrono_slam`. */
export const CHRONOLITH = {
  phase1: ['chrono_sweep', 'chrono_charge', 'chrono_slam', 'chrono_guard', 'chrono_sweep', 'chrono_charge', 'chrono_slam', 'chrono_rewind'] as readonly ChronolithIntent[],
  phase2: ['chrono_charge', 'chrono_slam', 'chrono_sweep', 'chrono_rewind'] as readonly ChronolithIntent[],
  phaseThreshold: 0.5,
  slamPower: { 1: 2.3, 2: 2.7 }, sweepPower: { 1: 0.9, 2: 1.1 },
  guardReduction: 0.5, guardTurns: 2,
} as const;
const OATHGUARD_PATTERN: readonly Intent[] = ['oath_strike', 'oath_brace', 'oath_strike'];
const NAMES: Record<string, string> = { C01: 'Yaric', C02: 'Velthia', C03: 'Torvan', M01: 'Hollowling', M02: 'Briaroot', M03: 'Wisplet', M05: 'Oathguard', B01: 'Mournfang', B02: 'Veyrath', B03: 'Chronolith' };

export function actor(id: string, side: BattleActor['side'], stats: Stats): BattleActor {
  return { id, name: NAMES[id] ?? id, side, stats: { ...stats }, hp: stats.HP, mp: stats.MP, defending: false, statuses: [],
    skills: id === 'C01' ? ['ground_slam'] : id === 'C03' ? ['ranting_nakal', 'bukan_aku'] : id === 'C02' ? velthiaSkillsAtLevel(5) : [],
    ...(id === 'B01' ? { intent: 'strike' as const } : id === 'B02' ? { intent: 'knight_strike' as const } : id === 'M05' ? { intent: 'oath_strike' as const, aiStep: 0 }
      : id === 'B03' ? { intent: 'chrono_sweep' as const, aiStep: 0, phase: 1 as const, slams: 0 } : {}) };
}

/** SPD descending; equal speeds use stable lexical actor ID (no locale-dependent sorting). */
export function turnOrder(actors: readonly BattleActor[]): string[] {
  return [...actors].filter(a => a.hp > 0).sort((a, b) => b.stats.SPD - a.stats.SPD || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).map(a => a.id);
}

const guardMult = (target: BattleActor): number => target.statuses.some(s => s.id === 'chrono_guard') ? CHRONOLITH.guardReduction : 1;
export function damage(attacker: BattleActor, target: BattleActor, power = 1): number {
  const atk = attacker.stats.ATK * (attacker.statuses.some(s => s.id === 'concord') ? VELTHIA_TUNING.concordMult : attacker.statuses.some(s => s.id === 'atk_up') ? 1.25 : 1);
  const def = target.stats.DEF * (target.statuses.some(s => s.id === 'def_up') ? 1.25 : 1);
  return Math.max(1, Math.floor(Math.max(1, atk * power - def * 0.5) * (target.defending ? 0.5 : 1) * guardMult(target)));
}

/** Terapkan kerusakan: selubung (shield) menyerap dulu, sisanya mengurangi HP. Satu pintu untuk semua serangan. */
export function applyDamage(target: BattleActor, raw: number): { hp: number; absorbed: number } {
  let absorbed = 0;
  const shield = target.statuses.find(s => s.id === 'shield');
  if (shield && raw > 0) {
    absorbed = Math.min(Math.max(0, shield.amount ?? 0), raw);
    shield.amount = (shield.amount ?? 0) - absorbed;
    if (shield.amount <= 0) target.statuses = target.statuses.filter(s => s !== shield);
  }
  const hp = Math.min(target.hp, raw - absorbed);
  target.hp -= hp;
  return { hp, absorbed };
}
/** Selubung yang dapat dipakai ulang (Ward sekarang, Ultimate Perlindungan nanti): muat ulang, tidak menumpuk. */
export function addShield(target: BattleActor, amount: number, turns: number): void {
  if (!Number.isInteger(turns) || turns < 1 || !Number.isFinite(amount) || amount < 1) throw new Error('Invalid shield');
  const existing = target.statuses.find(s => s.id === 'shield');
  if (existing) { existing.amount = Math.max(existing.amount ?? 0, Math.floor(amount)); existing.turns = Math.max(existing.turns, turns); }
  else target.statuses.push({ id: 'shield', turns, amount: Math.floor(amount) });
}

/** Deterministic tutorial strike or Mournfang's visible intent; no criticals or surprise specials. */
export function enemyAI(enemy?: Pick<BattleActor, 'intent'>): Command {
  const i = enemy?.intent;
  return i === 'windup' ? 'boss_windup' : i === 'sweep' ? 'boss_sweep' : i === 'recover' ? 'boss_recover'
    : i === 'knight_guard' ? 'knight_guard' : i === 'knight_thrust' ? 'knight_thrust' : i === 'knight_recover' ? 'knight_recover'
    : i === 'oath_brace' ? 'oath_brace' : i?.startsWith('chrono_') ? i as ChronolithIntent : 'attack';
}

export function intentHint(enemy: Pick<BattleActor, 'intent'> & { intentTargetName?: string }): string {
  if (enemy.intent === 'sweep') return 'Sapuan berat berikutnya. Bertahan atau Ground Slam!';
  if (enemy.intent === 'recover') return 'Mournfang goyah. Ada waktu untuk menyerang atau memulihkan HP.';
  if (enemy.intent === 'knight_thrust') return 'Veyrath mengarah ke Torvan. Lindungi dia atau pecahkan kuda-kudanya dengan sihir!';
  if (enemy.intent === 'knight_recover') return 'Veyrath menarik bilahnya. Jalan terbuka untuk serangan.';
  if (enemy.intent === 'oath_brace') return 'Oathguard menegakkan perisai. Sihir menembus pertahanannya.';
  if (enemy.intent === 'chrono_sweep') return 'Chronolith menyiapkan sapuan lengan ke seluruh barisan. Lebih ringan, tetapi mengenai semua.';
  if (enemy.intent === 'chrono_charge') return 'Chronolith mengumpulkan waktu di intinya. Hantaman berat menyusul setelah ini.';
  if (enemy.intent === 'chrono_slam') return `Hantaman berat mengarah ke ${enemy.intentTargetName ?? 'salah satu dari kalian'}! Pasang selubung, bertahan, atau pulihkan.`;
  if (enemy.intent === 'chrono_guard') return 'Chronolith akan menutup diri. Serangan pada saat itu melemah; gunakan waktunya untuk bersiap.';
  if (enemy.intent === 'chrono_rewind') return 'Chronolith akan memutar waktu: giliran satu sekutu bergeser dan penguat Yaric terhapus.';
  return '';
}

/** Durations count completed OWNER turns. Poison ticks before decrement; Stun replaces one action. */
export function finishStatuses(a: BattleActor): number {
  const loss = a.statuses.some(s => s.id === 'poison') ? Math.min(a.hp, Math.max(1, Math.floor(a.stats.HP * 0.08))) : 0;
  a.hp -= loss;
  a.statuses = a.statuses.map(s => ({ ...s, turns: s.turns - 1 })).filter(s => s.turns > 0);
  return loss;
}
/** Regen sebelum penurunan durasi; hanya aktor hidup. */
export function regenTick(a: BattleActor): number {
  const r = a.statuses.find(s => s.id === 'regen');
  if (!r || a.hp <= 0) return 0;
  const heal = Math.max(0, Math.min(a.stats.HP - a.hp, r.amount ?? 0));
  a.hp += heal;
  return heal;
}

function chronolithIntent(a: BattleActor): ChronolithIntent {
  const step = a.aiStep ?? 0;
  if ((a.phase ?? 1) === 2) return step < 0 ? 'chrono_guard' : CHRONOLITH.phase2[step % CHRONOLITH.phase2.length]!;
  return CHRONOLITH.phase1[step % CHRONOLITH.phase1.length]!;
}

export class BattleEngine {
  private readonly data: BattleState;
  constructor(actors: BattleActor[], items: Record<string, number> = {}, allowRun = false, private readonly random: () => number = () => 0.5) {
    if (new Set(actors.map(a => a.id)).size !== actors.length || !actors.some(a => a.side === 'player') || !actors.some(a => a.side === 'enemy')) throw new Error('Invalid battle roster');
    for (const a of actors) {
      if (Object.values(a.stats).some(n => !Number.isFinite(n) || n < 0) || a.stats.HP < 1 || !Number.isFinite(a.hp) || !Number.isFinite(a.mp)) throw new Error('Invalid stats');
    }
    if (Object.values(items).some(n => !Number.isInteger(n) || n < 0)) throw new Error('Invalid inventory');
    const copy = structuredClone(actors);
    for (const a of copy) { a.hp = Math.max(0, Math.min(a.stats.HP, a.hp)); a.mp = Math.max(0, Math.min(a.stats.MP, a.mp)); }
    this.data = { actors: copy, order: turnOrder(copy), cursor: 0, turn: 1, items: { ...items }, allowRun, outcome: null, pending: null, log: [], ticks: [] };
    this.checkOutcome();
  }
  snapshot(): BattleState { return structuredClone(this.data); }
  get current(): BattleActor { return structuredClone(this.currentActor()); }
  private currentActor(): BattleActor { return this.data.actors.find(a => a.id === this.data.order[this.data.cursor])!; }
  private target(a: BattleActor, targetId?: string, ally = false): BattleActor {
    const side = ally ? a.side : a.side === 'player' ? 'enemy' : 'player';
    const chosen = targetId ? this.data.actors.find(t => t.id === targetId) : undefined;
    if (targetId && (!chosen || chosen.side !== side || chosen.hp <= 0)) throw new Error('Target tidak valid');
    const telegraphed = a.id === 'B03' && a.intent === 'chrono_slam' && a.intentTargetId ? this.data.actors.find(t => t.id === a.intentTargetId && t.hp > 0) : undefined;
    return chosen ?? (a.id === 'B02' && a.intent === 'knight_thrust' ? this.data.actors.find(t => t.id === 'C03' && t.hp > 0) : undefined) ?? telegraphed
      ?? this.data.actors.find(t => t.side === side && t.hp > 0)!;
  }
  /** Sekutu yang paling terluka (rasio HP terendah) bila tidak ada target eksplisit. */
  private healTarget(a: BattleActor, targetId?: string): BattleActor {
    if (targetId) return this.target(a, targetId, true);
    const allies = this.data.actors.filter(t => t.side === a.side && t.hp > 0);
    return allies.reduce((best, t) => t.hp / t.stats.HP < best.hp / best.stats.HP ? t : best, allies[0]!);
  }
  unavailable(command: Command, targetId?: string): string | null {
    const s = this.data;
    if (s.outcome || s.pending) return 'Tunggu sampai aksi selesai.';
    const a = this.currentActor();
    if (command === 'stunned') return 'Pilih perintah yang tersedia.';
    if (a.side === 'enemy' && command !== enemyAI(a)) return 'Aksi tidak sesuai pola musuh.';
    if (a.side === 'player' && (command.startsWith('boss_') || command.startsWith('knight_') || command.startsWith('chrono_') || command.startsWith('oath_'))) return 'Aksi ini hanya untuk musuh.';
    if (a.side === 'player' && targetId) {
      const ally = command === 'potion' || command === 'bukan_aku' || command === 'tunas_bandel' || command === 'velthia_mend' || command === 'velthia_ward' || command === 'velthia_bloom' || command === 'velthia_concord';
      const target = s.actors.find(t => t.id === targetId);
      if (!target || target.side !== (ally ? 'player' : 'enemy') || target.hp <= 0) return 'Target tidak tersedia.';
    }
    if (command === 'ground_slam' && !a.skills?.includes('ground_slam')) return 'Ground Slam belum terbuka.';
    if (command === 'ground_slam' && a.mp < GROUND_SLAM.cost) return 'MP tidak cukup. Perlu 4 MP.';
    if (command in TORVAN_SKILL_COST) {
      if (!a.skills?.includes(command)) return 'Jurus belum terbuka.';
      const cost = TORVAN_SKILL_COST[command as keyof typeof TORVAN_SKILL_COST];
      if (a.mp < cost) return `MP tidak cukup. Perlu ${cost} MP.`;
      if (command === 'tunas_bandel') { const t = this.target(a, targetId, true); if (t.hp >= t.stats.HP) return 'HP target masih penuh.'; }
    }
    if (isVelthiaCommand(command)) {
      const info = VELTHIA_SKILL_INFO[command];
      if (!a.skills?.includes(command)) return 'Jurus belum terbuka.';
      if (a.mp < info.mp) return `MP tidak cukup. Perlu ${info.mp} MP.`;
      if (command === 'velthia_mend') { const t = this.healTarget(a, targetId); if (t.hp >= t.stats.HP) return 'HP target masih penuh.'; }
      if (command === 'velthia_concord') {
        if (a.id === 'C01' || !s.actors.some(t => t.id === 'C01' && t.side === 'player' && t.hp > 0)) return 'Yaric tidak ada di barisan.';
        if (targetId && targetId !== 'C01') return 'Selaras Langkah hanya untuk Yaric.';
      }
    }
    if (command === 'potion') { const t = targetId ? this.target(a, targetId, true) : a; return itemUseReason(s.items, 'potion', t, t.stats.HP); }
    if (command === 'run' && !s.allowRun) return `Jalan dihalangi. Hadapi ${this.target(a).name} dulu.`;
    return null;
  }
  /** The caller supplies the visible turn token. Old events cannot submit on a later turn. */
  prepare(command: Command, turn: number, targetId?: string): PendingAction | null {
    const s = this.data;
    if (turn !== s.turn || s.outcome || s.pending) return null;
    const a = this.currentActor();
    const stunned = a.statuses.some(e => e.id === 'stun');
    if (!stunned && this.unavailable(command, targetId)) return null;
    a.defending = false; // guard lasts until the owner's next accepted action
    s.pending = { token: turn, actorId: a.id, command: stunned ? 'stunned' : command, ...(targetId ? { targetId } : {}), impacted: false };
    return structuredClone(s.pending);
  }
  /** Only the animation contact frame calls impact. Duplicate callbacks are harmless. */
  impact(token: number): ImpactResult | null {
    const s = this.data, p = s.pending;
    if (!p || p.token !== token || p.impacted) return null;
    p.impacted = true;
    const a = this.currentActor();
    let amount = 0, targetId = a.id, text = '';
    let frameKey: FrameKeyHint = 'idle_a';
    let effects: EffectResult[] = [];
    let telegraph: ImpactResult['telegraph'];
    let order: string[] | undefined;
    const players = () => s.actors.filter(t => t.side === 'player' && t.hp > 0);
    switch (p.command) {
      case 'attack': case 'ground_slam': case 'boss_sweep': case 'knight_thrust': case 'ranting_nakal': {
        const t = this.target(a, p.targetId);
        if (p.command === 'ground_slam') a.mp -= GROUND_SLAM.cost;
        if (p.command === 'ranting_nakal') a.mp -= TORVAN_SKILL_COST.ranting_nakal;
        const raw = p.command === 'ranting_nakal'
          ? Math.max(1, Math.floor(Math.floor(a.stats.MAG * 1.35 - t.stats.MDEF * 0.55) * guardMult(t)))
          : damage(a, t, p.command === 'ground_slam' ? GROUND_SLAM.power : p.command === 'boss_sweep' ? 1.8 : p.command === 'knight_thrust' ? 1.65 : 1);
        const hit = applyDamage(t, raw);
        amount = hit.hp; targetId = t.id; effects = [{ targetId: t.id, kind: 'damage', amount, ...(hit.absorbed ? { absorbed: hit.absorbed } : {}) }];
        frameKey = p.command === 'ranting_nakal' ? 'cast' : 'attack';
        text = `${a.name}: ${p.command === 'ground_slam' ? 'Ground Slam' : p.command === 'ranting_nakal' ? 'Ranting Nakal' : p.command === 'boss_sweep' ? 'sapuan berat' : p.command === 'knight_thrust' ? 'tusukan sumpah' : 'tebasan'}. ${t.name} menerima ${amount} kerusakan${hit.absorbed ? ` (${hit.absorbed} terserap selubung)` : ''}.`;
        if (p.command === 'ground_slam' && t.intent === 'sweep' && t.hp > 0) {
          t.intent = 'recover'; text = `Ground Slam: ${amount}. Sapuan Mournfang gagal!`;
        }
        if (p.command === 'ranting_nakal' && t.intent === 'knight_thrust' && t.hp > 0) {
          t.intent = 'knight_recover'; t.statuses = t.statuses.filter(s => s.id !== 'def_up');
          text = `Ranting Nakal: ${amount}. Kuda-kuda Veyrath terputus!`;
        }
        if (p.command === 'knight_thrust' && t.hp > 0 && !t.defending && !t.statuses.some(s => s.id === 'def_up')) this.addStatus(t.id, 'stun', 1);
        if (a.id === 'M02' && t.hp > 0 && this.random() < 0.25) this.addStatus(t.id, 'poison', 2);
        break;
      }
      case 'boss_windup': frameKey = 'anticipation'; text = 'Mournfang merendahkan tanduk. Sapuan berat pada giliran berikutnya!'; break;
      case 'boss_recover': text = 'Mournfang menarik napas, berusaha menegakkan tubuhnya.'; break;
      case 'knight_guard': frameKey = 'guard'; a.statuses.push({ id: 'def_up', turns: 2 }); text = 'Veyrath mengunci langkah dan mengangkat bilah. Tusukan ke Torvan akan menyusul!'; break;
      case 'knight_recover': text = 'Veyrath menarik bilahnya dari tanah. Pertahanannya terbuka.'; break;
      case 'oath_brace': frameKey = 'guard'; this.addStatus(a.id, 'def_up', 2); text = 'Oathguard menegakkan perisai dan menahan napas. Pertahanannya naik sebentar.'; break;
      case 'bukan_aku': {
        const t = this.target(a, p.targetId, true); a.mp -= TORVAN_SKILL_COST.bukan_aku;
        this.addStatus(t.id, 'def_up', 2); targetId = t.id; frameKey = 'shield'; effects = [{ targetId: t.id, kind: 'buff', amount: 0, status: 'def_up' }];
        text = `${a.name}: Bukan Aku! ${t.name} lebih terlindungi.`; break;
      }
      case 'tunas_bandel': {
        const t = this.target(a, p.targetId, true); a.mp -= TORVAN_SKILL_COST.tunas_bandel;
        amount = Math.min(24, t.stats.HP - t.hp); t.hp += amount; targetId = t.id; frameKey = 'heal'; effects = [{ targetId: t.id, kind: 'heal', amount }];
        text = `${a.name}: Tunas Bandel memulihkan ${amount} HP ${t.name}.`; break;
      }
      case 'potion': {
        const t = p.targetId ? this.target(a, p.targetId, true) : a;
        const effect = useConsumable(s.items, 'potion', t, t.stats.HP)!;
        s.items = effect.items; t.hp = effect.vitals.hp; amount = effect.healed; targetId = t.id; frameKey = 'heal'; effects = [{ targetId: t.id, kind: 'heal', amount }];
        text = `Potion memulihkan ${amount} HP ${t.name}.`; break;
      }
      case 'defend': a.defending = true; frameKey = 'guard'; text = `${a.name} bertahan. Kerusakan berikutnya berkurang separuh.`; break;
      case 'run':
        if (this.random() < 0.75) { s.outcome = 'escaped'; text = 'Berhasil melarikan diri.'; }
        else text = 'Belum bisa lolos. Giliran berakhir.';
        break;
      case 'stunned': text = `${a.name} terhenti dan kehilangan giliran.`; break;
      // ---- Velthia (C02) ----
      case 'velthia_pulse': {
        const t = this.target(a, p.targetId); a.mp -= VELTHIA_SKILL_INFO.velthia_pulse.mp;
        const hit = applyDamage(t, Math.max(1, Math.floor(pulseDamage(a.stats.MAG, t.stats.MDEF) * guardMult(t))));
        amount = hit.hp; targetId = t.id; frameKey = 'cast'; effects = [{ targetId: t.id, kind: 'damage', amount, ...(hit.absorbed ? { absorbed: hit.absorbed } : {}) }];
        text = `${a.name}: Denyut Telapak. ${t.name} menerima ${amount} kerusakan sihir.`; break;
      }
      case 'velthia_mend': {
        const t = this.healTarget(a, p.targetId); a.mp -= VELTHIA_SKILL_INFO.velthia_mend.mp;
        amount = Math.min(mendAmount(a.stats.MAG), t.stats.HP - t.hp); t.hp += amount; targetId = t.id; frameKey = 'heal'; effects = [{ targetId: t.id, kind: 'heal', amount }];
        text = `${a.name}: Sentuhan Pulih memulihkan ${amount} HP ${t.name}.`; break;
      }
      case 'velthia_ward': {
        const t = this.target(a, p.targetId, true); a.mp -= VELTHIA_SKILL_INFO.velthia_ward.mp;
        amount = wardAmount(a.stats.MAG); addShield(t, amount, VELTHIA_TUNING.wardTurns + (t.id === a.id ? 1 : 0)); // diri sendiri: satu giliran terpakai saat finish
        targetId = t.id; frameKey = 'shield'; effects = [{ targetId: t.id, kind: 'shield', amount, status: 'shield' }];
        text = `${a.name}: Selubung Kecil melindungi ${t.name} (menyerap hingga ${amount} kerusakan).`; break;
      }
      case 'velthia_bloom': {
        a.mp -= VELTHIA_SKILL_INFO.velthia_bloom.mp; frameKey = 'summon';
        const allies = s.actors.filter(t => t.side === a.side && t.hp > 0);
        for (const t of allies) {
          const per = bloomAmount(t.stats.HP);
          t.statuses = t.statuses.filter(e => e.id !== 'poison');
          const existing = t.statuses.find(e => e.id === 'regen');
          if (existing) { existing.amount = Math.max(existing.amount ?? 0, per); existing.turns = Math.max(existing.turns, VELTHIA_TUNING.bloomTurns); }
          else t.statuses.push({ id: 'regen', turns: VELTHIA_TUNING.bloomTurns, amount: per });
          effects.push({ targetId: t.id, kind: 'regen', amount: per, status: 'regen' });
        }
        amount = effects[0]?.amount ?? 0; targetId = allies[0]?.id ?? a.id;
        text = `${a.name}: Mekar Rimba. Tunas kecil memulihkan seluruh barisan perlahan.`; break;
      }
      case 'velthia_concord': {
        const y = s.actors.find(t => t.id === 'C01' && t.hp > 0)!; a.mp -= VELTHIA_SKILL_INFO.velthia_concord.mp;
        const existing = y.statuses.find(e => e.id === 'concord');
        if (existing) existing.turns = Math.max(existing.turns, 1); else y.statuses.push({ id: 'concord', turns: 1 });
        const mp = Math.min(VELTHIA_TUNING.concordMp, y.stats.MP - y.mp); y.mp += mp;
        amount = mp; targetId = y.id; frameKey = 'special';
        effects = [{ targetId: y.id, kind: 'buff', amount: 0, status: 'concord' }, { targetId: y.id, kind: 'mp', amount: mp }];
        text = `${a.name}: Selaras Langkah. Serangan ${y.name} berikutnya lebih kuat${mp ? ` dan ia pulih ${mp} MP` : ''}.`; break;
      }
      // ---- Chronolith (B03) ----
      case 'chrono_charge': {
        const list = players();
        const pick = list[(a.slams ?? 0) % list.length]!; a.slams = (a.slams ?? 0) + 1;
        a.intentTargetId = pick.id; a.intentTargetName = pick.name;
        targetId = pick.id; frameKey = 'anticipation'; effects = [{ targetId: pick.id, kind: 'telegraph', amount: 0 }];
        telegraph = { targetId: pick.id, next: 'chrono_slam' };
        text = `Chronolith mengumpulkan waktu di intinya. Hantaman berat akan menimpa ${pick.name} pada giliran berikutnya!`; break;
      }
      case 'chrono_slam': {
        const t = this.target(a);
        const hit = applyDamage(t, damage(a, t, CHRONOLITH.slamPower[a.phase ?? 1]));
        amount = hit.hp; targetId = t.id; frameKey = 'attack'; effects = [{ targetId: t.id, kind: 'damage', amount, ...(hit.absorbed ? { absorbed: hit.absorbed } : {}) }];
        text = `Chronolith: hantaman waktu. ${t.name} menerima ${amount} kerusakan${hit.absorbed ? ` (${hit.absorbed} terserap selubung)` : ''}.`; break;
      }
      case 'chrono_sweep': {
        const list = players(); frameKey = 'attack';
        for (const t of list) {
          const hit = applyDamage(t, damage(a, t, CHRONOLITH.sweepPower[a.phase ?? 1]));
          effects.push({ targetId: t.id, kind: 'damage', amount: hit.hp, ...(hit.absorbed ? { absorbed: hit.absorbed } : {}) });
        }
        amount = effects.reduce((n, e) => n + e.amount, 0); targetId = list[0]?.id ?? a.id;
        text = `Chronolith menyapu seluruh barisan: ${effects.map(e => `${this.nameOf(e.targetId)} ${e.amount}`).join(', ')}.`; break;
      }
      case 'chrono_guard': {
        const entry = (a.phase ?? 1) === 2 && (a.aiStep ?? 0) < 0;
        a.statuses = a.statuses.filter(e => e.id !== 'chrono_guard'); a.statuses.push({ id: 'chrono_guard', turns: CHRONOLITH.guardTurns });
        frameKey = entry ? 'special' : 'guard'; targetId = a.id; effects = [{ targetId: a.id, kind: 'guard', amount: Math.round((1 - CHRONOLITH.guardReduction) * 100), status: 'chrono_guard' }];
        text = entry ? 'Retakan waktu melebar di tubuh Chronolith. Ia menutup diri sejenak sebelum menyerang lebih cepat!'
          : 'Chronolith menutup diri dalam waktu yang beku. Serangan pada ronde ini hanya separuh kekuatannya.'; break;
      }
      case 'chrono_rewind': {
        // Majukan urutan mulai dari giliran SETELAH boss; boss tetap terakhir. Dua sekutu hidup bertukar posisi: tertunda satu slot, tidak ada yang kehilangan giliran.
        const seq: string[] = [];
        for (let i = 1; i <= s.order.length; i++) seq.push(s.order[(s.cursor + i) % s.order.length]!);
        const idx = seq.map((id, i) => ({ id, i })).filter(e => s.actors.find(t => t.id === e.id && t.side === 'player' && t.hp > 0));
        frameKey = 'special';
        if (idx.length >= 2) {
          const first = idx[0]!, second = idx[1]!;
          seq[first.i] = second.id; seq[second.i] = first.id;
          s.order = seq; s.cursor = seq.length - 1; order = [...seq];
          const delayed = s.actors.find(t => t.id === first.id)!;
          delayed.statuses = delayed.statuses.filter(e => e.id !== 'atk_up' && e.id !== 'concord');
          targetId = delayed.id; effects = [{ targetId: delayed.id, kind: 'shift', amount: 1 }];
          text = `Chronolith memutar waktu. Giliran ${delayed.name} tertunda satu langkah dan penguatnya terhapus.`;
        } else { text = 'Chronolith memutar waktu, tetapi tidak ada yang bisa ditunda.'; }
        break;
      }
    }
    s.log.push(text);
    this.checkOutcome();
    const skillId = ['ground_slam', 'ranting_nakal', 'bukan_aku', 'tunas_bandel'].includes(p.command) || isVelthiaCommand(p.command) || p.command.startsWith('chrono_') ? p.command : undefined;
    return { amount, targetId, text, actorId: a.id, command: p.command, ...(skillId ? { skillId } : {}), frameKey,
      targetIds: effects.length ? [...new Set(effects.map(e => e.targetId))] : [targetId], effects,
      absorbed: effects.reduce((n, e) => n + (e.absorbed ?? 0), 0), ...(telegraph ? { telegraph } : {}), ...(order ? { order } : {}) };
  }
  private nameOf(id: string): string { return this.data.actors.find(t => t.id === id)?.name ?? id; }
  /** Recovery must finish before the next turn becomes actionable. */
  finish(token: number): boolean {
    const s = this.data, p = s.pending;
    if (!p || p.token !== token || !p.impacted) return false;
    s.ticks = [];
    if (!s.outcome) {
      const a = this.currentActor();
      if (a.intent && p.command !== 'stunned') this.advanceIntent(a, p.command);
      const regen = regenTick(a);
      if (regen) { s.ticks.push({ actorId: a.id, kind: 'regen', amount: regen }); s.log.push(`${a.name} pulih ${regen} HP dari tunas.`); }
      const loss = finishStatuses(this.currentActor());
      if (loss) { s.ticks.push({ actorId: a.id, kind: 'poison', amount: loss }); s.log.push(`${this.currentActor().name} menerima ${loss} kerusakan racun.`); }
      this.checkOutcome();
    }
    s.pending = null;
    if (!s.outcome) {
      do { s.cursor = (s.cursor + 1) % s.order.length; } while (this.currentActor().hp <= 0);
      s.turn++;
    }
    return true;
  }
  private advanceIntent(a: BattleActor, command: Command): void {
    if (a.id === 'B03') {
      a.aiStep = (a.aiStep ?? 0) + 1;
      if (command === 'chrono_slam') { delete a.intentTargetId; delete a.intentTargetName; }
      // Transisi fase hanya di luar jeda telegraf (tidak pernah di antara charge dan slam); fase 2 dibuka dengan jeda guard.
      if ((a.phase ?? 1) === 1 && a.hp > 0 && a.hp <= a.stats.HP * CHRONOLITH.phaseThreshold && command !== 'chrono_charge') { a.phase = 2; a.aiStep = -1; }
      a.intent = chronolithIntent(a);
    } else if (a.id === 'M05') {
      a.aiStep = (a.aiStep ?? 0) + 1; a.intent = OATHGUARD_PATTERN[a.aiStep % OATHGUARD_PATTERN.length]!;
    } else a.intent = a.id === 'B02'
      ? command === 'attack' ? 'knight_guard' : command === 'knight_guard' ? 'knight_thrust' : command === 'knight_thrust' ? 'knight_recover' : 'knight_strike'
      : command === 'attack' ? 'windup' : command === 'boss_windup' ? 'sweep' : command === 'boss_sweep' ? 'recover' : 'strike';
  }
  addStatus(actorId: string, id: StatusId, turns: number): void {
    if (!Number.isInteger(turns) || turns < 1) throw new Error('Invalid status duration');
    const a = this.data.actors.find(t => t.id === actorId);
    if (!a || a.hp <= 0) return;
    const existing = a.statuses.find(s => s.id === id);
    if (existing) existing.turns = Math.max(existing.turns, turns); // refresh, never stack multipliers
    else a.statuses.push({ id, turns });
  }
  private checkOutcome(): void {
    if (this.data.outcome === 'escaped') return;
    if (!this.data.actors.some(a => a.side === 'player' && a.hp > 0)) this.data.outcome = 'defeat';
    else if (!this.data.actors.some(a => a.side === 'enemy' && a.hp > 0)) this.data.outcome = 'victory';
  }
}
