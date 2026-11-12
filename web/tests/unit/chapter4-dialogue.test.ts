import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PORTRAIT_EXPRESSIONS } from '../../src/game/data/assetPaths';
import { CHARACTER_IDS } from '../../src/game/data/ids';
import * as chapter4 from '../../src/game/dialogue/chapter4';
import { C4_BATTLE_CALLOUTS, C4_CANON_COVERAGE, C4_SCRIPTS } from '../../src/game/dialogue/chapter4';
import { DialogueRunner } from '../../src/game/dialogue/DialogueRunner';
import { speakerLabel } from '../../src/game/dialogue/speaker';
import { DISPLAY_NAMES, type DialogueChoice, type DialogueLine, type DialogueScript } from '../../src/game/dialogue/types';

const ROOT = resolve(__dirname, '../../..');
const PUBLIC = resolve(__dirname, '../../public');
const HD = resolve(PUBLIC, 'assets/portraits_hd');

interface EventRow { scene_id: string; line_id: string; speaker_id: string; spoken_text: string; emotion_id: string; portrait_asset_path: string; pause_ms: number }
const canonRows = (JSON.parse(readFileSync(resolve(ROOT, 'DIALOGUE_EVENTS.json'), 'utf8')) as EventRow[]).filter(e => e.scene_id.startsWith('C4-'));
const copiedRows = JSON.parse(readFileSync(resolve(__dirname, '../../src/game/dialogue/chapter4.lines.json'), 'utf8')) as EventRow[];

const REQUIRED = [
  'C4_ARRIVAL', 'C4_REPORT_A', 'C4_REPORT_B', 'C4_ARCHIVE_VELTHIA', 'C4_AEGIS_TRIAL_INTRO', 'C4_AEGIS_TRIAL_DONE', 'C4_RIFTBORN_FIRST',
  'C4_CONFRONT', 'C4_BOSS_INTRO', 'C4_VICTORY_LEAN', 'C4_HEART_APPROACH', 'C4_HEART_LOCK_YARIC', 'C4_HEART_LOCK_VELTHIA', 'C4_HEART_OPEN',
  'C4_TOWER_FALL', 'C4_MEMORY_ENTER', 'C4_MEMORY_A', 'C4_MEMORY_B', 'C4_OLD_MEMORY', 'C4_VARLGRIM_TRUTH', 'C4_TORVAN_REVEAL',
  'C4_TORVAN_LEAVES', 'C4_AFTER_TORVAN', 'C4_RETURN_GATE', 'C4_RETURN_AVELORIA',
];
const CALLOUT_KEYS = ['phase2', 'phase3', 'meteor_call', 'meteor_hold', 'meteor_survived', 'aegis_taught', 'defeat_hint'];

/** Ekspresi yang sah per tokoh: set runtime + ekspresi baru yang diturunkan agen BA untuk C04 dan yang dibutuhkan baris kanon. */
const C04_SET = ['ANGRY', 'STERN', 'REMORSE', 'DETERMINED', 'NEUTRAL', 'SAD', 'SURPRISED', 'SUSPICIOUS'];
function allowedExpressions(speaker: string): readonly string[] {
  const base = PORTRAIT_EXPRESSIONS[speaker] ?? [];
  if (speaker === 'C04') return [...new Set([...base, ...C04_SET])];
  return base;
}

const entries = Object.entries(C4_SCRIPTS);
const linesOf = (s: DialogueScript): DialogueLine[] => s.nodes.filter((n): n is DialogueLine => n.type === 'line');
const allLines = entries.flatMap(([name, s]) => linesOf(s).map(l => ({ name, l })));
const textOf = (who: string, names?: string[]): string =>
  allLines.filter(x => x.l.speaker === who && (!names || names.includes(x.name))).map(x => x.l.text).join('\n');

