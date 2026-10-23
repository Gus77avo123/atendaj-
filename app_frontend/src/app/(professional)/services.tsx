import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../../components/Avatar';
import { OrderCard } from '../../components/OrderCard';
import { Screen } from '../../components/Screen';
import { useApp } from '../../context/AppContext';
import { ServiceStatus } from '../../data/demo';
import { colors, shadow, AppTheme, useAppTheme, useThemedStyles, themedColor } from '../../theme';

export default function ServicesScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { orders, online, updateOrder, isAuthenticated, accountDataLoaded, profile, dataError, refreshAccountData } = useApp();
  const [filter, setFilter] = useState<'active' | 'done'>('active');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const mine = orders;
  const visible = mine.filter((order) => filter === 'done' ? order.status === 'done' : ['pending', 'accepted', 'in_progress'].includes(order.status));

  const confirm = async (id: string, status: ServiceStatus) => {
    if (updatingOrderId) return;
    Haptics.selectionAsync();
    setUpdatingOrderId(id);
    try {
      await updateOrder(id, status);
    } catch (error) {
      Alert.alert('Não foi possível atualizar o pedido', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return <Screen>
    <View style={styles.top}>
      <View><Text style={styles.greeting}>Olá, {profile.name || 'profissional'} 👋</Text><Text style={styles.title}>Seus serviços</Text></View>
      <View style={[styles.status, { backgroundColor: isAuthenticated ? (online ? colors.paleGreen : colors.paleRed) : colors.paleBlue }]}><View style={[styles.dot, { backgroundColor: isAuthenticated ? (online ? colors.green : colors.red) : colors.primary }]} /><Text style={[styles.statusText, { color: isAuthenticated ? (online ? colors.green : colors.red) : colors.primaryDark }]}>{isAuthenticated ? (online ? 'Online' : 'Offline') : 'Prévia'}</Text></View>
    </View>
    {!isAuthenticated && <Pressable accessibilityRole="button" onPress={() => router.push('/')} style={styles.guestBanner}>
      <MaterialCommunityIcons name="account-lock-outline" size={19} color={colors.primary} />
      <View style={styles.statCopy}><Text style={styles.statTitle}>Modo visitante · somente visualização</Text><Text style={styles.statSub}>Entre ou cadastre-se para aceitar e conversar sobre pedidos.</Text></View>
      <MaterialCommunityIcons name="chevron-right" size={18} color={colors.primary} />
    </Pressable>}
    {!!dataError && isAuthenticated && <Pressable accessibilityRole="button" accessibilityLabel="Tentar carregar pedidos novamente" onPress={() => void refreshAccountData()} style={styles.guestBanner}>
      <MaterialCommunityIcons name="alert-circle-outline" size={19} color={colors.red} />
      <View style={styles.statCopy}><Text style={styles.statTitle}>{dataError}</Text><Text style={styles.statSub}>Toque para tentar carregar novamente.</Text></View>
    </Pressable>}
    <View style={styles.stats}>
      <View style={styles.statIcon}><MaterialCommunityIcons name="clipboard-check-outline" size={19} color={colors.primary} /></View>
      <View style={styles.statCopy}><Text style={styles.statTitle}>{mine.filter((order) => order.status === 'pending').length} solicitações novas</Text><Text style={styles.statSub}>Responda rápido para conquistar o serviço</Text></View>
    </View>
    {isAuthenticated && <Pressable accessibilityRole="button" onPress={() => router.push('/conversations')} style={styles.inquiriesButton}>
      <View style={styles.inquiriesIcon}><MaterialCommunityIcons name="message-image-outline" size={18} color={colors.primary} /></View>
      <View style={styles.statCopy}><Text style={styles.statTitle}>Conversas antes do atendimento</Text><Text style={styles.statSub}>Responda dúvidas e veja fotos enviadas por clientes</Text></View>
      <MaterialCommunityIcons name="chevron-right" size={18} color={colors.primary} />
    </Pressable>}
    <View style={styles.switchRow}>
      <Pressable accessibilityRole="button" accessibilityState={{ selected: filter === 'active' }} onPress={() => setFilter('active')} style={[styles.switchTab, filter === 'active' && styles.switchTabActive]}><Text style={[styles.switchText, filter === 'active' && styles.switchTextActive]}>Em aberto</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityState={{ selected: filter === 'done' }} onPress={() => setFilter('done')} style={[styles.switchTab, filter === 'done' && styles.switchTabActive]}><Text style={[styles.switchText, filter === 'done' && styles.switchTextActive]}>Histórico</Text></Pressable>
    </View>
    {isAuthenticated && !accountDataLoaded && <Text accessibilityLiveRegion="polite" style={styles.emptyCopy}>Carregando seus pedidos…</Text>}
    {visible.map((order) => {
      const professional = order.status;
      return <View key={order.id} style={styles.orderWrap}>
        <OrderCard order={order} counterpartName={order.clientName || 'Cliente'} counterpartPhotoUri={order.clientPhotoUri} onPress={() => router.push(`/order/${order.id}`)} />
        {filter === 'active' && isAuthenticated && (
          <View style={styles.actions}>
            {professional === 'pending' ? <>
              <Pressable accessibilityRole="button" disabled={!!updatingOrderId} onPress={() => Alert.alert('Recusar este pedido?', 'O cliente será informado de que você não poderá atender a solicitação.', [{ text: 'Manter pedido', style: 'cancel' }, { text: 'Recusar pedido', style: 'destructive', onPress: () => void confirm(order.id, 'cancelled') }])} style={[styles.decline, !!updatingOrderId && styles.disabled]}><Text style={styles.declineText}>{updatingOrderId === order.id ? 'Atualizando...' : 'Recusar'}</Text></Pressable>
              <Pressable accessibilityRole="button" disabled={!!updatingOrderId} onPress={() => void confirm(order.id, 'accepted')} style={[styles.accept, !!updatingOrderId && styles.disabled]}><Text style={styles.actionText}>{updatingOrderId === order.id ? 'Atualizando...' : 'Aceitar pedido'}</Text></Pressable>
            </> : <Pressable accessibilityRole="button" onPress={() => {
              const next = professional === 'accepted' ? 'in_progress' : 'done';
              if (next === 'done') Alert.alert('Concluir serviço?', 'Confirme quando o atendimento estiver finalizado.', [{ text: 'Voltar', style: 'cancel' }, { text: 'Concluir', onPress: () => confirm(order.id, 'done') }]);
              else void confirm(order.id, next);
            }} disabled={!!updatingOrderId} style={[styles.accept, !!updatingOrderId && styles.disabled]}><Text style={styles.actionText}>{updatingOrderId === order.id ? 'Atualizando...' : professional === 'accepted' ? 'Iniciar atendimento' : 'Marcar como concluído'}</Text></Pressable>}
            <Pressable accessibilityRole="button" onPress={() => router.push(`/order/${order.id}`)} style={styles.chat}><MaterialCommunityIcons name="message-text-outline" size={17} color={colors.primary} /><Text style={styles.chatText}>Chat</Text></Pressable>
          </View>
        )}
      </View>;
    })}
    {accountDataLoaded && !dataError && !visible.length && <View style={styles.empty}><Avatar initials="✓" size={58} color={colors.paleGreen} /><Text style={styles.emptyTitle}>{filter === 'done' ? 'Nenhum serviço concluído' : 'Tudo em dia!'}</Text><Text style={styles.emptyCopy}>{filter === 'done' ? 'Os serviços concluídos aparecerão aqui.' : 'Novos pedidos aparecerão aqui.'}</Text></View>}
  </Screen>;
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  greeting: { color: theme.colors.muted, fontSize: 12 },
  title: { color: theme.colors.text, fontSize: 23, fontWeight: '800', marginTop: 3 },
  status: { borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: '700' },
  stats: { ...theme.shadow, backgroundColor: theme.colors.surface, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 19 },
  inquiriesButton: { ...theme.shadow, backgroundColor: theme.colors.surface, borderRadius: 16, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: -7, marginBottom: 15 },
  inquiriesIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: theme.colors.paleOrange, alignItems: 'center', justifyContent: 'center' },
  guestBanner: { ...theme.shadow, backgroundColor: theme.colors.paleBlue, borderRadius: 15, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 13 },
  statIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: theme.colors.paleBlue, alignItems: 'center', justifyContent: 'center' },
  statCopy: { flex: 1, gap: 3 },
  statTitle: { color: theme.colors.text, fontSize: 12, fontWeight: '700' },
  statSub: { color: theme.colors.muted, fontSize: 10 },
  switchRow: { backgroundColor: theme.colors.paleBlue, padding: 4, borderRadius: 12, flexDirection: 'row', marginBottom: 14 },
  switchTab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44, borderRadius: 9 },
  switchTabActive: { backgroundColor: theme.colors.surface, ...theme.shadow },
  switchText: { fontSize: 11, color: theme.colors.muted, fontWeight: '600' },
  switchTextActive: { color: theme.colors.primaryDark },
  orderWrap: { marginBottom: 14 },
  actions: { flexDirection: 'row', gap: 8, marginTop: -2, marginBottom: 8 },
  decline: { borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 14, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  declineText: { color: theme.colors.muted, fontSize: 11, fontWeight: '700' },
  accept: { flex: 1, backgroundColor: theme.colors.primary, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  chat: { borderRadius: 12, backgroundColor: theme.colors.paleBlue, paddingHorizontal: 11, height: 40, flexDirection: 'row', alignItems: 'center', gap: 4 },
  chatText: { color: theme.colors.primary, fontSize: 11, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  empty: { alignItems: 'center', paddingTop: 55, gap: 6 },
  emptyTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '700', marginTop: 5 },
  emptyCopy: { color: theme.colors.muted, fontSize: 12 },
});
