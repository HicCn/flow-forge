import { useState } from 'react';
import { useConfigStore } from '../../store/configStore';
import type { FlowType } from '../../types';

export default function TypeManagerModal({ onClose }: { onClose: () => void }) {
  const getFlowTypes = useConfigStore((s) => s.getFlowTypes);
  const addFlowType = useConfigStore((s) => s.addFlowType);
  const updateFlowType = useConfigStore((s) => s.updateFlowType);
  const setFlowTypeStatus = useConfigStore((s) => s.setFlowTypeStatus);
  const deleteFlowType = useConfigStore((s) => s.deleteFlowType);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const flowTypes = getFlowTypes();

  const startEdit = (ft: FlowType) => {
    setEditingId(ft.id);
    setEditLabel(ft.label);
    setEditDesc(ft.description);
  };

  const saveEdit = () => {
    if (!editingId || !editLabel.trim()) return;
    updateFlowType(editingId, { label: editLabel.trim(), description: editDesc.trim() });
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!newLabel.trim()) return;
    addFlowType(newLabel.trim(), newDesc.trim());
    setNewLabel('');
    setNewDesc('');
    setShowAdd(false);
  };

  const statusBadge = (ft: FlowType) => {
    if (ft.status === 'deprecated') {
      return (
        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'var(--color-background-warning)', color: 'var(--color-text-warning)' }}>
          已弃用
        </span>
      );
    }
    return null;
  };

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
          borderRadius: 12, padding: 24, minWidth: 480, maxWidth: 560,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          maxHeight: '80vh', overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)' }}>管理流程类型</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
              弃用的类型仍可打开已有文件，但不可用于新建
            </div>
          </div>
          <button
            onClick={() => { setShowAdd(true); setEditingId(null); }}
            style={{
              padding: '5px 12px', fontSize: 12, fontWeight: 500,
              border: 'none', borderRadius: 6, background: '#378ADD', color: '#fff', cursor: 'pointer',
            }}
          >
            + 新建类型
          </button>
        </div>

        {/* Add form */}
        {showAdd && (
          <div style={{ marginBottom: 12, padding: 12, borderRadius: 8, background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)' }}>
            <input
              placeholder="类型名称" value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              style={{ display: 'block', width: '100%', marginBottom: 6, padding: '4px 8px', fontSize: 12, border: '0.5px solid var(--color-border-tertiary)', borderRadius: 4, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }}
            />
            <input
              placeholder="描述（可选）" value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              style={{ display: 'block', width: '100%', marginBottom: 8, padding: '4px 8px', fontSize: 12, border: '0.5px solid var(--color-border-tertiary)', borderRadius: 4, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }}
            />
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAdd(false)} style={smallBtn()}>取消</button>
              <button onClick={handleAdd} style={smallBtn('#378ADD', '#fff')}>创建</button>
            </div>
          </div>
        )}

        {/* List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {flowTypes.map((ft) => {
            const isBuiltin = ft.builtin;
            const isEditing = editingId === ft.id;

            if (isEditing) {
              return (
                <div key={ft.id} style={rowStyle(ft)}>
                  <div style={{ flex: 1 }}>
                    <input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      style={inputStyle()}
                      placeholder="名称"
                    />
                    <input
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      style={{ ...inputStyle(), marginTop: 4 }}
                      placeholder="描述"
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => setEditingId(null)} style={smallBtn()}>取消</button>
                    <button onClick={saveEdit} style={smallBtn('#378ADD', '#fff')}>保存</button>
                  </div>
                </div>
              );
            }

            return (
              <div key={ft.id} style={rowStyle(ft)}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: ft.status === 'deprecated' ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)' }}>
                      {ft.label}
                      {isBuiltin && <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginLeft: 6 }}>内置</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 1 }}>{ft.description}</div>
                  </div>
                  {statusBadge(ft)}
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {!isBuiltin && (
                    <>
                      <button onClick={() => startEdit(ft)} style={smallBtn()}>编辑</button>
                      {ft.status === 'active' ? (
                        <button
                          onClick={() => setFlowTypeStatus(ft.id, 'deprecated')}
                          style={smallBtn(undefined, undefined, true)}
                          title="标记为弃用"
                        >
                          弃用
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => setFlowTypeStatus(ft.id, 'active')}
                            style={smallBtn('#639922', '#fff')}
                          >
                            启用
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`确定删除类型 "${ft.label}"？\n\n删除后无法恢复。`)) {
                                deleteFlowType(ft.id);
                              }
                            }}
                            style={smallBtn('#E24B4A', '#fff')}
                          >
                            删除
                          </button>
                        </>
                      )}
                    </>
                  )}
                  {isBuiltin && ft.status === 'active' && (
                    <button
                      onClick={() => setFlowTypeStatus(ft.id, 'deprecated')}
                      style={smallBtn(undefined, undefined, true)}
                      title="内置类型仅可弃用，不可编辑或删除"
                    >
                      弃用
                    </button>
                  )}
                  {isBuiltin && ft.status === 'deprecated' && (
                    <button
                      onClick={() => setFlowTypeStatus(ft.id, 'active')}
                      style={smallBtn('#639922', '#fff')}
                    >
                      启用
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──

function rowStyle(ft: FlowType) {
  return {
    padding: '10px 12px',
    borderRadius: 8,
    border: `0.5px solid var(--color-border-${ft.status === 'deprecated' ? 'warning' : 'tertiary'})`,
    background: ft.status === 'deprecated' ? 'var(--color-background-warning)' : 'var(--color-background-secondary)',
    display: 'flex',
    gap: 12,
    alignItems: 'center',
  };
}

function smallBtn(bg?: string, color?: string, warning?: boolean) {
  return {
    padding: '3px 10px',
    fontSize: 11,
    fontWeight: 500 as const,
    border: '0.5px solid var(--color-border-tertiary)',
    borderRadius: 4,
    background: bg || 'transparent',
    color: color || (warning ? 'var(--color-text-warning)' : 'var(--color-text-primary)'),
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  };
}

function inputStyle() {
  return {
    display: 'block' as const,
    width: '100%',
    padding: '3px 6px',
    fontSize: 12,
    border: '0.5px solid var(--color-border-tertiary)',
    borderRadius: 4,
    background: 'var(--color-background-primary)',
    color: 'var(--color-text-primary)',
    outline: 'none',
  };
}
