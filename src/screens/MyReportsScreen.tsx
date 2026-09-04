import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FilterSelect } from '../components/FilterSelect';
import { ReportCard } from '../components/ReportCard';
import { useMyReports } from '../data/reportStore';
import { ScreenContainer } from '../layout/ScreenContainer';
import { useBreakpoint } from '../layout/useBreakpoint';
import {
  severityRank,
  toUserStatus,
  userStatusLabels,
  userStatuses,
  type UserStatus,
} from '../models/report';
import type { RootStackParamList, UserTabParamList } from '../navigation';
import { colors } from '../theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<UserTabParamList, 'MyReports'>,
  NativeStackScreenProps<RootStackParamList>
>;

type StatusFilter = 'all' | UserStatus;
type DateSort = 'newest' | 'oldest';
type SeveritySort = 'off' | 'high' | 'low';

export function MyReportsScreen({ navigation }: Props) {
  const { isWide } = useBreakpoint();
  const reports = useMyReports();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateSort, setDateSort] = useState<DateSort>('newest');
  const [severitySort, setSeveritySort] = useState<SeveritySort>('off');
  const [openFilter, setOpenFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = reports;
    if (statusFilter !== 'all') {
      list = list.filter((report) => toUserStatus(report.status) === statusFilter);
    }
    const copy = [...list];
    copy.sort((a, b) => {
      if (severitySort !== 'off') {
        const delta = severityRank[a.severity] - severityRank[b.severity];
        if (delta !== 0) return severitySort === 'high' ? -delta : delta;
      }
      const time = a.createdAt.getTime() - b.createdAt.getTime();
      return dateSort === 'newest' ? -time : time;
    });
    return copy;
  }, [reports, statusFilter, dateSort, severitySort]);

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenContainer>
        <Text style={styles.title}>My Reports</Text>
        <Text style={styles.lede}>Filter by status or sort by date and severity.</Text>

        <View style={styles.filterRow}>
          <FilterSelect
            label="Status"
            value={statusFilter}
            options={[
              { value: 'all', label: 'All' },
              ...userStatuses.map((status) => ({
                value: status,
                label: userStatusLabels[status],
              })),
            ]}
            onChange={setStatusFilter}
            open={openFilter === 'status'}
            onOpenChange={(next) => setOpenFilter(next ? 'status' : null)}
          />
          <FilterSelect
            label="Date"
            value={dateSort}
            options={[
              { value: 'newest', label: 'Newest first' },
              { value: 'oldest', label: 'Oldest first' },
            ]}
            onChange={setDateSort}
            open={openFilter === 'date'}
            onOpenChange={(next) => setOpenFilter(next ? 'date' : null)}
          />
          <FilterSelect
            label="Severity"
            value={severitySort}
            options={[
              { value: 'off', label: 'Off' },
              { value: 'high', label: 'High → low' },
              { value: 'low', label: 'Low → high' },
            ]}
            onChange={setSeveritySort}
            open={openFilter === 'severity'}
            onOpenChange={(next) => setOpenFilter(next ? 'severity' : null)}
          />
        </View>

        {filtered.length === 0 ? (
          <Text style={styles.empty}>No reports match these filters.</Text>
        ) : (
          <View style={isWide ? styles.grid : undefined}>
            {filtered.map((report) => (
              <View key={report.id} style={isWide ? styles.gridItem : undefined}>
                <ReportCard
                  report={report}
                  onPress={() => navigation.navigate('UserReportDetail', { reportId: report.id })}
                />
              </View>
            ))}
          </View>
        )}
        </ScreenContainer>
      </ScrollView>
    </SafeAreaView>
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.ink,
  },
  lede: {
    marginTop: 8,
    marginBottom: 18,
    color: colors.muted,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  empty: {
    color: colors.muted,
    marginTop: 24,
    textAlign: 'center',
  },
});
