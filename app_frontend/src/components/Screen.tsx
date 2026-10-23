import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, AppTheme, useAppTheme, useThemedStyles, themedColor } from '../theme';

export function Screen({ children, scroll = true }: React.PropsWithChildren<{ scroll?: boolean }>) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {scroll ? <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>{children}</ScrollView> : <View style={styles.content}>{children}</View>}
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 26, flexGrow: 1 },
});
