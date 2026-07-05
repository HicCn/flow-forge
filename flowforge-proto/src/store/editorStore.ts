import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  FlowNode,
  FlowEdge,
  FlowParameter,
  FlowType,
  NodeDefinition,
  ValidationResult,
  HistoryEntry,
  ParamValue,
  FlowNodeData,
  TabData,
} from '../types';
import { builtinNodeDefinitions } from '../data/builtinNodes';

interface EditorStore {
  // ── Active document state ──
  filePath: string | null;
  isDirty: boolean;
  flowType: FlowType | null;
  nodes: FlowNode[];
  edges: FlowEdge[];
  parameters: FlowParameter[];
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  viewport: { x: number; y: number; zoom: number };
  nodeDefinitions: NodeDefinition[];
  validationResult: ValidationResult | null;
  history: HistoryEntry[];
  historyIndex: number;

  // ── Tab system ──
  tabs: TabData[];
  activeTabId: string | null;

  // ── Tab operations ──
  /** Create a new tab and switch to it, or switch to existing tab if file already open */
  openTab: (input: Omit<TabData, 'id' | 'history' | 'historyIndex' | 'isDirty' | 'viewport' | 'nodeDefinitions'> & { id?: string }) => string;
  /** Close a tab and switch to another */
  closeTab: (id: string) => void;
  /** Switch to an existing tab */
  switchTab: (id: string) => void;
  /** Update tab title (e.g., after Save As) */
  updateTabTitle: (id: string, title: string, filePath: string | null) => void;

  // ── Document state operations ──
  setFilePath: (path: string | null) => void;
  setDirty: (dirty: boolean) => void;
  setFlowType: (ft: FlowType) => void;

  addNode: (def: NodeDefinition, position: { x: number; y: number }) => void;
  deleteNodes: (ids: string[]) => void;
  updateNodeParam: (nodeId: string, paramKey: string, value: ParamValue) => void;
  updateNodePosition: (nodeId: string, x: number, y: number) => void;

  addEdge: (edge: FlowEdge) => void;
  deleteEdges: (ids: string[]) => void;

  addParameter: (param: FlowParameter) => void;
  removeParameter: (key: string) => void;
  updateParameter: (key: string, patch: Partial<FlowParameter>) => void;

  setSelection: (nodeIds: string[], edgeIds: string[]) => void;
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void;

  loadDocument: (nodes: FlowNode[], edges: FlowEdge[], parameters: FlowParameter[]) => void;
  clearCanvas: () => void;

  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  setValidationResult: (result: ValidationResult | null) => void;
}

// ── Helpers ──

function filterDefinitions(flowType: FlowType): NodeDefinition[] {
  if (!flowType.builtin) return builtinNodeDefinitions;
  return builtinNodeDefinitions.filter((d) => d.flowTypes.length === 0 || d.flowTypes.includes(flowType.id));
}

function createNode(def: NodeDefinition, position: { x: number; y: number }): FlowNode {
  const params: Record<string, ParamValue> = {};
  for (const p of def.params) {
    if (p.source === 'param_or_fixed') {
      params[p.key] = { source: 'fixed', value: p.default };
    } else if (p.source === 'param') {
      params[p.key] = { source: 'param', value: '' };
    } else {
      params[p.key] = { source: 'fixed', value: p.default };
    }
  }

  const data: FlowNodeData = {
    nodeType: def.type,
    label: def.label,
    category: def.category,
    color: def.color,
    params,
    writes: def.writes,
    disabled: false,
    validationErrors: [],
  };

  return {
    id: uuidv4(),
    type: 'flowNode',
    position,
    data: data as FlowNodeData & Record<string, unknown>,
  };
}

function createDefaultNodes(): FlowNode[] {
  const startDef = builtinNodeDefinitions.find((d) => d.type === 'flow_start');
  const endDef = builtinNodeDefinitions.find((d) => d.type === 'flow_end');
  const nodes: FlowNode[] = [];
  if (startDef) nodes.push(createNode(startDef, { x: 250, y: 300 }));
  if (endDef) nodes.push(createNode(endDef, { x: 650, y: 300 }));
  return nodes;
}

function snapshot(store: EditorStore): HistoryEntry {
  return {
    nodes: JSON.parse(JSON.stringify(store.nodes)),
    edges: JSON.parse(JSON.stringify(store.edges)),
    parameters: JSON.parse(JSON.stringify(store.parameters)),
  };
}

