// Deep Plum dan Bitter Lime TERKUNCI (UI_STYLE_SPEC_V3_3.md). Warna pendukung dipilih di Polish Sprint 1
// dan hidup di satu tempat ini agar mudah diubah.

export const COLORS = {
  deepPlum: 0x3b2a4a,
  bitterLime: 0xc7d96a,

  // Netral pendukung
  ink: 0x1d1625, // latar paling gelap, diturunkan dari Deep Plum
  night: 0x120d19, // langit judul / vinyet
  plumLift: 0x4d3a5f, // permukaan panel yang sedikit terangkat
  plumLine: 0x6a5580, // garis/pembatas
  plumMist: 0x8a77a0, // garis sekunder, kabut
  paper: 0xece3d6, // teks utama
  paperDim: 0xa89cb2, // teks sekunder (kontras >= 4,5:1 di atas ink)
  disabled: 0x7d7088, // teks nonaktif (kontras >= 3:1 di atas ink)
  rose: 0xc97b84, // pasangan garis motif "hampir bertemu"
  warn: 0xe3b66a,
  mp: 0x8fb4c9, // MP / info dingin; label HP/MP selalu ada, warna bukan satu-satunya pembeda
  danger: 0xd9706f, // HP rendah / bahaya boss
} as const;

export const css = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;
