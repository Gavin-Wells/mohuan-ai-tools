import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import {
  Rocket, KeyRound, RotateCcw, CheckCircle2, XCircle,
  Loader2, Eye, EyeOff, Wallet, Activity, TrendingUp,
  Download, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateThirdPartyConfig } from "@/config/codexProviderPresets";
import { MOHUAN_GATEWAY_V1 } from "@/config/mohuanGateway";

const CODEX_DEFAULT_MODEL = "gpt-5.5";

type Status = "idle" | "checking" | "valid" | "invalid" | "writing" | "done";
type InstallStatus = "checking" | "installed" | "not_installed" | "installing";

interface Billing {
  balance: number;
  currency: string;
  today: { requests: number; cost: number; input_tokens: number; output_tokens: number };
  this_month: { requests: number; cost: number; input_tokens: number; output_tokens: number };
}

interface CodexSetupPageProps {
  providers: Record<string, import("@/types").Provider>;
  onProvidersChanged: () => void;
}

const fmt = (n: number, c: string) => `${c === "CNY" ? "¥" : "$"}${n.toFixed(2)}`;
const fmtTk = (n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n);

function readSavedKey(): string {
  try { return localStorage.getItem("codex_api_key") ?? ""; } catch { return ""; }
}

export function CodexSetupPage({ providers: _providers, onProvidersChanged: _onProvidersChanged }: CodexSetupPageProps) {
  const [apiKey, setApiKey] = useState(readSavedKey);
  const [status, setStatus] = useState<Status>(() => readSavedKey() ? "done" : "idle");
  const [statusMsg, setStatusMsg] = useState(() => readSavedKey() ? "已配置，可直接启动 Codex" : "");
  const [showKey, setShowKey] = useState(false);
  const [billing, setBilling] = useState<Billing | null>(null);

  const [installStatus, setInstallStatus] = useState<InstallStatus>("checking");
  const [codexPath, setCodexPath] = useState<string | null>(null);
  const autoInstallStarted = useRef(false);

  const applyInstallResult = useCallback(
    (result: { installed: boolean; path: string | null }) => {
      if (result.installed) {
        setInstallStatus("installed");
        setCodexPath(result.path);
      } else {
        setInstallStatus("not_installed");
      }
    },
    [],
  );

  const checkInstall = useCallback(async () => {
    setInstallStatus("checking");
    try {
      const result = await invoke<{ installed: boolean; path: string | null }>("check_codex_installed");
      applyInstallResult(result);
      return result;
    } catch {
      setInstallStatus("not_installed");
      return { installed: false, path: null };
    }
  }, [applyInstallResult]);

  const runInstall = useCallback(async () => {
    setInstallStatus("installing");
    try {
      const msg = await invoke<string>("install_codex_cli");
      toast.success(msg || "Codex 安装完成");
      const result = await invoke<{ installed: boolean; path: string | null }>("check_codex_installed");
      applyInstallResult(result);
      if (!result.installed) {
        toast.message("安装脚本已执行，若仍未检测到请稍候后点击「重新检测」");
      }
    } catch (err) {
      setInstallStatus("not_installed");
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }, [applyInstallResult]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await checkInstall();
      if (cancelled || result.installed || autoInstallStarted.current) return;
      autoInstallStarted.current = true;
      await runInstall();
    })();
    return () => {
      cancelled = true;
    };
  }, [checkInstall, runInstall]);

  const fetchBilling = useCallback(async (key: string) => {
    if (!key.trim()) return;
    try {
      const res = await fetch(`${MOHUAN_GATEWAY_V1}/me`, { headers: { Authorization: `Bearer ${key.trim()}` } });
      if (res.ok) { const d = await res.json(); setBilling(d.billing); }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    const k = readSavedKey();
    if (k) fetchBilling(k);
  }, [fetchBilling]);

  const handleVerify = useCallback(async () => {
    const k = apiKey.trim();
    if (!k) { toast.error("请先输入 API Key"); return; }
    setStatus("checking"); setStatusMsg("正在验证 Key...");
    try {
      const res = await fetch(`${MOHUAN_GATEWAY_V1}/me`, { headers: { Authorization: `Bearer ${k}` } });
      if (res.ok) {
        const d = await res.json(); setBilling(d.billing);
        setStatus("valid"); setStatusMsg("Key 验证通过");
        toast.success("API Key 有效");
      } else {
        setStatus("invalid"); setStatusMsg(`Key 无效（${res.status}）`);
        toast.error(`验证失败: HTTP ${res.status}`);
      }
    } catch {
      setStatus("invalid"); setStatusMsg("网络错误，请检查连接");
      toast.error("网络连接失败");
    }
  }, [apiKey]);

  const handleLaunch = useCallback(async () => {
    const k = apiKey.trim();
    if (!k) { toast.error("请先输入 API Key"); return; }
    setStatus("writing"); setStatusMsg("正在配置并启动 Codex...");
    try {
      const configToml = generateThirdPartyConfig("openai_custom", MOHUAN_GATEWAY_V1, CODEX_DEFAULT_MODEL);
      const msg: string = await invoke("setup_and_launch_codex", { apiKey: k, configToml });
      localStorage.setItem("codex_api_key", k);
      fetchBilling(k);
      setStatus("done"); setStatusMsg(msg);
      toast.success("Codex 已启动");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setStatus("invalid");
      setStatusMsg(`启动失败: ${errMsg}`);
      toast.error(errMsg);
    }
  }, [apiKey, fetchBilling]);

  const handleRestore = useCallback(async () => {
    setStatus("writing"); setStatusMsg("正在还原...");
    try {
      await invoke("restore_codex_defaults");
      localStorage.removeItem("codex_api_key");
      setApiKey(""); setBilling(null);
      setStatus("idle"); setStatusMsg("已还原为官方默认设置");
      toast.success("Codex 设置已还原");
    } catch (err) {
      setStatus("invalid");
      setStatusMsg(`还原失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);

  const isLoading = status === "checking" || status === "writing";
  const codexReady = installStatus === "installed";

  return (
    <div className="px-6 flex flex-col flex-1 min-h-0">
      <div className="max-w-md mx-auto w-full flex flex-col justify-center flex-1 gap-4 py-4">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold text-foreground">Codex 快速配置</h1>
          <p className="text-xs text-muted-foreground">
            输入 API Key，一键配置并启动 Codex（默认模型: <code className="px-1 py-0.5 rounded bg-muted text-[11px]">{CODEX_DEFAULT_MODEL}</code>）
          </p>
        </div>

        {installStatus === "checking" && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/50 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            正在检测 Codex...
          </div>
        )}
        {installStatus === "installing" && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/50 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            正在自动安装 Codex...
          </div>
        )}
        {installStatus === "installed" && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-green-50 dark:bg-green-950/30 text-xs text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>Codex 已安装{codexPath ? `: ${codexPath}` : ""}</span>
          </div>
        )}
        {installStatus === "not_installed" && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-3 py-2.5 space-y-2">
            <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>未检测到 Codex，可重试自动安装</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={runInstall}
                className="flex-1 h-8 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Download className="mr-1.5 h-3 w-3" />
                重新安装
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={checkInstall}
                className="h-8 text-xs font-medium"
              >
                重新检测
              </Button>
            </div>
          </div>
        )}

        <div className="relative">
          <Input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => { setApiKey(e.target.value); if (status === "valid" || status === "invalid") { setStatus("idle"); setStatusMsg(""); } }}
            placeholder="粘贴你的 API Key"
            className="h-11 text-sm pr-10"
            disabled={isLoading}
          />
          <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {statusMsg && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-xs">
            {(status === "checking" || status === "writing") && <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />}
            {(status === "valid" || status === "done") && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
            {status === "invalid" && <XCircle className="h-3.5 w-3.5 text-red-500" />}
            <span className={status === "invalid" ? "text-red-500" : (status === "valid" || status === "done") ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>{statusMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" onClick={handleVerify} disabled={isLoading || !apiKey.trim()} className="h-10 text-xs font-medium">
            {status === "checking" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <KeyRound className="mr-1.5 h-3.5 w-3.5" />}
            验证 Key
          </Button>
          <Button
            onClick={handleLaunch}
            disabled={isLoading || !apiKey.trim() || !codexReady}
            title={!codexReady ? "请先安装 Codex" : ""}
            className="h-10 text-xs font-semibold bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white shadow-sm"
          >
            {status === "writing" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Rocket className="mr-1.5 h-3.5 w-3.5" />}
            一键启动
          </Button>
          <Button variant="outline" onClick={handleRestore} disabled={isLoading} className="h-10 text-xs font-medium text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-950">
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            还原设置
          </Button>
        </div>

        {billing && (
          <div className="rounded-lg border border-border bg-card px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Wallet className="h-3.5 w-3.5 text-teal-500" />
                剩余额度
              </div>
              <span className="text-lg font-bold text-foreground">{fmt(billing.balance, billing.currency)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded bg-muted/50 px-2.5 py-1.5">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><Activity className="h-2.5 w-2.5" />今日</div>
                <div className="text-sm font-semibold">{fmt(billing.today.cost, billing.currency)}</div>
                <div className="text-[10px] text-muted-foreground">{billing.today.requests}次 · {fmtTk(billing.today.input_tokens + billing.today.output_tokens)}tk</div>
              </div>
              <div className="rounded bg-muted/50 px-2.5 py-1.5">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><TrendingUp className="h-2.5 w-2.5" />本月</div>
                <div className="text-sm font-semibold">{fmt(billing.this_month.cost, billing.currency)}</div>
                <div className="text-[10px] text-muted-foreground">{billing.this_month.requests}次 · {fmtTk(billing.this_month.input_tokens + billing.this_month.output_tokens)}tk</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
