import type Phaser from 'phaser';
import { C4 } from '../story/chapter4Flags';
import { FORT } from '../story/c4/fortressFlags';
import { fortressSession } from '../story/c4/fortress';
import {
  FORTRESS_DECALS, FORTRESS_DYNAMIC, FORTRESS_OVERHEAD, FORTRESS_PATROLS, FORTRESS_PROPS, FORTRESS_SEAL_PROPS, FORTRESS_STAGE,
  type FortressDynamicId,
} from '../data/maps/fortress.map.mjs';
import { FORTRESS_ATLAS_KEY, FORTRESS_GROUND_KEY } from '../data/fortressAssets';
import { footBox, type Facing } from './Collision';
import { playState, registerCharacterAnims, type CharacterAnimMeta } from './CharacterAnims';
import type { AreaView3 } from './AreaView3';
import type { LoadedMap } from './forest1';
import type { Interactable } from './Interaction';
import { dynamicRect } from './fortressMaps';
import {
  ANCHOR_IDS, FortressPuzzleSession, SEAL_ORDER, activeBlockers, anchorPressed, litSeals, riftBits, sealsSolved,
} from './fortressPuzzle';

const ATLAS = FORTRESS_ATLAS_KEY;
const DECALS = new Set<string>(FORTRESS_DECALS);
const OVERHEAD = new Set<string>(FORTRESS_OVERHEAD);
type Meta = { frames: Record<string, { pivot: { x: number; y: number } }> } | undefined;
type Flags = Readonly<Record<string, boolean>>;
type Obj = Phaser.GameObjects.Sprite | Phaser.GameObjects.Graphics;

/** Kandidat key tekstur Varlgrim (agen BA menurunkan atlas `characters/final/C04_explore`; lead mendaftarkan keynya). */
const VARLGRIM_TEXTURES = ['C04_CH4_EXPLORE', 'C04_FORTRESS_EXPLORE', 'C04_CITY_EXPLORE', 'C04_CH2_EXPLORE', 'C04_EXPLORE'] as const;
const DOOR_OF: Record<string, { prop: string; kind: 'iron' | 'heart' | 'side' | 'echo'; dyn: FortressDynamicId }> = {
  seal: { prop: 'door_seal', kind: 'iron', dyn: 'door_seal' },
  shortcut: { prop: 'door_shortcut', kind: 'iron', dyn: 'door_shortcut' },
  trial: { prop: 'trial_gate', kind: 'side', dyn: 'door_trial' },
  heart: { prop: 'door_heart', kind: 'heart', dyn: 'door_heart' },
  echo: { prop: 'echo_seal', kind: 'echo', dyn: 'door_echo' },
};
const CHEST_PROP: Record<string, string> = { chest_potion: 'bk_chest', chest_robe: 'ar_chest', chest_plate: 'tr_chest' };
const MOTE_ZONES: ReadonlyArray<readonly [number, number, number, number]> = [
  [690, 1432, 220, 130], [1100, 1432, 200, 120], [666, 104, 150, 150], [1296, 124, 150, 140], [180, 1304, 120, 110], [420, 1304, 80, 100], [500, 950, 80, 90],
];

/**
 * Renderer + keadaan visual Warden Fortress (area `fortress`). Murni visual: collision dan cerita ada di fortressMaps.ts /
 * story/c4/fortress.ts. Seni: atlas DRAFT hasil scripts/gen-fortress-art.mjs (dilukis kode). Semua keadaan diturunkan dari flag
 * (`apply`), sehingga Continue/muat save memulihkan tampilan yang sama; `handleAction` hanya animasi/umpan balik sementara.
 * Tidak memutar audio (WorldScene yang memutar SFX per op). Velthia tampil sebagai sprite pengikut; Varlgrim dan Torvan sebagai aktor adegan.
 */
