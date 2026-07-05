import { useState, useEffect } from 'react';
import { useConfigStore } from '../../store/configStore';
import type { NodeDefinition, ParamDefinition, ParamType, PinDefinition, EnumType } from '../../types';

const PARAM_TYPES: ParamType[] = ['string', 'number', 'float', 'boolean', 'enum', 'text'];

interface Props {
  nodeType?: string;
  onClose: () => void;
}

export default function NodeEditModal({ nodeType, onClose }: Props) {
  const getNodeDefs = useConfigStore((s) => s.getNodeDefs);
  const addNodeDef = useConfigStore((s) => s.addNodeDef);
  const updateNodeDef = useConfigStore((s) => s.updateNodeDef);
  const getActiveFlowTypes = useConfigStore((s) => s.getActiveFlowTypes);
  const getEnumTypes = useConfigStore((s) => s.getEnumTypes);

  const isCreate = !nodeType;
  const nd = nodeType ? getNodeDefs().find((n) => n.type === nodeType) : null;
  const flowTypes = getActiveFlowTypes();

  const [typeId, setTypeId] = useState('');
  const [label, setLabel] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('');
  const [color, setColor] = useState('#888');
  const [selectedFlowTypes, setSelectedFlowTypes] = useState<string[]>([]);
  const [params, setParams] = useState<ParamDefinition[]>([]);
  const [inputPins, setInputPins] = useState<PinDefinition[]>([]);
  const [outputPins, setOutputPins] = useState<PinDefinition[]>([]);

  const [showAddParam, setShowAddParam] = useState(false);
  const [newParamKey, setNewParamKey] = useState('');
  const [newParamLabel, setNewParamLabel] = useState('');
  const [newParamType, setNewParamType] = useState<ParamType>('string');
  const [newParamSource, setNewParamSource] = useState<'fixed' | 'param' | 'param_or_fixed'>('fixed');
  const [newParamEnumType, setNewParamEnumType] = useState('');

  // Inline param label editing
  const [editingParamIndex, setEditingParamIndex] = useState<number | null>(null);
  const [editParamLabel, setEditParamLabel] = useState('');

  useEffect(() => {
    if (isCreate) {
      setTypeId('');
      setLabel('');
      setDesc('');
      setCategory('custom');
      setColor('#888');
      setSelectedFlowTypes([]);
      setParams([]);
      setInputPins([{ id: 'flow_in', label: '', type: 'flow', required: true }]);
      setOutputPins([{ id: 'flow_out', label: '', type: 'flow', required: true }]);
    } else if (nodeType) {
      const nd = getNodeDefs().find((n) => n.type === nodeType);
      if (!nd) return;
      setTypeId(nd.type);
      setLabel(nd.label);
      setDesc(nd.description);
      setCategory(nd.category);
      setColor(nd.color);
      setSelectedFlowTypes([...nd.flowTypes]);
      setParams([...nd.params]);
      setInputPins([...nd.pins.inputs]);
      setOutputPins([...nd.pins.outputs]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeType, isCreate]);

  if (!isCreate && !nd) return null;

  const toggleFlowType = (ftId: string) => {
    setSelectedFlowTypes((prev) =>
      prev.includes(ftId) ? prev.filter((f) => f !== ftId) : [...prev, ftId]
    );
  };

  const handleAddParam = () => {
    if (!newParamKey.trim() || !newParamLabel.trim()) return;
    const enumType = newParamType === 'enum' && newParamEnumType
      ? getEnumTypes().find((e) => e.id === newParamEnumType)
      : null;
    setParams((prev) => [...prev, {
      key: newParamKey.trim(),
      type: newParamType,
      label: newParamLabel.trim(),
      default: newParamType === 'boolean' ? false : newParamType === 'float' || newParamType === 'number' ? 0 : '',
      required: false,
      source: newParamSource,
      ...(enumType ? { enumType: enumType.id, options: enumType.values } : {}),
    }]);
    setNewParamKey(''); setNewParamLabel(''); setNewParamEnumType(''); setShowAddParam(false);
  };

  const startEditParam = (index: number, currentLabel: string) => {
    setEditingParamIndex(index);
    setEditParamLabel(currentLabel);
  };

  const saveEditParam = () => {
    if (editingParamIndex === null || !editParamLabel.trim()) return;
    setParams((prev) =>
      prev.map((p, i) => (i === editingParamIndex ? { ...p, label: editParamLabel.trim() } : p))
    );
    setEditingParamIndex(null);
  };

  const handleSave = () => {
    if (!typeId.trim() || !label.trim()) return;
    const pins = { inputs: inputPins, outputs: outputPins };
    if (isCreate) {
      addNodeDef({
        type: typeId.trim(),
        label: label.trim(),
        description: desc.trim(),
        category: category.trim() || 'custom',
        color,
        pins,
        params,
        flowTypes: selectedFlowTypes,
      });
    } else {
      updateNodeDef(typeId, {
        label: label.trim(),
        description: desc.trim(),
        category: category.trim(),
        color,
        flowTypes: selectedFlowTypes,
        params,
        pins,
      });
    }
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 110, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}>
      <div style={{ background: 'var(--color-background-primary)', borderRadius: 12, padding: 24, width: 500, maxHeight: '85vh', overflow: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
        onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: 'var(--color-text-primary)' }}>
          {isCreate ? '新建节点' : `编辑节点: ${nd!.label}`}
        </div>

        {/* Type id */}
        <FormLabel>节点标识{isCreate ? <span style={{ color: 'var(--color-text-warning)' }}>（创建后不可修改）</span> : ''}</FormLabel>
        {isCreate ? (
          <input value={typeId} onChange={(e) => setTypeId(e.target.value)} style={inputStyle()} placeholder="例: play_animation" />
        ) : (
          <ReadonlyBox>{typeId}</ReadonlyBox>
        )}

        {/* Label */}
        <FormLabel>显示名称</FormLabel>
        <input value={label} onChange={(e) => setLabel(e.target.value)} style={inputStyle()} />

        {/* Description */}
        <FormLabel>描述</FormLabel>
        <input value={desc} onChange={(e) => setDesc(e.target.value)} style={inputStyle()} />

        {/* Category + Color */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <FormLabel>分类</FormLabel>
            <input value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle()} />
          </div>
          <div>
            <FormLabel>颜色</FormLabel>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
              style={{ width: 36, height: 30, border: '0.5px solid var(--color-border-tertiary)', borderRadius: 4, padding: 2, cursor: 'pointer' }} />
          </div>
        </div>

        {/* Flow types */}
        <FormLabel>可用流类型</FormLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px',
            borderRadius: 4, fontSize: 12, cursor: 'pointer',
            background: selectedFlowTypes.length === 0 ? 'var(--color-background-info)' : 'var(--color-background-tertiary)',
            color: selectedFlowTypes.length === 0 ? 'var(--color-text-info)' : 'var(--color-text-tertiary)',
            fontWeight: 500,
          }}>
            <input type="checkbox" checked={selectedFlowTypes.length === 0} onChange={() => setSelectedFlowTypes([])} style={{ width: 13, height: 13 }} />
            全部类型
          </label>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {flowTypes.map((ft) => (
            <label key={ft.id} style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px',
              borderRadius: 4, fontSize: 12, cursor: 'pointer',
              background: selectedFlowTypes.includes(ft.id) ? 'var(--color-background-info)' : 'var(--color-background-tertiary)',
              color: selectedFlowTypes.includes(ft.id) ? 'var(--color-text-info)' : 'var(--color-text-tertiary)',
            }}>
              <input type="checkbox" checked={selectedFlowTypes.includes(ft.id)} onChange={() => toggleFlowType(ft.id)} style={{ width: 13, height: 13 }} />
              {ft.label}
            </label>
          ))}
        </div>

        {/* Pins */}
        <FormLabel>节点出入口</FormLabel>
        <div style={{ display: 'flex', gap: 12 }}>
          {/* Input pins */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>入口 ({inputPins.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {inputPins.map((pin, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <input value={pin.id} onChange={(e) => {
                    setInputPins((prev) => prev.map((p, j) => j === i ? { ...p, id: e.target.value } : p));
                  }} style={{ ...pinInputStyle(), width: 64 }} placeholder="id" />
                  <input value={pin.label} onChange={(e) => {
                    setInputPins((prev) => prev.map((p, j) => j === i ? { ...p, label: e.target.value } : p));
                  }} style={{ ...pinInputStyle(), flex: 1, minWidth: 0 }} placeholder="标签" />
                  <button onClick={() => setInputPins((prev) => prev.filter((_, j) => j !== i))}
                    style={{ ...smallBtn(), fontSize: 10, padding: '1px 5px', color: '#E24B4A', flexShrink: 0 }}>&times;</button>
                </div>
              ))}
              <button onClick={() => setInputPins((prev) => [...prev, { id: `in_${prev.length}`, label: '', type: 'flow', required: false }])}
                style={{ ...smallBtn(), fontSize: 10, alignSelf: 'flex-start' }}>+ 添加入口</button>
            </div>
          </div>
          {/* Output pins */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>出口 ({outputPins.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {outputPins.map((pin, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <input value={pin.id} onChange={(e) => {
                    setOutputPins((prev) => prev.map((p, j) => j === i ? { ...p, id: e.target.value } : p));
                  }} style={{ ...pinInputStyle(), width: 64 }} placeholder="id" />
                  <input value={pin.label} onChange={(e) => {
                    setOutputPins((prev) => prev.map((p, j) => j === i ? { ...p, label: e.target.value } : p));
                  }} style={{ ...pinInputStyle(), flex: 1, minWidth: 0 }} placeholder="标签" />
                  <button onClick={() => setOutputPins((prev) => prev.filter((_, j) => j !== i))}
                    style={{ ...smallBtn(), fontSize: 10, padding: '1px 5px', color: '#E24B4A', flexShrink: 0 }}>&times;</button>
                </div>
              ))}
              <button onClick={() => setOutputPins((prev) => [...prev, { id: `out_${prev.length}`, label: '', type: 'flow', required: false }])}
                style={{ ...smallBtn(), fontSize: 10, alignSelf: 'flex-start' }}>+ 添加出口</button>
            </div>
          </div>
        </div>

        {/* Params */}
        <FormLabel>参数列表<span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', fontWeight: 400, marginLeft: 6 }}>键名和类型不可修改，仅可编辑显示名</span></FormLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {params.map((p, i) => (
            editingParamIndex === i ? (
              <div key={i} style={{ padding: '6px 8px', borderRadius: 4, background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 11, minWidth: 60 }}>{p.key}</span>
                <input value={editParamLabel} onChange={(e) => setEditParamLabel(e.target.value)} style={{ flex: 1, ...paramInputStyle() }} autoFocus />
                <button onClick={saveEditParam} style={smallBtn('#378ADD', '#fff')}>保存</button>
                <button onClick={() => setEditingParamIndex(null)} style={smallBtn()}>取消</button>
              </div>
            ) : (
              <div key={i} style={{ padding: '4px 8px', borderRadius: 4, background: 'var(--color-background-tertiary)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{p.key}</span>
                <span style={{ color: 'var(--color-text-secondary)', cursor: 'pointer' }} onClick={() => startEditParam(i, p.label)}>{p.label}</span>
                <span style={{ color: 'var(--color-border-info)', fontSize: 10 }}>{p.type}</span>
                <span style={{ color: 'var(--color-text-tertiary)', fontSize: 10 }}>{p.source}</span>
              </div>
            )
          ))}
        </div>
        {showAddParam ? (
          <div style={{ marginTop: 6, padding: 8, borderRadius: 6, background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)' }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <FormLabel>键名</FormLabel>
                <input value={newParamKey} onChange={(e) => setNewParamKey(e.target.value)} style={inputStyle()} placeholder="程序标识" />
              </div>
              <div style={{ flex: 1 }}>
                <FormLabel>显示名</FormLabel>
                <input value={newParamLabel} onChange={(e) => setNewParamLabel(e.target.value)} style={inputStyle()} placeholder="显示名称" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <div>
                <FormLabel>类型</FormLabel>
                <select value={newParamType} onChange={(e) => setNewParamType(e.target.value as ParamType)}
                  style={selectStyle()}>
                  {PARAM_TYPES.map((pt) => <option key={pt} value={pt}>{pt}</option>)}
                </select>
              </div>
              <div>
                <FormLabel>来源</FormLabel>
                <select value={newParamSource} onChange={(e) => setNewParamSource(e.target.value as any)}
                  style={selectStyle()}>
                  <option value="fixed">固定值</option>
                  <option value="param">全局参数</option>
                  <option value="param_or_fixed">二选一</option>
                </select>
              </div>
            </div>
            {newParamType === 'enum' && (
              <div style={{ marginBottom: 8 }}>
                <FormLabel>枚举类型</FormLabel>
                <select value={newParamEnumType} onChange={(e) => setNewParamEnumType(e.target.value)}
                  style={selectStyle()}>
                  <option value="">（内联定义选项）</option>
                  {getEnumTypes().map((et) => (
                    <option key={et.id} value={et.id}>{et.label} ({et.values.length} 项)</option>
                  ))}
                </select>
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAddParam(false)} style={smallBtn()}>取消</button>
              <button onClick={handleAddParam} style={smallBtn('#378ADD', '#fff')}>添加</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAddParam(true)} style={{ ...smallBtn(), marginTop: 4 }}>+ 添加参数</button>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 24, paddingTop: 16, borderTop: '0.5px solid var(--color-border-tertiary)' }}>
          <button onClick={onClose} style={smallBtn()}>取消</button>
          <button onClick={handleSave} style={{ padding: '6px 20px', fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 6, background: '#378ADD', color: '#fff', cursor: 'pointer' }}>保存</button>
        </div>
      </div>
    </div>
  );
}

function FormLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', marginTop: 12, marginBottom: 4 }}>{children}</div>;
}

function ReadonlyBox({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: '4px 8px', fontSize: 12, borderRadius: 4, background: 'var(--color-background-tertiary)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>{children}</div>;
}

function inputStyle(): React.CSSProperties {
  return { display: 'block', width: '100%', padding: '5px 8px', fontSize: 12, border: '0.5px solid var(--color-border-tertiary)', borderRadius: 4, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', outline: 'none' };
}

function selectStyle(): React.CSSProperties {
  return { padding: '4px 6px', fontSize: 11, border: '0.5px solid var(--color-border-tertiary)', borderRadius: 4, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', outline: 'none' };
}

function paramInputStyle(): React.CSSProperties {
  return { padding: '3px 6px', fontSize: 11, border: '0.5px solid var(--color-border-tertiary)', borderRadius: 4, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', outline: 'none' };
}

function pinInputStyle(): React.CSSProperties {
  return { padding: '3px 6px', fontSize: 11, border: '0.5px solid var(--color-border-tertiary)', borderRadius: 4, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', outline: 'none' };
}

function smallBtn(bg?: string, color?: string): React.CSSProperties {
  return { padding: '4px 14px', fontSize: 12, fontWeight: 500, border: '0.5px solid var(--color-border-tertiary)', borderRadius: 6, background: bg || 'transparent', color: color || 'var(--color-text-primary)', cursor: 'pointer', whiteSpace: 'nowrap' };
}
