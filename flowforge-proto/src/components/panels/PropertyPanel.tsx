import { useEditorStore } from '../../store/editorStore';
import { useConfigStore } from '../../store/configStore';
import type { ParamValue, ParamDefinition, FlowParameter } from '../../types';
import { useT } from '../../i18n';
import { useState, useEffect, useCallback } from 'react';
import { loadFile } from '../../api/fileApi';

export default function PropertyPanel() {
  const { t } = useT();
  const nodes = useEditorStore((s) => s.nodes);
  const selectedNodeIds = useEditorStore((s) => s.selectedNodeIds);
  const parameters = useEditorStore((s) => s.parameters);
  const getNodeDefs = useConfigStore((s) => s.getNodeDefs);
  const customNodeDefs = useConfigStore((s) => s.customNodeDefs);
  const updateNodeParam = useEditorStore((s) => s.updateNodeParam);
  const tabs = useEditorStore((s) => s.tabs);
  const openTab = useEditorStore((s) => s.openTab);
  const switchTab = useEditorStore((s) => s.switchTab);
  const [collapsed, setCollapsed] = useState(false);
  const [flowInterface, setFlowInterface] = useState<FlowParameter[] | null>(null);
  const [interfaceLoading, setInterfaceLoading] = useState(false);

  const resolveFlowInterface = useCallback(async (path: string) => {
    if (!path) { setFlowInterface(null); return; }
    setInterfaceLoading(true);
    try {
      const existingTab = tabs.find((tb) => tb.filePath === path);
      if (existingTab) {
        const inputs = existingTab.parameters.filter((p) => p.isInput);
        setFlowInterface(inputs);
        setInterfaceLoading(false);
        return;
      }
      const result = await loadFile(path);
      if (result?.content) {
        const doc = JSON.parse(result.content);
        const inputs = (doc.parameters as FlowParameter[]).filter((p) => p.isInput);
        setFlowInterface(inputs);
      } else {
        setFlowInterface(null);
      }
    } catch {
      setFlowInterface(null);
    } finally {
      setInterfaceLoading(false);
    }
  }, [tabs]);

  // Resolve target flow interface params when selection changes
  useEffect(() => {
    if (selectedNodeIds.length === 1) {
      const n = nodes.find((nd) => nd.id === selectedNodeIds[0]);
      const isFC = n?.data?.nodeType === 'flow_call';
      const tf = isFC ? String(n?.data?.params?.target_flow?.value ?? '') : '';
      if (isFC && tf) {
        resolveFlowInterface(tf);
        return;
      }
    }
    setFlowInterface(null);
  }, [selectedNodeIds, nodes, resolveFlowInterface]);

  if (collapsed) {
    return (
      <div
        style={{
          width: 28,
          flexShrink: 0,
          borderLeft: '0.5px solid var(--color-border-tertiary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          background: 'var(--color-background-primary)',
        }}
        onClick={() => setCollapsed(false)}
        title={t('propertyPanel.expand')}
      >
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', writingMode: 'vertical-rl' }}>{t('propertyPanel.props')}</span>
      </div>
    );
  }

  if (selectedNodeIds.length !== 1) {
    return (
      <div style={{
        width: 180,
        flexShrink: 0,
        borderLeft: '0.5px solid var(--color-border-tertiary)',
        background: 'var(--color-background-primary)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{
          padding: '6px 8px',
          borderBottom: '0.5px solid var(--color-border-tertiary)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-primary)' }}>{t('propertyPanel.title')}</span>
          <button onClick={() => setCollapsed(true)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 11, color: 'var(--color-text-tertiary)', padding: 0 }}>▶</button>
        </div>
        <div style={{ padding: '16px 8px', fontSize: 11, color: 'var(--color-text-tertiary)', textAlign: 'center' }}>
          {selectedNodeIds.length === 0 ? t('propertyPanel.clickToEdit') : t('propertyPanel.nodesSelected', { count: selectedNodeIds.length })}
        </div>
      </div>
    );
  }

  const nodeId = selectedNodeIds[0];
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return null;

  const def = getNodeDefs().find((d) => d.type === node.data.nodeType);
  const params = def?.params ?? [];
  const isFlowCall = node.data.nodeType === 'flow_call';
  const targetFlow = isFlowCall ? String(node.data.params?.target_flow?.value ?? '') : '';

  return (
    <div style={{
      width: 180,
      flexShrink: 0,
      borderLeft: '0.5px solid var(--color-border-tertiary)',
      background: 'var(--color-background-primary)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '6px 8px',
        borderBottom: '0.5px solid var(--color-border-tertiary)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-primary)' }}>{t('propertyPanel.title')}</span>
        <button onClick={() => setCollapsed(true)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 11, color: 'var(--color-text-tertiary)', padding: 0 }}>▶</button>
      </div>

      <div style={{ padding: '8px', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: 2, background: node.data.color, display: 'inline-block' }} />
          {node.data.label}
        </div>
        <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 2 }}>{node.data.nodeType}</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
        {params.map((p) => (
          <ParamEditor
            key={p.key}
            paramDef={p}
            value={node.data.params[p.key]}
            parameters={parameters}
            onChange={(val) => updateNodeParam(node.id, p.key, val)}
          />
        ))}

        {/* ── flow_call: interface params from target flow ── */}
        {isFlowCall && (
          <div style={{ borderTop: '0.5px solid var(--color-border-tertiary)', marginTop: 4, paddingTop: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
              {t('propertyPanel.targetInterface')}
            </div>
            {targetFlow && (
              <button
                onClick={async () => {
                  // Try existing tab first
                  const existingTab = tabs.find((tb) => tb.filePath === targetFlow);
                  if (existingTab) {
                    switchTab(existingTab.id);
                  } else {
                  try {
                    const result = await loadFile(targetFlow);
                    if (result?.content) {
                      const doc = JSON.parse(result.content);
                      const parsedParams: FlowParameter[] = (doc.parameters || []).map((p: Record<string, unknown>) => ({
                        key: String(p.key ?? ''),
                        type: (p.type as FlowParameter['type']) || 'string',
                        default: p.default ?? '',
                        source: (p.source as FlowParameter['source']) || 'flow_input',
                        isInput: Boolean(p.isInput),
                      }));
                      const parsedNodes = (doc.nodes as Array<Record<string, unknown>> || []).map((n) => ({
                        id: String(n.id ?? crypto.randomUUID()),
                        type: 'flowNode' as const,
                        position: { x: Number((n.position as Record<string, number>)?.x ?? 0), y: Number((n.position as Record<string, number>)?.y ?? 0) },
                        data: {
                          nodeType: String(n.type ?? ''),
                          label: String(n.type ?? ''),
                          category: '',
                          color: '#888',
                          params: (n.params as Record<string, ParamValue>) || {},
                          disabled: Boolean(n.disabled),
                          validationErrors: [],
                        },
                      }));
                      openTab({
                        filePath: targetFlow,
                        title: targetFlow.replace(/^.*[\\/]/, '').replace(/\.flow(\.json)?$/, ''),
                        flowType: null,
                        nodes: parsedNodes.length > 0 ? parsedNodes : [],
                        edges: [],
                        parameters: parsedParams,
                      });
                    }
                  } catch { /* file not found */ }
                  }
                }}
                style={{
                  width: '100%', fontSize: 10, padding: '3px 6px', marginBottom: 6,
                  border: '0.5px solid var(--color-border-info)', borderRadius: 4,
                  background: 'transparent', cursor: 'pointer',
                  color: 'var(--color-text-info)',
                }}
              >
                {t('propertyPanel.openTargetFlow')}
              </button>
            )}
            {interfaceLoading && (
              <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>{t('propertyPanel.loading')}</div>
            )}
            {!interfaceLoading && flowInterface && flowInterface.length > 0 && (
              flowInterface.map((fp) => {
                const currentVal = node.data.params[fp.key];
                return (
                  <div key={fp.key} style={{ marginBottom: 6 }}>
                    <label style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 2 }}>
                      {fp.key}
                      <span style={{ fontSize: 9, color: 'var(--color-text-warning)', marginLeft: 4 }}>in</span>
                    </label>
                    <input
                      type="text"
                      value={currentVal ? String(currentVal.value ?? '') : String(fp.default ?? '')}
                      onChange={(e) => {
                        const newVal: ParamValue = currentVal && currentVal.source === 'param'
                          ? { source: 'fixed', value: e.target.value }
                          : { source: 'fixed', value: e.target.value };
                        updateNodeParam(node.id, fp.key, newVal);
                      }}
                      placeholder={t('propertyPanel.enterValue')}
                      style={{
                        width: '100%', fontSize: 11, padding: '3px 4px',
                        border: '0.5px solid var(--color-border-tertiary)',
                        borderRadius: 4, background: 'var(--color-background-secondary)',
                        color: 'var(--color-text-primary)', outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    <div style={{ fontSize: 9, color: 'var(--color-text-tertiary)' }}>{fp.type}</div>
                  </div>
                );
              })
            )}
            {!interfaceLoading && flowInterface !== null && flowInterface.length === 0 && (
              <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
                {t('propertyPanel.noInputParams')}
              </div>
            )}
          </div>
        )}

        {params.length === 0 && !isFlowCall && (
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', textAlign: 'center', padding: 8 }}>
            {t('propertyPanel.noParams')}
          </div>
        )}
      </div>

      {node.data.writes && node.data.writes.length > 0 && (
        <div style={{ borderTop: '0.5px solid var(--color-border-tertiary)', padding: '6px 8px' }}>
          <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', marginBottom: 3 }}>{t('propertyPanel.writesTo')}</div>
          {node.data.writes.map((w) => (
            <div key={w.key} style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>
              {w.key} ({w.type})
            </div>
          ))}
        </div>
      )}

      <div style={{ borderTop: '0.5px solid var(--color-border-tertiary)', padding: '6px 8px' }}>
        <div style={{ fontSize: 9, color: 'var(--color-text-tertiary)' }}>{t('propertyPanel.nodeId')}{node.id.slice(0, 8)}...</div>
      </div>
    </div>
  );
}

