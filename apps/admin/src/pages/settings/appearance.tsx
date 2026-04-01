import { Moon, Sun, Monitor } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { PageContent } from "@/components/page-content";
import { useTheme } from "@/components/theme-provider";

const themeOptions = [
  { value: "light", label: "浅色", icon: Sun, description: "明亮清爽的浅色主题" },
  { value: "dark", label: "深色", icon: Moon, description: "护眼的深色主题" },
  { value: "system", label: "跟随系统", icon: Monitor, description: "自动跟随系统外观设置" },
];

export default function SettingsAppearancePage() {
  const { theme, setTheme } = useTheme();

  return (
    <PageContent>
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">外观设置</h1>
        <p className="text-sm text-muted-foreground">自定义界面的外观和主题</p>
      </div>
      <Separator />

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>主题</CardTitle>
          <CardDescription>选择您喜欢的界面主题</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={theme}
            onValueChange={(value) => setTheme(value as "light" | "dark" | "system")}
            className="grid grid-cols-3 gap-4"
          >
            {themeOptions.map((option) => (
              <div key={option.value}>
                <RadioGroupItem value={option.value} id={option.value} className="sr-only" />
                <Label
                  htmlFor={option.value}
                  className="flex cursor-pointer flex-col items-center justify-between rounded-lg border-2 p-4 hover:bg-accent [&:has([data-state=checked])]:border-primary"
                >
                  <option.icon className="mb-3 size-6" />
                  <span className="text-sm font-medium">{option.label}</span>
                  <span className="mt-1 text-center text-xs text-muted-foreground">{option.description}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>
    </div>
    </PageContent>
  );
}
