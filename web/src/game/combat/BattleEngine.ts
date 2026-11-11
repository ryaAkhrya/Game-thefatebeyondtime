import { ITEMS } from '../rpg/definitions';
import { itemUseReason, useConsumable } from '../rpg/inventory';
/** Pure combat model. All balance values are DRAFT, independent of Phaser and wall-clock time. */
export interface Stats { HP: number; MP: number; ATK: number; DEF: number; MAG: number; MDEF: number; SPD: number }
export type StatusId = 'poison' | 'stun' | 'atk_up' | 'def_up';
export interface StatusEffect { id: StatusId; turns: number }
export interface BattleActor {
  id: string; name: string; side: 'player' | 'enemy'; stats: Stats;
  hp: number; mp: number; defending: boolean; statuses: StatusEffect[];
  skills?: string[];
  /** Boss intention survives the full player response turn; presentation only reads it. */
  intent?: 'strike' | 'windup' | 'sweep' | 'recover' | 'knight_strike' | 'knight_guard' | 'knight_thrust' | 'knight_recover';
}
export type Command = 'attack' | 'ground_slam' | 'ranting_nakal' | 'bukan_aku' | 'tunas_bandel' | 'potion' | 'defend' | 'run' | 'stunned'
  | 'boss_windup' | 'boss_sweep' | 'boss_recover' | 'knight_guard' | 'knight_thrust' | 'knight_recover';
export type Outcome = 'victory' | 'defeat' | 'escaped' | null;
export interface PendingAction { token: number; actorId: string; command: Command; targetId?: string; impacted: boolean }
export interface BattleState {
  actors: BattleActor[]; order: string[]; cursor: number; turn: number;
  items: Record<string, number>; allowRun: boolean; outcome: Outcome;
  pending: PendingAction | null; log: string[];
}
export const GROUND_SLAM = { cost: 4, power: 1.65 } as const;
export const POTION_HEAL = ITEMS.potion!.healHP!;
export const YARIC_STATS: Stats = { HP: 96, MP: 12, ATK: 20, DEF: 8, MAG: 5, MDEF: 7, SPD: 10 };
export const HOLLOWLING_STATS: Stats = { HP: 112, MP: 0, ATK: 19, DEF: 6, MAG: 3, MDEF: 5, SPD: 7 };
export const TORVAN_SKILL_COST = { ranting_nakal: 3, bukan_aku: 2, tunas_bandel: 4 } as const;
const NAMES: Record<string, string> = { C01: 'Yaric', C03: 'Torvan', M01: 'Hollowling', M02: 'Briaroot', M03: 'Wisplet', B01: 'Mournfang', B02: 'Veyrath' };

export function actor(id: string, side: BattleActor['side'], stats: Stats): BattleActor {
  return { id, name: NAMES[id] ?? id, side, stats: { ...stats }, hp: stats.HP, mp: stats.MP, defending: false, statuses: [], skills: id === 'C01' ? ['ground_slam'] : id === 'C03' ? ['ranting_nakal', 'bukan_aku'] : [],
    ...(id === 'B01' ? { intent: 'strike' as const } : id === 'B02' ? { intent: 'knight_strike' as const } : {}) };
}

/** SPD descending; equal speeds use stable lexical actor ID (no locale-dependent sorting). */
export function turnOrder(actors: readonly BattleActor[]): string[] {
  return [...actors].filter(a => a.hp > 0).sort((a, b) => b.stats.SPD - a.stats.SPD || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).map(a => a.id);
}

export function damage(attacker: BattleActor, target: BattleActor, power = 1): number {
  const atk = attacker.stats.ATK * (attacker.statuses.some(s => s.id === 'atk_up') ? 1.25 : 1);
  const def = target.stats.DEF * (target.statuses.some(s => s.id === 'def_up') ? 1.25 : 1);
  return Math.max(1, Math.floor(Math.max(1, atk * power - def * 0.5) * (target.defending ? 0.5 : 1)));
}

