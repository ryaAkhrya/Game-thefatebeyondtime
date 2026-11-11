// Path aset runtime Phase 1 (relatif terhadap web/public). Ganti file di path ini untuk mengganti art tanpa mengubah kode.
// Lingkungan = DRAFT dev art yang dibuat oleh web/scripts/gen-forest-art.mjs (bukan aset final).

export const ENV = {
  groundKey: 'forest1_ground',
  groundUrl: 'assets/environment/forest1/ground.png',
  propsKey: 'forest1_props',
  propsUrl: 'assets/environment/forest1/props.png',
  propsJsonUrl: 'assets/environment/forest1/props.json',
  propsMetaKey: 'forest1_props_meta',
} as const;

/** Ekspresi portrait yang dimuat saat boot (sesuai file assets/characters/<karakter>/<ID>_EXPRESSION_<NAMA>.png). */
export const PORTRAIT_EXPRESSIONS: Readonly<Record<string, readonly string[]>> = {
  C01: ['ANGRY', 'CONFUSED', 'DETERMINED', 'EMBARRASSED', 'HAPPY', 'NEUTRAL', 'SAD', 'SURPRISED'],
  C08: ['CONCERNED', 'HAPPY', 'NEUTRAL', 'SURPRISED'],
  C02: ['NEUTRAL', 'STERN', 'AMUSED', 'WORRIED', 'SURPRISED', 'VULNERABLE'],
  C05: ['NEUTRAL', 'WORRIED', 'SKEPTICAL'],
  C06: ['NEUTRAL', 'SUSPICIOUS', 'ALARMED'],
  C09: ['NEUTRAL', 'AMUSED', 'WORRIED'],
  C03: ['NEUTRAL', 'DETERMINED', 'MISCHIEVOUS', 'CURIOUS', 'SAD', 'SURPRISED', 'SOLEMN', 'UPSET'],
  C07: ['NEUTRAL', 'CAUTIOUS', 'HAPPY', 'SAD'],
};

/** Key spritesheet eksplorasi (sama dengan id di AssetRegistry). */
export const SPRITE_KEYS = { yaric: 'C01_YARIC_EXPLORE', nambo: 'C08_NAMBO_EXPLORE' } as const;

/** Bahan siluet Title Screen (assets/title/<key>.png). Turunan crop referensi DRAFT. */
export const TITLE_ART_KEYS = ['title_yaric', 'title_velthia', 'title_greatsword'] as const;
