import { describe, expect, it } from 'vitest';
import { BattleEngine, actor, aegisStatus, enemyAI, intentHint, type BattleState, type Command, type Intent } from '../../src/game/combat/BattleEngine';
import { AEGIS, aegisStress, stressLevel } from '../../src/game/combat/aegis';
import { GRAVORN_COMMANDS, RIFTBORN_COMMANDS, VARLGRIM_COMMANDS, AEGIS_COMMAND } from '../../src/game/story/chapter4Flags';
import { VARLGRIM, VARLGRIM_STATS, varlgrimPhaseFor } from '../../src/game/combat/varlgrim';
import { VELTHIA_COMMANDS } from '../../src/game/story/chapter3Flags';
import { actorOf, atMeteorCall, bossAct, c4Engine, doTurn, legalActions, partyStats, playC4, smartC4 } from './helpers/chapter4';

const L8 = { level: 8, potions: 3 };
const bossOf = (e: BattleEngine) => actorOf(e, 'C04');
const noRng = (): number => { throw new Error('RNG tidak boleh dipakai Chapter IV'); };
/** Pemain bertahan saja sampai boss bertindak; Velthia memakai Perlindungan bila meteor menggantung. Mengembalikan perintah boss. */
function bossCommands(e: BattleEngine, n: number): string[] {
  const out: string[] = [];
  let guard = 0;
  while (out.length < n && guard++ < 400 && !e.snapshot().outcome) {
    const me = e.current;
    if (me.side === 'enemy') { out.push(bossAct(e).command); continue; }
    if (me.id === 'C02' && e.unavailable(AEGIS_COMMAND) === null && e.snapshot().meteor?.open) doTurn(e, AEGIS_COMMAND);
    else doTurn(e, 'defend');
  }
  return out;
}
/** Naikkan HP pemain agar pola boss dapat diamati tanpa kekalahan. */
const sturdy = (s: BattleState) => { for (const a of s.actors) if (a.side === 'player') { a.stats.HP = 9999; a.hp = 9999; } };

describe('Perlindungan (velthia_aegis): ketersediaan dan efek', () => {
  it('hanya Velthia, hanya bila terbuka dan bermuatan, tanpa MP', () => {
    const e = c4Engine('varlgrim', L8);
    expect(e.current.id).toBe('C01');
    expect(e.unavailable(AEGIS_COMMAND)).toMatch(/belum terbuka/); // Yaric tidak punya
    doTurn(e, 'defend'); expect(e.current.id).toBe('C02');
    const mp = actorOf(e, 'C02').mp;
    expect(e.unavailable(AEGIS_COMMAND)).toBeNull();
    const r = doTurn(e, AEGIS_COMMAND);
    expect(actorOf(e, 'C02').mp).toBe(mp); // tanpa biaya MP
    expect(actorOf(e, 'C02').aegis).toBe(0); // hanya casting yang menghabiskan muatan
    expect(r.frameKey).toBe('special'); expect(r.skillId).toBe(AEGIS_COMMAND);
    expect(r.effects.map(x => x.kind)).toEqual(['aegis', 'aegis']); expect(r.targetIds.sort()).toEqual(['C01', 'C02']);
    expect(r.meteor).toMatchObject({ event: 'aegis_cast', protectedIds: ['C01', 'C02'], charge: 0 });
    for (const id of ['C01', 'C02']) expect(actorOf(e, id).statuses.some(s => s.id === 'aegis')).toBe(true);
  });
  it('tidak tersedia tanpa flag (tidak ada di skills), tanpa muatan, atau di pertarungan tanpa ancaman besar', () => {
    const noSkill = c4Engine('varlgrim', L8, a => { a.find(x => x.id === 'C02')!.skills = a.find(x => x.id === 'C02')!.skills!.filter(s => s !== AEGIS_COMMAND); });
    doTurn(noSkill, 'defend'); expect(noSkill.unavailable(AEGIS_COMMAND)).toMatch(/belum terbuka/);
    const normal = c4Engine('riftborn', L8); doTurn(normal, 'defend');
    expect(normal.unavailable(AEGIS_COMMAND)).toMatch(/tidak ada ancaman besar/i);
    const spent = c4Engine('varlgrim', L8, a => { a.find(x => x.id === 'C02')!.aegis = 0; }); doTurn(spent, 'defend');
    expect(spent.unavailable(AEGIS_COMMAND)).toMatch(/sudah dipakai/);
  });
  it('tidak terbuka lewat level: bukan bagian VELTHIA_COMMANDS dan tidak ada di skills bawaan Velthia', () => {
    expect((VELTHIA_COMMANDS as readonly string[]).includes(AEGIS_COMMAND)).toBe(false);
    expect(actor('C02', 'player', partyStats({ level: 10 }).C02).skills).not.toContain(AEGIS_COMMAND);
  });
  it('perisai tidak dapat dihapus/diganti: Bloom, Ward, Defend, berbagai giliran tidak menghapusnya; tidak berkurang per giliran', () => {
    const e = c4Engine('varlgrim', L8); { const st = e.snapshot(); sturdy(st); e.restore(st); }
    doTurn(e, 'defend'); doTurn(e, AEGIS_COMMAND);
    bossAct(e);
    for (let i = 0; i < 4; i++) {
      for (const [cmd, t] of [['defend'], ['velthia_ward', 'C01'], ['velthia_bloom'], ['velthia_mend', 'C01']] as [Command, string?][]) {
        if (e.current.side === 'enemy') bossAct(e);
        if (e.unavailable(cmd, t) === null) doTurn(e, cmd, t); else doTurn(e, 'defend');
      }
    }
    for (const id of ['C01', 'C02']) expect(actorOf(e, id).statuses.find(s => s.id === 'aegis')).toMatchObject({ turns: AEGIS.statusTurns });
    // sudah menaungi seluruh barisan: tidak dapat dipasang ulang (tidak ada "mengganti")
    while (e.current.id !== 'C02') { if (e.current.side === 'enemy') bossAct(e); else doTurn(e, 'defend'); }
    expect(e.unavailable(AEGIS_COMMAND)).toMatch(/sudah menaungi|sudah dipakai/);
  });
  it('perintah musuh tidak dapat dipakai pemain; perintah pemain tidak dapat dipakai musuh', () => {
    const e = c4Engine('varlgrim', L8);
    for (const c of [...VARLGRIM_COMMANDS, ...RIFTBORN_COMMANDS, ...GRAVORN_COMMANDS]) expect(e.unavailable(c as Command)).toBe('Aksi ini hanya untuk musuh.');
    doTurn(e, 'defend'); doTurn(e, 'defend');
    expect(e.current.id).toBe('C04'); expect(e.unavailable(AEGIS_COMMAND)).toBe('Aksi tidak sesuai pola musuh.');
  });
});

