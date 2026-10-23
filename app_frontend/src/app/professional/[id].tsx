import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Avatar } from '../../components/Avatar';
import { useApp } from '../../context/AppContext';
import { colors, shadow, AppTheme, useAppTheme, useThemedStyles, themedColor } from '../../theme';
import { listPortfolio, PortfolioItem } from '../../services/api';

export default function ProfessionalDetailsScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { professionals, professionalsLoaded, professionalsError, refreshProfessionals, requestService, isAuthenticated, role, favorites, toggleFavorite, loadReviews, startInquiry } = useApp();
  const professional = useMemo(() => professionals.find((item) => item.id === id), [professionals, id]);
  const [description, setDescription] = useState('');
  const [savingRequest, setSavingRequest] = useState(false);
  const [startingConversation, setStartingConversation] = useState(false);
  const [conversationError, setConversationError] = useState('');
  const [requestError, setRequestError] = useState('');
  const [existingOrder, setExistingOrder] = useState(false);
  const [reviews, setReviews] = useState<{ id: string; client_name: string; rating: number; comment: string; created_at: string; cliente?: { profile_image_uri?: string } }[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState('');
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [portfolioError, setPortfolioError] = useState('');

  const refreshReviews = useCallback(() => {
    if (!id || !professional) return;
    setReviewsLoading(true);
    setReviewsError('');
    void loadReviews(id)
      .then((nextReviews) => {
        setReviews(nextReviews);
        setReviewsLoading(false);
      })
      .catch((error: unknown) => {
        console.warn('Não foi possível carregar as avaliações.', error);
        setReviewsError(error instanceof Error ? error.message : 'Não foi possível carregar as avaliações.');
        setReviewsLoading(false);
      });
  }, [id, loadReviews, professional]);

  useEffect(() => {
    refreshReviews();
  }, [refreshReviews]);

  useEffect(() => {
    if (!id) return;
    let active = true;
    listPortfolio('', id).then((items) => {
      if (active) setPortfolio(items);
    }).catch((error: unknown) => {
      if (active) setPortfolioError(error instanceof Error ? error.message : 'Não foi possível carregar o portfólio.');
    });
    return () => { active = false; };
  }, [id]);

  if (!professional) return <View style={styles.notFound}>
    <Text accessibilityLiveRegion="polite" style={styles.notFoundText}>
      {!professionalsLoaded
        ? 'Carregando perfil profissional…'
        : professionalsError
          ? `Não foi possível carregar os profissionais. ${professionalsError}`
          : 'Este profissional não foi encontrado ou não está mais disponível.'}
    </Text>
    {!!professionalsError && <Pressable accessibilityRole="button" onPress={() => void refreshProfessionals()} style={styles.retryButton}>
      <Text style={styles.retryText}>Tentar novamente</Text>
    </Pressable>}
    <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.retryButton}>
      <Text style={styles.retryText}>Voltar</Text>
    </Pressable>
  </View>;

  const request = async () => {
    if (!isAuthenticated) {
      router.push('/');
      return;
    }
    if (description.trim().length < 8) {
      setRequestError('Descreva o serviço com pelo menos 8 caracteres.');
      return;
    }
    setRequestError('');
    setExistingOrder(false);
    setSavingRequest(true);
    try {
      const orderId = await requestService(professional, description.trim());
      if (!orderId) {
        setRequestError('Você já tem um pedido aberto com este profissional. Acompanhe-o em Meus pedidos.');
        setExistingOrder(true);
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(client)/orders');
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Não foi possível solicitar o serviço. Tente novamente.');
    } finally {
      setSavingRequest(false);
    }
  };

  const openConversation = async () => {
    if (!isAuthenticated || role !== 'client') {
      router.push('/');
      return;
    }
    setStartingConversation(true);
    setConversationError('');
    try {
      const conversationId = await startInquiry(professional.id);
      router.push(`/conversation/${conversationId}`);
    } catch (error) {
      setConversationError(error instanceof Error ? error.message : 'Não foi possível abrir a conversa. Tente novamente.');
    } finally {
      setStartingConversation(false);
    }
  };

  const saveFavorite = async () => {
    if (!isAuthenticated) {
      router.push('/');
      return;
    }
    setSavingFavorite(true);
    try {
      await toggleFavorite(professional.id);
    } catch (error) {
      Alert.alert('Não foi possível atualizar os favoritos', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setSavingFavorite(false);
    }
  };

  return <ScrollView style={styles.page} contentContainerStyle={styles.content}>
    <View style={[styles.cover, { backgroundColor: professional.color }]}>
      <View style={styles.coverPattern}><MaterialCommunityIcons name="tools" size={100} color="rgba(30,136,229,0.10)" /></View>
      <Avatar initials={professional.initials} size={94} color="#fff" uri={professional.photoUri} />
      <View style={[styles.online, !professional.available && styles.offline]}><View style={[styles.onlineDot, !professional.available && styles.offlineDot]} /><Text style={[styles.onlineText, !professional.available && styles.offlineText]}>{professional.available ? 'Disponível agora' : 'Indisponível no momento'}</Text></View>
    </View>
    <View style={styles.identity}>
      <Text style={styles.name}>{professional.name}</Text>
      <Text style={styles.category}>{professional.category} · {professional.district || 'Localização não informada'}</Text>
      <View style={styles.ratingLine}><Text style={styles.star}>★ {professional.rating.toFixed(1)}</Text><Text style={styles.reviews}>({professional.reviews} avaliações)</Text>{professional.distance > 0 && <Text style={styles.distance}>{professional.distance.toFixed(1)} km de você</Text>}</View>
      <Pressable accessibilityRole="button" accessibilityLabel={favorites.includes(professional.id) ? 'Remover dos favoritos' : 'Salvar nos favoritos'} accessibilityState={{ selected: favorites.includes(professional.id), disabled: savingFavorite }} disabled={savingFavorite} onPress={() => void saveFavorite()} style={styles.favoriteButton}>
        <MaterialCommunityIcons name={favorites.includes(professional.id) ? 'heart' : 'heart-outline'} size={17} color={favorites.includes(professional.id) ? colors.red : colors.primary} />
        <Text style={styles.favoriteText}>{favorites.includes(professional.id) ? 'Remover dos favoritos' : 'Salvar nos favoritos'}</Text>
      </Pressable>
    </View>
    <View style={styles.metrics}>
      <View style={styles.metric}><Text style={styles.metricValue}>{professional.rating.toFixed(1)} ★</Text><Text style={styles.metricLabel}>nota média</Text></View><View style={styles.metricLine} />
      <View style={styles.metric}><Text style={styles.metricValue}>{professional.reviews}</Text><Text style={styles.metricLabel}>avaliações</Text></View><View style={styles.metricLine} />
      <View style={styles.metric}><Text style={styles.metricValue}>{professional.available ? 'Disponível' : 'Indisponível'}</Text><Text style={styles.metricLabel}>agora</Text></View>
    </View>
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Sobre o profissional</Text>
      <Text style={styles.description}>{professional.description}</Text>
    </View>
    {(portfolio.length > 0 || !!portfolioError) && <View style={styles.section}>
      <Text style={styles.sectionTitle}>Portfólio de trabalhos</Text>
      {!!portfolioError && <Text style={styles.reviewDate}>{portfolioError}</Text>}
      <View style={styles.portfolioGrid}>{portfolio.map((item) => <View key={item.id} style={styles.portfolioItem}>
        <Image source={{ uri: item.image_uri }} style={styles.portfolioImage} />
        {!!item.caption && <Text style={styles.portfolioCaption}>{item.caption}</Text>}
      </View>)}</View>
    </View>}
    <View style={styles.negotiationNotice}>
      <MaterialCommunityIcons name="message-text-outline" size={19} color={colors.primary} />
      <Text style={styles.negotiationText}>O valor e as condições são combinados diretamente entre cliente e profissional.</Text>
    </View>
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Avaliações recentes</Text>
      {reviews.map((review) => <View key={review.id} style={styles.reviewCard}><View style={styles.reviewTop}><Avatar initials={review.client_name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase() || 'AJ'} size={34} color="#FFF0E4" uri={review.cliente?.profile_image_uri} /><View style={{ flex: 1 }}><Text style={styles.reviewer}>{review.client_name}</Text><Text style={styles.reviewDate}>{new Date(review.created_at).toLocaleDateString('pt-BR')}</Text></View><Text style={styles.star}>{'★'.repeat(review.rating)}</Text></View><Text style={styles.reviewText}>{review.comment || 'Atendimento avaliado pelo cliente.'}</Text></View>)}
      {reviewsLoading && <Text accessibilityLiveRegion="polite" style={styles.reviewDate}>Carregando avaliações…</Text>}
      {!!reviewsError && <View><Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.requestError}>{reviewsError}</Text><Pressable accessibilityRole="button" onPress={refreshReviews}><Text style={styles.retryText}>Tentar carregar avaliações novamente</Text></Pressable></View>}
      {!reviewsLoading && !reviewsError && !reviews.length && <Text style={styles.reviewDate}>Este profissional ainda não recebeu avaliações.</Text>}
    </View>
    {isAuthenticated && role === 'client' && <View style={styles.conversationBox}>
      <View style={styles.conversationIntro}>
        <View style={styles.conversationIcon}><MaterialCommunityIcons name="message-image-outline" size={21} color={colors.primary} /></View>
        <View style={styles.conversationCopy}>
          <Text style={styles.conversationTitle}>Quer explicar melhor?</Text>
          <Text style={styles.conversationHint}>Converse com o profissional e envie uma foto antes de solicitar o atendimento.</Text>
        </View>
      </View>
      {!!conversationError && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.requestError}>{conversationError}</Text>}
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: startingConversation }} disabled={startingConversation} onPress={() => void openConversation()} style={[styles.conversationButton, startingConversation && { opacity: 0.65 }]}>
        <MaterialCommunityIcons name={startingConversation ? 'loading' : 'message-text-outline'} size={18} color={colors.primary} />
        <Text style={styles.conversationButtonText}>{startingConversation ? 'Abrindo conversa...' : 'Conversar antes de solicitar'}</Text>
        <MaterialCommunityIcons name="chevron-right" size={19} color={colors.primary} />
      </Pressable>
    </View>}
    {isAuthenticated && role === 'client' ? <View style={styles.requestBox}>
      <Text style={styles.sectionTitle}>Já sabe o que precisa?</Text>
      <Text style={styles.requestHint}>Você pode solicitar o atendimento diretamente, sem iniciar uma conversa.</Text>
      {!professional.available && <Text style={styles.requestHint}>O profissional está offline no momento. Seu pedido será enviado e ele poderá responder quando voltar.</Text>}
      <TextInput accessibilityLabel="Descrição do serviço solicitado" accessibilityHint="Descreva o que precisa em pelo menos 8 caracteres." multiline placeholder="Ex.: preciso instalar uma tomada na cozinha" value={description} onChangeText={(value) => { setDescription(value); setRequestError(''); setExistingOrder(false); }} style={styles.textarea} placeholderTextColor={colors.muted} textAlignVertical="top" />
      {!!requestError && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.requestError}>{requestError}</Text>}
      {existingOrder && <Pressable accessibilityRole="button" onPress={() => router.push('/(client)/orders')} style={styles.retryButton}><Text style={styles.retryText}>Abrir Meus pedidos</Text></Pressable>}
      <Pressable accessibilityRole="button" disabled={savingRequest} onPress={() => void request()} style={({ pressed }) => [styles.requestButton, pressed && { opacity: 0.85 }, savingRequest && { opacity: 0.65 }]}>
        <Text style={styles.requestText}>{savingRequest ? 'Enviando...' : 'Solicitar serviço'}</Text><MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />
      </Pressable>
    </View> : !isAuthenticated ? <Pressable accessibilityRole="button" onPress={() => router.push('/')} style={styles.guestRequest}>
      <MaterialCommunityIcons name="account-lock-outline" size={19} color={colors.primary} />
      <Text style={styles.guestRequestText}>Entre ou cadastre-se para conversar e solicitar este serviço</Text>
      <MaterialCommunityIcons name="chevron-right" size={19} color={colors.primary} />
    </Pressable> : null}
  </ScrollView>;
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 18, paddingBottom: 35 },
  cover: { height: 164, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  coverPattern: { position: 'absolute', right: 3, top: -20, opacity: 0.65 },
  online: { position: 'absolute', right: 11, top: 12, borderRadius: 20, flexDirection: 'row', gap: 5, alignItems: 'center', backgroundColor: theme.colors.surface, paddingHorizontal: 9, paddingVertical: 6 },
  offline: { backgroundColor: theme.colors.paleRed },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.green },
  offlineDot: { backgroundColor: theme.colors.red },
  onlineText: { color: theme.colors.green, fontSize: 9, fontWeight: '700' },
  offlineText: { color: theme.colors.red },
  identity: { alignItems: 'center', marginTop: 16 },
  name: { color: theme.colors.text, fontSize: 21, fontWeight: '800', letterSpacing: -0.5 },
  category: { color: theme.colors.muted, fontSize: 12, marginTop: 4 },
  ratingLine: { marginTop: 9, flexDirection: 'row', alignItems: 'center', gap: 6 },
  favoriteButton: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 11, padding: 8 },
  favoriteText: { color: theme.colors.primary, fontSize: 11, fontWeight: '700' },
  star: { color: themedColor('#AF7A14', theme), fontSize: 11, fontWeight: '800' },
  reviews: { color: theme.colors.muted, fontSize: 10 },
  distance: { color: theme.colors.primary, fontSize: 10, fontWeight: '600', marginLeft: 4 },
  metrics: { ...theme.shadow, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 16, paddingVertical: 13, marginTop: 17 },
  metric: { flex: 1, alignItems: 'center', gap: 3 },
  metricValue: { color: theme.colors.text, fontSize: 14, fontWeight: '800' },
  metricLabel: { color: theme.colors.muted, fontSize: 9 },
  metricLine: { height: 27, width: 1, backgroundColor: theme.colors.border },
  section: { marginTop: 20 },
  portfolioGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 9 },
  portfolioItem: { width: '48%', borderRadius: 13, overflow: 'hidden', backgroundColor: theme.colors.surface },
  portfolioImage: { width: '100%', height: 125 },
  portfolioCaption: { color: theme.colors.text, fontSize: 10, padding: 7 },
  sectionTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '800' },
  description: { color: theme.colors.muted, fontSize: 12, lineHeight: 19, marginTop: 7 },
  negotiationNotice: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: theme.colors.paleBlue, borderRadius: 14, padding: 12, marginTop: 20 },
  negotiationText: { flex: 1, color: theme.colors.primaryDark, fontSize: 11, lineHeight: 16, fontWeight: '600' },
  reviewCard: { ...theme.shadow, backgroundColor: theme.colors.surface, borderRadius: 16, padding: 12, marginTop: 9 },
  reviewTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewer: { color: theme.colors.text, fontSize: 11, fontWeight: '700' },
  reviewDate: { color: theme.colors.muted, fontSize: 9, marginTop: 2 },
  reviewText: { color: theme.colors.muted, fontSize: 11, lineHeight: 17, marginTop: 9 },
  requestBox: { ...theme.shadow, backgroundColor: theme.colors.surface, borderRadius: 17, padding: 14, marginTop: 20 },
  conversationBox: { ...theme.shadow, backgroundColor: theme.colors.surface, borderRadius: 17, padding: 14, marginTop: 20 },
  conversationIntro: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  conversationIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: theme.colors.paleBlue, alignItems: 'center', justifyContent: 'center' },
  conversationCopy: { flex: 1 },
  conversationTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '800' },
  conversationHint: { color: theme.colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  conversationButton: { minHeight: 43, marginTop: 12, paddingHorizontal: 12, borderRadius: 12, backgroundColor: theme.colors.paleBlue, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  conversationButtonText: { flex: 1, color: theme.colors.primary, fontSize: 12, fontWeight: '700' },
  requestHint: { color: theme.colors.muted, fontSize: 10, lineHeight: 15, marginTop: 4 },
  textarea: { minHeight: 83, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, padding: 11, marginTop: 10, color: theme.colors.text, fontSize: 12 },
  requestButton: { marginTop: 10, borderRadius: 13, backgroundColor: theme.colors.secondary, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  requestText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  requestError: { color: themedColor('#B42318', theme), fontSize: 11, lineHeight: 16, marginTop: 8 },
  retryButton: { alignSelf: 'flex-start', marginTop: 7, padding: 8, borderColor: theme.colors.primary, borderWidth: 1, borderRadius: 10 },
  retryText: { color: theme.colors.primary, fontSize: 11, fontWeight: '700' },
  guestRequest: { ...theme.shadow, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 13, marginTop: 20, backgroundColor: theme.colors.paleBlue, borderRadius: 15 },
  guestRequestText: { flex: 1, color: theme.colors.primaryDark, fontSize: 11, lineHeight: 16, fontWeight: '700' },
  notFound: { flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { color: theme.colors.text },
});
