import type { GameState } from '../systems/GameState';
import type { StoryAction } from './Chapter1Story';
import { AveloriaCrisisStory } from './c3/aveloriaCrisis';
import { TempleStory } from './c3/temple';

/**
 * Dispatcher Chapter III: Aveloria dalam krisis (C3-01..02) atau Kuil Jejak (C3-03..07) menurut area save.
 * Area lain pada Bab III (mis. hutan lama) tidak punya cerita aktif.
 */
export class Chapter3Story {
  constructor(private readonly state: GameState) {}
  private get temple(): boolean { return this.state.snapshot()?.area === 'temple'; }
  private get city(): boolean { return this.state.snapshot()?.area === 'aveloria'; }

  objective(): string | null {
    return this.temple ? new TempleStory(this.state).objective() : this.city ? new AveloriaCrisisStory(this.state).objective() : null;
  }
  onStart(): StoryAction[] {
    return this.temple ? new TempleStory(this.state).onStart() : this.city ? new AveloriaCrisisStory(this.state).onStart() : [];
  }
  interact(id: string): StoryAction[] {
    return this.temple ? new TempleStory(this.state).interact(id) : this.city ? new AveloriaCrisisStory(this.state).interact(id) : [];
  }
  trigger(id: string): StoryAction[] {
    return this.temple ? new TempleStory(this.state).trigger(id) : this.city ? new AveloriaCrisisStory(this.state).trigger(id) : [];
  }
}
