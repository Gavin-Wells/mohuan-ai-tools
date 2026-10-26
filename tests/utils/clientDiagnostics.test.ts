import { describe, expect, it, vi } from "vitest";
import {
  diagnosticDeadline,
  diagnosticFeedback,
  feedbackUrl,
  redactDiagnosticText,
  type DiagnosticReport,
} from "@/lib/clientDiagnostics";

export const report: DiagnosticReport = {
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
      id: "installation",
      label: "客户端安装",
      status: "pass",
      detail: "已找到客户端运行环境",
    },
    {
      id: "launch",
      label: "启动状态",
      status: "skipped",
      detail: "未验证客户端进程是否运行",
    },
  ],
};

describe("client diagnostics privacy", () => {
  it("redacts secrets, credential assignments, URLs, emails and home directories", () => {
    const value = redactDiagnosticText(
      `sk-ploy-private123 ANTHROPIC_AUTH_TOKEN="unknown-value" password=not-a-key Authorization: Bearer opaque-token eyJabc.eyJdef.signature\n/Users/alice/.claude/settings.json C:\\Users\\Alice\\.codex\\auth.json alice@example.com https://user:pass@example.com/path?key=private#token\ncustom-credential`,
      ["custom-credential"],
    );
    for (const secret of [
      "private123",
      "unknown-value",
      "not-a-key",
      "opaque-token",
      "eyJabc",
      "alice",
      "Alice",
      "user:pass",
      "?key=",
      "#token",
      "custom-credential",
    ]) {
      expect(value).not.toContain(secret);
    }
    expect(value).toContain("<HOME>");
  });

  it("only exports approved report properties and redacts the user's description", () => {
    const text = diagnosticFeedback({
      tool: "claude",
      description: "bad key sk-test-secret123",
      lastError: "token=opaque",
      report: { ...report, privateConfig: "hidden" } as DiagnosticReport,
      secrets: [],
    });
    expect(text).not.toContain("privateConfig");
    expect(text).not.toContain("hidden");
    expect(text).not.toContain("secret123");
    expect(text).not.toContain("opaque");
    expect(text).toContain("未验证客户端进程");
  });

  it("keeps GitHub feedback URLs bounded and targets only this project", () => {
    const url = new URL(feedbackUrl("codex", "错误".repeat(5000)));
    expect(url.origin).toBe("https://github.com");
    expect(url.pathname).toBe("/Gavin-Wells/mohuan-ai-tools/issues/new");
    expect(url.toString().length).toBeLessThanOrEqual(7000);
    expect(url.searchParams.get("body")).toContain("完整报告已复制");
  });

  it("bounds an unresponsive native operation and clears its timer", async () => {
    vi.useFakeTimers();
    try {
      const pending = expect(
        diagnosticDeadline(new Promise(() => {}), 100),
      ).rejects.toThrow("自检超时");
      await vi.advanceTimersByTimeAsync(100);
      await pending;
      expect(vi.getTimerCount()).toBe(0);
      await expect(diagnosticDeadline(Promise.resolve("ok"))).resolves.toBe(
        "ok",
      );
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
