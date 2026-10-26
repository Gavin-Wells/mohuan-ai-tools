import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MinusCircle,
  Loader2,
  Stethoscope,
  MessageSquare,
  Copy,
  ExternalLink,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { copyText } from "@/lib/clipboard";
import { settingsApi } from "@/lib/api/settings";
import {
  diagnosticDeadline,
  diagnosticFeedback,
  feedbackUrl,
  redactDiagnosticText,
  type CheckStatus,
  type DiagnosticReport,
  type DiagnosticTool,
} from "@/lib/clientDiagnostics";

const statusIcons = {
  pass: CheckCircle2,
  warn: AlertTriangle,
  fail: XCircle,
  skipped: MinusCircle,
};
const statusLabels: Record<CheckStatus, string> = {
  pass: "通过",
  warn: "待核对",
  fail: "异常",
  skipped: "未验证",
};

export function ClientSupport({
  tool,
  apiKey,
  lastError = "",
  setupBusy = false,
}: {
  tool: DiagnosticTool;
  apiKey: string;
  lastError?: string;
  setupBusy?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [error, setError] = useState("");
  const [description, setDescription] = useState("");
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const sequence = useRef(0);
  const inFlight = useRef(false);

  useEffect(() => {
    sequence.current++;
    inFlight.current = false;
    setRunning(false);
    setReport(null);
    setError("");
    setConsent(false);
    return () => {
      sequence.current++;
    };
  }, [tool, apiKey]);

  const body = diagnosticFeedback({
    tool,
    description,
    lastError: error || lastError,
    report,
    secrets: [apiKey],
  });
  const failed =
    report?.checks.filter((check) => check.status === "fail").length ?? 0;
  const pending =
    report?.checks.filter(
      (check) => check.status === "warn" || check.status === "skipped",
    ).length ?? 0;

  async function run() {
    if (inFlight.current) return;
    inFlight.current = true;
    const id = ++sequence.current;
    setRunning(true);
    setError("");
    setReport(null);
    setConsent(false);
    try {
      const result = await diagnosticDeadline(
        invoke<DiagnosticReport>("run_client_self_check", {
          tool,
          apiKey: apiKey.trim() || null,
        }),
      );
      if (id !== sequence.current) return;
      setReport(result);
    } catch (cause) {
      if (id !== sequence.current) return;
      setError(
        redactDiagnosticText(
          cause instanceof Error ? cause.message : String(cause),
          [apiKey],
        ),
      );
    } finally {
      if (id === sequence.current) {
        inFlight.current = false;
        setRunning(false);
      }
    }
  }

  async function copy() {
    try {
      await copyText(body);
      toast.success("脱敏反馈信息已复制");
    } catch {
      toast.error("复制失败，请从反馈预览中手动选择文本");
    }
  }

  async function feedback() {
    if (!consent || !description.trim() || running || sending) return;
    setSending(true);
    try {
      await copyText(body);
      await settingsApi.openExternal(feedbackUrl(tool, body));
      toast.success("已打开反馈草稿，尚未提交");
    } catch {
      toast.error("无法打开反馈页面，可复制反馈信息联系支持");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-2 border-t border-border pt-3">
        <Button
          variant="ghost"
          size="sm"
          disabled={running}
          onClick={() => {
            setOpen(true);
            void run();
          }}
        >
          <Stethoscope className="mr-1.5 h-4 w-4" />
          自检
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <MessageSquare className="mr-1.5 h-4 w-4" />
          反馈
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-xl max-h-[85dvh] overflow-hidden rounded-lg">
          <DialogHeader className="relative">
            <DialogTitle className="pr-7 tracking-normal">
              {tool === "claude" ? "Claude Code" : "Codex"} 自检与反馈
            </DialogTitle>
            <DialogDescription>
              报告不包含 API
              Key、聊天内容或完整配置文件。反馈需确认后才会带入公开的 GitHub
              页面。
            </DialogDescription>
            <DialogClose asChild>
              <button
                type="button"
                aria-label="关闭自检与反馈"
                title="关闭"
                className="absolute top-4 right-4 p-1 rounded hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogClose>
          </DialogHeader>
          <div className="space-y-4 min-w-0 min-h-0 overflow-y-auto p-4">
            {setupBusy && (
              <p role="status" className="text-xs text-muted-foreground">
                配置操作仍在进行，报告反映自检时的状态
              </p>
            )}
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs min-w-0" role="status">
                {running
                  ? "正在执行只读自检…"
                  : report
                    ? `${report.checks.length} 项检查，${failed} 项异常，${pending} 项待核对`
                    : "尚未完成自检"}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={running}
                onClick={() => void run()}
              >
                {running ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Stethoscope className="mr-1.5 h-4 w-4" />
                )}
                {running ? "自检中" : "重新自检"}
              </Button>
            </div>
            {error && (
              <p role="alert" className="text-sm text-red-600 break-words">
                {error}
              </p>
            )}
            {report && (
              <ul className="divide-y divide-border" aria-label="自检结果">
                {report.checks.map((check) => {
                  const Icon = statusIcons[check.status] ?? MinusCircle;
                  return (
                    <li
                      key={check.id}
                      className="flex gap-2 py-2 text-sm min-w-0"
                    >
                      <Icon
                        aria-hidden="true"
                        className={`h-4 w-4 shrink-0 mt-0.5 ${check.status === "fail" ? "text-red-500" : check.status === "pass" ? "text-green-600" : "text-muted-foreground"}`}
                      />
                      <div className="min-w-0">
                        <div className="font-medium">
                          {check.label}
                          <span className="ml-2 text-xs text-muted-foreground">
                            {statusLabels[check.status]}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground break-words">
                          {redactDiagnosticText(check.detail, [apiKey])}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="space-y-1.5">
              <label
                htmlFor={`${tool}-feedback-description`}
                className="text-sm font-medium"
              >
                问题描述
              </label>
              <textarea
                id={`${tool}-feedback-description`}
                rows={3}
                maxLength={2000}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setConsent(false);
                }}
                className="w-full rounded-md border border-input bg-background p-2 text-sm"
              />
            </div>
            <details className="text-sm">
              <summary className="cursor-pointer">脱敏反馈预览</summary>
              <textarea
                aria-label="脱敏反馈预览"
                readOnly
                rows={6}
                value={body}
                className="mt-2 w-full rounded-md border border-input bg-muted p-2 text-xs font-mono"
              />
            </details>
            <label className="flex gap-2 items-start text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 shrink-0"
              />
              同意将问题描述和脱敏报告带入公开的 GitHub 反馈草稿
            </label>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                disabled={running}
                onClick={() => void copy()}
              >
                <Copy className="mr-1.5 h-4 w-4" />
                复制反馈
              </Button>
              <Button
                disabled={!consent || !description.trim() || running || sending}
                onClick={() => void feedback()}
              >
                {sending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="mr-1.5 h-4 w-4" />
                )}
                打开反馈草稿
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
