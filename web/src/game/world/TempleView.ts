import type Phaser from 'phaser';
import { C3 } from '../story/chapter3Flags';
import { TEMPLE_DECALS, TEMPLE_PATROLS, TEMPLE_PROPS } from '../data/maps/temple.map.mjs';
import { getServices } from '../systems/Services';
import { templeSession } from '../story/c3/temple';
import type { AreaView3 } from './AreaView3';
import type { LoadedMap } from './forest1';
import type { Interactable } from './Interaction';
import { TEMPLE_GATE_ID, TEMPLE_GATE_RECT } from './templeMaps';
import {
  A_ORDER, DIAL_IDS, DIAL_START, TemplePuzzleSession, cUnlocked, dialPositions, gateIsOpen, litPillars, solvedMap, type DialId, type Dir,
} from './templePuzzle';

const ATLAS = 'temple_props';
const GROUND = 'temple_ground';
const DECALS = new Set<string>(TEMPLE_DECALS);
type Meta = { frames: Record<string, { pivot: { x: number; y: number } }> } | undefined;

/**
 * Renderer + keadaan visual Kuil Jejak (area `temple`). Murni visual: collision dan cerita ada di templeMaps.ts / story/c3/temple.ts.
 * Seni: atlas DRAFT hasil scripts/gen-temple-art.mjs (dilukis kode). Semua keadaan diturunkan dari flag (`apply`), sehingga
 * Continue/muat save memulihkan tampilan yang sama; `handleAction` hanya animasi/umpan balik sementara.
 */
