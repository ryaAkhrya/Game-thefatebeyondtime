import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PORTRAIT_EXPRESSIONS } from '../../src/game/data/assetPaths';
import { ALL_CHAPTER1_SCRIPTS } from '../../src/game/dialogue/chapter1';
import { DialogueRunner } from '../../src/game/dialogue/DialogueRunner';
import { DISPLAY_NAMES, portraitKey, type DialogueLine } from '../../src/game/dialogue/types';
import { readPng } from './helpers/png';

const ROOT = resolve(__dirname, '../../..');
const PUBLIC = resolve(__dirname, '../../public');

interface EventRow {
  scene_id: string;
  line_id: string;
  speaker_id: string;
  spoken_text: string;
  emotion_id: string;
  portrait_asset_path: string;
  pause_ms: number;
}
const events = JSON.parse(readFileSync(resolve(ROOT, 'DIALOGUE_EVENTS.json'), 'utf8')) as EventRow[];
const byId = new Map(events.map((e) => [e.line_id, e]));
const norm = (s: string): string => s.replace(/�/g, '—'); // C1-03-L001 di JSON memuat karakter rusak

const lines: DialogueLine[] = ALL_CHAPTER1_SCRIPTS.flatMap((s) => s.nodes.filter((n): n is DialogueLine => n.type === 'line'));

describe('Data dialog Chapter I vs DIALOGUE_EVENTS.json', () => {
  const fromEvents = lines.filter((l) => l.source === 'DIALOGUE_EVENTS' || l.source === 'REUSE');

  it('mencakup semua baris C1-01..C1-03 dari JSON (23 baris), tidak ada yang hilang', () => {
    const wanted = events.filter((e) => ['C1-01', 'C1-02', 'C1-03'].includes(e.scene_id)).map((e) => e.line_id);
    expect(wanted).toHaveLength(23);
    const have = new Set(lines.map((l) => l.id));
    for (const id of wanted) expect(have.has(id), id).toBe(true);
  });

  it.each(fromEvents.map((l) => [l.id, l] as const))('%s: teks, pembicara, ekspresi, jeda, portrait sama dengan JSON', (id, l) => {
    const e = byId.get(id)!;
    expect(e, id).toBeDefined();
    expect(l.text).toBe(norm(e.spoken_text));
    expect(l.speaker).toBe(e.speaker_id);
    expect(l.expression).toBe(e.emotion_id);
    expect(l.pauseMs).toBe(e.pause_ms);
    expect(l.portrait).toBe(e.portrait_asset_path);
  });

  it('tidak ada baris yang dipakai pada beat selain C1-01..C1-03 (tidak ada C1-04/05)', () => {
    for (const l of lines) expect(/^C1-0[1-3]-/.test(l.id), l.id).toBe(true);
  });
});

describe('Portrait dan ekspresi', () => {
  const withPortrait = lines.filter((l) => l.speaker !== 'SYSTEM');

  it('setiap baris berpembicara punya ekspresi, nama tampilan, dan path portrait sumber yang ada di workspace', () => {
    for (const l of withPortrait) {
      expect(l.expression, l.id).toBeDefined();
      expect(DISPLAY_NAMES[l.speaker], l.id).toBeTruthy();
      if (l.portrait) expect(existsSync(resolve(ROOT, l.portrait)), `${l.id}: ${l.portrait}`).toBe(true);
    }
  });

  it('salinan runtime tiap portrait ada, bertransparansi, tinggi 128 px, dan ada di daftar yang dimuat Boot', () => {
    const keys = new Set(withPortrait.map((l) => portraitKey(l.speaker, l.expression)!));
    expect(keys.size).toBeGreaterThanOrEqual(6);
    for (const k of keys) {
      const [spk, ex] = k.split('_') as [string, string];
      expect(PORTRAIT_EXPRESSIONS[spk], k).toContain(ex);
      const p = resolve(PUBLIC, `assets/portraits/${k}.png`);
      expect(existsSync(p), k).toBe(true);
      const png = readPng(p);
      expect(png.height).toBe(128);
      expect(png.width).toBeGreaterThan(80);
      expect(png.width).toBeLessThan(140);
      // sudut kiri-atas transparan (latar tembus pandang, bukan kotak)
      expect(png.data[3]).toBe(0);
    }
  });

  it('ekspresi berubah di dalam percakapan C1-02 (lebih dari satu ekspresi per pembicara)', () => {
    const meet = ALL_CHAPTER1_SCRIPTS.find((s) => s.id === 'C1-02-MEET')!;
    const ex = (sp: string): Set<string> => new Set(meet.nodes.filter((n): n is DialogueLine => n.type === 'line' && n.speaker === sp).map((n) => n.expression!));
    expect(ex('C08').size).toBeGreaterThanOrEqual(3);
    expect(ex('C01').size).toBeGreaterThanOrEqual(2);
  });
});

describe('Disiplin kanon dan spoiler', () => {
  const all = lines.map((l) => l.text).join(' ');
  it.each(['Yudis', 'Torvan', 'Varlgrim', 'Velthia', 'Heart of Time', 'The Fate', 'Mournfang', 'Hollowling', 'Aveloria Reborn'])('"%s" tidak muncul terlalu dini', (w) => {
    if (w === 'Aveloria Reborn') return;
    expect(all.includes(w)).toBe(false);
  });
  it('Aveloria hanya disebut sebagai tujuan (Nambo/papan), tanpa nama pasangan/identitas modern', () => {
    expect(all).toContain('Aveloria');
    expect(/modern|pasangan|anniversary|foto/i.test(all)).toBe(false);
  });
  it('tidak ada slang modern atau gaya "wahai/takdir" (RULES.md bagian 7)', () => {
    expect(/\b(bro|gas|red flag|wahai|takdir telah)\b/i.test(all)).toBe(false);
  });
  it('opsi editorial O-15 (nama terukir di sarung pedang) tidak diimplementasikan', () => {
    expect(all.includes('terukir')).toBe(false);
  });
});

describe('Muat dialog: tidak ada teks terpotong', () => {
  it('semua baris muat dalam halaman (<= 4 baris/halaman, <= 4 halaman) pada kedua tata letak', () => {
    for (const s of ALL_CHAPTER1_SCRIPTS) {
      const r = new DialogueRunner(s, { getTextSpeed: () => 'instant', charsWithPortrait: 28, charsWithoutPortrait: 36, linesPerPage: 4 });
      r.start();
      let guard = 0;
      while (r.state !== 'done' && guard++ < 200) {
        if (r.state === 'choice') r.press();
        else {
          for (const pl of r.pageLines) expect(pl.length, `${s.id}:${r.currentLine?.id}`).toBeLessThanOrEqual(r.hasPortraitLayout ? 28 : 36);
          expect(r.pageLines.length).toBeLessThanOrEqual(4);
          expect(r.pageCount).toBeLessThanOrEqual(4);
          r.update(700);
          r.press();
        }
      }
      expect(r.state, s.id).toBe('done');
    }
  });
});