describe('meteor: telegraf, jendela, dampak', () => {
  it('meteor_call membuka jendela, memulihkan muatan, membersihkan racun/stun, dan menampilkan niat meteor_fall', () => {
    const e = atMeteorCall(c4Engine('varlgrim', L8), s => {
      const v = s.actors.find(a => a.id === 'C02')!; v.aegis = 0; v.statuses.push({ id: 'poison', turns: 3 }, { id: 'stun', turns: 2 });
      s.actors.find(a => a.id === 'C01')!.statuses.push({ id: 'poison', turns: 3 }, { id: 'stun', turns: 1 });
    });
    const r = bossAct(e);
    expect(r.command).toBe('meteor_call'); expect(r.frameKey).toBe('raise'); expect(r.amount).toBe(0);
    expect(r.meteor).toMatchObject({ event: 'call', source: 'meteor', lethal: false, charge: 1 });
    expect(r.effects.every(x => x.kind === 'telegraph')).toBe(true);
    const s = e.snapshot();
    expect(s.meteor).toMatchObject({ open: true, velthiaActed: false, calls: 1 });
    expect(actorOf(e, 'C02').aegis).toBe(1);
    for (const id of ['C01', 'C02']) expect(actorOf(e, id).statuses.some(x => x.id === 'poison' || x.id === 'stun')).toBe(false);
    expect(bossOf(e).intent).toBe('meteor_fall');
    expect(intentHint(bossOf(e))).toMatch(/Perlindungan/); expect(intentHint(bossOf(e))).toMatch(/tanpa MP/);
  });
  it('tanpa Perlindungan meteor_fall mematikan seluruh barisan (defeat) dan tidak dapat di-Defend, di-Ward, atau diredam Bukan Aku', () => {
    const e = atMeteorCall(c4Engine('varlgrim', { ...L8, hpFrac: 1 }));
    bossAct(e);
    doTurn(e, 'defend'); doTurn(e, 'velthia_ward', 'C01'); // Ward + Defend pada Yaric; Velthia sendiri tidak terlindungi sama sekali
    expect(e.snapshot().actors.find(a => a.id === 'C01')!.statuses.some(x => x.id === 'shield')).toBe(true);
    const r = bossAct(e);
    expect(r.command).toBe('meteor_fall'); expect(r.meteor).toMatchObject({ event: 'fall', lethal: true, savedHp: 0, stressMax: 0 });
    expect(r.effects.every(x => x.lethal && x.kind === 'meteor')).toBe(true);
    expect(e.snapshot().outcome).toBe('defeat');
    for (const id of ['C01', 'C02']) expect(actorOf(e, id).hp).toBe(0);
  });
  it('dengan Perlindungan meteor_fall ditahan: HP tidak pernah di bawah 1, tekanan sisa deterministik, perisai habis, jendela tertutup', () => {
    const e = atMeteorCall(c4Engine('varlgrim', L8));
    bossAct(e); doTurn(e, 'attack'); doTurn(e, AEGIS_COMMAND);
    const before = { y: actorOf(e, 'C01'), v: actorOf(e, 'C02') };
    const r = bossAct(e);
    expect(r.meteor).toMatchObject({ event: 'fall', lethal: false });
    expect(e.snapshot().outcome).toBeNull();
    const y = actorOf(e, 'C01'), v = actorOf(e, 'C02');
    expect(y.hp).toBe(before.y.hp - aegisStress(before.y.hp, before.y.stats.HP)); expect(v.hp).toBe(before.v.hp - aegisStress(before.v.hp, before.v.stats.HP));
    expect(y.hp).toBeGreaterThanOrEqual(1); expect(v.hp).toBeGreaterThanOrEqual(1);
    expect(y.hp).toBeLessThan(before.y.hp); // tekanan nyata: terasa berat
    expect(r.effects.every(x => x.kind === 'meteor' && x.status === 'aegis' && !x.lethal && (x.stress ?? 0) >= 1)).toBe(true);
    expect(r.meteor!.savedHp).toBeGreaterThan(0);
    expect(r.absorbed).toBe(r.meteor!.savedHp);
    for (const a of [y, v]) expect(a.statuses.some(s => s.id === 'aegis')).toBe(false);
    expect(e.snapshot().meteor).toMatchObject({ open: false, falls: 1 });
    expect(bossOf(e).intent).toBe('seal_pulse'); // aftermath lembut
    expect(bossOf(e).calm).toBe(0);
  });
  it('HP 1 tertahan tanpa kerusakan; tingkat stres 0..3 mengikuti sisa HP', () => {
    const e = atMeteorCall(c4Engine('varlgrim', L8), s => { for (const a of s.actors) if (a.side === 'player') a.hp = 1; });
    bossAct(e); doTurn(e, 'defend'); doTurn(e, AEGIS_COMMAND);
    const r = bossAct(e);
    expect(r.effects.map(x => [x.amount, x.stress])).toEqual([[0, 0], [0, 0]]);
    expect(actorOf(e, 'C01').hp).toBe(1); expect(actorOf(e, 'C02').hp).toBe(1);
    expect(stressLevel(100, 100, 10)).toBe(1); expect(stressLevel(30, 100, 10)).toBe(2); expect(stressLevel(10, 100, 10)).toBe(3); expect(stressLevel(1, 100, 0)).toBe(0);
    expect(aegisStress(1, 100)).toBe(0); expect(aegisStress(2, 100)).toBe(1); expect(aegisStress(500, 100)).toBe(22);
  });
  it('Perlindungan menaungi hanya anggota hidup; yang tumbang tidak dihitung dan tidak menghalangi yang lain', () => {
    const e = atMeteorCall(c4Engine('varlgrim', L8), s => { s.actors.find(a => a.id === 'C01')!.hp = 0; s.order = ['C02', 'C01', 'C04']; });
    bossAct(e); expect(e.current.id).toBe('C02');
    const cast = doTurn(e, AEGIS_COMMAND); expect(cast.targetIds).toEqual(['C02']);
    const r = bossAct(e);
    expect(r.meteor!.lethal).toBe(false); expect(actorOf(e, 'C02').hp).toBeGreaterThanOrEqual(1); expect(actorOf(e, 'C01').hp).toBe(0);
  });
  it('hold: bila Velthia belum bertindak sejak telegraf boss menahan meteor, tanpa kerusakan, sampai ia bertindak', () => {
    const e = atMeteorCall(c4Engine('varlgrim', L8));
    bossAct(e);
    // paksa urutan tidak lazim: boss akan mendapat giliran sebelum Velthia (Yaric -> boss -> Velthia)
    const s = e.snapshot(); s.order = ['C01', 'C04', 'C02']; s.cursor = 0; e.restore(s);
    doTurn(e, 'defend');
    expect(e.current.id).toBe('C04'); expect(bossOf(e).intent).toBe('meteor_hold');
    expect(intentHint(bossOf(e))).toMatch(/menunggu Velthia/);
    const hpBefore = [actorOf(e, 'C01').hp, actorOf(e, 'C02').hp];
    const hold = bossAct(e);
    expect(hold.command).toBe('meteor_hold'); expect(hold.amount).toBe(0); expect(hold.effects).toEqual([]); expect(hold.frameKey).toBe('raise');
    expect([actorOf(e, 'C01').hp, actorOf(e, 'C02').hp]).toEqual(hpBefore);
    expect(e.snapshot().meteor).toMatchObject({ open: true, holds: 1, falls: 0 });
    expect(bossOf(e).intent).toBe('meteor_fall');
    expect(e.current.id).toBe('C02'); doTurn(e, AEGIS_COMMAND); // Velthia akhirnya bertindak
    doTurn(e, 'defend'); // Yaric
    expect(e.current.id).toBe('C04'); expect(bossOf(e).intent).toBe('meteor_fall'); // syarat terpenuhi: tidak lagi ditahan
    const r = bossAct(e); expect(r.command).toBe('meteor_fall'); expect(e.snapshot().outcome).toBeNull();
  });
  it('Velthia tumbang: meteor TIDAK dipanggil; boss memakai aksi biasa; Potion dapat membangkitkannya, lalu meteor kembali mungkin', () => {
    const e = atMeteorCall(c4Engine('varlgrim', { ...L8, potions: 2 }), s => { s.actors.find(a => a.id === 'C02')!.hp = 0; s.order = ['C01', 'C02', 'C04']; s.cursor = 2; });
    // niat meteor_call sudah tidak berlaku di akhir giliran berikut; mulai dari giliran Yaric
    const s0 = e.snapshot(); s0.cursor = 0; s0.actors.find(a => a.id === 'C04')!.intent = 'meteor_call'; e.restore(s0);
    expect(e.current.id).toBe('C01');
    doTurn(e, 'defend'); // finish -> sync: giliran berikutnya Velthia tumbang -> dilewati -> boss
    expect(e.current.id).toBe('C04');
    expect(bossOf(e).intent).not.toBe('meteor_call');
    const r = bossAct(e);
    expect(r.command).not.toBe('meteor_call'); expect(e.snapshot().meteor!.open).toBe(false);
    // jalur pemulihan: Potion membangkitkan sekutu tumbang
    expect(e.current.id).toBe('C01');
    expect(legalActions(e).some(a => a.command === 'potion' && a.targetId === 'C02')).toBe(true);
    const rev = doTurn(e, 'potion', 'C02');
    expect(rev.revived).toEqual(['C02']); expect(actorOf(e, 'C02').hp).toBe(36); expect(e.snapshot().items.potion).toBe(1);
    // bangkit lalu aksi biasa >= 1 -> meteor dapat dipanggil lagi (calm sudah terpenuhi)
    const cmds = bossCommands(e, 6);
    expect(cmds).toContain('meteor_call');
  });
  it('tanpa revivePotion (Bab I-III) Potion tidak membangkitkan: perilaku lama utuh', () => {
    const y = actor('C01', 'player', partyStats({ level: 5 }).C01), v = actor('C02', 'player', partyStats({ level: 5 }).C02);
    v.hp = 0; const e = new BattleEngine([y, v, actor('M01', 'enemy', { HP: 500, MP: 0, ATK: 1, DEF: 1, MAG: 1, MDEF: 1, SPD: 1 })], { potion: 2 });
    expect(e.unavailable('potion', 'C02')).toBe('Target tidak tersedia.');
  });
  it('Velthia kebal Stun selama jendela (stun baru diabaikan; aksi tetap tersedia)', () => {
    const e = atMeteorCall(c4Engine('varlgrim', L8)); bossAct(e);
    e.addStatus('C02', 'stun', 2); expect(actorOf(e, 'C02').statuses.some(s => s.id === 'stun')).toBe(false);
    // stun yang entah bagaimana ada pada Velthia saat jendela terbuka tidak menghilangkan gilirannya
    const s = e.snapshot(); s.actors.find(a => a.id === 'C02')!.statuses.push({ id: 'stun', turns: 2 }); e.restore(s);
    doTurn(e, 'defend');
    const p = e.prepare(AEGIS_COMMAND, e.snapshot().turn); expect(p).not.toBeNull(); expect(p!.command).toBe(AEGIS_COMMAND);
  });
});

