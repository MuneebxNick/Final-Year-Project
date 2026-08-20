import { StyleSheet, Text, View } from 'react-native';

import {
  reportStatusColors,
  reportStatusLabels,
  toUserStatus,
  userStatusColors,
  userStatusLabels,
  type ReportStatus,
} from '../models/report';

type Props = {
  status: ReportStatus;
  variant?: 'admin' | 'user';
};

export function StatusBadge({ status, variant = 'admin' }: Props) {
  const color =
    variant === 'user' ? userStatusColors[toUserStatus(status)] : reportStatusColors[status];
  const label =
    variant === 'user' ? userStatusLabels[toUserStatus(status)] : reportStatusLabels[status];

  return (
    <View style={[styles.badge, { backgroundColor: `${color}18` }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{label}</Text>
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
