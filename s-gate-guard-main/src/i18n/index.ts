import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import type { Lang, StringTable } from './types';
import { auth } from './strings/auth';
import { common } from './strings/common';
import { emergency } from './strings/emergency';
import { home } from './strings/home';
import { profile } from './strings/profile';
import { scan } from './strings/scan';
import { visitor } from './strings/visitor';
import { waiting } from './strings/waiting';

const LANG_KEY = 'guard_language';
const modules = [common, home, scan, visitor, waiting, emergency, profile, auth];

const tables: Record<Lang, StringTable> = { hi: {}, en: {} };
for (const m of modules) {
  Object.assign(tables.hi, m.hi);
  Object.assign(tables.en, m.en);
}

interface LanguageState {
  lang: Lang;
  setLang: (lang: Lang) => Promise<void>;
  /** Loads the saved language (defaults to Hindi). Safe to call more than once. */
  loadLang: () => Promise<void>;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  lang: 'hi',
  setLang: async (lang) => {
    set({ lang });
    try { await SecureStore.setItemAsync(LANG_KEY, lang); } catch { /* the choice still applies for this session */ }
  },
  loadLang: async () => {
    try {
      const saved = await SecureStore.getItemAsync(LANG_KEY);
      if (saved === 'hi' || saved === 'en') set({ lang: saved });
    } catch { /* keep the default */ }
  },
}));

/** Looks up a key; falls back to English, then to the key itself. `{n}`-style params are replaced. */
export function translate(lang: Lang, key: string, params?: Record<string, string | number>): string {
  let text = tables[lang][key] ?? tables.en[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) text = text.split(`{${k}}`).join(String(v));
  return text;
}

/** `const t = useT(); t('common.home')` — re-renders when the language changes. */
export function useT() {
  const lang = useLanguageStore((s) => s.lang);
  return (key: string, params?: Record<string, string | number>) => translate(lang, key, params);
}

/** Dev check: keys that exist in only one language. Used by the tests. */
export function missingTranslations(): string[] {
  const keys = new Set([...Object.keys(tables.hi), ...Object.keys(tables.en)]);
  return [...keys].filter((k) => !(k in tables.hi) || !(k in tables.en));
}
