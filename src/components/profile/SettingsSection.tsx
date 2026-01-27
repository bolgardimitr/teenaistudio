import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, LogOut, Moon, Sun, Mail, Bell } from "lucide-react";

interface SettingsSectionProps {
  onLogout: () => void;
}

export function SettingsSection({ onLogout }: SettingsSectionProps) {
  const [parentEmail, setParentEmail] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Настройки
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Parent Email */}
        <div className="space-y-2">
          <Label htmlFor="parentEmail" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email родителя (для детей до 14 лет)
          </Label>
          <Input
            id="parentEmail"
            type="email"
            value={parentEmail}
            onChange={(e) => setParentEmail(e.target.value)}
            placeholder="parent@example.com"
          />
          <p className="text-xs text-muted-foreground">
            Родитель получит уведомления об активности ребёнка
          </p>
        </div>

        {/* Notifications */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <div>
              <Label htmlFor="notifications">Уведомления на email</Label>
              <p className="text-xs text-muted-foreground">
                Получать новости и обновления
              </p>
            </div>
          </div>
          <Switch
            id="notifications"
            checked={emailNotifications}
            onCheckedChange={setEmailNotifications}
          />
        </div>

        {/* Theme */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            <div>
              <Label htmlFor="theme">Тёмная тема</Label>
              <p className="text-xs text-muted-foreground">
                Переключить на {darkMode ? "светлую" : "тёмную"} тему
              </p>
            </div>
          </div>
          <Switch
            id="theme"
            checked={darkMode}
            onCheckedChange={setDarkMode}
          />
        </div>

        {/* Logout */}
        <div className="pt-4 border-t">
          <Button
            variant="destructive"
            onClick={onLogout}
            className="w-full"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Выйти из аккаунта
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
