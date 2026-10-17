import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import type { UpdateHandle, UpdateInfo, UpdaterPhase } from "../lib/updater";
import { checkForUpdate, relaunchApp } from "../lib/updater";
import {
  checkCombinedUpdate,
  type CombinedUpdateState,
} from "../lib/desktopUpdatePolicy";
import type { DesktopToolUpdateInfo } from "@/lib/api/desktopToolUpdate";

interface UpdateContextValue {
  hasUpdate: boolean;
  updateRequired: boolean;
  autoUpdate: boolean;
  updateInfo: UpdateInfo | null;
  updateHandle: UpdateHandle | null;
  gatewayInfo: DesktopToolUpdateInfo | null;
  availableVersion: string | null;
  isChecking: boolean;
  isUpdating: boolean;
  updatePhase: UpdaterPhase;
  downloadProgress: number | null;
  error: string | null;
  isDismissed: boolean;
  dismissUpdate: () => void;
  checkUpdate: () => Promise<boolean>;
  applyUpdate: () => Promise<void>;
  resetDismiss: () => void;
}

const UpdateContext = createContext<UpdateContextValue | undefined>(undefined);

export function UpdateProvider({ children }: { children: React.ReactNode }) {
  const DISMISSED_VERSION_KEY = "mohuan-ai:update:dismissedVersion";
  const LEGACY_DISMISSED_KEY = "dismissedUpdateVersion";

  const [combined, setCombined] = useState<CombinedUpdateState | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [updateHandle, setUpdateHandle] = useState<UpdateHandle | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [updatePhase, setUpdatePhase] = useState<UpdaterPhase>("idle");
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const updateTask = useRef<Promise<void> | null>(null);
  const isCheckingRef = useRef(false);

  const syncDismissState = useCallback(
    (version: string | null, required: boolean) => {
      if (!version || required) {
        setIsDismissed(false);
        return;
      }
      let dismissedVersion = localStorage.getItem(DISMISSED_VERSION_KEY);
      if (!dismissedVersion) {
        const legacy = localStorage.getItem(LEGACY_DISMISSED_KEY);
        if (legacy) {
          localStorage.setItem(DISMISSED_VERSION_KEY, legacy);
          localStorage.removeItem(LEGACY_DISMISSED_KEY);
          dismissedVersion = legacy;
        }
      }
      setIsDismissed(dismissedVersion === version);
    },
    [],
  );

  const applyUpdate = useCallback(async () => {
    if (updateTask.current) return updateTask.current;
    const task = (async () => {
      setError(null);
      setDownloadProgress(null);
      setUpdatePhase("checking");
      try {
        let handle = updateHandle;
        if (!handle) {
          const checked = await checkForUpdate({ timeout: 30000 });
          if (checked.status === "available") handle = checked.update;
        }
        if (!handle)
          throw new Error(
            "没有可用的签名更新包，请稍后重试；旧版或便携版可能需要先安装新版安装包。",
          );
        if (
          combined?.gateway?.update_available &&
          combined.gateway.latest_version !== handle.version
        ) {
          throw new Error("更新清单版本尚未同步，请稍后重新检查更新。");
        }
        setUpdatePhase("downloading");
        let downloaded = 0,
          total = 0;
        await handle.downloadAndInstall((event) => {
          if (event.event === "Started") {
            downloaded = 0;
            total = event.total ?? 0;
            setDownloadProgress(total > 0 ? 0 : null);
          } else if (event.event === "Progress") {
            downloaded += event.downloaded ?? 0;
            if (total > 0)
              setDownloadProgress(
                Math.min(100, Math.round((downloaded / total) * 100)),
              );
          } else if (event.event === "Finished") {
            setDownloadProgress(100);
            setUpdatePhase("installing");
          }
        });
        setUpdatePhase("restarting");
        await relaunchApp();
      } catch (err) {
        setUpdatePhase("error");
        setError(err instanceof Error ? err.message : String(err));
        throw err;
      }
    })();
    updateTask.current = task;
    try {
      await task;
    } finally {
      updateTask.current = null;
    }
  }, [combined, updateHandle]);

  const checkUpdate = useCallback(async () => {
    if (isCheckingRef.current || updateTask.current) return false;
    isCheckingRef.current = true;
    setIsChecking(true);
    setError(null);

    try {
      const { state } = await checkCombinedUpdate();
      setCombined(state);
      setUpdateInfo(state.tauriInfo);
      setUpdateHandle(state.tauriHandle);
      syncDismissState(state.availableVersion, state.updateRequired);

      return state.updateAvailable;
    } catch (err) {
      console.error("检查更新失败:", err);
      setError(err instanceof Error ? err.message : "检查更新失败");
      throw err;
    } finally {
      setIsChecking(false);
      isCheckingRef.current = false;
    }
  }, [syncDismissState]);

  const dismissUpdate = useCallback(() => {
    if (combined?.updateRequired) return;
    setIsDismissed(true);
    if (combined?.availableVersion) {
      localStorage.setItem(DISMISSED_VERSION_KEY, combined.availableVersion);
      localStorage.removeItem(LEGACY_DISMISSED_KEY);
    }
  }, [combined?.availableVersion, combined?.updateRequired]);

  const resetDismiss = useCallback(() => {
    setIsDismissed(false);
    localStorage.removeItem(DISMISSED_VERSION_KEY);
    localStorage.removeItem(LEGACY_DISMISSED_KEY);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkUpdate().catch(console.error);
    }, 1000);
    return () => clearTimeout(timer);
  }, [checkUpdate]);

  useEffect(() => {
    const intervalMs =
      (combined?.gateway?.check_interval_seconds ?? 3600) * 1000;
    const timer = window.setInterval(() => {
      checkUpdate().catch(console.error);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [checkUpdate, combined?.gateway?.check_interval_seconds]);

  useEffect(() => {
    const onFocus = () => {
      checkUpdate().catch(console.error);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [checkUpdate]);

  const hasUpdate = Boolean(combined?.updateAvailable);
  const updateRequired = Boolean(combined?.updateRequired);
  const autoUpdate = combined?.autoUpdate ?? true;

  const value: UpdateContextValue = {
    hasUpdate,
    updateRequired,
    autoUpdate,
    updateInfo,
    updateHandle,
    gatewayInfo: combined?.gateway ?? null,
    availableVersion: combined?.availableVersion ?? null,
    isChecking,
    isUpdating: [
      "checking",
      "downloading",
      "installing",
      "restarting",
    ].includes(updatePhase),
    updatePhase,
    downloadProgress,
    error,
    isDismissed,
    dismissUpdate,
    checkUpdate,
    applyUpdate,
    resetDismiss,
  };

  return (
    <UpdateContext.Provider value={value}>{children}</UpdateContext.Provider>
  );
}

export function useUpdate() {
  const context = useContext(UpdateContext);
  if (!context) {
    throw new Error("useUpdate must be used within UpdateProvider");
  }
  return context;
}
