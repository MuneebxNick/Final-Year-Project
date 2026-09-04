import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  BottomTabBar,
  createBottomTabNavigator,
  type BottomTabNavigationProp,
} from '@react-navigation/bottom-tabs';

import { AppSidebar, citizenSidebarItems } from '../layout/AppSidebar';
import { useBreakpoint } from '../layout/useBreakpoint';
import type { UserTabParamList } from '../navigation';
import { colors } from '../theme';
import { HomeScreen } from './HomeScreen';
import { MyReportsScreen } from './MyReportsScreen';
import { ProfileScreen } from './ProfileScreen';
import { ReportScreen } from './ReportScreen';
import { UserMapScreen } from './UserMapScreen';

const Tab = createBottomTabNavigator<UserTabParamList>();

export function UserTabs() {
  const { isWide } = useBreakpoint();
  const navRef = useRef<BottomTabNavigationProp<UserTabParamList> | null>(null);
  const [current, setCurrent] = useState<keyof UserTabParamList>('Home');

  return (
    <View style={[styles.root, isWide && styles.row]}>
      {isWide ? (
        <AppSidebar
          items={citizenSidebarItems}
          activeKey={current}
          onNavigate={(key) => navRef.current?.navigate(key as keyof UserTabParamList)}
        />
      ) : null}
      <View style={styles.main}>
        <Tab.Navigator
          screenListeners={({ navigation }) => {
            navRef.current = navigation;
            return {
              state: (event) => {
                const state = event.data.state;
                const name = state?.routes[state.index]?.name;
                if (name) setCurrent(name as keyof UserTabParamList);
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
            name="Home"
            component={HomeScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="home-outline" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Report"
            component={ReportScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="camera-outline" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="MyReports"
            component={MyReportsScreen}
            options={{
              title: 'My Reports',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="list-outline" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Map"
            component={UserMapScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="map-outline" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="person-outline" size={size} color={color} />
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
});
