import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from './translations';

const STORAGE_KEY = 'treelens_language';

function resolveKey(dict, key) {
  return key.split('.').reduce((node, part) => (node && typeof node === 'object' ? node[part] : undefined), dict);
}

function interpolate(template, params) {
  if (!params) return template;
  return Object.keys(params).reduce(
    (str, name) => str.replaceAll(`{{${name}}}`, String(params[name])),
    template
  );
}

// Pure — no I/O. Unit-tested core.
export function translate(language, key, params) {
  const value =
    resolveKey(translations[language], key) ??
    resolveKey(translations[DEFAULT_LANGUAGE], key);
  if (value === undefined) return key;
  return interpolate(value, params);
}

export async function loadLanguage() {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    return SUPPORTED_LANGUAGES.includes(stored) ? stored : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export async function saveLanguage(language) {
  await AsyncStorage.setItem(STORAGE_KEY, language);
}
