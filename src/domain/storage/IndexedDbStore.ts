import type { Progress } from './Progress';
import type { ProgressStore } from './ProgressStore';

const DB_NAME = 'asvab-ready';
const STORE = 'progress';
const KEY = 'current';

/**
 * Layer 1: IndexedDB, one document under a fixed key. Requests persistent storage
 * once so the browser does not evict the data under storage pressure.
 */
export class IndexedDbStore implements ProgressStore {
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(private readonly indexedDB: IDBFactory = globalThis.indexedDB) {}

  async requestPersistence(): Promise<boolean> {
    try {
      return (await globalThis.navigator?.storage?.persist?.()) ?? false;
    } catch { return false; }
  }

  async load(): Promise<Progress | null> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve((req.result as Progress | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  }

  async save(progress: Progress): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(progress, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clear(): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private open(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      const req = this.indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => { req.result.createObjectStore(STORE); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return this.dbPromise;
  }
}
