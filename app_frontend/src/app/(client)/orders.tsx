import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { OrderCard } from '../../components/OrderCard';
import { Screen } from '../../components/Screen';
import { useApp } from '../../context/AppContext';
import { ServiceOrder, ServiceStatus } from '../../data/demo';
import { colors, shadow, AppTheme, useAppTheme, useThemedStyles, themedColor } from '../../theme';

const filters: { label: string; value: ServiceStatus | 'all'; color: string; background: string }[] = [
  { label: 'Todos', value: 'all', color: colors.primaryDark, background: colors.paleBlue },
  { label: 'Aguardando', value: 'pending', color: '#946200', background: colors.paleYellow },
  { label: 'Aceitos', value: 'accepted', color: colors.primaryDark, background: colors.paleBlue },
  { label: 'Em andamento', value: 'in_progress', color: colors.teal, background: colors.paleTeal },
  { label: 'Concluídos', value: 'done', color: colors.green, background: colors.paleGreen },
  { label: 'Cancelados', value: 'cancelled', color: colors.red, background: colors.paleRed },
];

function getFilterCount(orders: ServiceOrder[], value: ServiceStatus | 'all') {
  return value === 'all' ? orders.length : orders.filter((order) => order.status === value).length;
}

export default function OrdersScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { orders, professionals, isAuthenticated, accountDataLoaded, dataError, refreshAccountData, history } = useApp();
  const [filter, setFilter] = useState<ServiceStatus | 'all'>('all');
  const filtered = useMemo(() => filter === 'all' ? orders : orders.filter((order) => order.status === filter), [filter, orders]);
  return <Screen>
    <View style={styles.hero}>
      <View style={styles.heroTop}>
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>SEUS ATENDIMENTOS</Text>
          <Text style={styles.title}>Meus pedidos</Text>
        </View>
        <View style={styles.heroIcon}><MaterialCommunityIcons name="clipboard-text-clock-outline" size={25} color="#fff" /></View>
      </View>
      <Text style={styles.subtitle}>Acompanhe o andamento e consulte o histórico dos seus serviços.</Text>
      {isAuthenticated && accountDataLoaded && !dataError && <View style={styles.summary}>
        <View style={[styles.summaryItem, styles.summaryTotal]}>
          <Text style={styles.summaryNumber}>{orders.length}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={[styles.summaryItem, styles.summaryActive]}>
          <Text style={styles.summaryNumber}>{orders.filter((order) => ['pending', 'accepted', 'in_progress'].includes(order.status)).length}</Text>
          <Text style={styles.summaryLabel}>Ativos</Text>
        </View>
        <View style={[styles.summaryItem, styles.summaryDone]}>
          <Text style={styles.summaryNumber}>{orders.filter((order) => order.status === 'done').length}</Text>
          <Text style={styles.summaryLabel}>Concluídos</Text>
        </View>
        <View style={[styles.summaryItem, styles.summaryCancelled]}>
          <Text style={styles.summaryNumber}>{orders.filter((order) => order.status === 'cancelled').length}</Text>
          <Text style={styles.summaryLabel}>Cancelados</Text>
        </View>
      </View>}
    </View>
    {isAuthenticated && <Pressable accessibilityRole="button" onPress={() => router.push('/conversations')} style={styles.conversationsButton}>
      <View style={styles.conversationsIcon}><MaterialCommunityIcons name="message-image-outline" size={19} color={colors.secondary} /></View>
      <View style={styles.conversationsCopy}><Text style={styles.conversationsTitle}>Conversas antes do atendimento</Text><Text style={styles.conversationsSubtitle}>Veja mensagens e fotos trocadas com profissionais</Text></View>
      <MaterialCommunityIcons name="chevron-right" size={19} color={colors.primary} />
    </Pressable>}
    {!!dataError && isAuthenticated && <Pressable accessibilityRole="button" accessibilityLabel="Tentar carregar pedidos novamente" onPress={() => void refreshAccountData()} style={styles.errorBanner}>
      <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.red} />
      <Text style={styles.errorText}>{dataError} · Toque para tentar novamente.</Text>
    </Pressable>}
    <View style={styles.sectionHeading}>
      <View>
        <Text style={styles.sectionTitle}>Seu histórico</Text>
        <Text style={styles.sectionSubtitle}>Filtre os pedidos por situação</Text>
      </View>
      {accountDataLoaded && isAuthenticated && !dataError && <Text style={styles.resultsCount}>{filtered.length} {filtered.length === 1 ? 'pedido' : 'pedidos'}</Text>}
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
      {filters.map((item) => <Pressable
        key={item.value}
        accessibilityRole="button"
        accessibilityLabel={`${item.label}, ${getFilterCount(orders, item.value)} pedidos`}
        accessibilityState={{ selected: filter === item.value }}
        onPress={() => setFilter(item.value)}
        style={[styles.filter, filter === item.value && { backgroundColor: item.background, borderColor: item.color }]}
      >
        <Text style={[styles.filterText, filter === item.value && { color: item.color }]}>{item.label}</Text>
        <Text style={[styles.filterCount, filter === item.value && { color: '#fff', backgroundColor: item.color }]}>{accountDataLoaded && isAuthenticated ? getFilterCount(orders, item.value) : '—'}</Text>
      </Pressable>)}
    </ScrollView>
    {isAuthenticated && !accountDataLoaded && <View accessibilityLiveRegion="polite" style={styles.loading}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.loadingText}>Carregando seus pedidos…</Text>
    </View>}
    {filter === 'done' && isAuthenticated && accountDataLoaded && !dataError && <View style={styles.historyNote}>
      <MaterialCommunityIcons name="archive-check-outline" size={17} color={colors.primary} />
      <Text style={styles.historyCount}>{history.length} {history.length === 1 ? 'atendimento concluído salvo' : 'atendimentos concluídos salvos'} no histórico.</Text>
    </View>}
    {isAuthenticated && accountDataLoaded && filtered.map((order) => {
      const professional = professionals.find((item) => item.id === order.professionalId);
      const titleParts = order.title.split(' • ');
      const counterpartName = professional?.name || titleParts[titleParts.length - 1] || 'Profissional';
      return <OrderCard key={order.id} order={order} counterpartName={counterpartName} counterpartPhotoUri={order.professionalPhotoUri || professional?.photoUri} onPress={() => router.push(`/order/${order.id}`)} />;
    })}
    {(!isAuthenticated || accountDataLoaded && !dataError && filtered.length === 0) && <View style={styles.empty}>
      <View style={styles.emptyIcon}><MaterialCommunityIcons name={isAuthenticated ? orders.length ? 'filter-variant' : 'clipboard-text-outline' : 'account-lock-outline'} size={29} color={colors.primary} /></View>
      <Text style={styles.emptyTitle}>{isAuthenticated ? orders.length ? 'Nenhum pedido nesta categoria' : 'Seu histórico começa aqui' : 'Entre para ver seus pedidos'}</Text>
      <Text style={styles.emptyText}>{isAuthenticated ? orders.length ? 'Escolha outro filtro para ver seus atendimentos.' : 'Quando solicitar um serviço, você poderá acompanhar cada etapa por aqui.' : 'No modo visitante, pedidos e conversas ficam ocultos. Entre ou crie uma conta para acessar seu histórico.'}</Text>
      {isAuthenticated && orders.length > 0 && <Pressable accessibilityRole="button" onPress={() => setFilter('all')} style={styles.joinButton}><Text style={styles.joinButtonText}>Limpar filtro</Text></Pressable>}
      {isAuthenticated && orders.length === 0 && <Pressable accessibilityRole="button" onPress={() => router.push('/(client)/search')} style={styles.joinButton}><Text style={styles.joinButtonText}>Encontrar um profissional</Text></Pressable>}
      {!isAuthenticated && <Pressable accessibilityRole="button" onPress={() => router.push('/')} style={styles.joinButton}><Text style={styles.joinButtonText}>Entrar ou cadastrar</Text></Pressable>}
    </View>}
  </Screen>;
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  hero: { backgroundColor: theme.colors.primaryDark, borderRadius: 22, padding: 18, marginBottom: 20, ...theme.shadow },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroCopy: { flex: 1 },
  eyebrow: { color: themedColor('#B8D5F1', theme), fontSize: 9, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: '#fff', fontSize: 24, fontWeight: '800', letterSpacing: -0.6, marginTop: 4 },
  heroIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  subtitle: { color: themedColor('#D2E1F1', theme), fontSize: 12, lineHeight: 18, marginTop: 8 },
  conversationsButton: { ...theme.shadow, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.colors.surface, borderRadius: 15, padding: 11, marginBottom: 17 },
  conversationsIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: theme.colors.paleOrange, alignItems: 'center', justifyContent: 'center' },
  conversationsCopy: { flex: 1, gap: 3 },
  conversationsTitle: { color: theme.colors.text, fontSize: 11, fontWeight: '800' },
  conversationsSubtitle: { color: theme.colors.muted, fontSize: 9 },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginTop: 17, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', gap: 4 },
  summaryItem: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 7, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.10)' },
  summaryTotal: { borderBottomWidth: 2, borderBottomColor: themedColor('#8FC5FF', theme) },
  summaryActive: { borderBottomWidth: 2, borderBottomColor: themedColor('#FFC46B', theme) },
  summaryDone: { borderBottomWidth: 2, borderBottomColor: themedColor('#75D7A6', theme) },
  summaryCancelled: { borderBottomWidth: 2, borderBottomColor: themedColor('#FF9292', theme) },
  summaryNumber: { color: '#fff', fontSize: 18, fontWeight: '800' },
  summaryLabel: { color: themedColor('#C5D8EB', theme), fontSize: 10 },
  summaryDivider: { height: 27, width: 1, backgroundColor: 'rgba(255,255,255,0.23)' },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '800' },
  sectionSubtitle: { color: theme.colors.muted, fontSize: 11, marginTop: 3 },
  resultsCount: { color: theme.colors.primary, fontSize: 10, fontWeight: '700', backgroundColor: theme.colors.paleBlue, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  filters: { gap: 8, alignItems: 'center', paddingVertical: 10, paddingRight: 2 },
  filter: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 14, paddingHorizontal: 13, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  filterText: { color: theme.colors.muted, fontSize: 10, fontWeight: '600' },
  filterCount: { minWidth: 19, color: theme.colors.primaryDark, fontSize: 9, fontWeight: '800', textAlign: 'center', backgroundColor: theme.colors.paleBlue, borderRadius: 10, paddingHorizontal: 5, paddingVertical: 3 },
  historyNote: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, paddingVertical: 9, marginBottom: 10, borderRadius: 12, backgroundColor: theme.colors.paleBlue },
  historyCount: { flex: 1, color: theme.colors.primaryDark, fontSize: 10, lineHeight: 15 },
  loading: { minHeight: 130, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: theme.colors.muted, fontSize: 12 },
  empty: { alignItems: 'center', paddingVertical: 27, paddingHorizontal: 22, marginTop: 10, backgroundColor: theme.colors.surface, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadow },
  emptyIcon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.paleBlue },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.paleRed, borderRadius: 12, padding: 11, marginBottom: 15 },
  errorText: { flex: 1, color: theme.colors.red, fontSize: 10, lineHeight: 15 },
  emptyTitle: { marginTop: 12, color: theme.colors.text, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  emptyText: { marginTop: 6, color: theme.colors.muted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  joinButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primaryDark, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 13, marginTop: 15 },
  joinButtonText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
