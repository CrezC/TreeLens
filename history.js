import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEY = 'treelens_history';
export const DEFAULT_MAX_HISTORY = 50;

// Pure — no I/O, no mutation of `list`. Unit-tested core.
export function addEntry(list, entry, maxLen = DEFAULT_MAX_HISTORY) {
  return [entry, ...list].slice(0, maxLen);
}

export function makeEntry({ result, images, latitude, longitude, captureDate }) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: new Date().toISOString(),
    captureDate: captureDate ?? null,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    thumbnailUri: images?.leaf?.uri ?? images?.full?.uri ?? images?.bark?.uri ?? null,
    result,
  };
}

export async function loadHistory() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveHistory(list) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export async function appendToHistory(entry, maxLen = DEFAULT_MAX_HISTORY) {
  const current = await loadHistory();
  const updated = addEntry(current, entry, maxLen);
  await saveHistory(updated);
  return updated;
}

export async function clearHistory() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
