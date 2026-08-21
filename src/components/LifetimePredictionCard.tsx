import { StyleSheet, Text, View } from 'react-native';

import {
  formatReportDate,
  predictLifetime,
  trafficDensityLabels,
  type Report,
} from '../models/report';
import { colors, radii, shadows } from '../theme';

export function LifetimePredictionCard({ report }: { report: Report }) {
  const lifetime = predictLifetime(report);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Pothole lifetime prediction</Text>
      <Text style={styles.value}>{lifetime.daysUntilCritical} days until critical</Text>
      <Text style={styles.meta}>
        Recommended repair deadline: {formatReportDate(lifetime.deadline)}
      </Text>
      <Text style={styles.note}>{lifetime.urgency}</Text>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Traffic density</Text>
        <Text style={styles.rowValue}>{trafficDensityLabels[lifetime.trafficDensity]}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Weather conditions</Text>
        <Text style={styles.rowValue}>
          Rain probability: {lifetime.rainProbability}%, Temp: {lifetime.temperatureC}°C
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
    ...shadows.card,
  },
  title: {
    fontWeight: '800',
    fontSize: 16,
    color: colors.ink,
    marginBottom: 8,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.teal,
  },
  meta: {
    marginTop: 6,
    fontWeight: '600',
    color: colors.ink,
  },
  note: {
    marginTop: 8,
    marginBottom: 12,
    color: colors.muted,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 12,
  },
  rowLabel: {
    width: 140,
    color: colors.muted,
  },
  rowValue: {
    flex: 1,
    fontWeight: '700',
    color: colors.ink,
  },
});
