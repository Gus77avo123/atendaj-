import { router, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { useApp } from '../../context/AppContext';
import type { AccountSession } from '../../services/api';
import { colors, shadow, AppTheme, useAppTheme, useThemedStyles, themedColor } from '../../theme';

export default function ProfileDevicesScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { isAuthenticated, listSessions, revokeSession, revokeOtherSessions, signOut } = useApp();
  const [sessions, setSessions] = useState<AccountSession[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      router.replace('/');
      return;
    }
    setLoading(true);
    setError('');
    try {
      setSessions(await listSessions());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar os dispositivos.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, listSessions]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const remove = (session: AccountSession) => {
    Alert.alert(session.current ? 'Encerrar e sair?' : 'Encerrar dispositivo?', session.current
      ? 'Esta é a sessão atual. Ela será encerrada e você sairá da conta neste dispositivo.'
      : `A sessão em ${session.device_name} será encerrada.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: session.current ? 'Encerrar e sair' : 'Encerrar', style: 'destructive', onPress: () => {
        const action = session.current
          ? signOut().then(() => router.replace('/'))
          : revokeSession(session.id).then(load);
        void action.catch((reason: unknown) => {
          if (session.current) router.replace('/');
          Alert.alert(session.current ? 'Você saiu da conta' : 'Não foi possível encerrar a sessão', reason instanceof Error ? reason.message : 'Tente novamente.');
        });
      } },
    ]);
  };

  const removeOthers = () => Alert.alert('Encerrar outras sessões?', 'Os outros dispositivos precisarão entrar novamente.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Encerrar', style: 'destructive', onPress: () => {
      void revokeOtherSessions().then(load).catch((reason: unknown) => {
        Alert.alert('Não foi possível encerrar as sessões', reason instanceof Error ? reason.message : 'Tente novamente.');
      });
    } },
  ]);

  return <Screen>
    <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
      <MaterialCommunityIcons name="arrow-left" size={19} color={colors.primary} /><Text style={styles.backText}>Voltar ao perfil</Text>
    </Pressable>
    <Text style={styles.title}>Dispositivos conectados</Text>
    <Text style={styles.subtitle}>Confira as sessões da sua conta e encerre acessos que você não reconhece.</Text>
    {loading && <Text style={styles.info}>Carregando sessões…</Text>}
    {!!error && <Pressable accessibilityRole="button" onPress={() => void load()} style={styles.error}><Text style={styles.errorText}>{error} · Toque para tentar novamente.</Text></Pressable>}
    {!loading && !error && sessions.length === 0 && <Text style={styles.info}>Nenhuma sessão ativa encontrada.</Text>}
    {sessions.map((session) => <View key={session.id} style={styles.card}>
      <View style={styles.deviceIcon}><MaterialCommunityIcons name="cellphone-link" size={21} color={colors.primary} /></View>
      <View style={styles.copy}>
        <Text style={styles.deviceName}>{session.device_name}{session.current ? ' · Este dispositivo' : ''}</Text>
        <Text style={styles.date}>Conectado em {new Date(session.created_at).toLocaleString('pt-BR')}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Encerrar sessão em ${session.device_name}`} onPress={() => remove(session)} style={styles.remove}>
        <MaterialCommunityIcons name="logout" size={18} color={colors.red} />
      </Pressable>
    </View>)}
    {sessions.filter((session) => !session.current).length > 0 && <Pressable accessibilityRole="button" onPress={removeOthers} style={styles.button}>
      <Text style={styles.buttonText}>Encerrar outras sessões</Text>
    </Pressable>}
  </Screen>;
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  back: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 42 },
  backText: { color: theme.colors.primary, fontSize: 12, fontWeight: '700' },
  title: { color: theme.colors.text, fontSize: 24, fontWeight: '800', marginTop: 8 },
  subtitle: { color: theme.colors.muted, fontSize: 13, lineHeight: 19, marginTop: 5, marginBottom: 17 },
  info: { color: theme.colors.muted, textAlign: 'center', paddingVertical: 25 },
  error: { backgroundColor: theme.colors.paleRed, borderRadius: 12, padding: 12 },
  errorText: { color: theme.colors.red, fontSize: 12 },
  card: { ...theme.shadow, backgroundColor: theme.colors.surface, borderRadius: 15, padding: 13, marginBottom: 9, flexDirection: 'row', alignItems: 'center', gap: 11 },
  deviceIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: theme.colors.paleBlue, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 4 },
  deviceName: { color: theme.colors.text, fontSize: 12, fontWeight: '700' },
  date: { color: theme.colors.muted, fontSize: 10 },
  remove: { padding: 8 },
  button: { minHeight: 47, borderRadius: 13, backgroundColor: theme.colors.paleRed, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  buttonText: { color: theme.colors.red, fontWeight: '800', fontSize: 12 },
});
