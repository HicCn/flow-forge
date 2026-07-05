import { useState, useEffect, useRef } from 'react';
import { useConfigStore } from '../../store/configStore';
import NodeEditModal from './NodeEditModal';
import type { FlowType, EnumType } from '../../types';

type Tab = 'flow' | 'node' | 'enum';

export default function TypeManagerModal({ onClose, initialTab = 'flow', initialNodeType }: {
  onClose: () => void;
  initialTab?: Tab;
  initialNodeType?: string;
}) {
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
          borderRadius: 12, padding: 24, minWidth: 520, maxWidth: 600,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <TabSwitcher initialTab={initialTab} initialNodeType={initialNodeType} onClose={onClose} />
      </div>
    </div>
  );
}

function TabSwitcher({ initialTab, initialNodeType, onClose }: {
  initialTab: Tab;
  initialNodeType?: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
        <button
          onClick={() => setTab('flow')}
          style={tabBtn(tab === 'flow')}
        >流程类型</button>
        <button
          onClick={() => setTab('node')}
          style={tabBtn(tab === 'node')}
        >节点类型</button>
        <button
          onClick={() => setTab('enum')}
          style={tabBtn(tab === 'enum')}
        >枚举类型</button>
      </div>

      {tab === 'flow' ? <FlowTypeTab /> : tab === 'node' ? <NodeTypeTab initialNodeType={initialNodeType} /> : <EnumTypeTab />}
    </div>
  );
}

// ── Tab: Flow Types ──

