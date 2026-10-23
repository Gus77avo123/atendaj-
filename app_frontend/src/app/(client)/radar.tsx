import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { categories as serviceCategories, matchesServiceCategory, Professional } from '../../data/demo';
import { useApp } from '../../context/AppContext';
import { ProfessionalMap } from '../../components/ProfessionalMap';
import { Avatar } from '../../components/Avatar';
import { useCurrentLocation } from '../../hooks/useCurrentLocation';
import { distanceInKilometers } from '../../utils/geoUtils';
import { normalizeSearchText } from '../../utils/textUtils';
import { colors, shadow, AppTheme, useAppTheme, useThemedStyles, themedColor } from '../../theme';

const radiusOptions = [1, 5, 10, 20];
const minZoomLevel = 0;
const maxZoomLevel = 6;

// #3 — mapa de raio → nível de zoom correspondente
const radiusToZoom: Record<number, number> = { 1: 5, 5: 3, 10: 2, 20: 0 };

const demoMapProfessionals: Array<Omit<Professional, 'latitude' | 'longitude'>> = [
  { id: 'demo-map-electrician', userId: null, name: 'Eletricista Norte (teste)', category: 'Elétrica', rating: 4.9, reviews: 8, distance: 0, color: '#D69B22', initials: 'EN', available: true, description: 'Profissional demonstrativo para testar o mapa.' },
  { id: 'demo-map-plumber', userId: null, name: 'Encanador Sul (teste)', category: 'Encanador', rating: 4.7, reviews: 5, distance: 0, color: '#4385A8', initials: 'ES', available: false, description: 'Profissional demonstrativo para testar o mapa.' },
  { id: 'demo-map-cleaner', userId: null, name: 'Diarista Leste (teste)', category: 'Diarista', rating: 4.8, reviews: 11, distance: 0, color: '#778C48', initials: 'DL', available: true, description: 'Profissional demonstrativo para testar o mapa.' },
  { id: 'demo-map-painter', userId: null, name: 'Pintor Oeste (teste)', category: 'Pintura', rating: 4.6, reviews: 4, distance: 0, color: '#C06043', initials: 'PO', available: true, description: 'Profissional demonstrativo para testar o mapa.' },
  { id: 'demo-map-assembler', userId: null, name: 'Montador Nordeste (teste)', category: 'Montador', rating: 4.9, reviews: 9, distance: 0, color: '#9B6BA7', initials: 'MN', available: false, description: 'Profissional demonstrativo para testar o mapa.' },
  { id: 'demo-map-mover', userId: null, name: 'Fretes Sudoeste (teste)', category: 'Fretes', rating: 4.5, reviews: 3, distance: 0, color: '#D37B42', initials: 'FS', available: true, description: 'Profissional demonstrativo para testar o mapa.' },
  { id: 'demo-map-gardener', userId: null, name: 'Jardineiro Sudeste (teste)', category: 'Jardinagem', rating: 4.8, reviews: 6, distance: 0, color: '#3D8990', initials: 'JS', available: true, description: 'Profissional demonstrativo para testar o mapa.' },
];
const demoMapOffsets = [
  { latitude: -0.018, longitude: 0 },
  { latitude: 0.018, longitude: 0 },
  { latitude: 0.002, longitude: 0.02 },
  { latitude: -0.002, longitude: -0.02 },
  { latitude: -0.013, longitude: 0.015 },
  { latitude: 0.013, longitude: -0.015 },
  { latitude: 0.015, longitude: 0.017 },
];