describe('Chapter IV dialogue: exports dan registri', () => {
  it('semua nama kontrak diekspor sebagai DialogueScript berisi dan terdaftar di C4_SCRIPTS', () => {
    const mod = chapter4 as unknown as Record<string, unknown>;
    for (const name of REQUIRED) {
      const s = mod[name] as DialogueScript | undefined;
      expect(s, name).toBeDefined();
      expect(Array.isArray(s!.nodes), name).toBe(true);
      expect(s!.nodes.length, name).toBeGreaterThan(0);
      expect(C4_SCRIPTS[name], name).toBe(s);
    }
    expect(Object.keys(C4_SCRIPTS).sort()).toEqual([...REQUIRED].sort());
    expect(typeof chapter4.chapter4Canon).toBe('function');
  });
  it('ID skrip dan ID baris unik di seluruh Bab IV', () => {
    const scriptIds = entries.map(([, s]) => s.id);
    expect(new Set(scriptIds).size).toBe(scriptIds.length);
    const lineIds = allLines.map(x => x.l.id);
    expect(new Set(lineIds).size).toBe(lineIds.length);
  });
  it('C4_REPORT_A dan C4_REPORT_B adalah laporan tertulis (kind read), bukan ucapan', () => {
    for (const n of ['C4_REPORT_A', 'C4_REPORT_B']) {
      const ls = linesOf(C4_SCRIPTS[n]!);
      expect(ls.filter(l => l.kind === 'read').length, n).toBeGreaterThanOrEqual(2);
      expect(ls.filter(l => l.kind === 'read').every(l => l.label === 'Laporan Talric'), n).toBe(true);
    }
  });
});

describe('Chapter IV dialogue: 36 baris kanon verbatim', () => {
  const byId = new Map(canonRows.map(r => [r.line_id, r]));
  const expectedPerScene: Record<string, number> = { 'C4-01': 4, 'C4-02': 6, 'C4-03': 2, 'C4-04': 4, 'C4-05': 4, 'C4-06': 10, 'C4-07': 6 };

  it('JSON sumber berisi 36 baris dengan jumlah per adegan 4/6/2/4/4/10/6', () => {
    expect(canonRows).toHaveLength(36);
    for (const [scene, n] of Object.entries(expectedPerScene)) expect(canonRows.filter(r => r.scene_id === scene), scene).toHaveLength(n);
  });
  it('chapter4.lines.json identik dengan baris C4 pada DIALOGUE_EVENTS.json (tujuh field, urutan sama)', () => {
    expect(copiedRows).toHaveLength(36);
    const project = (r: EventRow): EventRow => ({ scene_id: r.scene_id, line_id: r.line_id, speaker_id: r.speaker_id, spoken_text: r.spoken_text, emotion_id: r.emotion_id, portrait_asset_path: r.portrait_asset_path, pause_ms: r.pause_ms });
    expect(copiedRows).toEqual(canonRows.map(project));
  });
  it('C4_CANON_COVERAGE cocok dengan jumlah baris tiap adegan', () => {
    expect(C4_CANON_COVERAGE.map(c => [c.sceneId, c.lineCount])).toEqual(Object.entries(expectedPerScene));
    for (const c of C4_CANON_COVERAGE) for (const name of c.scripts) expect(C4_SCRIPTS[name], name).toBeDefined();
  });
  it('setiap baris kanon muncul tepat sekali di seluruh skrip', () => {
    const shown = allLines.filter(x => x.l.source === 'DIALOGUE_EVENTS').map(x => x.l.id);
    expect(shown).toHaveLength(36);
    expect(new Set(shown).size).toBe(36);
    expect([...shown].sort()).toEqual(canonRows.map(r => r.line_id).sort());
  });
  it('urutan kanon terjaga: skrip pada coverage, digabung, memainkan 36 baris persis urutan JSON', () => {
    const played = C4_CANON_COVERAGE.flatMap(c => c.scripts.flatMap(name => linesOf(C4_SCRIPTS[name]!).filter(l => l.source === 'DIALOGUE_EVENTS').map(l => l.id)));
    expect(played).toEqual(canonRows.map(r => r.line_id));
    for (const c of C4_CANON_COVERAGE) {
      const ids = c.scripts.flatMap(name => linesOf(C4_SCRIPTS[name]!).filter(l => l.source === 'DIALOGUE_EVENTS').map(l => l.id));
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
    expect(drafts.length).toBeGreaterThan(100);
    for (const { l } of drafts) {
      expect(l.source, l.id).toBe('DRAFT_IMPL');
      expect(/^C4-(0[1-7]|[A-Z]+)-X\d{3}$/.test(l.id), l.id).toBe(true);
    }
  });
});

describe('Chapter IV dialogue: kualitas data', () => {
  it('tidak ada teks kosong dan tidak ada spasi ganda/ujung', () => {
    for (const { name, l } of allLines) {
      expect(l.text.trim().length, `${name}:${l.id}`).toBeGreaterThan(0);
      expect(l.text, `${name}:${l.id}`).toBe(l.text.trim());
      expect(/ {2}/.test(l.text), `${name}:${l.id}`).toBe(false);
    }
  });
  it('pembicara dan ekspresi valid; SYSTEM tanpa ekspresi; portrait yang tersedia benar-benar ada', () => {
    const c04Ready = existsSync(HD) && readdirSync(HD).some(f => f.startsWith('C04_'));
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
      const canon = l.source === 'DIALOGUE_EVENTS';
      // Baris kanon boleh memakai ekspresi yang portrait-nya dibuat BA (C04 dan C02 ANGRY); baris DRAFT hanya memakai yang sudah ada.
      if (!canon) expect(allowedExpressions(l.speaker), tag).toContain(l.expression);
      if (l.speaker === 'C04') expect(C04_SET, tag).toContain(l.expression);
      const key = `${l.speaker}_${l.expression}`;
      const mustExist = l.speaker === 'C04' ? c04Ready : !(canon && l.speaker === 'C02' && l.expression === 'ANGRY');
      if (mustExist) expect(existsSync(resolve(HD, `${key}.png`)), `${tag} ${key}`).toBe(true);
    }
  });
  it('label pembicara: Yaric tampil hanya setelah nama diketahui; narasi SYSTEM tidak menyebut Yaric atau Yudis', () => {
    const yaric = allLines.find(x => x.l.speaker === 'C01' && x.l.kind === 'speech')!.l;
    expect(speakerLabel(yaric, true)).toBe('Yaric');
    expect(speakerLabel(yaric, false)).toBe('???');
    for (const { name, l } of allLines.filter(x => x.l.speaker === 'SYSTEM')) {
      expect(/Yaric|Yudis/.test(l.text), `${name}:${l.id}`).toBe(false);
      if (l.label) expect(l.label).not.toMatch(/Yaric|Yudis/);
    }
  });
  it('kata terlarang tidak muncul: modern, Yudis, ponsel, foto, jam pasir, kredit, epilog, tebing, slang', () => {
    const all = allLines.map(x => x.l.text).join('\n') + '\n' + Object.values(C4_BATTLE_CALLOUTS).map(c => c.text).join('\n');
    expect(/Yudis|modern|ponsel|telepon|foto|kamera|anniversary|pasangan|berabad|epilog|kredit|tebing|reinkarnasi/i.test(all)).toBe(false);
    expect(/hourglass|jam pasir/i.test(all)).toBe(false);
    expect(/\b(bro|gas|red flag|wahai|literally|santuy|baper|kepo|mager|gabut|nggak|gak|banget|udah|ngambek|lemot|anjir|sih)\b/i.test(all)).toBe(false);
    expect(/\b\d{4}\b/.test(all)).toBe(false); // tanpa tanggal/tahun
  });
  it('tidak ada tulisan "Bab V", Modern Interlude, atau kartu akhir bab di dalam naskah', () => {
    const all = allLines.map(x => x.l.text).join('\n');
    expect(/Bab (V|IV selesai)|Interlude|To Be Continued|Chapter V/i.test(all)).toBe(false);
  });
});

