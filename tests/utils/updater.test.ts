import { describe, expect, it, vi } from "vitest";
import { checkForUpdate, relaunchApp } from "@/lib/updater";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

vi.mock("@tauri-apps/api/app", () => ({
  getVersion: vi.fn().mockResolvedValue("1.0.15"),
}));
vi.mock("@tauri-apps/plugin-updater", () => ({ check: vi.fn() }));
vi.mock("@tauri-apps/plugin-process", () => ({ relaunch: vi.fn() }));

describe("native updater bridge", () => {
  it("maps native byte progress and uses a longer download timeout", async () => {
    const downloadAndInstall = vi.fn(async (callback) => {
      callback({ event: "Started", data: { contentLength: 1000 } });
      callback({ event: "Progress", data: { chunkLength: 300 } });
      callback({ event: "Finished" });
    });
    vi.mocked(check).mockResolvedValue({
      version: "1.0.16",
      downloadAndInstall,
    } as never);
    const checked = await checkForUpdate();
    expect(checked.status).toBe("available");
    if (checked.status !== "available") throw new Error("Expected update");
    const progress = vi.fn();
    await checked.update.downloadAndInstall(progress);
    expect(downloadAndInstall).toHaveBeenCalledWith(expect.any(Function), {
      timeout: 300000,
    });
    expect(progress.mock.calls.map(([event]) => event)).toEqual([
      { event: "Started", total: 1000, downloaded: 0 },
      { event: "Progress", downloaded: 300 },
      { event: "Finished" },
    ]);
    await relaunchApp();
    expect(relaunch).toHaveBeenCalledTimes(1);
  });
});