export default function RadarScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const params = useLocalSearchParams<{ search?: string; category?: string }>();
  const { professionals, professionalsLoaded, professionalsError, refreshProfessionals, isAuthenticated } = useApp();
  const { coordinates, source, status, loading, locate } = useCurrentLocation();
  const [radius, setRadius] = useState(5);
  const [category, setCategory] = useState(typeof params.category === 'string' ? params.category : 'Todos');
  const [query, setQuery] = useState(typeof params.search === 'string' ? params.search.trim() : '');
  const [selected, setSelected] = useState<Professional | null>(null);
  const [zoomLevel, setZoomLevel] = useState(radiusToZoom[5]); // #3 — zoom inicial coerente com raio padrão 5km
  const [refreshing, setRefreshing] = useState(false);
  const [panelsOpen, setPanelsOpen] = useState(true);
  // #8 — toggle "Só disponíveis agora"
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  // #6 — ref para acionar centralização no componente de mapa
  const centerMapRef = useRef<(() => void) | null>(null);

  const professionalsForRadar = useMemo(() => {
    if (!__DEV__) return professionals;
    return [
      ...professionals,
      ...demoMapProfessionals.map((professional, index) => ({
        ...professional,
        latitude: coordinates.latitude + demoMapOffsets[index].latitude,
        longitude: coordinates.longitude + demoMapOffsets[index].longitude,
      })),
    ];
  }, [coordinates.latitude, coordinates.longitude, professionals]);

  useEffect(() => {
    setCategory(typeof params.category === 'string' ? params.category : 'Todos');
    setQuery(typeof params.search === 'string' ? params.search.trim() : '');
    setSelected(null);
  }, [params.category, params.search]);

  const nearby = useMemo(
    () => professionalsForRadar
      .filter((professional) =>
        matchesServiceCategory(professional.category, category) &&
        normalizeSearchText(`${professional.name} ${professional.category}`).includes(normalizeSearchText(query)) &&
        // #8 — filtra por disponibilidade se toggle ativo
        (!onlyAvailable || professional.available),
      )
      .map((professional) => ({
        ...professional,
        distance: source === 'device' && professional.latitude !== null && professional.longitude !== null &&
          Number.isFinite(professional.latitude) && Number.isFinite(professional.longitude)
          ? distanceInKilometers(coordinates, {
            latitude: professional.latitude,
            longitude: professional.longitude,
          })
          : professional.distance,
      }))
      .filter((professional) => source !== 'device' ||
        professional.latitude === null ||
        professional.longitude === null ||
        !Number.isFinite(professional.latitude) ||
        !Number.isFinite(professional.longitude) ||
        professional.distance <= radius)
      .sort((first, second) => {
        if (first.available !== second.available) return first.available ? -1 : 1;
        const firstHasLocation = first.latitude !== null && first.longitude !== null &&
          Number.isFinite(first.latitude) && Number.isFinite(first.longitude);
        const secondHasLocation = second.latitude !== null && second.longitude !== null &&
          Number.isFinite(second.latitude) && Number.isFinite(second.longitude);
        if (source === 'device' && firstHasLocation !== secondHasLocation) return firstHasLocation ? -1 : 1;
        if (source === 'device' && Number.isFinite(first.distance) && Number.isFinite(second.distance)) {
          return first.distance - second.distance;
        }
        return second.rating - first.rating;
      }),
    [professionalsForRadar, coordinates, radius, category, query, source, onlyAvailable],
  );

  useEffect(() => {
    if (!selected) return;
    const updated = nearby.find((professional) => professional.id === selected.id);
    if (!updated) setSelected(null);
    else if (updated !== selected) setSelected(updated);
  }, [nearby, selected]);

  const categories = serviceCategories.map((item) => item.label);

  const mapCenter = useMemo(() => {
    if (
      selected &&
      selected.latitude !== null &&
      selected.longitude !== null &&
      Number.isFinite(selected.latitude) &&
      Number.isFinite(selected.longitude)
    ) {
      return {
        latitude: selected.latitude,
        longitude: selected.longitude,
      };
    }
    return coordinates;
  }, [coordinates, selected]);

  const selectedHasLocation = selected !== null &&
    selected.latitude !== null && selected.longitude !== null &&
    Number.isFinite(selected.latitude) && Number.isFinite(selected.longitude);
  const effectiveZoomLevel = selectedHasLocation ? maxZoomLevel : zoomLevel;
  const selectedIsMapDemo = selected?.id.startsWith('demo-map-') ?? false;

  const refresh = async () => {
    setRefreshing(true);
    try {
      await refreshProfessionals();
    } finally {
      setRefreshing(false);
    }
  };

  // #5 — haptic ao selecionar marcador (chamado pelo mapa e pelo tray)
  const select = useCallback((professional: Professional) => {
    Haptics.selectionAsync();
    setSelected((current) => current?.id === professional.id ? null : professional);
  }, []);

  // #3 — ao mudar raio, ajusta zoom automaticamente
  const handleRadiusChange = useCallback((item: number) => {
    Haptics.selectionAsync();
    setRadius(item);
    setSelected(null);
    setZoomLevel(radiusToZoom[item] ?? 1);
  }, []);

  // #6 — centralizar na posição do usuário
  const handleCenter = useCallback(() => {
    Haptics.selectionAsync();
    setSelected(null);
    centerMapRef.current?.();
  }, []);

  // #7 — abrir rota no Maps externo
  const handleDirections = useCallback((professional: Professional) => {
    if (professional.latitude == null || professional.longitude == null) return;
    const lat = professional.latitude;
    const lng = professional.longitude;
    const label = encodeURIComponent(professional.name);
    const url = `https://maps.google.com/?daddr=${lat},${lng}&q=${label}`;
    void Linking.openURL(url);
  }, []);

  return (
    <View style={styles.container}>
      <ProfessionalMap
        center={mapCenter}
        source={source}
        professionals={nearby}
        onSelect={select}
        interactive
        radiusKm={source === 'device' ? radius : 0}
        zoomLevel={effectiveZoomLevel}
        userCoordinates={coordinates}
        onCenterRef={centerMapRef}
      />

      {/* #4 — indicador de GPS carregando sobreposto ao mapa */}
      {status === 'requesting' && (
        <View style={styles.gpsLoading}>
          <MaterialCommunityIcons name="crosshairs-gps" size={14} color={colors.primary} />
          <Text style={styles.gpsLoadingText}>Obtendo sua localização…</Text>
        </View>
      )}

      {panelsOpen ? <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <Text style={styles.eyebrow}>ATENDEJÁ · RADAR</Text>
            <Text style={styles.title}>Profissionais perto</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Atualizar profissionais" accessibilityState={{ disabled: refreshing }} disabled={refreshing} onPress={() => void refresh()} style={styles.refreshButton}>
            <MaterialCommunityIcons name={refreshing ? 'loading' : 'refresh'} size={16} color={colors.primary} />
            <Text style={styles.refreshLabel}>{refreshing ? 'ATUALIZANDO' : 'ATUALIZAR'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Ocultar controles do mapa" onPress={() => setPanelsOpen(false)} style={styles.panelToggle}>
            <MaterialCommunityIcons name="chevron-up" size={22} color={colors.primary} />
          </Pressable>
        </View>
        <View style={styles.locationRow}>
          <MaterialCommunityIcons name="map-marker" size={15} color={colors.primary} />
          <Text style={styles.locationText}>{source === 'device' ? 'Sua localização atual' : 'Localização não definida · mapa demonstrativo'}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Atualizar minha localização" disabled={loading} onPress={() => void locate()} style={styles.locationButton}>
            <MaterialCommunityIcons name={loading ? 'loading' : 'crosshairs-gps'} size={16} color={colors.primary} />
          </Pressable>
        </View>
        {source !== 'device' && (
          <Pressable accessibilityRole="button" accessibilityLabel="Tentar usar localização atual" onPress={() => void locate()} style={styles.locationNotice}>
            <MaterialCommunityIcons name={status === 'denied' ? 'map-marker-off-outline' : 'crosshairs-gps'} size={15} color="#FFE193" />
            <Text style={styles.locationNoticeText}>
              {status === 'denied'
                ? 'Localização bloqueada. No navegador, toque no ícone ao lado do endereço e permita Localização; no app, libere a permissão nas configurações do aparelho. Depois, toque aqui para tentar novamente.'
                : status === 'error'
                  ? 'Não foi possível obter sua posição. Confira se a localização está ativa e toque para tentar novamente.'
                  : loading
                    ? 'Buscando sua localização atual…'
                    : 'Toque para usar sua localização atual.'}
            </Text>
          </Pressable>
        )}
        {!!professionalsError && <Pressable accessibilityRole="button" accessibilityLabel="Tentar carregar profissionais novamente" onPress={() => void refreshProfessionals()} style={styles.loadError}>
          <MaterialCommunityIcons name="alert-circle-outline" size={15} color={colors.red} />
          <Text style={styles.loadErrorText}>{professionalsError} · Tocar para tentar novamente.</Text>
        </Pressable>}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
          {categories.map((item) => {
            const active = category === item;
            return <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityLabel={`Filtrar por ${item}`}
              accessibilityState={{ selected: active }}
              onPress={() => { setCategory(item); setSelected(null); }}
              style={[styles.category, active && styles.categoryActive]}
            >
              <Text style={[styles.categoryText, active && styles.categoryTextActive]}>{item}</Text>
            </Pressable>;
          })}
        </ScrollView>
        {!!query && <Text style={styles.readOnlyLabel}>Busca: "{query}"</Text>}
        <View style={styles.radiusBar}>
          <Text style={styles.radiusLabel}>Raio</Text>
          {radiusOptions.map((item) => <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityLabel={`Raio de busca de ${item} quilômetros`}
            accessibilityState={{ selected: radius === item, disabled: source !== 'device' }}
            disabled={source !== 'device'}
            onPress={() => handleRadiusChange(item)}
            style={[styles.radiusOption, radius === item && styles.radiusSelected, source !== 'device' && styles.radiusDisabled]}
          >
            <Text style={[styles.radiusText, radius === item && styles.radiusTextSelected]}>{item} km</Text>
          </Pressable>)}
          {/* #8 — toggle Só disponíveis */}
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel="Mostrar apenas profissionais disponíveis agora"
            accessibilityState={{ checked: onlyAvailable }}
            onPress={() => { Haptics.selectionAsync(); setOnlyAvailable((v) => !v); setSelected(null); }}
            style={[styles.availableToggle, onlyAvailable && styles.availableToggleActive]}
          >
            <MaterialCommunityIcons name="check-circle-outline" size={13} color={onlyAvailable ? '#fff' : colors.muted} />
            <Text style={[styles.availableToggleText, onlyAvailable && styles.availableToggleTextActive]}>Online</Text>
          </Pressable>
          <View accessibilityLabel={professionalsLoaded ? `${nearby.length} profissionais encontrados, ${nearby.filter((item) => item.available).length} online` : 'Carregando profissionais'} accessibilityLiveRegion="polite" style={styles.resultCount}><Text style={styles.resultText}>{professionalsLoaded ? nearby.length : '…'}</Text></View>
        </View>
        <Text style={styles.radiusHint}>
          {source !== 'device' ? 'Ative sua localização para filtrar por distância.' : 'Profissionais sem localização também aparecem no resultado.'}
          {nearby.some((professional) => professional.latitude === null || professional.longitude === null)
            ? ` ${nearby.filter((professional) => professional.latitude === null || professional.longitude === null).length} ainda precisam cadastrar o ponto da área no perfil para aparecer no mapa.`
            : ''}
        </Text>
      </View> : <View style={styles.collapsedHeader}>
        <View style={styles.collapsedTitle}>
          <Text style={styles.eyebrow}>ATENDEJÁ · RADAR</Text>
          <Text style={styles.collapsedSummary}>{nearby.length} profissionais · {category}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Mostrar controles e profissionais" onPress={() => setPanelsOpen(true)} style={styles.collapsedToggle}>
          <MaterialCommunityIcons name="tune-variant" size={17} color={colors.primary} />
          <Text style={styles.collapsedToggleText}>ABRIR</Text>
          <MaterialCommunityIcons name="chevron-down" size={18} color={colors.primary} />
        </Pressable>
      </View>}

      {/* Controles do mapa: zoom + centralizar (#6) */}
      <View style={[styles.mapControls, !panelsOpen && styles.mapControlsExpanded]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Aproximar mapa" accessibilityState={{ disabled: zoomLevel >= maxZoomLevel }} disabled={zoomLevel >= maxZoomLevel} onPress={() => { Haptics.selectionAsync(); setZoomLevel((level) => Math.min(maxZoomLevel, level + 1)); }} style={[styles.mapControlButton, zoomLevel >= maxZoomLevel && styles.mapControlDisabled]}>
          <MaterialCommunityIcons name="plus" size={21} color={colors.primaryDark} />
        </Pressable>
        <View style={styles.controlDivider} />
        <Pressable accessibilityRole="button" accessibilityLabel="Afastar mapa" accessibilityState={{ disabled: zoomLevel <= minZoomLevel }} disabled={zoomLevel <= minZoomLevel} onPress={() => { Haptics.selectionAsync(); setZoomLevel((level) => Math.max(minZoomLevel, level - 1)); }} style={[styles.mapControlButton, zoomLevel <= minZoomLevel && styles.mapControlDisabled]}>
          <MaterialCommunityIcons name="minus" size={21} color={colors.primaryDark} />
        </Pressable>
        {/* #6 — botão centralizar */}
        <View style={styles.controlDivider} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Centralizar mapa na minha localização"
          onPress={handleCenter}
          style={styles.mapControlButton}
        >
          <MaterialCommunityIcons name="crosshairs" size={20} color={colors.primaryDark} />
        </Pressable>
      </View>

      {selected ? (
        <View style={styles.preview}>
          <Pressable accessibilityRole="button" accessibilityLabel="Fechar detalhes do profissional" onPress={() => setSelected(null)} style={styles.close}><MaterialCommunityIcons name="close" size={18} color={colors.muted} /></Pressable>
          <View style={styles.previewTop}>
            <Avatar initials={selected.initials} size={45} color={selected.color} uri={selected.photoUri} />
            <View style={styles.previewInfo}>
              <Text style={styles.previewName}>{selected.name}</Text>
              <Text style={styles.previewSub}>{selected.category} · ★ {selected.rating.toFixed(1)} ({selected.reviews})</Text>
              <View style={[styles.availabilityBadge, selected.available ? styles.availableBadge : styles.offlineBadge]}>
                <View style={[styles.availabilityDot, selected.available ? styles.availableDot : styles.offlineDot]} />
                <Text style={[styles.availabilityText, selected.available ? styles.availableText : styles.offlineText]}>{selected.available ? 'Online · disponível agora' : 'Offline · indisponível agora'}</Text>
              </View>
              {/* #2 — distância correta */}
              <Text style={styles.previewDistance}>
                {source === 'device' && selected.latitude !== null && selected.longitude !== null
                  ? `${selected.distance.toFixed(1)} km`
                  : 'Distância indisponível'} · valor a combinar
              </Text>
            </View>
          </View>
          <View style={styles.actions}>
            <Pressable accessibilityState={{ disabled: selectedIsMapDemo }} disabled={selectedIsMapDemo} style={[styles.primaryAction, selectedIsMapDemo && styles.demoAction]} onPress={() => router.push(`/professional/${selected.id}`)}><Text style={styles.primaryText}>{selectedIsMapDemo ? 'Ponto de teste' : selected.available && isAuthenticated ? 'Ver perfil e combinar' : 'Ver perfil'}</Text></Pressable>
            {/* #7 — botão Como chegar */}
            {!selectedIsMapDemo && selected.latitude != null && selected.longitude != null && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Como chegar até ${selected.name}`}
                onPress={() => handleDirections(selected)}
                style={styles.directionsAction}
              >
                <MaterialCommunityIcons name="directions" size={19} color={colors.primary} />
                <Text style={styles.directionsText}>Rota</Text>
              </Pressable>
            )}
          </View>
        </View>
      ) : panelsOpen ? <View style={styles.nearbyTray}>
        <View style={styles.trayHeading}>
          <View><Text style={styles.trayTitle}>{source === 'device' ? 'Profissionais perto de você' : 'Profissionais encontrados'}</Text><Text style={styles.traySubtitle}>{nearby.length} no total · {nearby.filter((item) => item.available).length} online · {nearby.filter((item) => !item.available).length} offline</Text></View>
          <MaterialCommunityIcons name="gesture-swipe-horizontal" size={20} color={colors.muted} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trayList}>
          {nearby.map((professional) => (
            <Pressable key={professional.id} accessibilityRole="button" accessibilityLabel={`${professional.name}, ${professional.category}, ${professional.available ? 'online' : 'offline'}, ${source === 'device' && professional.latitude !== null && professional.longitude !== null ? `${professional.distance.toFixed(1)} quilômetros` : 'distância indisponível'}, avaliação ${professional.rating.toFixed(1)} de 5`} onPress={() => select(professional)} style={({ pressed }) => [styles.nearbyCard, !professional.available && styles.nearbyCardOffline, pressed && styles.cardPressed]}>
              <Avatar initials={professional.initials} size={38} color={professional.color} uri={professional.photoUri} />
              <View style={styles.nearbyCopy}>
                <Text numberOfLines={1} style={styles.nearbyName}>{professional.name}</Text>
                <Text numberOfLines={1} style={styles.nearbyMeta}>{professional.category} · ★ {professional.rating.toFixed(1)}</Text>
                <Text style={[styles.nearbyAvailability, professional.available ? styles.availableText : styles.offlineText]}>{professional.available ? 'ONLINE · disponível' : 'OFFLINE · indisponível'}</Text>
              </View>
              {/* #2 — "—" só aparece quando realmente não há localização OU GPS inativo */}
              <Text style={styles.nearbyDistance}>
                {source === 'device' && professional.latitude !== null && professional.longitude !== null
                  ? `${professional.distance.toFixed(1)} km`
                  : '—'}
              </Text>
            </Pressable>
          ))}
          {!professionalsLoaded && <Text accessibilityLiveRegion="polite" style={styles.noResults}>Carregando profissionais…</Text>}
          {professionalsLoaded && !professionalsError && !nearby.length && <Text style={styles.noResults}>{source === 'device' ? 'Nenhum profissional encontrado nesta distância. Experimente outra categoria ou aumente o raio.' : 'Nenhum profissional encontrado. Tente outra categoria.'}</Text>}
        </ScrollView>
        {!isAuthenticated && <Pressable onPress={() => router.push('/')} style={styles.guestNotice}>
          <MaterialCommunityIcons name="eye-outline" size={17} color={colors.primary} />
          <Text style={styles.guestNoticeText}>Modo visitante: explore perfis; entre para solicitar serviços.</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={colors.primary} />
        </Pressable>}
      </View> : null}
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: themedColor('#E8EFE8', theme) },
  header: { position: 'absolute', top: 12, left: 14, right: 14, borderRadius: 22, padding: 14, backgroundColor: theme.colors.surface, ...theme.shadow, gap: 10 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 },
  titleCopy: { flex: 1 },
  panelToggle: { width: 38, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: theme.colors.paleBlue },
  collapsedHeader: { position: 'absolute', top: 12, left: 14, right: 14, minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: theme.colors.surface, ...theme.shadow },
  collapsedTitle: { flex: 1, gap: 3 },
  collapsedSummary: { color: theme.colors.text, fontSize: 11, fontWeight: '700' },
  collapsedToggle: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 12, paddingHorizontal: 10, backgroundColor: theme.colors.paleBlue },
  collapsedToggleText: { color: theme.colors.primary, fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  eyebrow: { color: theme.colors.primary, fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  title: { marginTop: 3, color: theme.colors.text, fontSize: 19, fontWeight: '800', letterSpacing: -0.4 },
  refreshButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 12, paddingHorizontal: 9, backgroundColor: theme.colors.paleBlue },
  refreshLabel: { color: theme.colors.primary, fontSize: 8, fontWeight: '800', letterSpacing: 0.3 },
  locationRow: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.background, borderRadius: 12, paddingLeft: 10 },
  locationButton: { height: 44, minWidth: 44, paddingHorizontal: 8, borderRadius: 10, marginRight: 2, backgroundColor: theme.colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  locationText: { flex: 1, color: theme.colors.text, fontSize: 10, fontWeight: '600' },
  locationNotice: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 11, paddingHorizontal: 9, paddingVertical: 7, backgroundColor: theme.colors.paleBlue },
  locationNoticeText: { flex: 1, color: theme.colors.primaryDark, fontSize: 10, lineHeight: 14 },
  loadError: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 11, paddingHorizontal: 9, paddingVertical: 7, backgroundColor: theme.colors.paleRed },
  loadErrorText: { flex: 1, color: theme.colors.red, fontSize: 9, lineHeight: 13 },
  readOnlyLabel: { color: theme.colors.muted, fontSize: 10, paddingLeft: 2 },
  categoryList: { gap: 7, paddingVertical: 1 },
  category: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 14, backgroundColor: theme.colors.background },
  categoryActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  categoryText: { color: theme.colors.muted, fontSize: 10, fontWeight: '700' },
  categoryTextActive: { color: '#fff' },
  radiusBar: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.colors.background, borderRadius: 13, padding: 5 },
  radiusLabel: { color: theme.colors.muted, fontSize: 9, fontWeight: '700', marginHorizontal: 4 },
  radiusOption: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 10 },
  radiusDisabled: { opacity: 0.55 },
  radiusSelected: { backgroundColor: theme.colors.surface, ...theme.shadow },
  radiusText: { fontSize: 10, color: theme.colors.muted, fontWeight: '600' },
  radiusTextSelected: { color: theme.colors.primaryDark },
  radiusHint: { color: theme.colors.muted, fontSize: 9, marginTop: -5, marginLeft: 5 },
  // #8
  availableToggle: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 8, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  availableToggleActive: { backgroundColor: theme.colors.green, borderColor: theme.colors.green },
  availableToggleText: { color: theme.colors.muted, fontSize: 9, fontWeight: '700' },
  availableToggleTextActive: { color: '#fff' },
  resultCount: { marginLeft: 'auto', minWidth: 25, height: 25, borderRadius: 13, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  resultText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  // controles do mapa
  mapControls: { position: 'absolute', right: 16, bottom: 170, width: 43, borderRadius: 14, backgroundColor: theme.colors.surface, alignItems: 'center', ...theme.shadow },
  mapControlsExpanded: { bottom: 20 },
  mapControlButton: { width: 43, height: 42, alignItems: 'center', justifyContent: 'center' },
  mapControlDisabled: { opacity: 0.4 },
  controlDivider: { width: 25, height: 1, backgroundColor: theme.colors.border },
  // #4 — indicador GPS
  gpsLoading: { position: 'absolute', top: 12, left: '50%', transform: [{ translateX: '-50%' }], flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: theme.colors.surface, ...theme.shadow },
  gpsLoadingText: { color: theme.colors.primaryDark, fontSize: 10, fontWeight: '700' },
  // tray
  nearbyTray: { position: 'absolute', left: 12, right: 12, bottom: 13, backgroundColor: theme.colors.surface, borderRadius: 19, paddingTop: 12, paddingBottom: 8, ...theme.shadow },
  trayHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, marginBottom: 9 },
  trayTitle: { color: theme.colors.text, fontSize: 12, fontWeight: '800' },
  traySubtitle: { color: theme.colors.muted, fontSize: 9, marginTop: 3 },
  trayList: { gap: 8, paddingHorizontal: 12, paddingBottom: 3 },
  nearbyCard: { width: 230, minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 9, paddingVertical: 8, backgroundColor: theme.colors.background, borderRadius: 14, borderWidth: 1, borderColor: 'transparent' },
  nearbyCardOffline: { backgroundColor: themedColor('#F5F6F8', theme), borderColor: theme.colors.border },
  cardPressed: { opacity: 0.8 },
  nearbyAvatar: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  nearbyInitials: { color: theme.colors.primaryDark, fontSize: 12, fontWeight: '800' },
  nearbyCopy: { flex: 1 },
  nearbyName: { color: theme.colors.text, fontSize: 10, fontWeight: '800' },
  nearbyMeta: { color: theme.colors.muted, fontSize: 9, marginTop: 3 },
  nearbyAvailability: { fontSize: 8, fontWeight: '800', marginTop: 3 },
  nearbyDistance: { color: theme.colors.primary, fontSize: 9, fontWeight: '800' },
  noResults: { color: theme.colors.muted, fontSize: 11, padding: 10 },
  guestNotice: { position: 'absolute', bottom: 16, left: 14, right: 14, minHeight: 50, backgroundColor: theme.colors.surface, borderRadius: 15, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 8, ...theme.shadow },
  guestNoticeText: { flex: 1, color: theme.colors.primaryDark, fontWeight: '600', fontSize: 11, lineHeight: 15 },
  // preview card
  preview: { position: 'absolute', bottom: 13, left: 12, right: 12, backgroundColor: theme.colors.surface, borderRadius: 22, padding: 16, ...theme.shadow },
  close: { position: 'absolute', right: 4, top: 3, width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  previewTop: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingRight: 17 },
  previewAvatar: { width: 54, height: 54, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  initials: { color: theme.colors.primaryDark, fontWeight: '800', fontSize: 16 },
  previewInfo: { flex: 1, gap: 4 },
  previewName: { color: theme.colors.text, fontSize: 15, fontWeight: '800' },
  previewSub: { color: theme.colors.muted, fontSize: 11 },
  availabilityBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5 },
  availableBadge: { backgroundColor: theme.colors.paleGreen },
  offlineBadge: { backgroundColor: theme.colors.paleBlue },
  availabilityDot: { width: 7, height: 7, borderRadius: 4 },
  availableDot: { backgroundColor: theme.colors.green },
  offlineDot: { backgroundColor: theme.colors.muted },
  availabilityText: { fontSize: 9, fontWeight: '800' },
  availableText: { color: theme.colors.green },
  offlineText: { color: theme.colors.muted },
  previewDistance: { color: theme.colors.primaryDark, fontSize: 11, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 9, marginTop: 14 },
  primaryAction: { flex: 1.5, height: 43, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.secondary },
  demoAction: { backgroundColor: theme.colors.muted },
  primaryText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  // #7 — botão Como chegar
  directionsAction: { width: 55, height: 43, borderRadius: 13, alignItems: 'center', justifyContent: 'center', gap: 2, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  directionsText: { color: theme.colors.primary, fontSize: 8, fontWeight: '800' },
});
