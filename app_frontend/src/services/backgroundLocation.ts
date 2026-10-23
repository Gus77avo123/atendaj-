import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

const TASK_NAME = 'atendeja-professional-background-location';
const SESSION_KEY = 'atendeja.background-location.v1';

TaskManager.defineTask(TASK_NAME, async ({ error }) => {
  if (error) {
    console.error('A tarefa antiga de localização em segundo plano falhou.', error);
  }
});

export async function stopProfessionalLocationUpdates() {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(SESSION_KEY);
    return;
  }
  try {
    if (await Location.hasStartedLocationUpdatesAsync(TASK_NAME)) {
      await Location.stopLocationUpdatesAsync(TASK_NAME);
    }
  } finally {
    await AsyncStorage.removeItem(SESSION_KEY);
  }
}
