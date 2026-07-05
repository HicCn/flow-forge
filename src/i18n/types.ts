import { zhCN } from './locales/zh-CN';

/** 翻译字典根类型 (从中文字典推导，确保所有语言结构一致) */
export type TranslationMap = typeof zhCN;

/** 支持的语言代码 */
export type Locale = 'zh-CN' | 'en-US';

// ── 路径类型推导 ──
// 将嵌套对象展开为点分隔路径: 'toolbar.save' | 'statusBar.nodes' | ...
type Join<K, P> = K extends string | number
  ? P extends string | number
    ? `${K}.${P}`
    : never
  : never;

type Paths<T, D extends number = 5> = [D] extends [never]
  ? never
  : T extends object
    ? {
        [K in keyof T]-?: K extends string | number
          ? `${K}` | Join<K, Paths<T[K], Prev[D]>>
          : never;
      }[keyof T]
    : never;

type Prev = [never, 0, 1, 2, 3, 4, 5];

/** 翻译 key 联合类型 — 自动推导，IDE 全程提示 */
export type TranslationKey = Paths<TranslationMap>;
