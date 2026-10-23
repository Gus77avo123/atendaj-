import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

type NotificationsModule = typeof import('expo-notifications');

let Notifications: NotificationsModule | null = null;

try {
  Notifications = require('expo-notifications');
} catch {
  // Expo Go no Android não suporta notificações push remotas; a funcionalidade
  // fica desativada neste ambiente e o resto da aplicação continua funcionando.
}
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { PhotoUploadMetadata, Professional, ServiceOrder, ServiceStatus, UserRole } from '../data/demo';
import {
  addFavorite,
  BackendHistory,
  BackendNotification,
  AccountSession,
  PortfolioItem,
  SupportTicket,
  ChatMessage,
  InquiryConversation,
  changePassword as changePasswordOnBackend,
  createRequest as createRequestOnBackend,
  createReview,
  createSupportTicket as createSupportTicketOnBackend,
  createPortfolioItem as createPortfolioItemOnBackend,
  deletePortfolioItem as deletePortfolioItemOnBackend,
  deleteRequest,
  endCurrentAccountSession,
  getAccountFromBackend,
  listFavorites,
  listHistory,
  listMessages,
  listInquiries as listInquiriesFromBackend,
  listInquiryMessages,
  listNotifications,
  listProfessionals,
  listRequests,
  listReviews,
  listAccountSessions,
  listPortfolio,
  listSupportTickets,
  loginWithBackend,
  loginWithGoogle,
  markNotificationRead,
  markNotificationsRead,
  registerPushToken,
  revokeAccountSession,
  revokeOtherAccountSessions,
  removePushToken,
  registerWithBackend,
  removeFavorite,
  sendMessage as sendMessageToBackend,
  sendInquiryMessage as sendInquiryMessageToBackend,
  startInquiry as startInquiryOnBackend,
  toServiceOrder,
  updateNotificationPreference,
  updateProfileOnBackend,
  updateProfessionalAvailability,
  updateRequestStatus,
} from '../services/api';
import { stopProfessionalLocationUpdates } from '../services/backgroundLocation';

