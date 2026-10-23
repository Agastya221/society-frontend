import { toEnglishName } from '../utils/englishName';

it('keeps visitor names in English letters even when speech returns Hindi script', () => {
  expect(toEnglishName('रवि कुमार')).toMatch(/^[A-Za-z ]+$/);
  expect(toEnglishName('रवि कुमार')).toBe('Ravi Kumara');
  expect(toEnglishName('  asha   rao ')).toBe('Asha Rao');
});
