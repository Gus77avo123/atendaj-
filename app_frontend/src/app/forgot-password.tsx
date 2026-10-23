import { router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { requestPasswordReset } from '../services/api';
import { colors, shadow, AppTheme, useAppTheme, useThemedStyles, themedColor } from '../theme';

export default function ForgotPasswordScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; success: boolean } | null>(null);

  const submit = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFeedback({ message: 'Informe um e-mail válido, como voce@email.com.', success: false });
      return;
    }
    setFeedback(null);
    setSending(true);
    try {
      const result = await requestPasswordReset(email.trim().toLowerCase());
      setFeedback({ message: result.mensagem, success: true });
    } catch (error) {
      setFeedback({ message: error instanceof Error ? error.message : 'Não foi possível enviar o link. Tente novamente.', success: false });
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.title}>Recuperar senha</Text>
        <Text style={styles.subtitle}>Enviaremos um link de redefinição para o e-mail da sua conta. O link expira em 20 minutos.</Text>
        <TextInput
          accessibilityLabel="E-mail"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          returnKeyType="send"
          onSubmitEditing={() => void submit()}
          onChangeText={(value) => {
            setEmail(value);
            setFeedback(null);
          }}
          placeholder="Seu e-mail"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={email}
        />
        {feedback && <Text accessibilityRole={feedback.success ? 'text' : 'alert'} accessibilityLiveRegion="polite" style={[styles.feedback, feedback.success ? styles.success : styles.error]}>{feedback.message}</Text>}
        <Pressable accessibilityRole="button" disabled={sending} onPress={() => void submit()} style={[styles.primaryButton, sending && styles.disabled]}>
          <Text style={styles.primaryText}>{sending ? 'ENVIANDO...' : 'ENVIAR LINK'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/')} style={styles.backButton}>
          <Text style={styles.backText}>Voltar para entrar</Text>
        </Pressable>
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
  input: { minHeight: 49, borderRadius: 13, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 13, color: theme.colors.text, fontSize: 13 },
  primaryButton: { minHeight: 49, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primaryDark, marginTop: 14 },
  primaryText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  feedback: { fontSize: 12, lineHeight: 18, marginTop: 12 },
  error: { color: themedColor('#B42318', theme) },
  success: { color: themedColor('#137A4B', theme) },
  disabled: { opacity: 0.65 },
  backButton: { paddingTop: 15, alignItems: 'center' },
  backText: { color: theme.colors.primary, fontWeight: '700', fontSize: 12 },
});
