import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../api/client';
import { AdminLeafletHeatmap, type LeafletHeatPoint } from '../components/AdminLeafletHeatmap';
import { FilterChip } from '../components/FilterChip';
import { ScreenContainer } from '../layout/ScreenContainer';
import { severityColors, uniqueCities, type Severity } from '../models/report';
import type { UserTabParamList } from '../navigation';
import { colors } from '../theme';

type Props = BottomTabScreenProps<UserTabParamList, 'Map'>;

type CityFilter = 'all' | string;

type PublicLocation = {
  lat: number;
  lng: number;
  severity: Severity;
  city: string;
};

export function UserMapScreen(_props: Props) {
  const [locations, setLocations] = useState<PublicLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cityFilter, setCityFilter] = useState<CityFilter>('all');

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

  const cityOptions = useMemo(() => uniqueCities(locations), [locations]);
  const visible = useMemo(
    () =>
      cityFilter === 'all'
        ? locations
        : locations.filter((item) => item.city.trim() === cityFilter),
    [locations, cityFilter],
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
              label="All cities"
              selected={cityFilter === 'all'}
              onPress={() => setCityFilter('all')}
            />
            {cityOptions.map((city) => (
              <FilterChip
                key={city}
                label={city}
                selected={cityFilter === city}
                onPress={() => setCityFilter(city)}
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
