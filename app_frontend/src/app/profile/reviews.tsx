import { router, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../../components/Avatar';
import { Screen } from '../../components/Screen';
import { useApp } from '../../context/AppContext';
import type { BackendReview } from '../../services/api';
import { colors, shadow, AppTheme, useAppTheme, useThemedStyles, themedColor } from '../../theme';

export default function ProfileReviewsScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { isAuthenticated, professionals, userId, loadReviews } = useApp();
  const provider = professionals.find((item) => item.userId === userId);
  const [reviews, setReviews] = useState<BackendReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!isAuthenticated || !provider) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setReviews(await loadReviews(provider.id));
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar as avaliações.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, loadReviews, provider]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return <Screen>
    <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
      <MaterialCommunityIcons name="arrow-left" size={19} color={colors.primary} /><Text style={styles.backText}>Voltar ao perfil</Text>
    </Pressable>
    <Text style={styles.title}>Avaliações recebidas</Text>
    {!!provider && <Text style={styles.subtitle}>Nota média {provider.rating.toFixed(1)} · {provider.reviews} avaliações</Text>}
    {loading && <Text style={styles.info}>Carregando avaliações…</Text>}
    {!!error && <Pressable accessibilityRole="button" onPress={() => void load()} style={styles.error}><Text style={styles.errorText}>{error} · Toque para tentar novamente.</Text></Pressable>}
    {!loading && !error && reviews.length === 0 && <Text style={styles.info}>Você ainda não recebeu avaliações.</Text>}
    {reviews.map((review) => <View key={review.id} style={styles.card}>
      <View style={styles.row}>
        <Avatar initials={review.client_name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase() || 'AJ'} size={39} color={colors.paleOrange} uri={review.cliente?.profile_image_uri} />
        <View style={styles.copy}><Text style={styles.name}>{review.client_name}</Text><Text style={styles.date}>{new Date(review.created_at).toLocaleDateString('pt-BR')}</Text></View>
        <Text accessibilityLabel={`${review.rating} de 5 estrelas`} style={styles.rating}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</Text>
      </View>
      <Text style={styles.comment}>{review.comment || 'Atendimento avaliado pelo cliente.'}</Text>
    </View>)}
  </Screen>;
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  back: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 42 },
  backText: { color: theme.colors.primary, fontSize: 12, fontWeight: '700' },
  title: { color: theme.colors.text, fontSize: 24, fontWeight: '800', marginTop: 8 },
  subtitle: { color: theme.colors.muted, fontSize: 12, marginTop: 5, marginBottom: 15 },
  info: { color: theme.colors.muted, textAlign: 'center', paddingVertical: 25 },
  error: { backgroundColor: theme.colors.paleRed, borderRadius: 12, padding: 12 },
  errorText: { color: theme.colors.red, fontSize: 12 },
  card: { ...theme.shadow, backgroundColor: theme.colors.surface, borderRadius: 15, padding: 13, marginBottom: 9 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  copy: { flex: 1, gap: 3 },
  name: { color: theme.colors.text, fontSize: 12, fontWeight: '700' },
  date: { color: theme.colors.muted, fontSize: 10 },
  rating: { color: themedColor('#AF7A14', theme), fontSize: 13 },
  comment: { color: theme.colors.muted, fontSize: 12, lineHeight: 18, marginTop: 10 },
});
