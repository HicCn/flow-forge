import { create } from 'zustand';
import type { FlowType, FlowTypeStatus, NodeDefinition, EnumType } from '../types';
import { builtinFlowTypes } from '../data/flowTypes';
import { builtinNodeDefinitions } from '../data/builtinNodes';

const CUSTOM_KEY = 'flowforge_custom_flowtypes';
const CUSTOM_NODES_KEY = 'flowforge_custom_nodes';
const CUSTOM_ENUMS_KEY = 'flowforge_custom_enums';

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

function loadCustomNodes(): NodeDefinition[] {
  try {
    const raw = localStorage.getItem(CUSTOM_NODES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveCustomNodes(nodes: NodeDefinition[]) {
  localStorage.setItem(CUSTOM_NODES_KEY, JSON.stringify(nodes));
}

function loadCustomEnums(): EnumType[] {
  try {
    const raw = localStorage.getItem(CUSTOM_ENUMS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch { return []; }
}

function saveCustomEnums(enums: EnumType[]) {
  localStorage.setItem(CUSTOM_ENUMS_KEY, JSON.stringify(enums));
}

interface ConfigStore {
  customFlowTypes: FlowType[];
  customNodeDefs: NodeDefinition[];
  customEnumTypes: EnumType[];

  // Flow types
  getFlowTypes: () => FlowType[];
  getActiveFlowTypes: () => FlowType[];
  findFlowType: (id: string) => FlowType | undefined;
  addFlowType: (label: string, description: string, id?: string) => void;
  updateFlowType: (id: string, patch: Partial<Pick<FlowType, 'label' | 'description'>>) => void;
  setFlowTypeStatus: (id: string, status: FlowTypeStatus) => void;
  deleteFlowType: (id: string) => void;

  // Node definitions
  getNodeDefs: () => NodeDefinition[];
  findNodeDef: (type: string) => NodeDefinition | undefined;
  addNodeDef: (def: NodeDefinition) => void;
  updateNodeDef: (type: string, patch: Partial<Pick<NodeDefinition, 'label' | 'description' | 'category' | 'color' | 'flowTypes' | 'params' | 'pins'>>) => void;
  deleteNodeDef: (type: string) => void;

  // Enum types
  getEnumTypes: () => EnumType[];
  findEnumType: (id: string) => EnumType | undefined;
  addEnumType: (enumType: EnumType) => void;
  updateEnumType: (id: string, patch: Partial<Pick<EnumType, 'label' | 'description' | 'values'>>) => void;
  deleteEnumType: (id: string) => void;
}

export const useConfigStore = create<ConfigStore>((set, get) => ({
  customFlowTypes: loadCustom(),
  customNodeDefs: loadCustomNodes(),

  getFlowTypes: () => {
    const customs = get().customFlowTypes;
    const overrides = new Map(customs.map((c) => [c.id, c]));

    const merged: FlowType[] = [];

    // Builtin types: use override if it exists
    for (const b of builtinFlowTypes) {
      const override = overrides.get(b.id);
      if (override) {
        if (override.status !== 'deleted') merged.push({ ...b, status: override.status });
        overrides.delete(b.id);
      } else if (b.status !== 'deleted') {
        merged.push(b);
      }
    }

    // Remaining custom types (not overriding builtins)
    for (const c of overrides.values()) {
      if (c.status !== 'deleted') merged.push(c);
    }

    return merged;
  },

  getActiveFlowTypes: () => {
    return get().getFlowTypes().filter((t) => t.status === 'active');
  },

  findFlowType: (id: string) => {
    const all = get().getFlowTypes();
    return all.find((t) => t.id === id);
  },

  addFlowType: (label, description, id) => {
    const finalId = id || 'custom_' + Date.now();
    const ft: FlowType = {
      id: finalId,
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
    const customs = get().customFlowTypes;
    const existing = customs.find((c) => c.id === id);
    let updated: FlowType[];

    if (!existing) {
      // Editing a builtin type for the first time — create an override
      const b = builtinFlowTypes.find((b) => b.id === id);
      if (!b) return;
      updated = [...customs, { ...b, ...patch, version: b.version + 1, builtin: true }];
    } else {
      updated = customs.map((c) =>
        c.id === id ? { ...c, ...patch, version: c.version + 1 } : c
      );
    }
    saveCustom(updated);
    set({ customFlowTypes: updated });
  },

  setFlowTypeStatus: (id, status) => {
    const customs = get().customFlowTypes;
    const isBuiltin = builtinFlowTypes.some((b) => b.id === id);
    const existing = customs.find((c) => c.id === id);

    let updated: FlowType[];
    if (isBuiltin) {
      // Store an override entry for builtin type
      if (existing) {
        updated = customs.map((c) => c.id === id ? { ...c, status } : c);
      } else {
        const b = builtinFlowTypes.find((b) => b.id === id)!;
        updated = [...customs, { ...b, status, builtin: true }];
      }
    } else {
      updated = customs.map((t) =>
        t.id === id ? { ...t, status } : t
      );
    }
    saveCustom(updated);
    set({ customFlowTypes: updated });
  },

  deleteFlowType: (id) => {
    const updated = get().customFlowTypes.filter((t) => t.id !== id);
    saveCustom(updated);
    set({ customFlowTypes: updated });
  },

  // ── Node definitions ──

  getNodeDefs: () => {
    const customs = get().customNodeDefs;
    const overrides = new Map(customs.map((c) => [c.type, c]));

    const merged: NodeDefinition[] = [];

    for (const b of builtinNodeDefinitions) {
      const override = overrides.get(b.type);
      if (override) {
        merged.push({ ...b, ...override });
        overrides.delete(b.type);
      } else {
        merged.push(b);
      }
    }

    for (const c of overrides.values()) {
      merged.push(c);
    }

    return merged;
  },

  findNodeDef: (type) => {
    return get().getNodeDefs().find((n) => n.type === type);
  },

  addNodeDef: (def) => {
    const updated = [...get().customNodeDefs, def];
    saveCustomNodes(updated);
    set({ customNodeDefs: updated });
  },

  updateNodeDef: (type, patch) => {
    const customs = get().customNodeDefs;
    const existing = customs.find((c) => c.type === type);
    let updated: NodeDefinition[];

    if (!existing) {
      const b = builtinNodeDefinitions.find((b) => b.type === type);
      if (!b) return;
      updated = [...customs, { ...b, ...patch }];
    } else {
      updated = customs.map((c) =>
        c.type === type ? { ...c, ...patch } : c
      );
    }
    saveCustomNodes(updated);
    set({ customNodeDefs: updated });
  },

  deleteNodeDef: (type) => {
    const updated = get().customNodeDefs.filter((n) => n.type !== type);
    saveCustomNodes(updated);
    set({ customNodeDefs: updated });
  },

  // ── Enum types ──
  customEnumTypes: loadCustomEnums(),

  getEnumTypes: () => get().customEnumTypes,

  findEnumType: (id) => get().customEnumTypes.find((e) => e.id === id),

  addEnumType: (enumType) => {
    const updated = [...get().customEnumTypes, enumType];
    saveCustomEnums(updated);
    set({ customEnumTypes: updated });
  },

  updateEnumType: (id, patch) => {
    const updated = get().customEnumTypes.map((e) =>
      e.id === id ? { ...e, ...patch } : e
    );
    saveCustomEnums(updated);
    set({ customEnumTypes: updated });
  },

  deleteEnumType: (id) => {
    const updated = get().customEnumTypes.filter((e) => e.id !== id);
    saveCustomEnums(updated);
    set({ customEnumTypes: updated });
  },
}));
