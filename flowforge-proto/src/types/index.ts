import type { Node, Edge } from '@xyflow/react';

export type ParamSource = 'fixed' | 'param' | 'param_or_fixed';
export type FlowSource = 'flow_input' | 'node' | 'expression';
export type PinType = 'flow' | 'string' | 'number' | 'float' | 'boolean' | 'enum' | 'event' | 'any' | 'text';
export type ParamType = Exclude<PinType, 'flow'>;

// ── Flow type ──
export type FlowTypeStatus = 'active' | 'deprecated' | 'deleted';

export interface FlowType {
  id: string;
  label: string;
  description: string;
  icon?: string;
  status: FlowTypeStatus;
  builtin: boolean;
  version: number;
  supersededBy?: string;
}

export interface EnumType {
  id: string;
  label: string;
  description: string;
  values: string[];
  builtin: boolean;
}

export interface PinDefinition {
  id: string;
  label: string;
  type: PinType;
  required: boolean;
}

export interface ParamDefinition {
  key: string;
  type: ParamType;
  label: string;
  default: unknown;
  required: boolean;
  source: ParamSource;
  options?: string[];
  enumType?: string;       // reference to EnumType.id for centralized enum management
  min?: number;
  max?: number;
  placeholder?: string;
  description?: string;
}

export interface WriteDefinition {
  key: string;
  type: ParamType;
  description: string;
}

export interface NodeDefinition {
  type: string;
  category: string;
  label: string;
  description: string;
  color: string;
  icon?: string;
  pins: {
    inputs: PinDefinition[];
    outputs: PinDefinition[];
  };
  params: ParamDefinition[];
  writes?: WriteDefinition[];
  flowTypes: string[];
}

export type ParamValue =
  | { source: 'fixed'; value: unknown }
  | { source: 'param'; value: string };

export interface FlowNodeData {
  nodeType: string;
  label: string;
  category: string;
  color: string;
  params: Record<string, ParamValue>;
  writes?: WriteDefinition[];
  disabled: boolean;
  validationErrors: string[];
}

export type FlowNode = Node<FlowNodeData & Record<string, unknown>>;

export interface FlowEdgeData {
  sourcePin: string;
  targetPin: string;
}

export type FlowEdge = Edge<FlowEdgeData & Record<string, unknown>>;

export interface FlowParameter {
  key: string;
  type: ParamType;
  default: unknown;
  source: FlowSource;
  nodeId?: string;
  expression?: string;
  /** 标记为外部调用入参。设为 true 后，其他流可通过 flow_call 节点为此参数传值 */
  isInput?: boolean;
}

export interface TabData {
  id: string;
  filePath: string | null;
  title: string;
  flowType: FlowType | null;
  nodes: FlowNode[];
  edges: FlowEdge[];
  parameters: FlowParameter[];
  history: HistoryEntry[];
  historyIndex: number;
  isDirty: boolean;
  nodeDefinitions: NodeDefinition[];
  viewport: { x: number; y: number; zoom: number };
}

export interface ValidationError {
  level: 'error' | 'warning';
  code: string;
  nodeId?: string;
  edgeId?: string;
  message: string;
  paramKey?: string;
  sourcePinType?: string;
  targetPinType?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface FlowMeta {
  name: string;
  author: string;
  created_at: string;
  updated_at: string;
  dsl_version: string;
  flow_type: string;
}

export interface FlowDocument {
  version: string;
  meta: FlowMeta;
  parameters: FlowParameter[];
  nodes: unknown[];
  edges: unknown[];
}

/** Editor-only metadata stored alongside .flow files */
export interface FlowEditorMeta {
  /** Per-node comments, keyed by node id */
  comments: Record<string, string>;
}

export interface EditorState {
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
}

export interface HistoryEntry {
  nodes: FlowNode[];
  edges: FlowEdge[];
  parameters: FlowParameter[];
}
