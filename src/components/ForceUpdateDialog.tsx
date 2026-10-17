import { Loader2, Download, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUpdate } from "@/contexts/UpdateContext";
import { updateStatusLabel } from "@/lib/updater";

export function ForceUpdateDialog() {
  const {
    updateRequired,
    availableVersion,
    gatewayInfo,
    applyUpdate,
    isChecking,
    isUpdating,
    updatePhase,
    downloadProgress,
    error,
  } = useUpdate();

  if (!updateRequired) return null;

  const minVersion = gatewayInfo?.min_version;
  const latestVersion = gatewayInfo?.latest_version ?? availableVersion;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-6">
      <div className="w-full max-w-md rounded-xl border border-amber-300/40 bg-background p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-5 w-5" />
          <h2 className="text-lg font-semibold">需要更新</h2>
        </div>
        <p className="mb-2 text-sm text-muted-foreground">
          当前版本已不受支持，请更新到最新版后再继续使用模幻AI 工具。
        </p>
        <div className="mb-4 space-y-1 text-xs text-muted-foreground">
          {minVersion && <p>最低支持版本：v{minVersion}</p>}
          {latestVersion && <p>最新版本：v{latestVersion}</p>}
        </div>
        {gatewayInfo?.release_notes && (
          <pre className="mb-4 max-h-32 overflow-auto rounded-lg bg-muted/50 p-3 text-xs whitespace-pre-wrap">
            {gatewayInfo.release_notes}
          </pre>
        )}
        <Button
          className="w-full"
          disabled={isChecking || isUpdating}
          onClick={() => applyUpdate().catch(console.error)}
        >
          {isChecking || isUpdating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {updateStatusLabel(updatePhase, downloadProgress)}
        </Button>
        {isUpdating && (
          <progress
            aria-label="更新下载进度"
            className="mt-3 w-full"
            max={100}
            value={downloadProgress ?? undefined}
          />
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600 break-words">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