function restore(store: EditorStore, entry: HistoryEntry) {
  store.nodes = JSON.parse(JSON.stringify(entry.nodes));
  store.edges = JSON.parse(JSON.stringify(entry.edges));
  store.parameters = JSON.parse(JSON.stringify(entry.parameters));
}

// ── Tab helpers ──

function makeTabId(): string {
  return uuidv4();
}

/** Save the active tab's current state back into its TabData slot */
function flushActiveTab(s: EditorStore) {
  if (!s.activeTabId) return;
  const idx = s.tabs.findIndex((t) => t.id === s.activeTabId);
  if (idx < 0) return;
  s.tabs[idx] = {
    ...s.tabs[idx],
    filePath: s.filePath,
    title: s.filePath
      ? s.filePath.replace(/^.*[\\/]/, '').replace(/\.flow(\.json)?$/, '')
      : s.tabs[idx].title,
    flowType: s.flowType,
    nodes: s.nodes,
    edges: s.edges,
    parameters: s.parameters,
    history: s.history,
    historyIndex: s.historyIndex,
    isDirty: s.isDirty,
    nodeDefinitions: s.nodeDefinitions,
    viewport: s.viewport,
  };
}

/** Load a tab's saved state into the active document fields */
function loadTabIntoStore(s: EditorStore, tab: TabData) {
  s.filePath = tab.filePath;
  s.isDirty = tab.isDirty;
  s.flowType = tab.flowType;
  s.nodes = tab.nodes;
  s.edges = tab.edges;
  s.parameters = tab.parameters;
  s.history = tab.history;
  s.historyIndex = tab.historyIndex;
  s.nodeDefinitions = tab.nodeDefinitions;
  s.viewport = tab.viewport;
  s.selectedNodeIds = [];
  s.selectedEdgeIds = [];
  s.validationResult = null;
  s.activeTabId = tab.id;
}

// ── Initial tab (default empty document) ──
const defaultTabId = makeTabId();
const defaultTab: TabData = {
  id: defaultTabId,
  filePath: null,
  title: 'Untitled',
  flowType: null,
  nodes: createDefaultNodes(),
  edges: [],
  parameters: [],
  history: [],
  historyIndex: -1,
  isDirty: false,
  nodeDefinitions: builtinNodeDefinitions,
  viewport: { x: 0, y: 0, zoom: 1 },
};

// ── Store ──

