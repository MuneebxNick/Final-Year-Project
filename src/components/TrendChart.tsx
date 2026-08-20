import { StyleSheet, Text, View } from 'react-native';

import type { TrendPoint } from '../data/adminInsights';
import { colors, radii } from '../theme';

export function TrendChart({ points }: { points: TrendPoint[] }) {
  const max = Math.max(...points.map((point) => point.count), 1);

  return (
    <View style={styles.row}>
      {points.map((point) => {
        const height = Math.max((point.count / max) * 110, point.count > 0 ? 6 : 2);
        return (
          <View key={point.label} style={styles.col}>
            <Text style={styles.count}>{point.count}</Text>
            <View style={styles.track}>
              <View style={[styles.bar, { height }]} />
            </View>
            <Text style={styles.label}>{point.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    height: 168,
  },
  col: {
    flex: 1,
    alignItems: 'center',
  },
  count: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    marginBottom: 6,
  },
  track: {
    height: 110,
    width: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    backgroundColor: colors.blueMid,
    borderRadius: radii.button,
    minHeight: 2,
  },
  label: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
    textAlign: 'center',
  },
});
