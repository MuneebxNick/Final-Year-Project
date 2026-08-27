import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { PhotoWithBoundingBox } from '../components/PhotoWithBoundingBox';
import { PrimaryButton } from '../components/Buttons';
import { SeverityBadge } from '../components/SeverityBadge';
import { uploadReportPhoto } from '../api/cloudinary';
import { markFormReset, reportStore } from '../data/reportStore';
import { ScreenContainer } from '../layout/ScreenContainer';
import { useBreakpoint } from '../layout/useBreakpoint';
import { roadTypeLabels, severityColors } from '../models/report';
import type { RootStackParamList } from '../navigation';
import { colors, radii, shadows } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DetectionResult'>;

export function DetectionResultScreen({ navigation, route }: Props) {
  const { isWide } = useBreakpoint();
  const { draft } = route.params;
  const potholes =
    draft.boundingBoxes && draft.boundingBoxes.length > 0
      ? [...draft.boundingBoxes].sort((a, b) => a.left - b.left)
      : [{ ...draft.boundingBox, severity: draft.severity, confidence: draft.confidence }];
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const photo = await uploadReportPhoto(draft.photoUri);
      await reportStore.submit({ ...draft, boundingBoxes: potholes }, photo);
      markFormReset();
      navigation.reset({
        index: 0,
        routes: [{ name: 'UserTabs', params: { screen: 'MyReports' } }],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Try again in a moment.';
      setSubmitError(message);
      Alert.alert('Could not submit the report', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.scroll}>
      <ScreenContainer>
      <Text style={styles.kicker}>AI detection</Text>
      <Text style={styles.title}>
        {(potholes.length > 1 ? 'Potholes detected' : 'Pothole detected')}
      </Text>
      <Text style={styles.lede}>
        Each numbered outline is one pothole, with its own severity and confidence.
      </Text>

      <View style={isWide ? styles.split : undefined}>
      <View style={isWide ? styles.left : undefined}>
      <PhotoWithBoundingBox
        uri={draft.photoUri}
        boundingBox={draft.boundingBox}
        boundingBoxes={potholes}
        height={isWide ? 360 : 240}
      />
      </View>

      <View style={isWide ? styles.right : undefined}>
      <View style={styles.potholeList}>
        {potholes.map((pothole, index) => (
          <View key={`${pothole.left}-${pothole.top}-${index}`} style={styles.potholeRow}>
            <View style={[styles.potholeIndex, { backgroundColor: severityColors[pothole.severity] }]}>
              <Text style={styles.potholeIndexText}>{index + 1}</Text>
            </View>
            <View style={styles.potholeMeta}>
              <Text style={styles.metaLabel}>Pothole {index + 1}</Text>
              <SeverityBadge severity={pothole.severity} />
            </View>
            <View style={styles.potholeScore}>
              <Text style={styles.metaLabel}>Confidence</Text>
              <Text style={styles.potholeConfidence}>{pothole.confidence ?? draft.confidence}%</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Location summary</Text>
        <SummaryRow label="City" value={draft.city} />
        <SummaryRow label="Area" value={draft.area} />
        <SummaryRow label="Road type" value={roadTypeLabels[draft.roadType]} />
        <SummaryRow label="Address" value={draft.address} />
        {draft.landmark ? <SummaryRow label="Landmark" value={draft.landmark} /> : null}
        {draft.description ? <SummaryRow label="Notes" value={draft.description} /> : null}
      </View>

      {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}
      <PrimaryButton title="Submit Report" onPress={submit} loading={submitting} />
      </View>
      </View>
      </ScreenContainer>
    </ScrollView>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
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
  split: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 28,
  },
  left: {
    flex: 1.1,
  },
  right: {
    flex: 1,
  },
  kicker: {
    color: colors.blue,
    fontWeight: '700',
    fontSize: 13,
  },
  title: {
    marginTop: 4,
    fontSize: 26,
    fontWeight: '700',
    color: colors.ink,
  },
  lede: {
    marginTop: 8,
    marginBottom: 20,
    color: colors.muted,
    lineHeight: 20,
  },
  potholeList: {
    marginTop: 18,
    gap: 12,
  },
  potholeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: 12,
  },
  potholeIndex: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  potholeIndexText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 14,
  },
  potholeMeta: {
    flex: 1,
  },
  potholeScore: {
    alignItems: 'flex-end',
  },
  potholeConfidence: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.teal,
  },
  row: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  metaLabel: {
    color: colors.muted,
    marginBottom: 6,
    fontSize: 13,
  },
  confidence: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.teal,
  },
  card: {
    marginTop: 20,
    marginBottom: 24,
    backgroundColor: colors.white,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    ...shadows.card,
  },
  cardTitle: {
    fontWeight: '700',
    fontSize: 16,
    color: colors.ink,
    marginBottom: 12,
  },
  submitError: {
    marginBottom: 12,
    color: colors.severityLarge,
    lineHeight: 20,
  },
  summaryRow: {
    marginBottom: 10,
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 12,
  },
  summaryValue: {
    marginTop: 2,
    fontWeight: '700',
    color: colors.ink,
  },
});
