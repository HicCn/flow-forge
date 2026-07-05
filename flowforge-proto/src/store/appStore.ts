import { create } from 'zustand';
import type { FlowType } from '../types';

interface RecentFile {
  path: string;
  name: string;
  flowType: string;
  openedAt: number;
}

const RECENT_FILES_KEY = 'flowforge_recent_files';
const MAX_RECENT = 5;

function loadRecent(): RecentFile[] {
  try {
    const raw = localStorage.getItem(RECENT_FILES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveRecent(files: RecentFile[]) {
  localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(files));
}

interface AppStore {
  screen: 'landing' | 'editor';
  recentFiles: RecentFile[];

  setScreen: (screen: 'landing' | 'editor') => void;
  addRecentFile: (path: string, name: string, flowType: FlowType) => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  screen: 'landing',
  recentFiles: loadRecent(),

  setScreen: (screen) => set({ screen }),

  addRecentFile: (path, name, flowType) => {
    const files = get().recentFiles.filter((f) => f.path !== path);
    files.unshift({
      path,
      name,
      flowType: flowType.id,
      openedAt: Date.now(),
    });
    const trimmed = files.slice(0, MAX_RECENT);
    saveRecent(trimmed);
    set({ recentFiles: trimmed });
  },
}));
