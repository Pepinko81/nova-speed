/**
 * User Settings Management - localStorage based settings
 */

export interface UserSettings {
  lowDataMode: boolean;
  testMode: 'standard' | 'streaming' | 'gaming' | 'video-call';
  autoSaveHistory: boolean;
  highContrast: boolean;
}

const SETTINGS_KEY = 'speedflux_settings';
const DEFAULT_SETTINGS: UserSettings = {
  lowDataMode: false,
  testMode: 'standard',
  autoSaveHistory: true,
  highContrast: false,
};

export const getSettings = (): UserSettings => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return DEFAULT_SETTINGS;
    
    const settings = JSON.parse(stored) as UserSettings;
    return { ...DEFAULT_SETTINGS, ...settings };
  } catch (error) {
    console.error('Failed to load settings:', error);
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = (settings: Partial<UserSettings>): void => {
  try {
    const current = getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
};

export const isLowDataMode = (): boolean => {
  return getSettings().lowDataMode;
};

export const isHighContrast = (): boolean => {
  return getSettings().highContrast;
};

