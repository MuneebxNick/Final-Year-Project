import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AdminLeafletHeatmap, type LeafletHeatPoint } from '../components/AdminLeafletHeatmap';
import { FilterChip } from '../components/FilterChip';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { useReports } from '../data/reportStore';
import { ScreenContainer } from '../layout/ScreenContainer';
import { webCursor, type WebPressableState } from '../layout/webStyles';
import {
  severityColors,
  toUserStatus,
  uniqueCities,
  userStatusLabels,
  userStatuses,
  type Report,
} from '../models/report';
import type { AdminTabParamList, RootStackParamList } from '../navigation';
import { colors, radii, shadows } from '../theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<AdminTabParamList, 'Map'>,
  NativeStackScreenProps<RootStackParamList>
>;

type CityFilter = 'all' | string;

type HeatCluster = {
  id: string;
  city: string;
  area: string;
  reports: Report[];
};

function buildClusters(reports: Report[]): HeatCluster[] {
  const groups = new Map<string, Report[]>();
  reports.forEach((report) => {
    const key = `${report.city}|${report.area}`;
    const list = groups.get(key) ?? [];
    list.push(report);
    groups.set(key, list);
  });

  return [...groups.entries()].map(([key, list]) => {
    const [clusterCity, ...areaParts] = key.split('|');
    const area = areaParts.join('|');
    return {
      id: key,
      city: clusterCity,
      area,
      reports: list,
    };
  });
}

function sortAreaReports(list: Report[]): Report[] {
  return [...list].sort((a, b) => {
    const aResolved = toUserStatus(a.status) === 'resolved' ? 1 : 0;
    const bResolved = toUserStatus(b.status) === 'resolved' ? 1 : 0;
    if (aResolved !== bResolved) return aResolved - bResolved;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

function countByUserStatus(reports: Report[]) {
  const counts = { pending: 0, inProgress: 0, resolved: 0 };
  reports.forEach((report) => {
    counts[toUserStatus(report.status)] += 1;
  });
  return counts;
}

export function AdminMapScreen({ navigation }: Props) {
  const reports = useReports();
  const [cityFilter, setCityFilter] = useState<CityFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const cityOptions = useMemo(() => uniqueCities(reports), [reports]);

  const visible = useMemo(
    () =>
      cityFilter === 'all'
        ? reports
        : reports.filter((report) => report.city.trim() === cityFilter),
    [reports, cityFilter],
  );
  const heatReports = useMemo(
    () => visible.filter((report) => toUserStatus(report.status) !== 'resolved'),
    [visible],
  );
  const heatPoints: LeafletHeatPoint[] = useMemo(
    () =>
      heatReports.flatMap((report) =>
        report.coords
          ? [
              {
                id: report.id,
                lat: report.coords.lat,
                lng: report.coords.lng,
                severity: report.severity,
              },
            ]
          : [],
      ),
    [heatReports],
  );
  const clusters = useMemo(() => buildClusters(visible), [visible]);
  const selected = clusters.find((cluster) => cluster.id === selectedId) ?? null;

  const setCity = (next: CityFilter) => {
    setCityFilter(next);
    setSelectedId(null);
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.scroll}>
      <ScreenContainer>
        <Text style={styles.heading}>City map</Text>
        <Text style={styles.lede}>
          Heat shows active (unresolved) damage by area. Tap a hotspot to see that area's reports
          and status mix.
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <FilterChip label="All cities" selected={cityFilter === 'all'} onPress={() => setCity('all')} />
          {cityOptions.map((city) => (
            <FilterChip
              key={city}
              label={city}
              selected={cityFilter === city}
              onPress={() => setCity(city)}
            />
          ))}
        </ScrollView>

        <AdminLeafletHeatmap
          points={heatPoints}
          interactive
          onSelectReport={(reportId) => {
            const report = visible.find((item) => item.id === reportId);
            if (report) setSelectedId(`${report.city}|${report.area}`);
          }}
        />

        <View style={styles.legend}>
          <LegendDot color={severityColors.small} label="Low damage intensity" />
          <LegendDot color={severityColors.medium} label="Medium damage intensity" />
          <LegendDot color={severityColors.large} label="High damage intensity" />
        </View>

        {selected ? (
          <AreaCard
            key={selected.id}
            cluster={selected}
            onOpenReport={(reportId) =>
              navigation.navigate('AdminReportDetail', { reportId })
            }
          />
        ) : (
          <Text style={styles.hint}>Tap a hotspot to see reports in that area.</Text>
        )}
      </ScreenContainer>
    </ScrollView>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

function AreaCard({
  cluster,
  onOpenReport,
}: {
  cluster: HeatCluster;
  onOpenReport: (reportId: string) => void;
}) {
  const [listOpen, setListOpen] = useState(cluster.reports.length <= 6);
  const counts = countByUserStatus(cluster.reports);
  const sorted = sortAreaReports(cluster.reports);

  return (
    <View style={styles.preview}>
      <Text style={styles.previewCity}>{cluster.city}</Text>
      <Text style={styles.previewArea}>{cluster.area}</Text>
      <Text style={styles.previewCount}>
        Total reports in this area: {cluster.reports.length}
      </Text>

      <View style={styles.counts}>
        {userStatuses.map((status) => (
          <View key={status} style={styles.countItem}>
            <Text style={styles.countValue}>{counts[status]}</Text>
            <Text style={styles.countLabel}>{userStatusLabels[status]}</Text>
          </View>
        ))}
      </View>

      <Pressable
        onPress={() => setListOpen((open) => !open)}
        accessibilityRole="button"
        style={(state: WebPressableState) => [styles.listToggle, webCursor, state.hovered && styles.listToggleHover]}
      >
        <Text style={styles.listToggleLabel}>
          Reports in this area {listOpen ? '▴' : '▾'}
        </Text>
      </Pressable>

      {listOpen
        ? sorted.map((report) => (
            <Pressable
              key={report.id}
              onPress={() => onOpenReport(report.id)}
              accessibilityRole="button"
              style={(state: WebPressableState) => [
                styles.reportRow,
                webCursor,
                state.hovered && styles.reportRowHover,
              ]}
            >
              <Text style={styles.reportId} selectable>
                {report.referenceId}
              </Text>
              <View style={styles.reportBadges}>
                <StatusBadge status={report.status} variant="user" />
                <SeverityBadge severity={report.severity} />
              </View>
            </Pressable>
          ))
        : null}
    </View>
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
  chips: {
    gap: 8,
    paddingBottom: 16,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 12,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    color: colors.muted,
    fontWeight: '600',
    fontSize: 13,
  },
  hint: {
    color: colors.muted,
    textAlign: 'center',
    marginTop: 8,
  },
  preview: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    ...shadows.card,
  },
  previewCity: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink,
  },
  previewArea: {
    marginTop: 6,
    color: colors.muted,
  },
  previewCount: {
    marginTop: 10,
    fontWeight: '700',
    color: colors.ink,
    fontSize: 13,
  },
  counts: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  countItem: {
    flex: 1,
    backgroundColor: colors.cream,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  countValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
  },
  countLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
    textAlign: 'center',
  },
  listToggle: {
    marginTop: 14,
    paddingVertical: 8,
  },
  listToggleHover: {
    opacity: 0.85,
  },
  listToggleLabel: {
    fontWeight: '700',
    color: colors.teal,
    fontSize: 14,
  },
  reportRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 12,
    gap: 8,
  },
  reportRowHover: {
    backgroundColor: colors.tealLight,
  },
  reportId: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink,
  },
  reportBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
});
