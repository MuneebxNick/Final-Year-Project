import { StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { colors } from '../theme';

export function RoadGraphic() {
  return (
    <View style={styles.wrap} accessibilityLabel="Road with a pothole">
      <View style={styles.sky} />
      <View style={styles.road}>
        <View style={styles.dashRow}>
          <View style={styles.dash} />
          <View style={styles.dash} />
          <View style={styles.dash} />
        </View>
        <View style={styles.hole}>
          <View style={styles.holeInner} />
        </View>
      </View>
      <View style={styles.badge}>
        <MaterialIcons name="warning-amber" size={22} color={colors.white} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 168,
    height: 168,
    borderRadius: 48,
    backgroundColor: colors.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sky: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 72,
    backgroundColor: '#D5E8EC',
  },
  road: {
    width: 132,
    height: 88,
    marginTop: 36,
    borderRadius: 18,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  dash: {
    width: 18,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  hole: {
    width: 42,
    height: 22,
    borderRadius: 20,
    backgroundColor: '#0A2429',
    alignItems: 'center',
    justifyContent: 'center',
  },
  holeInner: {
    width: 22,
    height: 10,
    borderRadius: 10,
    backgroundColor: '#061418',
  },
  badge: {
    position: 'absolute',
    right: 16,
    bottom: 18,
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.blueMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
