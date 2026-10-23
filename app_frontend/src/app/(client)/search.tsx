import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Screen } from '../../components/Screen';
import { ProfessionalCard } from '../../components/ProfessionalCard';
import { Avatar } from '../../components/Avatar';
import { categories, matchesServiceCategory, Professional } from '../../data/demo';
import { useApp } from '../../context/AppContext';
import { colors, shadow, AppTheme, useAppTheme, useThemedStyles, themedColor } from '../../theme';
import { normalizeSearchText } from '../../utils/textUtils';

const categoryColors = [colors.primary, '#C18A12', colors.green, colors.secondary, colors.purple, colors.teal];

export default function HomeScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { professionals, professionalsLoaded, professionalsError, isAuthenticated, profile, refreshProfessionals } = useApp();
  const firstName = profile.name.trim().split(/\s+/)[0];
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todos');
  const [minimumRating, setMinimumRating] = useState(0);
  const filtered = useMemo(() => professionals.filter((item) =>
    item.available &&
    matchesServiceCategory(item.category, category) &&
    (minimumRating === 0 || item.rating >= minimumRating) &&
    normalizeSearchText(`${item.name} ${item.category}`).includes(normalizeSearchText(query)),
  ), [professionals, category, minimumRating, query]);

  const chooseCategory = (label: string) => {
    Haptics.selectionAsync();
    setCategory(label);
    router.push({ pathname: '/(client)/radar', params: { search: query.trim(), category: label } });
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.brandPill}>
            <Image source={require('../../../assets/atende-ja-logo.png')} style={styles.brandLogo} />
            <View>
              <Text style={styles.brand}>ATENDEJÁ</Text>
              <Text style={styles.location}>PROFISSIONAIS NA SUA REGIÃO</Text>
            </View>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={isAuthenticated ? 'Meu perfil' : 'Entrar ou cadastrar'} onPress={() => router.push(isAuthenticated ? '/(client)/profile' : '/')} style={styles.profileButton}>
            {isAuthenticated
              ? <Avatar initials={firstName?.[0]?.toUpperCase() ?? 'P'} size={37} color="#704AC8" uri={profile.photoUri} />
              : <Text style={styles.profileInitial}>V</Text>}
          </Pressable>
        </View>

        {!!professionalsError && <Pressable accessibilityRole="button" accessibilityLabel="Tentar carregar profissionais novamente" onPress={() => void refreshProfessionals()} style={styles.loadError}>
          <MaterialCommunityIcons name="alert-circle-outline" size={17} color={colors.red} />
          <Text style={styles.loadErrorText}>{professionalsError} · Tocar para tentar novamente.</Text>
        </Pressable>}

        <Text style={styles.greeting}>{firstName ? `OLÁ, ${firstName.toUpperCase()}` : 'OLÁ, CLIENTE'}</Text>
        <Text style={styles.heroTitle}>O que você precisa{'\n'}hoje?</Text>
        <Text style={styles.heroSub}>Encontre bons profissionais na sua região.</Text>
        <View style={styles.searchBox}>
          <TextInput
            accessibilityLabel="Buscar profissionais por nome ou serviço"
            placeholder="Fretes, elétrica, limpeza..."
            value={query}
            onChangeText={setQuery}
            placeholderTextColor="#A7B9D0"
            style={styles.searchInput}
            returnKeyType="search"
            onSubmitEditing={() => router.push({ pathname: '/(client)/radar', params: { search: query.trim(), category } })}
          />
          {!!query && (
            <Pressable onPress={() => setQuery('')} accessibilityLabel="Limpar busca" style={styles.clearSearch}>
              <MaterialCommunityIcons name="close" size={16} color={colors.muted} />
            </Pressable>
          )}
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/(client)/radar', params: { search: query.trim(), category } })} accessibilityLabel="Ver profissionais no radar" style={styles.searchButton}>
            <MaterialCommunityIcons name="magnify" size={21} color={colors.primaryDark} />
          </Pressable>
        </View>
      </View>

      <View style={styles.sectionHeading}>
        <View>
          <Text style={styles.sectionTitle}>O que você procura?</Text>
          <Text style={styles.sectionSubtitle}>{isAuthenticated ? 'Escolha uma categoria para começar' : 'Visualize categorias e profissionais disponíveis'}</Text>
        </View>
        {category !== 'Todos' && (
          <Pressable accessibilityRole="button" onPress={() => setCategory('Todos')}><Text style={styles.seeAll}>Ver todas</Text></Pressable>
        )}
      </View>

      <View style={styles.categoryGrid}>
        {categories.filter((item) => item.label !== 'Todos').map((item, index) => (
          <Pressable
            key={item.label}
            accessibilityRole="button"
            accessibilityLabel={`Categoria ${item.label}`}
            accessibilityState={{ selected: category === item.label }}
            onPress={() => chooseCategory(item.label)}
            style={({ pressed }) => [
              styles.categoryCard,
              category === item.label && styles.categoryCardSelected,
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.categoryIcon, { backgroundColor: categoryColors[index % categoryColors.length] }]}>
              <MaterialCommunityIcons
                name={item.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                size={23}
                color="#fff"
              />
            </View>
            <Text style={styles.categoryName}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.quickCard}>
        <Text style={styles.sectionTitle}>Ações rápidas</Text>
        <Text style={styles.sectionSubtitle}>{isAuthenticated ? 'Acesse as ferramentas do Atende Já.' : 'Explore o Radar ou entre para acessar os demais recursos.'}</Text>
        <View style={styles.quickActions}>
          <Pressable accessibilityRole="button" onPress={() => router.push('/(client)/radar')} style={styles.quickAction}>
            <View style={styles.quickIcon}><MaterialCommunityIcons name="map-marker-radius-outline" size={19} color={colors.primary} /></View>
            <Text style={styles.quickText}>Ver radar</Text>
            <MaterialCommunityIcons name="chevron-right" size={17} color={colors.muted} />
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push(isAuthenticated ? '/(client)/orders' : '/')} style={styles.quickAction}>
            <View style={[styles.quickIcon, styles.quickIconOrange]}><MaterialCommunityIcons name={isAuthenticated ? 'clipboard-text-outline' : 'account-plus-outline'} size={18} color={colors.secondary} /></View>
            <Text style={styles.quickText}>{isAuthenticated ? 'Meus pedidos' : 'Entrar ou cadastrar'}</Text>
            <MaterialCommunityIcons name="chevron-right" size={17} color={colors.muted} />
          </Pressable>
        </View>
      </View>

      <View style={styles.resultsHeader}>
        <View>
          <Text style={styles.sectionTitle}>{query || category !== 'Todos' ? 'Profissionais encontrados' : 'Profissionais por perto'}</Text>
          <Text accessibilityLiveRegion="polite" style={styles.sectionSubtitle}>{!professionalsLoaded ? 'Carregando profissionais…' : professionalsError ? 'Não foi possível carregar os profissionais.' : `${filtered.length} disponíveis agora`}</Text>
        </View>
          <Pressable
          accessibilityRole="button"
          accessibilityLabel="Filtrar profissionais com avaliação 4,8 ou superior"
          accessibilityState={{ selected: minimumRating > 0 }}
          onPress={() => setMinimumRating(minimumRating === 4.8 ? 0 : 4.8)}
          style={[styles.ratingFilter, minimumRating > 0 && styles.ratingFilterActive]}
        >
          <MaterialCommunityIcons name="star" size={13} color={minimumRating > 0 ? '#fff' : '#DEA816'} />
          <Text style={[styles.ratingFilterText, minimumRating > 0 && styles.ratingFilterTextActive]}>
            {minimumRating ? '4.8+ ativo' : '4.8+'}
          </Text>
        </Pressable>
      </View>

      {!professionalsLoaded && <Text accessibilityLiveRegion="polite" style={styles.sectionSubtitle}>Carregando profissionais…</Text>}
      {filtered.map((professional: Professional) => (
        <ProfessionalCard
          key={professional.id}
          professional={professional}
          onPress={() => router.push(`/professional/${professional.id}`)}
        />
      ))}
      {professionalsLoaded && !professionalsError && !filtered.length && (
        <View style={styles.empty}>
          <MaterialCommunityIcons name={professionals.length ? 'account-search-outline' : 'account-group-outline'} size={34} color="#AAB7C2" />
          <Text style={styles.emptyTitle}>{professionals.length ? 'Nenhum profissional encontrado' : 'Ainda não há profissionais disponíveis'}</Text>
          <Text style={styles.sectionSubtitle}>{professionals.length ? 'Tente outro termo ou remova os filtros para ampliar a busca.' : 'Novos profissionais aparecerão aqui quando estiverem disponíveis.'}</Text>
          {!!professionals.length && (query || category !== 'Todos' || minimumRating > 0) && (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setQuery('');
                setCategory('Todos');
                setMinimumRating(0);
              }}
              style={styles.clearFilters}
            >
              <Text style={styles.clearFiltersText}>Limpar busca e filtros</Text>
            </Pressable>
          )}
        </View>
      )}
    </Screen>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  hero: {
    marginHorizontal: -20, marginTop: -12, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 19,
    backgroundColor: theme.colors.primaryDark, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, ...theme.shadow,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandPill: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: theme.colors.surface, borderRadius: 15, padding: 7, paddingRight: 13 },
  brandLogo: { width: 38, height: 38, borderRadius: 11 },
  brand: { color: theme.colors.primaryDark, fontSize: 12, fontWeight: '900', letterSpacing: 0.4 },
  location: { color: themedColor('#8B9EB8', theme), fontSize: 8, fontWeight: '800', letterSpacing: 1.2, marginTop: 3 },
  profileButton: { width: 41, height: 41, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.purple, borderWidth: 2, borderColor: theme.colors.surface },
  profileInitial: { color: '#fff', fontSize: 15, fontWeight: '800' },
  greeting: { color: themedColor('#C8D8EA', theme), fontSize: 10, letterSpacing: 1.8, fontWeight: '800', textAlign: 'center', marginTop: 18 },
  heroTitle: { color: '#fff', fontSize: 26, fontWeight: '900', lineHeight: 31, letterSpacing: -0.4, textAlign: 'center', marginTop: 6 },
  heroSub: { color: themedColor('#C8D8EA', theme), fontSize: 11, textAlign: 'center', marginTop: 7, marginBottom: 16 },
  searchBox: { height: 48, borderRadius: 25, paddingLeft: 14, paddingRight: 5, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface },
  searchInput: { flex: 1, color: theme.colors.text, fontSize: 13, paddingVertical: 0 },
  clearSearch: { width: 30, height: 36, alignItems: 'center', justifyContent: 'center' },
  searchButton: { width: 38, height: 38, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.paleBlue },
  sectionHeading: { marginTop: 20, marginBottom: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: theme.colors.primaryDark, fontSize: 14, fontWeight: '800' },
  sectionSubtitle: { color: theme.colors.muted, fontSize: 10, lineHeight: 15, marginTop: 4 },
  seeAll: { color: theme.colors.primary, fontSize: 10, fontWeight: '700' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  categoryCard: {
    ...theme.shadow, width: '48.5%', minHeight: 107, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: themedColor('#E8EDF4', theme),
  },
  categoryCardSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.paleBlue },
  categoryIcon: { width: 45, height: 45, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  categoryName: { color: theme.colors.primaryDark, fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  quickCard: { ...theme.shadow, marginTop: 16, backgroundColor: theme.colors.surface, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: themedColor('#E8EDF4', theme) },
  quickActions: { marginTop: 10 },
  quickAction: { minHeight: 43, flexDirection: 'row', alignItems: 'center', gap: 9, borderTopWidth: 1, borderTopColor: themedColor('#F0F3F7', theme) },
  quickIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: theme.colors.paleBlue, alignItems: 'center', justifyContent: 'center' },
  quickIconOrange: { backgroundColor: theme.colors.paleOrange },
  quickText: { flex: 1, color: theme.colors.text, fontSize: 11, fontWeight: '700' },
  resultsHeader: { marginTop: 21, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ratingFilter: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.surface, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: theme.colors.border },
  ratingFilterActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  ratingFilterText: { color: theme.colors.primaryDark, fontSize: 10, fontWeight: '700' },
  ratingFilterTextActive: { color: '#fff' },
  empty: { alignItems: 'center', paddingVertical: 35, gap: 8 },
  loadError: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, borderRadius: 12, padding: 11, backgroundColor: theme.colors.paleRed },
  loadErrorText: { flex: 1, color: theme.colors.red, fontSize: 10, lineHeight: 15 },
  emptyTitle: { color: theme.colors.text, fontWeight: '700', fontSize: 13, marginTop: 4 },
  clearFilters: { minHeight: 42, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 13, borderWidth: 1, borderColor: theme.colors.primary, marginTop: 7 },
  clearFiltersText: { color: theme.colors.primary, fontWeight: '700', fontSize: 11, textAlign: 'center' },
  pressed: { opacity: 0.86, transform: [{ scale: 0.98 }] },
});
