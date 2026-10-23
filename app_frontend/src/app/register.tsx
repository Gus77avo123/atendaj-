import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
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
import { ProfileFields } from '../components/ProfileFields';
import { ProfileData, useApp } from '../context/AppContext';
import { OTHER_CATEGORY, PhotoUploadMetadata, UserRole } from '../data/demo';
import { colors, shadow, AppTheme, useAppTheme, useThemedStyles, themedColor } from '../theme';

const blankProfile: ProfileData = {
  name: '',
  email: '',
  phone: '',
  photoUri: null,
  category: '',
  description: '',
  serviceArea: '',
  serviceLocation: null,
  document: '',
};

export default function RegisterScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const params = useLocalSearchParams<{ role?: string }>();
  const { registerAccount } = useApp();
  const [role, setRole] = useState<UserRole>(params.role === 'professional' ? 'professional' : 'client');
  const [profile, setProfile] = useState(blankProfile);
  const [photoMetadata, setPhotoMetadata] = useState<PhotoUploadMetadata>();
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (params.role === 'client' || params.role === 'professional') setRole(params.role);
  }, [params.role]);

  const submit = async () => {
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim());
    const phoneDigits = profile.phone.replace(/\D/g, '');
    if (profile.name.trim().length < 2) {
      setFormError('Informe seu nome completo para continuar.');
      return;
    }
    if (!validEmail) {
      setFormError('Confira o e-mail. Use um formato como voce@email.com.');
      return;
    }
    if (phoneDigits.length < 10) {
      setFormError('Informe um telefone com DDD e pelo menos 10 números.');
      return;
    }
    const documentDigits = profile.document.replace(/\D/g, '');
    if (role === 'client' && documentDigits.length !== 11) {
      setFormError('Informe um CPF com 11 números.');
      return;
    }
    if (role === 'professional' && documentDigits.length !== 11 && documentDigits.length !== 14) {
      setFormError('Informe um CPF com 11 números ou CNPJ com 14 números.');
      return;
    }
    if (role === 'client' && profile.serviceArea.trim().length < 5) {
      setFormError('Informe seu endereço principal, incluindo rua, número, bairro e cidade.');
      return;
    }
    if (password.length < 8) {
      setFormError('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    if (role === 'professional') {
      const category = profile.category.trim();
      const description = profile.description.trim();
      const area = profile.serviceArea.trim();

      if (!category || category === OTHER_CATEGORY) {
        setFormError('Selecione uma categoria ou descreva o serviço em “Outros”.');
        return;
      }
      if (description.length < 8) {
        setFormError('Descreva seu serviço com pelo menos 8 caracteres.');
        return;
      }
      if (area.length < 2) {
        setFormError('Informe a área de atendimento do seu serviço.');
        return;
      }
      if (!profile.serviceLocation) {
        setFormError('Escolha o ponto no mapa para cadastrar sua área de atendimento.');
        return;
      }
    }

    setFormError('');
    setSaving(true);
    try {
      await registerAccount(role, {
        ...profile,
        name: profile.name.trim(),
        email: profile.email.trim().toLowerCase(),
        phone: profile.phone.trim(),
        category: profile.category.trim(),
        description: profile.description.trim(),
        serviceArea: profile.serviceArea.trim(),
        document: profile.document.trim(),
      }, password, photoMetadata);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(role === 'client' ? '/(client)/search' : '/(professional)/services');
    } catch (error) {
      console.warn('Não foi possível criar a conta no servidor.', error);
      setFormError(error instanceof Error ? error.message : 'Não foi possível criar a conta. Tente novamente.');
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
            <Text style={styles.backText}>Voltar</Text>
          </Pressable>
          <Text style={styles.heading}>Crie sua conta</Text>
          <Text style={styles.subtitle}>
            {role === 'client'
              ? 'Informe seus dados e o endereço de referência para os pedidos.'
              : 'Preencha seus dados para apresentar seus serviços.'}
          </Text>

          <View style={styles.card}>
            <Text style={styles.label}>Como você vai usar o Atende Já?</Text>
            <View style={styles.roleToggle}>
              {(['client', 'professional'] as const).map((item) => {
                const selected = role === item;
                return (
                  <Pressable
                    key={item}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    disabled={saving}
                    onPress={() => {
                      setRole(item);
                      setFormError('');
                    }}
                    style={[styles.roleOption, selected && (item === 'client' ? styles.roleClientSelected : styles.roleProfessionalSelected)]}
                  >
                    <MaterialCommunityIcons name={item === 'client' ? 'account' : 'wrench'} size={16} color={selected ? '#fff' : colors.muted} />
                    <Text style={[styles.roleText, selected && styles.roleTextSelected]}>{item === 'client' ? 'Cliente' : 'Profissional'}</Text>
                  </Pressable>
                );
              })}
            </View>
            <ProfileFields
              role={role}
              profile={profile}
              onChange={(nextProfile, photo) => {
                setProfile(nextProfile);
                if (photo) setPhotoMetadata(photo);
                setFormError('');
              }}
              includePassword
              password={password}
              onPasswordChange={(value) => {
                setPassword(value);
                setFormError('');
              }}
            />
            {formError ? (
              <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.formError}>
                {formError}
              </Text>
            ) : null}
            <Pressable accessibilityRole="button" disabled={saving} onPress={() => void submit()} style={({ pressed }) => [styles.submit, pressed && styles.pressed, saving && styles.disabled]}>
              <Text style={styles.submitText}>{saving ? 'Salvando...' : 'Criar minha conta'}</Text>
              {!saving && <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />}
            </Pressable>
          </View>
          <Text style={styles.disclaimer}>Sua conta e senha serão cadastradas com segurança no servidor.</Text>
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
  heading: { color: theme.colors.text, fontSize: 27, fontWeight: '800', letterSpacing: -0.7 },
  subtitle: { color: theme.colors.muted, marginTop: 5, marginBottom: 17, fontSize: 13 },
  card: { ...theme.shadow, backgroundColor: theme.colors.surface, borderRadius: 22, padding: 17, borderWidth: 1, borderColor: theme.colors.border },
  label: { color: theme.colors.text, fontSize: 11, fontWeight: '700', marginBottom: 8 },
  roleToggle: { backgroundColor: theme.colors.paleBlue, flexDirection: 'row', borderRadius: 13, padding: 4, marginBottom: 19 },
  roleOption: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, borderRadius: 10 },
  roleClientSelected: { backgroundColor: theme.colors.primaryDark, ...theme.shadow },
  roleProfessionalSelected: { backgroundColor: theme.colors.teal, ...theme.shadow },
  roleText: { color: theme.colors.muted, fontSize: 11, fontWeight: '700' },
  roleTextSelected: { color: '#fff' },
  submit: { backgroundColor: theme.colors.primaryDark, minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 7, ...theme.shadow },
  submitText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  formError: { color: themedColor('#B42318', theme), fontSize: 12, lineHeight: 18, marginBottom: 12 },
  disabled: { opacity: 0.65 },
  pressed: { opacity: 0.86 },
  disclaimer: { color: theme.colors.muted, fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 14, paddingHorizontal: 15 },
});
