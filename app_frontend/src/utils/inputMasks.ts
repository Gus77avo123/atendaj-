export function maskPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;

  const areaCode = digits.slice(0, 2);
  const number = digits.slice(2);
  const prefixLength = digits.length > 10 ? 5 : 4;
  const prefix = number.slice(0, prefixLength);
  const suffix = number.slice(prefixLength);
  return `(${areaCode}) ${prefix}${suffix ? `-${suffix}` : ''}`;
}

export function maskCpfCnpj(value: string, allowCnpj = true): string {
  const maxDigits = allowCnpj ? 14 : 11;
  const digits = value.replace(/\D/g, '').slice(0, maxDigits);

  if (allowCnpj && digits.length > 11) {
    return digits
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }

  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}
