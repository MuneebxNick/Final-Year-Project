import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReportCard } from '../components/ReportCard';
import { useMyReports } from '../data/reportStore';
import { useSession } from '../data/sessionStore';
import { ScreenContainer } from '../layout/ScreenContainer';
import { useBreakpoint } from '../layout/useBreakpoint';
import { webCursor, type WebPressableState } from '../layout/webStyles';
import type { RootStackParamList, UserTabParamList } from '../navigation';
import { colors, radii, shadows } from '../theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<UserTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function HomeScreen({ navigation }: Props) {
  const { isWide } = useBreakpoint();
  const session = useSession();
  const reports = useMyReports();
  const recent = reports.slice(0, 3);
  const firstName = session?.name.split(' ')[0] ?? 'there';

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenContainer>
        <Text style={styles.kicker}>RahScan</Text>
        <Text style={[styles.welcome, isWide && styles.welcomeWide]}>
          Welcome back, {firstName}
        </Text>
        <Text style={styles.lede}>
          Spot a pothole? Capture it, tag the location, and help municipal teams fix the road.
        </Text>

        <View style={isWide ? styles.wideSplit : undefined}>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Report')}
            style={(state: WebPressableState) => [
              styles.cta,
              isWide && styles.ctaWide,
              webCursor,
              state.hovered && styles.ctaHover,
              state.pressed && styles.pressed,
            ]}
          >
            <View style={styles.ctaIcon}>
              <Ionicons name="camera" size={28} color={colors.white} />
            </View>
            <View style={styles.ctaCopy}>
              <Text style={styles.ctaTitle}>Report a Pothole</Text>
              <Text style={styles.ctaHint}>Take a photo or upload from gallery</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.white} />
          </Pressable>

          <View style={isWide ? styles.recentCol : undefined}>
            <View style={styles.sectionHead}>
              <Text style={styles.section}>Recent reports</Text>
              <Pressable
                onPress={() => navigation.navigate('MyReports')}
                hitSlop={8}
                style={webCursor}
              >
                <Text style={styles.link}>See all</Text>
              </Pressable>
            </View>

            {recent.length === 0 ? (
              <Text style={styles.empty}>No reports yet. Submit your first one.</Text>
            ) : (
              <View style={isWide ? styles.grid : undefined}>
                {recent.map((report) => (
                  <View key={report.id} style={isWide ? styles.gridItem : undefined}>
                    <ReportCard
                      report={report}
                      onPress={() =>
                        navigation.navigate('UserReportDetail', { reportId: report.id })
                      }
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
        </ScreenContainer>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scroll: {
    flexGrow: 1,
  },
  welcomeWide: {
    fontSize: 36,
  },
  wideSplit: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 28,
  },
  ctaWide: {
    flex: 1,
    marginBottom: 0,
    minHeight: 148,
    alignSelf: 'stretch',
  },
  ctaHover: {
    backgroundColor: colors.tealMid,
  },
  recentCol: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    flexGrow: 1,
    flexBasis: 300,
    minWidth: 260,
  },
  kicker: {
    color: colors.blue,
    fontWeight: '700',
    letterSpacing: 0.6,
    fontSize: 13,
  },
  welcome: {
    marginTop: 6,
    fontSize: 28,
    fontWeight: '700',
    color: colors.ink,
  },
  lede: {
    marginTop: 10,
    marginBottom: 28,
    color: colors.muted,
    lineHeight: 24,
  },
  cta: {
    backgroundColor: colors.teal,
    borderRadius: radii.card,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 32,
    ...shadows.card,
  },
  pressed: {
    opacity: 0.9,
  },
  ctaIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.blueMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaCopy: {
    flex: 1,
  },
  ctaTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  ctaHint: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  section: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
  },
  link: {
    color: colors.blue,
    fontWeight: '700',
  },
  empty: {
    color: colors.muted,
    marginTop: 12,
  },
});
