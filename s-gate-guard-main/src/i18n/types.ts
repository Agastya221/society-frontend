export type Lang = 'hi' | 'en';
export type StringTable = Record<string, string>;
/** One screen's copy, in both languages. Keys must match between hi and en. */
export interface Strings { hi: StringTable; en: StringTable }
