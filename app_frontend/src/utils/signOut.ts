import { Alert, Platform } from 'react-native';

function showSignOutError(error: unknown) {
  const message = error instanceof Error
    ? error.message
    : 'A sessão pode continuar ativa em outro dispositivo.';
  const title = 'Você saiu da conta';
  if (Platform.OS === 'web') {
    globalThis.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export function confirmSignOut({
  title,
  message,
  signOut,
  navigateHome,
}: {
  title: string;
  message: string;
  signOut: () => Promise<void>;
  navigateHome: () => void;
}) {
  const finishSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      navigateHome();
      showSignOutError(error);
      return;
    }
    navigateHome();
  };

  const confirm = () => {
    void finishSignOut();
  };

  if (Platform.OS === 'web') {
    if (globalThis.confirm(`${title}\n\n${message}`)) confirm();
    return;
  }

  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Sair', style: 'destructive', onPress: confirm },
  ]);
}
