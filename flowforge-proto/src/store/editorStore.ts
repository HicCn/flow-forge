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
} from '../types';
import { builtinNodeDefinitions } from '../data/builtinNodes';

interface EditorStore {
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

  setSelection: (nodeIds: string[], edgeIds: string[]) => void;
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void;

  loadDocument: (nodes: FlowNode[], edges: FlowEdge[], parameters: FlowParameter[]) => void;
  clearCanvas: () => void;

  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  setValidationResult: (result: ValidationResult | null) => void;
}

function filterDefinitions(flowType: FlowType): NodeDefinition[] {
  return builtinNodeDefinitions.filter(
    (d) => d.flowTypes.includes(flowType.id)
  );
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

export const useEditorStore = create<EditorStore>((set, get) => ({
  filePath: null,
  isDirty: false,
  flowType: null,
  nodes: createDefaultNodes(),
  edges: [],
  parameters: [],
  selectedNodeIds: [],
  selectedEdgeIds: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  nodeDefinitions: builtinNodeDefinitions,
  validationResult: null,
  history: [],
  historyIndex: -1,

  setFilePath: (path) => set({ filePath: path }),
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
