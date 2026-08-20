import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  BottomTabBar,
  createBottomTabNavigator,
  type BottomTabNavigationProp,
} from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppSidebar, adminSidebarItems } from '../layout/AppSidebar';
import { useBreakpoint } from '../layout/useBreakpoint';
import { webCursor, type WebPressableState } from '../layout/webStyles';
import type { AdminTabParamList, RootStackParamList } from '../navigation';
import { colors } from '../theme';
import { AdminDashboardScreen } from './AdminDashboardScreen';
import { AdminMapScreen } from './AdminMapScreen';
import { AdminPredictiveScreen } from './AdminPredictiveScreen';
import { AdminReportsScreen } from './AdminReportsScreen';

const Tab = createBottomTabNavigator<AdminTabParamList>();

export function AdminTabs() {
  const { isWide } = useBreakpoint();
  const stackNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const navRef = useRef<BottomTabNavigationProp<AdminTabParamList> | null>(null);
  const [current, setCurrent] = useState<keyof AdminTabParamList>('Dashboard');

  const signOut = () => stackNav.reset({ index: 0, routes: [{ name: 'Landing' }] });

  return (
    <View style={[styles.root, isWide && styles.row]}>
      {isWide ? (
        <AppSidebar
          title="RahScan"
          subtitle="Municipal portal"
          items={adminSidebarItems}
          activeKey={current}
          onNavigate={(key) => navRef.current?.navigate(key as keyof AdminTabParamList)}
          footer={
            <Pressable
              onPress={signOut}
              style={(state: WebPressableState) => [
                styles.signOut,
                webCursor,
                state.hovered && styles.signOutHover,
              ]}
            >
              <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>
          }
        />
      ) : null}
      <View style={styles.main}>
        {!isWide ? (
          <SafeAreaView edges={['top']} style={styles.mobileBarWrap}>
            <View style={styles.mobileBar}>
              <Text style={styles.mobileTitle}>Municipal portal</Text>
              <Pressable onPress={signOut} hitSlop={8} style={webCursor}>
                <Text style={styles.mobileSignOut}>Sign out</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        ) : null}
        <Tab.Navigator
          screenListeners={({ navigation }) => {
            navRef.current = navigation;
            return {
              state: (event) => {
                const state = event.data.state;
                const name = state?.routes[state.index]?.name;
                if (name) setCurrent(name as keyof AdminTabParamList);
              },
            };
          }}
          tabBar={(props) => (isWide ? null : <BottomTabBar {...props} />)}
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.teal,
            tabBarInactiveTintColor: colors.muted,
            tabBarStyle: isWide
              ? { display: 'none', height: 0 }
              : {
                  backgroundColor: colors.white,
                  borderTopColor: colors.border,
                  height: 70,
                  paddingBottom: 10,
                  paddingTop: 8,
                },
            tabBarLabelStyle: {
              fontWeight: '600',
              fontSize: 11,
            },
          }}
        >
          <Tab.Screen
            name="Dashboard"
            component={AdminDashboardScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="grid-outline" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Reports"
            component={AdminReportsScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="clipboard-outline" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Map"
            component={AdminMapScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="map-outline" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Predictive"
            component={AdminPredictiveScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="pulse-outline" size={size} color={color} />
              ),
            }}
          />
        </Tab.Navigator>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  row: {
    flexDirection: 'row',
  },
  main: {
    flex: 1,
  },
  mobileBarWrap: {
    backgroundColor: colors.teal,
  },
  mobileBar: {
    backgroundColor: colors.teal,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mobileTitle: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  mobileSignOut: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 15,
  },
  signOut: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  signOutHover: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  signOutText: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '700',
  },
});