describe('pola dan fase Varlgrim', () => {
  it('deterministik tanpa RNG: dua pertarungan identik menghasilkan log identik, dan RNG tidak pernah dipanggil', () => {
    const run = () => { const e = c4Engine('varlgrim', L8, undefined, undefined, noRng); const cmds = bossCommands(e, 30); return { cmds, log: e.snapshot().log }; };
    const a = run(), b = run();
    expect(a).toEqual(b);
  });
  it('fase 1 -> 2 -> 3 pada 66% dan 35% HP lewat jeda phase_shift tanpa kerusakan; stance->strike dan mark->strike tidak pernah terputus', () => {
    const e = c4Engine('varlgrim', L8, undefined, undefined, noRng);
    const s = e.snapshot(); sturdy(s); e.restore(s);
    const seq: string[] = []; const phases: number[] = [];
    let guard = 0;
    while (seq.length < 30 && guard++ < 500) {
      const me = e.current;
      if (me.side === 'enemy') {
        const st = e.snapshot(); const b = st.actors.find(a => a.id === 'C04')!;
        // pada tiap giliran boss, kurangi HP boss agar melewati ambang fase (hanya jika bukan jeda telegraf, aturan engine yang menentukan)
        if (seq.length === 1) b.hp = Math.floor(b.stats.HP * 0.6);   // di tengah jeda keeper_stance -> keeper_strike
        if (seq.length === 12) b.hp = Math.floor(b.stats.HP * 0.3);
        e.restore(st);
        const r = bossAct(e); seq.push(r.command); phases.push(bossOf(e).phase!);
        if (r.command === 'phase_shift') { expect(r.amount).toBe(0); expect(r.effects.filter(x => x.kind === 'damage')).toEqual([]); expect(r.phase).toBe(bossOf(e).phase); }
        continue;
      }
      doTurn(e, e.current.id === 'C02' && e.unavailable(AEGIS_COMMAND) === null && e.snapshot().meteor?.open ? AEGIS_COMMAND : 'defend');
    }
    const shifts = seq.map((c, i) => c === 'phase_shift' ? i : -1).filter(i => i >= 0);
    expect(shifts.length).toBe(2);
    expect(seq[0]).toBe('keeper_stance'); expect(seq[1]).toBe('keeper_strike'); expect(seq[2]).toBe('phase_shift'); // transisi hanya setelah strike, bukan di antara stance dan strike
    expect(phases[2]).toBe(2);
    for (const i of shifts) { expect(['keeper_stance', 'fracture_mark', 'meteor_call', 'meteor_hold']).not.toContain(seq[i - 1]); }
    // lead-in selalu diikuti pasangannya
    seq.forEach((c, i) => {
      if (c === 'keeper_stance') expect(seq[i + 1]).toBe('keeper_strike');
      if (c === 'fracture_mark') expect(seq[i + 1]).toBe('fracture_strike');
      if (c === 'meteor_call') expect(['meteor_fall', 'meteor_hold']).toContain(seq[i + 1]);
    });
    expect(phases.at(-1)).toBe(3);
    // fase 1 hanya memakai kosakata fase 1; fase 2 menambah fracture/distorsi; meteor hanya di fase 3
    const idx2 = shifts[0]!, idx3 = shifts[1]!;
    expect(seq.slice(0, idx2).every(c => ['keeper_stance', 'keeper_strike', 'seal_pulse', 'time_bind'].includes(c))).toBe(true);
    expect(seq.slice(idx2 + 1, idx3)).not.toContain('meteor_call');
    expect(seq.slice(idx2 + 1, idx3).some(c => c === 'fracture_mark' || c === 'distortion_wave')).toBe(true);
    expect(seq.slice(idx3 + 1)).toContain('meteor_call');
  });
  it('varlgrimPhaseFor: ambang 66% dan 35% (inklusif)', () => {
    expect([100, 67, 66, 36, 35, 1].map(p => varlgrimPhaseFor(p, 100))).toEqual([1, 1, 2, 2, 3, 3]);
  });
  it('lompatan HP besar: langsung ke fase tertinggi yang berlaku, tetap melewati satu jeda phase_shift', () => {
    const e = c4Engine('varlgrim', L8); const s = e.snapshot(); sturdy(s); s.actors.find(a => a.id === 'C04')!.hp = Math.floor(VARLGRIM_STATS.HP * 0.2); e.restore(s);
    const cmds = bossCommands(e, 5);
    expect(cmds.slice(0, 3)).toEqual(['keeper_stance', 'keeper_strike', 'phase_shift']);
    expect(bossOf(e).phase).toBe(3);
  });
  it('masuk fase 3 membangkitkan anggota tumbang (25% HP) agar pelajaran Perlindungan selalu dapat dicapai', () => {
    const e = c4Engine('varlgrim', L8); const s = e.snapshot(); sturdy(s);
    s.actors.find(a => a.id === 'C01')!.hp = 0; s.cursor = s.order.indexOf('C02'); s.actors.find(a => a.id === 'C04')!.hp = Math.floor(VARLGRIM_STATS.HP * 0.2); e.restore(s);
    let revived: string[] | undefined;
    for (let i = 0; i < 30 && !revived; i++) {
      if (e.current.side === 'enemy') { const r = bossAct(e); revived = r.revived; if (revived) expect(r.effects.some(x => x.kind === 'revive')).toBe(true); } else doTurn(e, 'defend');
    }
    expect(revived).toEqual(['C01']); expect(actorOf(e, 'C01').hp).toBe(Math.ceil(9999 * VARLGRIM.reviveFraction));
  });
  it('meteor: pertama langsung sesudah jeda phase_shift (telegraf sudah tampil), berikutnya setelah >= 2 aksi biasa; tidak ada sumber kerusakan musuh antara call dan fall', () => {
    const e = c4Engine('varlgrim', L8); const s = e.snapshot(); sturdy(s); s.actors.find(a => a.id === 'C04')!.hp = Math.floor(VARLGRIM_STATS.HP * 0.2); e.restore(s);
    const cmds = bossCommands(e, 30);
    const calls = cmds.map((c, i) => c === 'meteor_call' ? i : -1).filter(i => i >= 0);
    expect(calls.length).toBeGreaterThanOrEqual(3);
    const plain = (c: string) => !['meteor_call', 'meteor_hold', 'meteor_fall', 'phase_shift'].includes(c);
    const shift = cmds.indexOf('phase_shift');
    expect(calls[0]).toBe(shift + 1); expect(cmds.slice(shift + 1, calls[0]).filter(plain).length).toBeGreaterThanOrEqual(VARLGRIM.minPlainBeforeFirstMeteor);
    for (let i = 1; i < calls.length; i++) expect(cmds.slice(calls[i - 1]! + 2, calls[i]).filter(plain).length).toBeGreaterThanOrEqual(2);
    for (const i of calls) expect(cmds[i + 1]).toBe('meteor_fall'); // pemain selalu mendapat satu ronde penuh antar keduanya
  });
  it('time_bind menggeser giliran, menghapus penguat sasaran, tetapi tidak pernah menutup Perlindungan', () => {
    const e = c4Engine('varlgrim', L8); const s = e.snapshot(); sturdy(s);
    const boss = s.actors.find(a => a.id === 'C04')!; boss.intent = 'time_bind'; boss.rot = 0; s.cursor = s.order.indexOf('C04');
    s.actors.find(a => a.id === 'C01')!.statuses.push({ id: 'concord', turns: 1 }); e.restore(s);
    const r = bossAct(e);
    expect(r.command).toBe('time_bind'); expect(r.frameKey).toBe('plant');
    expect(r.order).toEqual(['C02', 'C01', 'C04']); // Yaric tertunda satu slot
    expect(actorOf(e, 'C01').statuses.some(x => x.id === 'concord')).toBe(false);
    expect(e.current.id).toBe('C02');
    expect(e.unavailable(AEGIS_COMMAND)).toBeNull(); // Velthia tetap dapat bertindak dan memakai Perlindungan
  });
  it('jendela meteor tidak mengubah urutan: setiap pemain hidup bertindak tepat sekali antara call dan fall', () => {
    for (const spd of [[17, 16, 8], [8, 16, 17], [17, 8, 12], [10, 10, 10], [5, 25, 15]] as const) {
      const e = c4Engine('varlgrim', L8, a => { a[0]!.stats.SPD = spd[0]; a[1]!.stats.SPD = spd[1]; a[2]!.stats.SPD = spd[2]; });
      atMeteorCall(e); bossAct(e);
      const acted: string[] = [];
      while (e.current.side === 'player') { acted.push(e.current.id); doTurn(e, e.current.id === 'C02' ? AEGIS_COMMAND : 'defend'); }
      expect(acted.sort(), `SPD ${spd}`).toEqual(['C01', 'C02']);
      expect(bossAct(e).meteor!.lethal).toBe(false);
    }
  });
});

