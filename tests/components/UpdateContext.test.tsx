import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { UpdateProvider, useUpdate } from "@/contexts/UpdateContext";
import { checkCombinedUpdate } from "@/lib/desktopUpdatePolicy";
import {
  checkForUpdate,
  relaunchApp,
  type UpdateProgressEvent,
} from "@/lib/updater";

vi.mock("@/lib/desktopUpdatePolicy", () => ({ checkCombinedUpdate: vi.fn() }));
vi.mock("@/lib/updater", () => ({
  checkForUpdate: vi.fn(),
  relaunchApp: vi.fn(),
}));

function Controls() {
  const update = useUpdate();
  return (
    <>
      <button onClick={() => void update.checkUpdate()}>Check</button>
      <button onClick={() => void update.applyUpdate().catch(() => {})}>
        Install
      </button>
      <output>{update.availableVersion}</output>
      <span data-testid="phase">{update.updatePhase}</span>
      <span data-testid="progress">{update.downloadProgress}</span>
      <span role="alert">{update.error}</span>
    </>
  );
}

describe("user initiated signed updates", () => {
  const install = vi.fn();
  const state = () => ({
    gateway: {
      latest_version: "1.0.16",
      update_available: true,
      auto_update: true,
    },
    tauriInfo: { currentVersion: "1.0.15", availableVersion: "1.0.16" },
    tauriHandle: { version: "1.0.16", downloadAndInstall: install },
    updateAvailable: true,
    updateRequired: false,
    autoUpdate: true,
    availableVersion: "1.0.16",
    releaseNotes: "Update",
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    install.mockReset().mockResolvedValue(undefined);
    vi.mocked(relaunchApp).mockResolvedValue(undefined);
    vi.mocked(checkCombinedUpdate).mockResolvedValue({
      currentVersion: "1.0.15",
      state: state(),
    } as never);
  });

  async function setup() {
    render(
      <UpdateProvider>
        <Controls />
      </UpdateProvider>,
    );
    fireEvent.click(screen.getByText("Check"));
    await screen.findByText("1.0.16");
  }

  it("does not install or restart from checking, even with auto_update enabled", async () => {
    await setup();
    expect(install).not.toHaveBeenCalled();
    expect(relaunchApp).not.toHaveBeenCalled();
  });

  it("deduplicates clicks, reports progress and restarts only after installation", async () => {
    let finish!: () => void;
    install.mockImplementation(
      async (progress: (event: UpdateProgressEvent) => void) => {
        progress({ event: "Started", total: 100 });
        progress({ event: "Progress", downloaded: 30 });
        progress({ event: "Progress", downloaded: 20 });
        await new Promise<void>((resolve) => {
          finish = resolve;
        });
        progress({ event: "Finished" });
      },
    );
    await setup();
    fireEvent.click(screen.getByText("Install"));
    fireEvent.click(screen.getByText("Install"));
    await waitFor(() =>
      expect(screen.getByTestId("progress")).toHaveTextContent("50"),
    );
    expect(install).toHaveBeenCalledTimes(1);
    expect(relaunchApp).not.toHaveBeenCalled();
    finish();
    await waitFor(() => expect(relaunchApp).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("phase")).toHaveTextContent("restarting");
  });

  it("keeps the app running on verification failure and allows retry", async () => {
    install.mockRejectedValueOnce(new Error("Invalid signature"));
    await setup();
    fireEvent.click(screen.getByText("Install"));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Invalid signature"),
    );
    expect(relaunchApp).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Install"));
    await waitFor(() => expect(relaunchApp).toHaveBeenCalledTimes(1));
  });

  it("does not install an older bundle when gateway metadata is ahead", async () => {
    const mismatch = state();
    mismatch.tauriHandle.version = "1.0.15";
    vi.mocked(checkCombinedUpdate).mockResolvedValue({
      currentVersion: "1.0.14",
      state: mismatch,
    } as never);
    await setup();
    fireEvent.click(screen.getByText("Install"));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("尚未同步"),
    );
    expect(install).not.toHaveBeenCalled();
    expect(relaunchApp).not.toHaveBeenCalled();
  });

  it("rechecks signed packages and shows an error if no package is available", async () => {
    vi.mocked(checkCombinedUpdate).mockResolvedValue({
      currentVersion: "1.0.15",
      state: { ...state(), tauriHandle: null },
    } as never);
    vi.mocked(checkForUpdate).mockResolvedValue({ status: "up-to-date" });
    await setup();
    fireEvent.click(screen.getByText("Install"));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("签名更新包"),
    );
    expect(install).not.toHaveBeenCalled();
    expect(relaunchApp).not.toHaveBeenCalled();
  });
});
