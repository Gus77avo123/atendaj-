import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, shadow, AppTheme, useAppTheme, useThemedStyles, themedColor } from '../theme';

export type ProfileTab = 'summary' | 'security';

export function ProfileTabs({ active, onChange }: { active: ProfileTab; onChange: (tab: ProfileTab) => void }) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.tabs}>
      {([['summary', 'Resumo'], ['security', 'Segurança']] as const).map(([tab, label]) => (
        <Pressable
          key={tab}
          accessibilityRole="tab"
          accessibilityState={{ selected: active === tab }}
          onPress={() => onChange(tab)}
          style={[styles.tab, active === tab && styles.activeTab]}
        >
          <Text style={[styles.tabText, active === tab && styles.activeTabText]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function ProfileSecurityPanel({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const requireAccount = (action: () => void) => {
    if (!isAuthenticated) {
      router.push('/');
      return;
    }
    action();
  };

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Segurança</Text>
      <Text style={styles.subtitle}>Ajustes de conta, proteção e ocorrências.</Text>
      <SecurityRow
        title="Troca de senha"
        description="Atualize sua senha sempre que precisar reforçar a segurança."
        onPress={() => requireAccount(() => router.push('/profile/change-password'))}
      />
      <SecurityRow
        title="Ocorrências"
        description="Abra um registro quando houver problema em uma contratação."
        onPress={() => requireAccount(() => router.push('/profile/support?type=incident'))}
      />
      <SecurityRow
        title="Dispositivos"
        description="Veja onde sua conta está conectada e encerre sessões antigas."
        onPress={() => requireAccount(() => router.push('/profile/devices'))}
        last
      />
      {!isAuthenticated && <Text style={styles.guestNote}>Crie uma conta para acessar as opções de segurança.</Text>}
    </View>
  );
}

function SecurityRow({ title, description, onPress, status, last = false }: { title: string; description: string; onPress?: () => void; status?: string; last?: boolean }) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const content = <>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
      </View>
      {status ? <Text style={styles.rowStatus}>{status}</Text> : null}
      {onPress ? <MaterialCommunityIcons name="chevron-right" size={19} color={colors.muted} /> : null}
    </>;
  return onPress
    ? <Pressable accessibilityRole="button" onPress={onPress} style={[styles.row, last && styles.lastRow]}>{content}</Pressable>
    : <View accessibilityLabel={`${title}, ${status ?? 'indisponível'}`} style={[styles.row, last && styles.lastRow]}>{content}</View>;
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  tabs: { ...theme.shadow, backgroundColor: theme.colors.surface, borderRadius: 25, padding: 4, flexDirection: 'row', marginTop: 14, marginBottom: 16 },
  tab: { flex: 1, minHeight: 43, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  activeTab: { backgroundColor: theme.colors.paleBlue },
  tabText: { color: themedColor('#9AA8BA', theme), fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  activeTabText: { color: theme.colors.primaryDark },
  card: { ...theme.shadow, backgroundColor: theme.colors.surface, borderRadius: 23, paddingHorizontal: 18, paddingTop: 20, paddingBottom: 8 },
  heading: { color: theme.colors.text, fontSize: 23, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { color: theme.colors.muted, fontSize: 13, lineHeight: 19, marginTop: 5, marginBottom: 15 },
  row: { minHeight: 75, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingVertical: 11 },
  lastRow: { borderBottomWidth: 0 },
  rowCopy: { flex: 1, gap: 4 },
  rowTitle: { color: theme.colors.primaryDark, fontSize: 13, fontWeight: '800' },
  rowDescription: { color: theme.colors.muted, fontSize: 12, lineHeight: 18 },
  rowStatus: { color: theme.colors.muted, fontSize: 10, fontWeight: '700' },
  guestNote: { color: theme.colors.muted, fontSize: 11, textAlign: 'center', marginTop: 5, marginBottom: 12 },
});
