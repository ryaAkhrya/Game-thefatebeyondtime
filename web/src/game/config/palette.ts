// Deep Plum dan Bitter Lime TERKUNCI (UI_STYLE_SPEC_V3_3.md). Warna netral/aksen lain masih TBD:
// nilai di bawah adalah penunjang sementara yang mudah diganti dari satu tempat ini.

export const COLORS = {
  deepPlum: 0x3b2a4a,
  bitterLime: 0xc7d96a,

  // Netral pendukung (TBD)
  ink: 0x1d1625, // latar paling gelap, diturunkan dari Deep Plum
  plumLift: 0x4d3a5f, // permukaan panel yang sedikit terangkat
  plumLine: 0x6a5580, // garis/pembatas
  paper: 0xece3d6, // teks utama
  paperDim: 0xa89cb2, // teks sekunder
  disabled: 0x7d7088, // teks nonaktif (kontras >= 3:1 di atas ink)
  rose: 0xc97b84, // pasangan garis motif "hampir bertemu"
  warn: 0xe3b66a,
} as const;

export const css = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;
