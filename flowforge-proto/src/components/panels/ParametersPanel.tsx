import { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import type { FlowParameter } from '../../types';
import { useT } from '../../i18n';

const typeLabel: Record<string, string> = {
  string: 's', number: 'n', float: 'f', boolean: 'b', enum: 'e', text: 't',
};

export default function ParametersPanel() {
  const { t } = useT();
  const parameters = useEditorStore((s) => s.parameters);
  const addParameter = useEditorStore((s) => s.addParameter);
  const removeParameter = useEditorStore((s) => s.removeParameter);
  const updateParameter = useEditorStore((s) => s.updateParameter);
  const [collapsed, setCollapsed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newType, setNewType] = useState<string>('string');

  const handleAdd = () => {
    if (!newKey.trim()) return;
    const param: FlowParameter = {
      key: newKey.trim(),
      type: newType as FlowParameter['type'],
      default: '',
      source: 'flow_input',
    };
    addParameter(param);
    setNewKey('');
    setAdding(false);
  };

  if (collapsed) {
    return (
      <div
        onClick={() => setCollapsed(false)}
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 5,
          background: 'var(--color-background-primary)',
          border: '0.5px solid var(--color-border-tertiary)',
          borderRadius: 6,
          padding: '4px 8px',
          fontSize: 11,
          color: 'var(--color-text-secondary)',
          cursor: 'pointer',
        }}
        title={t('parametersPanel.expand')}
      >
        {t('parametersPanel.params', { count: parameters.length })}
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        left: 12,
        zIndex: 5,
        background: 'var(--color-background-primary)',
        border: '0.5px solid var(--color-border-tertiary)',
        borderRadius: 8,
        padding: '6px 10px 8px',
        minWidth: 140,
        maxWidth: 200,
        fontSize: 11,
        color: 'var(--color-text-primary)',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
        paddingBottom: 4,
        borderBottom: '0.5px solid var(--color-border-tertiary)',
      }}>
        <span style={{ fontWeight: 500, fontSize: 11 }}>{t('parametersPanel.title')}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setAdding(!adding)}
            style={{
              border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 13, color: 'var(--color-text-tertiary)', padding: 0, lineHeight: 1,
            }}
            title={t('parametersPanel.add')}
          >
            +
          </button>
          <button
            onClick={() => setCollapsed(true)}
            style={{
              border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 11, color: 'var(--color-text-tertiary)', padding: 0, lineHeight: 1,
            }}
            title={t('parametersPanel.collapse')}
          >
            -
          </button>
        </div>
      </div>

      {adding && (
        <div style={{ marginBottom: 4, display: 'flex', gap: 4, alignItems: 'center' }}>
          <input
            type="text"
            placeholder={t('parametersPanel.key')}
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            style={{
              width: 50, fontSize: 11, padding: '2px 4px',
              border: '0.5px solid var(--color-border-tertiary)',
              borderRadius: 3, background: 'var(--color-background-secondary)',
              color: 'var(--color-text-primary)', outline: 'none',
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            style={{
              width: 50, fontSize: 11, padding: '2px 4px',
              border: '0.5px solid var(--color-border-tertiary)',
              borderRadius: 3, background: 'var(--color-background-secondary)',
              color: 'var(--color-text-primary)', outline: 'none',
            }}
          >
            <option value="string">string</option>
            <option value="number">number</option>
            <option value="float">float</option>
            <option value="boolean">boolean</option>
            <option value="enum">enum</option>
          </select>
          <button
            onClick={handleAdd}
            style={{
              border: '0.5px solid var(--color-border-info)',
              borderRadius: 3, background: 'transparent', cursor: 'pointer',
              fontSize: 11, padding: '1px 4px', color: 'var(--color-text-info)',
            }}
          >
            {t('parametersPanel.ok')}
          </button>
        </div>
      )}

      {parameters.map((p) => (
        <div
          key={p.key}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '2px 0',
            fontSize: 11,
            gap: 4,
          }}
        >
          <label
            title={t('parametersPanel.markAsInput')}
            style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <input
              type="checkbox"
              checked={p.isInput ?? false}
              onChange={(e) => updateParameter(p.key, { isInput: e.target.checked })}
              style={{ width: 10, height: 10, margin: 0, cursor: 'pointer' }}
            />
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, overflow: 'hidden' }}>
            <span style={{
              fontSize: 9,
              background: p.isInput ? 'var(--color-background-warning)' : 'var(--color-background-info)',
              color: p.isInput ? 'var(--color-text-warning)' : 'var(--color-text-info)',
              padding: '0 3px',
              borderRadius: 2,
              fontWeight: 500,
              flexShrink: 0,
            }}>
              {p.isInput ? 'in' : typeLabel[p.type] ?? p.type}
            </span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.key}
            </span>
          </div>
          <button
            onClick={() => removeParameter(p.key)}
            style={{
              border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 11, color: 'var(--color-text-tertiary)', padding: 0,
              flexShrink: 0,
            }}
            title={t('parametersPanel.remove')}
          >
            x
          </button>
        </div>
      ))}
      {parameters.length === 0 && !adding && (
        <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', textAlign: 'center', padding: '4px 0' }}>
          {t('parametersPanel.noParams')}
        </div>
      )}
    </div>
  );
}
