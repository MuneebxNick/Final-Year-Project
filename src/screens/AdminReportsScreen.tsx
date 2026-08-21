import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { FilterChip } from '../components/FilterChip';
import { StatusBadge } from '../components/StatusBadge';
import { useReports } from '../data/reportStore';
import { ScreenContainer } from '../layout/ScreenContainer';
import { useBreakpoint } from '../layout/useBreakpoint';
import { webCursor, type WebPressableState } from '../layout/webStyles';
import {
  assignedTeamLabels,
  isIncompleteLocation,
  isLowConfidence,
  roadTypeLabels,
  severityLabels,
  severityRank,
  severities,
  toUserStatus,
  uniqueCities,
  userStatusLabels,
  userStatuses,
  type Report,
  type Severity,
  type UserStatus,
} from '../models/report';
import type { AdminTabParamList, RootStackParamList } from '../navigation';
import { colors, radii, shadows } from '../theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<AdminTabParamList, 'Reports'>,
  NativeStackScreenProps<RootStackParamList>
>;

type CityFilter = 'all' | string;
type SeverityFilter = 'all' | Severity;
type StatusFilter = 'all' | UserStatus;
type DateRange = 'all' | '7d' | '30d';
type SortMode = 'newest' | 'oldest' | 'severity';

export function AdminReportsScreen({ navigation }: Props) {
  const { isWide } = useBreakpoint();
  const reports = useReports();
  const cityOptions = useMemo(() => uniqueCities(reports), [reports]);
  const [city, setCity] = useState<CityFilter>('all');
  const [severity, setSeverity] = useState<SeverityFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [range, setRange] = useState<DateRange>('all');
  const [sort, setSort] = useState<SortMode>('newest');

  const filtered = useMemo(() => {
    const cutoff =
      range === '7d'
        ? Date.now() - 7 * 24 * 60 * 60 * 1000
        : range === '30d'
          ? Date.now() - 30 * 24 * 60 * 60 * 1000
          : 0;
    const list = reports.filter((report) => {
      if (city !== 'all' && report.city.trim() !== city) return false;
      if (severity !== 'all' && report.severity !== severity) return false;
      if (status !== 'all' && toUserStatus(report.status) !== status) return false;
      if (cutoff && report.createdAt.getTime() < cutoff) return false;
      return true;
    });
    return [...list].sort((a, b) => {
      if (sort === 'severity') {
        return severityRank[b.severity] - severityRank[a.severity];
      }
      const time = a.createdAt.getTime() - b.createdAt.getTime();
      return sort === 'newest' ? -time : time;
    });
  }, [reports, city, severity, status, range, sort]);

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.scroll}>
      <ScreenContainer>
        <Text style={styles.heading}>Municipal queue</Text>
        <Text style={styles.lede}>
          {filtered.length} of {reports.length} report{reports.length === 1 ? '' : 's'}
        </Text>

        <Text style={styles.filterLabel}>City</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <FilterChip label="All" selected={city === 'all'} onPress={() => setCity('all')} />
          {cityOptions.map((item) => (
            <FilterChip key={item} label={item} selected={city === item} onPress={() => setCity(item)} />
          ))}
        </ScrollView>

        <Text style={styles.filterLabel}>Severity</Text>
        <View style={styles.wrap}>
          <FilterChip label="All" selected={severity === 'all'} onPress={() => setSeverity('all')} />
          {severities.map((item) => (
            <FilterChip
              key={item}
              label={severityLabels[item]}
              selected={severity === item}
              onPress={() => setSeverity(item)}
            />
          ))}
        </View>

        <Text style={styles.filterLabel}>Status</Text>
        <View style={styles.wrap}>
          <FilterChip label="All" selected={status === 'all'} onPress={() => setStatus('all')} />
          {userStatuses.map((item) => (
            <FilterChip
              key={item}
              label={userStatusLabels[item]}
              selected={status === item}
              onPress={() => setStatus(item)}
            />
          ))}
        </View>

        <Text style={styles.filterLabel}>Date range</Text>
        <View style={styles.wrap}>
          <FilterChip label="All" selected={range === 'all'} onPress={() => setRange('all')} />
          <FilterChip label="7 days" selected={range === '7d'} onPress={() => setRange('7d')} />
          <FilterChip label="30 days" selected={range === '30d'} onPress={() => setRange('30d')} />
        </View>

        <Text style={styles.filterLabel}>Sort</Text>
        <View style={[styles.wrap, styles.sortPad]}>
          <FilterChip label="Newest" selected={sort === 'newest'} onPress={() => setSort('newest')} />
          <FilterChip label="Oldest" selected={sort === 'oldest'} onPress={() => setSort('oldest')} />
          <FilterChip label="Severity" selected={sort === 'severity'} onPress={() => setSort('severity')} />
        </View>

        {filtered.length === 0 ? (
          <Text style={styles.empty}>No reports match these filters.</Text>
        ) : (
          <View style={isWide ? styles.grid : undefined}>
            {filtered.map((report) => (
              <View key={report.id} style={isWide ? styles.gridItem : undefined}>
                <AdminReportCard
                  report={report}
                  onPress={() =>
                    navigation.navigate('AdminReportDetail', { reportId: report.id })
                  }
                />
              </View>
            ))}
          </View>
        )}
      </ScreenContainer>
    </ScrollView>
  );
}

function AdminReportCard({ report, onPress }: { report: Report; onPress: () => void }) {
  const flags = [
    isIncompleteLocation(report) ? 'Incomplete location' : null,
    isLowConfidence(report) ? 'Low confidence' : null,
  ].filter(Boolean) as string[];

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
      <View style={styles.cardTop}>
        <Text style={styles.city}>{report.city}</Text>
        <StatusBadge status={report.status} variant="user" />
      </View>
      <Text style={styles.area}>{report.area}</Text>
      {flags.length > 0 ? (
        <View style={styles.flag}>
          <MaterialIcons name="warning-amber" size={16} color={colors.pillOrange} />
          <Text style={styles.flagText}>{flags.join(' · ')}</Text>
        </View>
      ) : null}
      <View style={styles.meta}>
        <MaterialIcons name="alt-route" size={16} color={colors.tealMid} />
        <Text style={styles.road}>{roadTypeLabels[report.roadType]}</Text>
        <Text style={styles.team} numberOfLines={1}>
          {assignedTeamLabels[report.assignedTeam]}
        </Text>
      </View>
    </Pressable>
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
  filterLabel: {
    marginBottom: 8,
    fontWeight: '700',
    color: colors.ink,
    fontSize: 13,
  },
  chips: {
    gap: 8,
    paddingBottom: 12,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  sortPad: {
    marginBottom: 16,
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
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  city: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink,
  },
  area: {
    marginTop: 6,
    color: colors.muted,
    lineHeight: 20,
  },
  flag: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flagText: {
    color: colors.pillOrange,
    fontWeight: '700',
    fontSize: 13,
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
  team: {
    flex: 1,
    marginLeft: 12,
    textAlign: 'right',
    color: colors.muted,
    fontSize: 13,
  },
});
