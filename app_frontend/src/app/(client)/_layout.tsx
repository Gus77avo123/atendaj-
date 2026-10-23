import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { useApp } from '../../context/AppContext';
import { useAppTheme } from '../../theme';

const tabs = [
  { name: 'search', title: 'Início', icon: 'home-outline' },
  { name: 'radar', title: 'Radar', icon: 'map-marker-radius-outline' },
  { name: 'orders', title: 'Histórico', icon: 'clipboard-text-outline' },
  { name: 'profile', title: 'Perfil', icon: 'account-circle-outline' },
];

export default function ClientTabs() {
  const { isAuthenticated } = useApp();
  const { colors } = useAppTheme();
  return <Tabs initialRouteName="search" screenOptions={{
    headerStyle: { backgroundColor: colors.surface }, headerTitleStyle: { color: colors.text, fontWeight: '700' },
    tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted,
    tabBarStyle: { height: 68, paddingTop: 7, paddingBottom: 8, borderTopColor: colors.border, backgroundColor: colors.surface },
    tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
  }}>
    {tabs.map(({ name, title, icon }) => (
      <Tabs.Screen key={name} name={name} options={{
        title, tabBarAccessibilityLabel: title, headerShown: false,
          href: !isAuthenticated && name !== 'search' && name !== 'radar' ? null : undefined,
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name={icon as keyof typeof MaterialCommunityIcons.glyphMap} color={color} size={size} />,
      }} />
    ))}
  </Tabs>;
}
