import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import { FilterChip } from '../components/FilterChip';
import { TrendChart } from '../components/TrendChart';
import {
  countByUserStatus,
  resolutionRate,
  severityShare,
  trendSeries,
  type TrendMode,
} from '../data/adminInsights';
import { useReports } from '../data/reportStore';
import { ScreenContainer } from '../layout/ScreenContainer';
import { useBreakpoint } from '../layout/useBreakpoint';
import { userStatusLabels, type UserStatus } from '../models/report';
import type { AdminTabParamList } from '../navigation';
import { colors, radii, shadows } from '../theme';

type Props = BottomTabScreenProps<AdminTabParamList, 'Dashboard'>;

export function AdminDashboardScreen(_props: Props) {
  const { isWide } = useBreakpoint();
  const reports = useReports();
  const [mode, setMode] = useState<TrendMode>('weekly');

  const byStatus = useMemo(() => countByUserStatus(reports), [reports]);
  const rate = useMemo(() => resolutionRate(reports), [reports]);
  const severity = useMemo(() => severityShare(reports), [reports]);
  const trend = useMemo(() => trendSeries(reports, mode), [reports, mode]);

  const cards: { key: UserStatus | 'total'; label: string; value: number }[] = [
    { key: 'total', label: 'Total', value: reports.length },
    { key: 'pending', label: userStatusLabels.pending, value: byStatus.pending },
    { key: 'inProgress', label: userStatusLabels.inProgress, value: byStatus.inProgress },
    { key: 'resolved', label: userStatusLabels.resolved, value: byStatus.resolved },
  ];

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.scroll}>
      <ScreenContainer>
        <Text style={styles.heading}>Dashboard</Text>
        <Text style={styles.lede}>Live queue from the shared municipal report store.</Text>

        <View style={isWide ? styles.statGrid : styles.statStack}>
          {cards.map((card) => (
            <View key={card.key} style={[styles.statCard, isWide && styles.statCardWide]}>
              <Text style={styles.statLabel}>{card.label}</Text>
              <Text style={styles.statValue}>{card.value}</Text>
            </View>
          ))}
        </View>

        <View style={isWide ? styles.split : undefined}>
          <View style={[styles.panel, isWide && styles.panelHalf]}>
            <Text style={styles.panelTitle}>Severity breakdown</Text>
            {severity.map((item) => (
              <View key={item.severity} style={styles.sevRow}>
                <View style={styles.sevHead}>
                  <Text style={styles.sevLabel}>{item.label}</Text>
                  <Text style={styles.sevCount}>
                    {item.count} · {item.pct}%
                  </Text>
                </View>
                <View style={styles.sevTrack}>
                  <View
                    style={[
                      styles.sevFill,
                      {
                        width: `${Math.max(item.pct, item.count > 0 ? 6 : 0)}%`,
                        backgroundColor:
                          item.severity === 'small'
                            ? colors.pillGreen
                            : item.severity === 'medium'
                              ? colors.pillOrange
                              : colors.pillRed,
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>

          <View style={[styles.panel, isWide && styles.panelHalf]}>
            <Text style={styles.panelTitle}>Resolution rate</Text>
            <Text style={styles.rateValue}>{rate}%</Text>
            <Text style={styles.rateHint}>
              {byStatus.resolved} of {reports.length} reports marked resolved.
            </Text>
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.trendHead}>
            <Text style={styles.panelTitle}>Report trend</Text>
            <View style={styles.trendChips}>
              <FilterChip
                label="Weekly"
                selected={mode === 'weekly'}
                onPress={() => setMode('weekly')}
              />
              <FilterChip
                label="Monthly"
                selected={mode === 'monthly'}
                onPress={() => setMode('monthly')}
              />
            </View>
          </View>
          <Text style={styles.trendHint}>
            {mode === 'weekly' ? 'Reports filed in the last 7 days.' : 'Reports grouped by week over the last 5 weeks.'}
          </Text>
          <TrendChart points={trend} />
        </View>
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
  statStack: {
    gap: 10,
    marginBottom: 16,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    ...shadows.card,
  },
  statCardWide: {
    flexGrow: 1,
    flexBasis: 160,
    minWidth: 140,
  },
  statLabel: {
    color: colors.muted,
    fontWeight: '600',
    fontSize: 13,
  },
  statValue: {
    marginTop: 6,
    fontSize: 28,
    fontWeight: '800',
    color: colors.ink,
  },
  split: {
    flexDirection: 'row',
    gap: 12,
  },
  panel: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 14,
    ...shadows.card,
  },
  panelHalf: {
    flex: 1,
  },
  panelTitle: {
    fontWeight: '800',
    fontSize: 16,
    color: colors.ink,
    marginBottom: 12,
  },
  sevRow: {
    marginBottom: 12,
  },
  sevHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sevLabel: {
    fontWeight: '700',
    color: colors.ink,
  },
  sevCount: {
    color: colors.muted,
    fontSize: 13,
  },
  sevTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.cream,
    overflow: 'hidden',
  },
  sevFill: {
    height: '100%',
    borderRadius: 999,
  },
  rateValue: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.teal,
  },
  rateHint: {
    marginTop: 6,
    color: colors.muted,
  },
  trendHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  trendChips: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  trendHint: {
    color: colors.muted,
    marginBottom: 16,
    marginTop: -4,
  },
});
