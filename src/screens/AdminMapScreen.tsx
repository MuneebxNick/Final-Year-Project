import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { FilterChip } from '../components/FilterChip';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { useReports } from '../data/reportStore';
import { ScreenContainer } from '../layout/ScreenContainer';
import { webCursor, type WebPressableState } from '../layout/webStyles';
import {
  cities,
  seedHash,
  severityColors,
  severityRank,
  uniqueCities,
  type City,
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
  color: string;
  size: number;
  opacity: number;
  left: number;
  top: number;
};

const CITY_ANCHORS: Record<City, { left: number; top: number }> = {
  Lahore: { left: 28, top: 38 },
  Karachi: { left: 30, top: 74 },
  Rawalpindi: { left: 62, top: 22 },
};

const DEFAULT_CITY_ANCHOR = { left: 48, top: 48 };

function cityAnchor(cityName: string): { left: number; top: number } {
  return cities.includes(cityName as City) ? CITY_ANCHORS[cityName as City] : DEFAULT_CITY_ANCHOR;
}

function withAlpha(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function clusterGlow(color: string, size: number): ViewStyle {
  return { boxShadow: `0 0 ${Math.round(size * 0.35)}px ${withAlpha(color, 0.45)}` } as ViewStyle;
}

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
    const hash = seedHash(clusterCity, area);
    const anchor = cityAnchor(clusterCity);
    const score = list.reduce((sum, report) => sum + severityRank[report.severity], 0) + list.length;
    const maxSeverity = list.reduce(
      (best, report) => (severityRank[report.severity] > severityRank[best] ? report.severity : best),
      list[0].severity,
    );
    return {
      id: key,
      city: clusterCity,
      area,
      reports: list,
      representative: pickRepresentative(list),
      color: severityColors[maxSeverity],
      size: Math.min(120, Math.max(48, 36 + score * 8)),
      opacity: Math.min(0.7, Math.max(0.25, 0.18 + score * 0.04)),
      left: anchor.left + ((hash % 16) - 8),
      top: anchor.top + (((hash >> 5) % 12) - 6),
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
          Heat shows concentration and severity by area. Tap a cluster to preview the worst report.
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

        <View style={styles.board}>
          <View style={styles.land} />
          <Text style={[styles.region, styles.regionNorth]}>Punjab</Text>
          <Text style={[styles.region, styles.regionSouth]}>Sindh</Text>
          {(Object.keys(CITY_ANCHORS) as City[]).map((city) => (
            <Text
              key={city}
              style={[
                styles.cityLabel,
                {
                  left: `${CITY_ANCHORS[city].left}%`,
                  top: `${CITY_ANCHORS[city].top - 8}%`,
                },
              ]}
            >
              {city}
            </Text>
          ))}
          {clusters.map((cluster) => {
            const active = selected?.id === cluster.id;
            const glow = clusterGlow(cluster.color, cluster.size);
            return (
              <View
                key={cluster.id}
                style={[
                  styles.blobWrap,
                  {
                    pointerEvents: 'box-none',
                    left: `${cluster.left}%`,
                    top: `${cluster.top}%`,
                    width: cluster.size,
                    height: cluster.size,
                    marginLeft: -cluster.size / 2,
                    marginTop: -cluster.size / 2,
                    zIndex: active ? 4 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.blobRing,
                    glow,
                    {
                      pointerEvents: 'none',
                      width: cluster.size,
                      height: cluster.size,
                      backgroundColor: withAlpha(cluster.color, cluster.opacity * 0.35),
                    },
                  ]}
                />
                <View
                  style={[
                    styles.blobRing,
                    {
                      pointerEvents: 'none',
                      width: cluster.size * 0.65,
                      height: cluster.size * 0.65,
                      backgroundColor: withAlpha(cluster.color, cluster.opacity * 0.55),
                    },
                  ]}
                />
                <View
                  style={[
                    styles.blobRing,
                    {
                      pointerEvents: 'none',
                      width: cluster.size * 0.4,
                      height: cluster.size * 0.4,
                      backgroundColor: withAlpha(cluster.color, cluster.opacity),
                    },
                  ]}
                />
                <Pressable
                  onPress={() => setSelectedId(cluster.id)}
                  style={[
                    styles.hitDot,
                    webCursor,
                    {
                      backgroundColor: cluster.color,
                      transform: [{ scale: active ? 1.25 : 1 }],
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>

        <View style={styles.legend}>
          <LegendDot color={severityColors.small} label="Low density" />
          <LegendDot color={severityColors.medium} label="Medium density" />
          <LegendDot color={severityColors.large} label="High density" />
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
          <Text style={styles.hint}>Tap a cluster to preview a report.</Text>
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
  board: {
    height: 360,
    borderRadius: radii.card,
    backgroundColor: '#D7E4E8',
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    position: 'relative',
  },
  land: {
    position: 'absolute',
    left: '12%',
    top: '10%',
    right: '16%',
    bottom: '8%',
    backgroundColor: '#C5D9C8',
    borderRadius: 80,
    opacity: 0.7,
  },
  region: {
    position: 'absolute',
    color: colors.tealMid,
    fontWeight: '800',
    letterSpacing: 1.4,
    fontSize: 12,
    opacity: 0.55,
  },
  regionNorth: {
    left: '46%',
    top: '14%',
  },
  regionSouth: {
    left: '18%',
    bottom: '10%',
  },
  cityLabel: {
    position: 'absolute',
    color: colors.teal,
    fontWeight: '800',
    fontSize: 12,
  },
  blobWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blobRing: {
    position: 'absolute',
    borderRadius: 999,
  },
  hitDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.white,
    zIndex: 2,
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
