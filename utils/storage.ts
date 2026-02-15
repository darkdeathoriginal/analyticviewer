import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SavedApp {
  id: string;
  name: string;
  url: string;
  icon?: string;
  createdAt: number;
  favicon: string | null;

}

const STORAGE_KEY = '@analyticviewer_apps';

export const getApps = async (): Promise<SavedApp[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error('Failed to fetch apps', e);
    return [];
  }
};

export const saveApp = async (app: Omit<SavedApp, 'id' | 'createdAt'>): Promise<SavedApp> => {
  try {
    const existingApps = await getApps();
    const newApp: SavedApp = {
      id: Date.now().toString(),
      createdAt: Date.now(),
      ...app,
    };
    const updatedApps = [newApp, ...existingApps];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedApps));
    return newApp;
  } catch (e) {
    console.error('Failed to save app', e);
    throw e;
  }
};

export const deleteApp = async (id: string): Promise<void> => {
  try {
    const existingApps = await getApps();
    const updatedApps = existingApps.filter(app => app.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedApps));
  } catch (e) {
    console.error('Failed to delete app', e);
    throw e;
  }
};
