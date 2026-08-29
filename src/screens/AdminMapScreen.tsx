import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AdminLeafletHeatmap } from '../components/AdminLeafletHeatmap';
import { FilterChip } from '../components/FilterChip';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { useReports } from '../data/reportStore';
import { ScreenContainer } from '../layout/ScreenContainer';
import { webCursor, type WebPressableState } from '../layout/webStyles';
import {
  severityColors,
  severityRank,
  uniqueCities,
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
  representative: Report;
};

function pickRepresentative(list: Report[]): Report {
  return [...list].sort((a, b) => {
    const severityDelta = severityRank[b.severity] - severityRank[a.severity];
    if (severityDelta !== 0) return severityDelta;
    return b.createdAt.getTime() - a.createdAt.getTime();
  })[0];
}

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
      representative: pickRepresentative(list),
    };
  });
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
  const clusters = useMemo(() => buildClusters(visible), [visible]);
  const selected = clusters.find((cluster) => cluster.id === selectedId) ?? null;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.scroll}>
      <ScreenContainer>
        <Text style={styles.heading}>City map</Text>
        <Text style={styles.lede}>
          Heat shows concentration and severity by area. Tap a hotspot to preview the worst report.
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <FilterChip label="All cities" selected={cityFilter === 'all'} onPress={() => setCityFilter('all')} />
          {cityOptions.map((city) => (
            <FilterChip
              key={city}
              label={city}
              selected={cityFilter === city}
              onPress={() => setCityFilter(city)}
            />
          ))}
        </ScrollView>

        <AdminLeafletHeatmap
          reports={visible}
          onSelectReport={(reportId) => {
            const report = visible.find((r) => r.id === reportId);
            if (report) setSelectedId(`${report.city}|${report.area}`);
          }}
        />

        <View style={styles.legend}>
          <LegendDot color={severityColors.small} label="Low damage intensity" />
          <LegendDot color={severityColors.medium} label="Medium damage intensity" />
          <LegendDot color={severityColors.large} label="High damage intensity" />
        </View>

        {selected ? (
          <PreviewCard
            report={selected.representative}
            extraCount={selected.reports.length}
            onOpen={() =>
              navigation.navigate('AdminReportDetail', { reportId: selected.representative.id })
            }
          />
        ) : (
          <Text style={styles.hint}>Tap a hotspot to preview a report.</Text>
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

function PreviewCard({
  report,
  extraCount,
  onOpen,
}: {
  report: Report;
  extraCount: number;
  onOpen: () => void;
}) {
  return (
    <Pressable
      onPress={onOpen}
      style={(state: WebPressableState) => [
        styles.preview,
        webCursor,
        state.hovered && styles.previewHover,
      ]}
    >
      <View style={styles.previewTop}>
        <Text style={styles.previewCity}>{report.city}</Text>
        <StatusBadge status={report.status} variant="user" />
      </View>
      <Text style={styles.previewArea}>{report.area}</Text>
      {extraCount > 1 ? (
        <Text style={styles.previewCount}>
          {extraCount} reports in this area
        </Text>
      ) : null}
      <View style={styles.previewMeta}>
        <SeverityBadge severity={report.severity} />
        <Text style={styles.previewAction}>Open report →</Text>
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
  previewHover: {
    borderColor: colors.blueMid,
  },
  previewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewCity: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink,
  },
  previewArea: {
    marginTop: 6,
    color: colors.muted,
  },
  previewCount: {
    marginTop: 6,
    fontWeight: '700',
    color: colors.ink,
    fontSize: 13,
  },
  previewMeta: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewAction: {
    fontWeight: '700',
    color: colors.teal,
  },
});
