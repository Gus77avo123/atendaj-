import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Professional } from '../data/demo';
import { Coordinates } from '../hooks/useCurrentLocation';
import { colors, AppTheme, useAppTheme, useThemedStyles, themedColor } from '../theme';

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
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const mapDelta = 0.07 / 2;
  const radiusPercent = Math.min(175, (2 * radiusKm / 111 / mapDelta) * 100);
  const zoomScale = 1.35 ** (zoomLevel - 1);
  return (
    <View style={styles.map} accessibilityLabel={`Mapa demonstrativo centrado em ${center.latitude.toFixed(3)}, ${center.longitude.toFixed(3)}`}>
      <View style={[styles.mapContents, { transform: [{ scale: zoomScale }] }]}>
        <View style={[styles.road, styles.roadOne]} />
        <View style={[styles.road, styles.roadTwo]} />
        <View style={[styles.road, styles.roadThree]} />
        <View style={[styles.road, styles.roadFour]} />
        <View style={[styles.searchArea, { width: `${radiusPercent}%` as `${number}%`, aspectRatio: 1 }]} />
        <Text style={styles.neighborhood}>JARDINS</Text>
        <Text style={[styles.neighborhood, styles.neighborhoodTwo]}>PINHEIROS</Text>
        <View style={styles.you}><View style={styles.youDot} /></View>
        {professionals.filter((professional): professional is Professional & { latitude: number; longitude: number } =>
          professional.latitude !== null && professional.longitude !== null &&
          Number.isFinite(professional.latitude) && Number.isFinite(professional.longitude)).map((professional) => {
          const markerStyle = [
            styles.marker,
            !professional.available && styles.markerOffline,
            {
              top: `${Math.max(8, Math.min(88, 50 - ((professional.latitude - center.latitude) / mapDelta) * 50))}%` as `${number}%`,
              left: `${Math.max(8, Math.min(88, 50 + ((professional.longitude - center.longitude) / mapDelta) * 50))}%` as `${number}%`,
            },
          ];
          const marker = (
            <View style={styles.markerContents}>
              <View style={[styles.avatarBubble, { backgroundColor: professional.color }]}>
                {professional.photoUri
                  ? <Image source={{ uri: professional.photoUri }} style={styles.avatarImage} />
                  : <Text style={styles.avatarInitials}>{professional.initials}</Text>}
              </View>
              <View style={[styles.statusDot, professional.available ? styles.statusDotOnline : styles.statusDotOffline]} />
            </View>
          );
          const accessibilityLabel = `${professional.name}, ${professional.category}, ${professional.available ? 'online' : 'offline'}. Selecionar profissional`;
          return interactive
            ? <Pressable
              key={professional.id}
              accessibilityRole="button"
              accessibilityLabel={accessibilityLabel}
              onPress={() => onSelect(professional)}
              style={markerStyle}
            >{marker}</Pressable>
            : <View key={professional.id} accessibilityLabel={accessibilityLabel} style={markerStyle}>{marker}</View>;
        })}
      </View>
      <View style={styles.webTag}><Text style={styles.webTagText}>{source === 'device' ? 'LOCALIZAÇÃO DO DISPOSITIVO' : 'MAPA DE DEMONSTRAÇÃO'}</Text></View>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  map: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden', backgroundColor: themedColor('#E8EFE8', theme) },
  mapContents: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, transformOrigin: 'center' },
  road: { position: 'absolute', backgroundColor: themedColor('#FAFCF9', theme), borderColor: themedColor('#DCE6DF', theme), borderWidth: 1 },
  roadOne: { width: '130%', height: 28, left: '-12%', top: '38%', transform: [{ rotate: '-17deg' }] },
  roadTwo: { width: '130%', height: 19, left: '-15%', top: '70%', transform: [{ rotate: '24deg' }] },
  roadThree: { width: 24, height: '130%', left: '35%', top: '-12%', transform: [{ rotate: '-24deg' }] },
  roadFour: { width: 19, height: '130%', left: '73%', top: '-12%', transform: [{ rotate: '18deg' }] },
  neighborhood: { position: 'absolute', top: '27%', left: '17%', fontSize: 10, color: themedColor('#9AA99C', theme), letterSpacing: 2, fontWeight: '700' },
  neighborhoodTwo: { top: '77%', left: '52%' },
  you: { position: 'absolute', top: '49%', left: '48%', width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(30,136,229,0.18)', alignItems: 'center', justifyContent: 'center' },
  searchArea: { position: 'absolute', top: '50%', left: '50%', borderRadius: 9999, borderWidth: 1, borderColor: 'rgba(30,136,229,0.38)', backgroundColor: 'rgba(30,136,229,0.08)', transform: [{ translateX: '-50%' }, { translateY: '-50%' }] },
  youDot: { width: 13, height: 13, borderRadius: 7, backgroundColor: theme.colors.primary, borderWidth: 2, borderColor: theme.colors.surface },
  marker: { position: 'absolute', width: 50, height: 50, borderRadius: 25, padding: 0, alignItems: 'center', justifyContent: 'center', elevation: 4, transform: [{ translateX: '-50%' }, { translateY: '-50%' }] },
  markerContents: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  markerOffline: { opacity: 0.92 },
  avatarBubble: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: theme.colors.surface, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.24, shadowRadius: 7, shadowOffset: { width: 0, height: 3 } },
  avatarImage: { width: 46, height: 46, borderRadius: 23 },
  avatarInitials: { color: theme.colors.primaryDark, fontSize: 10, fontWeight: '800' },
  statusDot: { position: 'absolute', right: 2, bottom: 2, width: 13, height: 13, borderRadius: 7, borderWidth: 2, borderColor: theme.colors.surface },
  statusDotOnline: { backgroundColor: '#20A464' },
  statusDotOffline: { backgroundColor: themedColor('#7B8792', theme) },
  webTag: { position: 'absolute', bottom: 18, left: 16, borderRadius: 9, backgroundColor: theme.colors.surface, paddingHorizontal: 9, paddingVertical: 5 },
  webTagText: { color: theme.colors.muted, fontSize: 8, fontWeight: '700', letterSpacing: 0.6 },
});
