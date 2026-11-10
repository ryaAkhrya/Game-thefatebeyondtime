/** Pure combat model. All balance values are DRAFT, independent of Phaser and wall-clock time. */
export interface Stats { HP: number; MP: number; ATK: number; DEF: number; MAG: number; MDEF: number; SPD: number }
export type StatusId = 'poison' | 'stun' | 'atk_up' | 'def_up';
export interface StatusEffect { id: StatusId; turns: number }
export interface BattleActor {
  id: string; name: string; side: 'player' | 'enemy'; stats: Stats;
  hp: number; mp: number; defending: boolean; statuses: StatusEffect[];
}
export type Command = 'attack' | 'ground_slam' | 'potion' | 'defend' | 'run' | 'stunned';
export type Outcome = 'victory' | 'defeat' | 'escaped' | null;
export interface PendingAction { token: number; actorId: string; command: Command; impacted: boolean }
export interface BattleState {
  actors: BattleActor[]; order: string[]; cursor: number; turn: number;
  items: Record<string, number>; allowRun: boolean; outcome: Outcome;
  pending: PendingAction | null; log: string[];
}
export const GROUND_SLAM = { cost: 4, power: 1.65 } as const;
export const POTION_HEAL = 36;
export const YARIC_STATS: Stats = { HP: 96, MP: 12, ATK: 20, DEF: 8, MAG: 5, MDEF: 7, SPD: 10 };
export const HOLLOWLING_STATS: Stats = { HP: 112, MP: 0, ATK: 19, DEF: 6, MAG: 3, MDEF: 5, SPD: 7 };

export function actor(id: string, side: BattleActor['side'], stats: Stats): BattleActor {
  return { id, name: id === 'C01' ? 'Yaric' : 'Hollowling', side, stats: { ...stats }, hp: stats.HP, mp: stats.MP, defending: false, statuses: [] };
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

/** Explicit tutorial AI: one physical strike each enemy turn. No criticals or surprise specials. */
export function enemyAI(): Command { return 'attack'; }

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
  private target(a: BattleActor): BattleActor { return this.data.actors.find(t => t.side !== a.side && t.hp > 0)!; }
  unavailable(command: Command): string | null {
    const s = this.data;
    if (s.outcome || s.pending) return 'Tunggu sampai aksi selesai.';
    const a = this.currentActor();
    if (command === 'stunned') return 'Pilih perintah yang tersedia.';
    if (a.side === 'enemy' && command !== 'attack') return 'Musuh hanya dapat menyerang.';
    if (command === 'ground_slam' && a.mp < GROUND_SLAM.cost) return 'MP tidak cukup. Perlu 4 MP.';
    if (command === 'potion' && (s.items.potion ?? 0) < 1) return 'Potion sudah habis.';
    if (command === 'potion' && a.hp === a.stats.HP) return 'HP masih penuh. Potion tidak dipakai.';
    if (command === 'run' && !s.allowRun) return 'Jalan dihalangi. Hadapi Hollowling dulu.';
    return null;
  }
  /** The caller supplies the visible turn token. Old events cannot submit on a later turn. */
  prepare(command: Command, turn: number): PendingAction | null {
    const s = this.data;
    if (turn !== s.turn || s.outcome || s.pending) return null;
    const a = this.currentActor();
    const stunned = a.statuses.some(e => e.id === 'stun');
    if (!stunned && this.unavailable(command)) return null;
    a.defending = false; // guard lasts until the owner's next accepted action
    s.pending = { token: turn, actorId: a.id, command: stunned ? 'stunned' : command, impacted: false };
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
      case 'attack': case 'ground_slam': {
        const t = this.target(a);
        if (p.command === 'ground_slam') a.mp -= GROUND_SLAM.cost;
        amount = Math.min(t.hp, damage(a, t, p.command === 'ground_slam' ? GROUND_SLAM.power : 1));
        t.hp -= amount; targetId = t.id;
        text = `${a.name}: ${p.command === 'ground_slam' ? 'Ground Slam' : 'tebasan'}. ${t.name} menerima ${amount} kerusakan.`;
        break;
      }
      case 'potion':
        s.items.potion = (s.items.potion ?? 0) - 1;
        amount = Math.min(POTION_HEAL, a.stats.HP - a.hp); a.hp += amount;
        text = `Potion memulihkan ${amount} HP Yaric.`; break;
      case 'defend': a.defending = true; text = 'Yaric bertahan. Kerusakan berikutnya berkurang separuh.'; break;
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
