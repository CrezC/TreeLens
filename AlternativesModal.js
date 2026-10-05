import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ScrollView, Modal, Linking } from 'react-native';
import { theme } from './theme';
import { useLanguage } from './LanguageContext';

export default function AlternativesModal({ visible, onClose, mainResult, alternatives }) {
  const { t } = useLanguage();
  const [brokenUrls, setBrokenUrls] = useState(() => new Set());
  const markBroken = (url) => setBrokenUrls((prev) => new Set(prev).add(url));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('alternatives.title')}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeText}>{t('common.done')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.list}>
          {mainResult && (
            <Text style={styles.intro}>
              {t('alternatives.intro', { name: mainResult.common_name, confidence: mainResult.confidence })}
            </Text>
          )}

          {(alternatives || []).map((alt, i) => (
            <View key={i} style={styles.card}>
              {alt.reference_image && !brokenUrls.has(alt.reference_image.thumbnail_url) ? (
                <TouchableOpacity onPress={() => Linking.openURL(alt.reference_image.page_url)}>
                  <Image
                    source={{ uri: alt.reference_image.thumbnail_url }}
                    style={styles.image}
                    onError={() => markBroken(alt.reference_image.thumbnail_url)}
                  />
                </TouchableOpacity>
              ) : (
                <View style={[styles.image, styles.imagePlaceholder]}>
                  <Text style={{ fontSize: 36 }}>🌳</Text>
                </View>
              )}
              <View style={styles.nameRow}>
                <Text style={styles.commonName}>{alt.common_name}</Text>
                <Text style={styles.confidence}>{alt.confidence}%</Text>
              </View>
              <Text style={styles.sciName}>{alt.scientific_name}</Text>
              <Text style={styles.reason}>{alt.reason}</Text>
              {alt.reference_image && (
                <TouchableOpacity onPress={() => Linking.openURL(alt.reference_image.page_url)}>
                  <Text style={styles.link}>{t('alternatives.viewOnWikipedia')}</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
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
  intro: { color: theme.textSecond, fontSize: 13, lineHeight: 20, marginBottom: 16 },
  card: { backgroundColor: theme.card, borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: theme.border },
  image: { width: '100%', height: 160, borderRadius: 12, marginBottom: 12, backgroundColor: theme.surface },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  commonName: { color: theme.textPrimary, fontSize: 17, fontWeight: '700' },
  confidence: { color: theme.textMuted, fontSize: 14, fontWeight: '600' },
  sciName: { color: theme.accentDim, fontSize: 13, fontStyle: 'italic', marginTop: 2 },
  reason: { color: theme.textSecond, fontSize: 14, lineHeight: 21, marginTop: 8 },
  link: { color: theme.accent, fontSize: 13, fontWeight: '600', marginTop: 10 },
});
