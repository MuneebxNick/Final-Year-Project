import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Path, Line, Text as SvgText } from 'react-native-svg';

import { colors } from '../theme';

export type ChartSegment = {
  key: string;
  value: number;
  color: string;
};

export type ColumnPoint = {
  label: string;
  segments: ChartSegment[];
};

export type ChartLegendItem = {
  key: string;
  label: string;
  color: string;
  swatch?: 'bar' | 'line';
};

type Props = {
  points: ColumnPoint[];
  showLine?: boolean;
  showValues?: boolean;
  legend?: ChartLegendItem[];
  height?: number;
};

const HEIGHT = 214;

function niceAxisMax(value: number): number {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const normalized = value / power;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * power;
}

function formatTick(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function smoothLine(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  const low = Math.min(...points.map((point) => point.y));
  const high = Math.max(...points.map((point) => point.y));
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] ?? points[index];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[index + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = clamp(p1.y + (p2.y - p0.y) / 6, low, high);
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = clamp(p2.y - (p3.y - p1.y) / 6, low, high);
    path += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`;
  }
  return path;
}

function topRoundedBar(x: number, y: number, width: number, height: number, radius: number): string {
  const r = Math.min(radius, width / 2, height / 2);
  if (height <= 0 || width <= 0) return '';
  if (r <= 0) return `M ${x} ${y} H ${x + width} V ${y + height} H ${x} Z`;
  return [
    `M ${x} ${y + height}`,
    `V ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    `H ${x + width - r}`,
    `Q ${x + width} ${y} ${x + width} ${y + r}`,
    `V ${y + height}`,
    'Z',
  ].join(' ');
}

export function TrendChart({
  points,
  showLine = false,
  showValues = false,
  legend,
  height = HEIGHT,
}: Props) {
  const [width, setWidth] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    setWidth((current) => (Math.abs(current - next) < 1 ? current : next));
  };

  const totals = points.map((point) =>
    (point.segments ?? []).reduce((sum, segment) => sum + segment.value, 0),
  );
  const yMax = niceAxisMax(Math.max(...totals, 0));
  const ticks = [yMax, yMax / 2, 0];
  const pad = { top: 22, right: 8, bottom: 28, left: 32 };
  const plotWidth = Math.max(width - pad.left - pad.right, 0);
  const plotHeight = height - pad.top - pad.bottom;
  const slot = points.length > 0 ? plotWidth / points.length : plotWidth;
  const barWidth = Math.max(Math.min(slot * 0.52, 42), 0);
  const baseY = pad.top + plotHeight;

  const columns = points.map((point, index) => {
    const x = pad.left + slot * index + (slot - barWidth) / 2;
    const centerX = pad.left + slot * index + slot / 2;
    let cursor = 0;
    const layers = (point.segments ?? []).map((segment) => {
      const layerHeight = yMax === 0 ? 0 : (segment.value / yMax) * plotHeight;
      const y = baseY - cursor - layerHeight;
      cursor += layerHeight;
      return { ...segment, y, height: layerHeight };
    });
    const topIndex = layers.reduce((found, layer, layerIndex) => (layer.height > 0 ? layerIndex : found), -1);
    return { label: point.label, x, centerX, total: totals[index] ?? 0, layers, topIndex };
  });

  const linePoints = columns.map((column) => ({
    x: column.centerX,
    y: baseY - (yMax === 0 ? 0 : (column.total / yMax) * plotHeight),
  }));

  const summary = points
    .map((point) => {
      const total = (point.segments ?? []).reduce((sum, segment) => sum + segment.value, 0);
      return `${point.label} ${total}`;
    })
    .join(', ');

  return (
    <View accessibilityLabel={summary}>
      <View style={[styles.frame, { height }]} onLayout={onLayout}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            {ticks.map((tick) => {
              const y = baseY - (tick / yMax) * plotHeight;
              return (
                <G key={tick}>
                  <Line
                    x1={pad.left}
                    x2={width - pad.right}
                    y1={y}
                    y2={y}
                    stroke={tick === 0 ? colors.inputBorder : colors.border}
                    strokeWidth={1}
                  />
                  <SvgText
                    x={pad.left - 8}
                    y={y}
                    fill={colors.muted}
                    fontSize={11}
                    fontWeight="600"
                    textAnchor="end"
                    alignmentBaseline="middle"
                  >
                    {formatTick(tick)}
                  </SvgText>
                </G>
              );
            })}
            {columns.map((column, index) => (
              <G key={`${column.label}-${index}`}>
                {column.layers.map((layer, layerIndex) => {
                  if (layer.height <= 0) return null;
                  const rounded = layerIndex === column.topIndex;
                  return (
                    <Path
                      key={layer.key}
                      d={
                        rounded
                          ? topRoundedBar(column.x, layer.y, barWidth, layer.height, 7)
                          : `M ${column.x} ${layer.y} H ${column.x + barWidth} V ${layer.y + layer.height} H ${column.x} Z`
                      }
                      fill={layer.color}
                    />
                  );
                })}
                {showValues && column.total > 0 ? (
                  <G key={`value-${column.label}`}>
                    <SvgText
                      x={column.centerX}
                      y={(linePoints[index]?.y ?? baseY) - 14}
                      fill="none"
                      stroke={colors.white}
                      strokeWidth={4}
                      strokeLinejoin="round"
                      fontSize={11}
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      {String(column.total)}
                    </SvgText>
                    <SvgText
                      x={column.centerX}
                      y={(linePoints[index]?.y ?? baseY) - 14}
                      fill={colors.ink}
                      fontSize={11}
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      {String(column.total)}
                    </SvgText>
                  </G>
                ) : null}
                <SvgText
                  x={column.centerX}
                  y={height - 8}
                  fill={colors.muted}
                  fontSize={11}
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {column.label}
                </SvgText>
              </G>
            ))}
            {showLine && linePoints.length > 1 ? (
              <Path
                d={smoothLine(linePoints)}
                stroke={colors.teal}
                strokeWidth={2.5}
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ) : null}
            {showLine
              ? linePoints.map((point, index) => (
                  <Circle
                    key={columns[index]?.label ?? index}
                    cx={point.x}
                    cy={point.y}
                    r={3.5}
                    fill={colors.white}
                    stroke={colors.teal}
                    strokeWidth={2}
                  />
                ))
              : null}
          </Svg>
        ) : null}
      </View>
      {legend && legend.length > 0 ? (
        <View style={styles.legend}>
          {legend.map((item) => (
            <View key={item.key} style={styles.legendItem}>
              {item.swatch === 'line' ? (
                <View style={styles.lineSwatch} />
              ) : (
                <View style={[styles.swatch, { backgroundColor: item.color }]} />
              )}
              <Text style={styles.legendLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  lineSwatch: {
    width: 16,
    height: 3,
    borderRadius: 999,
    backgroundColor: colors.teal,
  },
  legendLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
});
