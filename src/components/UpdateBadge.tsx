import { useUpdate } from "@/contexts/UpdateContext";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ArrowUpCircle } from "lucide-react";

interface UpdateBadgeProps {
  className?: string;
  onClick?: () => void;
}

export function UpdateBadge({ className = "", onClick }: UpdateBadgeProps) {
  const { hasUpdate, updateRequired, isDismissed, availableVersion } = useUpdate();
  const { t } = useTranslation();
  const isActive = hasUpdate && (updateRequired || !isDismissed);
  const title = updateRequired
    ? t("settings.updateRequired", { version: availableVersion ?? "" })
    : isActive
      ? t("settings.updateAvailable", { version: availableVersion ?? "" })
      : t("settings.checkForUpdates");

  if (!isActive) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`
        relative h-8 w-8 rounded-full
        ${updateRequired ? "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10" : "text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10"}
        ${className}
      `}
    >
      <ArrowUpCircle className="h-5 w-5" />
    </Button>
  );
}
