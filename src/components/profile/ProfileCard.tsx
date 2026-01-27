import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Camera, Check, Pencil, X, Star, Trophy } from "lucide-react";
import { getXPProgress, LEVEL_REWARDS } from "@/lib/gamification";

interface ProfileCardProps {
  profile: {
    id: string;
    name: string | null;
    email: string | null;
    avatar_url: string | null;
    level: number;
    experience: number;
    created_at: string;
  };
  role: string;
  onUpdateName: (name: string) => Promise<void>;
  onUpdateAvatar: () => void;
}

const ROLE_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  free: { label: "FREE", variant: "secondary" },
  basic: { label: "BASIC", variant: "default" },
  premium: { label: "PREMIUM", variant: "default" },
  admin: { label: "ADMIN", variant: "default" },
};

export function ProfileCard({ profile, role, onUpdateName, onUpdateAvatar }: ProfileCardProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(profile.name || "");
  const [isSaving, setIsSaving] = useState(false);

  const xpProgress = getXPProgress(profile.experience, profile.level);
  const roleInfo = ROLE_LABELS[role] || ROLE_LABELS.free;

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    setIsSaving(true);
    await onUpdateName(newName.trim());
    setIsSaving(false);
    setIsEditingName(false);
  };

  const nextReward = Object.entries(LEVEL_REWARDS).find(
    ([level]) => parseInt(level) > profile.level
  );

  return (
    <Card className="overflow-hidden">
      <div className="h-24 bg-gradient-to-r from-primary to-secondary" />
      <CardContent className="relative pt-0">
        {/* Avatar */}
        <div className="relative -mt-16 mb-4">
          <div className="relative inline-block">
            <Avatar className="w-32 h-32 border-4 border-background">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-4xl bg-muted">
                {profile.name?.charAt(0).toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <Button
              size="icon"
              variant="secondary"
              className="absolute bottom-0 right-0 rounded-full"
              onClick={onUpdateAvatar}
            >
              <Camera className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Name */}
        <div className="flex items-center gap-2 mb-2">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-48"
                autoFocus
              />
              <Button size="icon" variant="ghost" onClick={handleSaveName} disabled={isSaving}>
                <Check className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setIsEditingName(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold">{profile.name || "Пользователь"}</h2>
              <Button size="icon" variant="ghost" onClick={() => setIsEditingName(true)}>
                <Pencil className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>

        {/* Email & Role */}
        <p className="text-muted-foreground mb-2">{profile.email}</p>
        <div className="flex items-center gap-2 mb-4">
          <Badge variant={roleInfo.variant} className={role === "premium" ? "bg-gradient-to-r from-amber-500 to-orange-500" : ""}>
            {roleInfo.label}
          </Badge>
          <span className="text-sm text-muted-foreground">
            С {new Date(profile.created_at).toLocaleDateString("ru-RU")}
          </span>
        </div>

        {/* Level & XP */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <span className="text-2xl font-bold text-primary-foreground">{profile.level}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Star className="w-4 h-4 text-amber-500" />
                  <span className="font-semibold">Уровень {profile.level}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {xpProgress.current} / {xpProgress.required} XP до уровня {profile.level + 1}
                </p>
              </div>
            </div>

            <Progress value={xpProgress.percentage} className="h-3 mb-3" />

            {nextReward && (
              <div className="flex items-center gap-2 text-sm">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span className="text-muted-foreground">
                  Уровень {nextReward[0]}:
                </span>
                <span className="font-medium">{nextReward[1].title}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
