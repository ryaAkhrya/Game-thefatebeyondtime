// Skema Settings sesuai docs/design/SETTINGS_SPEC.md dan GDD.md bagian 7.

export const TEXT_SPEEDS = ['slow', 'normal', 'fast', 'instant'] as const;
export type TextSpeed = (typeof TEXT_SPEEDS)[number];

export const SCREEN_SCALES = ['fit', 'pixel_perfect'] as const;
export type ScreenScale = (typeof SCREEN_SCALES)[number];

export interface Settings {
  master_volume: number; // 0-100, step 5
  bgm_volume: number;
  sfx_volume: number;
  mute_all: boolean;
  text_speed: TextSpeed;
  fullscreen: boolean;
  screen_scale: ScreenScale;
  screen_shake: boolean;
  reduced_flashes: boolean;
}

export type SettingKey = keyof Settings;

export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  master_volume: 100,
  bgm_volume: 70,
  sfx_volume: 80,
  mute_all: false,
  text_speed: 'normal',
  fullscreen: false,
  screen_scale: 'fit',
  screen_shake: true,
  reduced_flashes: true, // aman secara default (GDD)
});

export const VOLUME_STEP = 5;

/** Milidetik per karakter untuk typewriter dialog. 0 = instan. */
export const TEXT_SPEED_MS_PER_CHAR: Readonly<Record<TextSpeed, number>> = {
  slow: 60,
  normal: 32,
  fast: 14,
  instant: 0,
};

export const TEXT_SPEED_LABEL_ID: Readonly<Record<TextSpeed, string>> = {
  slow: 'Lambat',
  normal: 'Normal',
  fast: 'Cepat',
  instant: 'Instan',
};

export const SCREEN_SCALE_LABEL_ID: Readonly<Record<ScreenScale, string>> = {
  fit: 'Fit',
  pixel_perfect: 'Pixel Perfect',
};

const isOneOf = <T extends readonly string[]>(list: T, v: unknown): v is T[number] =>
  typeof v === 'string' && (list as readonly string[]).includes(v);

export function clampVolume(v: number): number {
  if (!Number.isFinite(v)) return 0;
  const stepped = Math.round(v / VOLUME_STEP) * VOLUME_STEP;
  return Math.min(100, Math.max(0, stepped));
}

/**
 * Mengubah data tak tepercaya (hasil JSON.parse) menjadi Settings valid.
 * Nilai yang hilang/invalid jatuh ke default per-key, bukan menggagalkan semuanya.
 */
export function sanitizeSettings(raw: unknown): Settings {
  const out: Settings = { ...DEFAULT_SETTINGS };
  if (typeof raw !== 'object' || raw === null) return out;
  const r = raw as Record<string, unknown>;
  for (const k of ['master_volume', 'bgm_volume', 'sfx_volume'] as const) {
    const v = r[k];
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = clampVolume(v);
  }
  for (const k of ['mute_all', 'fullscreen', 'screen_shake', 'reduced_flashes'] as const) {
    const v = r[k];
    if (typeof v === 'boolean') out[k] = v;
  }
  if (isOneOf(TEXT_SPEEDS, r.text_speed)) out.text_speed = r.text_speed;
  if (isOneOf(SCREEN_SCALES, r.screen_scale)) out.screen_scale = r.screen_scale;
  return out;
}
