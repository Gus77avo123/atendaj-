import { Platform } from 'react-native';
import type { ProfileData } from '../context/AppContext';
import type { PhotoUploadMetadata, Professional, ServiceOrder, ServiceStatus, UserRole } from '../data/demo';
import { API_BASE_URL, API_HEADERS } from '../config/api';

export type BackendUser = {
  id: number;
  role: string;
  name: string;
  email: string;
  phone: string;
  cpf?: string;
  address?: string;
  service_type?: string;
  description?: string;
  profile_image_uri?: string;
  notifications_enabled?: number;
  latitude?: number | null;
  longitude?: number | null;
  location_is_registered?: boolean;
};

export type AuthSession = {
  token: string;
  user: BackendUser;
};

type BackendProvider = {
  id: string;
  user_id: number | null;
  name: string;
  category: string;
  description: string;
  rating: number;
  latitude: number | null;
  longitude: number | null;
  location_is_registered: boolean;
  online: number | boolean;
  district: string;
  image_uri?: string;
  usuario?: { profile_image_uri?: string };
  stats?: { review_count: number };
};

type BackendRequest = {
  id: string;
  provider_id: string;
  client_user_id: number;
  client_name: string;
  service: string;
  status: string;
  status_flow: string;
  note: string;
  address?: string;
  rating: number;
  unread_messages: number;
  created_at: string;
  updated_at: string;
  cliente?: { profile_image_uri?: string };
  provider?: { usuario?: { profile_image_uri?: string } };
};

export type BackendReview = {
  id: string;
  client_name: string;
  rating: number;
  comment: string;
  created_at: string;
  cliente?: { profile_image_uri?: string };
};

export type ChatMessage = {
  id: string;
  sender: string;
  text: string;
  image_uri?: string;
  created_at: string;
};

export type InquiryConversation = {
  id: string;
  provider_id: string;
  client_user_id: number;
  updated_at: string;
  provider?: {
    id: string;
    name: string;
    category: string;
    usuario?: { profile_image_uri?: string };
  };
  cliente?: {
    id: number;
    name: string;
    profile_image_uri?: string;
  };
  messages?: ChatMessage[];
};

export type BackendNotification = {
  id: string;
  title: string;
  body: string;
  read: number;
  created_at: string;
};

export type BackendHistory = {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  request_id: string;
  created_at: string;
};

export type AccountSession = {
  id: string;
  device_name: string;
  created_at: string;
  expires_at: string;
  current: boolean;
};