export class TempleView implements AreaView3 {
  private readonly sprites = new Map<string, Phaser.GameObjects.Image>();
  private readonly meta: Meta;
  private clock = 0;
  private gateOpen = false;
  private chronolithState: 'dormant' | 'wake' | 'still' = 'dormant';
  private patrolsVisible: Record<string, boolean> = { temple_oathguard: true, temple_mixed: true };
  private readonly baseX = new Map<string, number>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly loaded: LoadedMap,
    private readonly interactables: Interactable[],
    private readonly session: TemplePuzzleSession = templeSession,
  ) {
    this.meta = scene.cache.json.get(`${ATLAS}:meta`) as Meta;
    if (scene.textures.exists(GROUND)) scene.add.image(0, 0, GROUND).setOrigin(0, 0).setDepth(-1000);
    else scene.add.rectangle(0, 0, loaded.map.width, loaded.map.height, 0x1d1625).setOrigin(0, 0).setDepth(-1000);
    if (!scene.textures.exists(ATLAS)) return;
    const tex = scene.textures.get(ATLAS);
    for (const p of TEMPLE_PROPS) {
      if (!tex.has(p.type)) continue;
      const pivot = this.meta?.frames[p.type]?.pivot ?? { x: 0.5, y: 1 };
      const depth = DECALS.has(p.type) ? -500 : p.id.startsWith('gate_lamp') ? 481 : p.y;
      const img = scene.add.image(p.x, p.y, ATLAS, p.type).setOrigin(pivot.x, pivot.y).setDepth(depth);
      this.sprites.set(p.id, img);
      this.baseX.set(p.id, p.x);
    }
  }

  // ---------------------------------------------------------------- keadaan dari flag
  apply(flags: Readonly<Record<string, boolean>>): void {
    const solved = solvedMap(flags);
    const lit = new Set(litPillars(flags, this.session));
    for (const [i, id] of A_ORDER.entries()) this.frame(id, `pillar_a${i + 1}_${lit.has(id) ? 'on' : 'off'}`);
    for (const k of [1, 2, 3]) this.frame(`b_disc_${k}`, `disc_b${k}_${solved.B && k === 3 ? 'on' : 'off'}`);
    this.showDials(dialPositions(flags, this.session), solved.C ? 'on' : cUnlocked(flags) ? 'off' : 'frozen');

    this.gateOpen = gateIsOpen(flags);
    this.frame('gate', this.gateOpen ? 'gate_open' : 'gate_closed');
    this.loaded.collision.setDynamic(TEMPLE_GATE_ID, this.gateOpen ? null : { ...TEMPLE_GATE_RECT });
    this.frame('gate_lamp_a', solved.A ? 'gate_lamp_on' : 'gate_lamp_off');
    this.frame('gate_lamp_b', solved.B ? 'gate_lamp_on' : 'gate_lamp_off');
    this.frame('gate_lamp_c', solved.C ? 'gate_lamp_on' : 'gate_lamp_off');

    this.chronolithState = flags[C3.chronolith] ? 'still' : 'dormant';
    this.frame('chronolith', `chronolith_${this.chronolithState}`);

    this.patrolsVisible = { temple_oathguard: !flags[C3.templeFight1], temple_mixed: !flags[C3.templeFight2] };
    for (const [enc, ids] of Object.entries(TEMPLE_PATROLS)) for (const id of ids) this.sprites.get(id)?.setVisible(this.patrolsVisible[enc] === true);

    for (const it of this.interactables) {
      if (it.id === 'chronolith') it.enabled = this.gateOpen && !flags[C3.chronolith];
      else if (it.id === 'hall_record') it.enabled = !!flags[C3.chronolithOutroSeen];
      else if (it.id === 'hall_exit') it.enabled = !!flags[C3.hiddenName];
    }
  }

  // ---------------------------------------------------------------- aksi cerita (umpan balik sementara)
  async handleAction(op: string, arg?: string | number): Promise<void> {
    switch (op) {
      case 'pillar_on': {
        const n = A_ORDER.indexOf(String(arg) as (typeof A_ORDER)[number]) + 1;
        if (n > 0) this.frame(String(arg), `pillar_a${n}_on`);
        this.sfx('SFX_PUZZLE_ACTIVATE');
        break;
      }
      case 'puzzle_reset':
        for (const [i, id] of A_ORDER.entries()) { this.frame(id, `pillar_a${i + 1}_off`); this.shake(id); }
        this.sfx('SFX_UI_CANCEL');
        await this.wait(260);
        break;
      case 'disc_on': {
        const k = Number(String(arg).slice(-1));
        this.frame(String(arg), `disc_b${k}_on`);
        this.sfx('SFX_PUZZLE_ACTIVATE');
        break;
      }
      case 'disc_wrong':
        this.shake(String(arg));
        this.sfx('SFX_UI_CANCEL');
        await this.wait(200);
        break;
      case 'dial_set': {
        const [id, pos] = String(arg).split(':');
        if (id && pos !== undefined) this.dialFrame(id as DialId, Number(pos) as Dir, 'off');
        this.sfx('SFX_PUZZLE_ACTIVATE');
        break;
      }
      case 'puzzle_fx': {
        const which = String(arg);
        const ids = which === 'A' ? [...A_ORDER] : which === 'B' ? ['b_disc_3'] : [...DIAL_IDS];
        if (which === 'A') for (const [i, id] of A_ORDER.entries()) this.frame(id, `pillar_a${i + 1}_on`);
        if (which === 'B') this.frame('b_disc_3', 'disc_b3_on');
        if (which === 'C') for (const id of DIAL_IDS) this.dialFrame(id, dialPositions({ [C3.puzzleC]: true }, this.session)[id], 'on');
        this.frame(`gate_lamp_${which.toLowerCase()}`, 'gate_lamp_on');
        this.sfx('SFX_PUZZLE_SOLVED');
        await this.blink(ids);
        break;
      }
      case 'gate_open':
        this.sfx('SFX_DOOR_OPEN');
        this.frame('gate', 'gate_half');
        await this.wait(380);
        this.frame('gate', 'gate_open');
        this.loaded.collision.setDynamic(TEMPLE_GATE_ID, null);
        await this.wait(260);
        break;
      case 'chronolith_wake':
        this.chronolithState = 'wake';
        this.frame('chronolith', 'chronolith_wake');
        this.shake('chronolith', 2);
        await this.wait(520);
        break;
      case 'camp_rest':
        break;
      default:
        break;
    }
  }

  // ---------------------------------------------------------------- per frame
  update(_player: { x: number; y: number }, _moving: boolean, delta: number, _sprinting: boolean): void {
    this.clock += delta;
    const beat = Math.floor(this.clock / 520) % 2 === 0;
    this.frame('fire', Math.floor(this.clock / 230) % 2 === 0 ? 'fire_a' : 'fire_b');
    for (const id of ['patrol1_og', 'patrol2_og']) if (this.visible(id)) this.frame(id, beat ? 'oathguard_a' : 'oathguard_b');
    const ws = ['wisplet_a', 'wisplet_b', 'wisplet_c', 'wisplet_b'] as const;
    for (const [i, id] of ['patrol2_w1', 'patrol2_w2'].entries()) if (this.visible(id)) this.frame(id, ws[(Math.floor(this.clock / 340) + i * 2) % 4]!);
  }

  debug(): Record<string, unknown> {
    const f = (id: string): string | undefined => this.sprites.get(id)?.frame.name;
    return {
      area: 'temple', gateOpen: this.gateOpen, gateFrame: f('gate'), chronolith: this.chronolithState,
      pillars: A_ORDER.map((id) => f(id)), discs: [1, 2, 3].map((k) => f(`b_disc_${k}`)), dials: DIAL_IDS.map((id) => f(id)),
      patrols: this.patrolsVisible, sessionDials: { ...this.session.dials }, props: this.sprites.size,
    };
  }

  destroy(): void {
    for (const s of this.sprites.values()) s.destroy();
    this.sprites.clear();
  }

  // ---------------------------------------------------------------- bantu
  private visible(id: string): boolean { return this.sprites.get(id)?.visible === true; }
  private frame(id: string, name: string): void {
    const s = this.sprites.get(id);
    if (!s || s.frame.name === name || !this.scene.textures.get(ATLAS).has(name)) return;
    const pivot = this.meta?.frames[name]?.pivot;
    s.setFrame(name);
    if (pivot) s.setOrigin(pivot.x, pivot.y);
  }
  private dialFrame(id: DialId, pos: Dir, state: 'off' | 'on' | 'frozen'): void {
    this.frame(id, `${id === 'c_dial_m' ? 'dialm' : 'dial'}_${pos}_${state}`);
  }
  private showDials(pos: Record<DialId, Dir>, state: 'off' | 'on' | 'frozen'): void {
    for (const id of DIAL_IDS) this.dialFrame(id, pos[id] ?? DIAL_START[id], state);
  }
  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => { this.scene.time.delayedCall(ms, () => resolve()); });
  }
  /** Getar horizontal kuantisasi 1-2 px (bukan kilatan). */
  private shake(id: string, amp = 1): void {
    const s = this.sprites.get(id);
    const x0 = this.baseX.get(id);
    if (!s || x0 === undefined) return;
    let n = 0;
    const timer = this.scene.time.addEvent({ delay: 45, repeat: 5, callback: () => { n++; s.x = x0 + (n % 2 === 0 ? -amp : amp); if (n >= 6) s.x = x0; } });
    void timer;
  }
  private async blink(ids: readonly string[]): Promise<void> {
    for (let i = 0; i < 3; i++) {
      for (const id of ids) this.sprites.get(id)?.setAlpha(0.65);
      await this.wait(90);
      for (const id of ids) this.sprites.get(id)?.setAlpha(1);
      await this.wait(90);
    }
  }
  private sfx(id: string): void {
    try { getServices(this.scene).audio.playSfx(id); } catch { /* senyap: audio tidak wajib */ }
  }
}
