import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { FlowNodeData } from '../../types';
import { useT } from '../../i18n';

function FlowNodeComponent({ data, selected }: NodeProps) {
  const { t } = useT();
  const d = data as unknown as FlowNodeData;
  const hasInput = d.nodeType !== 'flow_start';
  const hasOutput = d.nodeType !== 'flow_end';

  const isError = d.validationErrors.length > 0;
  const borderColor = isError ? '#E24B4A' : selected ? '#378ADD' : d.color;
  const borderWidth = selected || isError ? 2 : 1;

  return (
    <div
      style={{
        background: 'var(--color-background-primary)',
        border: `${borderWidth}px solid ${borderColor}`,
        borderRadius: 8,
        minWidth: 140,
        maxWidth: 220,
        boxShadow: selected ? '0 0 0 1px rgba(55,138,221,0.3)' : undefined,
        opacity: d.disabled ? 0.45 : 1,
      }}
    >
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          id="flow_in"
          style={{
            background: '#888780',
            width: 8,
            height: 8,
            border: 'none',
          }}
        />
      )}

      <div style={{
        padding: '6px 10px',
        borderBottom: '0.5px solid var(--color-border-tertiary)',
      }}>
        <div style={{
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--color-text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: 2, background: d.color, display: 'inline-block', flexShrink: 0 }} />
          {d.label}
        </div>
      </div>

      <div style={{ padding: '4px 10px 6px' }}>
        {Object.entries(d.params).slice(0, 3).map(([key, val]) => (
          <div key={key} style={{
            fontSize: 10,
            color: 'var(--color-text-secondary)',
            lineHeight: 1.6,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {key}: {val.source === 'param' ? `$(${val.value})` : String(val.value).slice(0, 20)}
          </div>
        ))}
        {Object.keys(d.params).length > 3 && (
          <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
            {t('flowNode.more', { count: Object.keys(d.params).length - 3 })}
          </div>
        )}
        {d.writes && d.writes.length > 0 && (
          <div style={{
            fontSize: 9,
            color: 'var(--color-border-info)',
            marginTop: 3,
            borderTop: '0.5px solid var(--color-border-tertiary)',
            paddingTop: 3,
          }}>
            {t('flowNode.writes')}{d.writes.map((w) => w.key).join(', ')}
          </div>
        )}
      </div>

      {hasOutput && (
        <Handle
          type="source"
          position={Position.Right}
          id="flow_out"
          style={{
            background: '#888780',
            width: 8,
            height: 8,
            border: 'none',
          }}
        />
      )}

      {d.nodeType === 'branch_choice' && (
        <>
          <Handle type="source" position={Position.Right} id="choice_a" style={{ top: '55%', background: '#888780', width: 7, height: 7, border: 'none' }} />
          <Handle type="source" position={Position.Right} id="choice_b" style={{ top: '70%', background: '#888780', width: 7, height: 7, border: 'none' }} />
          <Handle type="source" position={Position.Right} id="choice_c" style={{ top: '85%', background: '#888780', width: 7, height: 7, border: 'none' }} />
        </>
      )}

      {d.nodeType === 'condition' && (
        <>
          <Handle type="source" position={Position.Right} id="flow_true" style={{ top: '55%', background: '#639922', width: 7, height: 7, border: 'none' }} />
          <Handle type="source" position={Position.Right} id="flow_false" style={{ top: '75%', background: '#E24B4A', width: 7, height: 7, border: 'none' }} />
        </>
      )}
    </div>
  );
}

export default memo(FlowNodeComponent);
