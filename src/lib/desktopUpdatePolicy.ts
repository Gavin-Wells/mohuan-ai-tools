import {
  fetchDesktopToolUpdate,
  pickPlatformDownload,
  type DesktopToolUpdateInfo,
} from "@/lib/api/desktopToolUpdate";
import { getCurrentVersion, checkForUpdate, type UpdateHandle, type UpdateInfo } from "../lib/updater";

export type CombinedUpdateState = {
  gateway: DesktopToolUpdateInfo | null;
  tauriInfo: UpdateInfo | null;
  tauriHandle: UpdateHandle | null;
  updateAvailable: boolean;
  updateRequired: boolean;
  autoUpdate: boolean;
  availableVersion: string | null;
  releaseNotes: string;
};

function mergeUpdateState(
  gateway: DesktopToolUpdateInfo | null,
  tauri:
    | { status: "up-to-date" }
    | { status: "available"; info: UpdateInfo; update: UpdateHandle }
    | null,
  currentVersion: string,
): CombinedUpdateState {
  const tauriAvailable = tauri?.status === "available" ? tauri.info.availableVersion : null;
  const gatewayAvailable =
    gateway?.update_available ? gateway.latest_version : null;

  const availableVersion = gatewayAvailable || tauriAvailable;
  const updateAvailable = Boolean(availableVersion);
  const updateRequired = Boolean(gateway?.update_required);
  const autoUpdate = gateway?.auto_update ?? true;

  return {
    gateway,
    tauriInfo: tauri?.status === "available" ? tauri.info : null,
    tauriHandle: tauri?.status === "available" ? tauri.update : null,
    updateAvailable,
    updateRequired,
    autoUpdate,
    availableVersion,
    releaseNotes: gateway?.release_notes || tauri?.status === "available" ? tauri.info.notes || "" : "",
  };
}

export async function checkCombinedUpdate(): Promise<{
  currentVersion: string;
  state: CombinedUpdateState;
}> {
  const currentVersion = await getCurrentVersion();

  let gateway: DesktopToolUpdateInfo | null = null;
  try {
    gateway = await fetchDesktopToolUpdate(currentVersion || undefined);
  } catch (err) {
    console.warn("Gateway update check failed:", err);
  }

  let tauri: Awaited<ReturnType<typeof checkForUpdate>> | null = null;
  try {
    tauri = await checkForUpdate({ timeout: 30000 });
  } catch (err) {
    console.warn("Tauri updater check failed:", err);
  }

  return {
    currentVersion,
    state: mergeUpdateState(gateway, tauri, currentVersion),
  };
}

export function getPreferredDownloadUrl(
  state: CombinedUpdateState,
): string | null {
  if (state.gateway) {
    const picked = pickPlatformDownload(state.gateway);
    if (picked?.url) return picked.url;
  }
  return state.gateway?.download_page ?? null;
}
