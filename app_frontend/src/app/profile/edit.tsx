import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProfileFields } from '../../components/ProfileFields';
import { ProfileData, useApp } from '../../context/AppContext';
import { PhotoUploadMetadata } from '../../data/demo';
import { colors, shadow, AppTheme, useAppTheme, useThemedStyles, themedColor } from '../../theme';

export default function EditProfileScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { role, isAuthenticated, profile, updateProfile } = useApp();
  const [draft, setDraft] = useState<ProfileData>(profile);
  const [photoMetadata, setPhotoMetadata] = useState<PhotoUploadMetadata>();
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  if (!isAuthenticated || !role) {
    return (
      <SafeAreaView style={styles.guestPage}>
        <View style={styles.guestCard}>
          <MaterialCommunityIcons name="account-lock-outline" size={36} color={colors.primary} />
          <Text style={styles.title}>Entre para editar seu perfil</Text>
          <Text style={styles.subtitle}>Visitantes podem explorar o app, mas precisam criar uma conta para alterar dados.</Text>
          <Pressable onPress={() => router.replace('/')} style={styles.button}>
            <Text style={styles.buttonText}>Entrar ou cadastrar</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>Voltar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const save = async () => {
    const digits = draft.phone.replace(/\D/g, '');
    if (draft.name.trim().length < 2) {
      setFormError('Informe seu nome completo.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
      setFormError('Informe um e-mail válido, como voce@email.com.');
      return;
    }
    if (digits.length < 10) {
      setFormError('Informe um telefone com DDD e pelo menos 10 números.');
      return;
    }
    if (role === 'professional' &&
      (!draft.category || draft.description.trim().length < 10 || draft.serviceArea.trim().length < 2 || draft.document.replace(/\D/g, '').length < 11)) {
      setFormError('Complete os dados profissionais: categoria, descrição (mínimo 10 caracteres), área de atendimento e CPF/CNPJ.');
      return;
    }
    if (role === 'professional' && !draft.serviceLocation) {
      setFormError('Escolha no mapa o ponto cadastrado da sua área de atendimento.');
      return;
    }

    setFormError('');
    setSaving(true);
    try {
      await updateProfile({
        ...draft,
        name: draft.name.trim(),
        email: draft.email.trim().toLowerCase(),
        phone: draft.phone.trim(),
        description: draft.description.trim(),
        serviceArea: draft.serviceArea.trim(),
        document: draft.document.trim(),
      }, photoMetadata);
      router.back();
    } catch (error) {
      console.warn('Não foi possível atualizar o perfil.', error);
      setFormError(error instanceof Error ? error.message : 'Não foi possível atualizar os dados do perfil. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => router.back()} style={styles.back}>
            <MaterialCommunityIcons name="arrow-left" size={19} color={colors.primary} />
            <Text style={styles.backText}>Voltar ao perfil</Text>
          </Pressable>
          <Text style={styles.title}>Editar perfil</Text>
          <Text style={styles.subtitle}>Mantenha seus dados e sua foto atualizados.</Text>
          <View style={styles.card}>
            <ProfileFields role={role} profile={draft} onChange={(nextDraft, photo) => {
              setDraft(nextDraft);
              if (photo) setPhotoMetadata(photo);
              setFormError('');
            }} />
            {formError ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.formError}>{formError}</Text> : null}
            <Pressable accessibilityRole="button" disabled={saving} onPress={() => void save()} style={({ pressed }) => [styles.button, pressed && styles.pressed, saving && styles.disabled]}>
              <Text style={styles.buttonText}>{saving ? 'Salvando...' : 'Salvar alterações'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 30 },
  back: { alignSelf: 'flex-start', minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 4, marginBottom: 8 },
  backText: { color: theme.colors.primary, fontSize: 12, fontWeight: '700' },
  title: { color: theme.colors.text, fontSize: 25, fontWeight: '800' },
  subtitle: { color: theme.colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5, marginBottom: 17 },
  card: { ...theme.shadow, backgroundColor: theme.colors.surface, borderRadius: 21, padding: 17, borderWidth: 1, borderColor: theme.colors.border },
  button: { minHeight: 49, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primaryDark, marginTop: 7 },
  buttonText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  formError: { color: themedColor('#B42318', theme), fontSize: 12, lineHeight: 18, marginBottom: 12 },
  pressed: { opacity: 0.86 },
  disabled: { opacity: 0.65 },
  guestPage: { flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
  guestCard: { ...theme.shadow, width: '100%', backgroundColor: theme.colors.surface, borderRadius: 22, padding: 24, alignItems: 'center' },
  backButton: { padding: 13 },
});
