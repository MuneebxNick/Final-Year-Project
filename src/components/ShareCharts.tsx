import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import type { ShareSlice } from '../data/adminInsights';
import { colors } from '../theme';

export type ColoredSlice = ShareSlice & { color: string };

type DonutProps = {
  slices: ColoredSlice[];
  centerValue: string;
  centerLabel: string;
  showPercent?: boolean;
};

type RingProps = {
  value: number;
  caption: string;
};

const DONUT = 148;
const DONUT_STROKE = 16;
const RING = 112;
const RING_STROKE = 12;

function ringGeometry(size: number, stroke: number) {
  const radius = (size - stroke) / 2;
  return {
    size,
    stroke,
    radius,
    center: size / 2,
    circumference: 2 * Math.PI * radius,
  };
}

export function DonutChart({ slices, centerValue, centerLabel, showPercent = true }: DonutProps) {
  const { size, stroke, radius, center, circumference } = ringGeometry(DONUT, DONUT_STROKE);
  const total = slices.reduce((sum, slice) => sum + slice.count, 0);
  const positive = slices.filter((slice) => slice.count > 0).length;
  const gap = positive > 1 ? Math.min(6, circumference / positive / 5) : 0;
  let cursor = 0;

  return (
    <View style={styles.donutRow}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <G transform={`rotate(-90 ${center} ${center})`}>
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={colors.cream}
              strokeWidth={stroke}
              fill="none"
            />
            {slices.map((slice) => {
              if (slice.count <= 0 || total === 0) return null;
              const raw = (slice.count / total) * circumference;
              const length = Math.max(raw - gap, 1);
              const offset = cursor;
              cursor += raw;
              const full = length >= circumference - 0.5;
              return (
                <Circle
                  key={slice.key}
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={slice.color}
                  strokeWidth={stroke}
                  fill="none"
                  strokeDashoffset={full ? 0 : -offset}
                  {...(full ? {} : { strokeDasharray: `${length} ${circumference - length}` })}
                />
              );
            })}
          </G>
        </Svg>
        <View style={styles.center} pointerEvents="none">
          <Text style={styles.centerValue}>{centerValue}</Text>
          <Text style={styles.centerLabel}>{centerLabel}</Text>
        </View>
      </View>
      <View style={styles.legend}>
        {slices.map((slice) => (
          <View key={slice.key} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: slice.color }]} />
            <Text style={styles.legendLabel} numberOfLines={2}>
              {slice.label}
            </Text>
            <Text style={styles.legendCount}>
              {showPercent ? `${slice.count} · ${slice.pct}%` : slice.count}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function RingGauge({ value, caption }: RingProps) {
  const { size, stroke, radius, center, circumference } = ringGeometry(RING, RING_STROKE);
  const clamped = Math.max(0, Math.min(100, value));
  const length = (clamped / 100) * circumference;

  return (
    <View style={styles.ringRow}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <G transform={`rotate(-90 ${center} ${center})`}>
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={colors.cream}
              strokeWidth={stroke}
              fill="none"
            />
            {clamped > 0 ? (
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke={colors.teal}
                strokeWidth={stroke}
                fill="none"
                strokeLinecap={clamped >= 100 ? 'butt' : 'round'}
                {...(clamped >= 100
                  ? {}
                  : { strokeDasharray: `${length} ${circumference - length}` })}
              />
            ) : null}
          </G>
        </Svg>
        <View style={styles.center} pointerEvents="none">
          <Text style={styles.ringValue}>{clamped}%</Text>
        </View>
      </View>
      <Text style={styles.caption}>{caption}</Text>
    </View>
  );
}

export function ShareBars({ items, showPercent = true }: { items: ColoredSlice[]; showPercent?: boolean }) {
  if (items.length === 0) {
    return <Text style={styles.empty}>No reports yet.</Text>;
  }
  return (
    <View>
      {items.map((item) => (
        <View key={item.key} style={styles.barRow}>
          <View style={styles.barHead}>
            <Text style={styles.barLabel}>{item.label}</Text>
            <Text style={styles.barCount}>
              {showPercent ? `${item.count} · ${item.pct}%` : item.count}
            </Text>
          </View>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {
                  width: `${item.count > 0 ? Math.max(item.pct, 4) : 0}%`,
                  backgroundColor: item.color,
                },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

export function CompositionBar({ items }: { items: ColoredSlice[] }) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  return (
    <View>
      <View style={styles.compTrack}>
        {total === 0
          ? null
          : items
              .filter((item) => item.count > 0)
              .map((item) => (
                <View
                  key={item.key}
                  style={{ flex: item.count, backgroundColor: item.color }}
                />
              ))}
      </View>
      <View style={styles.compLegend}>
        {items.map((item) => (
          <View key={item.key} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: item.color }]} />
            <Text style={styles.compLabel}>
              {item.label} · {item.count} · {item.pct}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  donutRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 16,
  },
  ringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    flexGrow: 1,
  },
  center: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerValue: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.ink,
  },
  centerLabel: {
    marginTop: 1,
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
  },
  ringValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.teal,
  },
  caption: {
    flex: 1,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  legend: {
    flexGrow: 1,
    flexBasis: 180,
    gap: 10,
    minWidth: 180,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendLabel: {
    flex: 1,
    color: colors.ink,
    fontWeight: '700',
    fontSize: 13,
  },
  legendCount: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 99,
  },
  barRow: {
    marginBottom: 12,
  },
  barHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  barLabel: {
    fontWeight: '700',
    color: colors.ink,
  },
  barCount: {
    color: colors.muted,
    fontSize: 13,
  },
  track: {
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.cream,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  empty: {
    color: colors.muted,
  },
  compTrack: {
    height: 16,
    borderRadius: 999,
    backgroundColor: colors.cream,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  compLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compLabel: {
    color: colors.ink,
    fontWeight: '600',
    fontSize: 13,
  },
});
