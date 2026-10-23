import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Avatar } from '../../components/Avatar';
import { ProfilePhotoPicker } from '../../components/ProfilePhotoPicker';
import { ProfileSecurityPanel, ProfileTabs, ProfileTab } from '../../components/ProfileAccountSections';
import { Screen } from '../../components/Screen';
import { useApp } from '../../context/AppContext';
import { confirmSignOut } from '../../utils/signOut';
import { colors, shadow, AppTheme, useAppTheme, useThemedStyles, themedColor } from '../../theme';

function showActionError(title: string, error: unknown) {
  const message = error instanceof Error ? error.message : 'Tente novamente.';
  if (Platform.OS === 'web') {
    globalThis.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

function Row({ icon, label, value }: { icon: string; label: string; value?: string }) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return <View style={styles.row}>
    <View style={styles.icon}><MaterialCommunityIcons name={icon as keyof typeof MaterialCommunityIcons.glyphMap} size={18} color={colors.primary} /></View>
    <Text style={styles.rowText}>{label}</Text>
    {!!value && <Text style={styles.value}>{value}</Text>}
  </View>;
}

export default function ProfessionalProfileScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const {
    online, setOnline, orders, isAuthenticated, accountDataLoaded, professionalsLoaded, dataError, professionalsError, refreshAccountData, refreshProfessionals, profile, signOut, updateProfile, professionals, userId,
    notificationsEnabled, setNotificationsEnabled, notifications, markNotificationAsRead, markAllNotificationsAsRead,
  } = useApp();
  const [activeTab, setActiveTab] = useState<ProfileTab>('summary');
  const [availabilityUpdating, setAvailabilityUpdating] = useState(false);
  const completed = orders.filter((order) => order.status === 'done').length;
  const ownProfessional = professionals.find((item) => item.userId === userId);
  const initials = profile.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase();
  const changePhoto = async (photoUri: string, photo: import('../../data/demo').PhotoUploadMetadata) => {
    try {
      await updateProfile({ ...profile, photoUri }, photo);
    } catch (error) {
      console.warn('Não foi possível atualizar a foto do perfil.', error);
      showActionError('Erro ao salvar a foto', error);
    }
  };
  return <Screen>
    <View style={styles.titleRow}><View><Text style={styles.brand}>ATENDEJÁ</Text><Text style={styles.accountType}>CONTA DO PROFISSIONAL</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Editar perfil" onPress={() => router.push(isAuthenticated ? '/profile/edit' : '/')} style={styles.edit}><MaterialCommunityIcons name="pencil-outline" color={colors.primary} size={18} /></Pressable></View>
    <View style={styles.profileCard}>
      <View style={styles.avatarWrap}>{isAuthenticated
        ? <ProfilePhotoPicker uri={profile.photoUri} onChange={(uri, photo) => void changePhoto(uri, photo)} initials={initials || 'MO'} size={68} />
        : <Avatar initials={initials || 'MO'} size={68} color="#E9F3FF" uri={profile.photoUri} />}
        <View style={[styles.onlineDot, { backgroundColor: online ? colors.green : colors.red }]} />
      </View>
      <View style={styles.info}><Text style={styles.name}>{profile.name || 'Perfil profissional'}</Text><Text style={styles.category}>{profile.category || 'Profissional'}</Text><Text style={styles.rating}>{professionalsLoaded ? `★ ${(ownProfessional?.rating ?? 0).toFixed(1)}` : 'Carregando avaliação…'} <Text style={styles.reviews}>{professionalsLoaded ? `(${ownProfessional?.reviews ?? 0} avaliações)` : ''}</Text></Text></View>
    </View>
    {!isAuthenticated && <Pressable accessibilityRole="button" onPress={() => router.push('/')} style={styles.guestBanner}>
      <MaterialCommunityIcons name="account-lock-outline" size={19} color={colors.primary} />
      <View style={{ flex: 1 }}><Text style={styles.availabilityTitle}>Modo visitante</Text><Text style={styles.availabilityText}>Crie uma conta para editar perfil e gerenciar serviços.</Text></View>
      <MaterialCommunityIcons name="chevron-right" size={19} color={colors.primary} />
    </Pressable>}
    <ProfileTabs active={activeTab} onChange={setActiveTab} />
    {activeTab === 'security' ? <ProfileSecurityPanel isAuthenticated={isAuthenticated} /> : <>
    {isAuthenticated && !!dataError && <Pressable accessibilityRole="button" onPress={() => void refreshAccountData()} style={styles.dataError}>
      <MaterialCommunityIcons name="alert-circle-outline" size={17} color={colors.red} />
      <Text style={styles.dataErrorText}>{dataError} · Toque para tentar novamente.</Text>
    </Pressable>}
    {isAuthenticated && !!professionalsError && <Pressable accessibilityRole="button" onPress={() => void refreshProfessionals()} style={styles.dataError}>
      <MaterialCommunityIcons name="alert-circle-outline" size={17} color={colors.red} />
      <Text style={styles.dataErrorText}>{professionalsError} · Toque para tentar novamente.</Text>
    </Pressable>}
    {isAuthenticated && !accountDataLoaded && <Text accessibilityLiveRegion="polite" style={styles.loadingData}>Carregando os dados da conta…</Text>}
    <View style={styles.availability}>
      <View style={[styles.availabilityIcon, { backgroundColor: !isAuthenticated ? colors.paleBlue : online ? colors.paleGreen : colors.paleRed }]}><MaterialCommunityIcons name={!isAuthenticated ? 'eye-outline' : online ? 'radio' : 'radio-off'} size={19} color={!isAuthenticated ? colors.primary : online ? colors.green : colors.red} /></View>
      <View style={styles.availabilityCopy}><Text style={styles.availabilityTitle}>{availabilityUpdating ? 'Atualizando disponibilidade…' : !isAuthenticated ? 'Prévia de disponibilidade' : online ? 'Você está online' : 'Você está offline'}</Text><Text style={styles.availabilityText}>{availabilityUpdating ? 'Atualizando sua disponibilidade cadastrada.' : !isAuthenticated ? 'A disponibilidade só pode ser alterada após criar uma conta.' : online ? 'Clientes próximos podem encontrar você no ponto cadastrado no perfil.' : 'Você não aparecerá no radar dos clientes.'}</Text></View>
      <Switch accessibilityLabel="Disponibilidade online" accessibilityHint="Quando ativada, clientes próximos podem encontrar seu perfil." value={online} disabled={!isAuthenticated || availabilityUpdating} onValueChange={(value) => {
        Haptics.selectionAsync();
        setAvailabilityUpdating(true);
        void setOnline(value)
          .catch((error: unknown) => showActionError('Não foi possível atualizar sua disponibilidade', error))
          .finally(() => setAvailabilityUpdating(false));
      }} trackColor={{ true: colors.green }} />
    </View>
    <View style={styles.stats}>
      <View style={styles.stat}><Text style={[styles.statNumber, styles.statGreen]}>{isAuthenticated && (!accountDataLoaded || !!dataError) ? '—' : completed}</Text><Text style={styles.statLabel}>Serviços concluídos</Text></View><View style={styles.line} />
      <View style={styles.stat}><Text style={[styles.statNumber, styles.statOrange]}>{professionalsLoaded && !professionalsError ? (ownProfessional?.rating ?? 0).toFixed(1) : '—'}</Text><Text style={styles.statLabel}>Avaliação</Text></View><View style={styles.line} />
      <View style={styles.stat}><Text style={[styles.statNumber, styles.statPurple]}>{professionalsLoaded && !professionalsError ? ownProfessional?.reviews ?? 0 : '—'}</Text><Text style={styles.statLabel}>Avaliações</Text></View>
    </View>
    <Text style={styles.section}>Seu negócio</Text>
    <View style={styles.rows}>
      <Pressable accessibilityRole="button" onPress={() => router.push(isAuthenticated ? '/profile/edit' : '/')}><Row icon="text-box-outline" label="Descrição e dados do serviço" value="Editar" /></Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.push(isAuthenticated ? '/profile/portfolio' : '/')}><Row icon="image-multiple-outline" label="Portfólio de trabalhos" value="Gerenciar" /></Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.push(isAuthenticated ? '/profile/edit' : '/')}><Row icon="map-marker-radius-outline" label="Área de atendimento" value={ownProfessional?.district || 'Adicionar'} /></Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.push(isAuthenticated && ownProfessional ? '/profile/reviews' : '/')}><Row icon="star-outline" label="Avaliações recebidas" value={professionalsError ? 'Indisponível' : professionalsLoaded ? String(ownProfessional?.reviews ?? 0) : 'Carregando'} /></Pressable>
      <Pressable onPress={() => router.push(isAuthenticated ? '/profile/edit' : '/')}><Row icon="account-edit-outline" label="Dados pessoais" value="Editar" /></Pressable>
    </View>
    <Text style={styles.section}>Preferências</Text>
    <View style={styles.rows}>
      <View style={styles.notificationPreference}>
        <View style={styles.icon}><MaterialCommunityIcons name="bell-outline" size={18} color={colors.primary} /></View>
        <Text style={styles.notificationLabel}>Notificações</Text>
        <Switch style={styles.notificationSwitch} accessibilityLabel="Ativar notificações" value={notificationsEnabled} disabled={!isAuthenticated} onValueChange={(value) => {
        void setNotificationsEnabled(value).catch((error: unknown) => {
          showActionError('Não foi possível salvar sua preferência', error);
        });
      }} trackColor={{ true: colors.primary }} />
      </View>
      <Pressable accessibilityRole="button" onPress={() => router.push('/profile/appearance')}><Row icon="theme-light-dark" label="Aparência" value="Configurar" /></Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.push('/profile/support?type=support')}><Row icon="help-circle-outline" label="Ajuda e suporte" value="Abrir" /></Pressable>
    </View>
    {!!notifications.length && <View style={styles.notificationCard}>
      <View style={styles.notificationHeading}>
        <Text style={styles.section}>Notificações recentes</Text>
        {notifications.some((item) => item.read === 0) && <Pressable accessibilityRole="button" onPress={() => {
          void markAllNotificationsAsRead().catch((error: unknown) => {
            Alert.alert('Não foi possível atualizar as notificações', error instanceof Error ? error.message : 'Tente novamente.');
          });
        }}><Text style={styles.notificationAction}>Marcar todas como lidas</Text></Pressable>}
      </View>
      {notifications.slice(0, 5).map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`${item.title}${item.read ? ', lida' : ', não lida. Marcar como lida'}`} accessibilityState={{ selected: item.read !== 0 }} onPress={() => {
        if (!item.read) void markNotificationAsRead(item.id).catch((error: unknown) => {
          Alert.alert('Não foi possível atualizar a notificação', error instanceof Error ? error.message : 'Tente novamente.');
        });
      }} style={styles.notificationItem}>
        <View style={{ flex: 1 }}><Text style={styles.notificationTitle}>{item.title}</Text><Text style={styles.availabilityText}>{item.body}</Text></View>
        {!item.read && <View style={styles.unreadDot} />}
      </Pressable>)}
    </View>}
    </>}
    <Pressable accessibilityRole="button" accessibilityLabel={isAuthenticated ? 'Sair da conta' : 'Voltar para entrar'} onPress={() => {
      if (!isAuthenticated) { router.replace('/'); return; }
      confirmSignOut({
        title: 'Sair da conta',
        message: 'Deseja encerrar sua sessão?',
        signOut,
        navigateHome: () => router.replace('/'),
      });
    }} style={styles.logout}>
      <MaterialCommunityIcons name={isAuthenticated ? 'logout' : 'arrow-left'} size={18} color={colors.red} /><Text style={styles.logoutText}>{isAuthenticated ? 'Sair da conta' : 'Voltar para entrar'}</Text>
    </Pressable>
  </Screen>;
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  brand: { color: theme.colors.primaryDark, fontSize: 15, fontWeight: '900', letterSpacing: 0.4 },
  accountType: { color: themedColor('#A1B0C5', theme), fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginTop: 3 },
  edit: { backgroundColor: theme.colors.paleBlue, width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  profileCard: { ...theme.shadow, backgroundColor: theme.colors.surface, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 13 },
  avatarWrap: { position: 'relative' },
  onlineDot: { position: 'absolute', width: 15, height: 15, borderRadius: 8, borderWidth: 2, borderColor: '#fff', bottom: 0, right: 0 },
  info: { flex: 1, gap: 4 },
  name: { color: theme.colors.text, fontWeight: '800', fontSize: 16 },
  category: { color: theme.colors.muted, fontSize: 12 },
  rating: { color: themedColor('#B27D12', theme), fontSize: 11, fontWeight: '700' },
  reviews: { color: theme.colors.muted, fontWeight: '400' },
  availability: { ...theme.shadow, backgroundColor: theme.colors.surface, borderRadius: 16, marginTop: 12, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  guestBanner: { ...theme.shadow, backgroundColor: theme.colors.paleBlue, borderRadius: 15, marginTop: 11, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  availabilityIcon: { width: 37, height: 37, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  availabilityCopy: { flex: 1, gap: 3 },
  availabilityTitle: { color: theme.colors.text, fontWeight: '700', fontSize: 12 },
  availabilityText: { color: theme.colors.muted, fontSize: 10, lineHeight: 14 },
  stats: { ...theme.shadow, backgroundColor: theme.colors.surface, marginTop: 12, borderRadius: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center' },
  loadingData: { color: theme.colors.muted, fontSize: 11, marginTop: 12, textAlign: 'center' },
  dataError: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, borderRadius: 12, padding: 11, backgroundColor: theme.colors.paleRed },
  dataErrorText: { flex: 1, color: theme.colors.red, fontSize: 10, lineHeight: 15 },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statNumber: { color: theme.colors.text, fontSize: 16, fontWeight: '800' },
  statGreen: { color: theme.colors.green },
  statOrange: { color: theme.colors.secondary },
  statPurple: { color: theme.colors.purple },
  statLabel: { color: theme.colors.muted, fontSize: 9 },
  line: { width: 1, height: 29, backgroundColor: theme.colors.border },
  section: { color: theme.colors.text, fontSize: 14, fontWeight: '800', marginTop: 20, marginBottom: 9 },
  rows: { ...theme.shadow, backgroundColor: theme.colors.surface, borderRadius: 16, paddingHorizontal: 12, overflow: 'hidden' },
  notificationPreference: { width: '100%', minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: themedColor('#F0F2F4', theme) },
  notificationLabel: { flex: 1, color: theme.colors.text, fontSize: 11, fontWeight: '600' },
  notificationSwitch: { marginLeft: 'auto' },
  notificationCard: { ...theme.shadow, marginTop: 14, borderRadius: 16, backgroundColor: theme.colors.surface, paddingHorizontal: 12, paddingBottom: 5 },
  notificationHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  notificationAction: { color: theme.colors.primary, fontSize: 9, fontWeight: '700' },
  notificationItem: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 8 },
  notificationTitle: { color: theme.colors.text, fontSize: 11, fontWeight: '700' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary },
  row: { minHeight: 49, flexDirection: 'row', alignItems: 'center', gap: 9, borderBottomWidth: 1, borderBottomColor: themedColor('#F0F2F4', theme) },
  icon: { height: 31, width: 31, borderRadius: 10, backgroundColor: theme.colors.paleBlue, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, color: theme.colors.text, fontSize: 11, fontWeight: '600' },
  value: { color: theme.colors.muted, fontSize: 10 },
  logout: { marginTop: 17, minHeight: 46, borderRadius: 13, backgroundColor: theme.colors.paleRed, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  logoutText: { color: theme.colors.red, fontSize: 12, fontWeight: '700' },
});
