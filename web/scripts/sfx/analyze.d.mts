export const SFX_DIR: string;
export const MANIFEST_PATH: string;
export const GROUP_TOLERANCE_DB: number;
export const LIMITS: { dcAbs: number; firstSampleAbs: number; lastSampleAbs: number; peakTargetDb: number; peakTolDb: number; flatTopRun: number; crestMinDb: number };
export const GROUP_NAMES: Record<string, string>;
export interface DecodedWav { errors: string[]; samples: Int16Array; sampleRate: number; channels: number; bits: number }
export interface Measure {
  durationMs: number; peakDb: number; rmsDb: number; lufs: number; momentaryLufs: number; crestDb: number;
  clipSamples: number; maxClipRun: number; dcOffset: number; firstSample: number; lastSample: number; edgeStep: number; flatRuns: number; tailSilenceMs: number;
}
export interface AnalysisRow extends Partial<Measure> {
  id: string; file: string; group: string; gain: number; effLufs?: number; groupDev?: number; groupOk?: boolean; issues: string[]; warns: string[];
}
export interface GroupStat { name: string; count: number; medianEffLufs: number; minDev: number; maxDev: number; outliers: string[] }
export function decodeWav(b: Buffer): DecodedWav;
export function kWeight(x: Float64Array, fs: number): Float64Array;
export function measure(int16: Int16Array, fs?: number): Measure;
export function analyzeAll(opts?: { dir?: string; manifestPath?: string }): { rows: AnalysisRow[]; groupStats: Record<string, GroupStat> };
export function tableMd(rows: AnalysisRow[]): string;
export function groupMd(groupStats: Record<string, GroupStat>): string;
