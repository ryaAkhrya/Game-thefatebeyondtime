import { describe, expect, it } from 'vitest';
import { DialogueRunner } from '../../src/game/dialogue/DialogueRunner';
import type { DialogueLine, DialogueScript } from '../../src/game/dialogue/types';
import { paginate, wrapText } from '../../src/game/dialogue/wrap';
import type { TextSpeed } from '../../src/game/data/settingsSchema';

const line = (id: string, text: string, extra: Partial<DialogueLine> = {}): DialogueLine => ({
  type: 'line',
  id,
  speaker: 'C01',
  expression: 'NEUTRAL',
  text,
  kind: 'speech',
  pauseMs: 250,
  source: 'DIALOGUE_EVENTS',
  ...extra,
});

function make(script: DialogueScript, speed: TextSpeed = 'normal', extra: Record<string, unknown> = {}) {
  let sp = speed;
  const choices: string[] = [];
  const r = new DialogueRunner(script, { getTextSpeed: () => sp, charsWithPortrait: 28, charsWithoutPortrait: 36, linesPerPage: 4, onChoice: (c, o) => choices.push(`${c}:${o}`), ...extra });
  return { r, setSpeed: (s: TextSpeed) => (sp = s), choices };
}

describe('wrapText / paginate', () => {
  it('tidak ada baris yang melebihi batas karakter, kata tidak terpotong', () => {
    const t = 'Ikuti jalan sampai gerbang batu. Namanya Aveloria. Di sana ada tabib, penjaga, dan lebih banyak orang yang mungkin bisa membantu.';
    const lines = wrapText(t, 28);
    expect(lines.every((l) => l.length <= 28)).toBe(true);
    expect(lines.join(' ')).toBe(t);
  });
  it('kata sangat panjang dipecah; baris kosong dipertahankan', () => {
    expect(wrapText('abcdefghij', 4)).toEqual(['abcd', 'efgh', 'ij']);
    expect(wrapText('a\n\nb', 10)).toEqual(['a', '', 'b']);
  });
  it('paginate memecah per halaman', () => {
    expect(paginate(['1', '2', '3', '4', '5'], 4)).toEqual([['1', '2', '3', '4'], ['5']]);
    expect(paginate([], 4)).toEqual([['']]);
  });
});

