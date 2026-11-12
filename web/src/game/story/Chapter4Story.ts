import type { GameState } from '../systems/GameState';
import type { StoryAction } from './Chapter1Story';
import { FortressStory } from './c4/fortress';
import { AveloriaC4Story } from './c4/aveloriaC4';

/**
 * Dispatcher Chapter IV: Warden Fortress (C4-01..C4-06) atau Aveloria sesudah runtuh (C4-07) menurut area save.
 * Area lain pada Bab IV tidak punya cerita aktif. Tidak ada Modern Interlude/Epilog di sini.
 */
export class Chapter4Story {
  constructor(private readonly state: GameState) {}
  private get fortress(): boolean { return this.state.snapshot()?.area === 'fortress'; }
  private get city(): boolean { return this.state.snapshot()?.area === 'aveloria'; }

  objective(): string | null {
    return this.fortress ? new FortressStory(this.state).objective() : this.city ? new AveloriaC4Story(this.state).objective() : null;
  }
  onStart(): StoryAction[] {
    return this.fortress ? new FortressStory(this.state).onStart() : this.city ? new AveloriaC4Story(this.state).onStart() : [];
  }
  interact(id: string): StoryAction[] {
    return this.fortress ? new FortressStory(this.state).interact(id) : this.city ? new AveloriaC4Story(this.state).interact(id) : [];
  }
  trigger(id: string): StoryAction[] {
    return this.fortress ? new FortressStory(this.state).trigger(id) : this.city ? new AveloriaC4Story(this.state).trigger(id) : [];
  }
}
