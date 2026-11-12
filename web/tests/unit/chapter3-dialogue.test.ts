import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PORTRAIT_EXPRESSIONS } from '../../src/game/data/assetPaths';
import { CHARACTER_IDS } from '../../src/game/data/ids';
import { C3_CANON_COVERAGE, C3_SCRIPTS } from '../../src/game/dialogue/chapter3';
import * as chapter3 from '../../src/game/dialogue/chapter3';
import { DialogueRunner } from '../../src/game/dialogue/DialogueRunner';
import { speakerLabel } from '../../src/game/dialogue/speaker';
import { DISPLAY_NAMES, portraitKey, type DialogueLine, type DialogueScript } from '../../src/game/dialogue/types';

const ROOT = resolve(__dirname, '../../..');
const PUBLIC = resolve(__dirname, '../../public');

interface EventRow { scene_id: string; line_id: string; speaker_id: string; spoken_text: string; emotion_id: string; portrait_asset_path: string; pause_ms: number }
const canonRows = (JSON.parse(readFileSync(resolve(ROOT, 'DIALOGUE_EVENTS.json'), 'utf8')) as EventRow[]).filter(e => e.scene_id.startsWith('C3-'));

const REQUIRED = [
  'C3_CRISIS_WATCH', 'C3_AZIE_DEMAND', 'C3_VELTHIA_REFUSES', 'C3_NOBLES_DOUBT', 'C3_EVAC_ORDER', 'C3_TALRIC_EVAC', 'C3_DECISION', 'C3_TORVAN_STAYS', 'C3_DEPART',
  'C3_NPC_CITIZEN_1', 'C3_NPC_CITIZEN_2', 'C3_NPC_CITIZEN_3', 'C3_NPC_CITIZEN_4', 'C3_NPC_TALRIC_BUSY', 'C3_NPC_AZIE_WATCH', 'C3_NPC_TORVAN_HELPING', 'C3_NPC_NOBLE', 'C3_NPC_EVAC_DONE',
  'C3_TEMPLE_ENTRANCE', 'C3_TEMPLE_CAMP', 'C3_PUZZLE_INTRO', 'C3_PUZZLE_HINT_A', 'C3_PUZZLE_HINT_B', 'C3_PUZZLE_HINT_C',
  'C3_PUZZLE_SOLVED_A', 'C3_PUZZLE_SOLVED_B', 'C3_PUZZLE_SOLVED_C', 'C3_PUZZLE_NOTE', 'C3_GATE_OPEN',
  'C3_TEMPLE_INSPECT_1', 'C3_TEMPLE_INSPECT_2', 'C3_TEMPLE_INSPECT_3', 'C3_TEMPLE_INSPECT_4',
  'C3_CHRONOLITH_INTRO', 'C3_CHRONOLITH_OUTRO', 'C3_HIDDEN_NAME', 'C3_PROMISE', 'C3_CHAPTER_END',
];

const entries = Object.entries(C3_SCRIPTS);
const linesOf = (s: DialogueScript): DialogueLine[] => s.nodes.filter((n): n is DialogueLine => n.type === 'line');
const allLines = entries.flatMap(([name, s]) => linesOf(s).map(l => ({ name, l })));

describe('Chapter III dialogue: exports dan registri', () => {
  it('semua nama yang dijanjikan kepada agen Aveloria dan Kuil diekspor sebagai DialogueScript', () => {
    const mod = chapter3 as unknown as Record<string, unknown>;
    for (const name of REQUIRED) {
      const s = mod[name] as DialogueScript | undefined;
      expect(s, name).toBeDefined();
      expect(Array.isArray(s!.nodes), name).toBe(true);
      expect(s!.nodes.length, name).toBeGreaterThan(0);
      expect(C3_SCRIPTS[name], name).toBe(s);
    }
    expect(Object.keys(C3_SCRIPTS).sort()).toEqual([...REQUIRED].sort());
  });
  it('ID skrip dan ID baris unik di seluruh Bab III', () => {
    const scriptIds = entries.map(([, s]) => s.id);
    expect(new Set(scriptIds).size).toBe(scriptIds.length);
    const lineIds = allLines.map(x => x.l.id);
    expect(new Set(lineIds).size).toBe(lineIds.length);
  });
});

