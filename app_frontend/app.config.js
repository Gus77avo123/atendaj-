const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
const androidPackage = process.env.EXPO_ANDROID_PACKAGE || 'com.atendeja.app';
const iosBundleIdentifier = process.env.EXPO_IOS_BUNDLE_IDENTIFIER || 'com.atendeja.app';
const app = {
  name: 'Atende Já',
  slug: 'atende-ja',
  scheme: 'atendeja',
  version: '1.0.0',
  extra: easProjectId ? { eas: { projectId: easProjectId } } : {},
  orientation: 'portrait',
  icon: './assets/atende-ja-logo.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/atende-ja-logo.png',
    imageWidth: 180,
    resizeMode: 'contain',
    backgroundColor: '#F5F7FA',
  },
  ios: {
    bundleIdentifier: iosBundleIdentifier,
    supportsTablet: true,
  },
  android: {
    package: androidPackage,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/atende-ja-logo.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-font',
    ['expo-location', {
      locationWhenInUsePermission: 'O Atende Já usa sua localização para encontrar profissionais próximos.',
    }],
    'expo-task-manager',
    'expo-notifications',
    'expo-web-browser',
    ['expo-image-picker', {
      photosPermission: 'O Atende Já acessa suas fotos para adicionar uma imagem ao perfil.',
      cameraPermission: 'O Atende Já usa a câmera para tirar uma foto de perfil.',
      microphonePermission: false,
    }],
    'react-native-maps',
  ],
};

if (googleMapsApiKey) {
  app.android = {
    ...app.android,
    config: {
      ...app.android?.config,
      googleMaps: { apiKey: googleMapsApiKey },
    },
  };
  app.ios = {
    ...app.ios,
    config: {
      ...app.ios?.config,
      googleMapsApiKey,
    },
  };
}

module.exports = { expo: app };
