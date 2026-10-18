import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import { FilterChip } from '../components/FilterChip';
import { CompositionBar, DonutChart, RingGauge, ShareBars, type ColoredSlice } from '../components/ShareCharts';
import { TrendChart, type ColumnPoint } from '../components/TrendChart';
import {
  areaShare,
  countByUserStatus,
  periodDeltaLabel,
  periodTotals,
  resolutionRate,
  roadShare,
  severityShare,
  severityTrend,
  statusShare,
  trendSeries,
  type ShareSlice,
  type TrendMode,
} from '../data/adminInsights';
import { useReports } from '../data/reportStore';
import { ScreenContainer } from '../layout/ScreenContainer';
import { AuthBackdrop } from '../layout/AuthBackdrop';
import { useBreakpoint } from '../layout/useBreakpoint';
import {
  severityColors,
  userStatusColors,
  type RoadType,
  type Severity,
  type UserStatus,
} from '../models/report';
import type { AdminTabParamList } from '../navigation';
import { colors, radii, shadows } from '../theme';

type Props = BottomTabScreenProps<AdminTabParamList, 'Dashboard'>;

const CITY_COLORS = ['#00C4B4', '#1B365D', '#E08A1E', '#1B9A5B', '#1A5C68', '#7A8F96'];

const ROAD_COLORS: Record<RoadType, string> = {
  highway: '#1B365D',
  serviceRoad: '#00C4B4',
  localRoad: '#E08A1E',
};

const SEVERITY_LEGEND = [
  { key: 'small', label: 'Small', color: severityColors.small },
  { key: 'medium', label: 'Medium', color: severityColors.medium },
  { key: 'large', label: 'Large', color: severityColors.large },
] as const;

function paint(slices: ShareSlice[], colorOf: (slice: ShareSlice, index: number) => string): ColoredSlice[] {
  return slices.map((slice, index) => ({ ...slice, color: colorOf(slice, index) }));
}

export function AdminDashboardScreen(_props: Props) {
  const { isWide } = useBreakpoint();
  const reports = useReports();
  const [mode, setMode] = useState<TrendMode>('weekly');

  const byStatus = useMemo(() => countByUserStatus(reports), [reports]);
  const rate = useMemo(() => resolutionRate(reports), [reports]);
  const severity = useMemo(
    () =>
      paint(severityShare(reports), (slice) => severityColors[slice.key as Severity]),
    [reports],
  );
  const status = useMemo(
    () => paint(statusShare(reports), (slice) => userStatusColors[slice.key as UserStatus]),
    [reports],
  );
  const areas = useMemo(
    () => paint(areaShare(reports), (_slice, index) => CITY_COLORS[index % CITY_COLORS.length]),
    [reports],
  );
  const roads = useMemo(
    () => paint(roadShare(reports), (slice) => ROAD_COLORS[slice.key as RoadType]),
    [reports],
  );
  const trend = useMemo(() => trendSeries(reports, mode), [reports, mode]);
  const bySeverity = useMemo(() => severityTrend(reports, mode), [reports, mode]);
  const totals = useMemo(() => periodTotals(reports, mode), [reports, mode]);
  const delta = totals.current - totals.previous;
  const deltaColor = delta > 0 ? colors.pillRed : delta < 0 ? colors.pillGreen : colors.muted;

  const cards: { key: UserStatus | 'total'; label: string; value: number }[] = [
    { key: 'total', label: 'Total', value: reports.length },
    { key: 'pending', label: 'Pending', value: byStatus.pending },
    { key: 'inProgress', label: 'In Progress', value: byStatus.inProgress },
    { key: 'completed', label: 'Awaiting verification', value: byStatus.completed },
    { key: 'resolved', label: 'Resolved', value: byStatus.resolved },
  ];

  const volume: ColumnPoint[] = trend.map((point) => ({
    label: point.label,
    segments: [{ key: 'filings', value: point.count, color: colors.blueMid }],
  }));

  const stacked: ColumnPoint[] = bySeverity.map((point) => ({
    label: point.label,
    segments: [
      { key: 'small', value: point.small, color: severityColors.small },
      { key: 'medium', value: point.medium, color: severityColors.medium },
      { key: 'large', value: point.large, color: severityColors.large },
    ],
  }));

  return (
    <AuthBackdrop>
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
              <ShareBars items={severity} showPercent={false} />
            </View>

            <View style={[styles.panel, isWide && styles.panelHalf]}>
              <Text style={styles.panelTitle}>Resolution rate</Text>
              <View style={styles.rateBody}>
                <RingGauge
                  value={rate}
                  caption={`${byStatus.resolved} of ${reports.length} reports marked resolved.`}
                />
              </View>
            </View>
          </View>

          <View style={isWide ? styles.split : undefined}>
            <View style={[styles.panel, isWide && styles.panelHalf]}>
              <Text style={styles.panelTitle}>Queue mix</Text>
              <DonutChart
                slices={status}
                centerValue={String(reports.length)}
                centerLabel="Reports"
                showPercent={false}
              />
            </View>

            <View style={[styles.panel, isWide && styles.panelHalf]}>
              <Text style={styles.panelTitle}>Reports by area</Text>
              <ShareBars items={areas} showPercent={false} />
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
              {mode === 'weekly'
                ? 'Reports filed in the last 7 days.'
                : 'Reports grouped by calendar month over the last 6 months.'}
            </Text>
            <Text style={[styles.delta, { color: deltaColor }]}>{periodDeltaLabel(totals, mode)}</Text>
            <TrendChart
              points={volume}
              showLine
              showValues
              legend={[
                { key: 'filings', label: 'Filings', color: colors.blueMid },
                { key: 'trend', label: 'Trend', color: colors.teal, swatch: 'line' },
              ]}
            />
            <Text style={styles.sectionLabel}>Severity in the same period</Text>
            <TrendChart points={stacked} showValues legend={[...SEVERITY_LEGEND]} />
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Road class</Text>
            <Text style={styles.trendHint}>Share of filings by highway, service road, and local road.</Text>
            <CompositionBar items={roads} />
          </View>
        </ScreenContainer>
      </ScrollView>
    </AuthBackdrop>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: 'transparent',
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
    alignItems: 'stretch',
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
  rateBody: {
    flexGrow: 1,
    justifyContent: 'center',
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
    marginBottom: 8,
    marginTop: -4,
  },
  delta: {
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 8,
  },
  sectionLabel: {
    marginTop: 18,
    marginBottom: 8,
    fontWeight: '800',
    fontSize: 14,
    color: colors.ink,
  },
});
