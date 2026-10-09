// localStorage adapter. Falls back to memory if storage is blocked (private mode, etc.).
import { memoryStorage, type StorageAdapter } from '../engine/save';

export function browserStorage(): StorageAdapter {
  try {
    const probe = '__sod_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return {
      get: (k) => localStorage.getItem(k),
      set: (k, v) => {
        try {
          localStorage.setItem(k, v);
        } catch {
          /* quota or blocked: ignore, game keeps running */
        }
      },
      remove: (k) => localStorage.removeItem(k),
    };
  } catch {
    return memoryStorage();
  }
}
