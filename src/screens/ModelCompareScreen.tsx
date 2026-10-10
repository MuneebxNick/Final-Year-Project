import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { detectPotholes, mapYoloToDraft, type CompareModel, type YoloDetectResponse } from '../api/detect';
import { PrimaryButton } from '../components/Buttons';
import { PhotoWithBoundingBox } from '../components/PhotoWithBoundingBox';
import { SeverityBadge } from '../components/SeverityBadge';
import { ScreenContainer } from '../layout/ScreenContainer';
import { AuthBackdrop } from '../layout/AuthBackdrop';
import { useBreakpoint } from '../layout/useBreakpoint';
import { webCursor, type WebPressableState } from '../layout/webStyles';
import { severityColors, type OverlayBox } from '../models/report';
import { colors, radii } from '../theme';

const MODELS: { id: CompareModel; label: string; hint: string }[] = [
  { id: 'oldv8n', label: 'oldv8n', hint: 'Current app model' },
  { id: 'newv8s', label: 'newv8s', hint: 'Kaggle YOLOv8s' },
  { id: 'newv8n', label: 'newv8n', hint: 'Kaggle YOLOv8n' },
  { id: 'refrencev8s', label: 'refrencev8s', hint: 'Reference YOLOv8s' },
];

export function ModelCompareScreen() {
  const { isWide } = useBreakpoint();
  const [model, setModel] = useState<CompareModel>('oldv8n');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<YoloDetectResponse | null>(null);
  const [boxes, setBoxes] = useState<OverlayBox[]>([]);

  const pick = async (source: 'camera' | 'gallery') => {
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Camera needed', 'Allow camera access to photograph potholes.');
          return;
        }
        const picked = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: false });
        if (!picked.canceled && picked.assets[0]) {
          setPhotoUri(picked.assets[0].uri);
          setResult(null);
          setBoxes([]);
          setError(null);
        }
        return;
      }

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Photos needed', 'Allow photo library access to upload a pothole image.');
        return;
      }
      const picked = await ImagePicker.launchImageLibraryAsync({
        quality: 0.8,
        mediaTypes: ['images'],
      });
      if (!picked.canceled && picked.assets[0]) {
        setPhotoUri(picked.assets[0].uri);
        setResult(null);
        setBoxes([]);
        setError(null);
      }
    } catch {
      Alert.alert('Could not open the camera or gallery.');
    }
  };

  const analyze = async () => {
    if (!photoUri) {
      Alert.alert('Add a photo first.');
      return;
    }
    setAnalyzing(true);
    setError(null);
    try {
      const next = await detectPotholes(photoUri, model);
      const mapped = await mapYoloToDraft(photoUri, next);
      setResult(next);
      setBoxes(mapped?.boundingBoxes ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Check that the backend is running.';
      setResult(null);
      setBoxes([]);
      setError(message);
      Alert.alert('Could not analyze the photo', message);
    } finally {
      setAnalyzing(false);
    }
  };

  const ordered = [...boxes].sort((a, b) => a.left - b.left);

  return (
    <AuthBackdrop>
    <ScrollView style={styles.flex} contentContainerStyle={styles.scroll}>
      <ScreenContainer>
        <Text style={styles.kicker}>Temporary comparison</Text>
        <Text style={styles.title}>Choose a model</Text>
        <Text style={styles.lede}>
          Pick oldv8n, newv8s, newv8n, or refrencev8s, then run the same analysis used by the app.
          The report screen still uses oldv8n.
        </Text>

        <View style={styles.models}>
          {MODELS.map((item) => {
            const selected = item.id === model;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setModel(item.id)}
                style={(state: WebPressableState) => [
                  styles.model,
                  selected && styles.modelSelected,
                  webCursor,
                  state.pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.modelLabel, selected && styles.modelLabelSelected]}>{item.label}</Text>
                <Text style={[styles.modelHint, selected && styles.modelHintSelected]}>{item.hint}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.photoActions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => pick('camera')}
            style={(state: WebPressableState) => [styles.photoButton, webCursor, state.pressed && styles.pressed]}
          >
            <Text style={styles.photoButtonLabel}>Take photo</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => pick('gallery')}
            style={(state: WebPressableState) => [styles.photoButton, webCursor, state.pressed && styles.pressed]}
          >
            <Text style={styles.photoButtonLabel}>Choose photo</Text>
          </Pressable>
        </View>

        {photoUri ? (
          <PhotoWithBoundingBox
            uri={photoUri}
            boundingBoxes={ordered}
            height={isWide ? 360 : 240}
          />
        ) : (
          <View style={[styles.placeholder, { height: isWide ? 360 : 240 }]}>
            <Text style={styles.placeholderText}>No photo yet</Text>
          </View>
        )}

        <PrimaryButton
          title={`Analyze with ${model}`}
          onPress={analyze}
          loading={analyzing}
          disabled={!photoUri}
          style={styles.analyze}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {result ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {result.model ?? model}
              {result.detections.length === 0
                ? ' · no potholes'
                : ` · ${result.detections.length} detection${result.detections.length === 1 ? '' : 's'}`}
            </Text>
            {result.message ? <Text style={styles.message}>{result.message}</Text> : null}
            {ordered.map((box, index) => (
              <View key={`${box.left}-${box.top}-${index}`} style={styles.row}>
                <View style={[styles.index, { backgroundColor: severityColors[box.severity] }]}>
                  <Text style={styles.indexText}>{index + 1}</Text>
                </View>
                <View style={styles.rowMeta}>
                  <Text style={styles.rowLabel}>Pothole {index + 1}</Text>
                  <Text style={styles.confidence}>
                    {box.confidence != null ? `${box.confidence}% confidence` : 'Confidence unavailable'}
                  </Text>
                </View>
                <SeverityBadge severity={box.severity} />
              </View>
            ))}
          </View>
        ) : null}
      </ScreenContainer>
    </ScrollView>
    </AuthBackdrop>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scroll: {
    flexGrow: 1,
  },
  kicker: {
    color: colors.blue,
    fontWeight: '700',
    letterSpacing: 0.6,
    fontSize: 13,
  },
  title: {
    marginTop: 6,
    fontSize: 28,
    fontWeight: '700',
    color: colors.ink,
  },
  lede: {
    marginTop: 8,
    marginBottom: 20,
    color: colors.muted,
    lineHeight: 22,
  },
  models: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  model: {
    flexGrow: 1,
    flexBasis: '47%',
    backgroundColor: colors.white,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  modelSelected: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  modelLabel: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 14,
  },
  modelLabelSelected: {
    color: colors.white,
  },
  modelHint: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 15,
  },
  modelHintSelected: {
    color: 'rgba(255,255,255,0.75)',
  },
  pressed: {
    opacity: 0.9,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  photoButton: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    alignItems: 'center',
  },
  photoButtonLabel: {
    color: colors.teal,
    fontWeight: '700',
  },
  placeholder: {
    borderRadius: radii.photo,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: colors.muted,
    fontWeight: '600',
  },
  analyze: {
    marginTop: 16,
  },
  error: {
    marginTop: 12,
    color: colors.severityLarge,
  },
  card: {
    marginTop: 16,
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 16,
  },
  message: {
    color: colors.muted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  index: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    color: colors.white,
    fontWeight: '700',
  },
  rowMeta: {
    flex: 1,
  },
  rowLabel: {
    color: colors.ink,
    fontWeight: '700',
  },
  confidence: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 12,
  },
});
