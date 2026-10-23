import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { confirmPasswordReset } from '../services/api';
import { colors, shadow, AppTheme, useAppTheme, useThemedStyles, themedColor } from '../theme';

export default function ResetPasswordScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { token: routeToken } = useLocalSearchParams<{ token?: string }>();
  const token = Array.isArray(routeToken) ? routeToken[0] : routeToken;
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; success: boolean } | null>(
    token ? null : { message: 'Este link não contém um código de redefinição válido.', success: false },
  );

  const submit = async () => {
    if (!token) {
      setFeedback({ message: 'Este link está incompleto. Solicite um novo link de redefinição.', success: false });
      return;
    }
    if (password.length < 8) {
      setFeedback({ message: 'A nova senha precisa ter pelo menos 8 caracteres.', success: false });
      return;
    }
    if (password !== confirmation) {
      setFeedback({ message: 'As senhas não coincidem. Confira os dois campos.', success: false });
      return;
    }
    setFeedback(null);
    setSaving(true);
    try {
      const result = await confirmPasswordReset(token, password);
      setFeedback({ message: result.mensagem, success: true });
    } catch (error) {
      setFeedback({ message: error instanceof Error ? error.message : 'Não foi possível redefinir a senha. Solicite um novo link e tente novamente.', success: false });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.title}>Criar nova senha</Text>
        <Text style={styles.subtitle}>Escolha uma senha com pelo menos 8 caracteres.</Text>
        {!token ? <Text accessibilityRole="alert" style={[styles.feedback, styles.error]}>{feedback?.message}</Text> : <>
          <TextInput accessibilityLabel="Nova senha" autoCapitalize="none" autoCorrect={false} autoComplete="new-password" returnKeyType="next" onChangeText={(value) => { setPassword(value); setFeedback(null); }} placeholder="Nova senha" placeholderTextColor={colors.muted} secureTextEntry style={styles.input} value={password} />
          <TextInput accessibilityLabel="Confirmar senha" autoCapitalize="none" autoCorrect={false} autoComplete="new-password" returnKeyType="go" onSubmitEditing={() => void submit()} onChangeText={(value) => { setConfirmation(value); setFeedback(null); }} placeholder="Confirmar nova senha" placeholderTextColor={colors.muted} secureTextEntry style={styles.input} value={confirmation} />
          {feedback && <Text accessibilityRole={feedback.success ? 'text' : 'alert'} accessibilityLiveRegion="polite" style={[styles.feedback, feedback.success ? styles.success : styles.error]}>{feedback.message}</Text>}
          <Pressable accessibilityRole="button" disabled={saving || feedback?.success} onPress={() => void submit()} style={[styles.primaryButton, (saving || feedback?.success) && styles.disabled]}>
            <Text style={styles.primaryText}>{saving ? 'SALVANDO...' : feedback?.success ? 'SENHA REDEFINIDA' : 'REDEFINIR SENHA'}</Text>
          </Pressable>
        </>}
        {!token ? <Pressable accessibilityRole="button" onPress={() => router.replace('/forgot-password')} style={styles.backButton}>
          <Text style={styles.backText}>Solicitar novo link</Text>
        </Pressable> : <Pressable accessibilityRole="button" onPress={() => router.replace('/')} style={styles.backButton}>
          <Text style={styles.backText}>{feedback?.success ? 'Ir para entrar' : 'Voltar para entrar'}</Text>
        </Pressable>}
      </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: { ...theme.shadow, backgroundColor: theme.colors.surface, borderRadius: 22, borderWidth: 1, borderColor: theme.colors.border, padding: 20 },
  title: { color: theme.colors.text, fontSize: 23, fontWeight: '800' },
  subtitle: { color: theme.colors.muted, fontSize: 13, lineHeight: 19, marginTop: 7, marginBottom: 18 },
  input: { minHeight: 49, borderRadius: 13, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 13, color: theme.colors.text, fontSize: 13, marginBottom: 11 },
  primaryButton: { minHeight: 49, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primaryDark, marginTop: 3 },
  primaryText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  feedback: { fontSize: 12, lineHeight: 18, marginTop: 2, marginBottom: 10 },
  error: { color: themedColor('#B42318', theme) },
  success: { color: themedColor('#137A4B', theme) },
  disabled: { opacity: 0.65 },
  backButton: { paddingTop: 15, alignItems: 'center' },
  backText: { color: theme.colors.primary, fontWeight: '700', fontSize: 12 },
});
