import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { severityColors, toSeverity, type BoundingBox, type OverlayBox, type Severity } from '../models/report';
import { colors, radii } from '../theme';

type Props = {
  uri: string | null;
  boundingBox?: BoundingBox;
  boundingBoxes?: OverlayBox[];
  height?: number;
};

type Size = { width: number; height: number };

type NaturalSize =
  | { state: 'loading' }
  | { state: 'ready'; width: number; height: number }
  | { state: 'unavailable' };

function overlayList(boundingBox?: BoundingBox, boundingBoxes?: OverlayBox[]): OverlayBox[] {
  if (boundingBoxes && boundingBoxes.length > 0) return boundingBoxes;
  if (boundingBox) return [{ ...boundingBox, severity: 'medium' }];
  return [];
}

function boxColor(severity: Severity | string | undefined) {
  const palette = severityColors ?? {};
  return palette[toSeverity(severity)] ?? colors.blueMid;
}

function useNaturalSize(uri: string | null): NaturalSize {
  const [size, setSize] = useState<NaturalSize>({ state: 'loading' });

  useEffect(() => {
    setSize((prev) => (prev.state === 'loading' ? prev : { state: 'loading' }));
    if (!uri) return;

    let active = true;
    Image.getSize(
      uri,
      (width, height) => {
        if (!active) return;
        setSize(width > 0 && height > 0 ? { state: 'ready', width, height } : { state: 'unavailable' });
      },
      () => {
        if (active) setSize({ state: 'unavailable' });
      },
    );

    return () => {
      active = false;
    };
  }, [uri]);

  return size;
}

/**
 * Box percentages are relative to the original image, but `contain` letterboxes that image
 * inside the container, so they have to be resolved against the fitted rect rather than the
 * container. Returns null while the fitted rect is still unknown, and falls back to the whole
 * container if the image size can never be read.
 */
function fittedRect(container: Size | null, natural: NaturalSize): ViewStyle | null {
  if (natural.state === 'unavailable') return { left: 0, top: 0, right: 0, bottom: 0 };
  if (natural.state !== 'ready' || !container) return null;
  if (container.width <= 0 || container.height <= 0) return null;

  const scale = Math.min(container.width / natural.width, container.height / natural.height);
  const width = natural.width * scale;
  const height = natural.height * scale;
  return {
    left: (container.width - width) / 2,
    top: (container.height - height) / 2,
    width,
    height,
  };
}

export function PhotoWithBoundingBox({ uri, boundingBox, boundingBoxes, height = 220 }: Props) {
  const boxes = overlayList(boundingBox, boundingBoxes);
  const [container, setContainer] = useState<Size | null>(null);
  const natural = useNaturalSize(uri);
  const rect = fittedRect(container, natural);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height: measured } = event.nativeEvent.layout;
    setContainer((prev) =>
      prev && prev.width === width && prev.height === measured ? prev : { width, height: measured },
    );
  };

  return (
    <View style={[styles.wrap, { height }]} onLayout={handleLayout}>
      {uri ? (
        <Image source={{ uri }} style={styles.image} resizeMode="contain" />
      ) : (
        <View style={styles.empty}>
          <Ionicons name="image-outline" size={40} color={colors.tealMid} />
        </View>
      )}
      {uri && rect ? (
        <View style={[styles.overlay, rect, { pointerEvents: 'none' }]}>
          {boxes.map((box, index) => {
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
          })}
        </View>
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
  overlay: {
    position: 'absolute',
  },
  box: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 2,
    backgroundColor: 'transparent',
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
