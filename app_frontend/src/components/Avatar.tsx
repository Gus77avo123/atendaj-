import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, AppTheme, useAppTheme, useThemedStyles, themedColor } from '../theme';

export function Avatar({ initials, size = 52, color, uri }: { initials: string; size?: number; color?: string; uri?: string | null }) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: color ?? colors.paleBlue }]}>
      {uri
        ? <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
        : <Text style={[styles.initials, { fontSize: size * 0.32 }]}>{initials}</Text>}
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
  initials: { color: theme.colors.primaryDark, fontWeight: '800' },
});
