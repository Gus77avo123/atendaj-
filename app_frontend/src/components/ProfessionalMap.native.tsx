import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MapView, { Circle, Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Professional } from '../data/demo';
import { Coordinates } from '../hooks/useCurrentLocation';
import { AppTheme, useAppTheme, useThemedStyles, themedColor } from '../theme';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';

const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const useOpenStreetMapTiles = Platform.OS === 'android' && !googleMapsApiKey;

const openStreetMapSource = { html: `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
  <style>
    html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; background: #E8EFE8; }
    .professional-pin { position: relative; display: flex; align-items: center; justify-content: center; width: 48px; height: 48px; padding: 0; }
    .professional-pin.offline .avatar-shell { opacity: 0.9; }
    .professional-pin .avatar-wrap { position: relative; display: flex; align-items: center; justify-content: center; }
    .professional-pin .avatar-shell { width: 46px; height: 46px; border: 3px solid white; border-radius: 50%; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.24); display: flex; align-items: center; justify-content: center; }
    .professional-pin .avatar { width: 100%; height: 100%; border-radius: 50%; background-size: cover; background-position: center; background-repeat: no-repeat; }
    .professional-pin .avatar.no-photo { display: flex; align-items: center; justify-content: center; background: #E9F3FF; color: #07528C; font: 800 10px sans-serif; }
    .professional-pin .status-dot { position: absolute; right: 0; bottom: 0; width: 13px; height: 13px; border: 2px solid white; border-radius: 50%; background: #20A464; box-shadow: 0 1px 4px #0005; }
    .professional-pin.offline .status-dot { background: #7B8792; }
    .cluster-pin { width: 44px; height: 44px; border-radius: 22px; background: #07528C; color: white; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; font-family: sans-serif; }
    .user-pin { width: 14px; height: 14px; border: 3px solid white; border-radius: 50%; background: #07528C; box-shadow: 0 0 0 7px #1E88E533; }
    .leaflet-container { font-family: sans-serif; }
  </style>
  <script>
    window.addEventListener('error', function() {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage('__map_load_error__');
    });
    setTimeout(function() {
      if (!window.L && window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage('__map_load_error__');
      }
    }, 4500);
  </script>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" onerror="window.ReactNativeWebView && window.ReactNativeWebView.postMessage('__map_load_error__')"></script>
</head>
<body>
  <div id="map"></div>
  <script>
    (function () {
      if (!window.L) {
        if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage('__map_load_error__');
        return;
      }
      var map = L.map('map', { zoomControl: false, attributionControl: true }).setView([-15.7942, -47.8825], 12);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
      }).addTo(map);
      var professionalsLayer = L.layerGroup().addTo(map);
      var centerMarker;
      var radiusCircle;
      var previousCenter;
      var previousZoom;

      window.updateMap = function (state) {
        var center = [state.center.latitude, state.center.longitude];
        if (!previousCenter || previousCenter[0] !== center[0] || previousCenter[1] !== center[1] || previousZoom !== state.zoom) {
          map.flyTo(center, state.zoom, { duration: 0.65 });
          previousCenter = center;
          previousZoom = state.zoom;
        }
        professionalsLayer.clearLayers();
        state.professionals.forEach(function (professional) {
          var initials = (professional.initials || 'AJ').slice(0, 2);
          var avatarHtml = professional.photoUri
            ? '<div class="avatar" style="background-image: url(\"' + professional.photoUri.replace(/"/g, '&quot;') + '\"); background-size: cover; background-position: center; background-repeat: no-repeat;"></div>'
            : '<div class="avatar no-photo">' + initials + '</div>';
          var icon = L.divIcon({
            className: '',
            html: '<div class="professional-pin ' + (professional.available ? '' : 'offline') + '"><div class="avatar-wrap"><div class="avatar-shell" style="background:' + (professional.color || '#E9F3FF') + ';">' + avatarHtml + '</div></div><div class="status-dot"></div></div>',
            iconSize: [50, 50],
            iconAnchor: [25, 48]
          });
          var marker = L.marker([professional.latitude, professional.longitude], { icon: icon }).addTo(professionalsLayer);
          if (state.interactive && window.ReactNativeWebView) {
            marker.on('click', function () {
              window.ReactNativeWebView.postMessage(professional.id);
            });
          }
        });
        if (centerMarker) map.removeLayer(centerMarker);
        centerMarker = L.marker(center, {
          interactive: false,
          icon: L.divIcon({ className: '', html: '<div class="user-pin"></div>', iconSize: [26, 26], iconAnchor: [13, 13] }),
          zIndexOffset: 1000
        }).addTo(map);
        if (radiusCircle) map.removeLayer(radiusCircle);
        if (state.radiusMeters > 0) {
          radiusCircle = L.circle(center, {
            radius: state.radiusMeters,
            color: '#1E88E5',
            weight: 1,
            fillColor: '#1E88E5',
            fillOpacity: 0.1
          }).addTo(map);
        } else {
          radiusCircle = null;
        }
        setTimeout(function () { map.invalidateSize(); }, 100);
      };
    })();
  </script>
</body>
</html>` };

