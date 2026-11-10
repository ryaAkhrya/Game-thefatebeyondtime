import type { GameState } from './GameState';
import type { SaveRepository, SaveSlot, SaveWriteResult } from './SaveRepository';

/** One scheduling gate around the existing repository. No writes during battle, dialogue or transition. */
export class SaveCoordinator {
  private stable = false;
  private pending = false;
  lastMessage = '';
  constructor(private readonly state: GameState, private readonly repository: SaveRepository) {}
  get isSafe(): boolean { return this.stable && this.state.isActive && (this.state.snapshot()?.vitals?.hp ?? 0) > 0; }
  get hasPendingAutosave(): boolean { return this.pending; }
  reset(): void { this.stable = false; this.pending = false; this.lastMessage = ''; }
  setSafe(safe: boolean): void { this.stable = safe; }
  requestAutosave(): void { this.pending = true; }
  save(slot: SaveSlot): SaveWriteResult {
    if (!this.isSafe) { this.lastMessage = 'Selesaikan dialog atau pertarungan dulu.'; return { ok: false, reason: 'write_failed' }; }
    const result = this.repository.write(slot, this.state.snapshot()!);
    this.lastMessage = result.ok ? 'Permainan tersimpan.' : 'Gagal menyimpan. Periksa ruang browser.';
    return result;
  }
  flush(): SaveWriteResult | null {
    if (!this.pending || !this.isSafe) return null;
    this.pending = false; // avoid frame-by-frame quota error spam; a later checkpoint can retry
    return this.save('auto');
  }
}