describe('Chapter IV dialogue: arah cerita dan karakter', () => {
  it('Varlgrim hemat bicara: tidak ada seruan, tidak bicara tentang kekuatan mutlak, tidak menolak tanggung jawab', () => {
    const lines = allLines.filter(x => x.l.speaker === 'C04').map(x => x.l);
    expect(lines.length).toBeGreaterThan(15);
    // Kanon C4-02-L001 memakai ekspresi ANGRY tetapi teks tetap tenang; tidak ada tanda seru pada ucapan Varlgrim.
    for (const l of lines) expect(l.text, l.id).not.toMatch(/!/);
    for (const l of lines) expect(/kekuatan mutlak|dewa|hancurkan|musnah|menguasai|tunduk/i.test(l.text), l.id).toBe(false);
    for (const l of lines) expect(l.text.length, l.id).toBeLessThanOrEqual(130);
    const text = lines.map(l => l.text).join('\n');
    expect(text).toMatch(/Aku memasang|Aku memasangnya/);
    expect(text).toMatch(/salah menghitung risikonya/);
    expect(text).toMatch(/memisahkannya/);
    expect(text).toMatch(/menanggungnya/);
    expect(text).toMatch(/Itu adil/);
  });
  it('tidak ada pengampunan instan: Velthia menegaskan tanggung jawab dan menunda keputusan; tidak ada yang memaafkan', () => {
    const truthNames = ['C4_VARLGRIM_TRUTH', 'C4_TORVAN_REVEAL'];
    const velthia = textOf('C02', truthNames);
    expect(velthia).toMatch(/tidak bisa menganggap semuanya selesai/);
    expect(velthia).toMatch(/kehilangan|roboh/);
    expect(velthia).toMatch(/nanti/);
    expect(velthia).toMatch(/orang-orang yang kau rugikan/);
    const forgiving = /(kumaafkan|memaafkanmu|kau dimaafkan|kita impas|sudah kuampuni|kuampuni|kita lupakan|lupakan saja|tidak apa-apa)/i;
    for (const { name, l } of allLines.filter(x => x.l.speaker === 'C02' || x.l.speaker === 'C01')) expect(forgiving.test(l.text), `${name}:${l.id}`).toBe(false);
    // Nasib Varlgrim tidak dipastikan.
    const all = allLines.map(x => x.l.text).join('\n');
    expect(/Varlgrim (dihukum|dibebaskan|mati|tewas|dipenjara)|dihukum mati|digantung/i.test(all)).toBe(false);
    // Varlgrim memilih menahan sisa retakan.
    const lines = linesOf(C4_SCRIPTS.C4_VARLGRIM_TRUTH!);
    expect(lines.some(l => l.id === 'C4-06-L003')).toBe(true);
    expect(lines.some(l => l.speaker === 'SYSTEM' && /Retakan kecil di sana berhenti merambat/.test(l.text))).toBe(true);
  });
  it('Torvan: tenang dan jenaka, mengakui batas, tidak memberi hadiah, tidak menghidupkan korban, tidak mengatur perasaan', () => {
    const t = textOf('C03');
    expect(t).toMatch(/Aku sudah lama berlatih/);
    expect(t).toMatch(/tidak berhak mencabut pilihan manusia/);
    expect(t).toMatch(/tidak berhak menghapus akibatnya/);
    expect(t).toMatch(/Tidak ada hadiah perpisahan/);
    expect(t).toMatch(/Aku tidak mengatur itu/);
    expect(t).toMatch(/bukan hakku/);
    expect(/kuhidupkan|akan kuhidupkan|kubangkitkan|kuberikan kalian|kuberi kalian|kupulihkan|kuulang waktu|kuhapus/i.test(t)).toBe(false);
    // Reveal pencipta hanya pada C4-06 (kanon L008); skrip lain tidak menyebut pencipta.
    for (const { name, l } of allLines.filter(x => /pencipta|membuat dunia/i.test(x.l.text))) expect(['C4_TORVAN_REVEAL'], `${name}:${l.id}`).toContain(name);
    // Torvan pergi dengan cara sederhana: tidak ada efek cahaya/ilahi pada narasi kepergiannya.
    const leaves = linesOf(C4_SCRIPTS.C4_TORVAN_LEAVES!).map(l => l.text).join('\n');
    expect(/cahaya|bersinar|menghilang dalam|asap|sayap|halo|melayang/i.test(leaves)).toBe(false);
    expect(leaves).toMatch(/lorong itu kosong/);
  });
  it('konsekuensi nyata: menara runtuh, evakuasi karena keputusan Velthia, tidak semua selamat, arsip terkubur', () => {
    const ret = allLines.filter(x => x.name === 'C4_RETURN_AVELORIA').map(x => x.l.text).join('\n');
    expect(ret).toMatch(/Bangunannya\.\.\. tidak semuanya bertahan/);
    expect(ret).toMatch(/Evakuasi berjalan sesuai urutan Yang Mulia/);
    expect(ret).toMatch(/terlambat keluar/);
    expect(ret).toMatch(/Arsip bawah menara terkubur/);
    expect(ret).toMatch(/Dewan tetap menunggu/);
    const tower = allLines.filter(x => x.name === 'C4_TOWER_FALL').map(x => x.l.text).join('\n');
    expect(tower).toMatch(/debu/);
    expect(tower).toMatch(/Tidak semuanya bisa diselamatkan/);
    const reportB = allLines.filter(x => x.name === 'C4_REPORT_B').map(x => x.l.text).join('\n');
    expect(reportB).toMatch(/jangan berbalik/);
  });
  it('tema pilihan: C4_OLD_MEMORY berakhir dengan "memilih, bukan ramalan" tanpa pidato cinta atau pembicaraan takdir panjang', () => {
    const ls = linesOf(C4_SCRIPTS.C4_OLD_MEMORY!);
    const after = ls.slice(ls.findIndex(l => l.id === 'C4-05-L004') + 1);
    expect(after.some(l => /tidak ada ramalan yang menyuruh kita/.test(l.text))).toBe(true);
    expect(after.some(l => /Kita yang memutuskan/.test(l.text))).toBe(true);
    for (const { name, l } of allLines) expect(/cinta|mencintai|sayang|kekasih|jatuh hati|belahan jiwa|jodoh|benang takdir|semesta/i.test(l.text), `${name}:${l.id}`).toBe(false);
    // Yaric dan Velthia tidak berpidato: tiap baris Yaric <= 105 karakter pada draf.
    for (const { name, l } of allLines.filter(x => x.l.speaker === 'C01' && x.l.source === 'DRAFT_IMPL')) expect(l.text.length, `${name}:${l.id}`).toBeLessThanOrEqual(105);
  });
  it('Perlindungan: diajarkan di arsip, diuji di Ruang Uji Segel, dan diingatkan sebelum boss', () => {
    expect(allLines.filter(x => x.name === 'C4_ARCHIVE_VELTHIA').map(x => x.l.text).join('\n')).toMatch(/Perlindungan/);
    expect(allLines.filter(x => x.name === 'C4_AEGIS_TRIAL_INTRO').map(x => x.l.text).join('\n')).toMatch(/Perlindungan/);
    const boss = allLines.filter(x => x.name === 'C4_BOSS_INTRO').map(x => x.l.text).join('\n');
    expect(boss).toMatch(/Perlindungan/);
    expect(boss).toMatch(/menahan langit/);
    expect(boss).toMatch(/Beri aku giliran/);
  });
});

