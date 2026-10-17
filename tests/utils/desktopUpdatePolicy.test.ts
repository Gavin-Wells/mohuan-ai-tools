import { describe, expect, it, vi } from "vitest";
import { checkCombinedUpdate } from "@/lib/desktopUpdatePolicy";
import { fetchDesktopToolUpdate } from "@/lib/api/desktopToolUpdate";
import { checkForUpdate, getCurrentVersion } from "@/lib/updater";

vi.mock("@/lib/api/desktopToolUpdate", () => ({
  fetchDesktopToolUpdate: vi.fn(),
  pickPlatformDownload: vi.fn(),
}));
vi.mock("@/lib/updater", () => ({
  checkForUpdate: vi.fn(),
  getCurrentVersion: vi.fn(),
}));

describe("desktop update policy", () => {
  it("handles gateway release notes when the Tauri updater is unavailable", async () => {
    vi.mocked(getCurrentVersion).mockResolvedValue("1.0.11");
    vi.mocked(fetchDesktopToolUpdate).mockResolvedValue({
      latest_version: "1.0.12",
      update_available: true,
      release_notes: "Claude Code setup",
    } as never);
    vi.mocked(checkForUpdate).mockRejectedValue(
      new Error("No updater configured"),
    );
    const { state } = await checkCombinedUpdate();
    expect(state.availableVersion).toBe("1.0.12");
    expect(state.releaseNotes).toBe("Claude Code setup");
  });
});
