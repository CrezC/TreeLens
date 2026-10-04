import { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  Image, ScrollView, ActivityIndicator, Alert, Modal, Linking
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { theme } from './theme';
import { loadHistory, appendToHistory, clearHistory, makeEntry } from './history';
import HistoryModal from './HistoryModal';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const LOCATION_TIMEOUT_MS = 8000;

const SLOTS = [
  { key: 'leaf', label: '叶片近照', icon: '🍃' },
  { key: 'bark', label: '树皮', icon: '🌳' },
  { key: 'full', label: '整树', icon: '🌲' },
];

export default function App() {
  const [images, setImages] = useState({ leaf: null, bark: null, full: null });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState(null);
  const [location, setLocation] = useState(null);
  const [captureDate, setCaptureDate] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    loadHistory().then(setHistoryList);
  }, []);

  const fetchLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const position = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('定位超时')), LOCATION_TIMEOUT_MS)),
      ]);
      setLocation(position.coords);
    } catch (e) {
      console.log('定位失败：', e);
    }
  };

  const handleNewPhoto = (slotKey, asset) => {
    const isFirstOfRound = Object.values(images).every((v) => !v);
    if (isFirstOfRound) {
      setResult(null);
      setLocation(null);
      setCaptureDate(new Date().toISOString());
      fetchLocation();
    }
    setImages((prev) => ({ ...prev, [slotKey]: asset }));
  };

  const pickImage = async (slotKey) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要相册权限');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!res.canceled) {
      handleNewPhoto(slotKey, res.assets[0]);
    }
  };

  const openCamera = (slotKey) => {
    setActiveSlot(slotKey);
    setCameraOpen(true);
  };

  const onCameraCapture = (photo) => {
    handleNewPhoto(activeSlot, photo);
    setCameraOpen(false);
  };

  const chooseSource = (slot) => {
    Alert.alert(slot.label, undefined, [
      { text: '拍照', onPress: () => openCamera(slot.key) },
      { text: '从相册选择', onPress: () => pickImage(slot.key) },
      { text: '取消', style: 'cancel' },
    ]);
  };

  const identify = async () => {
    const filledSlots = SLOTS.filter((slot) => images[slot.key]);
    if (filledSlots.length === 0) {
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      for (const slot of filledSlots) {
        const res = await fetch(images[slot.key].uri);
        const blob = await res.blob();
        formData.append('files', blob, `${slot.key}.jpg`);
      }
      if (location) {
        formData.append('latitude', String(location.latitude));
        formData.append('longitude', String(location.longitude));
      }
      formData.append('capture_date', captureDate || new Date().toISOString());

      const response = await fetch(`${API_URL}/identify`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        let detail = `服务器错误（${response.status}）`;
        try {
          const errBody = await response.json();
          if (errBody?.detail) detail = errBody.detail;
        } catch {}
        throw new Error(detail);
      }
      const data = await response.json();
      setResult(data);
      if (!data.error) {
        try {
          const entry = makeEntry({ result: data, images, latitude: location?.latitude, longitude: location?.longitude, captureDate });
          setHistoryList(await appendToHistory(entry));
        } catch (e) {
          console.log('保存历史记录失败：', e);
        }
      }
    } catch (e) {
      console.log('报错了：', e);
      const isNetworkError = e instanceof TypeError;
      Alert.alert('错误', isNetworkError ? '无法连接到服务器，请确认后端在运行' : e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <TouchableOpacity style={styles.historyButton} onPress={() => setHistoryOpen(true)}>
        <Text style={styles.historyButtonText}>🕘</Text>
      </TouchableOpacity>
      <Text style={styles.appName}>🌿 TreeLens</Text>
      <Text style={styles.subtitle}>北美树木识别</Text>

      <HistoryModal
        visible={historyOpen}
        onClose={() => setHistoryOpen(false)}
        entries={historyList}
        onSelect={(entry) => {
          setResult(entry.result);
          setHistoryOpen(false);
        }}
        onClear={async () => {
          await clearHistory();
          setHistoryList([]);
        }}
      />

      {/* Photo slots */}
      <Text style={styles.slotsHint}>至少选择一张照片，多角度拍摄可提升识别准确度</Text>
      <View style={styles.slotsRow}>
        {SLOTS.map((slot) => (
          <TouchableOpacity key={slot.key} style={styles.slotBox} onPress={() => chooseSource(slot)}>
            {images[slot.key] ? (
              <Image source={{ uri: images[slot.key].uri }} style={styles.slotImage} />
            ) : (
              <>
                <Text style={styles.slotIcon}>{slot.icon}</Text>
                <Text style={styles.slotLabel}>{slot.label}</Text>
              </>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <CameraCaptureModal
        visible={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={onCameraCapture}
      />

      {/* Identify button */}
      {SLOTS.some((slot) => images[slot.key]) && !loading && (
        <TouchableOpacity style={styles.button} onPress={identify}>
          <Text style={styles.buttonText}>识别这棵树</Text>
        </TouchableOpacity>
      )}

      {/* Loading */}
      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={styles.loadingText}>正在分析...</Text>
        </View>
      )}

      {/* Result */}
      {result && !result.error && (
        <View style={styles.resultBox}>
          {/* Tree name */}
          <View style={styles.nameRow}>
            <View>
              <Text style={styles.commonName}>{result.common_name}</Text>
              <Text style={styles.sciName}>{result.scientific_name}</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{result.conservation_code}</Text>
            </View>
          </View>

          {/* Confidence */}
          <Text style={styles.confidence}>识别置信度：{result.confidence}%</Text>

          {/* Compare with reference photo */}
          {result.reference_image && (
            <View style={styles.compareRow}>
              {(images.leaf || images.full || images.bark) && (
                <View style={styles.compareCol}>
                  <Image
                    source={{ uri: (images.leaf || images.full || images.bark).uri }}
                    style={styles.compareImage}
                  />
                  <Text style={styles.compareLabel}>你的照片</Text>
                </View>
              )}
              <View style={styles.compareCol}>
                <TouchableOpacity onPress={() => Linking.openURL(result.reference_image.page_url)}>
                  <Image source={{ uri: result.reference_image.thumbnail_url }} style={styles.compareImage} />
                </TouchableOpacity>
                <Text style={styles.compareLabel}>参考图 · {result.reference_image.attribution}</Text>
              </View>
            </View>
          )}

          {/* Description */}
          <Text style={styles.sectionTitle}>简介</Text>
          <Text style={styles.bodyText}>{result.description}</Text>

          {/* Alerts */}
          {result.allergen?.is_allergen && (
            <View style={[styles.alertCard, { borderColor: theme.gold }]}>
              <Text style={[styles.alertTitle, { color: theme.gold }]}>🤧 过敏风险</Text>
              <Text style={styles.bodyText}>{result.allergen.details}</Text>
            </View>
          )}
          {result.toxicity?.is_toxic && (
            <View style={[styles.alertCard, { borderColor: theme.red }]}>
              <Text style={[styles.alertTitle, { color: theme.red }]}>⚠️ 毒性警告</Text>
              <Text style={styles.bodyText}>{result.toxicity.details}</Text>
            </View>
          )}

          {/* Medicinal */}
          {result.medicinal_uses?.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>💊 药用价值</Text>
              {result.medicinal_uses.map((m, i) => (
                <View key={i} style={styles.medRow}>
                  <Text style={styles.medUse}>{m.use}</Text>
                  <Text style={styles.bodyText}>{m.detail}</Text>
                </View>
              ))}
            </>
          )}

          {/* Ecology */}
          {result.ecology?.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>🌍 生态信息</Text>
              {result.ecology.map((e, i) => (
                <View key={i} style={styles.ecoRow}>
                  <Text style={styles.ecoLabel}>{e.label}</Text>
                  <Text style={styles.bodyText}>{e.value}</Text>
                </View>
              ))}
            </>
          )}
        </View>
      )}

      {result?.error && (
        <Text style={styles.errorText}>未能识别，请换一张更清晰的照片</Text>
      )}
    </ScrollView>
  );
}

function CameraCaptureModal({ visible, onClose, onCapture }) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  const handleShutter = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      onCapture(photo);
    } catch (e) {
      console.log('拍照失败：', e);
      Alert.alert('拍照失败', '此设备可能不支持相机，请改用相册选择照片');
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={styles.cameraContainer}>
        {!permission ? (
          <View style={styles.cameraPermissionBox} />
        ) : !permission.granted ? (
          <View style={styles.cameraPermissionBox}>
            <Text style={styles.placeholderIcon}>📷</Text>
            <Text style={styles.permissionText}>TreeLens 需要访问相机来拍摄树木照片</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={permission.canAskAgain ? requestPermission : () => Linking.openSettings()}
            >
              <Text style={styles.buttonText}>
                {permission.canAskAgain ? '允许访问相机' : '前往设置开启权限'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={{ marginTop: 16 }}>
              <Text style={styles.sourceButtonText}>取消</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
            <TouchableOpacity style={styles.cameraCloseButton} onPress={onClose}>
              <Text style={styles.cameraCloseText}>✕</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shutterButton} onPress={handleShutter} />
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 24, paddingTop: 60 },
  historyButton: { position: 'absolute', top: 56, right: 24, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border },
  historyButtonText: { fontSize: 16 },
  appName: { color: theme.accent, fontSize: 28, fontWeight: '700', textAlign: 'center' },
  subtitle: { color: theme.textMuted, fontSize: 14, textAlign: 'center', marginBottom: 24 },
  slotsHint: { color: theme.textMuted, fontSize: 13, textAlign: 'center', marginBottom: 12 },
  slotsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  slotBox: { flex: 1, height: 120, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border },
  slotImage: { width: '100%', height: '100%' },
  slotIcon: { fontSize: 28, marginBottom: 6 },
  slotLabel: { color: theme.textMuted, fontSize: 13 },
  placeholderIcon: { fontSize: 48, marginBottom: 8 },
  sourceButtonText: { color: theme.textPrimary, fontSize: 15, fontWeight: '600' },
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  cameraPermissionBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: theme.bg },
  permissionText: { color: theme.textSecond, fontSize: 15, textAlign: 'center', marginVertical: 16 },
  cameraCloseButton: { position: 'absolute', top: 50, left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  cameraCloseText: { color: '#fff', fontSize: 18 },
  shutterButton: { position: 'absolute', bottom: 40, alignSelf: 'center', width: 76, height: 76, borderRadius: 38, backgroundColor: '#fff', borderWidth: 4, borderColor: theme.accent },
  button: { backgroundColor: theme.accent, borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: theme.bg, fontSize: 16, fontWeight: '700' },
  loadingBox: { alignItems: 'center', padding: 32 },
  loadingText: { color: theme.textSecond, marginTop: 12, fontSize: 15 },
  resultBox: { backgroundColor: theme.card, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: theme.border },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  commonName: { color: theme.textPrimary, fontSize: 22, fontWeight: '700' },
  sciName: { color: theme.accentDim, fontSize: 14, fontStyle: 'italic', marginTop: 2 },
  badge: { backgroundColor: 'rgba(109,190,111,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: theme.accent },
  badgeText: { color: theme.accent, fontWeight: '700', fontSize: 14 },
  confidence: { color: theme.textMuted, fontSize: 13, marginBottom: 16 },
  compareRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  compareCol: { flex: 1 },
  compareImage: { width: '100%', height: 140, borderRadius: 12, backgroundColor: theme.surface },
  compareLabel: { color: theme.textMuted, fontSize: 12, marginTop: 6, textAlign: 'center' },
  sectionTitle: { color: theme.accent, fontSize: 15, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  bodyText: { color: theme.textSecond, fontSize: 14, lineHeight: 22 },
  alertCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 12 },
  alertTitle: { fontSize: 15, fontWeight: '600', marginBottom: 6 },
  medRow: { backgroundColor: theme.surface, borderRadius: 10, padding: 12, marginBottom: 8 },
  medUse: { color: theme.accent, fontSize: 14, fontWeight: '600', marginBottom: 4 },
  ecoRow: { marginBottom: 10 },
  ecoLabel: { color: theme.textMuted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  errorText: { color: theme.red, textAlign: 'center', fontSize: 15, marginTop: 20 },
});