import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs, router } from 'expo-router';
import React from 'react';
import { Pressable } from 'react-native';
import { useApp } from '../../context/AppContext';
import { confirmSignOut } from '../../utils/signOut';
import { useAppTheme } from '../../theme';

const tabs = [
  { name: 'services', title: 'Serviços', icon: 'clipboard-list-outline' },
  { name: 'profile', title: 'Perfil', icon: 'account-circle-outline' },
];

export default function ProfessionalTabs() {
  const { signOut, profile } = useApp();
  const { colors } = useAppTheme();
  const handleSignOut = () => confirmSignOut({
    title: 'Sair da conta?',
    message: 'Você precisará entrar novamente para gerenciar seus serviços.',
    signOut,
    navigateHome: () => router.replace('/'),
  });
  return <Tabs screenOptions={{
    headerStyle: { backgroundColor: colors.surface }, headerTitleStyle: { color: colors.text, fontWeight: '700' },
    tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted,
    tabBarStyle: { height: 66, paddingTop: 7, paddingBottom: 8, borderTopColor: colors.border, backgroundColor: colors.surface },
    tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
  }}>
    {tabs.map(({ name, title, icon }) => (
      <Tabs.Screen key={name} name={name} options={{
        title,
        tabBarAccessibilityLabel: title,
        headerRight: () => <Pressable accessibilityRole="button" accessibilityLabel={`Sair da conta de ${profile.name || 'profissional'}`} onPress={handleSignOut} style={{ minWidth: 48, minHeight: 44, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name="swap-horizontal" size={22} color={colors.primary} />
        </Pressable>,
        tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name={icon as keyof typeof MaterialCommunityIcons.glyphMap} color={color} size={size} />,
      }} />
    ))}
  </Tabs>;
}