describe('DialogueRunner: perilaku input', () => {
  const script: DialogueScript = { id: 't', nodes: [line('a', 'Halo dunia ini teks uji.'), line('b', 'Baris kedua.')] };

  it('Enter pertama saat mengetik = tampilkan semua; Enter kedua (setelah jeda) = lanjut', () => {
    const { r } = make(script);
    r.start();
    expect(r.state).toBe('typing');
    expect(r.visibleText.length).toBeLessThan('Halo dunia ini teks uji.'.length);
    expect(r.press()).toBe('completed_text');
    expect(r.visibleText).toBe('Halo dunia ini teks uji.');
    expect(r.currentLine?.id).toBe('a');
    r.update(300); // melewati jeda 250 ms
    expect(r.press()).toBe('advanced');
    expect(r.currentLine?.id).toBe('b');
  });

  it('satu keypress tidak pernah melompati dua baris: Enter beruntun cepat setelah selesai diabaikan', () => {
    const { r } = make(script);
    r.start();
    expect(r.press()).toBe('completed_text');
    expect(r.press()).toBe('ignored'); // double-tap dalam jeda
    expect(r.press()).toBe('ignored');
    expect(r.currentLine?.id).toBe('a');
    r.update(100);
    expect(r.press()).toBe('ignored');
    r.update(200);
    expect(r.press()).toBe('advanced');
    expect(r.currentLine?.id).toBe('b'); // hanya satu langkah
  });

  it('baris terakhir -> finished dan state done', () => {
    const { r } = make({ id: 'x', nodes: [line('a', 'Satu.')] });
    r.start();
    r.press();
    r.update(300);
    expect(r.press()).toBe('finished');
    expect(r.state).toBe('done');
    expect(r.press()).toBe('ignored');
  });

  it('typewriter mengikuti Text Speed: lambat < normal < cepat; instan langsung penuh', () => {
    const text = 'x'.repeat(40);
    const s: DialogueScript = { id: 's', nodes: [line('a', text)] };
    const seen: Record<string, number> = {};
    for (const sp of ['slow', 'normal', 'fast'] as const) {
      const { r } = make(s, sp);
      r.start();
      r.update(500);
      seen[sp] = r.visibleText.length;
    }
    expect(seen['slow']!).toBeLessThan(seen['normal']!);
    expect(seen['normal']!).toBeLessThan(seen['fast']!);
    const { r } = make(s, 'instant');
    r.start();
    expect(r.visibleText.replace(/\n/g, '')).toBe(text); // sudah di-wrap per baris
    expect(r.state).toBe('waiting');
  });

  it('instan: tidak ada double-advance (tetap ada jeda minimal)', () => {
    const { r } = make(script, 'instant');
    r.start();
    expect(r.press()).toBe('ignored');
    r.update(260);
    expect(r.press()).toBe('advanced');
    expect(r.press()).toBe('ignored');
  });

  it('Text Speed diubah di tengah dialog langsung berlaku', () => {
    const { r, setSpeed } = make({ id: 's', nodes: [line('a', 'y'.repeat(60))] }, 'slow');
    r.start();
    r.update(300);
    const slow = r.visibleText.length;
    setSpeed('fast');
    expect(r.visibleText.length).toBeGreaterThan(slow);
  });

  it('fastComplete (Esc) hanya mempercepat teks, tidak melewati baris', () => {
    const { r } = make(script);
    r.start();
    expect(r.fastComplete()).toBe(true);
    expect(r.currentLine?.id).toBe('a');
    expect(r.fastComplete()).toBe(false);
    expect(r.state).toBe('waiting');
  });

  it('teks panjang dibagi halaman; satu tekan = satu halaman', () => {
    const long = 'kata '.repeat(60).trim();
    const { r } = make({ id: 'p', nodes: [line('a', long)] }, 'instant');
    r.start();
    expect(r.pageCount).toBeGreaterThan(1);
    r.update(300);
    expect(r.press()).toBe('advanced');
    expect(r.currentPage).toBe(1);
    expect(r.currentLine?.id).toBe('a'); // masih baris yang sama
  });

  it('pikiran (thought) ditampilkan dalam tanda kurung; baca (read) apa adanya', () => {
    const { r } = make({ id: 't', nodes: [line('a', 'Hah...?', { kind: 'thought' })] }, 'instant');
    r.start();
    expect(r.visibleText).toBe('(Hah...?)');
    const { r: r2 } = make({ id: 't', nodes: [line('a', "'Papan'", { kind: 'read' })] }, 'instant');
    r2.start();
    expect(r2.visibleText).toBe("'Papan'");
  });
});

describe('DialogueRunner: pilihan', () => {
  const script: DialogueScript = {
    id: 'c',
    nodes: [
      line('a', 'Sebelum pilihan.'),
      { type: 'choice', id: 'ch', speaker: 'C01', options: [{ id: 'o1', text: 'Opsi satu' }, { id: 'o2', text: 'Opsi dua' }] },
      line('b', 'Sesudah pilihan.', { speaker: 'C08' }),
    ],
  };

  it('pilihan dioperasikan dengan keyboard (naik/turun, wrap) dan opsi terpilih diucapkan lalu cerita lanjut', () => {
    const { r, choices } = make(script, 'instant');
    r.start();
    r.update(300);
    r.press();
    expect(r.state).toBe('choice');
    expect(r.choice?.index).toBe(0);
    r.moveChoice(1);
    expect(r.choice?.index).toBe(1);
    r.moveChoice(1);
    expect(r.choice?.index).toBe(0); // wrap
    r.moveChoice(-1);
    expect(r.choice?.index).toBe(1);
    expect(r.press()).toBe('chose');
    expect(choices).toEqual(['ch:o2']);
    expect(r.currentLine?.text).toBe('Opsi dua'); // diucapkan pemain
    expect(r.currentLine?.speaker).toBe('C01');
    r.update(300);
    r.press();
    expect(r.currentLine?.id).toBe('b'); // kedua opsi bermuara ke baris yang sama
  });

  it('kedua opsi menghasilkan lanjutan yang sama', () => {
    const next = (pick: number): string => {
      const { r } = make(script, 'instant');
      r.start();
      r.update(300);
      r.press();
      if (pick) r.moveChoice(1);
      r.press();
      r.update(300);
      r.press();
      return r.currentLine?.id ?? '';
    };
    expect(next(0)).toBe(next(1));
  });

  it('Enter tidak memilih dua kali dalam satu tekan', () => {
    const { r, choices } = make(script, 'instant');
    r.start();
    r.update(300);
    r.press();
    r.press(); // memilih
    r.press(); // seharusnya tidak melompat (jeda baris pilihan yang diucapkan)
    expect(choices).toHaveLength(1);
    expect(r.currentLine?.text).toBe('Opsi satu');
  });
});
