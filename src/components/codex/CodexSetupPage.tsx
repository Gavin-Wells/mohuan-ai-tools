import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import {
  Rocket, KeyRound, RotateCcw, CheckCircle2, XCircle,
  Loader2, Eye, EyeOff, Wallet, Activity, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { providersApi } from "@/lib/api";
import type { Provider } from "@/types";
import {
  generateThirdPartyAuth,
  generateThirdPartyConfig,
} from "@/config/codexProviderPresets";
import { MOHUAN_GATEWAY_V1, MOHUAN_DEFAULT_CHAT_MODEL } from "@/config/mohuanGateway";

type Status = "idle" | "checking" | "valid" | "invalid" | "writing" | "done";

interface Billing {
  balance: number;
  currency: string;
  today: { requests: number; cost: number; input_tokens: number; output_tokens: number };
  this_month: { requests: number; cost: number; input_tokens: number; output_tokens: number };
}

interface CodexSetupPageProps {
  providers: Record<string, Provider>;
  onProvidersChanged: () => void;
}

const fmt = (n: number, c: string) => `${c === "CNY" ? "¥" : "$"}${n.toFixed(2)}`;
const fmtTk = (n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n);

async function launchCodex() {
  try {
    await invoke("open_terminal_with_command", { command: "open -a Codex" });
  } catch {
    try {
      await invoke("run_shell_command", { command: "open -a Codex" });
    } catch {
      window.open("codex://", "_blank");
    }
  }
}

export function CodexSetupPage({ providers, onProvidersChanged }: CodexSetupPageProps) {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [billing, setBilling] = useState<Billing | null>(null);

  const providerList = useMemo(() => Object.values(providers), [providers]);
  const existing = providerList[0];

  const extractKey = useCallback((p: Provider | undefined) => {
    if (!p) return "";
    try {
      const sc = typeof p.settingsConfig === "string" ? JSON.parse(p.settingsConfig) : p.settingsConfig ?? {};
      return sc?.auth?.OPENAI_API_KEY || "";
    } catch { return ""; }
  }, []);

  const fetchBilling = useCallback(async (key: string) => {
    if (!key.trim()) return;
    try {
      const res = await fetch(`${MOHUAN_GATEWAY_V1}/me`, { headers: { Authorization: `Bearer ${key.trim()}` } });
      if (res.ok) { const d = await res.json(); setBilling(d.billing); }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    const key = extractKey(existing);
    if (key) {
      setApiKey(key);
      setStatus("done");
      setStatusMsg(t("codexSetup.alreadyConfigured", { defaultValue: "Codex 已配置，可直接使用" }));
      fetchBilling(key);
    }
  }, [existing, extractKey, fetchBilling, t]);

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
      const auth = generateThirdPartyAuth(k);
      const config = generateThirdPartyConfig("openai_custom", MOHUAN_GATEWAY_V1, MOHUAN_DEFAULT_CHAT_MODEL);
      if (existing) {
        await providersApi.update({ ...existing, settingsConfig: { auth, config } as Record<string, any> }, "codex", existing.id);
        await providersApi.switch(existing.id, "codex");
      } else {
        const np: Provider = { id: crypto.randomUUID(), name: "Codex", category: "third_party", settingsConfig: { auth, config } as Record<string, any>, notes: "", websiteUrl: "", sortIndex: 0 };
        await providersApi.add(np, "codex");
        await providersApi.switch(np.id, "codex");
      }
      onProvidersChanged();
      fetchBilling(k);
      await launchCodex();
      setStatus("done"); setStatusMsg("配置完成，Codex 已启动");
      toast.success("Codex 已启动");
    } catch (err) {
      setStatus("invalid");
      setStatusMsg(`配置失败: ${err instanceof Error ? err.message : String(err)}`);
      toast.error("配置写入失败");
    }
  }, [apiKey, existing, fetchBilling, onProvidersChanged]);

  const handleRestore = useCallback(async () => {
    setStatus("writing"); setStatusMsg("正在还原...");
    try {
      for (const p of providerList) await providersApi.delete(p.id, "codex");
      onProvidersChanged(); setApiKey(""); setBilling(null);
      setStatus("idle"); setStatusMsg("已还原为官方默认设置");
      toast.success("Codex 设置已还原");
    } catch (err) {
      setStatus("invalid");
      setStatusMsg(`还原失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [providerList, onProvidersChanged]);

  const isLoading = status === "checking" || status === "writing";

  return (
    <div className="px-6 flex flex-col flex-1 min-h-0">
      <div className="max-w-md mx-auto w-full flex flex-col justify-center flex-1 gap-5 py-4">
        {/* Header — compact */}
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold text-foreground">Codex 快速配置</h1>
          <p className="text-xs text-muted-foreground">输入 API Key，一键配置并启动 Codex</p>
        </div>

        {/* Key input */}
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

        {/* Status */}
        {statusMsg && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-xs">
            {(status === "checking" || status === "writing") && <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />}
            {(status === "valid" || status === "done") && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
            {status === "invalid" && <XCircle className="h-3.5 w-3.5 text-red-500" />}
            <span className={status === "invalid" ? "text-red-500" : (status === "valid" || status === "done") ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>{statusMsg}</span>
          </div>
        )}

        {/* Buttons — 3 in a row */}
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" onClick={handleVerify} disabled={isLoading || !apiKey.trim()} className="h-10 text-xs font-medium">
            {status === "checking" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <KeyRound className="mr-1.5 h-3.5 w-3.5" />}
            验证 Key
          </Button>
          <Button onClick={handleLaunch} disabled={isLoading || !apiKey.trim()} className="h-10 text-xs font-semibold bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white shadow-sm">
            {status === "writing" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Rocket className="mr-1.5 h-3.5 w-3.5" />}
            一键启动
          </Button>
          <Button variant="outline" onClick={handleRestore} disabled={isLoading || providerList.length === 0} className="h-10 text-xs font-medium text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-950">
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            还原设置
          </Button>
        </div>

        {/* Usage — compact */}
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
