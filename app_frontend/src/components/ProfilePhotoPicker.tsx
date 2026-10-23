import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Alert, Image, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { PhotoUploadMetadata } from '../data/demo';
import { colors, shadow, AppTheme, useAppTheme, useThemedStyles, themedColor } from '../theme';

export function ProfilePhotoPicker({
  uri,
  onChange,
  initials,
  size = 94,
}: {
  uri: string | null;
  onChange: (uri: string, photo: PhotoUploadMetadata) => void;
  initials: string;
  size?: number;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [loading, setLoading] = useState(false);
  const [optionsVisible, setOptionsVisible] = useState(false);

  const showMessage = (title: string, message: string) => {
    if (Platform.OS === 'web') globalThis.alert(`${title}\n\n${message}`);
    else Alert.alert(title, message);
  };

  const selectPhoto = async (source: 'camera' | 'library') => {
    setOptionsVisible(false);
    setLoading(true);
    try {
      const permission = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showMessage(
          'Permissão necessária',
          source === 'camera'
            ? 'Permita o acesso à câmera para tirar uma foto de perfil.'
            : 'Permita o acesso às fotos para escolher uma imagem de perfil.',
        );
        return;
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      };
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      const asset = result.canceled ? undefined : result.assets?.[0];
      if (!result.canceled && asset?.uri) {
        onChange(asset.uri, { fileName: asset.fileName, mimeType: asset.mimeType });
      }
    } catch (error) {
      console.warn(source === 'camera' ? 'Não foi possível abrir a câmera.' : 'Não foi possível abrir a galeria de fotos.', error);
      showMessage(
        source === 'camera' ? 'Erro ao abrir a câmera' : 'Erro ao abrir fotos',
        'Tente novamente em instantes.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, size < 94 && styles.compactContainer]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Adicionar ou trocar foto de perfil" accessibilityState={{ disabled: loading }} disabled={loading} onPress={() => setOptionsVisible(true)} style={({ pressed }) => [styles.photoButton, { width: size, height: size, borderRadius: size / 2 }, pressed && styles.pressed, loading && styles.disabled]}>
        {uri
          ? <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
          : <View style={[styles.placeholder, { borderRadius: size / 2 }]}><Text style={[styles.initials, { fontSize: size * 0.29 }]}>{initials || 'AJ'}</Text></View>}
        <View style={[styles.camera, { width: Math.max(26, size * 0.34), height: Math.max(26, size * 0.34), borderRadius: size / 2 }]}><MaterialCommunityIcons name={loading ? 'loading' : 'camera'} size={16} color="#fff" /></View>
      </Pressable>
      <Text accessibilityLiveRegion="polite" style={[styles.hint, size < 94 && styles.compactHint]}>{loading ? 'Abrindo...' : uri ? 'Toque para trocar a foto' : 'Adicionar foto de perfil'}</Text>
      <Modal visible={optionsVisible} transparent animationType="fade" onRequestClose={() => setOptionsVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOptionsVisible(false)}>
          <Pressable accessibilityRole="none" onPress={(event) => event.stopPropagation()} style={styles.options}>
            <Text style={styles.optionsTitle}>{uri ? 'Alterar foto de perfil' : 'Adicionar foto de perfil'}</Text>
            <Pressable accessibilityRole="button" onPress={() => void selectPhoto('camera')} style={styles.option}>
              <MaterialCommunityIcons name="camera-outline" size={20} color={colors.primary} />
              <Text style={styles.optionText}>Tirar foto</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => void selectPhoto('library')} style={styles.option}>
              <MaterialCommunityIcons name="image-multiple-outline" size={20} color={colors.primary} />
              <Text style={styles.optionText}>Escolher da galeria</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setOptionsVisible(false)} style={styles.cancel}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { alignItems: 'center', marginBottom: 20 },
  compactContainer: { marginBottom: 0 },
  photoButton: { position: 'relative', backgroundColor: theme.colors.paleBlue, ...theme.shadow },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.paleBlue },
  initials: { color: theme.colors.primaryDark, fontWeight: '800' },
  camera: { position: 'absolute', right: 0, bottom: 0, borderWidth: 2, borderColor: theme.colors.surface, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  hint: { color: theme.colors.primary, fontSize: 11, fontWeight: '700', marginTop: 9 },
  compactHint: { fontSize: 8, marginTop: 4 },
  backdrop: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#0008' },
  options: { borderRadius: 18, padding: 18, backgroundColor: theme.colors.surface, ...theme.shadow },
  optionsTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '800', marginBottom: 10 },
  option: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 },
  optionText: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
  cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  cancelText: { color: theme.colors.muted, fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.65 },
});
