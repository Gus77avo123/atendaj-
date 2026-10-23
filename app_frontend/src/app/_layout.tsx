import { router, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { AppProvider } from '../context/AppContext';
import { useApp } from '../context/AppContext';
import { ensureForegroundLocationPermission } from '../hooks/useCurrentLocation';
import { ThemeProvider, useAppTheme } from '../theme';

const allowedVisitorRoutes = new Set([
  '',
  'index',
  'register',
  'forgot-password',
  'reset-password',
  '(client)/search',
  '(client)/radar',
]);

function VisitorRouteGuard() {
  const { initialized, isAuthenticated, role } = useApp();
  const segments = useSegments();
  const route = segments.join('/');

  useEffect(() => {
    if (initialized && !isAuthenticated && !allowedVisitorRoutes.has(route) && !route.startsWith('professional/')) {
      router.replace(role === 'client' ? '/(client)/search' : '/');
    }
  }, [initialized, isAuthenticated, role, route]);

  return null;
}

function AppNavigation() {
  const { colors, isDark } = useAppTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <VisitorRouteGuard />
      <Stack screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
      }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(client)" />
        <Stack.Screen name="(professional)" />
        <Stack.Screen name="order/[id]" options={{ headerShown: true, title: 'Detalhes do pedido', headerBackTitle: 'Voltar', headerTintColor: colors.primary, headerStyle: { backgroundColor: colors.surface } }} />
        <Stack.Screen name="professional/[id]" options={{ headerShown: true, title: 'Perfil profissional', headerBackTitle: 'Voltar', headerTintColor: colors.primary, headerStyle: { backgroundColor: colors.surface } }} />
        <Stack.Screen name="profile/edit" options={{ headerShown: true, title: 'Editar perfil', headerBackTitle: 'Voltar', headerTintColor: colors.primary, headerStyle: { backgroundColor: colors.surface } }} />
        <Stack.Screen name="profile/change-password" options={{ headerShown: true, title: 'Troca de senha', headerBackTitle: 'Voltar', headerTintColor: colors.primary, headerStyle: { backgroundColor: colors.surface } }} />
        <Stack.Screen name="profile/appearance" options={{ headerShown: true, title: 'Aparência', headerBackTitle: 'Voltar', headerTintColor: colors.primary, headerStyle: { backgroundColor: colors.surface }, headerTitleStyle: { color: colors.text, fontWeight: '700' } }} />
        <Stack.Screen name="profile/devices" options={{ headerShown: false }} />
        <Stack.Screen name="profile/support" options={{ headerShown: false }} />
        <Stack.Screen name="profile/portfolio" options={{ headerShown: false }} />
        <Stack.Screen name="profile/reviews" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: true, title: 'Criar conta', headerBackTitle: 'Voltar', headerTintColor: colors.primary, headerStyle: { backgroundColor: colors.background } }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: true, title: 'Recuperar senha', headerBackTitle: 'Voltar', headerTintColor: colors.primary, headerStyle: { backgroundColor: colors.background } }} />
        <Stack.Screen name="reset-password" options={{ headerShown: true, title: 'Redefinir senha', headerBackTitle: 'Voltar', headerTintColor: colors.primary, headerStyle: { backgroundColor: colors.background } }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    void ensureForegroundLocationPermission(false).catch((error: unknown) => {
      console.warn('Não foi possível verificar a permissão de localização.', error);
    });
  }, []);

  return (
    <ThemeProvider>
      <AppProvider>
        <AppNavigation />
      </AppProvider>
    </ThemeProvider>
  );
}