const PUSH_TOKEN_KEY = 'atendeja.push-token.v1';

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function getPushNotificationToken(): Promise<string | null> {
  if (Platform.OS === 'web' || !Notifications) return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (typeof projectId !== 'string' || !projectId) {
    throw new Error('Configure EXPO_PUBLIC_EAS_PROJECT_ID antes de ativar notificações push.');
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Atende Já',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return null;

  const result = await Notifications.getExpoPushTokenAsync({ projectId });
  return result.data;
}

export type ProfileData = {
  name: string;
  email: string;
  phone: string;
  photoUri: string | null;
  category: string;
  description: string;
  serviceArea: string;
  serviceLocation: { latitude: number; longitude: number } | null;
  document: string;
};

const emptyProfile: ProfileData = {
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

type AppContextValue = {
  role: UserRole | null;
  initialized: boolean;
  isAuthenticated: boolean;
  accountDataLoaded: boolean;
  professionalsLoaded: boolean;
  profile: ProfileData;
  dataError: string | null;
  professionalsError: string | null;
  userId: number | null;
  notificationsEnabled: boolean;
  enterAsVisitor: (role: UserRole) => void;
  registerAccount: (role: UserRole, profile: ProfileData, password: string, photo?: PhotoUploadMetadata) => Promise<void>;
  loginAccount: (email: string, password: string) => Promise<UserRole>;
  loginGoogleAccount: (idToken: string, role: UserRole) => Promise<UserRole>;
  updateProfile: (profile: ProfileData, photo?: PhotoUploadMetadata) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
  orders: ServiceOrder[];
  online: boolean;
  setOnline: (online: boolean) => Promise<void>;
  requestService: (professional: Professional, description: string) => Promise<string | null>;
  updateOrder: (id: string, status: ServiceStatus) => Promise<void>;
  professionals: Professional[];
  rateOrder: (id: string, rating: number) => Promise<void>;
  favorites: string[];
  toggleFavorite: (providerId: string) => Promise<void>;
  notifications: BackendNotification[];
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  history: BackendHistory[];
  loadMessages: (requestId: string) => Promise<ChatMessage[]>;
  sendMessage: (requestId: string, text: string) => Promise<void>;
  listInquiries: () => Promise<InquiryConversation[]>;
  startInquiry: (providerId: string) => Promise<string>;
  loadInquiryMessages: (inquiryId: string) => Promise<ChatMessage[]>;
  sendInquiryMessage: (inquiryId: string, text: string, imageUri: string | null) => Promise<void>;
  removeOrder: (id: string) => Promise<void>;
  loadReviews: (providerId: string) => ReturnType<typeof listReviews>;
  listSessions: () => Promise<AccountSession[]>;
  revokeSession: (sessionId: string) => Promise<void>;
  revokeOtherSessions: () => Promise<void>;
  listSupportRequests: () => Promise<SupportTicket[]>;
  createSupportRequest: (details: { type: 'support' | 'incident'; subject: string; description: string; requestId?: string; imageUri?: string | null }) => Promise<SupportTicket>;
  listPortfolioItems: (providerId: string) => Promise<PortfolioItem[]>;
  addPortfolioItem: (imageUri: string, caption: string) => Promise<PortfolioItem>;
  removePortfolioItem: (itemId: string) => Promise<void>;
  refreshAccountData: () => Promise<void>;
  refreshProfessionals: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);
const SESSION_KEY = 'atendeja.session.v1';
const PROFILE_KEY = 'atendeja.profile.v1';

function isProfileData(value: unknown): value is ProfileData {
  return typeof value === 'object' && value !== null &&
    'name' in value && typeof value.name === 'string' &&
    'email' in value && typeof value.email === 'string' &&
    'phone' in value && typeof value.phone === 'string' &&
    'photoUri' in value && (typeof value.photoUri === 'string' || value.photoUri === null) &&
    'category' in value && typeof value.category === 'string' &&
    'description' in value && typeof value.description === 'string' &&
    'serviceArea' in value && typeof value.serviceArea === 'string' &&
    (!('serviceLocation' in value) || value.serviceLocation === null ||
      (typeof value.serviceLocation === 'object' && value.serviceLocation !== null &&
        'latitude' in value.serviceLocation && typeof value.serviceLocation.latitude === 'number' &&
        'longitude' in value.serviceLocation && typeof value.serviceLocation.longitude === 'number')) &&
    'document' in value && typeof value.document === 'string';
}

export function AppProvider({ children }: React.PropsWithChildren) {
  const [role, setRole] = useState<UserRole | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accountDataLoaded, setAccountDataLoaded] = useState(false);
  const [professionalsLoaded, setProfessionalsLoaded] = useState(false);
  const [profile, setProfile] = useState<ProfileData>(emptyProfile);
  const [userId, setUserId] = useState<number | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [onlineState, setOnlineState] = useState(false);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<BackendNotification[]>([]);
  const [history, setHistory] = useState<BackendHistory[]>([]);
  const [notificationsEnabled, setNotificationsEnabledState] = useState(true);
  const [accountPreferencesLoaded, setAccountPreferencesLoaded] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [professionalsError, setProfessionalsError] = useState<string | null>(null);
  const locationOperation = useRef(0);

  useEffect(() => {
    if (!isAuthenticated || !token || !accountPreferencesLoaded || !notificationsEnabled) return;
    let active = true;
    getPushNotificationToken().then(async (pushToken) => {
      if (!active) return;
      if (!pushToken && Platform.OS !== 'web') {
        console.warn('Notificações push não foram ativadas porque a permissão do sistema não foi concedida.');
      }
      if (pushToken) {
        await registerPushToken(token, pushToken);
        if (active) await AsyncStorage.setItem(PUSH_TOKEN_KEY, pushToken);
      }
    }).catch((error: unknown) => {
      if (active) console.error('Não foi possível registrar notificações push.', error);
    });
    return () => { active = false; };
  }, [isAuthenticated, token, accountPreferencesLoaded, notificationsEnabled]);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(SESSION_KEY), AsyncStorage.getItem(PROFILE_KEY)])
      .then(([storedSession, storedProfile]) => {
        if (storedSession) {
          const session: unknown = JSON.parse(storedSession);
          if (
            typeof session === 'object' &&
            session !== null &&
            'authenticated' in session &&
            session.authenticated === true &&
            'role' in session &&
            (session.role === 'client' || session.role === 'professional') &&
            'userId' in session &&
            typeof session.userId === 'number' &&
            'token' in session &&
            typeof session.token === 'string' &&
            session.token.length > 0
          ) {
            setRole(session.role);
            setUserId(session.userId);
            setToken(session.token);
            setIsAuthenticated(true);
          }
        }
        if (storedProfile) {
          const restored: unknown = JSON.parse(storedProfile);
          if (isProfileData(restored)) setProfile({ ...emptyProfile, ...restored, serviceLocation: restored.serviceLocation ?? null });
        }
      })
      .catch((error: unknown) => console.warn('Não foi possível restaurar a sessão local.', error))
      .finally(() => setInitialized(true));
  }, []);

  const refreshProfessionals = useCallback(async () => {
    try {
      const nextProfessionals = await listProfessionals();
      setProfessionals(nextProfessionals);
      const ownProvider = nextProfessionals.find((item) => item.userId === userId);
      if (ownProvider) setOnlineState(ownProvider.available);
      setProfessionalsError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível carregar os profissionais.';
      setProfessionalsError(message);
      console.warn('Não foi possível carregar os profissionais do servidor.', error);
    } finally {
      setProfessionalsLoaded(true);
    }
  }, [userId]);

  const refreshAccountData = useCallback(async () => {
    if (!isAuthenticated || !token || userId === null) return;
    try {
      const [nextOrders, nextFavorites, nextNotifications, nextHistory, account] = await Promise.all([
        listRequests(token),
        listFavorites(token),
        listNotifications(token),
        listHistory(token),
        getAccountFromBackend(userId, token),
      ]);
      setOrders(nextOrders);
      setFavorites(nextFavorites);
      setNotifications(nextNotifications);
      setHistory(nextHistory);
      setNotificationsEnabledState(account.notifications_enabled !== 0);
      setAccountPreferencesLoaded(true);
      setDataError(null);
      await refreshProfessionals();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível carregar seus dados.';
      setDataError(message);
      console.warn('Não foi possível carregar os dados da conta.', error);
    } finally {
      setAccountDataLoaded(true);
    }
  }, [isAuthenticated, token, userId, refreshProfessionals]);

  useEffect(() => {
    void refreshProfessionals();
  }, [refreshProfessionals]);

  useEffect(() => {
    if (isAuthenticated && token) {
      void refreshAccountData();
    } else {
      setOrders([]);
      setFavorites([]);
      setNotifications([]);
      setHistory([]);
    }
  }, [isAuthenticated, token, refreshAccountData]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => void refreshAccountData(), 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated, refreshAccountData]);

  useEffect(() => {
    if (!isAuthenticated || role !== 'professional') return;
    stopProfessionalLocationUpdates().catch((error: unknown) => {
      console.error('Não foi possível encerrar a atualização da localização em segundo plano.', error);
    });
  }, [isAuthenticated, role]);

  const enterAsVisitor = useCallback((visitorRole: UserRole) => {
    setRole(visitorRole);
    setIsAuthenticated(false);
    setAccountPreferencesLoaded(false);
    setUserId(null);
    setToken(null);
    setProfile(emptyProfile);
    setDataError(null);
    setAccountDataLoaded(false);
    Promise.all([AsyncStorage.removeItem(SESSION_KEY), AsyncStorage.removeItem('atendeja.role')])
      .catch((error: unknown) => console.warn('Não foi possível limpar a sessão ao entrar como visitante.', error));
  }, []);

  const registerAccount = useCallback(async (accountRole: UserRole, accountProfile: ProfileData, password: string, photo?: PhotoUploadMetadata) => {
    const created = await registerWithBackend(accountRole, accountProfile, password, photo);
    const savedProfile = { ...accountProfile, photoUri: created.profile_image_uri || null };
    const session = { role: accountRole, authenticated: true, userId: created.id, token: created.token };
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(savedProfile));
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setProfile(savedProfile);
    setAccountDataLoaded(false);
    setRole(accountRole);
    setUserId(created.id);
    setToken(created.token);
    setIsAuthenticated(true);
    setNotificationsEnabledState(created.notifications_enabled !== 0);
    setAccountPreferencesLoaded(true);
  }, []);

  const loginAccount = useCallback(async (email: string, password: string) => {
    const session = await loginWithBackend(email.trim().toLowerCase(), password);
    const accountRole: UserRole = session.user.role === 'profissional' || session.user.role === 'professional'
      ? 'professional'
      : 'client';
    const accountProfile: ProfileData = {
      name: session.user.name,
      email: session.user.email,
      phone: session.user.phone || '',
      photoUri: session.user.profile_image_uri || null,
      category: session.user.service_type || '',
      description: session.user.description || '',
      serviceArea: session.user.address || '',
      serviceLocation: session.user.location_is_registered &&
        Number.isFinite(session.user.latitude) && Number.isFinite(session.user.longitude)
        ? { latitude: session.user.latitude!, longitude: session.user.longitude! }
        : null,
      document: session.user.cpf || '',
    };
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(accountProfile));
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({
      role: accountRole,
      authenticated: true,
      userId: session.user.id,
      token: session.token,
    }));
    setProfile(accountProfile);
    setAccountDataLoaded(false);
    setRole(accountRole);
    setUserId(session.user.id);
    setToken(session.token);
    setIsAuthenticated(true);
    setNotificationsEnabledState(session.user.notifications_enabled !== 0);
    setAccountPreferencesLoaded(true);
    return accountRole;
  }, []);

  const loginGoogleAccount = useCallback(async (idToken: string, requestedRole: UserRole) => {
    const session = await loginWithGoogle(idToken, requestedRole);
    const accountRole: UserRole = session.user.role === 'profissional' || session.user.role === 'professional'
      ? 'professional'
      : 'client';
    const accountProfile: ProfileData = {
      name: session.user.name,
      email: session.user.email,
      phone: session.user.phone || '',
      photoUri: session.user.profile_image_uri || null,
      category: session.user.service_type || '',
      description: session.user.description || '',
      serviceArea: session.user.address || '',
      serviceLocation: session.user.location_is_registered &&
        Number.isFinite(session.user.latitude) && Number.isFinite(session.user.longitude)
        ? { latitude: session.user.latitude!, longitude: session.user.longitude! }
        : null,
      document: session.user.cpf || '',
    };
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(accountProfile));
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({
      role: accountRole,
      authenticated: true,
      userId: session.user.id,
      token: session.token,
    }));
    setProfile(accountProfile);
    setAccountDataLoaded(false);
    setRole(accountRole);
    setUserId(session.user.id);
    setToken(session.token);
    setIsAuthenticated(true);
    setNotificationsEnabledState(session.user.notifications_enabled !== 0);
    setAccountPreferencesLoaded(true);
    return accountRole;
  }, []);

  const updateProfile = useCallback(async (nextProfile: ProfileData, photo?: PhotoUploadMetadata) => {
    if (!isAuthenticated || userId === null || token === null) {
      throw new Error('É necessário entrar novamente para atualizar o perfil.');
    }
    const savedAccount = await updateProfileOnBackend(userId, nextProfile, token, photo);
    const savedProfile = { ...nextProfile, photoUri: savedAccount.profile_image_uri || null };
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(savedProfile));
    setProfile(savedProfile);
    setProfessionals((current) => current.map((professional) => professional.userId === userId
      ? {
        ...professional,
        name: savedProfile.name,
        category: savedProfile.category,
        description: savedProfile.description,
        photoUri: savedProfile.photoUri,
        latitude: savedProfile.serviceLocation?.latitude ?? null,
        longitude: savedProfile.serviceLocation?.longitude ?? null,
      }
      : professional));
  }, [isAuthenticated, userId, token]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!isAuthenticated || !token) throw new Error('Entre novamente para alterar sua senha.');
    await changePasswordOnBackend(token, currentPassword, newPassword);
  }, [isAuthenticated, token]);

  const signOut = useCallback(async () => {
    locationOperation.current += 1;
    const currentToken = token;
    const ownProvider = professionals.find((item) => item.userId === userId);
    let sessionError: unknown;
    try {
      if (currentToken && ownProvider && role === 'professional') {
        await updateProfessionalAvailability(currentToken, ownProvider.id, false);
      }
    } catch (error) {
      console.error('Não foi possível marcar o profissional como offline ao sair.', error);
    }
    try {
      await stopProfessionalLocationUpdates();
      const pushToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
      if (currentToken && pushToken) await removePushToken(currentToken, pushToken);
      await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    } catch (error) {
      console.error('Não foi possível encerrar os serviços em segundo plano ao sair.', error);
    }
    try {
      if (currentToken) await endCurrentAccountSession(currentToken);
    } catch (error) {
      sessionError = error;
      console.error('Não foi possível encerrar a sessão no servidor.', error);
    }
    setRole(null);
    setIsAuthenticated(false);
    setAccountDataLoaded(false);
    setAccountPreferencesLoaded(false);
    setUserId(null);
    setToken(null);
    setProfile(emptyProfile);
    try {
      await Promise.all([
        AsyncStorage.removeItem(SESSION_KEY),
        AsyncStorage.removeItem(PROFILE_KEY),
        AsyncStorage.removeItem('atendeja.role'),
      ]);
    } catch (error) {
      console.error('Não foi possível encerrar a sessão local.', error);
      sessionError ??= error;
    }
    if (sessionError) throw new Error('Você saiu neste dispositivo, mas não foi possível confirmar o encerramento completo da sessão.');
  }, [token, professionals, userId, role]);

  const setOnline = useCallback(async (value: boolean) => {
    if (!isAuthenticated || role !== 'professional' || !token || userId === null) return;
    const ownProvider = professionals.find((item) => item.userId === userId);
    if (!ownProvider) throw new Error('Seu perfil profissional ainda não está disponível no servidor.');
    const operation = ++locationOperation.current;
    if (value && (ownProvider.latitude === null || ownProvider.longitude === null)) {
      throw new Error('Escolha e salve o ponto da sua área de atendimento no perfil antes de ficar online.');
    }
    await updateProfessionalAvailability(token, ownProvider.id, value);
    if (operation !== locationOperation.current) {
      if (value) await updateProfessionalAvailability(token, ownProvider.id, false);
      return;
    }
    setOnlineState(value);
    setProfessionals((current) => current.map((item) => item.id === ownProvider.id ? { ...item, available: value } : item));
  }, [isAuthenticated, role, token, userId, professionals]);

  const requestService = useCallback(async (professional: Professional, description: string) => {
    if (!isAuthenticated || role !== 'client' || !token) return null;
    if (orders.some((order) =>
      order.professionalId === professional.id &&
      ['pending', 'accepted', 'in_progress'].includes(order.status),
    )) return null;
    const created = await createRequestOnBackend(token, professional, description, profile.serviceArea.trim());
    const order = toServiceOrder(created);
    setOrders((current) => [order, ...current]);
    return order.id;
  }, [isAuthenticated, role, token, orders, profile.serviceArea]);

  const updateOrder = useCallback(async (id: string, status: ServiceStatus) => {
    if (!isAuthenticated || !token) return;
    const updated = await updateRequestStatus(token, id, status);
    const order = toServiceOrder(updated);
    setOrders((current) => current.map((item) => item.id === id ? order : item));
    void refreshAccountData();
  }, [isAuthenticated, token, refreshAccountData]);

  const rateOrder = useCallback(async (id: string, rating: number) => {
    if (!isAuthenticated || role !== 'client' || !token) return;
    await createReview(token, id, rating);
    setOrders((current) => current.map((order) => order.id === id ? { ...order, rating, reviewed: true } : order));
    const completed = orders.find((order) => order.id === id);
    if (completed) {
      const providerId = completed.professionalId;
      setProfessionals((current) => current.map((item) => item.id === providerId
        ? { ...item, reviews: item.reviews + 1, rating: (item.rating * item.reviews + rating) / (item.reviews + 1) }
        : item));
    }
  }, [isAuthenticated, role, token, orders]);

  const toggleFavorite = useCallback(async (providerId: string) => {
    if (!isAuthenticated || !token) throw new Error('Entre na sua conta para salvar favoritos.');
    if (favorites.includes(providerId)) {
      await removeFavorite(token, providerId);
      setFavorites((current) => current.filter((id) => id !== providerId));
    } else {
      await addFavorite(token, providerId);
      setFavorites((current) => current.includes(providerId) ? current : [...current, providerId]);
    }
  }, [isAuthenticated, token, favorites]);

  const setNotificationsEnabled = useCallback(async (enabled: boolean) => {
    if (!isAuthenticated || token === null || userId === null) return;
    await updateNotificationPreference(userId, token, enabled);
    setNotificationsEnabledState(enabled);
    if (!enabled) {
      const pushToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
      if (pushToken) await removePushToken(token, pushToken);
      await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    }
  }, [isAuthenticated, token, userId]);

  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    if (!token) return;
    const updated = await markNotificationRead(token, notificationId);
    setNotifications((current) => current.map((item) => item.id === notificationId ? updated : item));
  }, [token]);

  const markAllNotificationsAsRead = useCallback(async () => {
    if (!token) return;
    await markNotificationsRead(token);
    setNotifications((current) => current.map((item) => ({ ...item, read: 1 })));
  }, [token]);

  const loadMessages = useCallback(async (requestId: string) => {
    if (!token) return [];
    return listMessages(token, requestId);
  }, [token]);

  const sendMessage = useCallback(async (requestId: string, text: string) => {
    if (!token) throw new Error('Entre novamente para enviar mensagens.');
    await sendMessageToBackend(token, requestId, text);
    setOrders((current) => current.map((item) => item.id === requestId ? { ...item, unread: 0 } : item));
  }, [token]);

  const listInquiries = useCallback(async () => {
    if (!token) throw new Error('Entre novamente para acessar suas conversas.');
    return listInquiriesFromBackend(token);
  }, [token]);

  const startInquiry = useCallback(async (providerId: string) => {
    if (!token || role !== 'client') throw new Error('Entre como cliente para iniciar uma conversa.');
    const inquiry = await startInquiryOnBackend(token, providerId);
    return inquiry.id;
  }, [token, role]);

  const loadInquiryMessages = useCallback(async (inquiryId: string) => {
    if (!token) throw new Error('Entre novamente para acessar suas conversas.');
    return listInquiryMessages(token, inquiryId);
  }, [token]);

  const sendInquiryMessage = useCallback(async (inquiryId: string, text: string, imageUri: string | null) => {
    if (!token) throw new Error('Entre novamente para enviar mensagens.');
    await sendInquiryMessageToBackend(token, inquiryId, text, imageUri);
  }, [token]);

  const loadReviews = useCallback(async (providerId: string) => {
    return listReviews(token, providerId);
  }, [token]);

  const listSessions = useCallback(async () => {
    if (!token) throw new Error('Entre novamente para gerenciar dispositivos.');
    return listAccountSessions(token);
  }, [token]);

  const revokeSession = useCallback(async (sessionId: string) => {
    if (!token) throw new Error('Entre novamente para gerenciar dispositivos.');
    await revokeAccountSession(token, sessionId);
  }, [token]);

  const revokeOtherSessions = useCallback(async () => {
    if (!token) throw new Error('Entre novamente para gerenciar dispositivos.');
    await revokeOtherAccountSessions(token);
  }, [token]);

  const listSupportRequests = useCallback(async () => {
    if (!token) throw new Error('Entre novamente para acessar suas solicitações.');
    return listSupportTickets(token);
  }, [token]);

  const createSupportRequest = useCallback(async (details: {
    type: 'support' | 'incident'; subject: string; description: string; requestId?: string; imageUri?: string | null;
  }) => {
    if (!token) throw new Error('Entre novamente para enviar sua solicitação.');
    return createSupportTicketOnBackend(token, details);
  }, [token]);

  const listPortfolioItems = useCallback(async (providerId: string) => {
    if (!token) throw new Error('Entre novamente para gerenciar seu portfólio.');
    return listPortfolio(token, providerId);
  }, [token]);

  const addPortfolioItem = useCallback(async (imageUri: string, caption: string) => {
    if (!token) throw new Error('Entre novamente para gerenciar seu portfólio.');
    return createPortfolioItemOnBackend(token, imageUri, caption);
  }, [token]);

  const removePortfolioItem = useCallback(async (itemId: string) => {
    if (!token) throw new Error('Entre novamente para gerenciar seu portfólio.');
    await deletePortfolioItemOnBackend(token, itemId);
  }, [token]);

  const removeOrder = useCallback(async (id: string) => {
    if (!token) throw new Error('Entre novamente para remover pedidos.');
    await deleteRequest(token, id);
    setOrders((current) => current.filter((item) => item.id !== id));
  }, [token]);

  const value = useMemo(
    () => ({
      role, initialized, isAuthenticated, accountDataLoaded, professionalsLoaded, profile, dataError, professionalsError, userId, notificationsEnabled, enterAsVisitor,
      registerAccount, loginAccount, loginGoogleAccount, updateProfile, changePassword, signOut, orders, online: onlineState, setOnline,
      requestService, updateOrder, rateOrder, professionals, favorites, toggleFavorite, notifications,
      setNotificationsEnabled, markNotificationAsRead, markAllNotificationsAsRead, history,
      loadMessages, sendMessage, listInquiries, startInquiry, loadInquiryMessages, sendInquiryMessage, loadReviews, refreshAccountData, refreshProfessionals, removeOrder,
      listSessions, revokeSession, revokeOtherSessions, listSupportRequests, createSupportRequest, listPortfolioItems, addPortfolioItem, removePortfolioItem,
    }),
    [role, initialized, isAuthenticated, accountDataLoaded, professionalsLoaded, profile, dataError, professionalsError, userId, notificationsEnabled, enterAsVisitor,
      registerAccount, loginAccount, loginGoogleAccount, updateProfile, changePassword, signOut, orders, onlineState, setOnline, requestService,
      updateOrder, rateOrder, professionals, favorites, toggleFavorite, notifications, setNotificationsEnabled,
      markNotificationAsRead, markAllNotificationsAsRead, history, loadMessages, sendMessage, listInquiries,
      startInquiry, loadInquiryMessages, sendInquiryMessage, loadReviews,
      refreshAccountData, refreshProfessionals, removeOrder, listSessions, revokeSession, revokeOtherSessions,
      listSupportRequests, createSupportRequest, listPortfolioItems, addPortfolioItem, removePortfolioItem],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp precisa ser usado dentro de AppProvider.');
  return context;
}
