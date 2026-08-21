import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReportCard } from '../components/ReportCard';
import { useMyReports } from '../data/reportStore';
import { ScreenContainer } from '../layout/ScreenContainer';
import { useBreakpoint } from '../layout/useBreakpoint';
import { webCursor, type WebPressableState } from '../layout/webStyles';
import {
  severityRank,
  toUserStatus,
  userStatusLabels,
  userStatuses,
  type UserStatus,
} from '../models/report';
import type { RootStackParamList, UserTabParamList } from '../navigation';
import { colors, radii } from '../theme';

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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <FilterChip
            label="All"
            selected={statusFilter === 'all'}
            onPress={() => setStatusFilter('all')}
          />
          {userStatuses.map((status) => (
            <FilterChip
              key={status}
              label={userStatusLabels[status]}
              selected={statusFilter === status}
              onPress={() => setStatusFilter(status)}
            />
          ))}
        </ScrollView>

        <View style={styles.sortRow}>
          <FilterChip
            label={dateSort === 'newest' ? 'Newest first' : 'Oldest first'}
            selected
            onPress={() => setDateSort((value) => (value === 'newest' ? 'oldest' : 'newest'))}
          />
          <FilterChip
            label={
              severitySort === 'off'
                ? 'Severity: off'
                : severitySort === 'high'
                  ? 'Severity: high → low'
                  : 'Severity: low → high'
            }
            selected={severitySort !== 'off'}
            onPress={() =>
              setSeveritySort((value) =>
                value === 'off' ? 'high' : value === 'high' ? 'low' : 'off',
              )
            }
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

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={(state: WebPressableState) => [
        styles.chip,
        webCursor,
        selected && styles.chipOn,
        state.hovered && styles.chipHover,
      ]}
    >
      <Text style={[styles.chipLabel, selected && styles.chipLabelOn]}>{label}</Text>
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
  chips: {
    gap: 8,
    paddingBottom: 8,
  },
  sortRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    backgroundColor: colors.white,
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipHover: {
    borderColor: colors.blueMid,
  },
  chipOn: {
    backgroundColor: colors.blueSoft,
    borderColor: colors.blueMid,
  },
  chipLabel: {
    fontWeight: '600',
    color: colors.ink,
    fontSize: 13,
  },
  chipLabelOn: {
    color: colors.blue,
  },
  empty: {
    color: colors.muted,
    marginTop: 24,
    textAlign: 'center',
  },
});
