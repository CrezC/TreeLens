import { StyleSheet, Text, View, TouchableOpacity, Image, ScrollView, Modal, Alert } from 'react-native';
import { theme } from './theme';
import { useLanguage } from './LanguageContext';

function formatTimestamp(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function HistoryModal({ visible, onClose, entries, onSelect, onClear }) {
  const { t } = useLanguage();

  const confirmClear = () => {
    Alert.alert(t('history.clearConfirmTitle'), t('history.clearConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('history.clearConfirmButton'), style: 'destructive', onPress: onClear },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('history.title')}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeText}>{t('common.done')}</Text>
          </TouchableOpacity>
        </View>

        {entries.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>{t('history.empty')}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {entries.map((entry) => (
              <TouchableOpacity key={entry.id} style={styles.row} onPress={() => onSelect(entry)}>
                {entry.thumbnailUri ? (
                  <Image source={{ uri: entry.thumbnailUri }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder]}>
                    <Text style={{ fontSize: 20 }}>🌳</Text>
                  </View>
                )}
                <View style={styles.rowText}>
                  <Text style={styles.commonName} numberOfLines={1}>{entry.result?.common_name || t('history.unknownSpecies')}</Text>
                  <Text style={styles.sciName} numberOfLines={1}>{entry.result?.scientific_name}</Text>
                  <Text style={styles.timestamp}>{formatTimestamp(entry.timestamp)}</Text>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.clearButton} onPress={confirmClear}>
              <Text style={styles.clearText}>{t('history.clearHistory')}</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: theme.border },
  title: { color: theme.accent, fontSize: 18, fontWeight: '700' },
  closeText: { color: theme.accent, fontSize: 15, fontWeight: '600' },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: theme.textMuted, fontSize: 15 },
  list: { padding: 16 },
  row: { flexDirection: 'row', backgroundColor: theme.card, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: theme.border, alignItems: 'center' },
  thumb: { width: 52, height: 52, borderRadius: 10, marginRight: 12 },
  thumbPlaceholder: { backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
  commonName: { color: theme.textPrimary, fontSize: 15, fontWeight: '600' },
  sciName: { color: theme.accentDim, fontSize: 13, fontStyle: 'italic', marginTop: 1 },
  timestamp: { color: theme.textMuted, fontSize: 12, marginTop: 4 },
  clearButton: { alignItems: 'center', paddingVertical: 14, marginTop: 8 },
  clearText: { color: theme.red, fontSize: 14, fontWeight: '600' },
});
