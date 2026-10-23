import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { categories, isOtherServiceCategory, OTHER_CATEGORY, PhotoUploadMetadata, UserRole } from '../data/demo';
import { ProfileData } from '../context/AppContext';
import { colors, AppTheme, useAppTheme, useThemedStyles, themedColor } from '../theme';
import { maskCpfCnpj, maskPhoneNumber } from '../utils/inputMasks';
import { getPasswordStrength } from '../utils/passwordStrength';
import { ProfilePhotoPicker } from './ProfilePhotoPicker';
import { RegisteredLocationPicker } from './RegisteredLocationPicker';

export function ProfileFields({
  role,
  profile,
  onChange,
  includePassword = false,
  password = '',
  onPasswordChange,
}: {
  role: UserRole;
  profile: ProfileData;
  onChange: (profile: ProfileData, photo?: PhotoUploadMetadata) => void;
  includePassword?: boolean;
  password?: string;
  onPasswordChange?: (password: string) => void;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const isProfessional = role === 'professional';
  const isOtherCategory = isOtherServiceCategory(profile.category);
  const initials = profile.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase();
  const passwordStrength = getPasswordStrength(password);
  const passwordStrengthColor = passwordStrength.label === 'Forte'
    ? colors.green
    : passwordStrength.label === 'Média'
      ? colors.secondary
      : colors.red;

  const update = (key: keyof ProfileData, value: string | null) => onChange({
    ...profile,
    [key]: value,
    ...(key === 'serviceArea' && isProfessional ? { serviceLocation: null } : {}),
  });

  return (
    <>
      <ProfilePhotoPicker
        uri={profile.photoUri}
        onChange={(uri, photo) => onChange({ ...profile, photoUri: uri }, photo)}
        initials={initials}
      />
      <Field icon="account-outline" label="Nome completo">
        <TextInput
          accessibilityLabel="Nome completo"
          placeholder="Seu nome"
          autoCapitalize="words"
          value={profile.name}
          onChangeText={(value) => update('name', value)}
          style={styles.input}
          placeholderTextColor={colors.muted}
        />
      </Field>
      <Field icon="email-outline" label="E-mail">
        <TextInput
          accessibilityLabel="E-mail"
          placeholder="voce@email.com"
          autoCapitalize="none"
          keyboardType="email-address"
          value={profile.email}
          onChangeText={(value) => update('email', value)}
          style={styles.input}
          placeholderTextColor={colors.muted}
        />
      </Field>
      <Field icon="phone-outline" label="Telefone">
        <TextInput
          accessibilityLabel="Telefone"
          placeholder="(61) 99999-9999"
          keyboardType="phone-pad"
          value={maskPhoneNumber(profile.phone)}
          onChangeText={(value) => update('phone', maskPhoneNumber(value))}
          style={styles.input}
          placeholderTextColor={colors.muted}
        />
      </Field>

      <Field icon="card-account-details-outline" label={isProfessional ? 'CPF ou CNPJ (obrigatório)' : 'CPF (obrigatório)'}>
        <TextInput
          accessibilityLabel={isProfessional ? 'CPF ou CNPJ' : 'CPF'}
          placeholder={isProfessional ? '000.000.000-00 ou 00.000.000/0000-00' : '000.000.000-00'}
          keyboardType="numeric"
          value={maskCpfCnpj(profile.document, isProfessional)}
          onChangeText={(value) => update('document', maskCpfCnpj(value, isProfessional))}
          style={styles.input}
          placeholderTextColor={colors.muted}
        />
      </Field>

      {!isProfessional && (
        <>
          <Field icon="map-marker-outline" label="Endereço principal (obrigatório)">
            <TextInput
              accessibilityLabel="Endereço principal (obrigatório)"
              accessibilityHint="Informe rua, número, bairro e cidade. Este endereço será usado como referência nos pedidos."
              placeholder="Rua, número, bairro e cidade"
              autoCapitalize="words"
              value={profile.serviceArea}
              onChangeText={(value) => update('serviceArea', value)}
              style={styles.input}
              placeholderTextColor={colors.muted}
            />
          </Field>
          <Text style={styles.fieldHint}>Inclua rua, número, bairro e cidade. Você poderá informar outro endereço ao pedir um serviço.</Text>
        </>
      )}

      {isProfessional && (
        <>
          <Text style={styles.section}>Seu serviço</Text>
          <Text style={styles.label}>Categoria profissional</Text>
          <View style={styles.categories}>
            {categories.filter((item) => item.label !== 'Todos').map((item) => {
              const selected = item.label === OTHER_CATEGORY
                ? isOtherCategory
                : profile.category === item.label;
              return (
                <Pressable
                  key={item.label}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => update('category', item.label)}
                  style={[styles.category, selected && styles.categorySelected]}
                >
                  <MaterialCommunityIcons name={item.icon as keyof typeof MaterialCommunityIcons.glyphMap} size={15} color={selected ? '#fff' : colors.primary} />
                  <Text style={[styles.categoryText, selected && styles.categoryTextSelected]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
          {isOtherCategory && (
            <Field icon="text-box-outline" label="Qual serviço você oferece?">
              <TextInput
                accessibilityLabel="Descreva sua categoria profissional"
                placeholder="Ex.: Jardinagem, costura, aulas particulares"
                value={profile.category === OTHER_CATEGORY ? '' : profile.category}
                onChangeText={(value) => update('category', value || OTHER_CATEGORY)}
                style={styles.input}
                placeholderTextColor={colors.muted}
                maxLength={60}
              />
            </Field>
          )}
          <Field icon="text-box-outline" label="Descrição do serviço">
            <TextInput
              accessibilityLabel="Descrição do serviço"
              placeholder="Conte sobre sua experiência e os serviços que oferece"
              multiline
              value={profile.description}
              onChangeText={(value) => update('description', value)}
              style={[styles.input, styles.multiline]}
              placeholderTextColor={colors.muted}
              textAlignVertical="top"
            />
          </Field>
          <Field icon="map-marker-radius-outline" label="Área de atendimento">
            <TextInput
              accessibilityLabel="Área de atendimento"
              placeholder="Ex.: Centro, Campinas · até 10 km"
              value={profile.serviceArea}
              onChangeText={(value) => update('serviceArea', value)}
              style={styles.input}
              placeholderTextColor={colors.muted}
            />
          </Field>
          <RegisteredLocationPicker
            value={profile.serviceLocation}
            onChange={(serviceLocation) => onChange({ ...profile, serviceLocation })}
          />
        </>
      )}

      {includePassword && (
        <>
          <Field icon="lock-outline" label="Senha">
            <TextInput
              accessibilityLabel="Senha"
              placeholder="Pelo menos 8 caracteres"
              secureTextEntry
              value={password}
              onChangeText={onPasswordChange}
              style={styles.input}
              placeholderTextColor={colors.muted}
            />
          </Field>
          {!!password && (
            <View style={styles.passwordStrength}>
              <View style={styles.passwordStrengthHeading}>
                <Text style={styles.passwordStrengthLabel}>Força da senha</Text>
                <Text style={[styles.passwordStrengthValue, { color: passwordStrengthColor }]}>{passwordStrength.label}</Text>
              </View>
              <View
                accessibilityRole="progressbar"
                accessibilityLabel={`Força da senha: ${passwordStrength.label}`}
                accessibilityValue={{ min: 0, max: 5, now: passwordStrength.score }}
                style={styles.passwordStrengthBars}
              >
                {[1, 2, 3].map((segment) => (
                  <View
                    key={segment}
                    style={[
                      styles.passwordStrengthBar,
                      passwordStrength.score >= segment && { backgroundColor: passwordStrengthColor },
                    ]}
                  />
                ))}
              </View>
            </View>
          )}
          <Text style={styles.fieldHint}>Use pelo menos 8 caracteres e combine letras, números e símbolos para uma senha forte.</Text>
        </>
      )}
    </>
  );
}

function Field({ icon, label, children }: React.PropsWithChildren<{ icon: string; label: string }>) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.field}>
        <View style={styles.fieldIcon}>
          <MaterialCommunityIcons name={icon as keyof typeof MaterialCommunityIcons.glyphMap} size={18} color={colors.primary} />
        </View>
        {children}
      </View>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  section: { color: theme.colors.primaryDark, fontSize: 14, fontWeight: '800', marginTop: 8, marginBottom: 12 },
  fieldWrap: { marginBottom: 13 },
  fieldHint: { color: theme.colors.muted, fontSize: 11, lineHeight: 16, marginTop: -7, marginBottom: 13 },
  label: { color: theme.colors.text, fontSize: 11, fontWeight: '700', marginBottom: 6 },
  field: { minHeight: 49, borderRadius: 13, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  fieldIcon: { width: 42, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.palePurple },
  input: { flex: 1, minHeight: 47, paddingHorizontal: 12, paddingVertical: 10, color: theme.colors.text, fontSize: 12 },
  multiline: { minHeight: 91 },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14 },
  category: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 20, paddingHorizontal: 12, backgroundColor: theme.colors.surface },
  categorySelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  categoryText: { color: theme.colors.text, fontSize: 10, fontWeight: '600' },
  categoryTextSelected: { color: '#fff' },
  passwordStrength: { marginTop: -5, marginBottom: 11 },
  passwordStrengthHeading: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  passwordStrengthLabel: { color: theme.colors.muted, fontSize: 10, fontWeight: '600' },
  passwordStrengthValue: { fontSize: 10, fontWeight: '700' },
  passwordStrengthBars: { flexDirection: 'row', gap: 5 },
  passwordStrengthBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: theme.colors.border },
});
