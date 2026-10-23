import { normalizeSearchText } from '../utils/textUtils';

export type UserRole = 'client' | 'professional';
export type ServiceStatus = 'pending' | 'accepted' | 'in_progress' | 'done' | 'cancelled';
export type PhotoUploadMetadata = {
  fileName?: string | null;
  mimeType?: string;
};

export const OTHER_CATEGORY = 'Outros';

export type Professional = {
  id: string;
  userId?: number | null;
  photoUri?: string | null;
  district?: string;
  name: string;
  category: string;
  rating: number;
  reviews: number;
  distance: number;
  color: string;
  initials: string;
  latitude: number | null;
  longitude: number | null;
  available: boolean;
  description: string;
};

export type ServiceOrder = {
  id: string;
  professionalId: string;
  clientName: string;
  clientPhotoUri?: string | null;
  professionalPhotoUri?: string | null;
  title: string;
  description: string;
  address?: string;
  status: ServiceStatus;
  createdAt: string;
  updatedAt?: string;
  unread: number;
  rating?: number;
  reviewed?: boolean;
  completedAt?: number;
};

export const categories = [
  { label: 'Todos', icon: 'view-grid-outline' },
  { label: 'Elétrica', icon: 'lightning-bolt-outline' },
  { label: 'Encanador', icon: 'water-outline' },
  { label: 'Diarista', icon: 'broom' },
  { label: 'Pintura', icon: 'format-paint' },
  { label: 'Montador', icon: 'hammer-wrench' },
  { label: 'Fretes', icon: 'truck-fast-outline' },
  { label: OTHER_CATEGORY, icon: 'dots-horizontal-circle-outline' },
];

export function isOtherServiceCategory(category: string): boolean {
  const normalizedCategory = normalizeSearchText(category.trim());
  return normalizedCategory === normalizeSearchText(OTHER_CATEGORY) ||
    (normalizedCategory !== '' && !categories.some(({ label }) =>
      label !== 'Todos' &&
      label !== OTHER_CATEGORY &&
      normalizeSearchText(label) === normalizedCategory,
    ));
}

export function matchesServiceCategory(category: string, selectedCategory: string): boolean {
  if (selectedCategory === 'Todos') return true;
  if (selectedCategory === OTHER_CATEGORY) return isOtherServiceCategory(category);
  return normalizeSearchText(category) === normalizeSearchText(selectedCategory);
}
