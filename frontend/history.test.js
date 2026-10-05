import {
  addEntry,
  loadHistory,
  saveHistory,
  appendToHistory,
  clearHistory,
  DEFAULT_MAX_HISTORY,
} from './history';

describe('addEntry (pure)', () => {
  test('appends to an empty list', () => {
    expect(addEntry([], 'a')).toEqual(['a']);
  });

  test('prepends newest-first', () => {
    expect(addEntry(['old'], 'new')).toEqual(['new', 'old']);
  });

  test('caps at maxLen, dropping oldest', () => {
    const result = addEntry([1, 2, 3], 'new', 3);
    expect(result).toEqual(['new', 1, 2]);
  });

  test('does not mutate the input array', () => {
    const original = [1, 2, 3];
    addEntry(original, 'new', 2);
    expect(original).toEqual([1, 2, 3]);
  });

  test('uses DEFAULT_MAX_HISTORY when maxLen is unset', () => {
    const long = Array.from({ length: DEFAULT_MAX_HISTORY }, (_, i) => i);
    const result = addEntry(long, 'new');
    expect(result).toHaveLength(DEFAULT_MAX_HISTORY);
    expect(result[0]).toBe('new');
  });
});

describe('AsyncStorage-backed history', () => {
  afterEach(async () => {
    await clearHistory();
  });

  test('loadHistory returns [] when nothing stored', async () => {
    expect(await loadHistory()).toEqual([]);
  });

  test('saveHistory/loadHistory round trip', async () => {
    await saveHistory([{ id: '1' }, { id: '2' }]);
    expect(await loadHistory()).toEqual([{ id: '1' }, { id: '2' }]);
  });

  test('loadHistory returns [] on corrupted JSON', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem('treelens_history', 'not valid json{{{');
    expect(await loadHistory()).toEqual([]);
  });

  test('appendToHistory composes load+add+save, cap persists across calls', async () => {
    let list = await appendToHistory({ id: '1' }, 2);
    expect(list).toEqual([{ id: '1' }]);
    list = await appendToHistory({ id: '2' }, 2);
    expect(list).toEqual([{ id: '2' }, { id: '1' }]);
    list = await appendToHistory({ id: '3' }, 2);
    expect(list).toEqual([{ id: '3' }, { id: '2' }]);
    expect(await loadHistory()).toEqual([{ id: '3' }, { id: '2' }]);
  });

  test('clearHistory empties storage', async () => {
    await saveHistory([{ id: '1' }]);
    await clearHistory();
    expect(await loadHistory()).toEqual([]);
  });
});
