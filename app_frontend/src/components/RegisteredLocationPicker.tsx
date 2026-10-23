import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MapView, { MapPressEvent, Marker, Region } from 'react-native-maps';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import { Coordinates } from '../hooks/useCurrentLocation';
import { AppTheme, useAppTheme, useThemedStyles } from '../theme';

const defaultCenter: Coordinates = { latitude: -14.235, longitude: -51.9253 };

function createMapSource(center: Coordinates, selectedLocation: Coordinates | null) {
  return { html: `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
  <style>
    html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; }
    .leaflet-container { background: #E8EFE8; font-family: sans-serif; }
    .selected-point { width: 18px; height: 18px; border: 3px solid white; border-radius: 50%; background: #07528C; box-shadow: 0 1px 6px #0008; }
  </style>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
</head>
<body>
  <div id="map"></div>
  <script>
    (function () {
      if (!window.L) return;
      var map = L.map('map').setView([${center.latitude}, ${center.longitude}], ${selectedLocation ? 13 : 4});
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
      }).addTo(map);
      var selectedMarker = ${selectedLocation ? `L.marker([${selectedLocation.latitude}, ${selectedLocation.longitude}], {
        icon: L.divIcon({ className: '', html: '<div class="selected-point"></div>', iconSize: [24, 24], iconAnchor: [12, 12] })
      }).addTo(map)` : 'null'};
      map.on('click', function (event) {
        var point = { latitude: event.latlng.lat, longitude: event.latlng.lng };
        if (selectedMarker) selectedMarker.setLatLng(event.latlng);
        else selectedMarker = L.marker(event.latlng, {
          icon: L.divIcon({ className: '', html: '<div class="selected-point"></div>', iconSize: [24, 24], iconAnchor: [12, 12] })
        }).addTo(map);
        window.ReactNativeWebView.postMessage(JSON.stringify(point));
      });
    })();
  </script>
</body>
</html>` };
}

function isCoordinates(value: unknown): value is Coordinates {
  if (typeof value !== 'object' || value === null || !('latitude' in value) || !('longitude' in value)) return false;
  return typeof value.latitude === 'number' && Number.isFinite(value.latitude) &&
    value.latitude >= -90 && value.latitude <= 90 &&
    typeof value.longitude === 'number' && Number.isFinite(value.longitude) &&
    value.longitude >= -180 && value.longitude <= 180;
}

