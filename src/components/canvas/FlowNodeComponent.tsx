import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { FlowNodeData } from '../../types';
import { useConfigStore } from '../../store/configStore';
import { useEditorMetaStore } from '../../store/editorMetaStore';
import { useT } from '../../i18n';

function FlowNodeComponent({ data, selected, id: nodeId }: any) {
  const { t } = useT();
  const d = data as unknown as FlowNodeData;
  const comment = useEditorMetaStore((s) => s.comments[nodeId] ?? '');
  // Subscribe to customNodeDefs for reactivity when definitions are edited,
  // then call getNodeDefs() (stable function ref) to get merged builtin+custom.
  const customNodeDefs = useConfigStore((s) => s.customNodeDefs);
  const getNodeDefs = useConfigStore((s) => s.getNodeDefs);
  const def = getNodeDefs().find((nd) => nd.type === d.nodeType);
  const pins = def?.pins ?? { inputs: [], outputs: [] };

  const isError = d.validationErrors.length > 0;
  const borderColor = isError ? '#E24B4A' : selected ? '#378ADD' : d.color;
  const borderWidth = selected || isError ? 2 : 1;

  const inputCount = pins.inputs.length;
  const outputCount = pins.outputs.length;

  return (
    <div
      style={{
        background: selected ? 'rgba(55,138,221,0.06)' : 'var(--color-background-primary)',
        border: `${borderWidth}px solid ${borderColor}`,
        borderRadius: 8,
        minWidth: 140,
        maxWidth: 220,
        boxShadow: selected ? '0 0 0 1.5px #378ADD' : undefined,
        opacity: d.disabled ? 0.45 : 1,
        position: 'relative',
      }}
    >
      {/* ── Input handles + labels (outside, left) ── */}
      {pins.inputs.map((pin, i) => {
        const topPct = inputCount === 1 ? 50 : (100 / (1 + inputCount)) * (inputCount - i);
        return (
          <React.Fragment key={pin.id}>
            <Handle
              type="target"
              position={Position.Left}
              id={pin.id}
              style={{
                background: '#888780',
                width: 8, height: 8,
                border: 'none',
                top: `${topPct}%`,
              }}
            />
            {pin.label && (
              <span style={{
                position: 'absolute',
                left: -6,
                top: `${topPct}%`,
                transform: 'translate(-100%, -50%)',
                fontSize: 9, fontWeight: 500,
                color: 'var(--color-text-tertiary)',
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                paddingRight: 2,
              }}>{pin.label}</span>
            )}
          </React.Fragment>
        );
      })}

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
        {/* flow_call node: show target flow file */}
        {d.nodeType === 'flow_call' && (
          <div style={{
            fontSize: 9,
            color: 'var(--color-text-info)',
            marginBottom: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {String(d.params?.target_flow?.value || d.params?.target_flow || '?')}
          </div>
        )}
        {d.nodeType !== 'flow_call' && Object.entries(d.params).slice(0, 3).map(([key, val]) => (
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
        {d.nodeType !== 'flow_call' && Object.keys(d.params).length > 3 && (
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
        {comment && (
          <div style={{
            fontSize: 9,
            color: 'var(--color-text-tertiary)',
            fontStyle: 'italic',
            marginTop: 2,
            borderTop: '0.5px solid var(--color-border-tertiary)',
            paddingTop: 2,
            maxWidth: 200,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {comment}
          </div>
        )}
      </div>

      {/* ── Output handles + labels (outside, right) ── */}
      {pins.outputs.map((pin, i) => {
        const topPct = outputCount === 1 ? 50 : (100 / (1 + outputCount)) * (outputCount - i);
        return (
          <React.Fragment key={pin.id}>
            <Handle
              type="source"
              position={Position.Right}
              id={pin.id}
              style={{
                background: '#888780',
                width: 8, height: 8,
                border: 'none',
                top: `${topPct}%`,
              }}
            />
            {pin.label && (
              <span style={{
                position: 'absolute',
                right: -6,
                top: `${topPct}%`,
                transform: 'translate(100%, -50%)',
                fontSize: 9, fontWeight: 500,
                color: 'var(--color-text-tertiary)',
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                paddingLeft: 2,
              }}>{pin.label}</span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default FlowNodeComponent;