function ParamEditor({
  paramDef,
  value,
  parameters,
  onChange,
}: {
  paramDef: ParamDefinition;
  value: ParamValue;
  parameters: FlowParameter[];
  onChange: (val: ParamValue) => void;
}) {
  const { t } = useT();
  const isFixed = value.source === 'fixed';
  const compatibleParams = parameters.filter((p) => isTypeCompatible(p.type, paramDef.type));

  return (
    <div style={{ marginBottom: 8 }}>
      <label style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 2 }}>
        {paramDef.label}
        {paramDef.required && <span style={{ color: '#E24B4A' }}> *</span>}
      </label>

      <div style={{ display: 'flex', gap: 3, marginBottom: 3 }}>
        <button
          onClick={() => onChange({ source: 'fixed', value: paramDef.default })}
          style={{
            flex: 1, fontSize: 9, padding: '1px 4px',
            border: `0.5px solid ${isFixed ? 'var(--color-border-info)' : 'var(--color-border-tertiary)'}`,
            borderRadius: 3, background: isFixed ? 'var(--color-background-info)' : 'transparent',
            cursor: 'pointer', color: isFixed ? 'var(--color-text-info)' : 'var(--color-text-tertiary)',
          }}
        >
          {t('propertyPanel.fixed')}
        </button>
        <button
          onClick={() => onChange({ source: 'param', value: compatibleParams[0]?.key ?? '' })}
          style={{
            flex: 1, fontSize: 9, padding: '1px 4px',
            border: `0.5px solid ${!isFixed ? 'var(--color-border-info)' : 'var(--color-border-tertiary)'}`,
            borderRadius: 3, background: !isFixed ? 'var(--color-background-info)' : 'transparent',
            cursor: 'pointer', color: !isFixed ? 'var(--color-text-info)' : 'var(--color-text-tertiary)',
          }}
        >
          {t('propertyPanel.param')}
        </button>
      </div>

      {isFixed ? (
        renderFixedInput(paramDef, value.value, t, (v) => onChange({ source: 'fixed', value: v }))
      ) : (
        <div>
          <select
            value={String(value.value)}
            onChange={(e) => onChange({ source: 'param', value: e.target.value })}
            style={{
              width: '100%', fontSize: 11, padding: '3px 4px',
              border: '0.5px solid var(--color-border-tertiary)',
              borderRadius: 4, background: 'var(--color-background-secondary)',
              color: 'var(--color-text-primary)', outline: 'none',
            }}
          >
            <option value="">{t('propertyPanel.selectParam')}</option>
            {compatibleParams.map((p) => (
              <option key={p.key} value={p.key}>
                {p.key} ({p.type})
              </option>
            ))}
          </select>
        </div>
      )}

      {paramDef.description && (
        <div style={{ fontSize: 9, color: 'var(--color-text-tertiary)', marginTop: 1 }}>
          {paramDef.description}
        </div>
      )}
    </div>
  );
}

