import { Image, type ImageStyle, type StyleProp } from 'react-native';

const source = require('../../assets/rahscan-mark.png');
const RATIO = 394 / 596;

type Props = {
  height?: number;
  style?: StyleProp<ImageStyle>;
};

export function BrandMark({ height = 72, style }: Props) {
  return (
    <Image
      source={source}
      resizeMode="contain"
      accessibilityLabel="Scan"
      style={[{ width: Math.round(height * RATIO), height }, style]}
    />
  );
}
