import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OutlineButton } from '../components/Buttons';
import { reportStore, useMyReports } from '../data/reportStore';
import { sessionStore, useSession } from '../data/sessionStore';
import { ScreenContainer } from '../layout/ScreenContainer';
import { useBreakpoint } from '../layout/useBreakpoint';
import { webCursor, type WebPressableState } from '../layout/webStyles';
import type { RootStackParamList, UserTabParamList } from '../navigation';
import { colors, radii, shadows } from '../theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<UserTabParamList, 'Profile'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function ProfileScreen({ navigation }: Props) {
  const { isWide } = useBreakpoint();
  const session = useSession();
  const reports = useMyReports();

  const signOut = () => {
    sessionStore.signOut();
    reportStore.clear();
    const stack = navigation.getParent() as
      | NativeStackNavigationProp<RootStackParamList>
      | undefined;
    stack?.reset({ index: 0, routes: [{ name: 'Landing' }] });
  };

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <ScreenContainer style={styles.container}>
        <Text style={styles.title}>Profile</Text>
        <View style={[styles.card, isWide && styles.cardWide]}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={32} color={colors.teal} />
          </View>
          <Text style={styles.name}>{session?.name ?? 'Citizen'}</Text>
          <Text style={styles.email}>{session?.email ?? '—'}</Text>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{reports.length}</Text>
            <Text style={styles.statLabel}>reports this session</Text>
          </View>
        </View>
        <Pressable
          style={(state: WebPressableState) => [
            styles.row,
            webCursor,
            isWide && styles.rowWide,
            state.hovered && styles.rowHover,
          ]}
          onPress={() => navigation.navigate('MyReports')}
        >
          <Ionicons name="list-outline" size={20} color={colors.teal} />
          <Text style={styles.rowLabel}>My reports</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
        <OutlineButton title="Sign out" onPress={signOut} style={[styles.signOut, isWide && styles.signOutWide]} />
      </ScreenContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  container: {
    flex: 1,
  },
  cardWide: {
    maxWidth: 480,
  },
  rowWide: {
    maxWidth: 480,
  },
  rowHover: {
    borderColor: colors.blueMid,
  },
  signOutWide: {
    maxWidth: 480,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 24,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    ...shadows.card,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    marginTop: 14,
    fontSize: 22,
    fontWeight: '800',
    color: colors.ink,
  },
  email: {
    marginTop: 4,
    color: colors.muted,
  },
  stat: {
    marginTop: 20,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.blue,
  },
  statLabel: {
    color: colors.muted,
    marginTop: 2,
  },
  row: {
    marginTop: 16,
    backgroundColor: colors.white,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowLabel: {
    flex: 1,
    fontWeight: '700',
    color: colors.ink,
  },
  signOut: {
    marginTop: 28,
  },
});