export type SupportTicket = {
  id: string;
  request_id: string | null;
  type: 'support' | 'incident';
  subject: string;
  description: string;
  image_uri: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type PortfolioItem = {
  id: string;
  provider_id: string;
  image_uri: string;
  caption: string;
  created_at: string;
};

type LoginResponse = {
  token: string;
  usuario: BackendUser;
};

const palette = ['#E9F3FF', '#FFF0E4', '#E9F8F2', '#F4EEFF', '#FFF5DF'];

function profileImageFormData(profile: ProfileData, fields: Record<string, string>, photo?: PhotoUploadMetadata) {
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => formData.append(key, value));
  const uri = profile.photoUri;
  if (uri && !/^https?:\/\//i.test(uri)) {
    if (Platform.OS !== 'web') {
      const supportedTypes: Record<string, { extension: string; mimeType: string }> = {
        'image/jpeg': { extension: 'jpg', mimeType: 'image/jpeg' },
        'image/jpg': { extension: 'jpg', mimeType: 'image/jpeg' },
        'image/png': { extension: 'png', mimeType: 'image/png' },
        'image/gif': { extension: 'gif', mimeType: 'image/gif' },
        'image/webp': { extension: 'webp', mimeType: 'image/webp' },
      };
      const suppliedType = photo?.mimeType?.toLowerCase();
      const fileExtension = photo?.fileName?.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
      const uriExtension = uri.match(/\.([a-z0-9]+)(?:[?#].*)?$/i)?.[1]?.toLowerCase();
      const selectedExtension = fileExtension ?? uriExtension;
      const uriType = selectedExtension === 'jpeg' || selectedExtension === 'jpg'
        ? 'image/jpeg'
        : selectedExtension ? `image/${selectedExtension}` : undefined;
      const imageType = (suppliedType && supportedTypes[suppliedType] ? suppliedType : undefined) ??
        (uriType && supportedTypes[uriType] ? uriType : 'image/jpeg');
      const { extension, mimeType } = supportedTypes[imageType];
      formData.append('profile_image', {
        uri,
        name: `perfil.${extension}`,
        type: mimeType,
      } as unknown as Blob);
      return Promise.resolve(formData);
    }
    return (async () => {
      const imageResponse = await fetch(uri);
      if (!imageResponse.ok) throw new Error('Não foi possível ler a foto selecionada. Escolha a imagem novamente.');
      const image = await imageResponse.blob();
      const extension = image.type.split('/')[1] || 'jpg';
      formData.append('profile_image', image, `perfil.${extension}`);
      return formData;
    })();
  }
  return Promise.resolve(formData);
}

async function multipartRequest<T>(path: string, token: string, formData: FormData, method: 'POST' | 'PUT'): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        ...API_HEADERS,
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: formData,
    });
  } catch {
    throw new Error(`Não foi possível acessar o servidor em ${API_BASE_URL}. Verifique se o backend está iniciado e se o aparelho está na mesma rede.`);
  }
  const responseText = await response.text();
  let data: unknown;
  try {
    data = JSON.parse(responseText);
  } catch {
    if (response.ok) throw new Error('O servidor retornou uma resposta inválida.');
    data = null;
  }
  if (!response.ok) {
    const message = typeof data === 'object' && data !== null && 'erro' in data && typeof data.erro === 'string'
      ? data.erro
      : 'Não foi possível concluir a solicitação.';
    throw new Error(message);
  }
  return data as T;
}

async function request<T>(path: string, token: string, options: { method?: string; body?: object } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? (options.body ? 'POST' : 'GET'),
      headers: {
        ...API_HEADERS,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });
  } catch {
    throw new Error(`Não foi possível acessar o servidor em ${API_BASE_URL}. Verifique se o backend está iniciado e se o aparelho está na mesma rede.`);
  }

  const responseText = await response.text();
  let data: unknown;
  try {
    data = JSON.parse(responseText);
  } catch {
    if (response.ok) throw new Error('O servidor retornou uma resposta inválida.');
    data = null;
  }

  if (!response.ok) {
    const message = typeof data === 'object' && data !== null && 'erro' in data && typeof data.erro === 'string'
      ? data.erro
      : 'Não foi possível concluir a solicitação.';
    throw new Error(message);
  }

  return data as T;
}

function toBackendRole(role: UserRole): string {
  return role === 'client' ? 'cliente' : 'profissional';
}

export async function registerWithBackend(role: UserRole, profile: ProfileData, password: string, photo?: PhotoUploadMetadata): Promise<BackendUser & { token: string }> {
  const formData = await profileImageFormData(profile, {
    name: profile.name,
    email: profile.email,
    password,
    role: toBackendRole(role),
    cpf: profile.document,
    phone: profile.phone,
    address: profile.serviceArea,
    service_type: profile.category,
    description: profile.description,
    latitude: profile.serviceLocation ? String(profile.serviceLocation.latitude) : '',
    longitude: profile.serviceLocation ? String(profile.serviceLocation.longitude) : '',
    location_is_registered: profile.serviceLocation ? '1' : '0',
  }, photo);
  return multipartRequest('/usuarios', '', formData, 'POST');
}

export async function loginWithBackend(email: string, password: string): Promise<AuthSession> {
  const response = await request<LoginResponse>('/usuarios/login', '', { body: { email, password } });
  return { token: response.token, user: response.usuario };
}

