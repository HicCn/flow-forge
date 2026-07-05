/**
 * File API abstraction layer for FlowForge.
 *
 * In Tauri (desktop): uses IPC invoke + native file dialogs.
 * In browser (dev): falls back to HTTP fetch to the Node.js server.
 *
 * Detection: Tauri v2 sets window.__TAURI_INTERNALS__.
 */

// ── Tauri imports (lazy to avoid breaking non-Tauri builds) ──
let tauriInvoke: ((cmd: string, args?: Record<string, unknown>) => Promise<unknown>) | null = null;
let tauriDialog: {
  open: (opts?: { filters?: { name: string; extensions: string[] }[]; multiple?: boolean }) => Promise<string | string[] | null>;
  save: (opts?: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) => Promise<string | null>;
} | null = null;

async function ensureTauri() {
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    if (!tauriInvoke) {
      const { invoke } = await import('@tauri-apps/api/core');
      tauriInvoke = invoke;
    }
    if (!tauriDialog) {
      const { open, save } = await import('@tauri-apps/plugin-dialog');
      tauriDialog = { open, save };
    }
    return true;
  }
  return false;
}

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

function getConfigDir(): string | null {
  try {
    return localStorage.getItem('flowforge_config_dir') || localStorage.getItem('flowforge_work_dir') || null;
  } catch { return null; }
}

// ── Browser fallback (for dev mode without Tauri) ──
const SERVER_URL = 'http://localhost:3001';

async function browserFetch<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  return res.json();
}

// ── Public API ──

/** Save workflow content to a known file path, with optional meta */
export async function saveFile(path: string, content: string, meta?: unknown): Promise<void> {
  if (await ensureTauri()) {
    await tauriInvoke!('save_file', { path, content });
    if (meta) {
      await tauriInvoke!('save_file', { path: path + '.meta', content: JSON.stringify(meta, null, 2) });
    }
  } else {
    await browserFetch(`${SERVER_URL}/api/save`, { path, content, meta });
  }
}

/** Save workflow content via "Save As" dialog, returns chosen path or null if cancelled */
export async function saveFileAs(content: string, defaultName = 'untitled.flow'): Promise<string | null> {
  if (await ensureTauri()) {
    const dir = getConfigDir();
    const filePath = await tauriDialog!.save({
      defaultPath: dir ? `${dir}/${defaultName}` : defaultName,
      filters: [{ name: 'FlowForge Workflow', extensions: ['flow'] }],
    });
    if (!filePath) return null;
    await tauriInvoke!('save_file', { path: filePath, content });
    return filePath;
  } else {
    const res = await browserFetch<{ ok: boolean; path: string }>(`${SERVER_URL}/api/save-as`, { content });
    return res.path ?? null;
  }
}

/** Open a workflow file via dialog, returns content + path or null if cancelled */
export async function openFile(): Promise<{ content: string; path: string } | null> {
  if (await ensureTauri()) {
    const dir = getConfigDir();
    const selected = await tauriDialog!.open({
      filters: [{ name: 'FlowForge Workflow', extensions: ['flow', 'json'] }],
      multiple: false,
      ...(dir ? { defaultPath: dir } : {}),
    });
    if (!selected) return null;
    const path = typeof selected === 'string' ? selected : selected[0];
    const content = await tauriInvoke!('open_file', { path }) as string;
    return { content, path };
  } else {
    const res = await browserFetch<{ content: string | null; path: string | null }>(`${SERVER_URL}/api/open`);
    if (!res.content) return null;
    return { content: res.content, path: res.path ?? 'sample.flow.json' };
  }
}

/** Load the bundled sample workflow file */
export async function loadSample(): Promise<{ content: string; path: string } | null> {
  if (await ensureTauri()) {
    const content = await tauriInvoke!('read_sample_file') as string;
    if (!content) return null;
    return { content, path: 'sample.flow.json' };
  } else {
    const res = await browserFetch<{ content: string | null; path: string | null }>(`${SERVER_URL}/api/open`);
    if (!res.content) return null;
    return { content: res.content, path: res.path ?? 'sample.flow.json' };
  }
}

/** Load a file directly by path (for recent file re-opening) */
export async function loadFile(path: string): Promise<{ content: string; path: string; meta?: unknown } | null> {
  if (await ensureTauri()) {
    const content = await tauriInvoke!('open_file', { path }) as string;
    let meta;
    try { meta = JSON.parse(await tauriInvoke!('open_file', { path: path + '.meta' }) as string); } catch { }
    return { content, path, meta };
  } else {
    const res = await browserFetch<{ content: string | null; meta?: unknown }>(`${SERVER_URL}/api/load`, { path });
    if (!res.content) return null;
    return { content: res.content, path, meta: res.meta };
  }
}

/** Export generated runtime code — sends node definitions and flow data to server for generation */
export async function exportRuntime(lang: 'csharp' | 'typescript', nodeDefs: unknown[], flowData?: unknown): Promise<{ files: { name: string; content: string }[] }> {
  return browserFetch(`${SERVER_URL}/api/export-runtime`, { lang, nodeDefs, flowData });
}
