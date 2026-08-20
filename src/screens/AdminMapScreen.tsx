import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { FilterChip } from '../components/FilterChip';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { useReports } from '../data/reportStore';
import { ScreenContainer } from '../layout/ScreenContainer';
import { webCursor, type WebPressableState } from '../layout/webStyles';
import { cities, severityColors, type City, type Report } from '../models/report';
import type { AdminTabParamList, RootStackParamList } from '../navigation';
import { colors, radii, shadows } from '../theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<AdminTabParamList, 'Map'>,
  NativeStackScreenProps<RootStackParamList>
>;

type CityFilter = 'all' | City;

const CITY_ANCHORS: Record<City, { left: number; top: number }> = {
  Lahore: { left: 28, top: 38 },
  Karachi: { left: 30, top: 74 },
  Rawalpindi: { left: 62, top: 22 },
};

function pinOffset(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return {
    dx: (hash % 16) - 8,
    dy: ((hash >> 5) % 12) - 6,
  };
}

export function AdminMapScreen({ navigation }: Props) {
  const reports = useReports();
  const [cityFilter, setCityFilter] = useState<CityFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const visible = useMemo(
    () => (cityFilter === 'all' ? reports : reports.filter((report) => report.city === cityFilter)),
    [reports, cityFilter],
  );

  const selected = visible.find((report) => report.id === selectedId) ?? null;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.scroll}>
      <ScreenContainer>
        <Text style={styles.heading}>City map</Text>
        <Text style={styles.lede}>Schematic board of dummy reports. Pins are colored by severity.</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <FilterChip label="All cities" selected={cityFilter === 'all'} onPress={() => setCityFilter('all')} />
          {cities.map((city) => (
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
          {visible.map((report) => {
            const city = (cities.includes(report.city as City) ? report.city : 'Lahore') as City;
            const anchor = CITY_ANCHORS[city];
            const offset = pinOffset(report.id);
            const active = selected?.id === report.id;
            return (
              <Pressable
                key={report.id}
                onPress={() => setSelectedId(report.id)}
                style={[
                  styles.pin,
                  webCursor,
                  {
                    left: `${anchor.left + offset.dx}%`,
                    top: `${anchor.top + offset.dy}%`,
                    backgroundColor: severityColors[report.severity],
                    transform: [{ scale: active ? 1.25 : 1 }],
                    zIndex: active ? 4 : 2,
                  },
                ]}
              />
            );
          })}
        </View>

        <View style={styles.legend}>
          <LegendDot color={severityColors.small} label="Small" />
          <LegendDot color={severityColors.medium} label="Medium" />
          <LegendDot color={severityColors.large} label="Large" />
        </View>

        {selected ? (
          <PreviewCard
            report={selected}
            onOpen={() => navigation.navigate('AdminReportDetail', { reportId: selected.id })}
          />
        ) : (
          <Text style={styles.hint}>Tap a pin to preview a report.</Text>
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

function PreviewCard({ report, onOpen }: { report: Report; onOpen: () => void }) {
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
  pin: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.white,
    marginLeft: -8,
    marginTop: -8,
  },
  legend: {
    flexDirection: 'row',
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
