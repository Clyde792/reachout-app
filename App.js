import 'react-native-url-polyfill/auto';
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { supabase } from './supabase';
import { registerForPushNotificationsAsync } from './lib/notifications';

import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import ChatScreen from './screens/ChatScreen';
import YouthProfileScreen from './screens/YouthProfileScreen';
import ProfileScreen from './screens/ProfileScreen';
import MyCasesScreen from './screens/MyCasesScreen';
import SocialScreen from './screens/SocialScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const TABS = [
  { name: 'Dashboard', label: 'Home', icon: 'home', iconOutline: 'home-outline' },
  { name: 'MyCases', label: 'My Cases', icon: 'people', iconOutline: 'people-outline' },
  { name: 'Social', label: 'Analysis', icon: 'analytics', iconOutline: 'analytics-outline' },
  { name: 'Profile', label: 'Profile', icon: 'person', iconOutline: 'person-outline' },
];
function BubbleTabBar({ state, descriptors, navigation, isDark }) {
  const insets = useSafeAreaInsets();
  const bgColor = isDark ? '#1A1712' : '#FFFFFF';
  const bubbleColor = isDark ? '#2A271F' : '#FCEFD7';
  const activeColor = '#D97706';
  const inactiveColor = isDark ? '#7A7060' : '#8E8E93';

  return (
    <View style={[tabStyles.outer, { backgroundColor: isDark ? '#251E14' : '#F4F1EC', paddingBottom: (insets.bottom || 0) + 10 }]}>
      <View style={[tabStyles.pill, { backgroundColor: bgColor, borderColor: isDark ? '#2E2A20' : '#E5E5EA' }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const tab = TABS.find(t => t.name === route.name);
        if (!tab) return null;

        return (
          <TouchableOpacity
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            style={tabStyles.tab}
            activeOpacity={0.7}>
            <View style={[tabStyles.bubble, focused && { backgroundColor: bubbleColor }]}>
              <Ionicons
                name={focused ? tab.icon : tab.iconOutline}
                size={22}
                color={focused ? activeColor : inactiveColor}
              />
              <Text numberOfLines={1} style={[tabStyles.label, { color: focused ? activeColor : inactiveColor }]}>
                {tab.label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
      </View>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  outer: {
    paddingTop: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    borderRadius: 30,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
  },
  bubble: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
});

function MainTabs({ worker }) {
  const { colors, isDark } = useTheme();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs">
        {props => (
          <Tab.Navigator
            tabBar={tabProps => <BubbleTabBar {...tabProps} isDark={isDark} />}
            screenOptions={{ headerShown: false }}>
            <Tab.Screen name="Dashboard">
              {p => <DashboardScreen {...p} worker={worker} />}
            </Tab.Screen>
            <Tab.Screen name="MyCases">
              {p => <MyCasesScreen {...p} worker={worker} />}
            </Tab.Screen>
            <Tab.Screen name="Social">
              {p => <SocialScreen {...p} worker={worker} />}
            </Tab.Screen>
            <Tab.Screen name="Profile">
              {p => <ProfileScreen {...p} worker={worker} />}
            </Tab.Screen>
          </Tab.Navigator>
        )}
      </Stack.Screen>
      <Stack.Screen
        name="YouthProfile"
        component={YouthProfileScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.header },
          headerTintColor: '#D97706',
          headerTitleStyle: { color: colors.text, fontWeight: '600' },
          title: 'Youth Profile',
        }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }) => ({
          headerShown: true,
          headerStyle: { backgroundColor: colors.header },
          headerTintColor: '#D97706',
          headerTitleStyle: { color: colors.text, fontWeight: '600' },
          title: route.params?.conversation?.display_name || route.params?.conversation?.username || 'Conversation',
        })}
      />
    </Stack.Navigator>
  );
}

function PhoneShell({ children }) {
  if (Platform.OS !== 'web') {
    return children;
  }
  return (
    <View style={shell.outer}>
      <View style={shell.phone}>
        {/* Screen fills the whole phone (edge to edge); notch & home bar are
            overlaid on top, and a web-only safe-area inset keeps content clear
            of them while backgrounds fill all the way behind. */}
        <SafeAreaInsetsContext.Provider value={{ top: 44, bottom: 20, left: 0, right: 0 }}>
          <View style={shell.screen}>{children}</View>
        </SafeAreaInsetsContext.Provider>
        <View style={shell.notchWrap} pointerEvents="none"><View style={shell.notch} /></View>
        <View style={shell.homeBarWrap} pointerEvents="none"><View style={shell.homeBar} /></View>
      </View>
    </View>
  );
}

export default function App() {
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setWorker(session?.user ?? null);
      setLoading(false);
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      setWorker(session?.user ?? null);
    });
  }, []);

  // Register this device for push and save the token to the worker's profile,
  // so the bot can notify the assigned worker when their youth messages.
  useEffect(() => {
    if (!worker?.email) return;
    registerForPushNotificationsAsync().then(async (token) => {
      if (!token) return;
      try {
        await supabase
          .from('worker_profiles')
          .upsert({ email: worker.email, expo_push_token: token }, { onConflict: 'email' });
      } catch (e) {
        console.error('Save push token error:', e);
      }
    });
  }, [worker]);

  if (loading) return (
    <SafeAreaProvider>
      <PhoneShell>
        <View style={styles.center}>
          <Text style={styles.text}>Loading...</Text>
        </View>
      </PhoneShell>
    </SafeAreaProvider>
  );

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <PhoneShell>
          <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              {!worker ? (
                <Stack.Screen name="Login" component={LoginScreen} />
              ) : (
                <Stack.Screen name="Main">
                  {props => <MainTabs {...props} worker={worker} />}
                </Stack.Screen>
              )}
            </Stack.Navigator>
          </NavigationContainer>
        </PhoneShell>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const shell = StyleSheet.create({
  outer: { flex: 1, backgroundColor: '#E5E5EA', justifyContent: 'center', alignItems: 'center' },
  phone: {
    width: 390, height: 844,
    backgroundColor: '#0E0D0B',
    borderRadius: 54,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 20 },
    elevation: 20,
    borderWidth: 10,
    borderColor: '#1C1C1E',
  },
  screen: { flex: 1 },
  notchWrap: { position: 'absolute', top: 8, left: 0, right: 0, alignItems: 'center', zIndex: 10 },
  notch: {
    width: 120, height: 34,
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
  },
  homeBarWrap: { position: 'absolute', bottom: 8, left: 0, right: 0, alignItems: 'center', zIndex: 10 },
  homeBar: {
    width: 120, height: 5,
    backgroundColor: '#1C1C1E',
    borderRadius: 3,
  },
});

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F1EC' },
  text: { color: '#1C1C1E', fontSize: 18 },
});