export const useEditorStore = create<EditorStore>((set, get) => ({
  // ── Initial state from default tab ──
  filePath: defaultTab.filePath,
  isDirty: defaultTab.isDirty,
  flowType: defaultTab.flowType,
  nodes: defaultTab.nodes,
  edges: defaultTab.edges,
  parameters: defaultTab.parameters,
  selectedNodeIds: [],
  selectedEdgeIds: [],
  viewport: defaultTab.viewport,
  nodeDefinitions: defaultTab.nodeDefinitions,
  validationResult: null,
  history: defaultTab.history,
  historyIndex: defaultTab.historyIndex,

  tabs: [defaultTab],
  activeTabId: defaultTabId,

  // ── Tab operations ──

  openTab: (input) => {
    const s = get();
    flushActiveTab(s);

    // Check if tab for this file already exists
    if (input.filePath) {
      const existing = s.tabs.find((t) => t.filePath === input.filePath);
      if (existing) {
        // Switch to existing tab
        const newTabs = [...s.tabs];
        const idx = newTabs.findIndex((t) => t.id === existing.id);
        const tab = newTabs[idx];
        // Don't flush again since we already did above, just need to check
        // the existing tab exists. We flush first to save current, then restore.
        // But wait - we already flushed above. The flush wrote into the current
        // active tab. Now we need to switch to the existing one.
        const newState = { ...s, activeTabId: existing.id };
        loadTabIntoStore(newState, tab);
        set({
          tabs: newTabs,
          activeTabId: existing.id,
          filePath: newState.filePath,
          isDirty: newState.isDirty,
          flowType: newState.flowType,
          nodes: newState.nodes,
          edges: newState.edges,
          parameters: newState.parameters,
          history: newState.history,
          historyIndex: newState.historyIndex,
          nodeDefinitions: newState.nodeDefinitions,
          viewport: newState.viewport,
          selectedNodeIds: [],
          selectedEdgeIds: [],
          validationResult: null,
        });
        return existing.id;
      }
    }

    // Create new tab
    const id = input.id ?? makeTabId();
    const tab: TabData = {
      id,
      filePath: input.filePath,
      title: input.title,
      flowType: input.flowType,
      nodes: input.nodes,
      edges: input.edges,
      parameters: input.parameters,
      history: [],
      historyIndex: -1,
      isDirty: false,
      nodeDefinitions: input.flowType ? filterDefinitions(input.flowType) : builtinNodeDefinitions,
      viewport: { x: 0, y: 0, zoom: 1 },
    };

    const newState = { ...s, tabs: [...s.tabs, tab], activeTabId: id };
    loadTabIntoStore(newState, tab);
    set({
      tabs: newState.tabs,
      activeTabId: id,
      filePath: newState.filePath,
      isDirty: newState.isDirty,
      flowType: newState.flowType,
      nodes: newState.nodes,
      edges: newState.edges,
      parameters: newState.parameters,
      history: newState.history,
      historyIndex: newState.historyIndex,
      nodeDefinitions: newState.nodeDefinitions,
      viewport: newState.viewport,
      selectedNodeIds: [],
      selectedEdgeIds: [],
      validationResult: null,
    });
    return id;
  },

  closeTab: (id) => {
    const s = get();
    if (s.tabs.length <= 1) return; // Keep at least one tab

    const newTabs = s.tabs.filter((t) => t.id !== id);
    const newState = { ...s, tabs: newTabs };

    if (s.activeTabId === id) {
      // Switch to the tab after the closed one, or the last one
      const closedIdx = s.tabs.findIndex((t) => t.id === id);
      const newIdx = Math.min(closedIdx, newTabs.length - 1);
      const targetTab = newTabs[newIdx];
      newState.activeTabId = targetTab.id;
      loadTabIntoStore(newState, targetTab);
    }

    set({
      tabs: newTabs,
      activeTabId: newState.activeTabId,
      filePath: newState.filePath,
      isDirty: newState.isDirty,
      flowType: newState.flowType,
      nodes: newState.nodes,
      edges: newState.edges,
      parameters: newState.parameters,
      history: newState.history,
      historyIndex: newState.historyIndex,
      nodeDefinitions: newState.nodeDefinitions,
      viewport: newState.viewport,
      selectedNodeIds: [],
      selectedEdgeIds: [],
      validationResult: null,
    });
  },

  switchTab: (id) => {
    const s = get();
    if (s.activeTabId === id) return;
    flushActiveTab(s);

    const tab = s.tabs.find((t) => t.id === id);
    if (!tab) return;

    const newState = { ...s, activeTabId: id };
    loadTabIntoStore(newState, tab);
    set({
      activeTabId: id,
      filePath: newState.filePath,
      isDirty: newState.isDirty,
      flowType: newState.flowType,
      nodes: newState.nodes,
      edges: newState.edges,
      parameters: newState.parameters,
      history: newState.history,
      historyIndex: newState.historyIndex,
      nodeDefinitions: newState.nodeDefinitions,
      viewport: newState.viewport,
      selectedNodeIds: [],
      selectedEdgeIds: [],
      validationResult: null,
    });
  },

  updateTabTitle: (id, title, filePath) => {
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === id ? { ...t, title, filePath } : t
      ),
    }));
  },

  // ── Document state operations ──

  setFilePath: (path) => {
    set((s) => {
      // Also update tab title
      const title = path ? path.replace(/^.*[\\/]/, '').replace(/\.flow(\.json)?$/, '') : s.tabs.find(t => t.id === s.activeTabId)?.title ?? 'Untitled';
      return {
        filePath: path,
        tabs: s.tabs.map((t) =>
          t.id === s.activeTabId ? { ...t, filePath: path, title } : t
        ),
      };
    });
  },

  setDirty: (dirty) => set({ isDirty: dirty }),

  setFlowType: (ft) =>
    set({
      flowType: ft,
      nodeDefinitions: filterDefinitions(ft),
      nodes: createDefaultNodes(),
      edges: [],
      parameters: [],
      isDirty: false,
      history: [],
      historyIndex: -1,
      selectedNodeIds: [],
      selectedEdgeIds: [],
      validationResult: null,
    }),

  addNode: (def, position) => {
    const node = createNode(def, position);
    set((s) => {
      pushHistoryIfNeeded(s);
      return { nodes: [...s.nodes, node], isDirty: true };
    });
  },

  deleteNodes: (ids) => {
    set((s) => {
      pushHistoryIfNeeded(s);
      const newNodes = s.nodes.filter((n) => !ids.includes(n.id));
      const newEdges = s.edges.filter(
        (e) => !ids.includes(e.source) && !ids.includes(e.target)
      );
      return { nodes: newNodes, edges: newEdges, isDirty: true };
    });
  },

  updateNodeParam: (nodeId, paramKey, value) => {
    set((s) => {
      pushHistoryIfNeeded(s);
      return {
        nodes: s.nodes.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                data: { ...n.data, params: { ...n.data.params, [paramKey]: value } },
              }
            : n
        ),
        isDirty: true,
      };
    });
  },

  updateNodePosition: (nodeId, x, y) => {
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === nodeId ? { ...n, position: { x, y } } : n
      ),
      isDirty: true,
    }));
  },

  addEdge: (edge) => {
    set((s) => {
      pushHistoryIfNeeded(s);
      return { edges: [...s.edges, edge], isDirty: true };
    });
  },

  deleteEdges: (ids) => {
    set((s) => {
      pushHistoryIfNeeded(s);
      return {
        edges: s.edges.filter((e) => !ids.includes(e.id)),
        isDirty: true,
      };
    });
  },

  addParameter: (param) => {
    set((s) => {
      pushHistoryIfNeeded(s);
      if (s.parameters.find((p) => p.key === param.key)) return s;
      return { parameters: [...s.parameters, param], isDirty: true };
    });
  },

  removeParameter: (key) => {
    set((s) => {
      pushHistoryIfNeeded(s);
      return {
        parameters: s.parameters.filter((p) => p.key !== key),
        isDirty: true,
      };
    });
  },

  updateParameter: (key, patch) => {
    set((s) => ({
      parameters: s.parameters.map((p) =>
        p.key === key ? { ...p, ...patch } : p
      ),
      isDirty: true,
    }));
  },

  setSelection: (nodeIds, edgeIds) =>
    set({ selectedNodeIds: nodeIds, selectedEdgeIds: edgeIds }),

  setViewport: (viewport) => set({ viewport }),

  loadDocument: (nodes, edges, parameters) =>
    set({
      nodes,
      edges,
      parameters,
      isDirty: false,
      history: [],
      historyIndex: -1,
      selectedNodeIds: [],
      selectedEdgeIds: [],
    }),

  clearCanvas: () =>
    set({
      nodes: createDefaultNodes(),
      edges: [],
      parameters: [],
      isDirty: false,
      history: [],
      historyIndex: -1,
      selectedNodeIds: [],
      selectedEdgeIds: [],
      validationResult: null,
    }),

  pushHistory: () => {
    const s = get();
    pushHistoryIfNeeded(s);
    set({});
  },

  undo: () => {
    const s = get();
    if (s.historyIndex < 0) return;
    const entry = s.history[s.historyIndex];
    const newState = { ...s };
    restore(newState, entry);
    set({
      nodes: newState.nodes,
      edges: newState.edges,
      parameters: newState.parameters,
      historyIndex: s.historyIndex - 1,
      isDirty: true,
    });
  },

  redo: () => {
    const s = get();
    if (s.historyIndex >= s.history.length - 1) return;
    const entry = s.history[s.historyIndex + 1];
    const newState = { ...s };
    restore(newState, entry);
    set({
      nodes: newState.nodes,
      edges: newState.edges,
      parameters: newState.parameters,
      historyIndex: s.historyIndex + 1,
      isDirty: true,
    });
  },

  setValidationResult: (result) => set({ validationResult: result }),
}));

function pushHistoryIfNeeded(s: EditorStore) {
  const entry = snapshot(s);
  if (s.history.length > 0) {
    const last = s.history[s.historyIndex];
    if (JSON.stringify(last) === JSON.stringify(entry)) return;
  }
  s.history = s.history.slice(0, s.historyIndex + 1);
  s.history.push(entry);
  if (s.history.length > 50) s.history.shift();
  s.historyIndex = s.history.length - 1;
}