type OpenStreetMapState = {
  center: Coordinates;
  professionals: Array<{
    id: string;
    latitude: number;
    longitude: number;
    available: boolean;
    initials: string;
    color: string;
    photoUri: string | null;
  }>;
  interactive: boolean;
  radiusMeters: number;
  zoom: number;
};

type ValidProfessional = Professional & { latitude: number; longitude: number };

type MapClusterItem =
  | { type: 'single'; professional: ValidProfessional }
  | {
      type: 'cluster';
      id: string;
      latitude: number;
      longitude: number;
      items: ValidProfessional[];
      availableCount: number;
    };

function serializeMapState(state: OpenStreetMapState): string {
  return JSON.stringify(state)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function ProfessionalMap({
  center,
  source,
  professionals,
  onSelect,
  interactive = true,
  radiusKm,
  zoomLevel,
  userCoordinates,
  onCenterRef,
}: {
  center: Coordinates;
  source: 'device' | 'sample';
  professionals: Professional[];
  onSelect: (professional: Professional) => void;
  interactive?: boolean;
  radiusKm: number;
  zoomLevel: number;
  userCoordinates?: Coordinates;
  onCenterRef?: React.MutableRefObject<(() => void) | null>;
}) {
  const { colors, isDark } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const mapRef = useRef<MapView>(null);
  const webViewRef = useRef<WebView>(null);
  const webViewLoaded = useRef(false);
  const [mapLoadError, setMapLoadError] = useState(false);
  const mapDelta = 0.07 / 2 ** zoomLevel;
  const region: Region = { ...center, latitudeDelta: mapDelta, longitudeDelta: mapDelta };

  const validProfessionals = useMemo<ValidProfessional[]>(() => {
    return professionals.filter(
      (p): p is ValidProfessional =>
        p.latitude !== null &&
        p.longitude !== null &&
        Number.isFinite(p.latitude) &&
        Number.isFinite(p.longitude)
    );
  }, [professionals]);

  // #9 - Clustering geométrico adaptado ao zoomDelta atual
  const clusteredItems = useMemo<MapClusterItem[]>(() => {
    const threshold = mapDelta * 0.12; // limite de proximidade angular
    const visited = new Set<string>();
    const clusters: MapClusterItem[] = [];

    for (let i = 0; i < validProfessionals.length; i++) {
      const p1 = validProfessionals[i];
      if (visited.has(p1.id)) continue;

      const group: ValidProfessional[] = [p1];
      visited.add(p1.id);

      for (let j = i + 1; j < validProfessionals.length; j++) {
        const p2 = validProfessionals[j];
        if (visited.has(p2.id)) continue;

        const dLat = Math.abs(p1.latitude - p2.latitude);
        const dLng = Math.abs(p1.longitude - p2.longitude);

        if (dLat < threshold && dLng < threshold) {
          group.push(p2);
          visited.add(p2.id);
        }
      }

      if (group.length > 1) {
        const avgLat = group.reduce((sum, item) => sum + item.latitude, 0) / group.length;
        const avgLng = group.reduce((sum, item) => sum + item.longitude, 0) / group.length;
        const availableCount = group.filter((item) => item.available).length;
        clusters.push({
          type: 'cluster',
          id: `cluster-${p1.id}-${group.length}`,
          latitude: avgLat,
          longitude: avgLng,
          items: group,
          availableCount,
        });
      } else {
        clusters.push({ type: 'single', professional: p1 });
      }
    }

    return clusters;
  }, [validProfessionals, mapDelta]);

  const mapState = useMemo<OpenStreetMapState>(() => ({
    center,
    professionals: validProfessionals.map((professional) => ({
      id: professional.id,
      latitude: professional.latitude,
      longitude: professional.longitude,
      available: professional.available,
      initials: professional.initials,
      color: professional.color,
      photoUri: professional.photoUri ?? null,
    })),
    interactive,
    radiusMeters: radiusKm * 1000,
    zoom: Math.min(19, Math.max(4, 11 + zoomLevel)),
  }), [center, validProfessionals, interactive, radiusKm, zoomLevel]);

  const latestMapState = useRef(mapState);
  latestMapState.current = mapState;

  const sendMapState = useCallback(() => {
    webViewRef.current?.injectJavaScript(`window.updateMap && window.updateMap(${serializeMapState(latestMapState.current)}); true;`);
  }, []);

  const handleWebViewMessage = useCallback(({ nativeEvent }: WebViewMessageEvent) => {
    if (nativeEvent.data === '__map_load_error__') {
      setMapLoadError(true);
      console.warn('Não foi possível carregar o mapa Leaflet/OpenStreetMap.');
      return;
    }
    const selectedProfessional = professionals.find((professional) => professional.id === nativeEvent.data);
    if (interactive && selectedProfessional) {
      void Haptics.selectionAsync(); // #5
      onSelect(selectedProfessional);
    }
  }, [interactive, onSelect, professionals]);

  // #6 - Suporte ao botão "Centralizar" externo
  useEffect(() => {
    if (onCenterRef) {
      onCenterRef.current = () => {
        const target = userCoordinates || center;
        if (useOpenStreetMapTiles) {
          webViewRef.current?.injectJavaScript(
            `window.updateMap && window.updateMap(${serializeMapState({ ...latestMapState.current, center: target })}); true;`
          );
        } else {
          mapRef.current?.animateToRegion(
            {
              ...target,
              latitudeDelta: mapDelta,
              longitudeDelta: mapDelta,
            },
            450
          );
        }
      };
    }
    return () => {
      if (onCenterRef) onCenterRef.current = null;
    };
  }, [onCenterRef, userCoordinates, center, mapDelta]);

  useEffect(() => {
    mapRef.current?.animateToRegion(region, 450);
  }, [center.latitude, center.longitude, zoomLevel]);

  useEffect(() => {
    if (webViewLoaded.current) sendMapState();
  }, [mapState, sendMapState]);

  const handleClusterPress = (cluster: Extract<MapClusterItem, { type: 'cluster' }>) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Aproxima o mapa para desmembrar o cluster
    const nextDelta = Math.max(0.005, mapDelta / 2.5);
    mapRef.current?.animateToRegion({
      latitude: cluster.latitude,
      longitude: cluster.longitude,
      latitudeDelta: nextDelta,
      longitudeDelta: nextDelta,
    }, 400);
  };

  const handleRetryOpenStreetMap = () => {
    setMapLoadError(false);
    webViewLoaded.current = false;
    webViewRef.current?.reload();
  };

  if (useOpenStreetMapTiles) {
    return (
      <View style={StyleSheet.absoluteFill}>
        <WebView
          ref={webViewRef}
          source={openStreetMapSource}
          style={StyleSheet.absoluteFill}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          accessibilityLabel="Mapa OpenStreetMap de profissionais próximos"
          onLoadStart={() => {
            webViewLoaded.current = false;
            setMapLoadError(false);
          }}
          onLoadEnd={() => {
            webViewLoaded.current = true;
            sendMapState();
          }}
          onMessage={handleWebViewMessage}
          onError={({ nativeEvent }) => {
            setMapLoadError(true);
            console.warn('Falha no carregamento da WebView do mapa.', nativeEvent.description);
          }}
        />
        {mapLoadError && (
          <View style={styles.mapLoadError}>
            <MaterialCommunityIcons name="wifi-off" size={24} color={colors.primary} style={{ marginBottom: 6 }} />
            <Text style={styles.mapLoadErrorTitle}>Mapa indisponível no momento</Text>
            <Text style={styles.mapLoadErrorText}>
              Não foi possível carregar os dados de satélite/mapa. Verifique sua conexão com a internet ou tente novamente.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tentar recarregar o mapa"
              onPress={handleRetryOpenStreetMap}
              style={styles.retryButton}
            >
              <MaterialCommunityIcons name="refresh" size={16} color="#fff" />
              <Text style={styles.retryButtonText}>Recarregar mapa</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        provider={googleMapsApiKey ? PROVIDER_GOOGLE : undefined}
        showsUserLocation={source === 'device'}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale
        accessibilityLabel="Mapa de profissionais próximos"
        userInterfaceStyle={isDark ? 'dark' : 'light'}
        customMapStyle={isDark ? darkMapStyle : []}
      >
        <Circle
          center={center}
          radius={radiusKm * 1000}
          fillColor="rgba(30,136,229,0.10)"
          strokeColor="rgba(30,136,229,0.35)"
          strokeWidth={1}
        />
        {clusteredItems.map((item) => {
          if (item.type === 'cluster') {
            return (
              <Marker
                key={item.id}
                coordinate={{ latitude: item.latitude, longitude: item.longitude }}
                onPress={interactive ? () => handleClusterPress(item) : undefined}
                tracksViewChanges={false}
                accessibilityLabel={`Grupo com ${item.items.length} profissionais`}
              >
                <View style={styles.clusterWrap}>
                  <View style={styles.clusterCircle}>
                    <MaterialCommunityIcons name="account-group" size={16} color="#fff" />
                    <Text style={styles.clusterText}>{item.items.length}</Text>
                  </View>
                  {item.availableCount > 0 && (
                    <View style={styles.clusterAvailableBadge}>
                      <View style={styles.clusterAvailableDot} />
                    </View>
                  )}
                </View>
              </Marker>
            );
          }

          const professional = item.professional;
          return (
            <Marker
              key={professional.id}
              coordinate={{ latitude: professional.latitude, longitude: professional.longitude }}
              onPress={
                interactive
                  ? () => {
                      void Haptics.selectionAsync(); // #5
                      onSelect(professional);
                    }
                  : undefined
              }
              tracksViewChanges={false}
              accessibilityLabel={`${professional.name}, ${professional.category}, ${professional.available ? 'online' : 'offline'}`}
            >
              <View style={styles.avatarMarkerWrap}>
                <View
                  style={[
                    styles.avatarPin,
                    { backgroundColor: professional.color },
                    !professional.available && styles.avatarPinOffline,
                  ]}
                >
                  {professional.photoUri ? (
                    <Image source={{ uri: professional.photoUri }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarInitials}>{professional.initials}</Text>
                  )}
                </View>
                <View
                  style={[
                    styles.statusDot,
                    professional.available ? styles.statusDotOnline : styles.statusDotOffline,
                  ]}
                />
              </View>
            </Marker>
          );
        })}
        {source === 'sample' && (
          <Marker coordinate={center} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
            <View style={styles.you}>
              <View style={styles.youDot} />
            </View>
          </Marker>
        )}
      </MapView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  avatarMarkerWrap: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  avatarPin: { width: 46, height: 46, borderRadius: 23, borderWidth: 3, borderColor: theme.colors.surface, backgroundColor: theme.colors.primary, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.24, shadowRadius: 7, shadowOffset: { width: 0, height: 3 } },
  avatarPinOffline: { opacity: 0.85 },
  avatarImage: { width: 46, height: 46, borderRadius: 23 },
  avatarInitials: { color: theme.colors.primaryDark, fontWeight: '800', fontSize: 11 },
  statusDot: { position: 'absolute', right: 1, bottom: 1, width: 13, height: 13, borderRadius: 7, borderWidth: 2, borderColor: theme.colors.surface },
  statusDotOnline: { backgroundColor: '#20A464' },
  statusDotOffline: { backgroundColor: themedColor('#7B8792', theme) },
  // #9 - estilos do cluster pin
  clusterWrap: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  clusterCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.primary, borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 2, elevation: 6, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  clusterText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  clusterAvailableBadge: { position: 'absolute', top: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  clusterAvailableDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#20A464' },
  you: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(30,136,229,0.2)', alignItems: 'center', justifyContent: 'center' },
  youDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: theme.colors.primary, borderWidth: 2, borderColor: theme.colors.surface },
  // #1 - card de erro e botão de retry amigável
  mapLoadError: { position: 'absolute', top: '40%', left: 24, right: 24, padding: 18, borderRadius: 16, backgroundColor: theme.colors.surface, alignItems: 'center', ...theme.shadow },
  mapLoadErrorTitle: { color: theme.colors.text, fontSize: 13, fontWeight: '800', marginBottom: 4 },
  mapLoadErrorText: { color: theme.colors.muted, fontSize: 11, textAlign: 'center', lineHeight: 16, marginBottom: 14 },
  retryButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, borderRadius: 12, backgroundColor: theme.colors.primary },
  retryButtonText: { color: '#fff', fontSize: 11, fontWeight: '800' },
});

const darkMapStyle: import('react-native-maps').MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: '#202C3A' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#A7B4C5' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#202C3A' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#45566A' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#1B2735' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#243547' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#344457' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#263646' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#29394A' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#152432' }] },
];
