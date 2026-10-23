import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Professional } from '../data/demo';
import { colors, shadow, AppTheme, useAppTheme, useThemedStyles, themedColor } from '../theme';
import { Avatar } from './Avatar';

export function ProfessionalCard({
  professional,
  onPress,
  action,
}: {
  professional: Professional;
  onPress?: () => void;
  action?: React.ReactNode;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const content = (
    <>
      <Avatar initials={professional.initials} color={professional.color} size={58} uri={professional.photoUri} />
      <View style={styles.details}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{professional.name}</Text>
          <Text style={styles.rating}>★ {professional.rating.toFixed(1)}</Text>
        </View>
        <Text style={styles.category}>{professional.category} · {professional.reviews} avaliações</Text>
        <Text style={styles.meta}>{professional.distance > 0 ? `${professional.distance.toFixed(1)} km · ` : ''}disponível para contato</Text>
      </View>
      {action}
    </>
  );

  const accessibilityLabel = `${professional.name}, ${professional.category}, avaliação ${professional.rating.toFixed(1)} de 5 com ${professional.reviews} avaliações${professional.distance > 0 ? `, a ${professional.distance.toFixed(1)} quilômetros` : ''}`;
  if (!onPress) return <View accessibilityLabel={accessibilityLabel} style={styles.card}>{content}</View>;
  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={`${accessibilityLabel}. Abrir perfil`}
    onPress={onPress}
    style={({ pressed }) => [styles.card, pressed && styles.pressed]}
  >{content}</Pressable>;
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  card: {
    ...theme.shadow, backgroundColor: theme.colors.surface, borderRadius: 18, padding: 14, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  details: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 4 },
  name: { fontSize: 15, fontWeight: '700', color: theme.colors.text, flexShrink: 1 },
  rating: { color: themedColor('#AA7410', theme), fontSize: 12, fontWeight: '700' },
  category: { color: theme.colors.muted, fontSize: 12 },
  meta: { color: theme.colors.primaryDark, fontSize: 12, fontWeight: '600' },
});