export function RegisteredLocationPicker({
  value,
  onChange,
}: {
  value: Coordinates | null;
  onChange: (location: Coordinates) => void;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState<Coordinates | null>(value);
  const [latitudeText, setLatitudeText] = useState(value ? String(value.latitude) : '');
  const [longitudeText, setLongitudeText] = useState(value ? String(value.longitude) : '');
  const center = value ?? defaultCenter;
  const region = useMemo<Region>(() => ({
    ...center,
    latitudeDelta: value ? 0.025 : 38,
    longitudeDelta: value ? 0.025 : 45,
  }), [center.latitude, center.longitude]);
  const mapSource = useMemo(() => createMapSource(center, value), [center.latitude, center.longitude, value]);

  const open = () => {
    setDraft(value);
    setLatitudeText(value ? String(value.latitude) : '');
    setLongitudeText(value ? String(value.longitude) : '');
    setVisible(true);
  };

  const updateWebCoordinates = (latitude: string, longitude: string) => {
    setLatitudeText(latitude);
    setLongitudeText(longitude);
    if (!latitude.trim() || !longitude.trim()) {
      setDraft(null);
      return;
    }
    const coordinates = {
      latitude: Number(latitude.replace(',', '.')),
      longitude: Number(longitude.replace(',', '.')),
    };
    setDraft(isCoordinates(coordinates) ? coordinates : null);
  };

  const handleWebViewMessage = ({ nativeEvent }: WebViewMessageEvent) => {
    try {
      const parsed: unknown = JSON.parse(nativeEvent.data);
      if (isCoordinates(parsed)) setDraft(parsed);
    } catch (error) {
      console.error('Não foi possível ler o ponto escolhido no mapa.', error);
    }
  };

  const save = () => {
    if (!draft) return;
    onChange(draft);
    setVisible(false);
  };

  return (
    <>
      <Pressable accessibilityRole="button" onPress={open} style={styles.openButton}>
        <MaterialCommunityIcons name={value ? 'map-marker-check-outline' : 'map-marker-plus-outline'} size={18} color={colors.primary} />
        <Text style={styles.openButtonText}>{value ? 'Alterar ponto no mapa' : 'Escolher ponto no mapa'}</Text>
      </Pressable>
      <Text style={styles.hint}>
        {value
          ? `Localização cadastrada: ${value.latitude.toFixed(5)}, ${value.longitude.toFixed(5)}`
          : 'Escolha o ponto fixo da sua área de atendimento. Ele será mostrado aos clientes; não usaremos seu GPS em tempo real.'}
      </Text>
      <Modal visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={styles.modal}>
          <View style={styles.heading}>
            <View style={styles.headingCopy}>
              <Text style={styles.title}>Local da área de atendimento</Text>
              <Text style={styles.subtitle}>Mova o mapa e toque no ponto onde você atende.</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar mapa" onPress={() => setVisible(false)} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={21} color={colors.primary} />
            </Pressable>
          </View>
          {Platform.OS === 'android' ? (
            <WebView
              key={`${center.latitude}:${center.longitude}`}
              source={mapSource}
              style={styles.map}
              originWhitelist={['*']}
              javaScriptEnabled
              domStorageEnabled
              onMessage={handleWebViewMessage}
              accessibilityLabel="Toque no mapa para escolher a localização cadastrada"
            />
          ) : Platform.OS === 'ios' ? (
            <MapView
              style={styles.map}
              initialRegion={region}
              onPress={(event: MapPressEvent) => setDraft(event.nativeEvent.coordinate)}
              accessibilityLabel="Toque no mapa para escolher a localização cadastrada"
            >
              {draft && <Marker coordinate={draft} />}
            </MapView>
          ) : (
            <View style={styles.webCoordinates}>
              <Text style={styles.webHint}>Informe as coordenadas do ponto escolhido para sua área de atendimento.</Text>
              <TextInput
                accessibilityLabel="Latitude"
                keyboardType="decimal-pad"
                placeholder="Latitude (ex.: -15.7942)"
                value={latitudeText}
                onChangeText={(latitude) => updateWebCoordinates(latitude, longitudeText)}
                style={styles.coordinateInput}
              />
              <TextInput
                accessibilityLabel="Longitude"
                keyboardType="decimal-pad"
                placeholder="Longitude (ex.: -47.8825)"
                value={longitudeText}
                onChangeText={(longitude) => updateWebCoordinates(latitudeText, longitude)}
                style={styles.coordinateInput}
              />
            </View>
          )}
          <View style={styles.footer}>
            {draft && <Text style={styles.coordinates}>{draft.latitude.toFixed(5)}, {draft.longitude.toFixed(5)}</Text>}
            <Pressable accessibilityRole="button" disabled={!draft || !isCoordinates(draft)} onPress={save} style={[styles.saveButton, (!draft || !isCoordinates(draft)) && styles.disabled]}>
              <Text style={styles.saveButtonText}>Salvar localização cadastrada</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  openButton: { minHeight: 45, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.surface },
  openButtonText: { color: theme.colors.primary, fontSize: 12, fontWeight: '700' },
  hint: { color: theme.colors.muted, fontSize: 10, lineHeight: 15, marginTop: 7, marginBottom: 13 },
  modal: { flex: 1, backgroundColor: theme.colors.background, paddingTop: Platform.OS === 'ios' ? 52 : 24 },
  heading: { minHeight: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10 },
  headingCopy: { flex: 1 },
  title: { color: theme.colors.text, fontSize: 17, fontWeight: '800' },
  subtitle: { color: theme.colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  closeButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  map: { flex: 1 },
  webCoordinates: { flex: 1, padding: 18, gap: 12, justifyContent: 'center' },
  webHint: { color: theme.colors.text, fontSize: 13, lineHeight: 19 },
  coordinateInput: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 12, color: theme.colors.text, backgroundColor: theme.colors.surface },
  footer: { padding: 14, gap: 8, backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.border },
  coordinates: { color: theme.colors.muted, fontSize: 11, textAlign: 'center' },
  saveButton: { minHeight: 48, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primaryDark },
  saveButtonText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  disabled: { opacity: 0.45 },
});
