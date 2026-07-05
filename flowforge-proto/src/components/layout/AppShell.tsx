import { ReactFlowProvider } from '@xyflow/react';
import Toolbar from '../toolbar/Toolbar';
import NodeLibrary from '../panels/NodeLibrary';
import FlowCanvas from '../canvas/FlowCanvas';
import ParametersPanel from '../panels/ParametersPanel';
import PropertyPanel from '../panels/PropertyPanel';
import StatusBar from '../panels/StatusBar';
import { useEditorStore } from '../../store/editorStore';
import { useAppStore } from '../../store/appStore';
import { saveFile, saveFileAs } from '../../api/fileApi';
import { useEffect } from 'react';

export default function AppShell() {
  const setFilePath = useEditorStore((s) => s.setFilePath);
  const setDirty = useEditorStore((s) => s.setDirty);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const parameters = useEditorStore((s) => s.parameters);
  const filePath = useEditorStore((s) => s.filePath);
  const flowType = useEditorStore((s) => s.flowType);
  const clearCanvas = useEditorStore((s) => s.clearCanvas);
  const addRecentFile = useAppStore((s) => s.addRecentFile);

  // ── Serialize current state to FlowDocument JSON ──
  const serializeDocument = () => {
    const fileName = filePath
      ? filePath.replace(/^.*[\\/]/, '').replace(/\.flow(\.json)?$/, '')
      : 'untitled';

    return JSON.stringify(
      {
        version: '1.0',
        meta: {
          name: fileName,
          author: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          dsl_version: '1.0',
          flow_type: flowType?.id ?? '',
        },
        parameters,
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.data.nodeType,
          position: n.position,
          params: n.data.params,
          disabled: n.data.disabled,
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source_node: e.source,
          source_pin: e.sourceHandle ?? 'flow_out',
          target_node: e.target,
          target_pin: e.targetHandle ?? 'flow_in',
        })),
      },
      null,
      2
    );
  };

  // ── File operations ──
  const handleSave = async () => {
    try {
      const content = serializeDocument();
      if (filePath) {
        await saveFile(filePath, content);
      } else {
        const newPath = await saveFileAs(content);
        if (newPath) setFilePath(newPath);
        else return;
      }
      setDirty(false);
      if (flowType) {
        addRecentFile(filePath ?? useEditorStore.getState().filePath!, filePath?.replace(/^.*[\\/]/, '') ?? 'untitled', flowType);
      }
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const handleSaveAs = async () => {
    try {
      const content = serializeDocument();
      const defaultName = filePath
        ? filePath.replace(/^.*[\\/]/, '')
        : 'untitled.flow';
      const newPath = await saveFileAs(content, defaultName);
      if (newPath) {
        setFilePath(newPath);
        setDirty(false);
        if (flowType) {
          addRecentFile(newPath, newPath.replace(/^.*[\\/]/, ''), flowType);
        }
      }
    } catch (err) {
      console.error('Save As failed:', err);
    }
  };

  const handleNew = () => {
    clearCanvas();
    setFilePath(null);
  };

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key === 's') {
        e.preventDefault();
        if (e.shiftKey) {
          handleSaveAs();
        } else {
          handleSave();
        }
      }
      if (mod && e.key === 'n') {
        e.preventDefault();
        handleNew();
      }
      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if (mod && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [nodes, edges, parameters, filePath]);

  return (
    <ReactFlowProvider>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: 'var(--color-background-tertiary)',
        color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-sans)',
      }}>
        <Toolbar
          onSave={handleSave}
          onSaveAs={handleSaveAs}
          onNew={handleNew}
        />
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <NodeLibrary />
          <div style={{ flex: 1, position: 'relative' }}>
            <FlowCanvas />
            <ParametersPanel />
          </div>
          <PropertyPanel />
        </div>
        <StatusBar />
      </div>
    </ReactFlowProvider>
  );
}
