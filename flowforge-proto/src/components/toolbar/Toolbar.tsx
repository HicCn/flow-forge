import { useEditorStore } from '../../store/editorStore';
import { useAppStore } from '../../store/appStore';
import { useT, setLocale, type Locale } from '../../i18n';

interface ToolbarProps {
  onSave: () => void;
  onSaveAs: () => void;
  onNew: () => void;
}

const LOCALE_OPTIONS: { value: Locale; label: string; labelEn: string }[] = [
  { value: 'zh-CN', label: '中文', labelEn: '简体中文' },
  { value: 'en-US', label: 'English', labelEn: 'English' },
];

export default function Toolbar({ onSave, onSaveAs, onNew }: ToolbarProps) {
  const { t, locale } = useT();
  const filePath = useEditorStore((s) => s.filePath);
  const isDirty = useEditorStore((s) => s.isDirty);
  const nodes = useEditorStore((s) => s.nodes);
  const flowType = useEditorStore((s) => s.flowType);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const historyIndex = useEditorStore((s) => s.historyIndex);
  const history = useEditorStore((s) => s.history);
  const setScreen = useAppStore((s) => s.setScreen);

  const fileName = filePath ? filePath.split(/[\\/]/).pop() : t('toolbar.untitled');
  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < history.length - 1;

  const btnStyle = (disabled = false) => ({
    border: '0.5px solid var(--color-border-tertiary)',
    background: 'transparent',
    borderRadius: 6,
    padding: '2px 8px',
    fontSize: 12,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.3 : 1,
    color: 'var(--color-text-primary)',
    whiteSpace: 'nowrap' as const,
  });

  return (
    <div style={{
      height: 40,
      display: 'flex',
      alignItems: 'center',
      padding: '0 12px',
      borderBottom: '0.5px solid var(--color-border-tertiary)',
      background: 'var(--color-background-primary)',
      gap: 8,
      flexShrink: 0,
    }}>
      <button
        onClick={() => setScreen('landing')}
        title={t('toolbar.home')}
        style={{ ...btnStyle(), border: 'none', fontSize: 14, padding: '2px 6px' }}
      >
        &#8962;
      </button>

      <span style={{
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--color-text-primary)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <span style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: isDirty ? '#EF9F27' : '#639922',
          display: 'inline-block',
        }} />
        FlowForge — {fileName}
      </span>

      {flowType && (
        <span style={{
          fontSize: 10,
          padding: '1px 6px',
          borderRadius: 4,
          background: 'var(--color-background-info)',
          color: 'var(--color-text-info)',
          fontWeight: 500,
        }}>
          {flowType.label}
        </span>
      )}

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <button onClick={onNew} title={`${t('toolbar.new')} (Ctrl+N)`} style={btnStyle()}>
          {t('toolbar.new')}
        </button>
        <button onClick={onSave} title={`${t('toolbar.save')} (Ctrl+S)`} style={btnStyle()}>
          {t('toolbar.save')}
        </button>
        <button onClick={onSaveAs} title={`${t('toolbar.saveAs')} (Ctrl+Shift+S)`} style={btnStyle()}>
          {t('toolbar.saveAs')}
        </button>
      </div>

      <div style={{ width: 1, height: 20, background: 'var(--color-border-tertiary)', margin: '0 4px' }} />

      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <button onClick={undo} disabled={!canUndo} title={t('toolbar.undo')} style={btnStyle(!canUndo)}>
          ←
        </button>
        <button onClick={redo} disabled={!canRedo} title={t('toolbar.redo')} style={btnStyle(!canRedo)}>
          →
        </button>
      </div>

      <div style={{ width: 1, height: 20, background: 'var(--color-border-tertiary)', margin: '0 4px' }} />

      {/* ── Language Switcher ── */}
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        style={{
          ...btnStyle(),
          fontSize: 11,
          padding: '2px 4px',
          appearance: 'none' as const,
          cursor: 'pointer',
        }}
      >
        {LOCALE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {locale === 'zh-CN' ? opt.label : opt.labelEn}
          </option>
        ))}
      </select>

      <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', minWidth: 60, textAlign: 'right' }}>
        {t('toolbar.nodeCount', { count: nodes.length })}
      </span>
    </div>
  );
}
