import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { ClientSupport } from "@/components/mohuan/ClientSupport";
import { copyText } from "@/lib/clipboard";
import { settingsApi } from "@/lib/api/settings";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@/lib/clipboard", () => ({ copyText: vi.fn() }));
vi.mock("@/lib/api/settings", () => ({
  settingsApi: { openExternal: vi.fn() },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const report = {
  schema_version: 1,
  tool: "claude",
  client_version: "1.0.16",
  platform: "macos",
  arch: "aarch64",
  captured_at: "2026-10-27T01:00:00Z",
  runtime: "claude-cli",
  runtime_version: "2.1.310",
  checks: [
    {
      id: "launch",
      label: "启动状态",
      status: "skipped",
      detail: "未验证实际运行",
    },
  ],
};

describe("ClientSupport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(invoke).mockResolvedValue(report);
    vi.mocked(copyText).mockResolvedValue();
    vi.mocked(settingsApi.openExternal).mockResolvedValue();
  });

  it("does not inspect, install, launch or send feedback on mount", () => {
    render(<ClientSupport tool="claude" apiKey="test-key" />);
    expect(invoke).not.toHaveBeenCalled();
    expect(settingsApi.openExternal).not.toHaveBeenCalled();
  });

  it("keeps read-only diagnostics available when setup is waiting", async () => {
    render(<ClientSupport tool="claude" apiKey="test-key" setupBusy />);
    fireEvent.click(screen.getByRole("button", { name: "自检" }));
    await screen.findByText("未验证实际运行");
    expect(screen.getByText(/配置操作仍在进行/)).toBeInTheDocument();
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("runs read-only diagnostics on demand and labels unverified launch correctly", async () => {
    render(<ClientSupport tool="claude" apiKey="test-key" />);
    fireEvent.click(screen.getByRole("button", { name: "自检" }));
    await screen.findByText("未验证实际运行");
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith("run_client_self_check", {
      tool: "claude",
      apiKey: "test-key",
    });
    expect(screen.getByText("未验证", { exact: true })).toBeInTheDocument();
    expect(settingsApi.openExternal).not.toHaveBeenCalled();
  });

  it("allows feedback only after description and consent; preview and copied draft are redacted", async () => {
    render(
      <ClientSupport
        tool="codex"
        apiKey="test-secret-value"
        lastError="Authorization: Bearer test-secret-value"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "反馈" }));
    const submit = screen.getByRole("button", { name: "打开反馈草稿" });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText("问题描述"), {
      target: { value: "启动失败 test-secret-value" },
    });
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(submit);
    await waitFor(() =>
      expect(settingsApi.openExternal).toHaveBeenCalledTimes(1),
    );
    expect(vi.mocked(copyText).mock.calls[0][0]).not.toContain(
      "test-secret-value",
    );
    expect(vi.mocked(settingsApi.openExternal).mock.calls[0][0]).not.toContain(
      "test-secret-value",
    );
    expect(invoke).not.toHaveBeenCalled();
  });

  it("does not open a feedback page when clipboard preparation fails", async () => {
    vi.mocked(copyText).mockRejectedValue(new Error("clipboard blocked"));
    render(<ClientSupport tool="claude" apiKey="" />);
    fireEvent.click(screen.getByRole("button", { name: "反馈" }));
    fireEvent.change(screen.getByLabelText("问题描述"), {
      target: { value: "无法启动" },
    });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "打开反馈草稿" }));
    await waitFor(() => expect(copyText).toHaveBeenCalled());
    expect(settingsApi.openExternal).not.toHaveBeenCalled();
  });

  it("redacts native failures and enables retry", async () => {
    vi.mocked(invoke).mockRejectedValue("API_KEY=private-value");
    render(<ClientSupport tool="claude" apiKey="private-value" />);
    fireEvent.click(screen.getByRole("button", { name: "自检" }));
    expect(await screen.findByRole("alert")).not.toHaveTextContent(
      "private-value",
    );
    expect(screen.getByRole("button", { name: "重新自检" })).toBeEnabled();
  });
});
