import { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { startDrag } from '../../utils/dragBridge';
import { useT } from '../../i18n';

export default function NodeLibrary() {
  const { t } = useT();
  const nodeDefinitions = useEditorStore((s) => s.nodeDefinitions);
  const addNode = useEditorStore((s) => s.addNode);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

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

  if (collapsed) {
    return (
      <div
        style={{
          width: 28,
          flexShrink: 0,
          borderRight: '0.5px solid var(--color-border-tertiary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          background: 'var(--color-background-primary)',
        }}
        onClick={() => setCollapsed(false)}
        title={t('nodeLibrary.expand')}
      >
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', writingMode: 'vertical-rl' }}>{t('nodeLibrary.nodes')}</span>
      </div>
    );
  }

  return (
    <div style={{
      width: 150,
      flexShrink: 0,
      borderRight: '0.5px solid var(--color-border-tertiary)',
      background: 'var(--color-background-primary)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '6px 8px',
        borderBottom: '0.5px solid var(--color-border-tertiary)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <input
          type="text"
          placeholder={t('nodeLibrary.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            border: '0.5px solid var(--color-border-tertiary)',
            borderRadius: 4,
            padding: '3px 6px',
            fontSize: 11,
            background: 'var(--color-background-secondary)',
            color: 'var(--color-text-primary)',
            outline: 'none',
          }}
        />
        <button
          onClick={() => setCollapsed(true)}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: 11,
            color: 'var(--color-text-tertiary)',
            padding: 0,
          }}
          title={t('nodeLibrary.collapse')}
        >
          ◀
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {categories.map((cat) => (
          <div key={cat}>
            <div
              onClick={() => toggleCategory(cat)}
              style={{
                padding: '4px 8px',
                fontSize: 10,
                fontWeight: 500,
                color: 'var(--color-text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              {cat}
              <span style={{ fontSize: 9 }}>
                {collapsedCategories.has(cat) ? '▸' : '▾'}
              </span>
            </div>
            {!collapsedCategories.has(cat) &&
              filtered
                .filter((d) => d.category === cat)
                .map((def) => (
                  <div
                    key={def.type}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      startDrag(def.type, def.label, def.color, e.clientX, e.clientY);
                    }}
                    onDoubleClick={() => addNode(def, { x: 300, y: 200 })}
                    style={{
                      padding: '5px 8px',
                      cursor: 'grab',
                      userSelect: 'none',
                      WebkitUserSelect: 'none' as any,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 11,
                      color: 'var(--color-text-primary)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-background-secondary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{
                      width: 6, height: 6, borderRadius: 2,
                      background: def.color, display: 'inline-block', flexShrink: 0,
                    }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {def.label}
                    </span>
                  </div>
                ))}
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: '12px 8px', fontSize: 11, color: 'var(--color-text-tertiary)', textAlign: 'center' }}>
            {t('nodeLibrary.noNodes')}
          </div>
        )}
      </div>
    </div>
  );
}
