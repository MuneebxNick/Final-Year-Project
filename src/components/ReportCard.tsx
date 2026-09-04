import { Image, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { webCursor, type WebPressableState } from '../layout/webStyles';
import { formatReportDate, roadTypeLabels, type Report } from '../models/report';
import { colors, radii, shadows } from '../theme';
import { SeverityBadge } from './SeverityBadge';
import { StatusBadge } from './StatusBadge';

type Props = {
  report: Report;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function ReportCard({ report, onPress, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={(state: WebPressableState) => [
        styles.card,
        webCursor,
        state.hovered && styles.hovered,
        state.pressed && styles.pressed,
        style,
      ]}
    >
      <View style={styles.thumb}>
        {report.photoUri ? (
          <Image source={{ uri: report.photoUri }} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="image-outline" size={28} color={colors.tealMid} />
          </View>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.refId}>{report.referenceId}</Text>
        <View style={styles.badges}>
          <SeverityBadge severity={report.severity} />
          <StatusBadge status={report.status} variant="user" />
        </View>
        <Text style={styles.city} numberOfLines={1}>
          {report.city}
          <Text style={styles.area}> · {report.area}</Text>
        </Text>
        <Text style={styles.meta}>
          {roadTypeLabels[report.roadType]} · {formatReportDate(report.createdAt)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 14,
    marginBottom: 14,
    ...shadows.card,
  },
  pressed: {
    opacity: 0.94,
  },
  hovered: {
    borderColor: colors.tealMid,
  },
  thumb: {
    width: 76,
    height: 76,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.tealLight,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    justifyContent: 'center',
  },
  refId: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.teal,
    marginBottom: 6,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  city: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  area: {
    fontWeight: '500',
    color: colors.muted,
  },
  meta: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 13,
  },
});
