import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert } from 'react-native';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Avatar } from '../../components/Avatar';
import { ProfilePhotoPicker } from '../../components/ProfilePhotoPicker';
import { ProfileSecurityPanel, ProfileTabs, ProfileTab } from '../../components/ProfileAccountSections';
import { Screen } from '../../components/Screen';
import { useApp } from '../../context/AppContext';
import { confirmSignOut } from '../../utils/signOut';
import { colors, shadow, AppTheme, useAppTheme, useThemedStyles, themedColor } from '../../theme';

function SettingRow({ icon, label, value, onPress }: { icon: string; label: string; value?: string; onPress?: () => void }) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const content = <>
    <View style={styles.settingIcon}><MaterialCommunityIcons name={icon as keyof typeof MaterialCommunityIcons.glyphMap} size={19} color={colors.primary} /></View>
    <Text style={styles.settingLabel}>{label}</Text>
    {!!value && <Text style={styles.settingValue}>{value}</Text>}
    {onPress && <MaterialCommunityIcons name="chevron-right" size={19} color="#A9B2BA" />}
  </>;
  return onPress
    ? <Pressable accessibilityRole="button" onPress={onPress} style={styles.setting}>{content}</Pressable>
    : <View style={styles.setting}>{content}</View>;
}

export default function ClientProfileScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const {
    orders, isAuthenticated, accountDataLoaded, dataError, refreshAccountData, profile, signOut, updateProfile, notificationsEnabled, setNotificationsEnabled,
    notifications, markNotificationAsRead, markAllNotificationsAsRead,
  } = useApp();
  const [activeTab, setActiveTab] = useState<ProfileTab>('summary');
  const initials = profile.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase();
  const changePhoto = async (photoUri: string) => {
    try {
      await updateProfile({ ...profile, photoUri });
    } catch (error) {
      console.warn('Não foi possível atualizar a foto do perfil.', error);
      Alert.alert('Erro ao salvar a foto', 'Não foi possível atualizar sua foto. Tente novamente.');
    }
  };
  return <Screen>
    <View style={styles.pageHeading}><View><Text style={styles.brand}>ATENDEJÁ</Text><Text style={styles.accountType}>CONTA DO CLIENTE</Text></View><Text style={styles.pageTitle}>Meu perfil</Text></View>
    <View style={styles.profileCard}>
      {isAuthenticated
        ? <ProfilePhotoPicker uri={profile.photoUri} onChange={(uri) => void changePhoto(uri)} initials={initials || 'VC'} size={68} />
        : <Avatar initials={initials || 'VC'} size={66} uri={profile.photoUri} />}
      <View style={styles.profileInfo}><Text style={styles.name}>{profile.name || 'Visitante'}</Text><Text style={styles.email}>{profile.email || 'Explore o Atende Já'}</Text><Text style={styles.member}>{isAuthenticated ? profile.phone || 'Telefone não informado' : 'Modo visitante · somente consulta'}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Editar perfil" onPress={() => router.push(isAuthenticated ? '/profile/edit' : '/')} style={styles.edit}><MaterialCommunityIcons name="pencil-outline" size={17} color={colors.primary} /></Pressable>
    </View>
    {!isAuthenticated && <Pressable accessibilityRole="button" onPress={() => router.push('/')} style={styles.joinCard}>
      <MaterialCommunityIcons name="account-plus-outline" size={19} color={colors.primary} />
      <View style={{ flex: 1 }}><Text style={styles.joinTitle}>Crie sua conta</Text><Text style={styles.joinSubtitle}>Para pedir serviços e editar seu perfil</Text></View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.primary} />
    </Pressable>}
    <ProfileTabs active={activeTab} onChange={setActiveTab} />
    {activeTab === 'security' ? <ProfileSecurityPanel isAuthenticated={isAuthenticated} /> : <>
    {isAuthenticated && !!dataError && <Pressable accessibilityRole="button" onPress={() => void refreshAccountData()} style={styles.dataError}>
      <MaterialCommunityIcons name="alert-circle-outline" size={17} color={colors.red} />
      <Text style={styles.dataErrorText}>{dataError} · Toque para tentar novamente.</Text>
    </Pressable>}
    {isAuthenticated && !accountDataLoaded && <Text accessibilityLiveRegion="polite" style={styles.loadingData}>Carregando os dados da conta…</Text>}
    <View style={styles.summary}>
      <View style={styles.summaryItem}><Text style={[styles.summaryNumber, styles.summaryBlue]}>{isAuthenticated ? accountDataLoaded && !dataError ? orders.length : '—' : 0}</Text><Text style={styles.summaryLabel}>Pedidos</Text></View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryItem}><Text style={[styles.summaryNumber, styles.summaryGreen]}>{isAuthenticated ? accountDataLoaded && !dataError ? orders.filter((order) => order.status === 'done').length : '—' : 0}</Text><Text style={styles.summaryLabel}>Concluídos</Text></View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryItem}><Text style={[styles.summaryNumber, styles.summaryOrange]}>{isAuthenticated ? accountDataLoaded && !dataError ? orders.filter((order) => order.reviewed).length : '—' : 0}</Text><Text style={styles.summaryLabel}>Avaliações</Text></View>
    </View>
    {isAuthenticated && notifications.length > 0 && <View style={styles.notificationsCard}>
      <View style={styles.notificationsHeading}>
        <Text style={styles.sectionTitle}>Notificações</Text>
        {notifications.some((item) => item.read === 0) && <Pressable accessibilityRole="button" onPress={() => {
          void markAllNotificationsAsRead().catch((error: unknown) => {
            Alert.alert('Não foi possível atualizar as notificações', error instanceof Error ? error.message : 'Tente novamente.');
          });
        }}><Text style={styles.readAll}>Marcar todas como lidas</Text></Pressable>}
      </View>
      {notifications.slice(0, 5).map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`${item.title}${item.read === 0 ? ', não lida. Marcar como lida' : ', lida'}`} accessibilityState={{ selected: item.read !== 0 }} onPress={() => {
        if (item.read === 0) void markNotificationAsRead(item.id).catch((error: unknown) => {
          Alert.alert('Não foi possível atualizar a notificação', error instanceof Error ? error.message : 'Tente novamente.');
        });
      }} style={[styles.notification, item.read === 0 && styles.unreadNotification]}>
        <View style={styles.notificationCopy}>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          <Text style={styles.notificationBody}>{item.body}</Text>
          <Text style={styles.notificationDate}>{new Date(item.created_at).toLocaleString('pt-BR')}</Text>
        </View>
        {item.read === 0 && <View style={styles.unreadDot} />}
      </Pressable>)}
    </View>}
    <Text style={styles.sectionTitle}>Minha conta</Text>
    <View style={styles.settings}>
      <SettingRow icon="account-edit-outline" label="Dados pessoais" value="Editar" onPress={() => router.push(isAuthenticated ? '/profile/edit' : '/')} />
      <SettingRow icon="map-marker-outline" label="Endereço principal" value={profile.serviceArea || 'Adicionar'} onPress={() => router.push(isAuthenticated ? '/profile/edit' : '/')} />
      <SettingRow icon="clipboard-text-outline" label="Histórico de serviços" onPress={() => router.push('/(client)/orders')} />
    </View>
    <Text style={styles.sectionTitle}>Preferências</Text>
    <View style={styles.settings}>
      <View style={styles.setting}>
        <View style={styles.settingIcon}><MaterialCommunityIcons name="bell-outline" size={19} color={colors.primary} /></View>
        <Text style={styles.settingLabel}>Notificações</Text>
        <Switch accessibilityLabel="Ativar notificações" value={notificationsEnabled} disabled={!isAuthenticated} onValueChange={(value) => {
          void setNotificationsEnabled(value).catch((error: unknown) => {
            Alert.alert('Não foi possível salvar sua preferência', error instanceof Error ? error.message : 'Tente novamente.');
          });
        }} trackColor={{ true: colors.primary }} />
      </View>
      <SettingRow icon="theme-light-dark" label="Aparência" value="Configurar" onPress={() => router.push('/profile/appearance')} />
      <SettingRow icon="help-circle-outline" label="Ajuda e suporte" onPress={() => router.push('/profile/support?type=support')} />
    </View>
    </>}
    <Pressable accessibilityRole="button" onPress={() => {
      if (!isAuthenticated) {
        router.replace('/');
        return;
      }
      confirmSignOut({
        title: 'Sair da conta?',
        message: 'Você precisará entrar novamente para acessar seus pedidos e conversas.',
        signOut,
        navigateHome: () => router.replace('/'),
      });
    }} style={styles.logout}>
      <MaterialCommunityIcons name={isAuthenticated ? 'logout' : 'arrow-left'} size={18} color={colors.red} /><Text style={styles.logoutText}>{isAuthenticated ? 'Sair da conta' : 'Voltar para entrar'}</Text>
    </Pressable>
    <Text style={styles.version}>ATENDE JÁ · VERSÃO 1.0.0</Text>
  </Screen>;
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  pageHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 },
  brand: { color: theme.colors.primaryDark, fontSize: 15, fontWeight: '900', letterSpacing: 0.4 },
  accountType: { color: themedColor('#A1B0C5', theme), fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginTop: 3 },
  pageTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '800' },
  profileCard: { ...theme.shadow, backgroundColor: theme.colors.surface, borderRadius: 20, padding: 17, flexDirection: 'row', alignItems: 'center', gap: 13 },
  profileInfo: { flex: 1, gap: 3 },
  name: { color: theme.colors.text, fontWeight: '800', fontSize: 16 },
  email: { color: theme.colors.muted, fontSize: 11 },
  member: { color: theme.colors.primary, fontSize: 10, fontWeight: '600', marginTop: 2 },
  edit: { backgroundColor: theme.colors.paleBlue, width: 33, height: 33, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  joinCard: { ...theme.shadow, marginTop: 12, borderRadius: 15, padding: 12, backgroundColor: theme.colors.paleBlue, flexDirection: 'row', alignItems: 'center', gap: 10 },
  joinTitle: { color: theme.colors.primaryDark, fontSize: 12, fontWeight: '800' },
  joinSubtitle: { color: theme.colors.muted, fontSize: 10, marginTop: 3 },
  summary: { ...theme.shadow, marginTop: 12, borderRadius: 17, paddingVertical: 15, backgroundColor: theme.colors.surface, flexDirection: 'row', alignItems: 'center' },
  loadingData: { color: theme.colors.muted, fontSize: 11, marginTop: 12, textAlign: 'center' },
  dataError: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, borderRadius: 12, padding: 11, backgroundColor: theme.colors.paleRed },
  dataErrorText: { flex: 1, color: theme.colors.red, fontSize: 10, lineHeight: 15 },
  summaryItem: { flex: 1, alignItems: 'center', gap: 3 },
  summaryNumber: { color: theme.colors.text, fontSize: 17, fontWeight: '800' },
  summaryBlue: { color: theme.colors.primary },
  summaryGreen: { color: theme.colors.green },
  summaryOrange: { color: theme.colors.secondary },
  summaryLabel: { color: theme.colors.muted, fontSize: 10 },
  summaryDivider: { width: 1, height: 28, backgroundColor: theme.colors.border },
  notificationsCard: { ...theme.shadow, marginTop: 13, borderRadius: 17, padding: 13, backgroundColor: theme.colors.surface },
  notificationsHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
  readAll: { color: theme.colors.primary, fontSize: 10, fontWeight: '700' },
  notification: { flexDirection: 'row', alignItems: 'center', gap: 9, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingVertical: 10 },
  unreadNotification: { backgroundColor: theme.colors.paleBlue },
  notificationCopy: { flex: 1, gap: 3 },
  notificationTitle: { color: theme.colors.text, fontSize: 11, fontWeight: '700' },
  notificationBody: { color: theme.colors.muted, fontSize: 10, lineHeight: 14 },
  notificationDate: { color: theme.colors.muted, fontSize: 9 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary },
  sectionTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '800', marginTop: 21, marginBottom: 9 },
  settings: { ...theme.shadow, overflow: 'hidden', backgroundColor: theme.colors.surface, borderRadius: 17, paddingHorizontal: 12 },
  setting: { minHeight: 53, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: themedColor('#F0F2F4', theme), gap: 10 },
  settingIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.paleBlue },
  settingLabel: { flex: 1, color: theme.colors.text, fontSize: 12, fontWeight: '600' },
  settingValue: { color: theme.colors.muted, fontSize: 10 },
  logout: { marginTop: 20, minHeight: 48, borderRadius: 14, backgroundColor: theme.colors.paleRed, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  logoutText: { color: theme.colors.red, fontSize: 13, fontWeight: '700' },
  version: { textAlign: 'center', color: themedColor('#A9B2BA', theme), fontSize: 9, letterSpacing: 1, marginTop: 14 },
});