function FlowTypeTab() {
  const customFlowTypes = useConfigStore((s) => s.customFlowTypes);
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
  const [search, setSearch] = useState('');

  const flowTypes = getFlowTypes();
  const filtered = search
    ? flowTypes.filter((ft) => ft.label.toLowerCase().includes(search.toLowerCase()))
    : flowTypes;

  const startEdit = (ft: FlowType) => { setEditingId(ft.id); setEditLabel(ft.label); setEditDesc(ft.description); };
  const saveEdit = () => { if (!editingId || !editLabel.trim()) return; updateFlowType(editingId, { label: editLabel.trim(), description: editDesc.trim() }); setEditingId(null); };
  const handleAdd = () => { if (!newLabel.trim()) return; addFlowType(newLabel.trim(), newDesc.trim()); setNewLabel(''); setNewDesc(''); setShowAdd(false); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 }}>
          <input
            placeholder="搜索类型..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, padding: '4px 8px', fontSize: 12, border: '0.5px solid var(--color-border-tertiary)', borderRadius: 6, background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', outline: 'none' }}
          />
          <button onClick={() => { setShowAdd(true); setEditingId(null); }} style={primaryBtn()}>+ 新建类型</button>
        </div>

        {showAdd && (
          <div style={{ marginBottom: 12, padding: 12, borderRadius: 8, background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)' }}>
            <input placeholder="类型名称" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} style={inputStyle()} />
            <input placeholder="描述（可选）" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} style={{ ...inputStyle(), marginTop: 6 }} />
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={() => setShowAdd(false)} style={smallBtn()}>取消</button>
              <button onClick={handleAdd} style={smallBtn('#378ADD', '#fff')}>创建</button>
            </div>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.map((ft) => {
          if (editingId === ft.id) {
            return (
              <div key={ft.id} style={rowBase(ft.status === 'deprecated')}>
                <div style={{ flex: 1 }}>
                  <RowLabel>类型标识（不可修改）</RowLabel>
                  <div style={readonlyIdStyle()}>{ft.id}</div>
                  <RowLabel style={{ marginTop: 6 }}>显示名称</RowLabel>
                  <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} style={inputStyle()} />
                  <RowLabel style={{ marginTop: 6 }}>描述</RowLabel>
                  <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} style={inputStyle()} />
                </div>
                <div style={{ display: 'flex', gap: 4, alignSelf: 'flex-start', marginTop: 24 }}>
                  <button onClick={() => setEditingId(null)} style={smallBtn()}>取消</button>
                  <button onClick={saveEdit} style={smallBtn('#378ADD', '#fff')}>保存</button>
                </div>
              </div>
            );
          }

          return (
            <div key={ft.id} style={rowBase(ft.status === 'deprecated')}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: ft.status === 'deprecated' ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)' }}>
                  {ft.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 1 }}>
                  {ft.description}
                  <span style={{ color: 'var(--color-text-tertiary)', marginLeft: 8, fontFamily: 'var(--font-mono)', fontSize: 10 }}>{ft.id}</span>
                </div>
                {ft.status === 'deprecated' && <span style={{ fontSize: 10, color: 'var(--color-text-warning)' }}>已弃用</span>}
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <button onClick={() => startEdit(ft)} style={smallBtn()}>编辑</button>
                {ft.status === 'active' ? (
                  <button onClick={() => setFlowTypeStatus(ft.id, 'deprecated')} style={smallBtn(undefined, undefined, true)}>弃用</button>
                ) : (
                  <>
                    <button onClick={() => setFlowTypeStatus(ft.id, 'active')} style={smallBtn('#639922', '#fff')}>启用</button>
                    {!ft.builtin && <button onClick={() => { if (confirm('确定删除？')) deleteFlowType(ft.id); }} style={smallBtn('#E24B4A', '#fff')}>删除</button>}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tab: Enum Types ──

function EnumTypeTab() {
  const customEnumTypes = useConfigStore((s) => s.customEnumTypes);
  const addEnumType = useConfigStore((s) => s.addEnumType);
  const updateEnumType = useConfigStore((s) => s.updateEnumType);
  const deleteEnumType = useConfigStore((s) => s.deleteEnumType);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editValues, setEditValues] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newId, setNewId] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newValues, setNewValues] = useState('');
  const [search, setSearch] = useState('');

  const enumTypes = customEnumTypes;
  const filtered = search
    ? enumTypes.filter((e) => e.id.toLowerCase().includes(search.toLowerCase()) || e.label.toLowerCase().includes(search.toLowerCase()))
    : enumTypes;

  const startEdit = (et: EnumType) => {
    setEditingId(et.id);
    setEditLabel(et.label);
    setEditDesc(et.description);
    setEditValues(et.values.join(', '));
  };

  const saveEdit = () => {
    if (!editingId || !editLabel.trim()) return;
    updateEnumType(editingId, {
      label: editLabel.trim(),
      description: editDesc.trim(),
      values: editValues.split(',').map((v) => v.trim()).filter(Boolean),
    });
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!newId.trim() || !newLabel.trim()) return;
    addEnumType({
      id: newId.trim(),
      label: newLabel.trim(),
      description: '',
      values: newValues.split(',').map((v) => v.trim()).filter(Boolean),
      builtin: false,
    });
    setNewId(''); setNewLabel(''); setNewValues(''); setShowAdd(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 }}>
          <input
            placeholder="搜索枚举..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, padding: '4px 8px', fontSize: 12, border: '0.5px solid var(--color-border-tertiary)', borderRadius: 6, background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', outline: 'none' }}
          />
          <button onClick={() => { setShowAdd(true); setEditingId(null); }} style={primaryBtn()}>+ 新建枚举</button>
        </div>

        {showAdd && (
          <div style={{ marginBottom: 12, padding: 12, borderRadius: 8, background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)' }}>
            <RowLabel>枚举标识（程序使用，创建后不可修改）</RowLabel>
            <input placeholder="例: expression_type" value={newId} onChange={(e) => setNewId(e.target.value)} style={inputStyle()} />
            <RowLabel style={{ marginTop: 6 }}>显示名称</RowLabel>
            <input placeholder="例: 表情类型" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} style={inputStyle()} />
            <RowLabel style={{ marginTop: 6 }}>枚举值（逗号分隔）</RowLabel>
            <input placeholder="例: neutral, happy, angry, sad, surprised" value={newValues} onChange={(e) => setNewValues(e.target.value)} style={inputStyle()} />
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={() => setShowAdd(false)} style={smallBtn()}>取消</button>
              <button onClick={handleAdd} style={smallBtn('#378ADD', '#fff')}>创建</button>
            </div>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.map((et) => {
          if (editingId === et.id) {
            return (
              <div key={et.id} style={rowBase(false)}>
                <div style={{ flex: 1 }}>
                  <RowLabel>枚举标识（不可修改）</RowLabel>
                  <div style={readonlyIdStyle()}>{et.id}</div>
                  <RowLabel style={{ marginTop: 6 }}>显示名称</RowLabel>
                  <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} style={inputStyle()} />
                  <RowLabel style={{ marginTop: 6 }}>描述</RowLabel>
                  <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} style={inputStyle()} />
                  <RowLabel style={{ marginTop: 6 }}>枚举值（逗号分隔）</RowLabel>
                  <input value={editValues} onChange={(e) => setEditValues(e.target.value)} style={inputStyle()} />
                </div>
                <div style={{ display: 'flex', gap: 4, alignSelf: 'flex-start', marginTop: 24 }}>
                  <button onClick={() => setEditingId(null)} style={smallBtn()}>取消</button>
                  <button onClick={saveEdit} style={smallBtn('#378ADD', '#fff')}>保存</button>
                </div>
              </div>
            );
          }

          return (
            <div key={et.id} style={rowBase(false)}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                  {et.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 1 }}>
                  <span style={{ color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: 10, marginRight: 8 }}>{et.id}</span>
                  {et.description}
                </div>
                <div style={{ display: 'flex', gap: 3, marginTop: 4, flexWrap: 'wrap' }}>
                  {et.values.map((v) => (
                    <span key={v} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'var(--color-background-info)', color: 'var(--color-text-info)' }}>
                      {v}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => startEdit(et)} style={smallBtn()}>编辑</button>
                <button onClick={() => { if (confirm('确定删除？')) deleteEnumType(et.id); }} style={smallBtn('#E24B4A', '#fff')}>删除</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tab: Node Types ──

function NodeTypeTab({ initialNodeType }: { initialNodeType?: string }) {
  const customNodeDefs = useConfigStore((s) => s.customNodeDefs);  // subscribe for reactivity
  const getNodeDefs = useConfigStore((s) => s.getNodeDefs);
  const deleteNodeDef = useConfigStore((s) => s.deleteNodeDef);
  const getActiveFlowTypes = useConfigStore((s) => s.getActiveFlowTypes);

  const [search, setSearch] = useState('');
  const [editNodeType, setEditNodeType] = useState<string | null>(initialNodeType ?? null);
  const [showCreate, setShowCreate] = useState(false);

  const nodeDefs = getNodeDefs();
  const flowTypes = getActiveFlowTypes();
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = search
    ? nodeDefs.filter((n) => n.label.toLowerCase().includes(search.toLowerCase()) || n.type.toLowerCase().includes(search.toLowerCase()))
    : nodeDefs;

  // Scroll to target node on initial open
  useEffect(() => {
    if (initialNodeType && listRef.current) {
      const el = document.getElementById(`node-row-${initialNodeType}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [initialNodeType]);

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <div style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 }}>
            <input placeholder="搜索节点..." value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, padding: '4px 8px', fontSize: 12, border: '0.5px solid var(--color-border-tertiary)', borderRadius: 6, background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', outline: 'none' }} />
            <button onClick={() => { setShowCreate(true); setEditNodeType(null); }} style={primaryBtn()}>+ 新建节点</button>
          </div>
        </div>

        <div ref={listRef} style={{ flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map((nd) => (
            <div key={nd.type} id={`node-row-${nd.type}`} style={rowBase(false)}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: nd.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{nd.label}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 1 }}>
                  {nd.description || nd.category}
                  <span style={{ color: 'var(--color-text-tertiary)', marginLeft: 8, fontFamily: 'var(--font-mono)', fontSize: 10 }}>{nd.type}</span>
                </div>
                <div style={{ display: 'flex', gap: 3, marginTop: 3 }}>
                  {nd.flowTypes.length === 0 ? (
                    <span style={{ fontSize: 9, padding: '0 4px', borderRadius: 3, background: 'var(--color-background-info)', color: 'var(--color-text-info)', fontWeight: 500 }}>全部</span>
                  ) : (
                    nd.flowTypes.slice(0, 4).map((ftId) => (
                      <span key={ftId} style={{ fontSize: 9, padding: '0 4px', borderRadius: 3, background: 'var(--color-background-info)', color: 'var(--color-text-info)' }}>
                        {flowTypes.find((f) => f.id === ftId)?.label ?? ftId}
                      </span>
                    ))
                  )}
                  {nd.flowTypes.length > 4 && <span style={{ fontSize: 9, color: 'var(--color-text-tertiary)' }}>+{nd.flowTypes.length - 4}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => setEditNodeType(nd.type)} style={smallBtn()}>编辑</button>
                <button onClick={() => { if (confirm('确定删除？')) deleteNodeDef(nd.type); }} style={smallBtn('#E24B4A', '#fff')}>删除</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editNodeType && <NodeEditModal nodeType={editNodeType} onClose={() => setEditNodeType(null)} />}
      {showCreate && <NodeEditModal onClose={() => setShowCreate(false)} />}
    </>
  );
}


// ── Shared helpers ──

function tabBtn(active: boolean): React.CSSProperties {
  return {
    padding: '6px 16px', fontSize: 13, fontWeight: 500,
    border: 'none', borderBottom: active ? '2px solid #378ADD' : '2px solid transparent',
    background: 'transparent', color: active ? '#378ADD' : 'var(--color-text-secondary)',
    cursor: 'pointer', marginBottom: -1,
  };
}

function primaryBtn(): React.CSSProperties {
  return { padding: '5px 12px', fontSize: 12, fontWeight: 500, border: 'none', borderRadius: 6, background: '#378ADD', color: '#fff', cursor: 'pointer' };
}

function rowBase(deprecated: boolean): React.CSSProperties {
  return {
    padding: '10px 12px', borderRadius: 8,
    border: `0.5px solid var(--color-border-${deprecated ? 'warning' : 'tertiary'})`,
    background: deprecated ? 'var(--color-background-warning)' : 'var(--color-background-secondary)',
    display: 'flex', gap: 12, alignItems: 'center',
  };
}

function RowLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginBottom: 2, ...style }}>{children}</div>;
}

function readonlyIdStyle(): React.CSSProperties {
  return { padding: '3px 6px', fontSize: 12, borderRadius: 4, background: 'var(--color-background-tertiary)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' };
}

function smallBtn(bg?: string, color?: string, warning?: boolean): React.CSSProperties {
  return { padding: '3px 10px', fontSize: 11, fontWeight: 500, border: '0.5px solid var(--color-border-tertiary)', borderRadius: 4, background: bg || 'transparent', color: color || (warning ? 'var(--color-text-warning)' : 'var(--color-text-primary)'), cursor: 'pointer', whiteSpace: 'nowrap' };
}

function inputStyle(): React.CSSProperties {
  return { display: 'block', width: '100%', padding: '3px 6px', fontSize: 12, border: '0.5px solid var(--color-border-tertiary)', borderRadius: 4, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', outline: 'none' };
}
