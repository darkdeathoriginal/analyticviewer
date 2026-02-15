import AsyncStorage from "@react-native-async-storage/async-storage";

const UTILS_SETTINGS_KEY = "@analyticviewer_settings";

export interface AppSettings {
  autoUpdate: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  autoUpdate: true,
};

export const getSettings = async (): Promise<AppSettings> => {
  try {
    const jsonValue = await AsyncStorage.getItem(UTILS_SETTINGS_KEY);
    return jsonValue != null
      ? { ...DEFAULT_SETTINGS, ...JSON.parse(jsonValue) }
      : DEFAULT_SETTINGS;
  } catch (e) {
    console.error("Failed to fetch settings", e);
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = async (
  settings: Partial<AppSettings>,
): Promise<AppSettings> => {
  try {
    const currentSettings = await getSettings();
    const newSettings = { ...currentSettings, ...settings };
    await AsyncStorage.setItem(UTILS_SETTINGS_KEY, JSON.stringify(newSettings));
    return newSettings;
  } catch (e) {
    console.error("Failed to save settings", e);
    throw e;
  }
};
