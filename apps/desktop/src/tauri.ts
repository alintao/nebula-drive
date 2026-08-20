import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export const api = {
  login: (url: string, username: string, password: string) =>
    invoke<string>('login', { url, username, password }),

  createPair: (p: {
    storageId: number;
    remotePath: string;
    mode: string;
    name?: string;
    localPath?: string;
    url?: string;
  }) => invoke<any>('create_pair', p),

  addPair: (p: {
    name: string;
    token: string;
    dir: string;
    mode: string;
    url?: string;
  }) => invoke<string>('add_pair', p),

  listPairs: () => invoke<any>('list_pairs'),
  removePair: (id: number) => invoke<string>('remove_pair', { id }),
  status: () => invoke<any>('status'),
  runSync: (pairId?: string) => invoke<string>('run_sync', { pairId }),
  defaultLocalDir: (name: string) => invoke<string>('default_local_dir', { name }),
  startWatch: (pairId?: string) => invoke<void>('start_watch', { pairId }),
  stopWatch: () => invoke<void>('stop_watch'),

  onSyncLog: (cb: (line: string) => void) =>
    listen<string>('sync-log', (e) => cb(e.payload)),
};
