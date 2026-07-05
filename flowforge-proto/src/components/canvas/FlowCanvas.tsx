import { useCallback, useState } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  useReactFlow,
  type Node,
  type Connection,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEditorStore } from '../../store/editorStore';
import { useConfigStore } from '../../store/configStore';
import { getDragState, updateDragPosition, clearDrag } from '../../utils/dragBridge';
import FlowNodeComponent from './FlowNodeComponent';
import { useT } from '../../i18n';

const nodeTypes = { flowNode: FlowNodeComponent };

// ── Extensible context menu state ──
type ContextTarget =
  | { type: 'node'; nodeId: string }
  | { type: 'edge'; edgeId: string }
  | { type: 'canvas' };

interface ContextMenuState {
  target: ContextTarget;
  x: number; // clientX
  y: number; // clientY
}

export default function FlowCanvas() {
  const { t } = useT();
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const selectedNodeIds = useEditorStore((s) => s.selectedNodeIds);
  const addNode = useEditorStore((s) => s.addNode);
  const addEdge = useEditorStore((s) => s.addEdge);
  const deleteNodes = useEditorStore((s) => s.deleteNodes);
  const deleteEdges = useEditorStore((s) => s.deleteEdges);
  const updateNodePosition = useEditorStore((s) => s.updateNodePosition);
  const getNodeDefs = useConfigStore((s) => s.getNodeDefs);
  const customNodeDefs = useConfigStore((s) => s.customNodeDefs);

  const { screenToFlowPosition } = useReactFlow();
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [dragGhost, setDragGhost] = useState<{ x: number; y: number } | null>(null);

  const onConnect = useCallback(
    (conn: Connection) => {
      if (!conn.source || !conn.target) return;
      addEdge({
        id: `edge-${conn.source}-${conn.sourceHandle ?? 'out'}-${conn.target}-${conn.targetHandle ?? 'in'}`,
        source: conn.source,
        target: conn.target,
        sourceHandle: conn.sourceHandle ?? undefined,
        targetHandle: conn.targetHandle ?? undefined,
        data: {
          sourcePin: conn.sourceHandle ?? 'flow_out',
          targetPin: conn.targetHandle ?? 'flow_in',
        },
      });
    },
    [addEdge]
  );

  const onNodesChange = useCallback(
    (changes: any[]) => {
      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          updateNodePosition(change.id, change.position.x, change.position.y);
        }
        if (change.type === 'remove') {
          // handled via deleteNodes from keyboard
        }
      }
    },
    [updateNodePosition]
  );

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      useEditorStore.getState().setSelection([node.id], []);
    },
    []
  );

  const onPaneClick = useCallback(() => {
    useEditorStore.getState().setSelection([], []);
    setContextMenu(null);
  }, []);

  // ── Node right-click → context menu ──
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      event.stopPropagation();
      useEditorStore.getState().setSelection([node.id], []);
      setContextMenu({
        target: { type: 'node', nodeId: node.id },
        x: event.clientX,
        y: event.clientY,
      });
    },
    []
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const sel = useEditorStore.getState().selectedNodeIds;
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (sel.length > 0) {
          deleteNodes(sel);
        }
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
        event.preventDefault();
        useEditorStore.getState().undo();
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
        event.preventDefault();
        useEditorStore.getState().redo();
      }
    },
    [deleteNodes]
  );

  // ── Drag-to-place via mouse events (WebView2 compatible) ──

  const onCanvasMouseUp = useCallback(
    (event: React.MouseEvent) => {
      const ds = getDragState();
      if (!ds) return;
      clearDrag();
      setDragGhost(null);

      const def = getNodeDefs().find((d) => d.type === ds.nodeType);
      if (!def) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(def, position);
    },
    [customNodeDefs, screenToFlowPosition, addNode]
  );

  const onCanvasMouseMove = useCallback((event: React.MouseEvent) => {
    const ds = getDragState();
    if (!ds) return;
    updateDragPosition(event.clientX, event.clientY);
    setDragGhost({ x: event.clientX, y: event.clientY });
  }, []);

  const onCanvasMouseLeave = useCallback(() => {
    setDragGhost(null);
  }, []);

  // ── Context menu actions ──

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      deleteNodes([nodeId]);
      setContextMenu(null);
    },
    [deleteNodes]
  );

  const handleCopyNode = useCallback(
    (nodeId: string) => {
      const node = useEditorStore.getState().nodes.find((n) => n.id === nodeId);
      if (!node) return;
      const def = getNodeDefs().find((d) => d.type === node.data.nodeType);
      if (!def) return;
      addNode(def, { x: node.position.x + 40, y: node.position.y + 40 });
      setContextMenu(null);
    },
    [customNodeDefs, addNode]
  );

  // ── Render ──

  return (
    <div
      style={{ width: '100%', height: '100%', position: 'relative' }}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseMove={onCanvasMouseMove}
      onMouseLeave={onCanvasMouseLeave}
      onMouseUp={onCanvasMouseUp}
    >
      <ReactFlow
        nodes={nodes.map((n) => ({ ...n, selected: selectedNodeIds.includes(n.id) }))}
        edges={edges}
        onNodesChange={onNodesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeContextMenu={onNodeContextMenu}
        nodeTypes={nodeTypes}
        deleteKeyCode={['Delete', 'Backspace']}
        multiSelectionKeyCode="Shift"
        style={{ background: 'var(--color-background-tertiary)' }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="var(--color-border-tertiary)" />
        <Controls />
      </ReactFlow>

      {/* Ghost preview during drag */}
      {dragGhost && getDragState() && (
        <div
          style={{
            position: 'fixed',
            left: dragGhost.x + 12,
            top: dragGhost.y + 12,
            pointerEvents: 'none',
            zIndex: 1000,
            opacity: 0.75,
            padding: '4px 10px',
            borderRadius: 6,
            border: '0.5px solid var(--color-border-secondary)',
            background: 'var(--color-background-primary)',
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--color-text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{
            width: 8, height: 8, borderRadius: 2,
            background: getDragState()!.color,
            display: 'inline-block', flexShrink: 0,
          }} />
          {getDragState()!.label}
        </div>
      )}

      {/* Context menu — extensible by target type */}
      {contextMenu && (() => {
        const menu = contextMenu;
        const target = menu.target;
        return (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 10 }}
          onClick={() => setContextMenu(null)}
          onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
        >
          <div
            style={{
              position: 'fixed',
              left: menu.x,
              top: menu.y,
              background: 'var(--color-background-primary)',
              border: '0.5px solid var(--color-border-tertiary)',
              borderRadius: 8,
              padding: '4px 0',
              minWidth: 140,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {target.type === 'node' && (
              <>
                <div style={{ padding: '4px 12px', fontSize: 11, color: 'var(--color-text-tertiary)', fontWeight: 500 }}>
                  {t('canvas.contextMenu.node')}
                </div>
                <ContextMenuItem label={t('canvas.contextMenu.copy')} shortcut="Ctrl+C" onClick={() => handleCopyNode(target.nodeId)} />
                <ContextMenuItem
                  label={t('canvas.contextMenu.delete')}
                  shortcut="Del"
                  onClick={() => handleDeleteNode(target.nodeId)}
                  danger
                />
              </>
            )}
          </div>
        </div>
      );
      })()}
    </div>
  );
}

// ── Reusable context menu item ──
function ContextMenuItem({
  label,
  shortcut,
  onClick,
  danger,
}: {
  label: string;
  shortcut?: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '5px 12px',
        fontSize: 12,
        cursor: 'pointer',
        color: danger ? 'var(--color-text-danger)' : 'var(--color-text-primary)',
        display: 'flex',
        justifyContent: 'space-between',
        gap: 24,
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-background-secondary)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <span>{label}</span>
      {shortcut && <span style={{ color: 'var(--color-text-tertiary)', fontSize: 10 }}>{shortcut}</span>}
    </div>
  );
}
