import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { FilterSelect } from '../components/FilterSelect';
import { StatusBadge } from '../components/StatusBadge';
import { TextField } from '../components/TextField';
import { useReports } from '../data/reportStore';
import { ScreenContainer } from '../layout/ScreenContainer';
import { useBreakpoint } from '../layout/useBreakpoint';
import { webCursor, type WebPressableState } from '../layout/webStyles';
import {
  assignedTeamLabels,
  isIncompleteLocation,
  isLowConfidence,
  normalizeReferenceId,
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
  const [query, setQuery] = useState('');
  const [city, setCity] = useState<CityFilter>('all');
  const [severity, setSeverity] = useState<SeverityFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [range, setRange] = useState<DateRange>('all');
  const [sort, setSort] = useState<SortMode>('newest');
  const [openFilter, setOpenFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const cutoff =
      range === '7d'
        ? Date.now() - 7 * 24 * 60 * 60 * 1000
        : range === '30d'
          ? Date.now() - 30 * 24 * 60 * 60 * 1000
          : 0;
    const needle = normalizeReferenceId(query);
    const list = reports.filter((report) => {
      if (needle && normalizeReferenceId(report.referenceId) !== needle) return false;
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
  }, [reports, query, city, severity, status, range, sort]);

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.scroll}>
      <ScreenContainer>
        <Text style={styles.heading}>Municipal queue</Text>
        <Text style={styles.lede}>
          {filtered.length} of {reports.length} report{reports.length === 1 ? '' : 's'}
        </Text>

        <TextField
          icon="search-outline"
          label="Search by report ID (e.g. 001)"
          placeholder="Search by report ID (e.g. 001)"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={styles.filterRow}>
          <FilterSelect
            label="City"
            value={city}
            options={[
              { value: 'all', label: 'All' },
              ...cityOptions.map((item) => ({ value: item, label: item })),
            ]}
            onChange={setCity}
            open={openFilter === 'city'}
            onOpenChange={(next) => setOpenFilter(next ? 'city' : null)}
          />
          <FilterSelect
            label="Severity"
            value={severity}
            options={[
              { value: 'all', label: 'All' },
              ...severities.map((item) => ({ value: item, label: severityLabels[item] })),
            ]}
            onChange={setSeverity}
            open={openFilter === 'severity'}
            onOpenChange={(next) => setOpenFilter(next ? 'severity' : null)}
          />
          <FilterSelect
            label="Status"
            value={status}
            options={[
              { value: 'all', label: 'All' },
              ...userStatuses.map((item) => ({ value: item, label: userStatusLabels[item] })),
            ]}
            onChange={setStatus}
            open={openFilter === 'status'}
            onOpenChange={(next) => setOpenFilter(next ? 'status' : null)}
          />
          <FilterSelect
            label="Date range"
            value={range}
            options={[
              { value: 'all', label: 'All' },
              { value: '7d', label: '7 days' },
              { value: '30d', label: '30 days' },
            ]}
            onChange={setRange}
            open={openFilter === 'range'}
            onOpenChange={(next) => setOpenFilter(next ? 'range' : null)}
          />
          <FilterSelect
            label="Sort"
            value={sort}
            options={[
              { value: 'newest', label: 'Newest' },
              { value: 'oldest', label: 'Oldest' },
              { value: 'severity', label: 'Severity' },
            ]}
            onChange={setSort}
            open={openFilter === 'sort'}
            onOpenChange={(next) => setOpenFilter(next ? 'sort' : null)}
          />
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
      <Text style={styles.refId}>{report.referenceId}</Text>
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
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  refId: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.teal,
    marginBottom: 6,
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
