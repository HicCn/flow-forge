import { useState } from 'react';
import type { FlowType } from '../../types';
import { useConfigStore } from '../../store/configStore';
import { useEditorStore } from '../../store/editorStore';
import { useAppStore } from '../../store/appStore';
import TypeManagerModal from './TypeManagerModal';

export default function TypePickerModal({ onClose }: { onClose: () => void }) {
  const getActiveFlowTypes = useConfigStore((s) => s.getActiveFlowTypes);
  const setFlowType = useEditorStore((s) => s.setFlowType);
  const setScreen = useAppStore((s) => s.setScreen);
  const [showManager, setShowManager] = useState(false);

  const activeTypes = getActiveFlowTypes();

  const handlePick = (ft: FlowType) => {
    setFlowType(ft);
    setScreen('editor');
    onClose();
  };

  if (showManager) {
    return <TypeManagerModal onClose={() => setShowManager(false)} />;
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--color-background-primary)',
          borderRadius: 12, padding: 24, minWidth: 400, maxWidth: 480,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-primary)' }}>
          新建流程
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 20 }}>
          选择流程类型以确定可用的节点
        </div>

        {activeTypes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--color-text-tertiary)', fontSize: 13 }}>
            暂无可用的流程类型
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeTypes.map((ft) => (
              <div
                key={ft.id}
                onClick={() => handlePick(ft)}
                style={{
                  padding: '12px 16px', borderRadius: 8,
                  border: '0.5px solid var(--color-border-tertiary)',
                  cursor: 'pointer',
                  background: 'var(--color-background-secondary)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-background-info)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-background-secondary)')}
              >
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 2 }}>
                  {ft.label}
                  {ft.builtin && <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginLeft: 6 }}>内置</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{ft.description}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{
          marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderTop: '0.5px solid var(--color-border-tertiary)', paddingTop: 12,
        }}>
          <button
            onClick={() => setShowManager(true)}
            style={{
              padding: '4px 12px', fontSize: 12,
              border: '0.5px solid var(--color-border-tertiary)',
              borderRadius: 6, background: 'transparent',
              color: 'var(--color-text-secondary)', cursor: 'pointer',
            }}
          >
            &#9881; 管理类型
          </button>
          <div
            onClick={onClose}
            style={{ fontSize: 12, color: 'var(--color-text-tertiary)', cursor: 'pointer' }}
          >
            取消
          </div>
        </div>
      </div>
    </div>
  );
}
