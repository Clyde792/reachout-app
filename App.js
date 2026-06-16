import 'react-native-url-polyfill/auto';
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { supabase } from './supabase';

import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import ChatScreen from './screens/ChatScreen';
import YouthProfileScreen from './screens/YouthProfileScreen';
import ProfileScreen from './screens/ProfileScreen';
import MyCasesScreen from './screens/MyCasesScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const TABS = [
  { name: 'Dashboard', label: 'Home', icon: 'home', iconOutline: 'home-outline' },
  { name: 'MyCases', label: 'My Cases', icon: 'people', iconOutline: 'people-outline' },
  { name: 'Profile', label: 'Profile', icon: 'person', iconOutline: 'person-outline' },
];

function BubbleTabBar({ state, descriptors, navigation, isDark }) {
  const bgColor = isDark ? '#12122A' : '#FFFFFF';
  const bubbleColor = isDark ? '#1E1E3F' : '#EEF4FF';
  const activeColor = '#007AFF';
  const inactiveColor = isDark ? '#555570' : '#8E8E93';

  return (
    <View style={[tabStyles.container, { backgroundColor: bgColor, borderTopColor: isDark ? '#2D2D44' : '#E5E5EA' }]}>
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
              {focused && (
                <Text style={[tabStyles.label, { color: activeColor }]}>{tab.label}</Text>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 0.5,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    gap: 6,
  },
  label: {
    fontSize: 13,
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
          headerTintColor: '#007AFF',
          headerTitleStyle: { color: colors.text, fontWeight: '600' },
          title: 'Youth Profile',
        }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.header },
          headerTintColor: '#007AFF',
          headerTitleStyle: { color: colors.text, fontWeight: '600' },
          title: 'Conversation',
        }}
      />
    </Stack.Navigator>
  );
}

function PhoneShell({ children }) {
  return (
    <View style={shell.outer}>
      <View style={shell.phone}>
        <View style={shell.notch} />
        <View style={shell.screen}>
          {children}
        </View>
        <View style={shell.homeBar} />
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

  if (loading) return (
    <PhoneShell>
      <View style={styles.center}>
        <Text style={styles.text}>Loading...</Text>
      </View>
    </PhoneShell>
  );

  return (
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
  );
}

const shell = StyleSheet.create({
  outer: { flex: 1, backgroundColor: '#E5E5EA', justifyContent: 'center', alignItems: 'center' },
  phone: {
    width: 390, height: 844,
    backgroundColor: '#0D0D1A',
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
  notch: {
    width: 120, height: 34,
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    alignSelf: 'center',
    marginTop: 8,
  },
  screen: { flex: 1 },
  homeBar: {
    width: 120, height: 5,
    backgroundColor: '#1C1C1E',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 8,
  },
});

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F2F7' },
  text: { color: '#1C1C1E', fontSize: 18 },
});
