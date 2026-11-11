import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BattleSession } from '../../src/game/combat/BattleSession';
import { FIRST_HOLLOWLING_FLAG, MOURNFANG_FLAG, MOURNFANG_VICTORY_SEEN } from '../../src/game/combat/encounters';
import { ALL_CHAPTER1_SCRIPTS } from '../../src/game/dialogue/chapter1';
import { C2_AZIE, C2_FAREWELL, C2_NAME_ECHO, C2_NAME_FOUND, C2_SHADOW, C2_STONE, C2_ZIRA } from '../../src/game/dialogue/chapter2';
import { BELL_FIRST, BELL_SECOND, CITY_ARCHIVE, CITY_AUDIENCE, CITY_GATE, CITY_VISTA, REPORTS } from '../../src/game/dialogue/aveloria';
import { FIRST_HOLLOWLING_INTRO, FIRST_HOLLOWLING_VICTORY } from '../../src/game/dialogue/firstHollowling';
import { MOURNFANG_INTRO, MOURNFANG_RESPONSE, MOURNFANG_VICTORY } from '../../src/game/dialogue/mournfang';
import { speakerLabel } from '../../src/game/dialogue/speaker';
import { PORTRAIT_EXPRESSIONS } from '../../src/game/data/assetPaths';
import { DISPLAY_NAMES, type DialogueLine, type DialogueScript } from '../../src/game/dialogue/types';
import { CITY_FLAG } from '../../src/game/story/aveloriaFlags';
import { C2 } from '../../src/game/story/chapter2Flags';
import { Chapter2Story } from '../../src/game/story/Chapter2Story';
import { IDENTITY_FLAG, TRUE_NAME, UNKNOWN_LABEL, displayNameOf, isNameKnown } from '../../src/game/story/identity';
import { journalNotes } from '../../src/game/story/journal';
import { GameState, createNewGameData, validateGameStateData } from '../../src/game/systems/GameState';
import { readPng } from './helpers/png';

const PUBLIC = resolve(__dirname, '../../public');
const lines = (scripts: readonly DialogueScript[]): DialogueLine[] => scripts.flatMap(s => s.nodes).filter((n): n is DialogueLine => n.type === 'line');

