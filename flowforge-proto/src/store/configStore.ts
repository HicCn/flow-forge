import { create } from 'zustand';
import type { FlowType, FlowTypeStatus } from '../types';
import { builtinFlowTypes } from '../data/flowTypes';
import { v4 as uuidv4 } from 'uuid';

const CUSTOM_KEY = 'flowforge_custom_flowtypes';

function loadCustom(): FlowType[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveCustom(types: FlowType[]) {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(types));
}

interface ConfigStore {
  customFlowTypes: FlowType[];

  /** All non-deleted flow types (builtin + custom) */
  getFlowTypes: () => FlowType[];
  /** Only active flow types */
  getActiveFlowTypes: () => FlowType[];
  /** Find a flow type by id (including deprecated) */
  findFlowType: (id: string) => FlowType | undefined;

  addFlowType: (label: string, description: string) => void;
  updateFlowType: (id: string, patch: Partial<Pick<FlowType, 'label' | 'description'>>) => void;
  setFlowTypeStatus: (id: string, status: FlowTypeStatus) => void;
  deleteFlowType: (id: string) => void;
}

export const useConfigStore = create<ConfigStore>((set, get) => ({
  customFlowTypes: loadCustom(),

  getFlowTypes: () => {
    return [
      ...builtinFlowTypes.filter((t) => t.status !== 'deleted'),
      ...get().customFlowTypes.filter((t) => t.status !== 'deleted'),
    ];
  },

  getActiveFlowTypes: () => {
    return get().getFlowTypes().filter((t) => t.status === 'active');
  },

  findFlowType: (id: string) => {
    const all = get().getFlowTypes();
    return all.find((t) => t.id === id);
  },

  addFlowType: (label, description) => {
    const id = 'custom_' + Date.now();
    const ft: FlowType = {
      id,
      label,
      description,
      status: 'active',
      builtin: false,
      version: 1,
    };
    const updated = [...get().customFlowTypes, ft];
    saveCustom(updated);
    set({ customFlowTypes: updated });
  },

  updateFlowType: (id, patch) => {
    const updated = get().customFlowTypes.map((t) =>
      t.id === id ? { ...t, ...patch, version: t.version + 1 } : t
    );
    saveCustom(updated);
    set({ customFlowTypes: updated });
  },

  setFlowTypeStatus: (id, status) => {
    const updated = get().customFlowTypes.map((t) =>
      t.id === id ? { ...t, status } : t
    );
    saveCustom(updated);
    set({ customFlowTypes: updated });
  },

  deleteFlowType: (id) => {
    const updated = get().customFlowTypes.filter((t) => t.id !== id);
    saveCustom(updated);
    set({ customFlowTypes: updated });
  },
}));
