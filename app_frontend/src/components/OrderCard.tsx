import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ServiceOrder } from '../data/demo';
import { colors, shadow, AppTheme, useAppTheme, useThemedStyles, themedColor } from '../theme';
import { Avatar } from './Avatar';

export function OrderCard({
  order,
  onPress,
  counterpartName,
  counterpartPhotoUri,
}: {
  order: ServiceOrder;
  onPress: () => void;
  counterpartName: string;
  counterpartPhotoUri?: string | null;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const statusInfo = {
    pending: { label: 'Aguardando', color: colors.yellow, background: colors.paleYellow },
    accepted: { label: 'Aceito', color: colors.primaryDark, background: colors.paleBlue },
    in_progress: { label: 'Em andamento', color: colors.teal, background: colors.paleTeal },
    done: { label: 'Concluído', color: colors.green, background: colors.paleGreen },
    cancelled: { label: 'Cancelado', color: colors.red, background: colors.paleRed },
  };
  const status = statusInfo[order.status];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Pedido ${order.title}, situação: ${status.label}${order.unread ? `, ${order.unread} mensagens não lidas` : ''}. Abrir detalhes`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.header}>
        <Avatar initials={counterpartName.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase() || 'AJ'} size={42} uri={counterpartPhotoUri} />
        <View style={styles.headingCopy}>
          <Text style={styles.counterpart} numberOfLines={1}>{counterpartName}</Text>
          <View style={styles.top}>
            <Text style={styles.title} numberOfLines={1}>{order.title}</Text>
            <View style={[styles.badge, { backgroundColor: status.background }]}>
              <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>
        </View>
      </View>
      <Text style={styles.description} numberOfLines={2}>{order.description}</Text>
      <View style={styles.bottom}>
        <Text style={styles.date}>{order.createdAt} · #{order.id}</Text>
        <Text style={styles.date}>Valor a combinar</Text>
      </View>
      {!!order.updatedAt && order.updatedAt !== order.createdAt && <Text style={styles.updated}>Atualizado em {order.updatedAt}</Text>}
      {!!order.unread && <View style={styles.unread}><Text style={styles.unreadText}>{order.unread}</Text></View>}
    </Pressable>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  card: { ...theme.shadow, backgroundColor: theme.colors.surface, borderRadius: 18, padding: 16, marginBottom: 12, gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  headingCopy: { flex: 1, gap: 4 },
  counterpart: { color: theme.colors.muted, fontSize: 10, fontWeight: '700' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { flex: 1, color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  description: { color: theme.colors.muted, fontSize: 13, lineHeight: 19 },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { color: theme.colors.muted, fontSize: 11 },
  updated: { color: theme.colors.muted, fontSize: 10 },
  unread: { position: 'absolute', top: -5, right: -5, width: 20, height: 20, borderRadius: 10, backgroundColor: theme.colors.secondary, alignItems: 'center', justifyContent: 'center' },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '800' },
});
