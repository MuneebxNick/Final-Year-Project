import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  fetchLifetimePrediction,
  type LifetimePriorityBand,
  type LifetimePredictResponse,
} from '../api/predict';
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

const bandColors: Record<LifetimePriorityBand, { bg: string; fg: string }> = {
  Critical: { bg: '#FDECEC', fg: colors.pillRed },
  High: { bg: '#FFF3E6', fg: colors.pillOrange },
  Moderate: { bg: '#EEF6F8', fg: colors.tealMid },
  Routine: { bg: '#EAF7F0', fg: colors.pillGreen },
};

function priorityBand(lifetime: LifetimePredictResponse): LifetimePriorityBand {
  return lifetime.priorityBand ?? lifetime.urgencyNote;
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

  const band = lifetime ? priorityBand(lifetime) : null;
  const badge = band ? bandColors[band] : null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Risk-based repair priority</Text>
      <Text style={styles.subtitle}>
        Recommended maintenance SLA window from severity, road class, and live weather — not a
        physical failure date from the photo alone.
      </Text>
      <Text style={styles.potholeIndex}>Worst detected pothole (#{potholeIndex})</Text>
      {lowConfidence ? (
        <>
          <Text style={styles.reliability}>Prediction reliability: Low</Text>
          <Text style={styles.warning}>
            Review detections on the photo before relying on this priority window.
          </Text>
        </>
      ) : null}
      {loading ? (
        <Text style={styles.note}>Loading repair window…</Text>
      ) : error ? (
        <Text style={styles.note}>{error}</Text>
      ) : lifetime && band && badge ? (
        <>
          <View style={styles.bandRow}>
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.fg }]}>{band}</Text>
            </View>
            <Text style={styles.windowLabel}>Recommended repair window</Text>
          </View>
          <Text style={styles.value}>{lifetime.daysUntilCritical} days</Text>
          <Text style={styles.meta}>
            Target by {formatDeadline(lifetime.recommendedRepairDeadline)}
          </Text>
          <Text style={styles.factors}>
            {lifetime.contributingFactors ||
              `Severity · Road class · Rain & Temp (${Math.round(lifetime.weather.temperatureCelsius)}°C)`}
          </Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Road / traffic tier</Text>
            <Text style={styles.rowValue}>
              {lifetime.inputs.roadType} ({trafficDensityLabels[trafficDensity]})
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Weather conditions</Text>
            <Text style={styles.rowValue}>
              {lifetime.weather.condition ? `${lifetime.weather.condition}, ` : ''}
              Rain {lifetime.weather.rainfallProbability}%, Temp{' '}
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
    marginBottom: 6,
  },
  subtitle: {
    color: colors.muted,
    lineHeight: 20,
    marginBottom: 10,
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
  bandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    marginBottom: 6,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.chip,
  },
  badgeText: {
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.2,
  },
  windowLabel: {
    flex: 1,
    fontWeight: '600',
    color: colors.muted,
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.teal,
  },
  meta: {
    marginTop: 6,
    fontWeight: '600',
    color: colors.ink,
  },
  factors: {
    marginTop: 8,
    marginBottom: 8,
    color: colors.muted,
    lineHeight: 20,
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
