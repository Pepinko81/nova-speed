/**
 * Settings Component - User preferences
 */

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings as SettingsIcon, X } from 'lucide-react';
import { getSettings, saveSettings, UserSettings } from '@/lib/settings';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Settings = ({ isOpen, onClose }: SettingsProps) => {
  const [settings, setSettings] = useState<UserSettings>(getSettings());

  useEffect(() => {
    if (isOpen) {
      setSettings(getSettings());
    }
  }, [isOpen]);

  const handleSave = () => {
    saveSettings(settings);
    // Apply high contrast mode
    if (settings.highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md p-6 bg-background">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Настройки</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-6">
          {/* Low Data Mode */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="low-data">Режим с ниско потребление</Label>
              <p className="text-xs text-muted-foreground">
                Намалява количеството данни за по-бърз тест
              </p>
            </div>
            <Switch
              id="low-data"
              checked={settings.lowDataMode}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, lowDataMode: checked })
              }
            />
          </div>

          {/* Test Mode */}
          <div className="space-y-2">
            <Label htmlFor="test-mode">Режим на теста</Label>
            <Select
              value={settings.testMode}
              onValueChange={(value: UserSettings['testMode']) =>
                setSettings({ ...settings, testMode: value })
              }
            >
              <SelectTrigger id="test-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Стандартен</SelectItem>
                <SelectItem value="streaming">Streaming</SelectItem>
                <SelectItem value="gaming">Gaming</SelectItem>
                <SelectItem value="video-call">Video Call</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Изберете режим според вашите нужди
            </p>
          </div>

          {/* Auto Save History */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-save">Автоматично запазване на история</Label>
              <p className="text-xs text-muted-foreground">
                Автоматично запазва резултатите от тестовете
              </p>
            </div>
            <Switch
              id="auto-save"
              checked={settings.autoSaveHistory}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, autoSaveHistory: checked })
              }
            />
          </div>

          {/* High Contrast */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="high-contrast">Висок контраст</Label>
              <p className="text-xs text-muted-foreground">
                Подобрява видимостта за по-добра достъпност
              </p>
            </div>
            <Switch
              id="high-contrast"
              checked={settings.highContrast}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, highContrast: checked })
              }
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <Button onClick={handleSave} className="flex-1">
            Запази
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">
            Отказ
          </Button>
        </div>
      </Card>
    </div>
  );
};

