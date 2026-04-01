import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type NameReminderAlertProps = {
  exact: boolean;
  label: string;
  similarItems: Array<{ id: string; name: string }>;
};

export function NameReminderAlert({
  exact,
  label,
  similarItems,
}: NameReminderAlertProps) {
  if (!exact && similarItems.length === 0) {
    return null;
  }

  return (
    <Alert>
      <AlertTriangle className="size-4" />
      <AlertTitle>{exact ? `发现同名${label}` : `发现相似${label}`}</AlertTitle>
      <AlertDescription>
        {exact
          ? "当前姓名已存在，请确认是否为同一人。"
          : similarItems.map((item) => item.name).join("、")}
      </AlertDescription>
    </Alert>
  );
}
