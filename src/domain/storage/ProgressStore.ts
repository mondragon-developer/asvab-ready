import type { Progress } from './Progress';

/**
 * The port every view and service depends on. Implementations:
 *  - MemoryStore     (tests)
 *  - IndexedDbStore  (Layer 1, browser)
 *  - SyncingStore    (Layer 3/4 decorator, later)
 */
export interface ProgressStore {
  load(): Promise<Progress | null>;
  save(progress: Progress): Promise<void>;
  clear(): Promise<void>;
}

export class MemoryStore implements ProgressStore {
  private value: Progress | null = null;
  async load(): Promise<Progress | null> { return this.value ? structuredClone(this.value) : null; }
  async save(progress: Progress): Promise<void> { this.value = structuredClone(progress); }
  async clear(): Promise<void> { this.value = null; }
}
