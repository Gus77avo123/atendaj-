import { router, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { useApp } from '../../context/AppContext';
import type { PortfolioItem } from '../../services/api';
import { colors, shadow, AppTheme, useAppTheme, useThemedStyles, themedColor } from '../../theme';

export default function ProfilePortfolioScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { isAuthenticated, professionals, userId, listPortfolioItems, addPortfolioItem, removePortfolioItem } = useApp();
  const provider = professionals.find((item) => item.userId === userId);
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [caption, setCaption] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!provider) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setItems(await listPortfolioItems(provider.id));
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar o portfólio.');
    } finally {
      setLoading(false);
    }
  }, [listPortfolioItems, provider]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const selectImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
      if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível abrir suas fotos.');
    }
  };

  const add = async () => {
    if (!imageUri) {
      setError('Selecione uma foto do trabalho.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const created = await addPortfolioItem(imageUri, caption.trim());
      setItems((current) => [created, ...current]);
      setImageUri(null);
      setCaption('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível salvar o trabalho.');
    } finally {
      setSaving(false);
    }
  };

  const remove = (item: PortfolioItem) => Alert.alert('Remover trabalho?', 'Esta foto será removida do seu portfólio.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Remover', style: 'destructive', onPress: () => {
      void removePortfolioItem(item.id).then(() => setItems((current) => current.filter((entry) => entry.id !== item.id))).catch((reason: unknown) => {
        Alert.alert('Não foi possível remover a foto', reason instanceof Error ? reason.message : 'Tente novamente.');
      });
    } },
  ]);

  if (!isAuthenticated) {
    router.replace('/');
    return null;
  }

  return <Screen>
    <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
      <MaterialCommunityIcons name="arrow-left" size={19} color={colors.primary} /><Text style={styles.backText}>Voltar ao perfil</Text>
    </Pressable>
    <Text style={styles.title}>Portfólio de trabalhos</Text>
    <Text style={styles.subtitle}>Mostre fotos de serviços realizados. As imagens também ficam visíveis no seu perfil público.</Text>
    <View style={styles.card}>
      <Pressable accessibilityRole="button" onPress={() => void selectImage()} style={styles.photoButton}>
        {imageUri ? <Image source={{ uri: imageUri }} style={styles.selectedImage} /> : <><MaterialCommunityIcons name="image-plus" size={25} color={colors.primary} /><Text style={styles.photoText}>Selecionar foto</Text></>}
      </Pressable>
      <TextInput accessibilityLabel="Legenda do trabalho" value={caption} onChangeText={setCaption} maxLength={240} placeholder="Legenda (opcional)" style={styles.input} />
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <Pressable accessibilityRole="button" disabled={saving} onPress={() => void add()} style={[styles.addButton, saving && styles.disabled]}>
        <Text style={styles.addText}>{saving ? 'Salvando…' : 'Adicionar ao portfólio'}</Text>
      </Pressable>
    </View>
    <Text style={styles.section}>Seus trabalhos</Text>
    {loading && <Text style={styles.info}>Carregando portfólio…</Text>}
    {!loading && items.length === 0 && <Text style={styles.info}>Você ainda não adicionou fotos.</Text>}
    {items.map((item) => <View key={item.id} style={styles.item}>
      <Image source={{ uri: item.image_uri }} style={styles.itemImage} />
      <View style={styles.itemCopy}><Text style={styles.caption}>{item.caption || 'Trabalho realizado'}</Text><Text style={styles.info}>{new Date(item.created_at).toLocaleDateString('pt-BR')}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Remover trabalho" onPress={() => remove(item)} style={styles.remove}><MaterialCommunityIcons name="trash-can-outline" size={19} color={colors.red} /></Pressable>
    </View>)}
  </Screen>;
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  back: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 42 },
  backText: { color: theme.colors.primary, fontSize: 12, fontWeight: '700' },
  title: { color: theme.colors.text, fontSize: 24, fontWeight: '800', marginTop: 8 },
  subtitle: { color: theme.colors.muted, fontSize: 13, lineHeight: 19, marginTop: 5, marginBottom: 16 },
  card: { ...theme.shadow, backgroundColor: theme.colors.surface, borderRadius: 18, padding: 14, gap: 10 },
  photoButton: { height: 130, borderRadius: 13, borderWidth: 1, borderColor: theme.colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden' },
  selectedImage: { width: '100%', height: '100%' },
  photoText: { color: theme.colors.primary, fontWeight: '700', fontSize: 12 },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 11, padding: 11, color: theme.colors.text, fontSize: 13 },
  error: { color: theme.colors.red, fontSize: 12 },
  addButton: { minHeight: 45, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary },
  addText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  disabled: { opacity: 0.6 },
  section: { color: theme.colors.text, fontSize: 17, fontWeight: '800', marginTop: 22, marginBottom: 9 },
  info: { color: theme.colors.muted, fontSize: 11 },
  item: { ...theme.shadow, backgroundColor: theme.colors.surface, borderRadius: 14, padding: 10, marginBottom: 9, flexDirection: 'row', alignItems: 'center', gap: 11 },
  itemImage: { width: 67, height: 67, borderRadius: 10 },
  itemCopy: { flex: 1, gap: 5 },
  caption: { color: theme.colors.text, fontSize: 12, fontWeight: '700' },
  remove: { padding: 8 },
});
