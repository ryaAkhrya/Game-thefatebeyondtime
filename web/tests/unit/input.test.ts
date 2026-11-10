import { describe, expect, it } from 'vitest';
import { InputManager, KEY_BINDINGS, type Intent } from '../../src/game/core/InputManager';

function setup() {
  const target = new EventTarget();
  const im = new InputManager(target);
  const down = (code: string, extra: Record<string, unknown> = {}) => {
    let prevented = false;
    const ev = Object.assign(new Event('keydown', { cancelable: true }), {
      code,
      repeat: false,
      preventDefault() {
        prevented = true;
      },
      ...extra,
    });
    target.dispatchEvent(ev);
    return prevented;
  };
  const up = (code: string) => target.dispatchEvent(Object.assign(new Event('keyup'), { code }));
  const blur = () => target.dispatchEvent(new Event('blur'));
  return { im, down, up, blur };
}

describe('mapping intent', () => {
  it('Arrow/WASD, Enter/Z, Esc/X sesuai spesifikasi', () => {
    expect(KEY_BINDINGS['ArrowUp']).toBe('up');
    expect(KEY_BINDINGS['KeyW']).toBe('up');
    expect(KEY_BINDINGS['ArrowDown']).toBe('down');
    expect(KEY_BINDINGS['KeyS']).toBe('down');
    expect(KEY_BINDINGS['Enter']).toBe('confirm');
    expect(KEY_BINDINGS['KeyZ']).toBe('confirm');
    expect(KEY_BINDINGS['Escape']).toBe('back');
    expect(KEY_BINDINGS['KeyX']).toBe('back');
  });
});

describe('InputManager', () => {
  it('hanya layer teratas menerima intent', () => {
    const { im, down, up } = setup();
    const lower: Intent[] = [];
    const upper: Intent[] = [];
    im.pushLayer('lower', (e) => lower.push(e.intent));
    const release = im.pushLayer('upper', (e) => upper.push(e.intent));
    down('ArrowDown');
    up('ArrowDown');
    expect(upper).toEqual(['down']);
    expect(lower).toEqual([]);
    release();
    down('ArrowDown');
    expect(lower).toEqual(['down']);
  });

  it('tombol yang ditahan saat layer berganti diabaikan sampai dilepas (tidak ada double advance)', () => {
    const { im, down, up } = setup();
    const lower: Intent[] = [];
    const upper: Intent[] = [];
    im.pushLayer('title', (e) => {
      lower.push(e.intent);
      if (e.intent === 'confirm') im.pushLayer('settings', (x) => upper.push(x.intent));
    });
    down('Enter'); // membuka layer atas
    expect(lower).toEqual(['confirm']);
    down('Enter', { repeat: true }); // Enter masih ditahan
    expect(upper).toEqual([]);
    up('Enter');
    down('Enter'); // tekan baru -> diterima layer atas
    expect(upper).toEqual(['confirm']);
  });

  it('Esc yang menutup layer tidak bocor ke layer di bawahnya', () => {
    const { im, down, up } = setup();
    const lower: Intent[] = [];
    im.pushLayer('title', (e) => lower.push(e.intent));
    let release: () => void = () => {};
    release = im.pushLayer('settings', (e) => {
      if (e.intent === 'back') release();
    });
    down('Escape');
    expect(lower).toEqual([]); // ditahan -> disuppress setelah layer dilepas
    up('Escape');
    down('Escape');
    expect(lower).toEqual(['back']);
  });

  it('auto-repeat: arah diteruskan (untuk slider), Enter/Esc tidak', () => {
    const { im, down } = setup();
    const got: string[] = [];
    im.pushLayer('l', (e) => got.push(`${e.intent}${e.repeat ? '*' : ''}`));
    down('ArrowRight');
    down('ArrowRight', { repeat: true });
    down('Enter');
    down('Enter', { repeat: true });
    expect(got).toEqual(['right', 'right*', 'confirm']);
  });

  it('preventDefault untuk tombol game; tidak untuk tombol lain dan kombinasi Ctrl/Alt', () => {
    const { im, down } = setup();
    im.pushLayer('l', () => {});
    expect(down('ArrowUp')).toBe(true);
    expect(down('KeyQ')).toBe(false);
    expect(down('KeyW', { ctrlKey: true })).toBe(false); // Ctrl+W tab browser
    expect(down('ArrowLeft', { altKey: true })).toBe(false); // Alt+Left = back browser
  });

  it('setEnabled(false) memblokir input (desktop guard) dan blur melepas tombol', () => {
    const { im, down, up, blur } = setup();
    const got: Intent[] = [];
    im.pushLayer('l', (e) => got.push(e.intent));
    im.setEnabled(false);
    down('Enter');
    expect(got).toEqual([]);
    im.setEnabled(true);
    down('Enter');
    expect(got).toEqual(['confirm']);

    // blur membersihkan keadaan "ditahan"
    blur();
    up('Enter');
    down('Enter');
    expect(got).toEqual(['confirm', 'confirm']);
  });

  it('onFirstGesture terpanggil sekali pada tombol game pertama (untuk membuka audio)', () => {
    const { im, down } = setup();
    let n = 0;
    im.onFirstGesture(() => n++);
    down('KeyQ'); // bukan tombol game
    expect(n).toBe(0);
    down('Enter');
    down('Enter');
    expect(n).toBe(1);
    let late = 0;
    im.onFirstGesture(() => late++); // didaftarkan setelah gesture -> langsung jalan
    expect(late).toBe(1);
  });

  it('tanpa layer tidak error', () => {
    const { down } = setup();
    expect(() => down('Enter')).not.toThrow();
  });
});