export async function loginWithGoogle(idToken: string, role: UserRole): Promise<AuthSession> {
  const response = await request<LoginResponse>('/usuarios/google', '', {
    body: { id_token: idToken, role: toBackendRole(role) },
  });
  return { token: response.token, user: response.usuario };
}

export function requestPasswordReset(email: string): Promise<{ mensagem: string }> {
  return request('/usuarios/password-reset/request', '', { body: { email } });
}

export function confirmPasswordReset(token: string, password: string): Promise<{ mensagem: string }> {
  return request('/usuarios/password-reset/confirm', '', { body: { token, password } });
}

export function changePassword(token: string, currentPassword: string, newPassword: string): Promise<{ mensagem: string }> {
  return request('/usuarios/password', token, {
    method: 'PUT',
    body: { current_password: currentPassword, new_password: newPassword },
  });
}

export async function updateProfileOnBackend(userId: number, profile: ProfileData, token: string, photo?: PhotoUploadMetadata): Promise<BackendUser> {
  const formData = await profileImageFormData(profile, {
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    cpf: profile.document,
    address: profile.serviceArea,
    service_type: profile.category,
    description: profile.description,
    latitude: profile.serviceLocation ? String(profile.serviceLocation.latitude) : '',
    longitude: profile.serviceLocation ? String(profile.serviceLocation.longitude) : '',
    location_is_registered: profile.serviceLocation ? '1' : '0',
  }, photo);
  return multipartRequest(`/usuarios/${userId}`, token, formData, 'PUT');
}

export function getAccountFromBackend(userId: number, token: string): Promise<BackendUser> {
  return request(`/usuarios/${userId}`, token);
}

export async function listProfessionals(): Promise<Professional[]> {
  const providers = await request<BackendProvider[]>('/providers', '');
  return providers.map((provider, index) => ({
    id: provider.id,
    userId: provider.user_id,
    photoUri: provider.usuario?.profile_image_uri || provider.image_uri || null,
    district: provider.district,
    name: provider.name,
    category: provider.category,
    rating: Number(provider.rating) || 0,
    reviews: Number(provider.stats?.review_count) || 0,
    distance: 0,
    color: palette[index % palette.length],
    initials: provider.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase(),
    latitude: !provider.location_is_registered || provider.latitude === null ? null : Number(provider.latitude),
    longitude: !provider.location_is_registered || provider.longitude === null ? null : Number(provider.longitude),
    available: provider.online === 1 || provider.online === true,
    description: provider.description,
  }));
}

function backendStatus(status: string): ServiceStatus {
  if (['pending', 'accepted', 'in_progress', 'done', 'cancelled'].includes(status)) return status as ServiceStatus;
  return 'pending';
}

export async function listRequests(token: string): Promise<ServiceOrder[]> {
  const requests = await request<BackendRequest[]>('/requests', token);
  return requests.map(toServiceOrder);
}

export function toServiceOrder(item: BackendRequest): ServiceOrder {
  return {
    id: item.id,
    professionalId: item.provider_id,
    clientName: item.client_name,
    ...(item.cliente?.profile_image_uri ? { clientPhotoUri: item.cliente.profile_image_uri } : {}),
    ...(item.provider?.usuario?.profile_image_uri ? { professionalPhotoUri: item.provider.usuario.profile_image_uri } : {}),
    title: item.service,
    description: item.note,
    address: item.address || '',
    status: backendStatus(item.status_flow || item.status),
    createdAt: new Date(item.created_at).toLocaleString('pt-BR'),
    updatedAt: item.updated_at ? new Date(item.updated_at).toLocaleString('pt-BR') : undefined,
    unread: Number(item.unread_messages) || 0,
    ...(backendStatus(item.status_flow || item.status) === 'done'
      ? { completedAt: new Date(item.updated_at).getTime() }
      : {}),
    ...(item.rating ? { rating: Number(item.rating), reviewed: true } : {}),
  };
}