export class FortressView implements AreaView3 {
  private readonly sprites = new Map<string, Phaser.GameObjects.Image>();
  private readonly meta: Meta;
  private clock = 0;
  private flags: Flags = {};
  private readonly baseX = new Map<string, number>();
  private patrolsVisible: Record<string, boolean> = {};
  private readonly motes: Array<{ img: Phaser.GameObjects.Image; zone: number; phase: number; speed: number }> = [];
  // ---- aktor
  private velthia?: Obj;
  private varlgrim?: Obj;
  private torvan?: Obj;
  private varlgrimTexture: string | null = null;
  private followX = FORTRESS_STAGE.yaricLock.x;
  private followY = FORTRESS_STAGE.yaricLock.y;
  private velthiaBusy = false;
  private lastFacing: Facing = 'up';
  private lastPos = { x: 0, y: 0 };
  private busy = false;
  private tower = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly loaded: LoadedMap,
    private readonly interactables: Interactable[],
    private readonly session: FortressPuzzleSession = fortressSession,
  ) {
    this.meta = scene.cache.json.get(`${ATLAS}:meta`) as Meta;
    if (scene.textures.exists(FORTRESS_GROUND_KEY)) scene.add.image(0, 0, FORTRESS_GROUND_KEY).setOrigin(0, 0).setDepth(-1000);
    else scene.add.rectangle(0, 0, loaded.map.width, loaded.map.height, 0x12101a).setOrigin(0, 0).setDepth(-1000);
    if (scene.textures.exists(ATLAS)) {
      const tex = scene.textures.get(ATLAS);
      for (const p of FORTRESS_PROPS) {
        if (!tex.has(p.type)) continue;
        const pivot = this.meta?.frames[p.type]?.pivot ?? { x: 0.5, y: 1 };
        const depth = DECALS.has(p.type) ? -500 : OVERHEAD.has(p.type) ? p.y + 3000 : p.y;
        const img = scene.add.image(p.x, p.y, ATLAS, p.type).setOrigin(pivot.x, pivot.y).setDepth(depth);
        this.sprites.set(p.id, img);
        this.baseX.set(p.id, p.x);
      }
      this.makeMotes();
    }
    this.makeActors();
  }

  // ---------------------------------------------------------------- aktor
  private makeActors(): void {
    const s = this.scene;
    // Velthia pengikut (atlas eksplorasi DRAFT C02; logika ikut mengikuti pola Torvan di Chapter2View)
    if (s.textures.exists('C02_CITY_EXPLORE')) {
      registerCharacterAnims(s, 'C02_CITY_EXPLORE', 'c02f', s.cache.json.get('C02_CITY_EXPLORE:meta') as CharacterAnimMeta | undefined, 6);
      const v = s.add.sprite(this.followX, this.followY, 'C02_CITY_EXPLORE', 0).setOrigin(0.5, 47 / 48).setDepth(this.followY);
      playState(v, 'c02f', 'idle', 'up', true);
      this.velthia = v;
    } else this.velthia = this.figure(0x6a5580, 0xc3b7aa);
    // Torvan (atlas C03 yang sudah ada)
    if (s.textures.exists('C03_CH2_EXPLORE')) {
      registerCharacterAnims(s, 'C03_CH2_EXPLORE', 'c03', s.cache.json.get('C03_CH2_EXPLORE:meta') as CharacterAnimMeta | undefined, 6);
      const t = s.add.sprite(FORTRESS_STAGE.threshold.x, FORTRESS_STAGE.threshold.y, 'C03_CH2_EXPLORE', 0).setOrigin(0.5, 47 / 48).setVisible(false);
      this.torvan = t;
    } else this.torvan = this.figure(0x645a82, 0xb99a7c).setVisible(false);
    // Varlgrim: atlas final C04 bila sudah terdaftar; bila belum, figur kode-native sederhana (tidak crash)
    this.varlgrimTexture = VARLGRIM_TEXTURES.find((k) => s.textures.exists(k)) ?? null;
    if (this.varlgrimTexture) {
      registerCharacterAnims(s, this.varlgrimTexture, 'c04', s.cache.json.get(`${this.varlgrimTexture}:meta`) as CharacterAnimMeta | undefined, 6);
      const g = s.add.sprite(FORTRESS_STAGE.varlgrim.x, FORTRESS_STAGE.varlgrim.y, this.varlgrimTexture, 0).setOrigin(0.5, 47 / 48);
      playState(g, 'c04', 'idle', 'down', true);
      this.varlgrim = g;
    } else this.varlgrim = this.figure(0x3c2a44, 0x9296ac);
    this.varlgrim.setPosition(FORTRESS_STAGE.varlgrim.x, FORTRESS_STAGE.varlgrim.y).setDepth(FORTRESS_STAGE.varlgrim.y);
  }
  /** Figur cadangan: siluet berjubah (kaki di titik (0,0)); hanya dipakai bila atlas karakter belum tersedia. */
  private figure(coat: number, face: number): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
    g.fillStyle(0x221e2e); g.fillRect(-9, -46, 18, 46);
    g.fillStyle(coat); g.fillRect(-8, -30, 16, 28);
    g.fillStyle(face); g.fillRect(-5, -44, 10, 10);
    g.fillStyle(0x4f5266); g.fillRect(-7, -4, 5, 4); g.fillRect(2, -4, 5, 4);
    return g;
  }
  private makeMotes(): void {
    if (!this.scene.textures.get(ATLAS).has('mote')) return;
    MOTE_ZONES.forEach((z, zi) => {
      for (let k = 0; k < 4; k++) {
        const img = this.scene.add.image(z[0], z[1], ATLAS, 'mote').setOrigin(0.5, 1).setDepth(6000);
        this.motes.push({ img, zone: zi, phase: (k * 1.7 + zi * 0.9) % 6.28, speed: 5 + k * 2 });
      }
    });
  }

  // ---------------------------------------------------------------- keadaan dari flag
  apply(flags: Flags): void {
    this.flags = flags;
    const f = flags;
    // teka-teki 1 dan 2
    const lit = new Set<string>(litSeals(f, this.session));
    for (const id of SEAL_ORDER) this.frame(id, `${id}_${lit.has(id) ? 'on' : 'off'}`);
    const bits = riftBits(f, this.session);
    bits.forEach((b, i) => this.frame(`slab_${i + 1}`, b ? 'slab_shifted' : 'slab_aligned'));
    for (const a of ANCHOR_IDS) this.frame(a, `${a}_${anchorPressed(f, this.session, a) ? 1 : 0}`);
    // pintu dan penghalang
    this.frame('door_seal', sealsSolved(f) ? 'door_iron_open' : 'door_iron_closed');
    this.frame('door_shortcut', f[FORT.shortcutOpen] ? 'door_iron_open' : 'door_iron_closed');
    this.frame('trial_gate', f[C4.aegisLearned] ? 'gate_side_open' : 'gate_side_closed');
    this.frame('door_heart', f[C4.checkpoint] ? 'door_heart_open' : 'door_heart_closed');
    this.frame('echo_seal', f[C4.heartOpen] ? 'echo_seal_open' : 'echo_seal_closed');
    this.syncCollision();
    // lentera, pusaka, uji, peti
    this.frame('lantern', f[C4.checkpoint] ? 'lantern_on' : 'lantern_off');
    this.frame('ar_relic', f[C4.aegisLearned] ? 'relic_glow' : 'relic_dim');
    this.frame('tr_pedestal', f[C4.aegisTrial] ? 'trial_pedestal_on' : 'trial_pedestal_off');
    for (const [id, flagKey] of Object.entries(CHEST_PROP).map(([k, v]) => [v, k === 'chest_potion' ? FORT.chestPotion : k === 'chest_robe' ? FORT.chestRobe : FORT.chestPlate] as const)) this.frame(id, f[flagKey] ? 'chest_open' : 'chest_closed');
    this.frame('sc_lever', f[FORT.shortcutOpen] ? 'lever_on' : 'lever_off');
    // Ruang Heart
    this.frame('hr_pylon_y', f[C4.unlockYaric] ? 'heart_pylon_on' : 'heart_pylon_off');
    this.frame('hr_pylon_v', f[C4.unlockVelthia] ? 'heart_pylon_on' : 'heart_pylon_off');
    const open = !!f[C4.heartOpen];
    this.frame('hr_emblem', open ? 'heart_emblem_open' : 'heart_emblem_sealed');
    this.frame('hr_seal', open ? 'heart_seal_open' : 'heart_seal_sealed');
    this.tower = f[C4.towerFallen] ? 3 : open ? 1 : 0;
    this.frame('hr_window', `window_arch_${this.tower}`);
    // retakan berhenti melebar sesudah Heart dibuka: decal retakan hidup diganti retakan mati
    for (const p of FORTRESS_PROPS) if (/^crack_[abc]$/.test(p.type)) this.frame(p.id, open ? `${p.type}_dead` : p.type);
    // Ruang Gema
    this.frame('echo_a', open && !f[C4.memoryA] ? 'echo_a_on' : 'echo_a_off');
    this.frame('echo_b', open && !f[C4.memoryB] ? 'echo_b_on' : 'echo_b_off');
    // patroli yang sudah dibersihkan tidak muncul lagi
    this.patrolsVisible = {
      fortress_riftborn: !f[C4.fightCourt], fortress_gravorn: !f[C4.fightHall], fortress_guardpost: !f[C4.fightGuard],
      fortress_rift: !f[C4.fightRift], fortress_aegis_trial: !f[C4.aegisTrial],
    };
    for (const [enc, ids] of Object.entries(FORTRESS_PATROLS)) for (const id of ids) this.sprites.get(id)?.setVisible(this.patrolsVisible[enc] === true);
    this.placeActors();
    // interaktif yang bergantung pada keadaan
    for (const it of this.interactables) {
      switch (it.id) {
        case 'door_seal': it.enabled = !sealsSolved(f); break;
        case 'door_shortcut': it.enabled = !f[FORT.shortcutOpen]; break;
        case 'door_heart': it.enabled = !f[C4.checkpoint]; break;
        case 'trial_gate': it.enabled = !f[C4.aegisLearned]; break;
        case 'echo_a': case 'echo_b': it.enabled = open; break;
        default: break;
      }
    }
  }

  /** Memasang/melepas collision dinamis menurut flag + sesi (satu-satunya sumber aturan: fortressPuzzle.activeBlockers). */
  private syncCollision(): void {
    const active = activeBlockers(this.flags, this.session);
    for (const id of Object.keys(FORTRESS_DYNAMIC) as FortressDynamicId[]) this.loaded.collision.setDynamic(id, active.has(id) ? dynamicRect(id) : null);
  }

  /** Posisi Varlgrim/Velthia/Torvan dari flag (aman saat memuat dari save). */
  private placeActors(): void {
    const f = this.flags, st = FORTRESS_STAGE;
    const v = this.varlgrim;
    if (v) {
      const atWall = !!f[C4.varlgrimTruth];
      const hidden = !!f[C4.oldMemory] && !f[C4.varlgrimTruth];
      const p = atWall ? st.varlgrimWall : st.varlgrim;
      v.setPosition(p.x, p.y).setDepth(p.y).setVisible(!hidden).setAlpha(1);
      this.face(v, 'c04', atWall ? 'up' : 'down');
      this.loaded.collision.setDynamic('npc_varlgrim', hidden ? null : footBox(p.x, p.y));
    }
    this.torvan?.setVisible(false);
    if (this.velthia && !this.velthiaBusy && f[C4.unlockVelthia] && !f[C4.heartOpen]) {
      this.followX = st.velthiaLock.x; this.followY = st.velthiaLock.y;
      this.velthia.setPosition(st.velthiaLock.x, st.velthiaLock.y).setDepth(st.velthiaLock.y);
      this.face(this.velthia, 'c02f', 'left');
    }
  }
  private face(o: Obj, tag: string, dir: Facing): void {
    if ('anims' in o) playState(o as Phaser.GameObjects.Sprite, tag, 'idle', dir, true);
  }

  // ---------------------------------------------------------------- aksi cerita (umpan balik sementara)
  async handleAction(op: string, arg?: string | number): Promise<void> {
    const a = String(arg ?? '');
    switch (op) {
      case 'seal_on':
        this.frame(a, `${a}_on`);
        break;
      case 'seal_reset':
        for (const id of SEAL_ORDER) { this.frame(id, `${id}_off`); this.shake(id); }
        await this.wait(280);
        break;
      case 'seal_solved':
        for (const id of SEAL_ORDER) this.frame(id, `${id}_on`);
        await this.blink(SEAL_ORDER);
        break;
      case 'door_open': await this.openDoor(a); break;
      case 'anchor_touch': {
        const [id, bits] = a.split(':');
        if (id && bits) {
          [...bits].forEach((b, i) => {
            const was = this.sprites.get(`slab_${i + 1}`)?.frame.name;
            const next = b === '1' ? 'slab_shifted' : 'slab_aligned';
            this.frame(`slab_${i + 1}`, next);
            if (was !== next) this.shake(`slab_${i + 1}`, 3);
            this.loaded.collision.setDynamic(`slab_${i + 1}`, b === '1' ? dynamicRect(`slab_${i + 1}` as FortressDynamicId) : null);
          });
          for (const k of ANCHOR_IDS) this.frame(k, `${k}_${this.session.pressed[k] % 2 === 1 ? 1 : 0}`);
        }
        await this.wait(320);
        break;
      }
      case 'rift_solved':
        for (const k of ANCHOR_IDS) this.frame(k, `${k}_1`);
        await this.blink([...ANCHOR_IDS]);
        break;
      case 'lantern_on': this.frame('lantern', 'lantern_on'); break;
      case 'lever_pull':
        this.frame('sc_lever', 'lever_on');
        await this.wait(380);
        break;
      case 'relic_glow':
        this.frame('ar_relic', 'relic_glow');
        await this.blink(['ar_relic']);
        break;
      case 'chest_open': {
        const id = CHEST_PROP[a];
        if (id) this.frame(id, 'chest_open');
        await this.wait(160);
        break;
      }
      case 'lock_yaric':
        this.frame('hr_pylon_y', 'heart_pylon_on');
        await this.wait(420);
        break;
      case 'lock_velthia': await this.velthiaToLock(); break;
      case 'heart_open': await this.heartOpen(); break;
      case 'tower_fall': await this.towerFall(); break;
      case 'echo_a': case 'echo_b': {
        const id = op;
        this.frame(id, `${id}_on`);
        await this.blink([id]);
        this.frame(id, `${id}_off`);
        break;
      }
      case 'varlgrim_arrive': await this.arrive(this.varlgrim, FORTRESS_STAGE.threshold, 'c04', 'right'); break;
      case 'varlgrim_to_wall': await this.walkTo(this.varlgrim, 'c04', FORTRESS_STAGE.varlgrimWall.x, FORTRESS_STAGE.varlgrimWall.y, true); break;
      case 'torvan_appear': await this.arrive(this.torvan, FORTRESS_STAGE.threshold, 'c03', 'right'); break;
      case 'torvan_leave': await this.torvanLeave(); break;
      default: break; // `to_aveloria` ditangani WorldScene
    }
  }

  private async openDoor(which: string): Promise<void> {
    const d = DOOR_OF[which];
    if (!d) return;
    if (d.kind === 'heart') {
      this.frame(d.prop, 'door_heart_half');
      await this.wait(420);
      this.frame(d.prop, 'door_heart_open');
    } else if (d.kind === 'iron') {
      this.shake(d.prop, 1);
      await this.wait(240);
      this.frame(d.prop, 'door_iron_open');
    } else if (d.kind === 'side') {
      await this.wait(120);
      this.frame(d.prop, 'gate_side_open');
    } else {
      this.shake(d.prop, 1);
      await this.wait(300);
      this.frame(d.prop, 'echo_seal_open');
    }
    this.loaded.collision.setDynamic(d.dyn, null);
    await this.wait(200);
  }

  private async velthiaToLock(): Promise<void> {
    this.velthiaBusy = true;
    if (this.velthia) await this.walkTo(this.velthia, 'c02f', FORTRESS_STAGE.velthiaLock.x, FORTRESS_STAGE.velthiaLock.y, false, 'left');
    this.followX = FORTRESS_STAGE.velthiaLock.x; this.followY = FORTRESS_STAGE.velthiaLock.y;
    this.frame('hr_pylon_v', 'heart_pylon_on');
    await this.wait(360);
    this.velthiaBusy = false;
  }

  private async heartOpen(): Promise<void> {
    this.frame('hr_pylon_y', 'heart_pylon_on');
    this.frame('hr_pylon_v', 'heart_pylon_on');
    await this.blink(['hr_pylon_y', 'hr_pylon_v']);
    this.frame('hr_emblem', 'heart_emblem_open');
    this.frame('hr_seal', 'heart_seal_open');
    for (const p of FORTRESS_PROPS) if (/^crack_[abc]$/.test(p.type)) this.frame(p.id, `${p.type}_dead`);
    await this.wait(700);
    this.frame('hr_window', 'window_arch_1'); this.tower = 1;
    this.frame('echo_seal', 'echo_seal_open');
    this.loaded.collision.setDynamic('door_echo', null);
    this.frame('echo_a', 'echo_a_on'); this.frame('echo_b', 'echo_b_on');
    await this.wait(900);
    this.velthiaBusy = false; // Velthia kembali mengikuti
  }

  private async towerFall(): Promise<void> {
    this.frame('hr_window', 'window_arch_1'); this.tower = 1;
    await this.wait(700);
    this.frame('hr_window', 'window_arch_2'); this.tower = 2;
    this.shake('hr_window', 1);
    await this.wait(1500);
    this.frame('hr_window', 'window_arch_3'); this.tower = 3;
    await this.wait(1300);
  }

  private async arrive(o: Obj | undefined, at: { x: number; y: number }, tag: string, dir: Facing): Promise<void> {
    if (!o) return;
    this.loaded.collision.setDynamic('npc_varlgrim', null);
    o.setPosition(at.x, at.y).setDepth(at.y).setVisible(true).setAlpha(0);
    this.face(o, tag, dir);
    await new Promise<void>((resolve) => { this.scene.tweens.add({ targets: o, alpha: 1, duration: 600, onComplete: () => resolve() }); });
  }

  private async torvanLeave(): Promise<void> {
    const t = this.torvan;
    if (!t) return;
    await this.walkTo(t, 'c03', 1150, 260, false, undefined, 70);
    await new Promise<void>((resolve) => { this.scene.tweens.add({ targets: t, alpha: 0, duration: 450, onComplete: () => resolve() }); });
    t.setVisible(false).setAlpha(1);
  }

  /** Jalan lurus ke titik (kaki). Animasi jalan memakai data atlas; kembali diam di akhir. */
  private walkTo(o: Obj | undefined, tag: string, x: number, y: number, blockAfter: boolean, finalFace?: Facing, speed = 62): Promise<void> {
    if (!o) return Promise.resolve();
    const dx = x - o.x, dy = y - o.y;
    const dir: Facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
    const dist = Math.hypot(dx, dy) || 1;
    if ('anims' in o) playState(o as Phaser.GameObjects.Sprite, tag, 'walk', dir, false);
    if (tag === 'c04') this.loaded.collision.setDynamic('npc_varlgrim', null);
    return new Promise<void>((resolve) => {
      this.scene.tweens.add({
        targets: o, x, y, duration: Math.max(200, (dist / speed) * 1000), ease: 'Linear',
        onUpdate: () => { o.setDepth(Math.round(o.y)); },
        onComplete: () => {
          o.setPosition(Math.round(x), Math.round(y)).setDepth(Math.round(y));
          this.face(o, tag, finalFace ?? (tag === 'c04' ? 'up' : dir));
          if (blockAfter && tag === 'c04') this.loaded.collision.setDynamic('npc_varlgrim', footBox(x, y));
          resolve();
        },
      });
    });
  }

  // ---------------------------------------------------------------- per frame
  update(player: { x: number; y: number; facing?: Facing }, moving: boolean, delta: number, sprinting: boolean): void {
    this.clock += delta;
    // api obor dan perapian (2 frame bergantian, tidak serempak)
    const t = this.clock;
    for (const p of FORTRESS_PROPS) {
      if (p.type === 'torch_a') this.frame(p.id, Math.floor((t + p.x * 3) / 210) % 2 === 0 ? 'torch_a' : 'torch_b');
      else if (p.type === 'brazier_a') this.frame(p.id, Math.floor((t + p.x * 5) / 260) % 2 === 0 ? 'brazier_a' : 'brazier_b');
    }
    const beat = Math.floor(t / 620) % 2 === 0;
    for (const id of ['patrol_guard_og']) if (this.visible(id)) this.frame(id, beat ? 'oathguard_a' : 'oathguard_b');
    for (const id of ['patrol_riftborn', 'patrol_guard_rb', 'patrol_rift_rb', 'patrol_trial_rb']) if (this.visible(id)) this.frame(id, Math.floor(t / 900) % 2 === 0 ? 'riftborn_a' : 'riftborn_b');
    for (const id of ['patrol_gravorn', 'patrol_rift_gv']) if (this.visible(id)) this.frame(id, Math.floor(t / 1100) % 2 === 0 ? 'gravorn_a' : 'gravorn_b');
    if (this.flags[C4.heartOpen] && !this.flags[C4.memoryA]) this.pulse('echo_a');
    if (this.flags[C4.heartOpen] && !this.flags[C4.memoryB]) this.pulse('echo_b');
    // debu: hemat, melayang lambat dan dikuantisasi ke piksel utuh
    for (const m of this.motes) {
      const z = MOTE_ZONES[m.zone]!;
      const u = ((t / 1000) * m.speed + m.phase * 20) % z[3];
      m.img.setPosition(Math.round(z[0] + ((m.phase * 31 + Math.sin(t / 1800 + m.phase) * 8 + 40) % z[2])), Math.round(z[1] + u));
    }
    this.followVelthia(player, moving, delta, sprinting);
  }

  private pulse(id: string): void {
    const s = this.sprites.get(id);
    if (s) s.setAlpha(Math.floor(this.clock / 700) % 2 === 0 ? 1 : 0.82);
  }

  private followVelthia(player: { x: number; y: number; facing?: Facing }, moving: boolean, delta: number, sprinting: boolean): void {
    const v = this.velthia;
    if (!v) return;
    let facing = player.facing;
    if (!facing) {
      const dx = player.x - this.lastPos.x, dy = player.y - this.lastPos.y;
      if (Math.abs(dx) + Math.abs(dy) > 0.01) this.lastFacing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
      facing = this.lastFacing;
    }
    this.lastPos = { x: player.x, y: player.y };
    if (this.velthiaBusy || this.busy) return;
    const lockedAtPylon = !!this.flags[C4.unlockVelthia] && !this.flags[C4.heartOpen];
    if (lockedAtPylon) return; // Velthia menunggu di pengunci sampai Heart terbuka
    const offset = facing === 'right' ? -26 : facing === 'left' ? 26 : 0;
    const ahead = facing === 'up' ? 26 : facing === 'down' ? -26 : 0;
    const alpha = Math.min(1, delta / 130);
    this.followX += (player.x + offset - this.followX) * alpha;
    this.followY += (player.y + ahead - this.followY) * alpha;
    v.setPosition(Math.round(this.followX), Math.round(this.followY)).setDepth(Math.round(this.followY));
    if ('anims' in v) playState(v as Phaser.GameObjects.Sprite, 'c02f', moving ? (sprinting ? 'sprint' : 'walk') : 'idle', facing, true);
  }

  debug(): Record<string, unknown> {
    const f = (id: string): string | undefined => this.sprites.get(id)?.frame.name;
    const pos = (o: Obj | undefined): unknown => (o ? { x: Math.round(o.x), y: Math.round(o.y), visible: o.visible } : null);
    return {
      area: 'fortress', props: this.sprites.size,
      seals: SEAL_ORDER.map((id) => f(id)), slabs: [1, 2, 3].map((i) => f(`slab_${i}`)), anchors: ANCHOR_IDS.map((id) => f(id)),
      doors: { seal: f('door_seal'), shortcut: f('door_shortcut'), trial: f('trial_gate'), heart: f('door_heart'), echo: f('echo_seal') },
      blockers: [...activeBlockers(this.flags, this.session)],
      session: { seals: [...this.session.sealProgress], rift: [...this.session.rift], pressed: { ...this.session.pressed } },
      heart: { emblem: f('hr_emblem'), window: f('hr_window'), tower: this.tower, pylons: [f('hr_pylon_y'), f('hr_pylon_v')] },
      lantern: f('lantern'), patrols: this.patrolsVisible, sealProps: FORTRESS_SEAL_PROPS.length,
      velthia: pos(this.velthia), varlgrim: pos(this.varlgrim), torvan: pos(this.torvan), varlgrimTexture: this.varlgrimTexture ?? 'fallback',
      motes: this.motes.length,
    };
  }

  destroy(): void {
    for (const s of this.sprites.values()) s.destroy();
    this.sprites.clear();
    for (const m of this.motes) m.img.destroy();
    this.motes.length = 0;
    this.velthia?.destroy(); this.varlgrim?.destroy(); this.torvan?.destroy();
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
  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => { this.scene.time.delayedCall(ms, () => resolve()); });
  }
  /** Getar horizontal kuantisasi 1-3 px (bukan kilatan). */
  private shake(id: string, amp = 1): void {
    const s = this.sprites.get(id);
    const x0 = this.baseX.get(id);
    if (!s || x0 === undefined) return;
    let n = 0;
    this.scene.time.addEvent({ delay: 45, repeat: 5, callback: () => { n++; s.x = x0 + (n % 2 === 0 ? -amp : amp); if (n >= 6) s.x = x0; } });
  }
  private async blink(ids: readonly string[]): Promise<void> {
    for (let i = 0; i < 3; i++) {
      for (const id of ids) this.sprites.get(id)?.setAlpha(0.65);
      await this.wait(90);
      for (const id of ids) this.sprites.get(id)?.setAlpha(1);
      await this.wait(90);
    }
  }
}
