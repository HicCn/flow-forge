// ── FlowForge 轻量 i18n 核心 ──
// 零外部依赖，useSyncExternalStore 驱动响应式语言切换
// 翻译范围：编辑器系统壳层 UI（不含业务节点定义）

import { useCallback, useSyncExternalStore } from 'react';
import { zhCN } from './locales/zh-CN';
import { enUS } from './locales/en-US';
import type { Locale, TranslationKey, TranslationMap } from './types';

// Re-export for consumers
export type { Locale, TranslationKey };

// ── 运行时状态 ──
const STORAGE_KEY = 'flowforge-locale';

let currentLocale: Locale = loadLocale();
const listeners = new Set<() => void>();

function detectBrowserLocale(): Locale {
  const lang = navigator.language;
  return lang.startsWith('zh') ? 'zh-CN' : 'en-US';
}

function loadLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'zh-CN' || stored === 'en-US') return stored;
  } catch { /* localStorage unavailable */ }
  return detectBrowserLocale();
}

const locales: Record<Locale, TranslationMap> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

// ── useSyncExternalStore 适配 ──
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): Locale {
  return currentLocale;
}

// ── 跨标签页同步 ──
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      currentLocale = loadLocale();
      listeners.forEach((cb) => cb());
    }
  });
}

// ── 公开 API ──

/** 切换语言（持久化到 localStorage，所有订阅组件自动重渲染） */
export function setLocale(locale: Locale): void {
  currentLocale = locale;
  try { localStorage.setItem(STORAGE_KEY, locale); } catch { /* quota exceeded etc */ }
  listeners.forEach((cb) => cb());
}

/** 获取当前语言代码（非 React 上下文可用） */
export function getLocale(): Locale {
  return currentLocale;
}

/** 获取当前语言的翻译字典（非 React 上下文可用） */
export function getTranslations(): TranslationMap {
  return locales[currentLocale];
}

// ── 内部工具函数 ──

/** 沿点分隔路径从嵌套对象取值 */
function resolveValue(path: string, map: Record<string, unknown>): string {
  const keys = path.split('.');
  let current: unknown = map;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return path;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'string' ? current : path;
}

/**
 * React Hook — 响应式翻译
 *
 * @example
 * const { t, locale } = useT();
 * t('toolbar.save')                         // '保存' | 'Save'
 * t('toolbar.nodeCount', { count: 3 })       // '3 个节点' | '3 nodes'
 */
export function useT() {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const t = useCallback(
    (key: TranslationKey, interpolations?: Record<string, string | number>): string => {
      const map = locales[locale] as unknown as Record<string, unknown>;
      let result = resolveValue(key, map);

      if (interpolations) {
        for (const [k, v] of Object.entries(interpolations)) {
          result = result.replace(`{${k}}`, String(v));
        }
      }

      return result;
    },
    [locale],
  );

  return { t, locale } as const;
}
