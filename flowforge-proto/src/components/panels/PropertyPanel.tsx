import { useEditorStore } from '../../store/editorStore';
import type { ParamValue, ParamDefinition, FlowParameter } from '../../types';
import { useT } from '../../i18n';

export default function PropertyPanel() {
  const { t } = useT();
  const nodes = useEditorStore((s) => s.nodes);
  const selectedNodeIds = useEditorStore((s) => s.selectedNodeIds);
  const parameters = useEditorStore((s) => s.parameters);
  const nodeDefinitions = useEditorStore((s) => s.nodeDefinitions);
  const updateNodeParam = useEditorStore((s) => s.updateNodeParam);
  const [collapsed, setCollapsed] = useState(false);

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

  const def = nodeDefinitions.find((d) => d.type === node.data.nodeType);
  const params = def?.params ?? [];

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
        {params.length === 0 && (
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

import { useState } from 'react';

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

      {paramDef.source === 'param_or_fixed' && (
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
      )}

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
