export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL || 'https://vagueness-sabbath-stuffy.ngrok-free.dev'
).replace(/\/+$/, '');

export const API_HEADERS: Record<string, string> = API_BASE_URL.includes('.ngrok-free.dev')
  ? { 'ngrok-skip-browser-warning': '1' }
  : {};
