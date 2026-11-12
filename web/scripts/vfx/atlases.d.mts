export interface AtlasDef { key: string; file: string; width: number; sheet: 'sprint3' | 'sprint4'; zoom: number }
export const ATLASES: readonly AtlasDef[];
export interface Cv { w: number; h: number; d: Uint8Array; count(): number }
export interface RenderedAtlas {
  def: AtlasDef;
  atlas: { px: Uint8Array; w: number; h: number; json: { frames: Record<string, { frame: { x: number; y: number; w: number; h: number }; pivot: { x: number; y: number } }> }; png(): Buffer };
  palette: { idx: Record<string, number>; rgb: (number[] | null)[]; size: number };
  frames: { group: string; name: string; cv: Cv; pivotY: number }[];
  groups: { name: string; frames: Cv[]; names: string[] }[];
  sheet(): Buffer;
  rows: string;
}
export function renderAtlas(key: string): Promise<RenderedAtlas>;
