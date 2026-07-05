import { setLocale, getLocale } from '../../i18n';
import type { Locale } from '../../i18n';
import { useAppStore } from '../../store/appStore';

const LANG_OPTIONS: { value: Locale; label: string }[] = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en-US', label: 'English' },
];

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const current = getLocale();
  const configDir = useAppStore((s) => s.configDir);
  const setConfigDir = useAppStore((s) => s.setConfigDir);
  const scriptDir = useAppStore((s) => s.scriptDir);
  const setScriptDir = useAppStore((s) => s.setScriptDir);

  const handlePickDir = async (currentDir: string | null, setter: (d: string | null) => void, label: string) => {
    try {
      if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const dir = await open({ directory: true, title: `选择${label}` });
        if (dir && typeof dir === 'string') setter(dir);
      } else {
        const path = prompt(`请输入${label}路径:`, currentDir ?? '');
        if (path) setter(path.trim());
      }
    } catch (err) {
      console.error('Pick directory failed:', err);
    }
  };

  const displayPath = (p: string | null) => p ? (p.length > 50 ? '...' + p.slice(-47) : p) : null;

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
          borderRadius: 12, padding: 24, minWidth: 380, maxWidth: 440,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: 'var(--color-text-primary)' }}>
          设置
        </div>

        {/* Language */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle()}>语言</label>
          <select
            value={current}
            onChange={(e) => setLocale(e.target.value as Locale)}
            style={selectStyle()}
          >
            {LANG_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Config directory */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle()}>配置目录</label>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <div style={displayBoxStyle(displayPath(configDir))}>
              {displayPath(configDir) || '未设置'}
            </div>
            <button onClick={() => handlePickDir(configDir, setConfigDir, '配置目录')} style={actionBtn()}>选择</button>
            {configDir && (
              <button onClick={() => setConfigDir(null)} style={{ ...actionBtn(), color: 'var(--color-text-danger)' }}>清除</button>
            )}
          </div>
          <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
            流程文件（.flow）的默认保存和读取目录
          </div>
        </div>

        {/* Script directory */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle()}>脚本目录</label>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <div style={displayBoxStyle(displayPath(scriptDir))}>
              {displayPath(scriptDir) || '未设置'}
            </div>
            <button onClick={() => handlePickDir(scriptDir, setScriptDir, '脚本目录')} style={actionBtn()}>选择</button>
            {scriptDir && (
              <button onClick={() => setScriptDir(null)} style={{ ...actionBtn(), color: 'var(--color-text-danger)' }}>清除</button>
            )}
          </div>
          <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
            导出的运行时代码（.gen.cs / .gen.ts）将输出到此目录
          </div>
        </div>

        {/* Version */}
        <div style={{
          paddingTop: 16, borderTop: '0.5px solid var(--color-border-tertiary)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>FlowForge</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>v0.0.0-proto</span>
        </div>
      </div>
    </div>
  );
}

function displayBoxStyle(hasValue?: string | null): React.CSSProperties {
  return {
    flex: 1, padding: '6px 10px', fontSize: 12, borderRadius: 6,
    border: '0.5px solid var(--color-border-tertiary)',
    background: 'var(--color-background-tertiary)',
    color: hasValue ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    fontFamily: hasValue ? 'var(--font-mono)' : undefined,
  };
}

function labelStyle(): React.CSSProperties {
  return { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 };
}

function selectStyle(): React.CSSProperties {
  return { width: '100%', padding: '6px 10px', fontSize: 13, border: '0.5px solid var(--color-border-tertiary)', borderRadius: 6, background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', outline: 'none' };
}

function actionBtn(): React.CSSProperties {
  return { padding: '4px 12px', fontSize: 12, border: '0.5px solid var(--color-border-tertiary)', borderRadius: 6, background: 'transparent', color: 'var(--color-text-primary)', cursor: 'pointer', whiteSpace: 'nowrap' };
}
