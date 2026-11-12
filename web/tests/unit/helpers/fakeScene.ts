/** Scene Phaser tiruan minimal untuk menguji view area (AveloriaCrisisView) tanpa browser. Hanya API yang dipakai view. */
export class FakeObj {
  x = 0; y = 0; depth = 0; visible = true; alpha = 1; angle = 0; frame = ''; originX = 0.5; originY = 0.5; flipX = false; destroyed = false;
  scene: unknown = null;
  private data = new Map<string, unknown>();
  readonly texture: { key: string };
  readonly anims: { currentAnim: { key: string } | null; paused: boolean; play(k: unknown): FakeObj['anims']; pause(): void; resume(): void };
  constructor(key = '', frame = '') {
    this.texture = { key }; this.frame = frame;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    this.anims = { currentAnim: null, paused: false, play(k: unknown) { const key2 = typeof k === 'string' ? k : (k as { key: string }).key; this.currentAnim = { key: key2 }; return this; }, pause() { this.paused = true; void self; }, resume() { this.paused = false; } };
  }
  setPosition(x: number, y: number): this { this.x = x; this.y = y; return this; }
  setX(x: number): this { this.x = x; return this; }
  setY(y: number): this { this.y = y; return this; }
  setDepth(d: number): this { this.depth = d; return this; }
  setOrigin(x: number, y?: number): this { this.originX = x; this.originY = y ?? x; return this; }
  setVisible(v: boolean): this { this.visible = v; return this; }
  setAlpha(a: number): this { this.alpha = a; return this; }
  setAngle(a: number): this { this.angle = a; return this; }
  setFrame(f: string): this { this.frame = f; return this; }
  setFlipX(v: boolean): this { this.flipX = v; return this; }
  setData(k: string, v: unknown): this { this.data.set(k, v); return this; }
  getData(k: string): unknown { return this.data.get(k); }
  setFillStyle(): this { return this; }
  fillStyle(): this { return this; }
  fillRect(): this { return this; }
  fillEllipse(): this { return this; }
  destroy(): void { this.destroyed = true; }
  get active(): boolean { return !this.destroyed; }
}

export interface FakeCamera { _follow: FakeObj | null; stopFollow(): void; startFollow(t: FakeObj): void; pan(x: number, y: number, ms: number): void; once(ev: string, fn: () => void): void; scrollX: number }

export class FakeScene {
  now = 0;
  readonly created: FakeObj[] = [];
  private readonly animKeys = new Set<string>();
  readonly textureKeys = new Set<string>(['town_crisis', 'C03_CH2_EXPLORE']);
  readonly handlers = new Map<string, (() => void)[]>();
  panDone: (() => void)[] = [];
  /** true = pan selesai segera; false = tidak pernah selesai (menguji batas waktu) */
  panCompletes = true;
  readonly follow: FakeObj = new FakeObj('player');
  readonly cam: FakeCamera = {
    _follow: this.follow,
    stopFollow: () => { this.cam._follow = null; },
    startFollow: (t: FakeObj) => { this.cam._follow = t; },
    pan: () => { if (this.panCompletes) { const fns = this.panDone; this.panDone = []; fns.forEach(f => f()); } },
    once: (_ev: string, fn: () => void) => { this.panDone.push(fn); },
    scrollX: 0,
  };
  private make<T extends FakeObj>(o: T): T { o.scene = this; this.created.push(o); return o; }
  readonly add = {
    image: (x: number, y: number, key: string, frame?: string) => this.make(new FakeObj(key, frame)).setPosition(x, y),
    sprite: (x: number, y: number, key: string, frame?: string | number) => this.make(new FakeObj(key, String(frame ?? ''))).setPosition(x, y),
    ellipse: (x: number, y: number) => this.make(new FakeObj('ellipse')).setPosition(x, y),
    rectangle: (x: number, y: number) => this.make(new FakeObj('rect')).setPosition(x, y),
    graphics: () => this.make(new FakeObj('graphics')),
  };
  readonly anims = {
    exists: (k: string) => this.animKeys.has(k),
    create: (cfg: { key: string }) => { this.animKeys.add(cfg.key); return cfg; },
    get: (_k: string) => ({ frames: [0, 1] }),
  };
  readonly textures = { exists: (k: string) => this.textureKeys.has(k) };
  readonly cache = { json: { get: (k: string) => (k === 'town_crisis:meta' ? { frames: new Proxy({}, { get: () => ({ pivot: { x: 0.5, y: 1 } }) }) } : undefined) } };
  readonly tweens = {
    add: (cfg: { onComplete?: () => void }) => { cfg.onComplete?.(); return {}; },
    isTweening: () => false,
  };
  readonly time = { get now(): number { return fakeNow(); } };
  readonly cameras = { main: this.cam };
  readonly events = {
    once: (ev: string, fn: () => void) => { const l = this.handlers.get(ev) ?? []; l.push(fn); this.handlers.set(ev, l); },
    emit: (ev: string) => { for (const f of this.handlers.get(ev) ?? []) f(); },
  };
  constructor() { current = this; }
}
let current: FakeScene | null = null;
function fakeNow(): number { return current?.now ?? 0; }