describe('InputManager: polling arah gerak dunia', () => {
  it('arah terbaru yang ditahan menang; dilepas -> kembali ke arah sebelumnya; tanpa diagonal', () => {
    const { im, down, up } = setup();
    im.pushLayer('world', () => {});
    expect(im.getMoveDirection()).toBeNull();
    down('ArrowRight');
    expect(im.getMoveDirection()).toBe('right');
    down('ArrowUp');
    expect(im.getMoveDirection()).toBe('up'); // satu arah saja
    up('ArrowUp');
    expect(im.getMoveDirection()).toBe('right');
    up('ArrowRight');
    expect(im.getMoveDirection()).toBeNull();
  });

  it('WASD dan panah setara; tombol non-arah (Enter/E/Spasi) tidak dianggap gerak', () => {
    const { im, down } = setup();
    im.pushLayer('world', () => {});
    down('KeyA');
    expect(im.getMoveDirection()).toBe('left');
    down('Enter');
    down('KeyE');
    down('Space');
    expect(im.getMoveDirection()).toBe('left');
  });

  it('E, Spasi, Enter, Z semuanya = konfirmasi (interaksi/lanjut dialog)', () => {
    const { im, down, up } = setup();
    const got: Intent[] = [];
    im.pushLayer('l', (e) => got.push(e.intent));
    for (const c of ['Enter', 'KeyZ', 'KeyE', 'Space']) {
      down(c);
      up(c);
    }
    expect(got).toEqual(['confirm', 'confirm', 'confirm', 'confirm']);
  });

  it('tombol arah yang ditahan saat dialog dibuka tidak menggerakkan pemain setelah dialog tertutup sampai dilepas', () => {
    const { im, down, up } = setup();
    im.pushLayer('world', () => {});
    down('ArrowRight');
    expect(im.getMoveDirection()).toBe('right');
    const release = im.pushLayer('dialogue', () => {});
    expect(im.getMoveDirection()).toBeNull(); // di-suppress oleh pergantian layer
    release();
    expect(im.getMoveDirection()).toBeNull(); // masih ditahan sejak sebelum layer berganti
    up('ArrowRight');
    down('ArrowRight');
    expect(im.getMoveDirection()).toBe('right'); // tekan baru diterima
  });

  it('blur dan setEnabled(false) menghentikan gerak', () => {
    const { im, down, blur } = setup();
    im.pushLayer('world', () => {});
    down('ArrowDown');
    expect(im.getMoveDirection()).toBe('down');
    blur();
    expect(im.getMoveDirection()).toBeNull();
    down('ArrowDown');
    im.setEnabled(false);
    expect(im.getMoveDirection()).toBeNull();
  });
});
