import { translate, loadLanguage, saveLanguage } from './i18n';
import { translations, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from './translations';

function flattenKeys(obj, prefix = '') {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'object' && value !== null ? flattenKeys(value, path) : [path];
  });
}

describe('translations completeness', () => {
  test('en and es have exactly the same keys as zh', () => {
    const zhKeys = flattenKeys(translations.zh).sort();
    expect(flattenKeys(translations.en).sort()).toEqual(zhKeys);
    expect(flattenKeys(translations.es).sort()).toEqual(zhKeys);
  });

  test('every supported language has a translations entry', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(translations[lang]).toBeDefined();
    }
  });
});

describe('translate (pure)', () => {
  test('resolves a nested key', () => {
    expect(translate('en', 'common.done')).toBe('Done');
    expect(translate('zh', 'common.done')).toBe('完成');
    expect(translate('es', 'common.done')).toBe('Listo');
  });

  test('interpolates a single placeholder', () => {
    expect(translate('en', 'app.confidenceLabel', { confidence: 88 })).toBe('Confidence: 88%');
  });

  test('interpolates multiple placeholders anywhere in the string', () => {
    const result = translate('es', 'alternatives.intro', { name: 'Acer rubrum', confidence: 30 });
    expect(result).toContain('Acer rubrum');
    expect(result).toContain('30');
  });

  test('falls back to the default language when the key is missing in the requested language', () => {
    expect(translate('fr', 'common.done')).toBe(translate(DEFAULT_LANGUAGE, 'common.done'));
  });

  test('falls back to the raw key when missing everywhere', () => {
    expect(translate('en', 'nonexistent.key')).toBe('nonexistent.key');
  });
});

describe('loadLanguage/saveLanguage (AsyncStorage-backed)', () => {
  afterEach(async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.removeItem('treelens_language');
  });

  test('loadLanguage defaults when nothing stored', async () => {
    expect(await loadLanguage()).toBe(DEFAULT_LANGUAGE);
  });

  test('saveLanguage/loadLanguage round trip', async () => {
    await saveLanguage('en');
    expect(await loadLanguage()).toBe('en');
  });

  test('loadLanguage rejects an unsupported stored value', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem('treelens_language', 'fr');
    expect(await loadLanguage()).toBe(DEFAULT_LANGUAGE);
  });
});
