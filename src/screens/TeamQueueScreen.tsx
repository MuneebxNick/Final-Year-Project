import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { FilterChip } from '../components/FilterChip';
import { OverdueBadge, StatusBadge } from '../components/StatusBadge';
import { useReportsHydrated, useTeamReports, useTeamStats } from '../data/reportStore';
import { AuthBackdrop } from '../layout/AuthBackdrop';
import { ScreenContainer } from '../layout/ScreenContainer';
import { useBreakpoint } from '../layout/useBreakpoint';
import { webCursor, type WebPressableState } from '../layout/webStyles';
import {
  formatReportDateTime,
  roadTypeLabels,
  type ReportStatus,
  type TeamReport,
} from '../models/report';
import type { RootStackParamList, TeamTabParamList } from '../navigation';
import { colors, radii, shadows } from '../theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TeamTabParamList, 'Queue'>,
  NativeStackScreenProps<RootStackParamList>
>;

const filters = ['assigned', 'inProgress', 'completed', 'resolved'] as const;
type QueueFilter = (typeof filters)[number];

const filterLabels: Record<QueueFilter, string> = {
  assigned: 'To accept',
  inProgress: 'In progress',
  completed: 'Awaiting verification',
  resolved: 'Done',
};

export function TeamQueueScreen({ navigation }: Props) {
  const { isWide } = useBreakpoint();
  const reports = useTeamReports();
  const stats = useTeamStats();
  const hydrated = useReportsHydrated();
  const [filter, setFilter] = useState<QueueFilter>('assigned');

  const visible = useMemo(() => {
    return reports
      .filter((report) => report.status === filter)
      .sort((a, b) => {
        if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
  }, [reports, filter]);

  const counts: { key: string; label: string; value: number }[] = [
    { key: 'assigned', label: 'Assigned', value: stats.assigned },
    { key: 'inProgress', label: 'In progress', value: stats.inProgress },
    { key: 'completed', label: 'Awaiting verification', value: stats.completed },
    { key: 'overdue', label: 'Overdue', value: stats.overdue },
  ];

  return (
    <AuthBackdrop>
      <ScrollView style={styles.flex} contentContainerStyle={styles.scroll}>
        <ScreenContainer>
          <Text style={styles.heading}>Field queue</Text>
          <Text style={styles.lede}>Reports assigned to your team.</Text>

          <View style={isWide ? styles.statGrid : styles.statStack}>
            {counts.map((item) => (
              <View key={item.key} style={[styles.statCard, isWide && styles.statCardWide]}>
                <Text style={styles.statLabel}>{item.label}</Text>
                <Text style={styles.statValue}>{item.value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.chips}>
            {filters.map((item) => (
              <FilterChip
                key={item}
                label={filterLabels[item]}
                selected={filter === item}
                onPress={() => setFilter(item)}
              />
            ))}
          </View>

          {!hydrated ? <Text style={styles.empty}>Loading queue…</Text> : null}
          {hydrated && visible.length === 0 ? (
            <Text style={styles.empty}>No reports in {filterLabels[filter].toLowerCase()}.</Text>
          ) : (
            <View style={isWide ? styles.grid : undefined}>
              {visible.map((report) => (
                <View key={report.id} style={isWide ? styles.gridItem : undefined}>
                  <QueueCard
                    report={report}
                    onPress={() => navigation.navigate('TeamReportDetail', { reportId: report.id })}
                  />
                </View>
              ))}
            </View>
          )}
        </ScreenContainer>
      </ScrollView>
    </AuthBackdrop>
  );
}

function QueueCard({ report, onPress }: { report: TeamReport; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={(state: WebPressableState) => [
        styles.card,
        webCursor,
        state.hovered && styles.hovered,
        state.pressed && styles.pressed,
      ]}
    >
      <Text style={styles.refId}>{report.referenceId}</Text>
      <View style={styles.cardTop}>
        <Text style={styles.city}>{report.city}</Text>
        <StatusBadge status={report.status as ReportStatus} />
        {report.overdue ? <OverdueBadge /> : null}
      </View>
      <Text style={styles.area}>{report.area}</Text>
      <View style={styles.meta}>
        <MaterialIcons name="alt-route" size={16} color={colors.tealMid} />
        <Text style={styles.road}>{roadTypeLabels[report.roadType]}</Text>
        {report.deadlineAt ? (
          <Text style={styles.deadline} numberOfLines={1}>
            Due {formatReportDateTime(report.deadlineAt)}
          </Text>
        ) : null}
      </View>
    </Pressable>
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
    flexBasis: 140,
    minWidth: 120,
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    flexGrow: 1,
    flexBasis: 320,
    minWidth: 280,
  },
  empty: {
    color: colors.muted,
    textAlign: 'center',
    marginTop: 48,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 14,
    ...shadows.card,
  },
  pressed: {
    opacity: 0.92,
  },
  hovered: {
    borderColor: colors.blueMid,
  },
  refId: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.teal,
    marginBottom: 6,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  city: {
    flexGrow: 1,
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink,
  },
  area: {
    marginTop: 6,
    color: colors.muted,
    lineHeight: 20,
  },
  meta: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  road: {
    marginLeft: 6,
    fontWeight: '600',
    color: colors.teal,
  },
  deadline: {
    flex: 1,
    marginLeft: 12,
    textAlign: 'right',
    color: colors.muted,
    fontSize: 13,
  },
});
