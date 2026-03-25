import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar, ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';

import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import ResultScreen from './screens/ResultScreen';
import MapScreen from './screens/MapScreen';
import ProfileScreen from './screens/ProfileScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const HomeStack = createStackNavigator();

const COLORS = {
  background: '#0f0f1a',
  card: '#1e1e2f',
  primary: '#6c5ce7',
  primaryLight: '#a29bfe',
  text: '#ffffff',
  textSecondary: '#8e8e9a',
  border: '#2d2d44',
};

const DarkTheme = {
  dark: true,
  colors: {
    primary: COLORS.primary,
    background: COLORS.background,
    card: COLORS.card,
    text: COLORS.text,
    border: COLORS.border,
    notification: COLORS.primary,
  },
};

export const AuthContext = React.createContext({
  token: null,
  user: null,
  signIn: () => {},
  signOut: () => {},
});

function TabIcon({ label, focused }) {
  const icons = {
    '心语': focused ? '🍵' : '🫖',
    '心图': focused ? '🗺️' : '📍',
    '我的': focused ? '👤' : '👻',
  };
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ fontSize: 22 }}>
        <StatusBar barStyle="light-content" />
      </View>
    </View>
  );
}

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.background, elevation: 0, shadowOpacity: 0 },
        headerTintColor: COLORS.text,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <HomeStack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ title: '心语', headerShown: false }}
      />
      <HomeStack.Screen
        name="Result"
        component={ResultScreen}
        options={{
          title: '心语结果',
          headerBackTitle: '返回',
          headerStyle: { backgroundColor: COLORS.background, elevation: 0, shadowOpacity: 0 },
        }}
      />
    </HomeStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.border,
          borderTopWidth: 0.5,
          height: 85,
          paddingBottom: 28,
          paddingTop: 8,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: '心语',
          tabBarIcon: ({ focused }) => (
            <View><StatusBar barStyle="light-content" /><View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: focused ? COLORS.primary : 'transparent', borderWidth: focused ? 0 : 1.5, borderColor: COLORS.textSecondary, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: focused ? '#fff' : COLORS.textSecondary }} /></View></View>
          ),
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarLabel: '心图',
          tabBarIcon: ({ focused }) => (
            <View style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: focused ? COLORS.primary : 'transparent', borderWidth: focused ? 0 : 1.5, borderColor: COLORS.textSecondary, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: focused ? '#fff' : COLORS.textSecondary }} /></View>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: '我的',
          tabBarIcon: ({ focused }) => (
            <View style={{ alignItems: 'center' }}><View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: focused ? COLORS.primary : 'transparent', borderWidth: focused ? 0 : 1.5, borderColor: COLORS.textSecondary, marginBottom: 2 }} /><View style={{ width: 20, height: 10, borderTopLeftRadius: 10, borderTopRightRadius: 10, backgroundColor: focused ? COLORS.primary : 'transparent', borderWidth: focused ? 0 : 1.5, borderColor: COLORS.textSecondary }} /></View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('auth_token');
        const storedUser = await AsyncStorage.getItem('auth_user');
        if (storedToken) {
          setToken(storedToken);
          if (storedUser) setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.warn('Failed to load auth state:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadAuth();
  }, []);

  const signIn = useCallback(async (newToken, newUser) => {
    try {
      await AsyncStorage.setItem('auth_token', newToken);
      if (newUser) await AsyncStorage.setItem('auth_user', JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
    } catch (e) {
      console.warn('Failed to save auth state:', e);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove(['auth_token', 'auth_user']);
      setToken(null);
      setUser(null);
    } catch (e) {
      console.warn('Failed to clear auth state:', e);
    }
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ token, user, signIn, signOut }}>
      <NavigationContainer theme={DarkTheme}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {token ? (
            <Stack.Screen name="Main" component={MainTabs} />
          ) : (
            <Stack.Screen
              name="Auth"
              component={AuthScreen}
              options={{ animationTypeForReplace: 'pop' }}
            />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
}