describe('Chapter III dialogue: 65 baris kanon verbatim', () => {
  const byId = new Map(canonRows.map(r => [r.line_id, r]));
  const expectedPerScene: Record<string, number> = { 'C3-01': 11, 'C3-02': 7, 'C3-03': 17, 'C3-04': 5, 'C3-05': 6, 'C3-06': 5, 'C3-07': 14 };

  it('JSON sumber berisi 65 baris dengan jumlah per adegan 11/7/17/5/6/5/14', () => {
    expect(canonRows).toHaveLength(65);
    for (const [scene, n] of Object.entries(expectedPerScene)) expect(canonRows.filter(r => r.scene_id === scene), scene).toHaveLength(n);
  });
  it('C3_CANON_COVERAGE cocok dengan jumlah baris tiap adegan', () => {
    expect(C3_CANON_COVERAGE.map(c => [c.sceneId, c.lineCount])).toEqual(Object.entries(expectedPerScene));
    for (const c of C3_CANON_COVERAGE) for (const name of c.scripts) expect(C3_SCRIPTS[name], name).toBeDefined();
  });
  it('setiap baris kanon muncul tepat sekali di seluruh skrip', () => {
    const shown = allLines.filter(x => x.l.source === 'DIALOGUE_EVENTS').map(x => x.l.id);
    expect(shown).toHaveLength(65);
    expect(new Set(shown).size).toBe(65);
    expect([...shown].sort()).toEqual(canonRows.map(r => r.line_id).sort());
  });
  it('urutan kanon terjaga: skrip pada coverage, digabung, memainkan 65 baris persis urutan JSON', () => {
    const played = C3_CANON_COVERAGE.flatMap(c => c.scripts.flatMap(name => linesOf(C3_SCRIPTS[name]!).filter(l => l.source === 'DIALOGUE_EVENTS').map(l => l.id)));
    expect(played).toEqual(canonRows.map(r => r.line_id));
    for (const c of C3_CANON_COVERAGE) {
      const ids = c.scripts.flatMap(name => linesOf(C3_SCRIPTS[name]!).filter(l => l.source === 'DIALOGUE_EVENTS').map(l => l.id));
      expect(ids.every(id => byId.get(id)!.scene_id === c.sceneId), c.sceneId).toBe(true);
      expect(ids, c.sceneId).toHaveLength(c.lineCount);
    }
  });
  it('teks, pembicara, ekspresi, jeda dan portrait identik dengan DIALOGUE_EVENTS.json', () => {
    for (const { l } of allLines.filter(x => x.l.source === 'DIALOGUE_EVENTS')) {
      const e = byId.get(l.id)!;
      expect(e, l.id).toBeDefined();
      expect([l.text, l.speaker, l.expression, l.pauseMs, l.portrait], l.id).toEqual([e.spoken_text, e.speaker_id, e.emotion_id, e.pause_ms, e.portrait_asset_path]);
      expect(l.kind, l.id).toBe('speech');
    }
  });
  it('semua baris selain kanon ditandai DRAFT_IMPL dan memakai ID kerja -X', () => {
    const drafts = allLines.filter(x => x.l.source !== 'DIALOGUE_EVENTS');
    expect(drafts.length).toBeGreaterThan(50);
    for (const { l } of drafts) {
      expect(l.source, l.id).toBe('DRAFT_IMPL');
      expect(/^C3-(0[1-7]|NPC)-X\d{3}$/.test(l.id), l.id).toBe(true);
    }
  });
});

