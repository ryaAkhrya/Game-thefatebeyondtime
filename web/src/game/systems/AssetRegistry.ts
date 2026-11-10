import { ASSET_MANIFEST, SUPERSEDED_ASSET_PATHS, type AtlasAsset } from '../data/assetManifest';

/**
 * Pemetaan ID logis -> file. Menjaga dua aturan CLAUDE.md:
 * - aset hanya dimuat bila `imported` dan punya `publicPath` (belum ada yang diimpor pada Phase 0);
 * - tidak pernah menganggap status NEEDS_REVIEW sebagai PRODUCTION_READY.
 */
export class AssetRegistry {
  private readonly byId: Map<string, AtlasAsset>;

  constructor(manifest: readonly AtlasAsset[] = ASSET_MANIFEST) {
    this.byId = new Map();
    for (const a of manifest) {
      if (this.byId.has(a.id)) throw new Error(`AssetRegistry: ID ganda ${a.id}`);
      if (SUPERSEDED_ASSET_PATHS.some((p) => a.sourceImage.startsWith(p) || a.sourceJson.startsWith(p))) {
        throw new Error(`AssetRegistry: ${a.id} menunjuk ke aset yang sudah digantikan (${a.sourceImage})`);
      }
      if (a.imported && !a.publicPath) throw new Error(`AssetRegistry: ${a.id} imported tanpa publicPath`);
      this.byId.set(a.id, a);
    }
  }

  get(id: string): AtlasAsset | undefined {
    return this.byId.get(id);
  }

  list(): readonly AtlasAsset[] {
    return [...this.byId.values()];
  }

  /** Aset yang boleh dimuat BootScene. Kosong pada Phase 0. */
  loadable(): readonly AtlasAsset[] {
    return this.list().filter((a) => a.imported && a.publicPath !== null);
  }

  isProductionReady(id: string): boolean {
    return this.byId.get(id)?.status === 'PRODUCTION_READY';
  }
}
