import {
  MOHUAN_API_ORIGIN,
  MOHUAN_WEB_URL,
} from "@/config/mohuanGateway";

export type DesktopToolDownload = {
  name: string;
  url: string;
};

export type DesktopToolUpdateInfo = {
  latest_version: string;
  latest_tag: string;
  min_version: string;
  current_version?: string | null;
  update_available: boolean;
  update_required: boolean;
  auto_update: boolean;
  force_update: boolean;
  check_interval_seconds: number;
  release_notes: string;
  release_page: string;
  download_page: string;
  latest_json_url: string;
  downloads: Record<string, DesktopToolDownload>;
};

export async function fetchDesktopToolUpdate(
  currentVersion?: string,
): Promise<DesktopToolUpdateInfo> {
  const query = currentVersion
    ? `?version=${encodeURIComponent(currentVersion)}`
    : "";
  const res = await fetch(
    `${MOHUAN_API_ORIGIN}/api/desktop-tool/update${query}`,
    { cache: "no-store" },
  );
  if (!res.ok) {
    throw new Error(`Update API ${res.status}`);
  }
  return res.json() as Promise<DesktopToolUpdateInfo>;
}

export function pickPlatformDownload(
  info: DesktopToolUpdateInfo,
): DesktopToolDownload | null {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const platform =
    typeof navigator !== "undefined" ? navigator.platform : "";

  if (/Win/i.test(platform) || /Windows/i.test(ua)) {
    return (
      info.downloads.windows_setup ||
      info.downloads.windows_portable ||
      null
    );
  }
  if (/Mac/i.test(platform) || /Macintosh/i.test(ua)) {
    return info.downloads.macos_dmg || info.downloads.macos_zip || null;
  }
  if (/Linux/i.test(platform) || /Linux/i.test(ua)) {
    const arm = /aarch64|arm64/i.test(ua);
    return arm
      ? info.downloads.linux_arm64_appimage || info.downloads.linux_x64_appimage
      : info.downloads.linux_x64_appimage || info.downloads.linux_arm64_appimage;
  }
  return info.downloads.macos_dmg || null;
}

export function releaseNotesUrl(info: DesktopToolUpdateInfo): string {
  return info.release_page || info.download_page || MOHUAN_WEB_URL;
}