describe('Chapter IV dialogue: pilihan', () => {
  const choices = entries.flatMap(([name, s]) => s.nodes.filter((n): n is DialogueChoice => n.type === 'choice').map(c => ({ name, c })));
  it('tepat satu choice di seluruh Bab IV: C4_CONFRONT, respons Yaric, dua frasa pendek, ekspresi valid', () => {
    expect(choices).toHaveLength(1);
    const { name, c } = choices[0]!;
    expect(name).toBe('C4_CONFRONT');
    expect(c.speaker).toBe('C01');
    expect(c.options).toHaveLength(2);
    expect(new Set(c.options.map(o => o.id)).size).toBe(2);
    for (const o of c.options) {
      expect(o.text.length).toBeGreaterThan(5);
      expect(o.text.length).toBeLessThanOrEqual(60);
      if (o.expression) expect(PORTRAIT_EXPRESSIONS.C01).toContain(o.expression);
    }
  });
  it('choice berada di antara C4-02-L003 dan C4-02-L004 sehingga kedua opsi bermuara pada baris kanon yang sama', () => {
    const nodes = C4_SCRIPTS.C4_CONFRONT!.nodes;
    const i = nodes.findIndex(n => n.type === 'choice');
    expect((nodes[i - 1] as DialogueLine).id).toBe('C4-02-L003');
    expect((nodes[i + 1] as DialogueLine).id).toBe('C4-02-L004');
  });
  it('kedua opsi dapat dimainkan sampai selesai dan menghasilkan jumlah baris yang sama (tanpa cabang lore)', () => {
    const counts: number[] = [];
    for (const idx of [0, 1]) {
      const r = new DialogueRunner(C4_SCRIPTS.C4_CONFRONT!, { getTextSpeed: () => 'instant', charsWithPortrait: 28, charsWithoutPortrait: 36, linesPerPage: 4 });
      r.start();
      let guard = 0;
      while (r.state !== 'done' && guard++ < 400) {
        if (r.state === 'choice') {
          if (idx === 1) r.moveChoice(1);
          r.press();
        } else {
          r.update(700);
          r.press();
        }
      }
      expect(r.state).toBe('done');
      expect(r.choicesMade['C4-02-CHOICE']).toBe(idx === 0 ? 'skeptic' : 'gentle');
      counts.push(r.linesShown.length);
      expect(r.linesShown).toContain('C4-02-L004');
      expect(r.linesShown).toContain('C4-02-L006');
    }
    expect(counts[0]).toBe(counts[1]);
  });
});

