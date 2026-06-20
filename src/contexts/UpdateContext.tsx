import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { toast } from "sonner";
import { settingsApi } from "@/lib/api/settings";
import type { UpdateHandle, UpdateInfo } from "../lib/updater";
import { relaunchApp } from "../lib/updater";
import {
  checkCombinedUpdate,
  getPreferredDownloadUrl,
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
  const autoInstallStarted = useRef(false);
  const isCheckingRef = useRef(false);

  const syncDismissState = useCallback((version: string | null, required: boolean) => {
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
  }, []);

  const applyUpdate = useCallback(async () => {
    const downloadUrl = combined ? getPreferredDownloadUrl(combined) : null;
    if (updateHandle) {
      await updateHandle.downloadAndInstall();
      await relaunchApp();
      return;
    }
    if (downloadUrl) {
      await settingsApi.openExternal(downloadUrl);
      toast.message("已打开下载页面，请安装新版本后重启工具");
      return;
    }
    throw new Error("没有可用的更新包");
  }, [combined, updateHandle]);

  const runAutoUpdate = useCallback(
    async (state: CombinedUpdateState) => {
      if (!state.updateAvailable || !state.autoUpdate || autoInstallStarted.current) {
        return;
      }
      autoInstallStarted.current = true;
      try {
        if (state.tauriHandle) {
          await state.tauriHandle.downloadAndInstall();
          await relaunchApp();
          return;
        }
        const url = getPreferredDownloadUrl(state);
        if (url) {
          await settingsApi.openExternal(url);
        }
      } catch (err) {
        console.error("Auto update failed:", err);
        autoInstallStarted.current = false;
      }
    },
    [],
  );

  const checkUpdate = useCallback(async () => {
    if (isCheckingRef.current) return false;
    isCheckingRef.current = true;
    setIsChecking(true);
    setError(null);

    try {
      const { state } = await checkCombinedUpdate();
      setCombined(state);
      setUpdateInfo(state.tauriInfo);
      setUpdateHandle(state.tauriHandle);
      syncDismissState(state.availableVersion, state.updateRequired);

      if (state.updateAvailable && state.autoUpdate && !state.updateRequired) {
        void runAutoUpdate(state);
      }

      return state.updateAvailable;
    } catch (err) {
      console.error("检查更新失败:", err);
      setError(err instanceof Error ? err.message : "检查更新失败");
      throw err;
    } finally {
      setIsChecking(false);
      isCheckingRef.current = false;
    }
  }, [runAutoUpdate, syncDismissState]);

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
    const intervalMs = (combined?.gateway?.check_interval_seconds ?? 3600) * 1000;
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
