import { ReactFlowProvider } from '@xyflow/react';
import Toolbar from '../toolbar/Toolbar';
import NodeLibrary from '../panels/NodeLibrary';
import FlowCanvas from '../canvas/FlowCanvas';
import ParametersPanel from '../panels/ParametersPanel';
import PropertyPanel from '../panels/PropertyPanel';
import StatusBar from '../panels/StatusBar';
import { useEditorStore } from '../../store/editorStore';
import { useAppStore } from '../../store/appStore';
import { saveFile, saveFileAs, exportRuntime } from '../../api/fileApi';
import { useConfigStore } from '../../store/configStore';
import { useEditorMetaStore } from '../../store/editorMetaStore';
import { useEffect, useState } from 'react';
import { useT } from '../../i18n';

export default function AppShell() {
  const { t } = useT();
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
  const tabs = useEditorStore((s) => s.tabs);
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const switchTab = useEditorStore((s) => s.switchTab);
  const closeTab = useEditorStore((s) => s.closeTab);
  const updateTabTitle = useEditorStore((s) => s.updateTabTitle);
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
        parameters: parameters.map((p) => {
          const result: Record<string, unknown> = {
            key: p.key,
            type: p.type,
            default: p.default,
            source: p.source,
          };
          if (p.isInput) result.isInput = true;
          if (p.nodeId) result.nodeId = p.nodeId;
          if (p.expression) result.expression = p.expression;
          return result;
        }),
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
      const meta = { comments: useEditorMetaStore.getState().comments };
      if (filePath) {
        await saveFile(filePath, content, meta);
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

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    setExporting(true);
    try {
      const nodeDefs = useConfigStore.getState().getNodeDefs();
      const result = await exportRuntime('csharp', nodeDefs);

      if (!result.outputDir) {
        // User cancelled directory picker — silent no-op
        return;
      }

      const parts: string[] = [];
      if (result.generated.length > 0) {
        parts.push(`${result.generated.length} 个节点类 → Generated/`);
      }
      if (result.runtimeFiles.length > 0) {
        parts.push(`${result.runtimeFiles.length} 个基类 → Runtime/`);
      }
      if (result.skippedRuntime.length > 0) {
        parts.push(`${result.skippedRuntime.length} 个已跳过（存在）`);
      }

      alert(`导出完成\n\n${parts.join('\n')}\n\n目标目录: ${result.outputDir}`);
    } catch (err) {
      console.error('Export failed:', err);
      alert(`导出失败: ${err}`);
    } finally {
      setExporting(false);
    }
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
          onExport={handleExport}
        />
        {/* ── Tab Bar ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          height: 30,
          background: 'var(--color-background-secondary)',
          borderBottom: '0.5px solid var(--color-border-tertiary)',
          overflowX: 'auto',
          flexShrink: 0,
          gap: 1,
          padding: '0 4px',
        }}>
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 8px',
                  fontSize: 11,
                  cursor: 'pointer',
                  borderRadius: '4px 4px 0 0',
                  whiteSpace: 'nowrap',
                  maxWidth: 160,
                  background: isActive ? 'var(--color-background-primary)' : 'transparent',
                  border: isActive ? '0.5px solid var(--color-border-tertiary)' : '0.5px solid transparent',
                  borderBottom: isActive ? 'none' : '0.5px solid transparent',
                  color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                  fontWeight: isActive ? 500 : 400,
                  position: 'relative' as const,
                  top: isActive ? 0.5 : 0,
                }}
                title={tab.filePath ?? tab.title}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {tab.title}
                  {tab.isDirty && <span style={{ color: 'var(--color-text-warning)', marginLeft: 2 }}> *</span>}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: 10,
                    color: 'var(--color-text-tertiary)',
                    padding: 0,
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                  title={t('tabs.close')}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
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
