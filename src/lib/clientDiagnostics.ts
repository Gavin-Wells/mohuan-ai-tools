export type DiagnosticTool = "claude" | "codex";
export type CheckStatus = "pass" | "warn" | "fail" | "skipped";
export interface DiagnosticReport {
  schema_version: number;
  tool: DiagnosticTool;
  client_version: string;
  platform: string;
  arch: string;
  captured_at: string;
  runtime: string | null;
  runtime_version: string | null;
  checks: { id: string; label: string; status: CheckStatus; detail: string }[];
}

export function redactDiagnosticText(
  value: string,
  secrets: string[] = [],
): string {
  let text = value;
  for (const secret of secrets
    .map((s) => s.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)) {
    for (const encoded of [secret, encodeURIComponent(secret)]) {
      text = text.split(encoded).join("[REDACTED]");
    }
  }
  return text
    .replace(
      /(authorization["']?\s*[:=]\s*["']?)(?:Bearer|Basic)\s+[^\s"',;}]+/gi,
      "$1[REDACTED]",
    )
    .replace(
      /\b(?:sk-[A-Za-z0-9_-]{6,}|gh[pousr]_[A-Za-z0-9_]{8,}|github_pat_[A-Za-z0-9_]{8,})\b/g,
      "[REDACTED]",
    )
    .replace(
      /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
      "[REDACTED]",
    )
    .replace(
      /((?:["']?)(?:[A-Z_]*(?:API_KEY|AUTH_TOKEN|ACCESS_TOKEN|SECRET)|api[_-]?key|password|authorization|token)["']?\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;}]+)/gi,
      "$1[REDACTED]",
    )
    .replace(/https?:\/\/[^\s"'<>]+/gi, (value) => {
      try {
        const url = new URL(value);
        url.username = "";
        url.password = "";
        url.search = "";
        url.hash = "";
        return url.toString();
      } catch {
        return "[URL REDACTED]";
      }
    })
    .replace(
      /\/(?:Users|home)\/[^/\s"']+|\/root(?=\/|\s|$)|[A-Z]:[\\/]Users[\\/][^\\/\s"']+/gi,
      "<HOME>",
    )
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[EMAIL]");
}

export function diagnosticFeedback({
  tool,
  description,
  lastError,
  report,
  secrets,
}: {
  tool: DiagnosticTool;
  description: string;
  lastError: string;
  report: DiagnosticReport | null;
  secrets: string[];
}): string {
  // Explicit fields prevent extra native/configuration properties from being exported.
  const safeReport = report
    ? {
        schema_version: report.schema_version,
        tool: report.tool,
        client_version: report.client_version,
        platform: report.platform,
        arch: report.arch,
        captured_at: report.captured_at,
        runtime: report.runtime,
        runtime_version: report.runtime_version,
        checks: report.checks.map(({ id, label, status, detail }) => ({
          id,
          label,
          status,
          detail,
        })),
      }
    : null;
  return redactDiagnosticText(
    [
      `客户端：${tool === "claude" ? "Claude Code" : "Codex"}`,
      `问题描述：\n${description.trim() || "未填写"}`,
      `最近状态/错误：\n${lastError || "未记录"}`,
      safeReport
        ? `自检报告：\n${JSON.stringify(safeReport, null, 2)}`
        : "尚未执行自检。",
    ].join("\n\n"),
    secrets,
  );
}

export function feedbackUrl(tool: DiagnosticTool, body: string): string {
  const url = new URL(
    "https://github.com/Gavin-Wells/mohuan-ai-tools/issues/new",
  );
  url.searchParams.set(
    "title",
    `[客户端反馈] ${tool === "claude" ? "Claude Code" : "Codex"}`,
  );
  const chars = Array.from(body);
  let length = Math.min(chars.length, 1800);
  do {
    url.searchParams.set(
      "body",
      chars.slice(0, length).join("") +
        (length < chars.length ? "\n\n（完整报告已复制到剪贴板）" : ""),
    );
    if (url.toString().length <= 7000) break;
    length = Math.max(0, length - 100);
  } while (length > 0);
  return url.toString();
}

export async function diagnosticDeadline<T>(
  task: Promise<T>,
  ms = 50000,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      task,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("自检超时，请稍后重试或复制反馈信息")),
          ms,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