describe('Chapter IV dialogue: banner battle', () => {
  it('kunci tepat tujuh dan semuanya terisi', () => {
    expect(Object.keys(C4_BATTLE_CALLOUTS).sort()).toEqual([...CALLOUT_KEYS].sort());
  });
  it('speaker, ekspresi dan portrait valid; teks <= 80 karakter, tanpa baris baru', () => {
    for (const k of CALLOUT_KEYS) {
      const c = C4_BATTLE_CALLOUTS[k]!;
      expect((CHARACTER_IDS as readonly string[]).includes(c.speaker), k).toBe(true);
      expect(allowedExpressions(c.speaker), k).toContain(c.expression);
      const key = `${c.speaker}_${c.expression}`;
      if (c.speaker !== 'C04' || (existsSync(HD) && readdirSync(HD).some(f => f.startsWith('C04_')))) expect(existsSync(resolve(HD, `${key}.png`)), `${k} ${key}`).toBe(true);
      expect(c.text.length, k).toBeGreaterThan(10);
      expect(c.text.length, k).toBeLessThanOrEqual(80);
      expect(c.text.includes('\n'), k).toBe(false);
    }
  });
  it('meteor_call menjelaskan kebutuhan Perlindungan; meteor_hold dari Varlgrim menunggu; defeat_hint mengingatkan Perlindungan', () => {
    expect(C4_BATTLE_CALLOUTS.meteor_call!.speaker).toBe('C02');
    expect(C4_BATTLE_CALLOUTS.meteor_call!.text).toMatch(/Perlindungan/);
    expect(C4_BATTLE_CALLOUTS.meteor_call!.text).toMatch(/giliran/);
    expect(C4_BATTLE_CALLOUTS.meteor_hold!.speaker).toBe('C04');
    expect(C4_BATTLE_CALLOUTS.meteor_hold!.text).toMatch(/menunggu/);
    expect(C4_BATTLE_CALLOUTS.defeat_hint!.text).toMatch(/Perlindungan/);
    expect(C4_BATTLE_CALLOUTS.aegis_taught!.text).toMatch(/Perlindungan/);
    expect(C4_BATTLE_CALLOUTS.defeat_hint!.text).not.toMatch(/!/);
  });
  it('Varlgrim tidak berteriak pada banner (tanpa tanda seru)', () => {
    for (const c of Object.values(C4_BATTLE_CALLOUTS).filter(x => x.speaker === 'C04')) expect(c.text).not.toMatch(/!/);
  });
});