describe('Identitas Yaric: tidak bocor sebelum pengungkapan', () => {
  const chapter1: DialogueScript[] = [...ALL_CHAPTER1_SCRIPTS, FIRST_HOLLOWLING_INTRO, FIRST_HOLLOWLING_VICTORY, MOURNFANG_INTRO, MOURNFANG_RESPONSE, MOURNFANG_VICTORY,
    CITY_VISTA, CITY_GATE, CITY_ARCHIVE, CITY_AUDIENCE, REPORTS, BELL_FIRST, BELL_SECOND].filter(Boolean);
  const chapter2Pre: DialogueScript[] = [C2_AZIE, C2_FAREWELL, C2_ZIRA, C2_SHADOW, C2_STONE];

  it('semua dialog Bab I dan Bab II pra-pengungkapan tidak menyebut nama atau memberi label "Yaric"', () => {
    const all = lines([...chapter1, ...chapter2Pre]);
    expect(all.length).toBeGreaterThan(100);
    for (const line of all) {
      expect(line.text, line.id).not.toMatch(/yaric/i);
      expect(speakerLabel(line, false), line.id).not.toMatch(/yaric/i);
    }
  });

  it('ucapan Yaric berlabel "???", monolog batin tanpa label, karakter lain tetap bernama', () => {
    const speech = { type: 'line', id: 'x', speaker: 'C01', text: 'Hai', kind: 'speech', source: 'DRAFT_IMPL' } as DialogueLine;
    expect(speakerLabel(speech, false)).toBe(UNKNOWN_LABEL);
    expect(speakerLabel({ ...speech, kind: 'thought' }, false)).toBe('');
    expect(speakerLabel({ ...speech, speaker: 'C08' }, false)).toBe('Nambo');
    expect(speakerLabel({ ...speech, speaker: 'C02' }, false)).toBe('Velthia');
    expect(speakerLabel({ ...speech, label: 'Catatan A' }, false)).toBe('Catatan A');
  });

  it('setelah pengungkapan label menjadi Yaric; ID internal tetap C01', () => {
    const speech = { type: 'line', id: 'x', speaker: 'C01', text: 'Hai', kind: 'speech', source: 'DRAFT_IMPL' } as DialogueLine;
    expect(speakerLabel(speech, true)).toBe(TRUE_NAME);
    expect(speakerLabel({ ...speech, kind: 'thought' }, true)).toBe(TRUE_NAME);
    expect(displayNameOf('C01', true, DISPLAY_NAMES)).toBe('Yaric');
    expect(displayNameOf('C01', false, DISPLAY_NAMES)).toBe(UNKNOWN_LABEL);
    expect(speech.speaker).toBe('C01');
  });

  it('isNameKnown: flag identitas, atau flag Bab II lama yang hanya mungkin sesudah pengenalan (kompatibel save lama)', () => {
    expect(isNameKnown({})).toBe(false);
    expect(isNameKnown(undefined)).toBe(false);
    expect(isNameKnown(Object.fromEntries(Object.values(CITY_FLAG).map(f => [f, true])))).toBe(false); // Bab I selesai belum tahu nama
    expect(isNameKnown({ [IDENTITY_FLAG]: true })).toBe(true);
    for (const legacy of [C2.forest, C2.torvan, C2.tutorial, C2.veyrath, C2.complete]) expect(isNameKnown({ [legacy]: true }), legacy).toBe(true);
    expect(isNameKnown({ [C2.start]: true, [C2.depart]: true, [C2.farewell]: true, [C2.zira]: true })).toBe(false);
  });

  it('momen pengungkapan: batu -> suara -> flag identitas -> label nama -> flag forest, hanya pertama kali', () => {
    const state = new GameState();
    const data = createNewGameData(); data.chapter = 'II'; data.area = 'forest_2';
    for (const f of [FIRST_HOLLOWLING_FLAG, MOURNFANG_FLAG, MOURNFANG_VICTORY_SEEN, ...Object.values(CITY_FLAG), C2.start, C2.depart, C2.farewell, C2.zira]) data.flags[f] = true;
    data.position = { x: 152, y: 560, facing: 'right' };
    state.load(data);
    const story = new Chapter2Story(state);
    const first = story.interact('forest2_marker');
    expect(first.map(a => a.type === 'dialogue' ? a.script.id : a.type === 'setFlag' ? `flag:${a.flag}` : a.type)).toEqual(
      ['C2-04-STONE', 'C2-04-NAME-ECHO', `flag:${IDENTITY_FLAG}`, 'C2-04-NAME-FOUND', `flag:${C2.forest}`]);
    const echo = lines([C2_NAME_ECHO]);
    expect(echo.find(l => l.id === 'C2-04-X004')!.speaker).toBe('C01');
    expect(echo.map(l => speakerLabel(l, false))).toEqual(['', 'Suara', '']);
    expect(lines([C2_NAME_FOUND]).map(l => speakerLabel(l, true))).toEqual([TRUE_NAME]);
    for (const l of lines([C2_NAME_ECHO, C2_NAME_FOUND])) expect(l.source).toBe('DRAFT_IMPL');
    state.setFlag(IDENTITY_FLAG); state.setFlag(C2.forest);
    expect(story.interact('forest2_marker').map(a => a.type)).toEqual(['dialogue']); // ulang tidak mengulang pengungkapan
  });

  it('keadaan identitas bertahan melewati serialisasi (flag biasa, schema 2 tidak berubah)', () => {
    const data = createNewGameData(); data.flags[IDENTITY_FLAG] = true;
    const roundTrip = validateGameStateData(JSON.parse(JSON.stringify(data)));
    expect(roundTrip).not.toBeNull();
    expect(isNameKnown(roundTrip!.flags)).toBe(true);
    expect(roundTrip!.schemaVersion).toBe(2);
    // save Bab I lama (tanpa flag) tetap anonim
    const old = createNewGameData();
    for (const f of [FIRST_HOLLOWLING_FLAG, MOURNFANG_FLAG, ...Object.values(CITY_FLAG)]) old.flags[f] = true;
    expect(isNameKnown(old.flags)).toBe(false);
  });

  it('battle: aktor pemain tidak memakai nama Yaric sebelum pengungkapan', () => {
    const base = createNewGameData(); base.flags[FIRST_HOLLOWLING_FLAG] = true;
    const pre = new GameState(); pre.load(base);
    expect(new BattleSession(pre, 'hollowling').engine.snapshot().actors[0]!.name).not.toBe('Yaric');
    const known = createNewGameData(); known.flags[IDENTITY_FLAG] = true;
    const post = new GameState(); post.load(known);
    expect(new BattleSession(post, 'hollowling').engine.snapshot().actors[0]!.name).toBe('Yaric');
  });

  it('Jurnal: catatan pra-pengungkapan tidak menyebut nama; catatan "Sebuah nama" hanya setelah flag', () => {
    const flags: Record<string, boolean> = { 'c1.intro_seen': true, 'story.c1_nambo': true, 'story.c1_loop': true, [FIRST_HOLLOWLING_FLAG]: true, [MOURNFANG_FLAG]: true,
      ...Object.fromEntries(Object.values(CITY_FLAG).map(f => [f, true])), [C2.depart]: true, [C2.farewell]: true, [C2.zira]: true };
    const pre = journalNotes(flags);
    expect(pre.length).toBeGreaterThan(8);
    for (const n of pre) { expect(n.title + n.text, n.id).not.toMatch(/yaric/i); expect(n.id).not.toBe('name'); }
    const post = journalNotes({ ...flags, [IDENTITY_FLAG]: true });
    expect(post.some(n => n.id === 'name' && /Yaric/.test(n.text))).toBe(true);
    expect(post[0]!.id).toBe('name'); // yang terbaru di atas
  });
});

describe('Aset UI turunan', () => {
  it('portrait HD tersedia untuk setiap ekspresi yang dimuat: tinggi 352 dan berlatar transparan', () => {
    for (const [speaker, list] of Object.entries(PORTRAIT_EXPRESSIONS)) {
      for (const ex of list) {
        const p = resolve(PUBLIC, `assets/portraits_hd/${speaker}_${ex}.png`);
        expect(existsSync(p), p).toBe(true);
        const png = readPng(p);
        expect(png.height, `${speaker}_${ex}`).toBe(352);
        expect(png.width).toBeGreaterThan(200);
        expect(png.data[3]).toBeLessThanOrEqual(8);
      }
    }
  });

  it('bahan siluet Title Screen (Yaric, Velthia, greatsword) ada dan dicatat DRAFT', () => {
    const manifest = JSON.parse(readFileSync(resolve(PUBLIC, 'assets/ui.generated.json'), 'utf8')) as { items: { id: string; status: string }[] };
    for (const name of ['title_yaric', 'title_velthia', 'title_greatsword']) {
      expect(existsSync(resolve(PUBLIC, `assets/title/${name}.png`)), name).toBe(true);
      expect(manifest.items.find(i => i.id === `${name}.png`)?.status).toBe('DRAFT');
    }
  });
});


