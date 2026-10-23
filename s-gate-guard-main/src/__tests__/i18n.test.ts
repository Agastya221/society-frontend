import { missingTranslations, translate } from '@/i18n';

describe('guard i18n', () => {
  it('has every key in both Hindi and English', () => {
    expect(missingTranslations()).toEqual([]);
  });

  it('falls back to English, then to the key', () => {
    expect(translate('hi', 'common.home')).toBe('होम');
    expect(translate('en', 'common.home')).toBe('Home');
    expect(translate('hi', 'does.not.exist')).toBe('does.not.exist');
  });

  it('fills {n}-style params', () => {
    expect(translate('en', 'common.returningIn', { n: 5 })).toBe('Back to Home in 5s');
  });
});
