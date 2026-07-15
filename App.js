import { useState, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  Image, ScrollView, ActivityIndicator, Alert, Modal, Linking
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';

const API_URL = 'http://192.168.0.19:8000';
const LOCATION_TIMEOUT_MS = 8000;

const theme = {
  bg: '#0D1F0F',
  surface: '#132615',
  card: '#1A3020',
  accent: '#6DBE6F',
  accentDim: '#4A8F4C',
  gold: '#C9A84C',
  red: '#C0514A',
  textPrimary: '#EEF2EE',
  textSecond: '#9BB89D',
  textMuted: '#5A7A5C',
  border: 'rgba(109,190,111,0.12)',
};

export default function App() {
  const [image, setImage] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [location, setLocation] = useState(null);

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

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要相册权限');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!res.canceled) {
      setImage(res.assets[0]);
      setResult(null);
      setLocation(null);
      fetchLocation();
    }
  };

  const openCamera = () => setCameraOpen(true);

  const onCameraCapture = (photo) => {
    setImage(photo);
    setResult(null);
    setLocation(null);
    fetchLocation();
    setCameraOpen(false);
  };

  const identify = async () => {
    console.log('按钮被点击了');
    console.log('image状态：', image);
    if (!image) {
      console.log('没有图片，退出');
      return;
    }
    setLoading(true);
    console.log('开始发请求到：', API_URL);
    try {
      const response_img = await fetch(image.uri);
      console.log('图片fetch结果：', response_img.status);
      const blob = await response_img.blob();
      console.log('blob大小：', blob.size);
  
      const formData = new FormData();
      formData.append('file', blob, 'tree.jpg');
      if (location) {
        formData.append('latitude', String(location.latitude));
        formData.append('longitude', String(location.longitude));
      }

      const response = await fetch(`${API_URL}/identify`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setResult(data);
    } catch (e) {
      console.log('报错了：', e);
      Alert.alert('错误', '无法连接到服务器，请确认后端在运行');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <Text style={styles.appName}>🌿 TreeLens</Text>
      <Text style={styles.subtitle}>北美树木识别</Text>

      {/* Image preview */}
      <View style={styles.imagePicker}>
        {image ? (
          <Image source={{ uri: image.uri }} style={styles.previewImage} />
        ) : (
          <View style={styles.placeholderBox}>
            <Text style={styles.placeholderIcon}>📷</Text>
            <Text style={styles.placeholderText}>请拍照或从相册选择</Text>
          </View>
        )}
      </View>

      {/* Photo source buttons */}
      <View style={styles.sourceRow}>
        <TouchableOpacity style={styles.sourceButton} onPress={openCamera}>
          <Text style={styles.sourceButtonText}>📷 拍照</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sourceButton} onPress={pickImage}>
          <Text style={styles.sourceButtonText}>🖼 从相册选择</Text>
        </TouchableOpacity>
      </View>

      <CameraCaptureModal
        visible={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={onCameraCapture}
      />

      {/* Identify button */}
      {image && !loading && (
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
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back">
            <TouchableOpacity style={styles.cameraCloseButton} onPress={onClose}>
              <Text style={styles.cameraCloseText}>✕</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shutterButton} onPress={handleShutter} />
          </CameraView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 24, paddingTop: 60 },
  appName: { color: theme.accent, fontSize: 28, fontWeight: '700', textAlign: 'center' },
  subtitle: { color: theme.textMuted, fontSize: 14, textAlign: 'center', marginBottom: 24 },
  imagePicker: { borderRadius: 20, overflow: 'hidden', marginBottom: 16, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border },
  placeholderBox: { height: 220, alignItems: 'center', justifyContent: 'center' },
  placeholderIcon: { fontSize: 48, marginBottom: 8 },
  placeholderText: { color: theme.textMuted, fontSize: 16 },
  previewImage: { width: '100%', height: 260 },
  sourceRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  sourceButton: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.card, borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: theme.border },
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