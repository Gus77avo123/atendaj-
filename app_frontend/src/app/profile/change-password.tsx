import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { colors, shadow, AppTheme, useAppTheme, useThemedStyles, themedColor } from '../../theme';

export default function ChangePasswordScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { isAuthenticated, changePassword } = useApp();
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [feedback, setFeedback] = useState<{ message: string; success: boolean } | null>(null);

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.page}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <MaterialCommunityIcons name="account-lock-outline" size={38} color={colors.primary} />
          <Text style={styles.title}>Entre para trocar sua senha</Text>
          <Text style={styles.subtitle}>Visitantes precisam criar uma conta para acessar as opções de segurança.</Text>
          <Pressable onPress={() => router.replace('/')} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Entrar ou cadastrar</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Voltar</Text>
          </Pressable>
        </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  const submit = async () => {
    if (!currentPassword) {
      setFeedback({ message: 'Informe sua senha atual para continuar.', success: false });
      return;
    }
    if (newPassword.length < 8) {
      setFeedback({ message: 'A nova senha precisa ter pelo menos 8 caracteres.', success: false });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedback({ message: 'As senhas não coincidem. Confira os dois campos.', success: false });
      return;
    }
    if (newPassword === currentPassword) {
      setFeedback({ message: 'Escolha uma senha diferente da senha atual.', success: false });
      return;
    }
    setFeedback(null);
    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setFeedback({ message: 'Senha alterada. Sua nova senha já está ativa.', success: true });
    } catch (error) {
      setFeedback({ message: error instanceof Error ? error.message : 'Não foi possível alterar a senha. Tente novamente.', success: false });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <View style={styles.headingIcon}><MaterialCommunityIcons name="shield-lock-outline" size={24} color={colors.primary} /></View>
        <Text style={styles.title}>Troca de senha</Text>
        <Text style={styles.subtitle}>Use uma senha forte e não compartilhe seu acesso com outras pessoas.</Text>
        <PasswordField label="Senha atual" value={currentPassword} autoComplete="current-password" onChangeText={(value) => { setCurrentPassword(value); setFeedback(null); }} />
        <PasswordField label="Nova senha" value={newPassword} autoComplete="new-password" onChangeText={(value) => { setNewPassword(value); setFeedback(null); }} />
        <PasswordField label="Confirmar nova senha" value={confirmPassword} autoComplete="new-password" onChangeText={(value) => { setConfirmPassword(value); setFeedback(null); }} />
        <View style={styles.notice}>
          <MaterialCommunityIcons name="information-outline" size={19} color={colors.primary} />
          <Text style={styles.noticeText}>Sua senha atual será verificada antes da alteração.</Text>
        </View>
        {feedback && <Text accessibilityRole={feedback.success ? 'text' : 'alert'} accessibilityLiveRegion="polite" style={[styles.feedback, feedback.success ? styles.success : styles.error]}>{feedback.message}</Text>}
        <Pressable accessibilityRole="button" disabled={saving} onPress={() => void submit()} style={[styles.primaryButton, saving && styles.disabled]}>
          <Text style={styles.primaryButtonText}>{saving ? 'Atualizando...' : 'Atualizar senha'}</Text>
        </Pressable>
      </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PasswordField({ label, value, autoComplete, onChangeText }: { label: string; value: string; autoComplete: 'current-password' | 'new-password'; onChangeText: (value: string) => void }) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.field}>
        <MaterialCommunityIcons name="lock-outline" size={18} color={colors.primary} />
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={autoComplete === 'new-password' ? 'Use pelo menos 8 caracteres para a nova senha.' : 'Digite sua senha atual.'}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={autoComplete}
          onChangeText={onChangeText}
          placeholder={autoComplete === 'new-password' ? 'Mínimo de 8 caracteres' : 'Senha atual'}
          placeholderTextColor={colors.muted}
          secureTextEntry
          style={styles.input}
          value={value}
        />
      </View>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: { ...theme.shadow, backgroundColor: theme.colors.surface, borderRadius: 22, borderWidth: 1, borderColor: theme.colors.border, padding: 20 },
  headingIcon: { width: 48, height: 48, borderRadius: 15, backgroundColor: theme.colors.paleBlue, alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
  title: { color: theme.colors.text, fontSize: 23, fontWeight: '800' },
  subtitle: { color: theme.colors.muted, fontSize: 13, lineHeight: 19, marginTop: 5, marginBottom: 19 },
  fieldWrap: { marginBottom: 13 },
  fieldLabel: { color: theme.colors.text, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  field: { minHeight: 49, borderRadius: 13, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13 },
  input: { flex: 1, minHeight: 47, color: theme.colors.text, fontSize: 13 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 12, padding: 12, backgroundColor: theme.colors.paleBlue, marginTop: 2, marginBottom: 15 },
  noticeText: { flex: 1, color: theme.colors.primaryDark, fontSize: 11, lineHeight: 16 },
  feedback: { fontSize: 12, lineHeight: 18, marginBottom: 12 },
  error: { color: themedColor('#B42318', theme) },
  success: { color: themedColor('#137A4B', theme) },
  primaryButton: { minHeight: 49, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primaryDark },
  primaryButtonText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  disabled: { opacity: 0.65 },
  backButton: { paddingTop: 14, alignItems: 'center' },
  backButtonText: { color: theme.colors.primary, fontWeight: '700', fontSize: 13 },
});
