import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { useEditorStore } from '../store/editorStore';
import { useConfigStore } from '../store/configStore';
import { openFile, loadFile, exportRuntime } from '../api/fileApi';
import TypePickerModal from '../components/modals/TypePickerModal';
import SettingsModal from '../components/modals/SettingsModal';
import type { FlowNode, FlowEdge, FlowParameter, ParamValue } from '../types';
import { useT } from '../i18n';

export default function LandingScreen() {
  const { t, locale } = useT();
  const recentFiles = useAppStore((s) => s.recentFiles);
  const addRecentFile = useAppStore((s) => s.addRecentFile);
  const setScreen = useAppStore((s) => s.setScreen);
  const openTab = useEditorStore((s) => s.openTab);
  const findFlowType = useConfigStore((s) => s.findFlowType);

  const [showModal, setShowModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const nodeDefs = useConfigStore.getState().getNodeDefs();
      const result = await exportRuntime('csharp', nodeDefs);
      alert(`导出了 ${result.files.length} 个文件`);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const loadDocFromJson = (json: string, path: string): boolean => {
    const doc = JSON.parse(json);
    const flowTypeId = doc.meta?.flow_type;
    const ft = findFlowType(flowTypeId);

    if (!ft) {
      alert(t('landing.unknownFlowType') + ': ' + (flowTypeId || t('landing.unknown')));
      return false;
    }

    const loadedNodes: FlowNode[] = (doc.nodes || []).map((n: Record<string, unknown>) => ({
      id: String(n.id),
      type: 'flowNode',
      position: n.position as { x: number; y: number } ?? { x: 0, y: 0 },
      data: {
        nodeType: String(n.type),
        label: String(n.type),
        category: '',
        color: '#888',
        params: (n.params as Record<string, ParamValue>) || {},
        disabled: Boolean(n.disabled),
        validationErrors: [],
      },
    }));

    const loadedEdges: FlowEdge[] = (doc.edges || []).map((e: Record<string, unknown>) => ({
      id: String(e.id),
      source: String(e.source_node),
      target: String(e.target_node),
      sourceHandle: String(e.source_pin),
      targetHandle: String(e.target_pin),
    }));

    const loadedParams: FlowParameter[] = (doc.parameters || []).map((p: Record<string, unknown>) => ({
      key: String(p.key),
      type: String(p.type) as FlowParameter['type'],
      default: p.default,
      source: (p.source as FlowParameter['source']) || 'flow_input',
      isInput: Boolean(p.isInput),
    }));

    const title = path.replace(/^.*[\\/]/, '').replace(/\.flow(\.json)?$/, '') || doc.meta?.name || 'Untitled';
    openTab({
      filePath: path,
      title,
      flowType: ft,
      nodes: loadedNodes,
      edges: loadedEdges,
      parameters: loadedParams,
    });
    addRecentFile(path, title, ft);
    setScreen('editor');
    return true;
  };

  const handleOpenFile = async () => {
    try {
      const result = await openFile();
      if (!result) return;
      loadDocFromJson(result.content, result.path);
    } catch (err) {
      console.error('Open failed:', err);
      alert(t('landing.openFailed'));
    }
  };

  const handleOpenRecent = async (path: string) => {
    try {
      const result = await loadFile(path);
      if (!result) { alert(t('landing.fileNotFound')); return; }
      loadDocFromJson(result.content, result.path);
    } catch (err) {
      console.error('Open recent failed:', err);
      alert(t('landing.openFailed'));
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--color-background-tertiary)',
      color: 'var(--color-text-primary)',
      fontFamily: 'var(--font-sans)',
      padding: 24,
    }}>
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>FlowForge</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
          {t('landing.subtitle')}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: '10px 24px',
            fontSize: 14,
            fontWeight: 500,
            border: 'none',
            borderRadius: 8,
            background: '#378ADD',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          {t('landing.newFlow')}
        </button>
        <button
          onClick={handleOpenFile}
          style={{
            padding: '10px 24px',
            fontSize: 14,
            fontWeight: 500,
            border: '0.5px solid var(--color-border-secondary)',
            borderRadius: 8,
            background: 'var(--color-background-primary)',
            color: 'var(--color-text-primary)',
            cursor: 'pointer',
          }}
        >
          {t('landing.openFile')}
        </button>
      </div>

      {recentFiles.length > 0 && (
        <div style={{ width: 360 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--color-text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 8,
          }}>
            {t('landing.recentFiles')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {recentFiles.map((f) => {
              const ftLabel = findFlowType(f.flowType)?.label ?? f.flowType;
              const date = new Date(f.openedAt).toLocaleDateString(locale);
              return (
                <div
                  key={f.path}
                  onClick={() => handleOpenRecent(f.path)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 13,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-background-secondary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15 }}>&#128196;</span>
                    <span>{f.name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{
                      fontSize: 10,
                      padding: '1px 6px',
                      borderRadius: 4,
                      background: 'var(--color-background-info)',
                      color: 'var(--color-text-info)',
                    }}>
                      {ftLabel}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{date}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showModal && <TypePickerModal onClose={() => setShowModal(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      <div style={{ marginTop: 40, display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button
          onClick={handleExport}
          disabled={exporting}
          style={{
            padding: '4px 12px', fontSize: 12,
            border: '0.5px solid var(--color-border-tertiary)',
            borderRadius: 6, background: 'var(--color-background-info)',
            color: 'var(--color-text-info)', cursor: exporting ? 'wait' : 'pointer',
          }}
        >
          {exporting ? '导出中...' : '导出运行时代码'}
        </button>
        <button
          onClick={() => setShowSettings(true)}
          style={{
            padding: '4px 12px', fontSize: 12,
            border: '0.5px solid var(--color-border-tertiary)',
            borderRadius: 6, background: 'transparent',
            color: 'var(--color-text-tertiary)', cursor: 'pointer',
          }}
        >
          &#9881; 设置
        </button>
      </div>
    </div>
  );
}