export function createRequest(token: string, professional: Professional, description: string, address: string): Promise<BackendRequest> {
  return request('/requests', token, { body: {
    provider_id: professional.id,
    service: `${professional.category} • ${professional.name}`,
    note: description,
    address,
  } });
}

export function updateRequestStatus(token: string, id: string, status: ServiceStatus): Promise<BackendRequest> {
  return request(`/requests/${encodeURIComponent(id)}/status`, token, { method: 'PUT', body: { status_flow: status } });
}

export function deleteRequest(token: string, id: string): Promise<{ sucesso: boolean }> {
  return request(`/requests/${encodeURIComponent(id)}`, token, { method: 'DELETE' });
}

export function listMessages(token: string, requestId: string): Promise<ChatMessage[]> {
  return request(`/messages/${encodeURIComponent(requestId)}`, token);
}

export function sendMessage(token: string, requestId: string, text: string): Promise<ChatMessage> {
  return request('/messages', token, { body: { ref_id: requestId, text } });
}

export function listInquiries(token: string): Promise<InquiryConversation[]> {
  return request('/conversations', token);
}

export function startInquiry(token: string, providerId: string): Promise<{ id: string; provider_id: string }> {
  return request('/conversations', token, { body: { provider_id: providerId } });
}

export function listInquiryMessages(token: string, inquiryId: string): Promise<ChatMessage[]> {
  return request(`/conversations/${encodeURIComponent(inquiryId)}/messages`, token);
}

