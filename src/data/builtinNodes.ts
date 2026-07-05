import type { NodeDefinition } from '../types';

export const builtinNodeDefinitions: NodeDefinition[] = [
  {
    type: 'flow_start',
    category: 'flow',
    label: 'Flow Start',
    description: 'Entry point of the dialogue flow',
    color: '#534AB7',
    pins: {
      inputs: [],
      outputs: [
        { id: 'flow_out', label: '', type: 'flow', required: true },
      ],
    },
    params: [],
    flowTypes: [],
  },
  {
    type: 'flow_end',
    category: 'flow',
    label: 'Flow End',
    description: 'Terminates the flow',
    color: '#534AB7',
    pins: {
      inputs: [
        { id: 'flow_in', label: '', type: 'flow', required: true },
      ],
      outputs: [],
    },
    params: [],
    flowTypes: [],
  },
  {
    type: 'dialogue_line',
    category: 'dialogue',
    label: 'Dialogue Line',
    description: 'Display a line of dialogue with speaker and expression',
    color: '#D85A30',
    icon: 'message-square',
    pins: {
      inputs: [
        { id: 'flow_in', label: '', type: 'flow', required: true },
      ],
      outputs: [
        { id: 'flow_out', label: '', type: 'flow', required: true },
      ],
    },
    params: [
      { key: 'speaker', type: 'string', label: 'Speaker', default: '', required: true, source: 'param_or_fixed' },
      { key: 'text', type: 'text', label: 'Dialogue', default: '', required: true, source: 'fixed' },
      { key: 'expression', type: 'enum', label: 'Expression', default: 'neutral', required: false, source: 'param_or_fixed', options: ['neutral', 'happy', 'angry', 'sad', 'surprised'] },
      { key: 'auto_advance', type: 'boolean', label: 'Auto Advance', default: false, required: false, source: 'fixed' },
      { key: 'delay', type: 'float', label: 'Delay (s)', default: 1.5, required: false, source: 'fixed', min: 0, max: 30 },
    ],
    writes: [
      { key: 'speaker', type: 'string', description: 'Update current speaker after this dialogue' },
    ],
    flowTypes: ['dialogue'],
  },
  {
    type: 'branch_choice',
    category: 'dialogue',
    label: 'Branch Choice',
    description: 'Present player with multiple dialogue choices',
    color: '#D85A30',
    pins: {
      inputs: [
        { id: 'flow_in', label: '', type: 'flow', required: true },
      ],
      outputs: [
        { id: 'choice_a', label: 'A', type: 'flow', required: false },
        { id: 'choice_b', label: 'B', type: 'flow', required: false },
        { id: 'choice_c', label: 'C', type: 'flow', required: false },
      ],
    },
    params: [
      { key: 'prompt', type: 'text', label: 'Prompt', default: '', required: true, source: 'fixed' },
      { key: 'label_a', type: 'string', label: 'Choice A', default: '', required: false, source: 'fixed' },
      { key: 'label_b', type: 'string', label: 'Choice B', default: '', required: false, source: 'fixed' },
      { key: 'label_c', type: 'string', label: 'Choice C', default: '', required: false, source: 'fixed' },
    ],
    flowTypes: ['dialogue'],
  },
  {
    type: 'condition',
    category: 'dialogue',
    label: 'Condition',
    description: 'Branch based on a variable condition',
    color: '#D85A30',
    pins: {
      inputs: [
        { id: 'flow_in', label: '', type: 'flow', required: true },
      ],
      outputs: [
        { id: 'flow_true', label: 'T', type: 'flow', required: false },
        { id: 'flow_false', label: 'F', type: 'flow', required: false },
      ],
    },
    params: [
      { key: 'variable', type: 'string', label: 'Variable', default: '', required: true, source: 'param' },
      { key: 'operator', type: 'enum', label: 'Operator', default: '==', required: true, source: 'fixed', options: ['==', '!=', '>', '<', '>=', '<='] },
      { key: 'compare_value', type: 'string', label: 'Compare Value', default: '', required: true, source: 'fixed' },
    ],
    flowTypes: ['dialogue', 'quest'],
  },
  {
    type: 'event_trigger',
    category: 'events',
    label: 'Event Trigger',
    description: 'Trigger a game event (animation, sound, camera, reward)',
    color: '#1D9E75',
    pins: {
      inputs: [
        { id: 'flow_in', label: '', type: 'flow', required: true },
      ],
      outputs: [
        { id: 'flow_out', label: '', type: 'flow', required: true },
      ],
    },
    params: [
      { key: 'event_name', type: 'string', label: 'Event Name', default: '', required: true, source: 'fixed', placeholder: 'e.g. play_sfx, shake_camera' },
      { key: 'payload', type: 'string', label: 'Payload', default: '', required: false, source: 'fixed', placeholder: 'e.g. {"gold": 100}' },
    ],
    flowTypes: ['dialogue', 'quest', 'action'],
  },
  {
    type: 'flow_call',
    category: 'flow',
    label: 'Call Flow',
    description: 'Call another flow and pass parameters to it',
    color: '#534AB7',
    icon: 'share-2',
    pins: {
      inputs: [
        { id: 'flow_in', label: '', type: 'flow', required: true },
      ],
      outputs: [
        { id: 'flow_out', label: '', type: 'flow', required: true },
      ],
    },
    params: [
      { key: 'target_flow', type: 'string', label: 'Target Flow', default: '', required: true, source: 'fixed', placeholder: 'path/to/flow.flow' },
    ],
    flowTypes: [],
  },
];
