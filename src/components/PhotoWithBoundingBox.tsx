import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { BoundingBox } from '../models/report';
import { colors, radii } from '../theme';

type Props = {
  uri: string | null;
  boundingBox?: BoundingBox;
  height?: number;
};

export function PhotoWithBoundingBox({ uri, boundingBox, height = 220 }: Props) {
  return (
    <View style={[styles.wrap, { height }]}>
      {uri ? (
        <Image source={{ uri }} style={styles.image} />
      ) : (
        <View style={styles.empty}>
          <Ionicons name="image-outline" size={40} color={colors.tealMid} />
        </View>
      )}
      {uri && boundingBox ? (
        <View
          style={[
            styles.box,
            {
              pointerEvents: 'none',
              left: `${boundingBox.left}%`,
              top: `${boundingBox.top}%`,
              width: `${boundingBox.width}%`,
              height: `${boundingBox.height}%`,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: radii.photo,
    overflow: 'hidden',
    backgroundColor: colors.tealLight,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: colors.blueMid,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 196, 180, 0.18)',
  },
});
