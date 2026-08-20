import { StyleSheet, Text, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { OutlineButton, PrimaryButton } from '../components/Buttons';
import { RoadGraphic } from '../components/RoadGraphic';
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
          <Text style={styles.brand}>RahScan</Text>
          <RoadGraphic />
          <Text style={[styles.title, isWide && styles.titleWide]}>
            Report Potholes.{'\n'}Fix Your City.
          </Text>
          <Text style={styles.tagline}>
            Snap a photo, pin the location, and help municipal teams keep roads safe.
          </Text>
        </View>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'space-between',
  },
  contentWide: {
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
    paddingVertical: 40,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  brand: {
    color: colors.tealMid,
    fontWeight: '700',
    letterSpacing: 1.4,
    fontSize: 13,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 8,
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
    paddingBottom: 20,
    paddingTop: 12,
  },
  signup: {
    marginTop: 12,
  },
  adminLink: {
    marginTop: 24,
    alignItems: 'center',
    paddingVertical: 8,
  },
  adminHover: {
    opacity: 0.75,
  },
  adminText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});