function renderFixedInput(
  def: ParamDefinition,
  value: unknown,
  t: ReturnType<typeof useT>['t'],
  onChange: (val: unknown) => void
) {
  switch (def.type) {
    case 'string':
      return (
        <input
          type="text"
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder={def.placeholder}
          style={{
            width: '100%', fontSize: 11, padding: '3px 4px',
            border: '0.5px solid var(--color-border-tertiary)',
            borderRadius: 4, background: 'var(--color-background-secondary)',
            color: 'var(--color-text-primary)', outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      );
    case 'text':
      return (
        <textarea
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder={def.placeholder}
          rows={3}
          style={{
            width: '100%', fontSize: 11, padding: '3px 4px',
            border: '0.5px solid var(--color-border-tertiary)',
            borderRadius: 4, background: 'var(--color-background-secondary)',
            color: 'var(--color-text-primary)', outline: 'none',
            resize: 'vertical', boxSizing: 'border-box',
          }}
        />
      );
    case 'number':
      return (
        <input
          type="number"
          value={Number(value ?? 0)}
          onChange={(e) => onChange(Number(e.target.value))}
          min={def.min}
          max={def.max}
          style={{
            width: '100%', fontSize: 11, padding: '3px 4px',
            border: '0.5px solid var(--color-border-tertiary)',
            borderRadius: 4, background: 'var(--color-background-secondary)',
            color: 'var(--color-text-primary)', outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      );
    case 'float':
      return (
        <input
          type="number"
          step="0.1"
          value={Number(value ?? 0)}
          onChange={(e) => onChange(Number(e.target.value))}
          min={def.min}
          max={def.max}
          style={{
            width: '100%', fontSize: 11, padding: '3px 4px',
            border: '0.5px solid var(--color-border-tertiary)',
            borderRadius: 4, background: 'var(--color-background-secondary)',
            color: 'var(--color-text-primary)', outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      );
    case 'boolean':
      return (
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
          {String(Boolean(value))}
        </label>
      );
    case 'enum':
      return (
        <select
          value={String(value ?? def.options?.[0] ?? '')}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%', fontSize: 11, padding: '3px 4px',
            border: '0.5px solid var(--color-border-tertiary)',
            borderRadius: 4, background: 'var(--color-background-secondary)',
            color: 'var(--color-text-primary)', outline: 'none',
            boxSizing: 'border-box',
          }}
        >
          {def.options?.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    default:
      return <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{t('propertyPanel.unsupportedType')}</span>;
  }
}

function isTypeCompatible(from: string, to: string): boolean {
  if (from === 'any' || to === 'any') return true;
  if (from === to) return true;
  if (from === 'number' && to === 'float') return true;
  if (from === 'enum' && to === 'string') return true;
  return false;
}