describe('musuh Benteng: Riftborn, Gravorn, Penguji Perlindungan', () => {
  it('Penguji: telegraf rift_gather lalu rift_surge mematikan tanpa Perlindungan, tertahan dengannya; tidak ada kekalahan tak terhindarkan', () => {
    const e = c4Engine('trial', L8);
    const boss = () => actorOf(e, 'M06');
    expect(boss().intent).toBe('rift_gather'); expect(boss().lethalSurge).toBe(true);
    doTurn(e, 'attack'); doTurn(e, 'attack');
    const g = bossAct(e); expect(g.command).toBe('rift_gather'); expect(g.meteor).toMatchObject({ event: 'call', source: 'surge' });
    expect(boss().intent).toBe('rift_surge'); expect(intentHint(boss())).toMatch(/Perlindungan/);
    doTurn(e, 'attack'); doTurn(e, AEGIS_COMMAND);
    const surge = bossAct(e);
    expect(surge.meteor).toMatchObject({ event: 'fall', source: 'surge', lethal: false }); expect(e.snapshot().outcome).toBeNull();
    expect(actorOf(e, 'C01').hp).toBeGreaterThanOrEqual(1);
    // tanpa Perlindungan
    const e2 = c4Engine('trial', L8); doTurn(e2, 'attack'); doTurn(e2, 'attack'); bossAct(e2); doTurn(e2, 'defend'); doTurn(e2, 'velthia_ward', 'C01'); bossAct(e2);
    expect(e2.snapshot().outcome).toBe('defeat');
  });
  it('Penguji tidak mati sebelum surge pertama pada level 6-10 (tutorial pasti terjadi), dan menunggu Velthia (hold -> gather ulang)', () => {
    for (const level of [6, 8, 10]) {
      const e = c4Engine('trial', { level, potions: 0 });
      const round = () => { while (e.current.side === 'player') doTurn(e, e.current.id === 'C01' ? 'ground_slam' : 'velthia_pulse', 'M06'); };
      round(); expect(bossAct(e).command).toBe('rift_gather'); round(); // dua ronde pemain penuh sebelum surge pertama
      expect(e.snapshot().outcome, `L${level}`).toBeNull(); expect(actorOf(e, 'M06').hp, `L${level}`).toBeGreaterThan(0);
      expect(actorOf(e, 'M06').intent).toBe('rift_surge');
    }
    const e = c4Engine('trial', L8); doTurn(e, 'defend'); doTurn(e, 'defend'); bossAct(e);
    const s = e.snapshot(); s.order = ['C01', 'M06', 'C02']; s.cursor = 0; e.restore(s);
    doTurn(e, 'defend'); expect(actorOf(e, 'M06').intent).toBe('rift_gather'); // belum ada tindakan Velthia: diulang, bukan surge
    expect(bossAct(e).command).toBe('rift_gather');
  });
  it('Riftborn biasa: gather menandai target, surge berat TIDAK mematikan (Defend meredam, tanpa stun bila bertahan); tanpa jendela meteor', () => {
    const e = c4Engine('riftborn', L8);
    expect(e.snapshot().meteor).toBeUndefined();
    const seq: string[] = []; let stunned = false;
    for (let i = 0; i < 12; i++) {
      if (e.current.side === 'enemy') { const r = bossAct(e); seq.push(r.command); if (r.command === 'rift_gather') expect(r.telegraph).toMatchObject({ next: 'rift_surge' }); if (r.command === 'rift_surge') { expect(r.meteor).toBeUndefined(); stunned ||= e.snapshot().actors.some(a => a.statuses.some(s => s.id === 'stun')); } }
      else doTurn(e, e.current.id === 'C01' ? 'defend' : 'defend');
    }
    expect(seq.slice(0, 4)).toEqual(['rift_lash', 'rift_gather', 'rift_surge', 'rift_lash']);
    expect(stunned).toBe(false); // keduanya bertahan -> tidak terhenti
    const e2 = c4Engine('riftborn', { ...L8, hpFrac: 1 }); let st2 = false;
    for (let i = 0; i < 12 && !st2; i++) { if (e2.current.side === 'enemy') { if (bossAct(e2).command === 'rift_surge') st2 = e2.snapshot().actors.some(a => a.statuses.some(s => s.id === 'stun')); } else doTurn(e2, 'attack'); }
    expect(st2).toBe(true);
  });
  it('Gravorn: heave, brace (def_up + telegraf) lalu crush ke sasaran yang ditandai', () => {
    const e = c4Engine('gravorn', L8); const seq: string[] = []; let marked = '';
    for (let i = 0; i < 30; i++) {
      if (e.current.side === 'enemy') {
        const r = bossAct(e); seq.push(r.command);
        if (r.command === 'gravorn_brace') { marked = r.telegraph!.targetId; expect(actorOf(e, 'M04').statuses.some(s => s.id === 'def_up')).toBe(true); }
        if (r.command === 'gravorn_crush') { expect(r.targetId).toBe(marked); expect(actorOf(e, 'M04').intentTargetId).toBeUndefined(); }
      } else doTurn(e, 'defend');
    }
    expect(seq.slice(0, 5)).toEqual(['gravorn_heave', 'gravorn_heave', 'gravorn_brace', 'gravorn_crush', 'gravorn_heave']);
  });
  it('kedua pertarungan dua musuh memakai niat masing-masing dan selesai tanpa error', () => {
    const r = playC4(c4Engine('rift', L8), smartC4);
    expect(r.outcome).toBe('victory');
  });
});

