import { StyleSheet, Text, View } from 'react-native';

import { severityColors, severityLabels, type Severity } from '../models/report';

export function SeverityBadge({ severity }: { severity: Severity }) {
  const color = severityColors[severity];
  return (
    <View style={[styles.badge, { backgroundColor: `${color}18` }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{severityLabels[severity]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.2,
  },
});
