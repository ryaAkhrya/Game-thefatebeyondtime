// Cermin dari MUSIC_REGISTRY.json (root proyek) dan AUDIO_COMPOSER_HANDOFF.md.
// Sebuah tes (tests/unit/music-registry.test.ts) memeriksa bahwa isi file ini sama dengan JSON tersebut.
//
// ATURAN KERAS (CLAUDE.md #6): jangan membuat, mengunduh, memilih, atau memasukkan BGM.
// Semua cue di bawah berstatus AWAITING_COMPOSER dan game berjalan senyap sampai Game Director
// menyediakan file .ogg sendiri di web/public/assets/audio/ dan mengubah status menjadi READY.

export type MusicStatus = 'AWAITING_COMPOSER' | 'READY';

export interface MusicCue {
  /** Nama file yang diminta dari composer, mis. BGM_TITLE.ogg */
  file: string;
  /** ID logis, nama file tanpa ekstensi. */
  id: string;
  sceneTrigger: string;
  moodInstruments: string;
  tempoDuration: string;
  loop: 'yes' | 'optional';
  priority: 'P1' | 'P2' | 'P3';
  status: MusicStatus;
}

const cue = (
  file: string,
  sceneTrigger: string,
  moodInstruments: string,
  tempoDuration: string,
  loop: 'yes' | 'optional',
  priority: 'P1' | 'P2' | 'P3',
): MusicCue => ({
  file,
  id: file.replace(/\.ogg$/, ''),
  sceneTrigger,
  moodInstruments,
  tempoDuration,
  loop,
  priority,
  status: 'AWAITING_COMPOSER',
});

export const MUSIC_REGISTRY: readonly MusicCue[] = [
  cue('BGM_TITLE.ogg', 'Title after user input; fade on New Game', 'quiet invitation; soft synth, piano-like lead', '76–92 / 45–70 s', 'yes', 'P1'),
  cue('BGM_FOREST_01.ogg', 'Chapter I forest; stop entering battle', 'curiosity, uncertainty; plucked tone, low strings', '82–100 / 60–90 s', 'yes', 'P1'),
  cue('BGM_AVELORIA_DAY.ogg', 'Town/castle safe areas; pause on major crisis', 'inhabited warmth; compact woodwind, soft pulse', '88–106 / 60–90 s', 'yes', 'P1'),
  cue('BGM_BATTLE.ogg', 'Normal encounters after input; stop on result', 'clear tempo, brief motif; chip percussion and bass', '124–146 / 50–75 s', 'yes', 'P1'),
  cue('BGM_BOSS.ogg', 'B01–B03 encounters', 'pressure without clutter; pulse, low strings', '116–140 / 65–100 s', 'yes', 'P2'),
  cue('BGM_LIORA.ogg', 'Liora village; fade on forest exit', 'history and hospitality; winds and plucked lead', '72–92 / 60–90 s', 'yes', 'P2'),
  cue('BGM_FOREST_02.ogg', 'Chapter II second forest', 'mischief under uneasy discovery; pizzicato/chip', '90–110 / 60–90 s', 'yes', 'P2'),
  cue('BGM_CRISIS.ogg', 'Chapter III evacuation, fade as quest shifts', 'focused urgency; low ostinato, spare bell', '94–120 / 55–80 s', 'yes', 'P2'),
  cue('BGM_TEMPLE.ogg', 'Temple puzzle; stop for Chronolith', 'age and mechanism; hollow mallet, pulse', '76–98 / 60–90 s', 'yes', 'P2'),
  cue('BGM_FINAL_BOSS.ogg', 'Varlgrim fight; intentional brief silence after meteor', 'tragic resolve; constrained percussion/strings', '100–128 / 80–110 s', 'yes', 'P2'),
  cue('BGM_MODERN.ogg', 'Interlude after Chapter IV', 'ordinary closeness; gentle keys, less fantasy timbre', '70–94 / 50–75 s', 'yes', 'P3'),
  cue('BGM_EPILOGUE.ogg', 'Aveloria cliff memory after modern; fade into credits', 'restrained affection; reprise of earlier motif', '68–86 / 70–100 s', 'optional', 'P3'),
  cue('BGM_CREDITS.ogg', 'Credits after To Be Continued', 'light closure, room for private P.S. silence', '70–92 / 60–100 s', 'optional', 'P3'),
];

export type MusicTrackId = string;

export function findCue(id: string): MusicCue | undefined {
  return MUSIC_REGISTRY.find((c) => c.id === id);
}
