import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import { fetchPredictiveMaintenance } from '../api/predict';
import { formatPkr } from '../data/adminInsights';
import { ScreenContainer } from '../layout/ScreenContainer';
import {
  predictiveCategories,
  predictiveCategoryLabels,
  type PredictiveCategory,
  type PredictiveSegment,
  type PredictiveTrend,
} from '../models/report';
import type { AdminTabParamList } from '../navigation';
import { colors, radii, shadows } from '../theme';

type Props = BottomTabScreenProps<AdminTabParamList, 'Predictive'>;

const CATEGORY_COLOR: Record<PredictiveCategory, string> = {
  urgent: colors.pillRed,
  planRepair: colors.pillOrange,
  monitor: colors.pillGreen,
};

const TREND_LABEL: Record<PredictiveTrend, string> = {
  increasing: 'Increasing',
  decreasing: 'Decreasing',
  stable: 'Stable',
};

const TREND_ICON: Record<PredictiveTrend, keyof typeof Ionicons.glyphMap> = {
  increasing: 'trending-up',
  decreasing: 'trending-down',
  stable: 'remove',
};

const TREND_COLOR: Record<PredictiveTrend, string> = {
  increasing: colors.pillRed,
  decreasing: colors.pillGreen,
  stable: colors.muted,
};

function isHighRisk(riskWindow: string): boolean {
  return riskWindow.startsWith('High');
}

export function AdminPredictiveScreen(_props: Props) {
  const [segments, setSegments] = useState<PredictiveSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const retry = useCallback(() => {
    setRetryKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchPredictiveMaintenance()
      .then((result) => {
        if (!cancelled) setSegments(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof Error && err.message.trim()
            ? err.message.trim()
            : 'Could not load forecasts.';
        setError(message.length > 120 ? 'Could not load forecasts.' : message);
        setSegments([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.scroll}>
      <ScreenContainer>
        <Text style={styles.heading}>Predictive maintenance</Text>
        <Text style={styles.lede}>
          Forecasts from the maintenance model, grouped by urgency. Budgets are illustrative only.
        </Text>

        {loading ? (
          <View style={styles.statusBlock}>
            <ActivityIndicator color={colors.teal} />
          </View>
        ) : error ? (
          <Pressable onPress={retry} style={styles.statusBlock} accessibilityRole="button">
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.retryText}>Tap to retry</Text>
          </Pressable>
        ) : (
          predictiveCategories.map((category) => {
            const items = segments.filter((segment) => segment.category === category);
            return (
              <View key={category} style={styles.group}>
                <View style={styles.groupHead}>
                  <View style={[styles.dot, { backgroundColor: CATEGORY_COLOR[category] }]} />
                  <Text style={styles.groupTitle}>{predictiveCategoryLabels[category]}</Text>
                  <Text style={styles.groupCount}>{items.length}</Text>
                </View>
                {items.length === 0 ? (
                  <Text style={styles.empty}>No segments in this band.</Text>
                ) : (
                  items.map((segment) => (
                    <View key={segment.id} style={styles.card}>
                      <View style={styles.riskRow}>
                        {isHighRisk(segment.riskWindow) ? (
                          <Ionicons name="warning" size={18} color={colors.pillRed} />
                        ) : null}
                        <Text
                          style={[
                            styles.riskWindow,
                            isHighRisk(segment.riskWindow) && styles.riskWindowHigh,
                          ]}
                        >
                          {segment.riskWindow}
                        </Text>
                      </View>
                      <Text style={styles.city}>{segment.city}</Text>
                      <Text style={styles.area}>{segment.area}</Text>
                      <Text style={styles.count}>
                        ~{segment.predictedReportsNext30Days} reports expected in next 30 days
                      </Text>
                      <View style={styles.trendRow}>
                        <Ionicons
                          name={TREND_ICON[segment.trendDirection]}
                          size={16}
                          color={TREND_COLOR[segment.trendDirection]}
                        />
                        <Text
                          style={[
                            styles.trend,
                            { color: TREND_COLOR[segment.trendDirection] },
                          ]}
                        >
                          {TREND_LABEL[segment.trendDirection]}
                        </Text>
                      </View>
                      <Text style={styles.historical}>
                        Historical avg: {segment.historicalAvgReportsPer30Days} reports / 30 days
                      </Text>
                      <Text style={styles.budget}>{formatPkr(segment.budgetPkr)}</Text>
                    </View>
                  ))
                )}
              </View>
            );
          })
        )}
      </ScreenContainer>
    </ScrollView>
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
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.ink,
  },
  lede: {
    marginTop: 4,
    marginBottom: 16,
    color: colors.muted,
  },
  statusBlock: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  errorText: {
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryText: {
    color: colors.ink,
    fontWeight: '700',
    marginTop: 4,
  },
  group: {
    marginBottom: 20,
  },
  groupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  groupTitle: {
    flex: 1,
    fontWeight: '800',
    fontSize: 16,
    color: colors.ink,
  },
  groupCount: {
    color: colors.muted,
    fontWeight: '700',
  },
  empty: {
    color: colors.muted,
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 10,
    ...shadows.card,
  },
  city: {
    fontWeight: '800',
    fontSize: 16,
    color: colors.ink,
  },
  area: {
    marginTop: 4,
    color: colors.muted,
  },
  riskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  riskWindow: {
    flex: 1,
    fontWeight: '700',
    color: colors.ink,
  },
  riskWindowHigh: {
    color: colors.pillRed,
  },
  count: {
    marginTop: 10,
    color: colors.ink,
    fontWeight: '600',
    lineHeight: 20,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  trend: {
    fontWeight: '700',
  },
  historical: {
    marginTop: 8,
    color: colors.muted,
    fontWeight: '600',
  },
  budget: {
    marginTop: 12,
    fontWeight: '800',
    color: colors.teal,
  },
});