describe('Chapter IV dialogue: muat di kotak dialog', () => {
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
      const choiceCount = s.nodes.filter(n => n.type === 'choice').length;
      expect(r.linesShown.length, name).toBe(linesOf(s).length + choiceCount);
    }
  });
  it('adegan diberi ruang bernapas: ada jeda panjang (>= 500 ms) dan baris SYSTEM pada setiap skrip besar', () => {
    for (const n of ['C4_CONFRONT', 'C4_TOWER_FALL', 'C4_OLD_MEMORY', 'C4_VARLGRIM_TRUTH', 'C4_TORVAN_REVEAL', 'C4_RETURN_AVELORIA']) {
      const ls = linesOf(C4_SCRIPTS[n]!);
      expect(ls.some(l => (l.pauseMs ?? 0) >= 500), n).toBe(true);
      expect(ls.some(l => l.speaker === 'SYSTEM'), n).toBe(true);
    }
  });
});

describe('Chapter IV dialogue: statistik audit', () => {
  it('menghitung baris kanon vs DRAFT_IMPL', () => {
    const canon = allLines.filter(x => x.l.source === 'DIALOGUE_EVENTS').length;
    const drafts = allLines.filter(x => x.l.source === 'DRAFT_IMPL').length;
    // eslint-disable-next-line no-console
    console.log(`C4 dialogue: ${entries.length} skrip, ${canon} baris kanon, ${drafts} baris DRAFT_IMPL, ${CALLOUT_KEYS.length} banner`);
    expect(canon).toBe(36);
    expect(drafts).toBeGreaterThan(0);
  });
});
