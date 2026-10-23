import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Avatar } from '../../components/Avatar';
import { useApp } from '../../context/AppContext';
import { ServiceStatus } from '../../data/demo';
import { ChatMessage } from '../../services/api';
import { colors, shadow, AppTheme, useAppTheme, useThemedStyles, themedColor } from '../../theme';

const statusLabels: Record<ServiceStatus, string> = {
  pending: 'Aguardando resposta',
  accepted: 'Pedido aceito',
  in_progress: 'Serviço em andamento',
  done: 'Serviço concluído',
  cancelled: 'Pedido cancelado',
};

export default function OrderDetailsScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { orders, professionals, role, isAuthenticated, profile, accountDataLoaded, dataError, refreshAccountData, updateOrder, rateOrder, loadMessages, sendMessage } = useApp();
  const order = useMemo(() => orders.find((item) => item.id === id), [orders, id]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [chatError, setChatError] = useState('');
  const [sendError, setSendError] = useState('');
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [ratingError, setRatingError] = useState('');
  const [ratingSaving, setRatingSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const professional = order ? professionals.find((item) => item.id === order.professionalId) : undefined;
  const isProfessional = role === 'professional';
  const canReview = isAuthenticated && !!order?.completedAt && Date.now() - order.completedAt <= 48 * 60 * 60 * 1000;

  useEffect(() => {
    if (!id || !isAuthenticated) return;
    let reportedError = false;
    const refreshMessages = () => loadMessages(id)
      .then((nextMessages) => {
        reportedError = false;
        setMessages(nextMessages);
        setMessagesLoading(false);
        setChatError('');
      })
      .catch((error: unknown) => {
        console.warn('Não foi possível carregar as mensagens do pedido.', error);
        setMessagesLoading(false);
        if (!reportedError) {
          reportedError = true;
          setChatError(error instanceof Error ? error.message : 'Não foi possível carregar a conversa.');
        }
      });
    void refreshMessages();
    const interval = setInterval(() => void refreshMessages(), 4000);
    return () => clearInterval(interval);
  }, [id, isAuthenticated, loadMessages]);

  if (!order) return <View style={styles.notFound}>
    <Text accessibilityLiveRegion="polite" style={styles.notFoundText}>
      {!accountDataLoaded
        ? 'Carregando os detalhes do pedido…'
        : dataError
          ? `Não foi possível carregar o pedido. ${dataError}`
          : 'Este pedido não foi encontrado ou não está mais disponível na sua conta.'}
    </Text>
    {dataError && <Pressable accessibilityRole="button" onPress={() => void refreshAccountData()} style={styles.notFoundButton}>
      <Text style={styles.notFoundButtonText}>Tentar novamente</Text>
    </Pressable>}
    <Pressable accessibilityRole="button" onPress={() => router.replace(isProfessional ? '/(professional)/services' : '/(client)/orders')} style={styles.notFoundButton}>
      <Text style={styles.notFoundButtonText}>{isProfessional ? 'Voltar aos serviços' : 'Voltar aos pedidos'}</Text>
    </Pressable>
  </View>;

  const send = async () => {
    const text = message.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await sendMessage(order.id, text);
      setMessages(await loadMessages(order.id));
      setMessage('');
      setChatError('');
      setSendError('');
      Haptics.selectionAsync();
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Não foi possível enviar a mensagem. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  const updateStatus = async (status: ServiceStatus) => {
    if (statusSaving) return;
    setStatusSaving(true);
    try {
      await updateOrder(order.id, status);
    } catch (error) {
      Alert.alert('Não foi possível atualizar o pedido', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setStatusSaving(false);
    }
  };

  const openDirections = async () => {
    const address = order.address?.trim();
    if (!address) {
      Alert.alert('Endereço indisponível', 'O cliente ainda não informou o endereço do atendimento.');
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}&travelmode=driving`;
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Não foi possível abrir o Google Maps', error instanceof Error ? error.message : 'Verifique se há um navegador ou Google Maps instalado.');
    }
  };

  const setStatus = (status: ServiceStatus) => {
    if (status === 'cancelled') {
      Alert.alert('Recusar este pedido?', 'O cliente será informado de que você não poderá atender a solicitação.', [
        { text: 'Manter pedido', style: 'cancel' },
        { text: 'Recusar pedido', style: 'destructive', onPress: () => void updateStatus(status) },
      ]);
    } else if (status === 'done') {
      Alert.alert('Concluir serviço?', 'Confirme quando o atendimento estiver finalizado.', [
        { text: 'Voltar', style: 'cancel' },
        { text: 'Concluir', onPress: () => void updateStatus(status) },
      ]);
    } else {
      void updateStatus(status);
    }
  };

  const submitRating = async () => {
    if (!rating) {
      setRatingError('Escolha de 1 a 5 estrelas antes de enviar sua avaliação.');
      return;
    }
    setRatingError('');
    setRatingSaving(true);
    try {
      await rateOrder(order.id, rating);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Obrigado pela avaliação!', 'Sua opinião ajuda outras pessoas a encontrarem bons profissionais.');
    } catch (error) {
      Alert.alert('Não foi possível enviar a avaliação', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setRatingSaving(false);
    }
  };

  return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
    <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {!isAuthenticated && <Pressable onPress={() => router.push('/')} style={styles.guestBanner}>
        <MaterialCommunityIcons name="account-lock-outline" size={18} color={colors.primary} />
        <Text style={styles.guestBannerText}>Modo visitante: pedido e conversa somente para visualização.</Text>
      </Pressable>}
      <View style={styles.orderHeading}>
        <View style={styles.orderId}><MaterialCommunityIcons name="receipt-text-outline" size={16} color={colors.primary} /><Text style={styles.orderIdText}>PEDIDO #{order.id}</Text></View>
        <Text style={[styles.status, { color: order.status === 'cancelled' ? colors.red : order.status === 'done' ? colors.green : colors.primary }]}>{statusLabels[order.status]}</Text>
      </View>
      <View style={styles.serviceCard}>
        <View style={styles.serviceTop}>
          <View style={[styles.iconCircle, { backgroundColor: professional?.color ?? colors.paleBlue }]}><MaterialCommunityIcons name="tools" size={22} color={colors.primary} /></View>
          <View style={styles.serviceCopy}><Text style={styles.serviceTitle}>{order.title}</Text><Text style={styles.serviceDate}>Solicitado em {order.createdAt}</Text></View>
        </View>
        <View style={styles.separator} />
        <Text style={styles.infoLabel}>DESCRIÇÃO DO SERVIÇO</Text>
        <Text style={styles.description}>{order.description || 'Nenhuma descrição adicional foi informada.'}</Text>
        <View style={styles.detailDivider} />
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="map-marker-outline" size={17} color={colors.primary} />
          <View style={styles.detailCopy}><Text style={styles.infoLabel}>LOCAL DO ATENDIMENTO</Text><Text style={styles.detailValue}>{order.address || 'Endereço não informado no pedido'}</Text></View>
        </View>
        {isProfessional && order.status === 'pending' && <Text style={styles.locationHint}>O endereço será disponibilizado depois que você aceitar o pedido.</Text>}
        {isProfessional && (order.status === 'accepted' || order.status === 'in_progress') && <Pressable accessibilityRole="link" accessibilityLabel="Ir até o cliente pelo Google Maps" onPress={() => void openDirections()} style={styles.directionsButton}>
          <MaterialCommunityIcons name="google-maps" size={18} color="#fff" />
          <Text style={styles.directionsButtonText}>Ir até o cliente</Text>
        </Pressable>}
        <View style={styles.detailDivider} />
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="currency-usd" size={17} color={colors.primary} />
          <View style={styles.detailCopy}><Text style={styles.infoLabel}>VALOR E PAGAMENTO</Text><Text style={styles.detailValue}>Combinados diretamente com o profissional</Text></View>
        </View>
      </View>

      <View style={styles.personCard}>
        <Avatar initials={isProfessional ? order.clientName.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase() || 'AJ' : professional?.initials ?? 'AJ'} size={45} color={isProfessional ? '#FFF0E4' : professional?.color} uri={isProfessional ? order.clientPhotoUri : order.professionalPhotoUri || professional?.photoUri} />
        <View style={styles.personInfo}><Text style={styles.personLabel}>{isProfessional ? 'CLIENTE' : 'PROFISSIONAL'}</Text><Text style={styles.personName}>{isProfessional ? order.clientName : professional?.name ?? 'Prestador de serviço'}</Text></View>
      </View>

      <View style={styles.progressCard}>
        <View style={styles.progressHeader}><Text style={styles.sectionTitle}>Acompanhamento</Text><Text style={[styles.progressStatus, { color: order.status === 'cancelled' ? colors.red : order.status === 'done' ? colors.green : colors.primary }]}>{statusLabels[order.status]}</Text></View>
        {order.status === 'cancelled' ? <View style={styles.terminalStatus}>
          <MaterialCommunityIcons name="close-circle-outline" size={22} color={colors.red} />
          <View style={styles.detailCopy}><Text style={styles.terminalTitle}>Pedido cancelado</Text><Text style={styles.chatHint}>Última atualização: {order.updatedAt || 'data não disponível'}</Text></View>
        </View> : <>
          <View accessibilityLabel={`Andamento do pedido: ${statusLabels[order.status]}`} style={styles.progressRow}>
            {(['pending', 'accepted', 'in_progress', 'done'] as ServiceStatus[]).map((step, index) => {
              const active = ['pending', 'accepted', 'in_progress', 'done'].indexOf(order.status) >= index;
              const labels = ['Solicitado', 'Aceito', 'Em atendimento', 'Concluído'];
              return <React.Fragment key={step}>
                <View style={styles.step}><View style={[styles.stepCircle, active && styles.stepCircleActive]}>{active && <MaterialCommunityIcons name="check" size={12} color="#fff" />}</View><Text style={[styles.stepText, active && styles.stepTextActive]}>{labels[index]}</Text></View>
                {index < 3 && <View style={[styles.stepLine, active && styles.stepLineActive]} />}
              </React.Fragment>;
            })}
          </View>
          <View style={styles.timelineDate}><MaterialCommunityIcons name="clock-outline" size={14} color={colors.muted} /><Text style={styles.chatHint}>{order.status === 'pending' ? 'Pedido criado em' : 'Última atualização do pedido'}: {order.updatedAt || order.createdAt}</Text></View>
          {order.status === 'pending' && <Text style={styles.nextStepHint}>Aguardando o profissional aceitar ou recusar sua solicitação.</Text>}
          {order.status === 'accepted' && <Text style={styles.nextStepHint}>Pedido aceito. Combine os detalhes e o horário pelo chat.</Text>}
          {order.status === 'in_progress' && <Text style={styles.nextStepHint}>O atendimento está em andamento. Use o chat se precisar alinhar algum detalhe.</Text>}
          {order.status === 'done' && <Text style={styles.nextStepHint}>Atendimento finalizado. Consulte as informações acima ou avalie o profissional.</Text>}
        </>}
      </View>

      {order.status === 'done' && !isProfessional && !order.reviewed && canReview && (
        <View style={styles.reviewCard}>
          <Text style={styles.sectionTitle}>Como foi o atendimento?</Text>
          <Text style={styles.reviewHint}>Sua avaliação ficará visível no perfil do profissional.</Text>
          <View style={styles.stars}>{[1, 2, 3, 4, 5].map((value) => <Pressable key={value} accessibilityRole="button" accessibilityLabel={`${value} ${value === 1 ? 'estrela' : 'estrelas'}`} accessibilityState={{ selected: value === rating }} onPress={() => { setRating(value); setRatingError(''); }} style={styles.starButton}><MaterialCommunityIcons name={value <= rating ? 'star' : 'star-outline'} size={29} color="#E9AD2D" /></Pressable>)}</View>
          {ratingError ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.chatError}>{ratingError}</Text> : null}
          <Pressable accessibilityRole="button" disabled={ratingSaving} onPress={() => void submitRating()} style={[styles.rateButton, ratingSaving && styles.disabled]}><Text style={styles.buttonText}>{ratingSaving ? 'Enviando...' : 'Enviar avaliação'}</Text></Pressable>
        </View>
      )}
      {!!order.reviewed && <View style={styles.reviewDone}><MaterialCommunityIcons name="star-check" size={18} color={colors.green} /><Text style={styles.reviewDoneText}>Você avaliou este atendimento com {order.rating} estrelas.</Text></View>}

      {isAuthenticated && (order.status === 'pending' || order.status === 'accepted' || order.status === 'in_progress') && (
        <View style={styles.chatCard}>
          <View style={styles.chatHeader}><View><Text style={styles.sectionTitle}>Chat do pedido</Text><Text style={styles.chatHint}>Converse sobre os detalhes do serviço</Text></View><View style={styles.secure}><MaterialCommunityIcons name="lock-outline" size={12} color={colors.green} /><Text style={styles.secureText}>Privado</Text></View></View>
          <View style={styles.messages}>
            {messagesLoading && <Text accessibilityLiveRegion="polite" style={styles.chatHint}>Carregando conversa…</Text>}
            {!messagesLoading && !chatError && messages.length === 0 && <Text style={styles.chatHint}>Ainda não há mensagens. Envie uma mensagem para iniciar a conversa.</Text>}
            {messages.map((item) => {
              const author = item.sender === 'professional' ? 'professional' : 'client';
              const own = (isProfessional ? 'professional' : 'client') === author;
              const time = new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
              const personName = author === 'professional' ? professional?.name ?? 'Profissional' : order.clientName;
              const photoUri = own
                ? profile.photoUri
                : isProfessional
                  ? order.clientPhotoUri
                  : order.professionalPhotoUri || professional?.photoUri;
              const initials = (own ? profile.name : personName).trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase() || 'AJ';
              return <View key={item.id} style={[styles.messageRow, own && styles.ownMessageRow]}>
                {!own && <Avatar initials={initials} size={26} color={isProfessional ? '#FFF0E4' : professional?.color} uri={photoUri} />}
                <View style={[styles.bubble, own ? styles.ownBubble : styles.otherBubble]}>
                  {!own && <Text style={styles.sender}>{personName}</Text>}
                  <Text style={[styles.messageText, own && styles.ownMessage]}>{item.text}</Text>
                  <View style={styles.timeRow}><Text style={[styles.timeText, own && styles.ownMessage]}>{time}</Text>{own && <MaterialCommunityIcons name="check-all" size={13} color="#C7E4FF" />}</View>
                </View>
                {own && <Avatar initials={initials} size={26} uri={photoUri} />}
              </View>;
            })}
          </View>
          {chatError ? <View>
            <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.chatError}>{chatError}</Text>
            <Pressable accessibilityRole="button" onPress={() => {
              setMessagesLoading(true);
              void loadMessages(order.id).then((nextMessages) => {
                setMessages(nextMessages);
                setChatError('');
              }).catch((error: unknown) => setChatError(error instanceof Error ? error.message : 'Não foi possível carregar a conversa.')).finally(() => setMessagesLoading(false));
            }} style={styles.retryMessages}><Text style={styles.retryMessagesText}>Tentar carregar novamente</Text></Pressable>
          </View> : null}
          {sendError ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.chatError}>{sendError} Sua mensagem continua no campo para você tentar novamente.</Text> : null}
          <View style={styles.inputRow}>
            <TextInput accessibilityLabel="Mensagem do chat" accessibilityHint="Escreva sua mensagem e use o botão Enviar mensagem." value={message} onChangeText={(value) => { setMessage(value); setSendError(''); }} placeholder="Escreva uma mensagem..." placeholderTextColor={colors.muted} style={styles.chatInput} onSubmitEditing={send} returnKeyType="send" />
            <Pressable accessibilityRole="button" accessibilityLabel="Enviar mensagem" accessibilityState={{ disabled: sending || !message.trim() }} disabled={sending || !message.trim()} onPress={() => void send()} style={[styles.sendButton, (sending || !message.trim()) && styles.disabled]}><MaterialCommunityIcons name={sending ? 'loading' : 'arrow-up'} size={20} color="#fff" /></Pressable>
          </View>
        </View>
      )}
    </ScrollView>
    {isAuthenticated && !isProfessional && order.status === 'pending' && <View style={styles.bottomAction}><Pressable accessibilityRole="button" disabled={statusSaving} onPress={() => Alert.alert('Cancelar pedido?', 'Esta solicitação será cancelada.', [{ text: 'Manter', style: 'cancel' }, { text: 'Cancelar pedido', style: 'destructive', onPress: () => void updateStatus('cancelled') }])} style={[styles.cancelButton, statusSaving && styles.disabled]}><Text style={styles.cancelText}>{statusSaving ? 'Atualizando...' : 'Cancelar pedido'}</Text></Pressable></View>}
    {isAuthenticated && isProfessional && order.status === 'pending' && <View style={styles.bottomAction}>
      <Pressable accessibilityRole="button" disabled={statusSaving} onPress={() => setStatus('cancelled')} style={[styles.cancelButton, statusSaving && styles.disabled]}><Text style={styles.cancelText}>{statusSaving ? 'Atualizando...' : 'Recusar'}</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={statusSaving} onPress={() => setStatus('accepted')} style={[styles.acceptButton, statusSaving && styles.disabled]}><Text style={styles.buttonText}>{statusSaving ? 'Atualizando...' : 'Aceitar pedido'}</Text></Pressable>
    </View>}
    {isAuthenticated && isProfessional && (order.status === 'accepted' || order.status === 'in_progress') && <View style={styles.bottomAction}>
      <Pressable accessibilityRole="button" disabled={statusSaving} onPress={() => setStatus(order.status === 'accepted' ? 'in_progress' : 'done')} style={[styles.acceptButton, statusSaving && styles.disabled]}>
        <Text style={styles.buttonText}>{statusSaving ? 'Atualizando...' : order.status === 'accepted' ? 'Iniciar serviço' : 'Concluir serviço'}</Text>
      </Pressable>
    </View>}
  </KeyboardAvoidingView>;
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  flex: { flex: 1 },
  page: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 17, paddingBottom: 22 },
  orderHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  guestBanner: { ...theme.shadow, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.paleBlue, borderRadius: 13, padding: 11, marginBottom: 12 },
  guestBannerText: { flex: 1, color: theme.colors.primaryDark, fontSize: 10, lineHeight: 15, fontWeight: '600' },
  orderId: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  orderIdText: { color: theme.colors.muted, fontSize: 10, letterSpacing: 0.7, fontWeight: '700' },
  status: { fontSize: 11, fontWeight: '700' },
  serviceCard: { ...theme.shadow, backgroundColor: theme.colors.surface, borderRadius: 17, padding: 14 },
  serviceTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCircle: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  serviceCopy: { flex: 1, gap: 4 },
  serviceTitle: { color: theme.colors.text, fontSize: 13, fontWeight: '700' },
  serviceDate: { color: theme.colors.muted, fontSize: 10 },
  separator: { height: 1, backgroundColor: theme.colors.border, marginVertical: 12 },
  detailDivider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 10 },
  infoLabel: { color: theme.colors.muted, fontSize: 8, letterSpacing: 0.7, fontWeight: '800' },
  description: { color: theme.colors.muted, fontSize: 11, lineHeight: 17 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  detailCopy: { flex: 1, gap: 4 },
  detailValue: { color: theme.colors.text, fontSize: 11, lineHeight: 16 },
  locationHint: { color: theme.colors.muted, fontSize: 10, lineHeight: 15, marginTop: 8, marginLeft: 25 },
  directionsButton: { minHeight: 42, borderRadius: 12, backgroundColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 },
  directionsButtonText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  personCard: { ...theme.shadow, marginTop: 11, borderRadius: 16, padding: 11, backgroundColor: theme.colors.surface, flexDirection: 'row', alignItems: 'center', gap: 10 },
  personInfo: { flex: 1, gap: 3 },
  personLabel: { color: theme.colors.muted, fontSize: 8, letterSpacing: 0.8, fontWeight: '700' },
  personName: { color: theme.colors.text, fontSize: 12, fontWeight: '700' },
  progressCard: { ...theme.shadow, backgroundColor: theme.colors.surface, borderRadius: 16, padding: 13, marginTop: 11 },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  progressStatus: { fontSize: 10, fontWeight: '700', textAlign: 'right', flexShrink: 1 },
  sectionTitle: { color: theme.colors.text, fontSize: 13, fontWeight: '800' },
  progressRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 15 },
  step: { alignItems: 'center', gap: 5 },
  stepCircle: { width: 21, height: 21, borderRadius: 11, borderWidth: 1.5, borderColor: themedColor('#CBD4DC', theme), alignItems: 'center', justifyContent: 'center' },
  stepCircleActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  stepText: { color: theme.colors.muted, fontSize: 8, textAlign: 'center' },
  stepTextActive: { color: theme.colors.primaryDark, fontWeight: '600' },
  stepLine: { flex: 1, height: 2, backgroundColor: themedColor('#E6EAEE', theme), marginTop: 9, marginHorizontal: 4 },
  stepLineActive: { backgroundColor: themedColor('#8EC5F7', theme) },
  timelineDate: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 13 },
  nextStepHint: { color: theme.colors.primaryDark, backgroundColor: theme.colors.paleBlue, borderRadius: 10, padding: 9, fontSize: 10, lineHeight: 15, marginTop: 10 },
  terminalStatus: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 13, padding: 10, borderRadius: 12, backgroundColor: theme.colors.paleRed },
  terminalTitle: { color: theme.colors.red, fontSize: 11, fontWeight: '800' },
  reviewCard: { ...theme.shadow, backgroundColor: theme.colors.surface, padding: 14, borderRadius: 16, marginTop: 11 },
  reviewHint: { color: theme.colors.muted, fontSize: 10, marginTop: 5 },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 3, marginVertical: 8 },
  starButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  rateButton: { minHeight: 40, borderRadius: 12, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  reviewDone: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: theme.colors.paleGreen, borderRadius: 12, padding: 11, marginTop: 10 },
  reviewDoneText: { color: theme.colors.green, fontSize: 10, fontWeight: '600' },
  chatCard: { ...theme.shadow, backgroundColor: theme.colors.surface, borderRadius: 16, marginTop: 11, padding: 13 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatHint: { color: theme.colors.muted, fontSize: 9, marginTop: 3 },
  chatError: { color: themedColor('#B42318', theme), fontSize: 11, lineHeight: 16, marginVertical: 7 },
  retryMessages: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: theme.colors.primary, borderRadius: 10, marginBottom: 8 },
  retryMessagesText: { color: theme.colors.primary, fontSize: 11, fontWeight: '700' },
  disabled: { opacity: 0.55 },
  secure: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  secureText: { color: theme.colors.green, fontSize: 9, fontWeight: '600' },
  messages: { marginTop: 12, gap: 8 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  ownMessageRow: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '76%', paddingHorizontal: 11, paddingTop: 8, paddingBottom: 6, borderRadius: 14 },
  ownBubble: { backgroundColor: theme.colors.primary },
  otherBubble: { backgroundColor: themedColor('#F0F3F6', theme) },
  sender: { color: theme.colors.primaryDark, fontWeight: '700', fontSize: 9, marginBottom: 3 },
  messageText: { color: theme.colors.text, fontSize: 11, lineHeight: 16 },
  ownMessage: { color: '#fff' },
  timeRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 3, marginTop: 4 },
  timeText: { color: theme.colors.muted, fontSize: 8 },
  inputRow: { flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center' },
  chatInput: { flex: 1, height: 42, paddingHorizontal: 12, borderRadius: 13, borderWidth: 1, borderColor: theme.colors.border, color: theme.colors.text, fontSize: 11 },
  sendButton: { width: 39, height: 39, borderRadius: 13, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  bottomAction: { paddingHorizontal: 17, paddingTop: 10, paddingBottom: 15, backgroundColor: theme.colors.surface, flexDirection: 'row', gap: 9, borderTopWidth: 1, borderTopColor: theme.colors.border },
  cancelButton: { flex: 1, minHeight: 44, borderRadius: 13, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: theme.colors.red, fontSize: 11, fontWeight: '700' },
  acceptButton: { flex: 1, minHeight: 44, borderRadius: 13, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
  notFoundText: { color: theme.colors.text, textAlign: 'center', lineHeight: 20, marginHorizontal: 24, marginBottom: 8 },
  notFoundButton: { minHeight: 42, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15, borderWidth: 1, borderColor: theme.colors.primary, borderRadius: 12, marginTop: 8 },
  notFoundButtonText: { color: theme.colors.primary, fontSize: 12, fontWeight: '700' },
});
