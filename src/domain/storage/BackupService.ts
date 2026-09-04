import { migrate, mergeProgress, type Progress } from './Progress';
import type { ProgressStore } from './ProgressStore';
import type { Clock } from '../timing/Clock';

/** Layer 2: export/import of asvab-progress.json. */
export class BackupService {
  constructor(private readonly store: ProgressStore, private readonly clock: Clock) {}

  async exportJson(): Promise<string> {
    const p = await this.store.load();
    if (!p) throw new Error('Nothing to export yet');
    const nowIso = new Date(this.clock.now()).toISOString();
    p.review.lastBackupAt = nowIso;
    await this.store.save(p);
    return JSON.stringify({ ...p, exportedAt: nowIso }, null, 2);
  }

  /** Imports a file; merges with what is already on this device (union, never overwrite). */
  async importJson(json: string): Promise<Progress> {
    const incoming = migrate(JSON.parse(json));
    const local = await this.store.load();
    const merged = local ? mergeProgress(local, incoming) : incoming;
    await this.store.save(merged);
    return merged;
  }

  /** Days since the last backup, or null if never. Home shows amber after 7. */
  daysSinceBackup(p: Progress): number | null {
    if (!p.review.lastBackupAt) return null;
    return Math.floor((this.clock.now() - Date.parse(p.review.lastBackupAt)) / 86_400_000);
  }
}
