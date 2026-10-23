import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { useApp } from '../../context/AppContext';
import type { SupportTicket } from '../../services/api';
import { colors, shadow, AppTheme, useAppTheme, useThemedStyles, themedColor } from '../../theme';

export default function ProfileSupportScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { type: initialType } = useLocalSearchParams<{ type?: string }>();
  const { isAuthenticated, orders, listSupportRequests, createSupportRequest } = useApp();
  const [type, setType] = useState<'support' | 'incident'>(initialType === 'incident' ? 'incident' : 'support');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [requestId, setRequestId] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      router.replace('/');
      return;
    }
    setLoading(true);
    try {
      setTickets(await listSupportRequests());
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar suas solicitações.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, listSupportRequests]);

  useEffect(() => { void load(); }, [load]);

  const chooseImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
      if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível abrir suas fotos.');
    }
  };

  const submit = async () => {
    if (subject.trim().length < 3 || description.trim().length < 10) {
      setError('Informe um assunto e descreva o problema com pelo menos 10 caracteres.');
      return;
    }
    if (type === 'incident' && !requestId) {
      setError('Selecione o atendimento relacionado à ocorrência.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const ticket = await createSupportRequest({ type, subject: subject.trim(), description: description.trim(), requestId: requestId || undefined, imageUri });
      setTickets((current) => [ticket, ...current]);
      setSubject('');
      setDescription('');
      setRequestId('');
      setImageUri(null);
      Alert.alert('Solicitação enviada', 'O registro foi salvo e já aparece no histórico abaixo.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível enviar a solicitação.');
    } finally {
      setSaving(false);
    }
  };

  return <Screen>
    <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
      <MaterialCommunityIcons name="arrow-left" size={19} color={colors.primary} /><Text style={styles.backText}>Voltar ao perfil</Text>
    </Pressable>
    <Text style={styles.title}>Ajuda e ocorrências</Text>
    <Text style={styles.subtitle}>Envie uma dúvida ou registre um problema relacionado a um atendimento. Você poderá acompanhar o registro aqui.</Text>
    <View style={styles.card}>
      <Text style={styles.label}>Tipo de solicitação</Text>
      <View style={styles.choices}>
        {([['support', 'Ajuda'], ['incident', 'Ocorrência']] as const).map(([value, label]) => <Pressable
          key={value} accessibilityRole="button" accessibilityState={{ selected: type === value }} onPress={() => setType(value)}
          style={[styles.choice, type === value && styles.choiceActive]}><Text style={[styles.choiceText, type === value && styles.choiceTextActive]}>{label}</Text>
        </Pressable>)}
      </View>
      {type === 'incident' && <>
        <Text style={styles.label}>Atendimento relacionado</Text>
        <View style={styles.orderList}>
          {orders.length === 0 ? <Text style={styles.hint}>Não há atendimentos disponíveis para associar.</Text> : orders.map((order) => <Pressable key={order.id} accessibilityRole="button" accessibilityState={{ selected: requestId === order.id }} onPress={() => setRequestId(order.id)} style={[styles.orderOption, requestId === order.id && styles.orderSelected]}>
            <Text style={styles.orderName}>{order.title}</Text><Text style={styles.hint}>{order.status} · {order.createdAt}</Text>
          </Pressable>)}
        </View>
      </>}
      <Text style={styles.label}>Assunto</Text>
      <TextInput accessibilityLabel="Assunto da solicitação" value={subject} onChangeText={setSubject} maxLength={120} placeholder="Resuma o que aconteceu" style={styles.input} />
      <Text style={styles.label}>Detalhes</Text>
      <TextInput accessibilityLabel="Detalhes da solicitação" value={description} onChangeText={setDescription} maxLength={3000} multiline placeholder="Explique como podemos ajudar (mínimo 10 caracteres)" style={[styles.input, styles.multiline]} textAlignVertical="top" />
      <Pressable accessibilityRole="button" onPress={() => void chooseImage()} style={styles.photoButton}>
        <MaterialCommunityIcons name="image-plus" size={18} color={colors.primary} /><Text style={styles.photoText}>{imageUri ? 'Trocar foto anexada' : 'Anexar foto (opcional)'}</Text>
      </Pressable>
      {imageUri && <Image source={{ uri: imageUri }} style={styles.preview} />}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <Pressable accessibilityRole="button" disabled={saving} onPress={() => void submit()} style={[styles.submit, saving && styles.disabled]}>
        <Text style={styles.submitText}>{saving ? 'Enviando…' : 'Enviar solicitação'}</Text>
      </Pressable>
    </View>
    <Text style={styles.section}>Seus registros</Text>
    {loading && <Text style={styles.hint}>Carregando registros…</Text>}
    {!loading && tickets.length === 0 && <Text style={styles.hint}>Suas solicitações enviadas aparecerão aqui.</Text>}
    {tickets.map((ticket) => <View key={ticket.id} style={styles.ticket}>
      <View style={styles.ticketHeading}><Text style={styles.ticketType}>{ticket.type === 'incident' ? 'Ocorrência' : 'Ajuda'}</Text><Text style={styles.ticketStatus}>{ticket.status === 'open' ? 'Recebido' : ticket.status}</Text></View>
      <Text style={styles.orderName}>{ticket.subject}</Text>
      <Text style={styles.hint}>{new Date(ticket.created_at).toLocaleString('pt-BR')}</Text>
      <Text style={styles.ticketBody}>{ticket.description}</Text>
      {!!ticket.image_uri && <Image source={{ uri: ticket.image_uri }} style={styles.preview} />}
    </View>)}
  </Screen>;
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  back: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 42 },
  backText: { color: theme.colors.primary, fontSize: 12, fontWeight: '700' },
  title: { color: theme.colors.text, fontSize: 24, fontWeight: '800', marginTop: 8 },
  subtitle: { color: theme.colors.muted, fontSize: 13, lineHeight: 19, marginTop: 5, marginBottom: 16 },
  card: { ...theme.shadow, backgroundColor: theme.colors.surface, borderRadius: 18, padding: 15 },
  label: { color: theme.colors.text, fontSize: 12, fontWeight: '700', marginTop: 10, marginBottom: 6 },
  choices: { flexDirection: 'row', gap: 8 },
  choice: { borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 16, paddingVertical: 10 },
  choiceActive: { backgroundColor: theme.colors.paleBlue, borderColor: theme.colors.primary },
  choiceText: { color: theme.colors.muted, fontSize: 12, fontWeight: '700' },
  choiceTextActive: { color: theme.colors.primary },
  orderList: { gap: 6 },
  orderOption: { borderRadius: 11, borderWidth: 1, borderColor: theme.colors.border, padding: 10 },
  orderSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.paleBlue },
  orderName: { color: theme.colors.text, fontSize: 12, fontWeight: '700' },
  hint: { color: theme.colors.muted, fontSize: 11, lineHeight: 16 },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 11, padding: 11, color: theme.colors.text, fontSize: 13, backgroundColor: theme.colors.surface },
  multiline: { minHeight: 95 },
  photoButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 12 },
  photoText: { color: theme.colors.primary, fontSize: 12, fontWeight: '700' },
  preview: { width: 120, height: 100, borderRadius: 12, marginBottom: 9 },
  error: { color: theme.colors.red, fontSize: 12, marginBottom: 9 },
  submit: { minHeight: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  disabled: { opacity: 0.6 },
  section: { color: theme.colors.text, fontSize: 17, fontWeight: '800', marginTop: 22, marginBottom: 9 },
  ticket: { ...theme.shadow, backgroundColor: theme.colors.surface, borderRadius: 15, padding: 13, marginBottom: 9, gap: 5 },
  ticketHeading: { flexDirection: 'row', justifyContent: 'space-between' },
  ticketType: { color: theme.colors.primary, fontSize: 11, fontWeight: '800' },
  ticketStatus: { color: theme.colors.green, fontSize: 10, fontWeight: '800' },
  ticketBody: { color: theme.colors.text, fontSize: 12, lineHeight: 18, marginTop: 5 },
});
