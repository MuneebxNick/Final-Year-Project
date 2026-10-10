import { StyleSheet, Text, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { BrandMark } from '../components/BrandMark';
import { OutlineButton, PrimaryButton } from '../components/Buttons';
import { useBreakpoint } from '../layout/useBreakpoint';
import { webCursor, type WebPressableState } from '../layout/webStyles';
import type { RootStackParamList } from '../navigation';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Landing'>;

export function LandingScreen({ navigation }: Props) {
  const { isWide } = useBreakpoint();

  return (
    <SafeAreaView style={styles.flex}>
      <View style={[styles.content, isWide && styles.contentWide]}>
        <View style={styles.hero}>
          <View style={styles.lockup}>
            <BrandMark height={88} />
            <View>
              <Text style={styles.brand}>Scan</Text>
              <Text style={styles.brandTag}>Safer Roads, Stronger Cities</Text>
            </View>
          </View>
          <Text style={[styles.title, isWide && styles.titleWide]}>
            Report Potholes.{'\n'}Fix Your City.
          </Text>
          <Text style={styles.tagline}>
            Snap a photo, pin the location, and help municipal teams keep roads safe.
          </Text>
          <View style={styles.actions}>
            <PrimaryButton title="Get Started" onPress={() => navigation.navigate('Login')} />
            <OutlineButton
              title="Sign up"
              style={styles.signup}
              onPress={() => navigation.navigate('Signup')}
            />
            <Pressable
              onPress={() => navigation.navigate('AdminLogin')}
              accessibilityRole="button"
              style={(state: WebPressableState) => [
                styles.adminLink,
                webCursor,
                state.hovered && styles.adminHover,
              ]}
            >
              <Text style={styles.adminText}>Municipal Authority</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingVertical: 28,
    justifyContent: 'center',
  },
  contentWide: {
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
    paddingVertical: 48,
  },
  hero: {
    alignItems: 'center',
    gap: 16,
  },
  lockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  brand: {
    color: colors.teal,
    fontWeight: '800',
    letterSpacing: -0.3,
    fontSize: 28,
  },
  brandTag: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  title: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.8,
    textAlign: 'center',
    lineHeight: 42,
  },
  titleWide: {
    fontSize: 42,
    lineHeight: 50,
  },
  tagline: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 360,
    fontWeight: '400',
  },
  actions: {
    alignSelf: 'stretch',
    marginTop: 12,
  },
  signup: {
    marginTop: 12,
  },
  adminLink: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 8,
  },
  adminHover: {
    opacity: 0.7,
  },
  adminText: {
    color: colors.teal,
    fontSize: 15,
    fontWeight: '600',
  },
});
