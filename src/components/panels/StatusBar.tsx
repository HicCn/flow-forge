import { useEditorStore } from '../../store/editorStore';
import { useT } from '../../i18n';

export default function StatusBar() {
  const { t } = useT();
  const validationResult = useEditorStore((s) => s.validationResult);
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const viewport = useEditorStore((s) => s.viewport);
  const filePath = useEditorStore((s) => s.filePath);

  const errors = validationResult?.errors.filter((e) => e.level === 'error').length ?? 0;
  const warnings = validationResult?.errors.filter((e) => e.level === 'warning').length ?? 0;

  return (
    <div style={{
      height: 28,
      display: 'flex',
      alignItems: 'center',
      padding: '0 12px',
      borderTop: '0.5px solid var(--color-border-tertiary)',
      background: 'var(--color-background-primary)',
      fontSize: 11,
      color: 'var(--color-text-secondary)',
      gap: 16,
      flexShrink: 0,
    }}>
      <span style={{ color: 'var(--color-text-tertiary)' }}>
        {filePath ? filePath.replace(/^.*[\\/]/, '') : t('statusBar.untitled')}
      </span>
      <span>{t('statusBar.nodesEdges', { nodeCount: nodes.length, edgeCount: edges.length })}</span>
      <span>
        {errors > 0 ? (
          <span style={{ color: '#E24B4A' }}>{t('statusBar.errors', { count: errors })}</span>
        ) : (
          <span style={{ color: '#639922' }}>{t('statusBar.noErrors')}</span>
        )}
        {warnings > 0 && (
          <span style={{ color: '#EF9F27', marginLeft: 8 }}>{t('statusBar.warnings', { count: warnings })}</span>
        )}
      </span>
      <div style={{ flex: 1 }} />
      <span style={{ color: 'var(--color-text-tertiary)' }}>
        {Math.round(viewport.zoom * 100)}%
      </span>
    </div>
  );
}