describe('Chapter III dialogue: kualitas data', () => {
  it('tidak ada teks kosong dan tidak ada spasi ganda/ujung', () => {
    for (const { name, l } of allLines) {
      expect(l.text.trim().length, `${name}:${l.id}`).toBeGreaterThan(0);
      expect(l.text, `${name}:${l.id}`).toBe(l.text.trim());
      expect(/ {2}/.test(l.text), `${name}:${l.id}`).toBe(false);
    }
  });
  it('pembicara dan ekspresi valid; portrait runtime ada; SYSTEM tanpa ekspresi', () => {
    for (const { name, l } of allLines) {
      const tag = `${name}:${l.id}`;
      if (l.speaker === 'SYSTEM') {
        expect(l.expression, tag).toBeUndefined();
        expect(l.kind === 'system' || l.kind === 'read', tag).toBe(true);
        continue;
      }
      expect((CHARACTER_IDS as readonly string[]).includes(l.speaker), tag).toBe(true);
      expect(DISPLAY_NAMES[l.speaker], tag).toBeTruthy();
      expect(l.expression, tag).toBeDefined();
      expect(PORTRAIT_EXPRESSIONS[l.speaker], tag).toContain(l.expression);
      const key = portraitKey(l.speaker, l.expression)!;
      expect(existsSync(resolve(PUBLIC, `assets/portraits/${key}.png`)), `${tag} ${key}`).toBe(true);
    }
  });
  it('label pembicara: Yaric tampil hanya setelah nama diketahui; narasi SYSTEM tidak menyebut nama itu', () => {
    const yaric = allLines.find(x => x.l.speaker === 'C01' && x.l.kind === 'speech')!.l;
    expect(speakerLabel(yaric, true)).toBe('Yaric');
    expect(speakerLabel(yaric, false)).toBe('???');
    for (const { name, l } of allLines.filter(x => x.l.speaker === 'SYSTEM')) expect(/Yaric/.test(l.text), `${name}:${l.id}`).toBe(false);
    for (const { l } of allLines.filter(x => x.l.speaker === 'SYSTEM' && x.l.label)) expect(l.label).not.toMatch(/Yaric/);
  });
  it('kata kunci spoiler dan terlarang tidak muncul', () => {
    const all = allLines.map(x => x.l.text).join('\n');
    expect(/meteor|Bab IV|Chapter IV|C4-0|Yudis|reinkarnasi|modern|anniversary|foto|pasangan/i.test(all)).toBe(false);
    expect(/cinta|mencintai|sayang|kekasih|suka padamu|jatuh hati|romans/i.test(all)).toBe(false);
    expect(/\b(bro|gas|red flag|wahai|takdir telah|semesta|jiwa abadi|literally)\b/i.test(all)).toBe(false);
  });
  it('Torvan tidak pernah mengungkap identitas pencipta atau sifat ilahi', () => {
    const torvan = allLines.filter(x => x.l.speaker === 'C03').map(x => x.l.text).join('\n');
    expect(torvan.length).toBeGreaterThan(100);
    expect(/pencipta|mencipta|kuciptakan|creator|\bGod\b|dewa|tuhan|dunia ini|aku yang membuat/i.test(torvan)).toBe(false);
    const all = allLines.map(x => x.l.text).join('\n');
    expect(/pencipta|creator/i.test(all)).toBe(false);
  });
  it('Varlgrim pertama disebut lewat bukti tertulis (C3_HIDDEN_NAME), tidak di skrip lain; Heart of Time tidak di Aveloria', () => {
    const withName = entries.filter(([, s]) => linesOf(s).some(l => /Varlgrim/.test(l.text))).map(([n]) => n);
    expect(withName).toEqual(['C3_HIDDEN_NAME']);
    const hidden = linesOf(C3_SCRIPTS.C3_HIDDEN_NAME!);
    const first = hidden.findIndex(l => /Varlgrim/.test(l.text));
    expect(hidden[first]!.kind).toBe('read'); // baris pertama yang menyebut nama = tulisan, bukan ucapan
    const aveloria = ['C3_CRISIS_WATCH', 'C3_AZIE_DEMAND', 'C3_VELTHIA_REFUSES', 'C3_NOBLES_DOUBT', 'C3_EVAC_ORDER', 'C3_TALRIC_EVAC', 'C3_DECISION', 'C3_TORVAN_STAYS', 'C3_DEPART'];
    for (const n of aveloria) expect(linesOf(C3_SCRIPTS[n]!).some(l => /Heart of Time/.test(l.text)), n).toBe(false);
    expect(linesOf(C3_SCRIPTS.C3_HIDDEN_NAME!).some(l => /Heart of Time/.test(l.text))).toBe(true);
  });
  it('krisis dan kepemimpinan: tuntutan Azie, penolakan Velthia, evakuasi Talric, keraguan bangsawan ada', () => {
    const text = (n: string, who: string): string => linesOf(C3_SCRIPTS[n]!).filter(l => l.speaker === who).map(l => l.text).join(' ');
    expect(text('C3_AZIE_DEMAND', 'C05')).toMatch(/ditahan/);
    expect(text('C3_VELTHIA_REFUSES', 'C02')).toMatch(/tidak akan menahan/i);
    expect(text('C3_EVAC_ORDER', 'C02')).toMatch(/Kosongkan|Bawa warga/);
    expect(text('C3_TALRIC_EVAC', 'C06').length).toBeGreaterThan(80);
    expect(linesOf(C3_SCRIPTS.C3_NOBLES_DOUBT!).some(l => l.speaker === 'SYSTEM' && l.label === 'Bangsawan')).toBe(true);
    expect(linesOf(C3_SCRIPTS.C3_DECISION!).map(l => l.text).join(' ')).toMatch(/lambang pusaka/);
  });
  it('NPC ambien singkat (satu atau dua baris)', () => {
    for (const n of REQUIRED.filter(r => r.startsWith('C3_NPC_'))) {
      const ls = linesOf(C3_SCRIPTS[n]!);
      expect(ls.length, n).toBeGreaterThanOrEqual(1);
      expect(ls.length, n).toBeLessThanOrEqual(2);
    }
  });
});

