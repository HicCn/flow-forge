import { create } from 'zustand';
import type { FlowType } from '../types';

interface RecentFile {
  path: string;
  name: string;
  flowType: string;
  openedAt: number;
}

const RECENT_FILES_KEY = 'flowforge_recent_files';
const CONFIG_DIR_KEY = 'flowforge_config_dir';
const SCRIPT_DIR_KEY = 'flowforge_script_dir';
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

function loadConfigDir(): string | null {
  return localStorage.getItem(CONFIG_DIR_KEY) || localStorage.getItem('flowforge_work_dir') || null;
}

function loadScriptDir(): string | null {
  return localStorage.getItem(SCRIPT_DIR_KEY) || null;
}

interface AppStore {
  screen: 'landing' | 'editor';
  recentFiles: RecentFile[];
  configDir: string | null;
  scriptDir: string | null;

  setScreen: (screen: 'landing' | 'editor') => void;
  addRecentFile: (path: string, name: string, flowType: FlowType) => void;
  setConfigDir: (dir: string | null) => void;
  setScriptDir: (dir: string | null) => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  screen: 'landing',
  recentFiles: loadRecent(),
  configDir: loadConfigDir(),
  scriptDir: loadScriptDir(),

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

  setConfigDir: (dir) => {
    if (dir) {
      localStorage.setItem(CONFIG_DIR_KEY, dir);
    } else {
      localStorage.removeItem(CONFIG_DIR_KEY);
    }
    set({ configDir: dir });
  },

  setScriptDir: (dir) => {
    if (dir) {
      localStorage.setItem(SCRIPT_DIR_KEY, dir);
    } else {
      localStorage.removeItem(SCRIPT_DIR_KEY);
    }
    set({ scriptDir: dir });
  },
}));
