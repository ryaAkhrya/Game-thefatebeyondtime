# Sprint 3 / Agen N — data dialog Chapter III

Status: selesai untuk lingkup data. Semua teks DRAFT/NEEDS_REVIEW, bukan naskah approved.

## File
- `web/src/game/dialogue/chapter3.ts`: 38 skrip `DialogueScript`, `C3_SCRIPTS`, `C3_CANON_COVERAGE`, `chapter3Canon(scene, from, to)`.
- `web/src/game/dialogue/chapter3.lines.json`: salinan 65 baris `DIALOGUE_EVENTS.json` C3-01..07 (teks apa adanya; C3-01-L007 memakai em dash asli di JSON).
- `web/tests/unit/chapter3-dialogue.test.ts`: 19 tes (lulus).

## Pemetaan kanon -> skrip
| Adegan | Baris | Skrip |
|---|---|---|
| C3-01 | 11 | `C3_DECISION` (ditambah pembuka dan penutup DRAFT_IMPL) |
| C3-02 | 7 | `C3_TORVAN_STAYS` |
| C3-03 | 17 | `C3_TEMPLE_CAMP` (satu baris panggung DRAFT_IMPL disisipkan antara L015 dan L016) |
| C3-04 | 5 | L001-002 `C3_PUZZLE_HINT_A` (pilar dua garis), L003-005 `C3_PUZZLE_HINT_B` (segel lama) |
| C3-05 | 6 | L001-004 `C3_CHRONOLITH_INTRO`, L005-006 `C3_CHRONOLITH_OUTRO` |
| C3-06 | 5 | `C3_HIDDEN_NAME` |
| C3-07 | 14 | L001-009 `C3_PROMISE`, L010-014 `C3_CHAPTER_END` |

Skrip tanpa baris kanon (semuanya DRAFT_IMPL): `C3_CRISIS_WATCH`, `C3_AZIE_DEMAND`, `C3_VELTHIA_REFUSES`, `C3_NOBLES_DOUBT`, `C3_EVAC_ORDER`, `C3_TALRIC_EVAC`, `C3_DEPART`, sembilan `C3_NPC_*`, `C3_TEMPLE_ENTRANCE`, `C3_PUZZLE_INTRO`, `C3_PUZZLE_HINT_C`, `C3_PUZZLE_SOLVED_A/B/C`, `C3_PUZZLE_NOTE`, `C3_GATE_OPEN`, `C3_TEMPLE_INSPECT_1..4`.

Hitungan: 65 baris kanon (`source: 'DIALOGUE_EVENTS'`) + 138 baris `DRAFT_IMPL` (ID `C3-0n-Xnnn` / `C3-NPC-Xnnn`). Baris naskah kerja yang tidak ada di JSON ("Tidak bergerak.", "Nah. Pintu ini rupanya masih mau mendengar alasan.", "Aku lebih suka pintu biasa.", tulisan "Perintah penjagaan: Varlgrim...") juga DRAFT_IMPL karena tipe `source` tidak punya nilai khusus Bab III (types.ts bukan milik N).

## Keputusan penulisan
- Azie: argumen ditahan "dengan hormat" demi menenangkan bangsawan, mengaku belum punya bukti; konflik profesional, bukan penjahat. Velthia menolak, minta keberatan dicatat.
- Velthia ikut karena lambang pusaka kerajaan cocok dengan arsip (Azie menulisnya di jurnal), bukan semata Yaric. Tidak ada pengakuan cinta; kedekatan lewat perbedaan pendapat jujur di pintu kuil dan kebiasaan kecil di kemah.
- Torvan: membantu warga (roti, ember), jahil; satu petunjuk ringan di akhir (tahu jalan, mengelak) dan satu reaksi serius pada "Heart of Time". Tidak menyebut pencipta.
- "Varlgrim" hanya muncul di `C3_HIDDEN_NAME`, pertama kali sebagai baris `read` (tulisan). "Heart of Time" hanya di tulisan itu dan `C3_CHAPTER_END`.
- Ramalan: lempeng Chronolith menyatakan kehancuran hanya satu kemungkinan (legenda terpotong). Kilasan janji sangat singkat di akhir `C3_PROMISE`. Penutup hanya menyiapkan perjalanan ke Benteng Kala; tidak ada konten Bab IV.
- Narasi SYSTEM tidak menyebut "Yaric"; nama hanya lewat speaker `C01` dan `speakerLabel`.

## Catatan untuk agen A / T
- Semua skrip berdiri sendiri; urutan alur Aveloria: CRISIS_WATCH, AZIE_DEMAND, VELTHIA_REFUSES, NOBLES_DOUBT, EVAC_ORDER, TALRIC_EVAC, DECISION, TORVAN_STAYS, DEPART. C3_TORVAN_STAYS berisi Torvan berkata "sampai jalur masuk"; Torvan muncul lagi di `C3_CHAPTER_END` di jalur aman luar kuil.
- Kuil: ENTRANCE, CAMP (malam), PUZZLE_INTRO, INSPECT_1..4 (opsional), HINT_A/B/C (HINT_A/B memuat baris kanon C3-04; boleh dibaca ulang tetapi anggap pemutaran pertama sebagai tempat kanon), SOLVED_A/B/C, NOTE, GATE_OPEN, CHRONOLITH_INTRO, battle, CHRONOLITH_OUTRO, HIDDEN_NAME, PROMISE, CHAPTER_END.
- Teks puzzle bersifat generik (pilar dua garis, segel lama, alas ketiga yang ditutup belakangan). Jika desain puzzle T berbeda, minta perubahan teks lewat lead.

## Bukti
- `npx vitest run tests/unit/chapter3-dialogue.test.ts`: 19/19 lulus (kanon 65 verbatim sekali dan berurutan, ID unik, pembicara/ekspresi/portrait valid, kata terlarang, runner 28/36 karakter x 4 baris x 4 halaman).
- `npx tsc --noEmit`: tidak ada error di file N. Ada 3 error di `src/game/scenes/BattleScene.ts` (perintah `velthia_*`, milik agen lain, belum ada di union `Command`).

## Permintaan ke lead
- Tambahkan `'CHAPTER_III_SCRIPT'` ke union `DialogueLine['source']` bila ingin membedakan baris dari naskah kerja dengan DRAFT_IMPL murni (opsional).
- `C3_TORVAN_STAYS` tidak menyetel party; pergantian party/flag dilakukan view/story setelah skrip selesai.