describe('snapshot fase meteor, kebocoran keadaan, teks', () => {
  it('snapshot dalam memori dibuat saat fase 3 dimulai; restorePhase mengembalikan tepat ke sana, berulang, tanpa menyentuh yang lain', () => {
    const e = c4Engine('varlgrim', L8);
    expect(e.hasPhaseSnapshot).toBe(false); expect(e.restorePhase()).toBe(false);
    const s = e.snapshot(); sturdy(s); s.actors.find(a => a.id === 'C04')!.hp = Math.floor(VARLGRIM_STATS.HP * 0.3); e.restore(s);
    let guard = 0; while (!e.hasPhaseSnapshot && guard++ < 50) { if (e.current.side === 'enemy') bossAct(e); else doTurn(e, 'attack'); }
    expect(e.hasPhaseSnapshot).toBe(true);
    const atStart = e.snapshot();
    expect(atStart.actors.find(a => a.id === 'C04')).toMatchObject({ phase: 3, intent: 'phase_shift' });
    expect(atStart.pending).toBeNull(); expect(e.current.side).toBe('player');
    // bermain terus sampai kalah lalu ulang dari awal fase 3
    for (let i = 0; i < 60 && !e.snapshot().outcome; i++) { if (e.current.side === 'enemy') bossAct(e); else doTurn(e, 'defend'); }
    expect(e.snapshot().outcome).toBe('defeat');
    expect(e.restorePhase()).toBe(true); expect(e.snapshot()).toEqual(atStart);
    for (let k = 0; k < 2; k++) { for (let i = 0; i < 60 && !e.snapshot().outcome; i++) { if (e.current.side === 'enemy') bossAct(e); else doTurn(e, 'defend'); } expect(e.restorePhase()).toBe(true); expect(e.snapshot()).toEqual(atStart); }
  });
  it('tidak ada kebocoran keadaan antar battle: mesin independen, konstanta tidak berubah, restore menyalin dalam', () => {
    const before = JSON.stringify([VARLGRIM, AEGIS, VARLGRIM_STATS]);
    const a = c4Engine('varlgrim', L8), b = c4Engine('varlgrim', L8);
    const b0 = b.snapshot();
    bossCommands(a, 20);
    expect(b.snapshot()).toEqual(b0);
    const snap = a.snapshot(); snap.actors[0]!.hp = 1; expect(a.snapshot().actors[0]!.hp).not.toBe(1); // snapshot adalah salinan
    const c = c4Engine('varlgrim', L8); c.restore(snap); snap.actors[0]!.hp = 77; expect(c.snapshot().actors[0]!.hp).toBe(1);
    expect(JSON.stringify([VARLGRIM, AEGIS, VARLGRIM_STATS])).toBe(before);
    const fresh = c4Engine('varlgrim', L8); expect(fresh.snapshot().meteor).toMatchObject({ open: false, calls: 0, falls: 0 }); expect(fresh.hasPhaseSnapshot).toBe(false);
  });
  it('setiap niat C4 punya petunjuk berbahasa Indonesia; ancaman besar menyebut Perlindungan; hint menyadari perisai yang sudah terpasang', () => {
    const all = [...VARLGRIM_COMMANDS, ...RIFTBORN_COMMANDS, ...GRAVORN_COMMANDS] as Intent[];
    for (const i of all) { const h = intentHint({ intent: i, intentTargetName: 'Yaric' }); expect(h.length, i).toBeGreaterThan(30); expect(h, i).toMatch(/[a-z]/); expect(enemyAI({ intent: i })).toBe(i); }
    expect(intentHint({ intent: 'meteor_fall' })).toMatch(/Perlindungan/); expect(intentHint({ intent: 'meteor_hold' })).toMatch(/Perlindungan/); expect(intentHint({ intent: 'meteor_call' })).toMatch(/Perlindungan/);
    expect(intentHint({ intent: 'meteor_fall' }, { aegisCovered: true })).toMatch(/sudah menaungi/);
    expect(intentHint({ intent: 'keeper_strike', intentTargetName: 'Velthia' })).toMatch(/Velthia/);
  });
  it('aegisStatus melaporkan ancaman, jendela, muatan, dan cakupan untuk menu', () => {
    const e = c4Engine('varlgrim', L8);
    expect(aegisStatus(e.snapshot())).toEqual({ threat: true, windowOpen: false, charge: 1, covered: false, velthiaAlive: true });
    expect(aegisStatus(c4Engine('riftborn', L8).snapshot())).toMatchObject({ threat: false, charge: null });
    doTurn(e, 'defend'); doTurn(e, AEGIS_COMMAND);
    expect(aegisStatus(e.snapshot())).toMatchObject({ charge: 0, covered: true });
  });
});
