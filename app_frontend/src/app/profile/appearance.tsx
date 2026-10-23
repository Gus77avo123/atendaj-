import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { AppearanceMode, AppTheme, useAppTheme, useThemedStyles } from '../../theme';

const choices: { mode: AppearanceMode; title: string; description: string; icon: string }[] = [
  { mode: 'system', title: 'Padrão do dispositivo', description: 'Acompanha a aparência configurada no sistema.', icon: 'cellphone-cog' },
  { mode: 'light', title: 'Claro', description: 'Use sempre a aparência clara.', icon: 'white-balance-sunny' },
  { mode: 'dark', title: 'Escuro', description: 'Use sempre a aparência escura.', icon: 'moon-waning-crescent' },
];

export default function AppearanceScreen() {
  const { colors, mode, setMode, storageError } = useAppTheme();
  const styles = useThemedStyles(createStyles);

  const selectMode = async (nextMode: AppearanceMode) => {
    try {
      await setMode(nextMode);
    } catch (error) {
      Alert.alert('Não foi possível salvar a aparência', error instanceof Error ? error.message : 'Tente novamente.');
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Aparência</Text>
      <Text style={styles.subtitle}>Escolha como o Atende Já será exibido em todas as telas.</Text>
      {!!storageError && <Text accessibilityRole="alert" style={styles.storageError}>{storageError}</Text>}
      <View style={styles.card}>
        {choices.map((choice, index) => {
          const selected = mode === choice.mode;
          return (
            <Pressable
              key={choice.mode}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => void selectMode(choice.mode)}
              style={[styles.option, index > 0 && styles.optionBorder]}
            >
              <View style={styles.icon}><MaterialCommunityIcons name={choice.icon as keyof typeof MaterialCommunityIcons.glyphMap} size={20} color={colors.primary} /></View>
              <View style={styles.copy}>
                <Text style={styles.optionTitle}>{choice.title}</Text>
                <Text style={styles.description}>{choice.description}</Text>
              </View>
              <MaterialCommunityIcons
                name={selected ? 'radiobox-marked' : 'radiobox-blank'}
                size={21}
                color={selected ? colors.primary : colors.muted}
              />
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  title: { color: theme.colors.text, fontSize: 24, fontWeight: '800', marginTop: 8 },
  subtitle: { color: theme.colors.muted, fontSize: 13, lineHeight: 19, marginTop: 5, marginBottom: 18 },
  card: { ...theme.shadow, backgroundColor: theme.colors.surface, borderRadius: 18, paddingHorizontal: 15 },
  option: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionBorder: { borderTopWidth: 1, borderTopColor: theme.colors.border },
  icon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: theme.colors.paleBlue },
  copy: { flex: 1, gap: 3 },
  optionTitle: { color: theme.colors.text, fontSize: 13, fontWeight: '700' },
  description: { color: theme.colors.muted, fontSize: 11, lineHeight: 15 },
  storageError: { color: theme.colors.red, fontSize: 12, lineHeight: 17, marginBottom: 12 },
});
