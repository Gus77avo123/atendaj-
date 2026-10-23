import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserRole } from '../data/demo';
import { useApp } from '../context/AppContext';
import { colors, shadow, AppTheme, useAppTheme, useThemedStyles, themedColor } from '../theme';

WebBrowser.maybeCompleteAuthSession();

export default function WelcomeScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { initialized, role, isAuthenticated, enterAsVisitor, loginAccount, loginGoogleAccount } = useApp();
  const [selectedRole, setSelectedRole] = useState<UserRole>('client');
  const [mode, setMode] = useState<'intro' | 'login' | 'register'>('intro');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginSaving, setLoginSaving] = useState(false);
  const [loginError, setLoginError] = useState('');
  const googleClientIds = {
    ...(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
      ? { webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID }
      : {}),
    ...(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
      ? { androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID }
      : {}),
    ...(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
      ? { iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID }
      : {}),
  };
  const googleConfigured = Platform.OS === 'web'
    ? Boolean(googleClientIds.webClientId)
    : Platform.OS === 'android'
      ? Boolean(googleClientIds.androidClientId)
      : Boolean(googleClientIds.iosClientId);

  useEffect(() => {
    if (initialized && isAuthenticated && role) {
      router.replace(role === 'client' ? '/(client)/search' : '/(professional)/services');
    }
  }, [initialized, isAuthenticated, role]);

  const enterDemo = () => {
    Haptics.selectionAsync();
    enterAsVisitor('client');
    router.replace('/(client)/search');
  };

  const continueToRegister = () => {
    Haptics.selectionAsync();
    setMode('register');
    router.push({ pathname: '/register', params: { role: selectedRole } });
  };

  const submitLogin = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setLoginError('Confira o e-mail. Use um formato como voce@email.com.');
      return;
    }
    if (!password) {
      setLoginError('Digite sua senha para entrar. Se esqueceu, use “Esqueci minha senha”.');
      return;
    }
    setLoginError('');
    setLoginSaving(true);
    try {
      const accountRole = await loginAccount(email.trim().toLowerCase(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(accountRole === 'client' ? '/(client)/search' : '/(professional)/services');
    } catch (error) {
      console.warn('Não foi possível entrar na conta.', error);
      setLoginError(error instanceof Error ? error.message : 'Não foi possível entrar. Confira seus dados e tente novamente.');
    } finally {
      setLoginSaving(false);
    }
  };

  if (!initialized || (isAuthenticated && role)) {
    return (
      <SafeAreaView style={styles.loading}>
        <Image source={require('../../assets/atende-ja-logo.png')} style={styles.loadingLogo} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.page}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {mode === 'intro' ? (
            <View style={styles.intro}>
              <Image source={require('../../assets/atende-ja-logo.png')} style={styles.introLogo} />
              <Text style={styles.introBrand}>ATENDEJÁ</Text>
              <Text style={styles.introEyebrow}>TECNOLOGIA E SERVIÇOS</Text>
              <Text style={styles.introTitle}>Serviços de confiança, mais perto de você.</Text>
              <Text style={styles.introDescription}>
                Encontre profissionais, converse sobre o atendimento e acompanhe seus pedidos em um só lugar.
              </Text>

              <View style={styles.features}>
                <View style={styles.feature}>
                  <View style={[styles.featureIcon, styles.featureBlue]}><MaterialCommunityIcons name="map-marker-radius-outline" size={20} color={colors.primary} /></View>
                  <View style={styles.featureCopy}>
                    <Text style={styles.featureTitle}>Radar de profissionais</Text>
                    <Text style={styles.featureDescription}>Veja profissionais próximos pela sua localização e pelos pontos de atendimento cadastrados.</Text>
                  </View>
                </View>
                <View style={styles.feature}>
                  <View style={[styles.featureIcon, styles.featureGreen]}><MaterialCommunityIcons name="chat-processing-outline" size={20} color={colors.green} /></View>
                  <View style={styles.featureCopy}>
                    <Text style={styles.featureTitle}>Conversa integrada</Text>
                    <Text style={styles.featureDescription}>Tire dúvidas e combine os detalhes do serviço pelo chat.</Text>
                  </View>
                </View>
                <View style={styles.feature}>
                  <View style={[styles.featureIcon, styles.featureYellow]}><MaterialCommunityIcons name="star-outline" size={20} color={colors.secondary} /></View>
                  <View style={styles.featureCopy}>
                    <Text style={styles.featureTitle}>Avaliações de atendimentos</Text>
                    <Text style={styles.featureDescription}>Consulte avaliações e avalie o profissional após um serviço concluído.</Text>
                  </View>
                </View>
                <View style={styles.feature}>
                  <View style={[styles.featureIcon, styles.featurePurple]}><MaterialCommunityIcons name="shield-check-outline" size={20} color={colors.teal} /></View>
                  <View style={styles.featureCopy}>
                    <Text style={styles.featureTitle}>Pedidos acompanhados</Text>
                    <Text style={styles.featureDescription}>Acompanhe o andamento dos pedidos na sua conta.</Text>
                  </View>
                </View>
              </View>

              <Pressable accessibilityRole="button" onPress={() => {
                Haptics.selectionAsync();
                setMode('login');
              }} style={({ pressed }) => [styles.introButton, pressed && styles.pressed]}>
                <Text style={styles.introButtonText}>INICIAR EXPERIÊNCIA</Text>
                <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />
              </Pressable>
              <Text style={styles.introFootnote}>Entre, crie sua conta ou explore como visitante.</Text>
            </View>
          ) : (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sobre o Atende Já"
                onPress={() => Alert.alert('Atende Já', 'Encontre profissionais, solicite serviços e acompanhe seus pedidos em um só lugar.')}
                style={styles.settingsButton}
              >
                <MaterialCommunityIcons name="information-outline" size={21} color="#fff" />
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => setMode('intro')} style={styles.backToIntro}>
                <MaterialCommunityIcons name="arrow-left" size={17} color={colors.primary} />
                <Text style={styles.backToIntroText}>Apresentação</Text>
              </Pressable>
              <View style={styles.loginCard}>
            <Image source={require('../../assets/atende-ja-logo.png')} style={styles.logo} />
            <Text style={styles.brand}>ATENDEJÁ</Text>
            <Text style={styles.brandSubtitle}>SERVIÇOS INTELIGENTES</Text>

            <Text style={styles.welcome}>Bem-vindo de volta!</Text>

            <View style={styles.roleSwitch}>
              {(['client', 'professional'] as const).map((item) => {
                const active = selectedRole === item;
                const isClient = item === 'client';
                return (
                  <Pressable
                    key={item}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setSelectedRole(item)}
                    style={[styles.roleOption, active && (isClient ? styles.roleOptionClient : styles.roleOptionProfessional)]}
                  >
                    <MaterialCommunityIcons
                      name={isClient ? 'account' : 'wrench'}
                      size={14}
                      color={active ? '#fff' : colors.muted}
                    />
                    <Text style={[styles.roleText, active && styles.roleTextActive]}>
                      {isClient ? 'CLIENTE' : 'PROFISSIONAL'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.modeSwitch}>
              <Pressable accessibilityRole="tab" accessibilityState={{ selected: mode === 'login' }} onPress={() => setMode('login')} style={[styles.modeOption, mode === 'login' && styles.modeOptionActive]}>
                <Text style={[styles.modeText, mode === 'login' && styles.modeTextActive]}>ENTRAR</Text>
              </Pressable>
              <Pressable accessibilityRole="tab" accessibilityState={{ selected: mode === 'register' }} onPress={continueToRegister} style={[styles.modeOption, mode === 'register' && styles.modeOptionActive]}>
                <Text style={[styles.modeText, mode === 'register' && styles.modeTextActive]}>CADASTRAR</Text>
              </Pressable>
            </View>

            <View style={styles.field}>
              <View style={styles.fieldIcon}><MaterialCommunityIcons name="email-outline" size={19} color="#67AEEA" /></View>
              <TextInput
                accessibilityLabel="E-mail"
                placeholder="Seu e-mail"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                value={email}
                autoComplete="email"
                editable={!loginSaving}
                returnKeyType="next"
                onChangeText={(value) => {
                  setEmail(value);
                  setLoginError('');
                }}
                style={styles.input}
              />
            </View>
            <View style={styles.field}>
              <View style={styles.fieldIcon}><MaterialCommunityIcons name="lock-outline" size={18} color="#67AEEA" /></View>
              <TextInput
                accessibilityLabel="Senha"
                placeholder="Sua senha"
                placeholderTextColor={colors.muted}
                secureTextEntry
                value={password}
                autoComplete="current-password"
                returnKeyType="go"
                onSubmitEditing={() => void submitLogin()}
                editable={!loginSaving}
                onChangeText={(value) => {
                  setPassword(value);
                  setLoginError('');
                }}
                style={styles.input}
              />
            </View>

            {loginError ? (
              <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.formError}>
                {loginError}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/forgot-password')}
              style={styles.forgot}
            >
              <Text style={styles.forgotText}>Esqueci minha senha</Text>
            </Pressable>

            <Pressable accessibilityRole="button" disabled={loginSaving} onPress={() => void submitLogin()} style={({ pressed }) => [styles.enterButton, pressed && styles.pressed, loginSaving && { opacity: 0.65 }]}>
              <Text style={styles.enterText}>{loginSaving ? 'ENTRANDO...' : 'ENTRAR'}</Text>
            </Pressable>

            {googleConfigured ? (
              <GoogleSignInButton
                clientIds={googleClientIds}
                role={selectedRole}
                loginGoogleAccount={loginGoogleAccount}
              />
            ) : (
              <Pressable accessibilityRole="button" disabled style={[styles.googleButton, styles.googleButtonDisabled]}>
                <MaterialCommunityIcons name="google" size={18} color="#4285F4" />
                <Text style={styles.googleButtonText}>CONTINUAR COM GOOGLE</Text>
              </Pressable>
            )}
            {!googleConfigured && <Text style={styles.googleHint}>Configure os Client IDs do Google no .env do app para ativar o login social.</Text>}

            <Pressable accessibilityRole="button" onPress={enterDemo} style={({ pressed }) => [styles.guestButton, pressed && styles.pressed]}>
              <Text style={styles.guestText}>EXPLORAR COMO VISITANTE</Text>
            </Pressable>
            <Text style={styles.disclaimer}>Como visitante, você pode visualizar apenas o Início e o Radar. Crie uma conta para acessar os demais recursos.</Text>
          </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type GoogleClientIds = {
  webClientId?: string;
  androidClientId?: string;
  iosClientId?: string;
};

function GoogleSignInButton({
  clientIds,
  role,
  loginGoogleAccount,
}: {
  clientIds: GoogleClientIds;
  role: UserRole;
  loginGoogleAccount: (idToken: string, role: UserRole) => Promise<UserRole>;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [googleSaving, setGoogleSaving] = useState(false);
  const [googleRequest, googleResponse, promptGoogle] = Google.useIdTokenAuthRequest(clientIds);
  const handledGoogleResponse = useRef<typeof googleResponse>(null);

  useEffect(() => {
    if (googleResponse?.type !== 'success') return;
    if (handledGoogleResponse.current === googleResponse) return;
    handledGoogleResponse.current = googleResponse;
    const idToken = googleResponse.params.id_token;
    if (!idToken) {
      Alert.alert('Login Google indisponível', 'O Google não retornou um token de autenticação.');
      return;
    }
    setGoogleSaving(true);
    void loginGoogleAccount(idToken, role)
      .then((accountRole) => router.replace(accountRole === 'client' ? '/(client)/search' : '/(professional)/services'))
      .catch((error: unknown) => {
        Alert.alert('Não foi possível entrar com Google', error instanceof Error ? error.message : 'Tente novamente.');
      })
      .finally(() => setGoogleSaving(false));
  }, [googleResponse, loginGoogleAccount, role]);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={!googleRequest || googleSaving}
      onPress={() => void promptGoogle()}
      style={[styles.googleButton, (!googleRequest || googleSaving) && styles.googleButtonDisabled]}
    >
      <MaterialCommunityIcons name="google" size={18} color="#4285F4" />
      <Text style={styles.googleButtonText}>{googleSaving ? 'CONECTANDO...' : 'CONTINUAR COM GOOGLE'}</Text>
    </Pressable>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
  loadingLogo: { width: 125, height: 125, borderRadius: 30 },
  page: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 28 },
  intro: { width: '100%', maxWidth: 420, alignSelf: 'center', alignItems: 'center', paddingTop: 8 },
  introLogo: { width: 78, height: 78, borderRadius: 22 },
  introBrand: { color: theme.colors.primaryDark, fontSize: 23, fontWeight: '900', letterSpacing: 2, marginTop: 13 },
  introEyebrow: { color: theme.colors.primaryDark, fontSize: 8, fontWeight: '800', letterSpacing: 1.6, backgroundColor: theme.colors.paleBlue, borderRadius: 8, overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5, marginTop: 7 },
  introTitle: { color: theme.colors.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.35, lineHeight: 26, textAlign: 'center', marginTop: 20 },
  introDescription: { color: theme.colors.muted, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 8, marginBottom: 17, paddingHorizontal: 2 },
  features: { width: '100%', gap: 8 },
  feature: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 10, borderRadius: 16, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: themedColor('#E7ECF3', theme), ...theme.shadow },
  featureIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  featureBlue: { backgroundColor: theme.colors.paleBlue },
  featureGreen: { backgroundColor: theme.colors.paleGreen },
  featureYellow: { backgroundColor: theme.colors.paleOrange },
  featurePurple: { backgroundColor: themedColor('#F1EDFF', theme) },
  featureCopy: { flex: 1, gap: 3 },
  featureTitle: { color: theme.colors.primaryDark, fontSize: 11, fontWeight: '800' },
  featureDescription: { color: theme.colors.muted, fontSize: 9, lineHeight: 13 },
  introButton: { minHeight: 52, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 15, marginTop: 17, backgroundColor: theme.colors.primaryDark, ...theme.shadow },
  introButtonText: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  introFootnote: { color: theme.colors.muted, fontSize: 9, textAlign: 'center', marginTop: 9 },
  backToIntro: { width: '100%', maxWidth: 440, minHeight: 42, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 3, marginBottom: 6 },
  backToIntroText: { color: theme.colors.primary, fontSize: 11, fontWeight: '700' },
  settingsButton: {
    position: 'absolute', right: 17, top: 25, zIndex: 1, width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center', backgroundColor: themedColor('#B2BDCB', theme),
    borderWidth: 4, borderColor: themedColor('#E4E9F0', theme),
  },
  loginCard: {
    ...theme.shadow, width: '100%', maxWidth: 440, alignSelf: 'center', borderRadius: 27,
    paddingHorizontal: 20, paddingTop: 27, paddingBottom: 20, backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: themedColor('#E7ECF3', theme), alignItems: 'stretch',
  },
  logo: { width: 68, height: 68, borderRadius: 18, alignSelf: 'center' },
  brand: { color: theme.colors.primaryDark, fontSize: 23, fontWeight: '900', letterSpacing: 1.2, textAlign: 'center', marginTop: 12 },
  brandSubtitle: { color: themedColor('#A1B0C5', theme), fontSize: 9, letterSpacing: 2, fontWeight: '800', textAlign: 'center', marginTop: 4 },
  welcome: { color: theme.colors.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.4, marginTop: 30, marginBottom: 10 },
  roleSwitch: { flexDirection: 'row', gap: 8 },
  roleOption: {
    flex: 1, height: 42, borderRadius: 14, borderColor: theme.colors.border, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
  },
  roleOptionClient: { backgroundColor: theme.colors.primaryDark, borderColor: theme.colors.primaryDark },
  roleOptionProfessional: { backgroundColor: theme.colors.teal, borderColor: theme.colors.teal },
  roleText: { color: theme.colors.text, fontSize: 10, fontWeight: '800' },
  roleTextActive: { color: '#fff' },
  modeSwitch: { flexDirection: 'row', gap: 8, marginTop: 11, marginBottom: 19 },
  modeOption: {
    flex: 1, height: 41, borderRadius: 13, borderWidth: 1, borderColor: theme.colors.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface,
  },
  modeOptionActive: { backgroundColor: theme.colors.paleBlue, borderColor: theme.colors.primary },
  modeText: { color: theme.colors.text, fontSize: 10, fontWeight: '800' },
  modeTextActive: { color: theme.colors.primaryDark },
  field: { height: 52, borderRadius: 15, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, flexDirection: 'row', overflow: 'hidden', marginBottom: 10 },
  fieldIcon: { width: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.paleBlue },
  input: { flex: 1, color: theme.colors.text, fontSize: 14, paddingHorizontal: 12 },
  formError: { color: themedColor('#B42318', theme), fontSize: 12, lineHeight: 18, marginBottom: 11 },
  forgot: { alignSelf: 'flex-end', paddingVertical: 2, marginBottom: 13 },
  forgotText: { color: theme.colors.primaryDark, fontSize: 11, fontWeight: '700' },
  enterButton: { minHeight: 51, borderRadius: 15, backgroundColor: theme.colors.primaryDark, alignItems: 'center', justifyContent: 'center', ...theme.shadow },
  enterText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  googleButton: { minHeight: 49, borderRadius: 15, marginTop: 10, backgroundColor: theme.colors.surface, flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  googleButtonDisabled: { opacity: 0.55 },
  googleButtonText: { color: theme.colors.text, fontSize: 11, fontWeight: '800' },
  googleHint: { color: themedColor('#A1AEC0', theme), fontSize: 10, textAlign: 'center', marginTop: 7 },
  guestButton: { minHeight: 51, borderRadius: 15, marginTop: 10, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border, ...theme.shadow },
  guestText: { color: theme.colors.primaryDark, fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  disclaimer: { textAlign: 'center', color: themedColor('#A1AEC0', theme), fontSize: 9, marginTop: 13 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
});
