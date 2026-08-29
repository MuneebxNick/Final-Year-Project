import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fetchLifetimePrediction, type LifetimePredictResponse } from '../api/predict';
import {
  formatReportDate,
  isLowConfidence,
  overlayBoxesForReport,
  severityRank,
  trafficDensityFromRoadType,
  trafficDensityLabels,
  type Report,
} from '../models/report';
import { colors, radii, shadows } from '../theme';

function formatDeadline(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) return isoDate;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return formatReportDate(new Date(year, month - 1, day));
}

/** 1-based index matching photo overlay numbers from overlayBoxesForReport. */
function worstPotholeIndex(report: Report): number {
  const boxes = overlayBoxesForReport(report);
  const matched = boxes.findIndex(
    (box) => box.left === report.boundingBox.left && box.top === report.boundingBox.top,
  );
  if (matched >= 0) return matched + 1;

  let worst = 0;
  boxes.forEach((box, index) => {
    if (severityRank[box.severity] > severityRank[boxes[worst].severity]) {
      worst = index;
    }
  });
  return worst + 1;
}

export function LifetimePredictionCard({ report }: { report: Report }) {
  const [lifetime, setLifetime] = useState<LifetimePredictResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const trafficDensity = trafficDensityFromRoadType(report.roadType);
  const potholeIndex = worstPotholeIndex(report);
  const lowConfidence = isLowConfidence(report);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setLifetime(null);

    fetchLifetimePrediction(report)
      .then((result) => {
        if (!cancelled) setLifetime(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof Error && err.message.trim()
            ? err.message.trim()
            : 'Could not load prediction.';
        setError(message.length > 120 ? 'Could not load prediction.' : message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [report.id]);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Pothole lifetime prediction</Text>
      <Text style={styles.potholeIndex}>Worst detected pothole (#{potholeIndex})</Text>
      {lowConfidence ? (
        <>
          <Text style={styles.reliability}>Prediction reliability: Low</Text>
          <Text style={styles.warning}>
            Review detections on the photo before relying on this prediction.
          </Text>
        </>
      ) : null}
      {loading ? (
        <Text style={styles.note}>Loading prediction…</Text>
      ) : error ? (
        <Text style={styles.note}>{error}</Text>
      ) : lifetime ? (
        <>
          <Text style={styles.value}>{lifetime.daysUntilCritical} days until critical</Text>
          <Text style={styles.meta}>
            Recommended repair deadline: {formatDeadline(lifetime.recommendedRepairDeadline)}
          </Text>
          <Text style={styles.note}>{lifetime.urgencyNote}</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Traffic density</Text>
            <Text style={styles.rowValue}>{trafficDensityLabels[trafficDensity]}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Weather conditions</Text>
            <Text style={styles.rowValue}>
              Rain probability: {lifetime.weather.rainfallProbability}%, Temp:{' '}
              {Math.round(lifetime.weather.temperatureCelsius)}°C, {lifetime.weather.season}
            </Text>
          </View>
        </>
      ) : null}
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
  potholeIndex: {
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 6,
  },
  reliability: {
    fontWeight: '700',
    color: colors.pillRed,
  },
  warning: {
    marginTop: 4,
    marginBottom: 8,
    color: colors.muted,
    lineHeight: 20,
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
