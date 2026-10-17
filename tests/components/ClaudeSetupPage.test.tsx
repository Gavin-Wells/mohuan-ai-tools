import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { ClaudeSetupPage } from "@/components/claude/ClaudeSetupPage";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() },
}));
const billing = {
  balance: 10,
  currency: "CNY",
  today: { cost: 0, requests: 0, input_tokens: 0, output_tokens: 0 },
  this_month: { cost: 0, requests: 0, input_tokens: 0, output_tokens: 0 },
};

describe("Claude Code setup", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(invoke).mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ billing }) }),
    );
  });

  function mockNative(installed: boolean) {
    let ready = installed;
    vi.mocked(invoke).mockImplementation(async (command) => {
      if (command === "check_claude_installed")
        return {
          installed: ready,
          path: ready ? "/test/claude" : null,
        } as never;
      if (command === "install_claude_cli") {
        ready = true;
        return "Installed" as never;
      }
      if (command === "fetch_models_for_config")
        return [{ id: "claude-opus-5-5" }] as never;
      if (command === "setup_and_launch_claude")
        return "Claude Code 已配置并启动" as never;
      if (command === "restore_claude_defaults") return true as never;
      throw new Error(`Unexpected command: ${command}`);
    });
  }

  it("does not install software just by opening the page", async () => {
    mockNative(false);
    render(<ClaudeSetupPage providers={{}} onProvidersChanged={vi.fn()} />);
    await screen.findByRole("button", { name: "安装并启动" });
    expect(
      vi
        .mocked(invoke)
        .mock.calls.some(([cmd]) => cmd === "install_claude_cli"),
    ).toBe(false);
  });

  it("verifies, installs, configures and launches with one click", async () => {
    mockNative(false);
    render(<ClaudeSetupPage providers={{}} onProvidersChanged={vi.fn()} />);
    await screen.findByText(/未检测到 Claude Code CLI/);
    fireEvent.change(screen.getByPlaceholderText("粘贴你的 API Key"), {
      target: { value: "test-key" },
    });
    fireEvent.click(screen.getByRole("button", { name: "安装并启动" }));
    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith(
        "setup_and_launch_claude",
        expect.objectContaining({
          apiKey: "test-key",
          settingsConfig: expect.objectContaining({
            env: expect.objectContaining({
              ANTHROPIC_MODEL: "claude-opus-5-5",
            }),
          }),
        }),
      ),
    );
    expect(invoke).toHaveBeenCalledWith("install_claude_cli");
    await waitFor(() =>
      expect(localStorage.getItem("claude_api_key")).toBe("test-key"),
    );
  });

  it("never installs or modifies settings when authentication fails", async () => {
    mockNative(true);
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 401 } as Response);
    render(<ClaudeSetupPage providers={{}} onProvidersChanged={vi.fn()} />);
    await screen.findByText(/Claude Code 已安装/);
    fireEvent.change(screen.getByPlaceholderText("粘贴你的 API Key"), {
      target: { value: "bad-key" },
    });
    fireEvent.click(screen.getByRole("button", { name: "配置并启动" }));
    await screen.findByText(/配置失败:.*401/);
    expect(
      vi
        .mocked(invoke)
        .mock.calls.some(
          ([cmd]) =>
            cmd === "setup_and_launch_claude" || cmd === "install_claude_cli",
        ),
    ).toBe(false);
  });

  it("does not launch when installation fails", async () => {
    mockNative(false);
    const implementation = vi.mocked(invoke).getMockImplementation()!;
    vi.mocked(invoke).mockImplementation(async (command, args) => {
      if (command === "install_claude_cli") throw new Error("Install failed");
      return implementation(command, args);
    });
    render(<ClaudeSetupPage providers={{}} onProvidersChanged={vi.fn()} />);
    await screen.findByText(/未检测到 Claude Code CLI/);
    fireEvent.change(screen.getByPlaceholderText("粘贴你的 API Key"), {
      target: { value: "test-key" },
    });
    fireEvent.click(screen.getByRole("button", { name: "安装并启动" }));
    await screen.findByText(/尚未安装，未修改配置/);
    expect(
      vi
        .mocked(invoke)
        .mock.calls.some(([cmd]) => cmd === "setup_and_launch_claude"),
    ).toBe(false);
  });
});