export async function sendInquiryMessage(token: string, inquiryId: string, text: string, imageUri: string | null): Promise<ChatMessage> {
  const formData = new FormData();
  formData.append('text', text);
  if (imageUri) {
    if (Platform.OS !== 'web') {
      const extension = imageUri.split('.').pop()?.split(/[?#]/)[0] || 'jpg';
      formData.append('image', {
        uri: imageUri,
        name: `problema.${extension}`,
        type: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
      } as unknown as Blob);
    } else {
      const imageResponse = await fetch(imageUri);
      if (!imageResponse.ok) throw new Error('Não foi possível ler a foto selecionada. Escolha a imagem novamente.');
      const image = await imageResponse.blob();
      const extension = image.type.split('/')[1] || 'jpg';
      formData.append('image', image, `problema.${extension}`);
    }
  }
  return multipartRequest(`/conversations/${encodeURIComponent(inquiryId)}/messages`, token, formData, 'POST');
}

export function createReview(token: string, requestId: string, rating: number, comment = ''): Promise<void> {
  return request('/reviews', token, { body: { request_id: requestId, rating, comment } });
}

export async function listFavorites(token: string): Promise<string[]> {
  const favorites = await request<{ provider_id: string }[]>('/favorites', token);
  return favorites.map((favorite) => favorite.provider_id);
}

export function addFavorite(token: string, providerId: string): Promise<void> {
  return request('/favorites', token, { body: { provider_id: providerId } });
}

export function removeFavorite(token: string, providerId: string): Promise<void> {
  return request(`/favorites/${encodeURIComponent(providerId)}`, token, { method: 'DELETE' });
}

export async function listNotifications(token: string): Promise<BackendNotification[]> {
  return request('/notifications', token);
}

export function markNotificationRead(token: string, notificationId: string): Promise<BackendNotification> {
  return request(`/notifications/${encodeURIComponent(notificationId)}/read`, token, { method: 'PUT', body: {} });
}

export function markNotificationsRead(token: string): Promise<void> {
  return request('/notifications/read-all', token, { method: 'PUT', body: {} });
}

export function updateProfessionalAvailability(token: string, providerId: string, online: boolean): Promise<void> {
  return request(`/providers/${encodeURIComponent(providerId)}`, token, { method: 'PUT', body: { online: online ? 1 : 0 } });
}

export function registerPushToken(token: string, pushToken: string): Promise<{ sucesso: boolean }> {
  return request('/notifications/push-token', token, { body: { token: pushToken } });
}

export function removePushToken(token: string, pushToken: string): Promise<{ sucesso: boolean }> {
  return request('/notifications/push-token', token, { method: 'DELETE', body: { token: pushToken } });
}

export function listReviews(token: string | null, providerId: string): Promise<BackendReview[]> {
  return request(`/reviews/${encodeURIComponent(providerId)}`, token || '');
}

export function listHistory(token: string): Promise<BackendHistory[]> {
  return request('/history', token);
}

export function updateNotificationPreference(userId: number, token: string, enabled: boolean): Promise<BackendUser> {
  return request(`/usuarios/${userId}`, token, {
    method: 'PUT',
    body: { notifications_enabled: enabled ? 1 : 0 },
  });
}

export function listAccountSessions(token: string): Promise<AccountSession[]> {
  return request('/sessions', token);
}

export function revokeAccountSession(token: string, sessionId: string): Promise<{ sucesso: boolean }> {
  return request(`/sessions/${encodeURIComponent(sessionId)}`, token, { method: 'DELETE' });
}

export function endCurrentAccountSession(token: string): Promise<{ sucesso: boolean }> {
  return request('/sessions/current', token, { method: 'DELETE' });
}

export function revokeOtherAccountSessions(token: string): Promise<{ sucesso: boolean }> {
  return request('/sessions/others', token, { method: 'DELETE' });
}

export function listSupportTickets(token: string): Promise<SupportTicket[]> {
  return request('/support-tickets', token);
}

export async function createSupportTicket(
  token: string,
  details: { type: 'support' | 'incident'; subject: string; description: string; requestId?: string; imageUri?: string | null },
): Promise<SupportTicket> {
  const formData = new FormData();
  formData.append('type', details.type);
  formData.append('subject', details.subject);
  formData.append('description', details.description);
  if (details.requestId) formData.append('request_id', details.requestId);
  if (details.imageUri) {
    if (Platform.OS !== 'web') {
      const extension = details.imageUri.split('.').pop()?.split(/[?#]/)[0] || 'jpg';
      formData.append('image', {
        uri: details.imageUri,
        name: `ocorrencia.${extension}`,
        type: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
      } as unknown as Blob);
    } else {
      const imageResponse = await fetch(details.imageUri);
      if (!imageResponse.ok) throw new Error('Não foi possível ler a foto selecionada. Escolha a imagem novamente.');
      const image = await imageResponse.blob();
      formData.append('image', image, `ocorrencia.${image.type.split('/')[1] || 'jpg'}`);
    }
  }
  return multipartRequest('/support-tickets', token, formData, 'POST');
}

export function listPortfolio(token: string, providerId: string): Promise<PortfolioItem[]> {
  return request(`/portfolio/${encodeURIComponent(providerId)}`, token);
}

export async function createPortfolioItem(token: string, imageUri: string, caption: string): Promise<PortfolioItem> {
  const formData = new FormData();
  formData.append('caption', caption);
  if (Platform.OS !== 'web') {
    const extension = imageUri.split('.').pop()?.split(/[?#]/)[0] || 'jpg';
    formData.append('image', {
      uri: imageUri,
      name: `portfolio.${extension}`,
      type: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
    } as unknown as Blob);
  } else {
    const imageResponse = await fetch(imageUri);
    if (!imageResponse.ok) throw new Error('Não foi possível ler a foto selecionada. Escolha a imagem novamente.');
    const image = await imageResponse.blob();
    formData.append('image', image, `portfolio.${image.type.split('/')[1] || 'jpg'}`);
  }
  return multipartRequest('/portfolio', token, formData, 'POST');
}

export function deletePortfolioItem(token: string, itemId: string): Promise<{ sucesso: boolean }> {
  return request(`/portfolio/${encodeURIComponent(itemId)}`, token, { method: 'DELETE' });
}
