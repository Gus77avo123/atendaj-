import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Avatar } from '../../components/Avatar';
import { useApp } from '../../context/AppContext';
import { ChatMessage, InquiryConversation } from '../../services/api';
import { colors, shadow, AppTheme, useAppTheme, useThemedStyles, themedColor } from '../../theme';

export default function InquiryChatScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { listInquiries, loadInquiryMessages, sendInquiryMessage, role, profile, isAuthenticated } = useApp();
  const [conversation, setConversation] = useState<InquiryConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sendError, setSendError] = useState('');
  const messagesView = useRef<ScrollView>(null);
  const isProfessional = role === 'professional';
  const name = isProfessional ? conversation?.cliente?.name : conversation?.provider?.name;
  const avatar = isProfessional ? conversation?.cliente?.profile_image_uri : conversation?.provider?.usuario?.profile_image_uri;
  const providerId = conversation?.provider_id;
  const initials = useMemo(() => (name || 'AJ').trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase(), [name]);

  useEffect(() => {
    if (!id || !isAuthenticated) return;
    let active = true;
    let reportedError = false;
    const refreshMessages = async () => {
      try {
        const next = await loadInquiryMessages(id);
        if (!active) return;
        setMessages(next);
        setError('');
        reportedError = false;
      } catch (reason) {
        console.warn('Não foi possível carregar as mensagens da conversa prévia.', reason);
        if (active && !reportedError) {
          reportedError = true;
          setError(reason instanceof Error ? reason.message : 'Não foi possível carregar as mensagens.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void listInquiries().then((items) => {
      if (!active) return;
      const found = items.find((item) => item.id === id);
      if (!found) {
        setError('Esta conversa não está disponível para sua conta.');
        setLoading(false);
        return;
      }
      setConversation(found);
      void refreshMessages();
    }).catch((reason: unknown) => {
      if (!active) return;
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar esta conversa.');
      setLoading(false);
    });
    const interval = setInterval(() => void refreshMessages(), 5000);
    return () => { active = false; clearInterval(interval); };
  }, [id, isAuthenticated, listInquiries, loadInquiryMessages]);

  const choosePhoto = async () => {
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permissão necessária', 'Permita o acesso às fotos para anexar uma imagem à conversa.');
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
      if (!result.canceled && result.assets[0]?.uri) {
        setPhotoUri(result.assets[0].uri);
        setSendError('');
      }
    } catch (reason) {
      console.warn('Não foi possível selecionar uma foto para a conversa.', reason);
      Alert.alert('Erro ao abrir fotos', 'Tente novamente em instantes.');
    }
  };

  const send = async () => {
    const caption = text.trim();
    if ((!caption && !photoUri) || sending) return;
    setSending(true);
    setSendError('');
    try {
      await sendInquiryMessage(id, caption, photoUri);
      setMessages(await loadInquiryMessages(id));
      setText('');
      setPhotoUri(null);
    } catch (reason) {
      setSendError(reason instanceof Error ? reason.message : 'Não foi possível enviar. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  return <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 82 : 0}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.back}><MaterialCommunityIcons name="arrow-left" size={21} color={colors.text} /></Pressable>
      <Avatar initials={initials} uri={avatar} size={39} color={isProfessional ? colors.paleOrange : colors.paleBlue} />
      <View style={styles.headerCopy}><Text numberOfLines={1} style={styles.name}>{name || (isProfessional ? 'Cliente' : 'Profissional')}</Text><Text style={styles.headerHint}>Conversa antes do atendimento</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Ver conversas" onPress={() => router.push('/conversations')} style={styles.inbox}><MaterialCommunityIcons name="message-text-outline" size={19} color={colors.primary} /></Pressable>
    </View>
    {!isProfessional && <View style={styles.notice}><MaterialCommunityIcons name="information-outline" size={17} color={colors.primary} /><Text style={styles.noticeText}>Tire suas dúvidas ou envie uma foto. Nenhum pedido será criado até você solicitar o atendimento.</Text></View>}
    <ScrollView ref={messagesView} onContentSizeChange={() => messagesView.current?.scrollToEnd({ animated: true })} contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled">
      {loading && <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={styles.hint}>Carregando conversa…</Text></View>}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {!loading && !error && !messages.length && <View style={styles.empty}><MaterialCommunityIcons name="message-plus-outline" size={32} color={colors.primary} /><Text style={styles.emptyTitle}>Comece a conversa</Text><Text style={styles.hint}>Conte o que aconteceu ou anexe uma foto do problema.</Text></View>}
      {messages.map((item) => {
        const own = (isProfessional ? 'professional' : 'client') === item.sender;
        const time = new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return <View key={item.id} style={[styles.messageRow, own && styles.ownRow]}>
          {!own && <Avatar initials={initials} uri={avatar} size={27} color={isProfessional ? colors.paleOrange : colors.paleBlue} />}
          <View style={[styles.bubble, own ? styles.ownBubble : styles.otherBubble]}>
            {!!item.image_uri && <Image accessibilityLabel="Foto enviada na conversa" source={{ uri: item.image_uri }} resizeMode="cover" style={styles.messageImage} />}
            {!!item.text && <Text style={[styles.messageText, own && styles.ownText]}>{item.text}</Text>}
            <Text style={[styles.time, own && styles.ownText]}>{time}</Text>
          </View>
          {own && <Avatar initials={initials || profile.name.slice(0, 1).toUpperCase()} uri={profile.photoUri} size={27} />}
        </View>;
      })}
    </ScrollView>
    {!!sendError && <Text accessibilityRole="alert" style={styles.sendError}>{sendError}</Text>}
    {photoUri && <View style={styles.previewRow}>
      <Image source={{ uri: photoUri }} style={styles.previewImage} />
      <Text style={styles.previewLabel}>Foto anexada</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Remover foto anexada" onPress={() => setPhotoUri(null)} style={styles.removePhoto}><MaterialCommunityIcons name="close" size={17} color={colors.red} /></Pressable>
    </View>}
    <View style={styles.composer}>
      <Pressable accessibilityRole="button" accessibilityLabel="Anexar foto" accessibilityState={{ disabled: sending }} disabled={sending} onPress={() => void choosePhoto()} style={styles.attachButton}><MaterialCommunityIcons name="image-plus" size={22} color={colors.primary} /></Pressable>
      <TextInput accessibilityLabel="Mensagem da conversa" value={text} onChangeText={(value) => { setText(value); setSendError(''); }} placeholder="Escreva uma mensagem..." placeholderTextColor={colors.muted} maxLength={2000} multiline style={styles.input} />
      <Pressable accessibilityRole="button" accessibilityLabel="Enviar mensagem" accessibilityState={{ disabled: sending || (!text.trim() && !photoUri) }} disabled={sending || (!text.trim() && !photoUri)} onPress={() => void send()} style={[styles.sendButton, (sending || (!text.trim() && !photoUri)) && styles.disabled]}><MaterialCommunityIcons name={sending ? 'loading' : 'send'} size={19} color="#fff" /></Pressable>
    </View>
    {!isProfessional && !!providerId && <Pressable accessibilityRole="button" onPress={() => router.push(`/professional/${providerId}`)} style={styles.requestLink}><Text style={styles.requestLinkText}>Solicitar atendimento</Text><MaterialCommunityIcons name="arrow-right" size={17} color={colors.primary} /></Pressable>}
  </KeyboardAvoidingView>;
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  back: { width: 34, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 },
  name: { color: theme.colors.text, fontSize: 13, fontWeight: '800' },
  headerHint: { color: theme.colors.muted, fontSize: 10, marginTop: 3 },
  inbox: { width: 37, height: 37, borderRadius: 12, backgroundColor: theme.colors.paleBlue, alignItems: 'center', justifyContent: 'center' },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, margin: 11, padding: 10, borderRadius: 12, backgroundColor: theme.colors.paleBlue },
  noticeText: { flex: 1, color: theme.colors.primaryDark, fontSize: 10, lineHeight: 15 },
  messages: { flexGrow: 1, paddingHorizontal: 13, paddingVertical: 14, gap: 11 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 7, maxWidth: '88%', alignSelf: 'flex-start' },
  ownRow: { alignSelf: 'flex-end' },
  bubble: { maxWidth: '100%', borderRadius: 16, padding: 9, ...theme.shadow },
  otherBubble: { backgroundColor: theme.colors.surface, borderBottomLeftRadius: 5 },
  ownBubble: { backgroundColor: theme.colors.primary, borderBottomRightRadius: 5 },
  messageText: { color: theme.colors.text, fontSize: 12, lineHeight: 17 },
  ownText: { color: '#fff' },
  messageImage: { width: 210, height: 155, borderRadius: 10, marginBottom: 6, backgroundColor: theme.colors.paleBlue },
  time: { color: theme.colors.muted, fontSize: 9, textAlign: 'right', marginTop: 4 },
  loading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 18 },
  hint: { color: theme.colors.muted, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  error: { color: theme.colors.red, backgroundColor: theme.colors.paleRed, padding: 12, borderRadius: 10, fontSize: 11 },
  empty: { alignItems: 'center', gap: 7, paddingVertical: 38 },
  emptyTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '800' },
  sendError: { color: theme.colors.red, fontSize: 10, paddingHorizontal: 12, paddingBottom: 6 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 13, paddingVertical: 7, backgroundColor: theme.colors.surface },
  previewImage: { width: 42, height: 42, borderRadius: 8 },
  previewLabel: { flex: 1, color: theme.colors.text, fontSize: 11 },
  removePhoto: { padding: 7 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 7, padding: 10, backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.border },
  attachButton: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, minHeight: 42, maxHeight: 110, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 14, color: theme.colors.text, fontSize: 12 },
  sendButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.45 },
  requestLink: { minHeight: 42, marginHorizontal: 10, marginBottom: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: theme.colors.paleBlue, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  requestLinkText: { color: theme.colors.primary, fontSize: 12, fontWeight: '800' },
});
