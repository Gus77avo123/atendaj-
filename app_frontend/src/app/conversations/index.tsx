import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../../components/Avatar';
import { Screen } from '../../components/Screen';
import { useApp } from '../../context/AppContext';
import { InquiryConversation } from '../../services/api';
import { colors, shadow, AppTheme, useAppTheme, useThemedStyles, themedColor } from '../../theme';

export default function ConversationsScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { listInquiries, role, isAuthenticated } = useApp();
  const [conversations, setConversations] = useState<InquiryConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(() => {
    setLoading(true);
    setError('');
    void listInquiries()
      .then(setConversations)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Não foi possível carregar as conversas.'))
      .finally(() => setLoading(false));
  }, [listInquiries]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(role === 'professional' ? '/(professional)/services' : '/(client)/search');
  };

  if (!isAuthenticated) return <Screen><View style={styles.empty}><MaterialCommunityIcons name="account-lock-outline" size={36} color={colors.primary} /><Text style={styles.emptyTitle}>Entre para acessar suas conversas</Text></View></Screen>;

  return <Screen>
    <View style={styles.heading}>
      <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={goBack} style={styles.back}><MaterialCommunityIcons name="arrow-left" size={20} color={colors.primary} /></Pressable>
      <View style={styles.headingCopy}><Text style={styles.eyebrow}>MENSAGENS</Text><Text style={styles.title}>Conversas</Text><Text style={styles.subtitle}>Tire dúvidas e compartilhe fotos antes de solicitar.</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Atualizar conversas" onPress={refresh} style={styles.refresh}><MaterialCommunityIcons name="refresh" size={20} color={colors.primary} /></Pressable>
    </View>
    {loading && <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={styles.info}>Carregando conversas…</Text></View>}
    {!!error && <View style={styles.errorCard}><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={refresh} style={styles.retry}><Text style={styles.retryText}>Tentar novamente</Text></Pressable></View>}
    {!loading && !error && conversations.map((conversation) => {
      const isProfessional = role === 'professional';
      const name = isProfessional ? conversation.cliente?.name : conversation.provider?.name;
      const photo = isProfessional ? conversation.cliente?.profile_image_uri : conversation.provider?.usuario?.profile_image_uri;
      const latest = conversation.messages?.[0];
      return <Pressable key={conversation.id} accessibilityRole="button" accessibilityLabel={`Abrir conversa com ${name || (isProfessional ? 'cliente' : 'profissional')}`} onPress={() => router.push(`/conversation/${conversation.id}`)} style={styles.card}>
        <Avatar initials={(name || 'AJ').trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase()} uri={photo} size={46} color={isProfessional ? colors.paleOrange : colors.paleBlue} />
        <View style={styles.copy}>
          <Text style={styles.name}>{name || (isProfessional ? 'Cliente' : 'Profissional')}</Text>
          <Text numberOfLines={1} style={styles.preview}>{latest?.text || (latest?.image_uri ? 'Foto enviada' : 'Conversa iniciada')}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.muted} />
      </Pressable>;
    })}
    {!loading && !error && !conversations.length && <View style={styles.empty}>
      <View style={styles.emptyIcon}><MaterialCommunityIcons name="message-text-outline" size={30} color={colors.primary} /></View>
      <Text style={styles.emptyTitle}>Nenhuma conversa ainda</Text>
      <Text style={styles.info}>{role === 'professional' ? 'Quando um cliente iniciar uma conversa, ela aparecerá aqui.' : 'Abra o perfil de um profissional para tirar dúvidas e enviar fotos antes de solicitar o serviço.'}</Text>
      {role !== 'professional' && <Pressable accessibilityRole="button" onPress={() => router.push('/(client)/search')} style={styles.retry}><Text style={styles.retryText}>Encontrar profissional</Text></Pressable>}
    </View>}
  </Screen>;
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  back: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.paleBlue },
  headingCopy: { flex: 1 },
  eyebrow: { color: theme.colors.primary, fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: theme.colors.text, fontSize: 24, fontWeight: '800', marginTop: 3 },
  subtitle: { color: theme.colors.muted, fontSize: 11, marginTop: 5 },
  refresh: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.paleBlue },
  card: { ...theme.shadow, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: theme.colors.surface, borderRadius: 16, padding: 12, marginBottom: 10 },
  copy: { flex: 1, gap: 4 },
  name: { color: theme.colors.text, fontSize: 13, fontWeight: '700' },
  preview: { color: theme.colors.muted, fontSize: 11 },
  loading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, padding: 24 },
  info: { color: theme.colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  errorCard: { backgroundColor: theme.colors.paleRed, borderRadius: 14, padding: 14 },
  error: { color: theme.colors.red, fontSize: 12 },
  retry: { alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 11, backgroundColor: theme.colors.paleBlue, marginTop: 12 },
  retryText: { color: theme.colors.primary, fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 25, paddingVertical: 50, gap: 9 },
  emptyIcon: { width: 60, height: 60, borderRadius: 20, backgroundColor: theme.colors.paleBlue, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '800', textAlign: 'center' },
});