/** Deterministic tutorial strike or Mournfang's visible intent; no criticals or surprise specials. */
export function enemyAI(enemy?: Pick<BattleActor, 'intent'>): Command {
  return enemy?.intent === 'windup' ? 'boss_windup' : enemy?.intent === 'sweep' ? 'boss_sweep' : enemy?.intent === 'recover' ? 'boss_recover'
    : enemy?.intent === 'knight_guard' ? 'knight_guard' : enemy?.intent === 'knight_thrust' ? 'knight_thrust' : enemy?.intent === 'knight_recover' ? 'knight_recover' : 'attack';
}

export function intentHint(enemy: Pick<BattleActor, 'intent'>): string {
  if (enemy.intent === 'sweep') return 'Sapuan berat berikutnya. Bertahan atau Ground Slam!';
  if (enemy.intent === 'recover') return 'Mournfang goyah. Ada waktu untuk menyerang atau memulihkan HP.';
  if (enemy.intent === 'knight_thrust') return 'Veyrath mengarah ke Torvan. Lindungi dia atau pecahkan kuda-kudanya dengan sihir!';
  if (enemy.intent === 'knight_recover') return 'Veyrath menarik bilahnya. Jalan terbuka untuk serangan.';
  return '';
}

/** Durations count completed OWNER turns. Poison ticks before decrement; Stun replaces one action. */
export function finishStatuses(a: BattleActor): number {
  const loss = a.statuses.some(s => s.id === 'poison') ? Math.min(a.hp, Math.max(1, Math.floor(a.stats.HP * 0.08))) : 0;
  a.hp -= loss;
  a.statuses = a.statuses.map(s => ({ ...s, turns: s.turns - 1 })).filter(s => s.turns > 0);
  return loss;
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
    this.data = { actors: copy, order: turnOrder(copy), cursor: 0, turn: 1, items: { ...items }, allowRun, outcome: null, pending: null, log: [] };
    this.checkOutcome();
  }
  snapshot(): BattleState { return structuredClone(this.data); }
  get current(): BattleActor { return structuredClone(this.currentActor()); }
  private currentActor(): BattleActor { return this.data.actors.find(a => a.id === this.data.order[this.data.cursor])!; }
  private target(a: BattleActor, targetId?: string, ally = false): BattleActor {
    const side = ally ? a.side : a.side === 'player' ? 'enemy' : 'player';
    const chosen = targetId ? this.data.actors.find(t => t.id === targetId) : undefined;
    if (targetId && (!chosen || chosen.side !== side || chosen.hp <= 0)) throw new Error('Target tidak valid');
    return chosen ?? (a.id === 'B02' && a.intent === 'knight_thrust' ? this.data.actors.find(t => t.id === 'C03' && t.hp > 0) : undefined)
      ?? this.data.actors.find(t => t.side === side && t.hp > 0)!;
  }
  unavailable(command: Command, targetId?: string): string | null {
    const s = this.data;
    if (s.outcome || s.pending) return 'Tunggu sampai aksi selesai.';
    const a = this.currentActor();
    if (command === 'stunned') return 'Pilih perintah yang tersedia.';
    if (a.side === 'enemy' && command !== enemyAI(a)) return 'Aksi tidak sesuai pola musuh.';
    if (a.side === 'player' && (command.startsWith('boss_') || command.startsWith('knight_'))) return 'Aksi ini hanya untuk musuh.';
    if (a.side === 'player' && targetId) {
      const ally = command === 'potion' || command === 'bukan_aku' || command === 'tunas_bandel';
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
  impact(token: number): { amount: number; targetId: string; text: string } | null {
    const s = this.data, p = s.pending;
    if (!p || p.token !== token || p.impacted) return null;
    p.impacted = true;
    const a = this.currentActor();
    let amount = 0, targetId = a.id, text = '';
    switch (p.command) {
      case 'attack': case 'ground_slam': case 'boss_sweep': case 'knight_thrust': case 'ranting_nakal': {
        const t = this.target(a, p.targetId);
        if (p.command === 'ground_slam') a.mp -= GROUND_SLAM.cost;
        if (p.command === 'ranting_nakal') a.mp -= TORVAN_SKILL_COST.ranting_nakal;
        amount = Math.min(t.hp, p.command === 'ranting_nakal'
          ? Math.max(1, Math.floor(a.stats.MAG * 1.35 - t.stats.MDEF * 0.55))
          : damage(a, t, p.command === 'ground_slam' ? GROUND_SLAM.power : p.command === 'boss_sweep' ? 1.8 : p.command === 'knight_thrust' ? 1.65 : 1));
        t.hp -= amount; targetId = t.id;
        text = `${a.name}: ${p.command === 'ground_slam' ? 'Ground Slam' : p.command === 'ranting_nakal' ? 'Ranting Nakal' : p.command === 'boss_sweep' ? 'sapuan berat' : p.command === 'knight_thrust' ? 'tusukan sumpah' : 'tebasan'}. ${t.name} menerima ${amount} kerusakan.`;
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
      case 'boss_windup': text = 'Mournfang merendahkan tanduk. Sapuan berat pada giliran berikutnya!'; break;
      case 'boss_recover': text = 'Mournfang menarik napas, berusaha menegakkan tubuhnya.'; break;
      case 'knight_guard': a.statuses.push({ id: 'def_up', turns: 2 }); text = 'Veyrath mengunci langkah dan mengangkat bilah. Tusukan ke Torvan akan menyusul!'; break;
      case 'knight_recover': text = 'Veyrath menarik bilahnya dari tanah. Pertahanannya terbuka.'; break;
      case 'bukan_aku': {
        const t = this.target(a, p.targetId, true); a.mp -= TORVAN_SKILL_COST.bukan_aku;
        this.addStatus(t.id, 'def_up', 2); targetId = t.id; text = `${a.name}: Bukan Aku! ${t.name} lebih terlindungi.`; break;
      }
      case 'tunas_bandel': {
        const t = this.target(a, p.targetId, true); a.mp -= TORVAN_SKILL_COST.tunas_bandel;
        amount = Math.min(24, t.stats.HP - t.hp); t.hp += amount; targetId = t.id;
        text = `${a.name}: Tunas Bandel memulihkan ${amount} HP ${t.name}.`; break;
      }
      case 'potion': {
        const t = p.targetId ? this.target(a, p.targetId, true) : a;
        const effect = useConsumable(s.items, 'potion', t, t.stats.HP)!;
        s.items = effect.items; t.hp = effect.vitals.hp; amount = effect.healed; targetId = t.id;
        text = `Potion memulihkan ${amount} HP ${t.name}.`; break;
      }
      case 'defend': a.defending = true; text = `${a.name} bertahan. Kerusakan berikutnya berkurang separuh.`; break;
      case 'run':
        if (this.random() < 0.75) { s.outcome = 'escaped'; text = 'Berhasil melarikan diri.'; }
        else text = 'Belum bisa lolos. Giliran berakhir.';
        break;
      case 'stunned': text = `${a.name} terhenti dan kehilangan giliran.`; break;
    }
    s.log.push(text);
    this.checkOutcome();
    return { amount, targetId, text };
  }
  /** Recovery must finish before the next turn becomes actionable. */
  finish(token: number): boolean {
    const s = this.data, p = s.pending;
    if (!p || p.token !== token || !p.impacted) return false;
    if (!s.outcome) {
      const a = this.currentActor();
      if (a.intent && p.command !== 'stunned') a.intent = a.id === 'B02'
        ? p.command === 'attack' ? 'knight_guard' : p.command === 'knight_guard' ? 'knight_thrust' : p.command === 'knight_thrust' ? 'knight_recover' : 'knight_strike'
        : p.command === 'attack' ? 'windup' : p.command === 'boss_windup' ? 'sweep' : p.command === 'boss_sweep' ? 'recover' : 'strike';
      const loss = finishStatuses(this.currentActor());
      if (loss) s.log.push(`${this.currentActor().name} menerima ${loss} kerusakan racun.`);
      this.checkOutcome();
    }
    s.pending = null;
    if (!s.outcome) {
      do { s.cursor = (s.cursor + 1) % s.order.length; } while (this.currentActor().hp <= 0);
      s.turn++;
    }
    return true;
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
