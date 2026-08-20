import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import { formatPkr } from '../data/adminInsights';
import { useReports } from '../data/reportStore';
import { ScreenContainer } from '../layout/ScreenContainer';
import {
  predictiveCategories,
  predictiveCategoryLabels,
  predictiveSegments,
  type PredictiveCategory,
} from '../models/report';
import type { AdminTabParamList } from '../navigation';
import { colors, radii, shadows } from '../theme';

type Props = BottomTabScreenProps<AdminTabParamList, 'Predictive'>;

const CATEGORY_COLOR: Record<PredictiveCategory, string> = {
  urgent: colors.pillRed,
  planRepair: colors.pillOrange,
  monitor: colors.pillGreen,
};

export function AdminPredictiveScreen(_props: Props) {
  const reports = useReports();
  const segments = useMemo(() => predictiveSegments(reports), [reports]);

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.scroll}>
      <ScreenContainer>
        <Text style={styles.heading}>Predictive maintenance</Text>
        <Text style={styles.lede}>
          Dummy road-segment forecasts grouped from current reports. Budgets are illustrative only.
        </Text>

        {predictiveCategories.map((category) => {
          const items = segments.filter((segment) => segment.category === category);
          return (
            <View key={category} style={styles.group}>
              <View style={styles.groupHead}>
                <View style={[styles.dot, { backgroundColor: CATEGORY_COLOR[category] }]} />
                <Text style={styles.groupTitle}>{predictiveCategoryLabels[category]}</Text>
                <Text style={styles.groupCount}>{items.length}</Text>
              </View>
              {items.length === 0 ? (
                <Text style={styles.empty}>No segments in this band.</Text>
              ) : (
                items.map((segment) => (
                  <View key={segment.id} style={styles.card}>
                    <Text style={styles.city}>{segment.city}</Text>
                    <Text style={styles.area}>{segment.area}</Text>
                    <Text style={styles.reason}>{segment.reason}</Text>
                    <View style={styles.meta}>
                      <Text style={styles.budget}>{formatPkr(segment.budgetPkr)}</Text>
                      <Text style={styles.count}>{segment.reportCount} reports</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          );
        })}
      </ScreenContainer>
    </ScrollView>
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
  group: {
    marginBottom: 20,
  },
  groupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  groupTitle: {
    flex: 1,
    fontWeight: '800',
    fontSize: 16,
    color: colors.ink,
  },
  groupCount: {
    color: colors.muted,
    fontWeight: '700',
  },
  empty: {
    color: colors.muted,
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 10,
    ...shadows.card,
  },
  city: {
    fontWeight: '800',
    fontSize: 16,
    color: colors.ink,
  },
  area: {
    marginTop: 4,
    color: colors.muted,
  },
  reason: {
    marginTop: 10,
    color: colors.ink,
    lineHeight: 20,
  },
  meta: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  budget: {
    fontWeight: '800',
    color: colors.teal,
  },
  count: {
    color: colors.muted,
    fontWeight: '600',
  },
});
