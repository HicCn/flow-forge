import { useState, useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { useConfigStore } from '../../store/configStore';
import { startDrag, clearDrag } from '../../utils/dragBridge';
import { useT } from '../../i18n';
import TypeManagerModal from '../modals/TypeManagerModal';
import NodeEditModal from '../modals/NodeEditModal';

export default function NodeLibrary() {
  const { t } = useT();
  // Subscribe to customNodeDefs for reactivity when definitions are edited,
  // then call getNodeDefs() to get the merged builtin + custom list.
  const customNodeDefs = useConfigStore((s) => s.customNodeDefs);
  const getNodeDefs = useConfigStore((s) => s.getNodeDefs);
  const allDefs = getNodeDefs();
  const flowType = useEditorStore((s) => s.flowType);

  // Filter by flow type: empty flowTypes = all types, otherwise must include current type
  const nodeDefinitions = flowType
    ? allDefs.filter((d) => d.flowTypes.length === 0 || d.flowTypes.includes(flowType.id))
    : allDefs;
  const addNode = useEditorStore((s) => s.addNode);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // Context menu
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; nodeType: string } | null>(null);
  // Modals
  const [showTypeManager, setShowTypeManager] = useState(false);
  const [editNodeType, setEditNodeType] = useState<string | null>(null);

  const filtered = search
    ? nodeDefinitions.filter((d) =>
        d.label.toLowerCase().includes(search.toLowerCase()) ||
        d.category.toLowerCase().includes(search.toLowerCase()) ||
        d.description.toLowerCase().includes(search.toLowerCase())
      )
    : nodeDefinitions;

  const categories = [...new Set(filtered.map((d) => d.category))];

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // ── Drag with threshold: only start drag after mouse moves > 4px ──
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, def: typeof nodeDefinitions[0]) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const onMove = (ev: MouseEvent) => {
      if (Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) > 4) {
        cleanup();
        startDrag(def.type, def.label, def.color, ev.clientX, ev.clientY);
      }
    };
    const onUp = () => { cleanup(); };
    const cleanup = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  if (collapsed) {
    return (
      <div style={{ width: 28, flexShrink: 0, borderRight: '0.5px solid var(--color-border-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'var(--color-background-primary)' }}
        onClick={() => setCollapsed(false)} title={t('nodeLibrary.expand')}>
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', writingMode: 'vertical-rl' }}>{t('nodeLibrary.nodes')}</span>
      </div>
    );
  }

  return (
    <>
      <div style={{ width: 150, flexShrink: 0, borderRight: '0.5px solid var(--color-border-tertiary)', background: 'var(--color-background-primary)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '6px 8px', borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="text" placeholder={t('nodeLibrary.search')} value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, border: '0.5px solid var(--color-border-tertiary)', borderRadius: 4, padding: '3px 6px', fontSize: 11, background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', outline: 'none' }} />
          <button onClick={() => setCollapsed(true)} title={t('nodeLibrary.collapse')}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 11, color: 'var(--color-text-tertiary)', padding: 0 }}>&#9664;</button>
        </div>

        {/* Node list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
          <div style={{ padding: '0 8px 4px' }}>
            <button
              onClick={() => setShowTypeManager(true)}
              style={{
                width: '100%', padding: '4px 0', fontSize: 11, fontWeight: 500,
                border: '0.5px solid var(--color-border-tertiary)', borderRadius: 4,
                background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)',
                cursor: 'pointer', textAlign: 'center' as const,
              }}
            >{t('nodeLibrary.manageTypes')}</button>
          </div>
          {categories.map((cat) => (
            <div key={cat}>
              <div onClick={() => toggleCategory(cat)} style={{ padding: '4px 8px', fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {cat}
                <span style={{ fontSize: 9 }}>{collapsedCategories.has(cat) ? '▸' : '▾'}</span>
              </div>
              {!collapsedCategories.has(cat) &&
                filtered.filter((d) => d.category === cat).map((def) => (
                  <div key={def.type}
                    onMouseDown={(e) => handleNodeMouseDown(e, def)}
                    onDoubleClick={() => addNode(def, { x: 300, y: 200 })}
                    onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, nodeType: def.type }); }}
                    style={{ padding: '5px 8px', cursor: 'grab', userSelect: 'none', WebkitUserSelect: 'none', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-text-primary)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-background-secondary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: 2, background: def.color, flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{def.label}</span>
                  </div>
                ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: '12px 8px', fontSize: 11, color: 'var(--color-text-tertiary)', textAlign: 'center' }}>{t('nodeLibrary.noNodes')}</div>
          )}
        </div>
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 20 }} onClick={() => setCtxMenu(null)} onContextMenu={(e) => e.preventDefault()}>
          <div style={{ position: 'fixed', left: ctxMenu.x, top: ctxMenu.y, background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 8, padding: '4px 0', minWidth: 140, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
            onClick={(e) => e.stopPropagation()}>
            <div
              onClick={() => { setEditNodeType(ctxMenu.nodeType); setCtxMenu(null); }}
              style={{ padding: '5px 12px', fontSize: 12, cursor: 'pointer', color: 'var(--color-text-primary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-background-secondary)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >编辑节点类型</div>
          </div>
        </div>
      )}

      {/* Type manager (for "+" button and flow type management) */}
      {showTypeManager && (
        <TypeManagerModal initialTab="node" onClose={() => setShowTypeManager(false)} />
      )}

      {/* Node editor (for right-click → edit node type) */}
      {editNodeType && (
        <NodeEditModal nodeType={editNodeType} onClose={() => setEditNodeType(null)} />
      )}
    </>
  );
}
