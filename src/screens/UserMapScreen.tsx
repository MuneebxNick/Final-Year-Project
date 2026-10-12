import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../api/client';
import { AdminLeafletHeatmap, type LeafletHeatPoint } from '../components/AdminLeafletHeatmap';
import { FilterChip } from '../components/FilterChip';
import { ScreenContainer } from '../layout/ScreenContainer';
import { AuthBackdrop } from '../layout/AuthBackdrop';
import { areaLabel, severityColors, uniqueAreaLabels, type Severity } from '../models/report';
import type { UserTabParamList } from '../navigation';
import { colors } from '../theme';

type Props = BottomTabScreenProps<UserTabParamList, 'Map'>;

type AreaFilter = 'all' | string;

type PublicLocation = {
  lat: number;
  lng: number;
  severity: Severity;
  city: string;
  area: string;
};

export function UserMapScreen(_props: Props) {
  const [locations, setLocations] = useState<PublicLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [areaFilter, setAreaFilter] = useState<AreaFilter>('all');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      api<PublicLocation[]>('/reports/locations')
        .then((rows) => {
          if (cancelled) return;
          setLocations(rows);
          setError(null);
        })
        .catch(() => {
          if (cancelled) return;
          setError('Could not load road reports.');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const areaOptions = useMemo(() => uniqueAreaLabels(locations), [locations]);
  const visible = useMemo(
    () =>
      areaFilter === 'all'
        ? locations
        : locations.filter((item) => areaLabel(item) === areaFilter),
    [locations, areaFilter],
  );
  const points: LeafletHeatPoint[] = useMemo(
    () =>
      visible.map((item) => ({
        lat: item.lat,
        lng: item.lng,
        severity: item.severity,
      })),
    [visible],
  );

  return (
    <AuthBackdrop>
    <SafeAreaView style={styles.flex} edges={['top']}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.scroll}>
        <ScreenContainer>
          <Text style={styles.heading}>Road map</Text>
          <Text style={styles.lede}>
            Spot damaged-road areas while traveling. Heat and markers show current unresolved
            reports — no photos or personal details.
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            <FilterChip
              label="All areas"
              selected={areaFilter === 'all'}
              onPress={() => setAreaFilter('all')}
            />
            {areaOptions.map((area) => (
              <FilterChip
                key={area}
                label={area}
                selected={areaFilter === area}
                onPress={() => setAreaFilter(area)}
              />
            ))}
          </ScrollView>

          {error ? <Text style={styles.status}>{error}</Text> : null}
          {loading && locations.length === 0 && !error ? (
            <Text style={styles.status}>Loading map…</Text>
          ) : null}

          <AdminLeafletHeatmap points={points} interactive={false} fillHeight />

          <View style={styles.legend}>
            <LegendDot color={severityColors.small} label="Low damage intensity" />
            <LegendDot color={severityColors.medium} label="Medium damage intensity" />
            <LegendDot color={severityColors.large} label="High damage intensity" />
          </View>
        </ScreenContainer>
      </ScrollView>
    </SafeAreaView>
    </AuthBackdrop>
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
  chips: {
    gap: 8,
    paddingBottom: 16,
  },
  status: {
    color: colors.muted,
    marginBottom: 12,
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
});
