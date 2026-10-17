import Sanscript from '@indic-transliteration/sanscript';

/** Convert Hindi speech text to editable Latin letters before showing or saving a name. */
export function toEnglishName(value: string): string {
  const roman = value.replace(/[\u0900-\u097F]+/g, (word) => Sanscript.t(word, 'devanagari', 'iast'));
  return roman
    .replace(/ś|ṣ/gi, 'sh')
    .replace(/ṛ/gi, 'ri')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z '-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100)
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}
