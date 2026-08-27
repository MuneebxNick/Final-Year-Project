import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { severityColors, toSeverity, type BoundingBox, type OverlayBox, type Severity } from '../models/report';
import { colors, radii } from '../theme';

type Props = {
  uri: string | null;
  boundingBox?: BoundingBox;
  boundingBoxes?: OverlayBox[];
  height?: number;
};

function overlayList(boundingBox?: BoundingBox, boundingBoxes?: OverlayBox[]): OverlayBox[] {
  if (boundingBoxes && boundingBoxes.length > 0) return boundingBoxes;
  if (boundingBox) return [{ ...boundingBox, severity: 'medium' }];
  return [];
}

function boxColor(severity: Severity | string | undefined) {
  const palette = severityColors ?? {};
  return palette[toSeverity(severity)] ?? colors.blueMid;
}

export function PhotoWithBoundingBox({ uri, boundingBox, boundingBoxes, height = 220 }: Props) {
  const boxes = overlayList(boundingBox, boundingBoxes);

  return (
    <View style={[styles.wrap, { height }]}>
      {uri ? (
        <Image source={{ uri }} style={styles.image} />
      ) : (
        <View style={styles.empty}>
          <Ionicons name="image-outline" size={40} color={colors.tealMid} />
        </View>
      )}
      {uri
        ? boxes.map((box, index) => {
            const color = boxColor(box.severity);
            return (
              <View
                key={`${box.left}-${box.top}-${index}`}
                style={[
                  styles.box,
                  {
                    left: `${box.left}%`,
                    top: `${box.top}%`,
                    width: `${box.width}%`,
                    height: `${box.height}%`,
                    borderColor: color,
                  },
                ]}
              >
                <View style={[styles.tag, { backgroundColor: color }]}>
                  <Text style={styles.tagText}>{index + 1}</Text>
                </View>
                <View style={[styles.corner, styles.tl, { borderColor: color }]} />
                <View style={[styles.corner, styles.tr, { borderColor: color }]} />
                <View style={[styles.corner, styles.bl, { borderColor: color }]} />
                <View style={[styles.corner, styles.br, { borderColor: color }]} />
              </View>
            );
          })
        : null}
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
    borderWidth: 2,
    borderRadius: 2,
    backgroundColor: 'transparent',
    pointerEvents: 'none',
  },
  corner: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderColor: colors.blueMid,
  },
  tl: {
    top: -2,
    left: -2,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  tr: {
    top: -2,
    right: -2,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bl: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  br: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  tag: {
    position: 'absolute',
    top: 0,
    left: 0,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
  },
});
