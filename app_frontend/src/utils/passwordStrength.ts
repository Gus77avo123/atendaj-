export type PasswordStrength = {
  score: number;
  label: 'Fraca' | 'Média' | 'Forte';
};

export function getPasswordStrength(password: string): PasswordStrength {
  const score = [
    password.length >= 8,
    password.length >= 12,
    /[a-z]/.test(password) && /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  return {
    score,
    label: password.length < 8 || score <= 2
      ? 'Fraca'
      : score <= 3
        ? 'Média'
        : 'Forte',
  };
}
