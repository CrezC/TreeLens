import { StyleSheet, Text, View, TouchableOpacity, Modal } from 'react-native';
import { theme } from './theme';
import { useLanguage } from './LanguageContext';
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS } from './translations';

export default function LanguageModal({ visible, onClose }) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('language.title')}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeText}>{t('common.done')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.list}>
          {SUPPORTED_LANGUAGES.map((code) => (
            <TouchableOpacity
              key={code}
              style={styles.row}
              onPress={() => {
                setLanguage(code);
                onClose();
              }}
            >
              <Text style={styles.rowLabel}>{LANGUAGE_LABELS[code]}</Text>
              {language === code && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: theme.border },
  title: { color: theme.accent, fontSize: 18, fontWeight: '700' },
  closeText: { color: theme.accent, fontSize: 15, fontWeight: '600' },
  list: { padding: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.card, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: theme.border },
  rowLabel: { color: theme.textPrimary, fontSize: 16, fontWeight: '600' },
  checkmark: { color: theme.accent, fontSize: 18, fontWeight: '700' },
});