describe('Chapter III dialogue: muat di kotak dialog', () => {
  it('setiap baris draft <= 170 karakter', () => {
    for (const { name, l } of allLines.filter(x => x.l.source === 'DRAFT_IMPL')) expect(l.text.length, `${name}:${l.id}`).toBeLessThanOrEqual(170);
  });
  it('semua skrip selesai dimainkan tanpa terpotong (<= 4 baris/halaman, <= 4 halaman) pada kedua tata letak', () => {
    for (const [name, s] of entries) {
      const r = new DialogueRunner(s, { getTextSpeed: () => 'instant', charsWithPortrait: 28, charsWithoutPortrait: 36, linesPerPage: 4 });
      r.start();
      let guard = 0;
      while (r.state !== 'done' && guard++ < 400) {
        if (r.state === 'choice') r.press();
        else {
          for (const pl of r.pageLines) expect(pl.length, `${name}:${r.currentLine?.id}`).toBeLessThanOrEqual(r.hasPortraitLayout ? 28 : 36);
          expect(r.pageLines.length).toBeLessThanOrEqual(4);
          expect(r.pageCount, `${name}:${r.currentLine?.id}`).toBeLessThanOrEqual(4);
          r.update(700);
          r.press();
        }
      }
      expect(r.state, name).toBe('done');
      expect(r.linesShown.length, name).toBe(linesOf(s).length);
    }
  });
});

describe('Chapter III dialogue: statistik audit', () => {
  it('menghitung baris kanon vs DRAFT_IMPL', () => {
    const canon = allLines.filter(x => x.l.source === 'DIALOGUE_EVENTS').length;
    const drafts = allLines.filter(x => x.l.source === 'DRAFT_IMPL').length;
    // eslint-disable-next-line no-console
    console.log(`C3 dialogue: ${entries.length} skrip, ${canon} baris kanon, ${drafts} baris DRAFT_IMPL`);
    expect(canon).toBe(65);
    expect(drafts).toBeGreaterThan(0);
  });
});
