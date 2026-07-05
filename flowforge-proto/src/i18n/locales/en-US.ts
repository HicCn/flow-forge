// ── FlowForge English translation dictionary ──
// Coverage: editor shell system UI only (no business node definitions)
// Must be structurally identical to zh-CN (enforced by typeof zhCN)

import type { zhCN } from './zh-CN';

export const enUS: typeof zhCN = {
  common: {
    ok: 'OK',
    cancel: 'Cancel',
  },

  landing: {
    subtitle: 'Node-based Flow Editor for Game Development',
    newFlow: 'New Flow',
    openFile: 'Open File',
    recentFiles: 'Recent Files',
    unknownFlowType: 'Unrecognized flow type',
    openFailed: 'Failed to open file',
    fileNotFound: 'File not found or unreadable',
    unknown: 'Unknown',
  },

  typePicker: {
    title: 'New Flow',
    subtitle: 'Select a flow type to determine available nodes',
    cancel: 'Cancel',
  },

  toolbar: {
    untitled: 'Untitled',
    home: 'Back to Home',
    new: 'New',
    save: 'Save',
    saveAs: 'Save As',
    undo: 'Undo (Ctrl+Z)',
    redo: 'Redo (Ctrl+Y)',
    nodeCount: '{count} nodes',
  },

  nodeLibrary: {
    expand: 'Expand node library',
    nodes: 'Nodes',
    search: 'Search nodes...',
    collapse: 'Collapse',
    noNodes: 'No nodes found',
  },

  propertyPanel: {
    expand: 'Expand property panel',
    props: 'Props',
    title: 'Property',
    clickToEdit: 'Click a node to edit properties',
    nodesSelected: '{count} nodes selected',
    noParams: 'No configurable parameters',
    writesTo: 'Writes to Parameters',
    nodeId: 'ID:',
    unsupportedType: 'Unsupported type',
    fixed: 'Fixed',
    param: 'Param',
    selectParam: '-- select param --',
  },

  parametersPanel: {
    expand: 'Expand Parameters',
    params: 'Params ({count})',
    title: 'Parameters',
    add: 'Add parameter',
    collapse: 'Collapse',
    key: 'key',
    ok: 'OK',
    remove: 'Remove',
    noParams: 'No parameters',
  },

  statusBar: {
    untitled: 'Untitled',
    nodesEdges: '{nodeCount} nodes, {edgeCount} edges',
    errors: '{count} error(s)',
    warnings: '{count} warning(s)',
    noErrors: 'No errors',
  },

  canvas: {
    contextMenu: {
      node: 'Node',
      copy: 'Copy',
      delete: 'Delete',
    },
  },

  flowNode: {
    more: '+{count} more',
    writes: 'writes: ',
  },
};
