import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Rocket,
  KeyRound,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Wallet,
  Activity,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { providersApi } from "@/lib/api";
import type { Provider } from "@/types";
import {
  generateThirdPartyAuth,
  generateThirdPartyConfig,
} from "@/config/codexProviderPresets";
import {
  MOHUAN_GATEWAY_V1,
  MOHUAN_DEFAULT_CHAT_MODEL,
} from "@/config/mohuanGateway";

type SetupStatus = "idle" | "checking" | "valid" | "invalid" | "writing" | "done";

interface BillingInfo {
  balance: number;
  currency: string;
  today: { requests: number; cost: number; input_tokens: number; output_tokens: number };
  this_month: { requests: number; cost: number; input_tokens: number; output_tokens: number };
}

interface AccountInfo {
  user: { username: string };
  billing: BillingInfo;
}

interface CodexSetupPageProps {
  providers: Record<string, Provider>;
  onProvidersChanged: () => void;
}

function formatCurrency(amount: number, currency: string): string {
  const symbol = currency === "CNY" ? "¥" : "$";
  return `${symbol}${amount.toFixed(2)}`;
}

function formatTokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

export function CodexSetupPage({
  providers,
  onProvidersChanged,
}: CodexSetupPageProps) {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<SetupStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(false);

  const providerList = useMemo(() => Object.values(providers), [providers]);
  const existingProvider = providerList[0];

  const extractKey = useCallback((provider: Provider | undefined): string => {
    if (!provider) return "";
    try {
      const sc =
        typeof provider.settingsConfig === "string"
          ? JSON.parse(provider.settingsConfig)
          : provider.settingsConfig ?? {};
      return sc?.auth?.OPENAI_API_KEY || "";
    } catch {
      return "";
    }
  }, []);

  const fetchAccountInfo = useCallback(async (key: string) => {
    if (!key.trim()) return;
    setLoadingAccount(true);
    try {
      const res = await fetch(`${MOHUAN_GATEWAY_V1}/me`, {
        headers: { Authorization: `Bearer ${key.trim()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAccountInfo(data);
      }
    } catch {
      // silently ignore — usage panel just won't show
    } finally {
      setLoadingAccount(false);
    }
  }, []);

  useEffect(() => {
    const key = extractKey(existingProvider);
    if (key) {
      setApiKey(key);
      setStatus("done");
      setStatusMessage(
        t("codexSetup.alreadyConfigured", { defaultValue: "Codex 已配置，可直接使用" }),
      );
      fetchAccountInfo(key);
    }
  }, [existingProvider, extractKey, fetchAccountInfo, t]);

  const testApiKey = useCallback(async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      toast.error(t("codexSetup.pleaseEnterKey", { defaultValue: "请先输入 API Key" }));
      return;
    }

    setStatus("checking");
    setStatusMessage(t("codexSetup.verifying", { defaultValue: "正在验证 Key..." }));

    try {
      const res = await fetch(`${MOHUAN_GATEWAY_V1}/me`, {
        headers: { Authorization: `Bearer ${trimmed}` },
      });

      if (res.ok) {
        const data = await res.json();
        setAccountInfo(data);
        setStatus("valid");
        setStatusMessage(
          t("codexSetup.keyValid", { defaultValue: "Key 验证通过，可以一键启动" }),
        );
        toast.success(t("codexSetup.keyValidToast", { defaultValue: "API Key 有效" }));
      } else {
        setStatus("invalid");
        setStatusMessage(
          t("codexSetup.keyInvalid", { defaultValue: `Key 无效（${res.status}）：请检查后重试` }),
        );
        toast.error(t("codexSetup.keyInvalidToast", { defaultValue: `验证失败: HTTP ${res.status}` }));
      }
    } catch {
      setStatus("invalid");
      setStatusMessage(
        t("codexSetup.networkError", { defaultValue: "网络错误，请检查网络连接后重试" }),
      );
      toast.error(t("codexSetup.networkErrorToast", { defaultValue: "网络连接失败" }));
    }
  }, [apiKey, t]);

  const handleOneClickSetup = useCallback(async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      toast.error(t("codexSetup.pleaseEnterKey", { defaultValue: "请先输入 API Key" }));
      return;
    }

    setStatus("writing");
    setStatusMessage(t("codexSetup.configuring", { defaultValue: "正在配置 Codex..." }));

    try {
      const auth = generateThirdPartyAuth(trimmed);
      const config = generateThirdPartyConfig("openai_custom", MOHUAN_GATEWAY_V1, MOHUAN_DEFAULT_CHAT_MODEL);

      if (existingProvider) {
        const updated: Provider = {
          ...existingProvider,
          settingsConfig: { auth, config } as Record<string, any>,
        };
        await providersApi.update(updated, "codex", existingProvider.id);
        await providersApi.switch(existingProvider.id, "codex");
      } else {
        const newProvider: Provider = {
          id: crypto.randomUUID(),
          name: "Codex",
          category: "third_party",
          settingsConfig: { auth, config } as Record<string, any>,
          notes: "",
          websiteUrl: "",
          sortIndex: 0,
        };
        await providersApi.add(newProvider, "codex");
        await providersApi.switch(newProvider.id, "codex");
      }

      onProvidersChanged();
      fetchAccountInfo(trimmed);
      setStatus("done");
      setStatusMessage(
        t("codexSetup.success", { defaultValue: "配置成功！Codex 已就绪，可以开始使用" }),
      );
      toast.success(t("codexSetup.successToast", { defaultValue: "Codex 一键配置完成" }));
    } catch (err) {
      setStatus("invalid");
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMessage(t("codexSetup.configError", { defaultValue: `配置失败: ${msg}` }));
      toast.error(t("codexSetup.configErrorToast", { defaultValue: "配置写入失败" }));
    }
  }, [apiKey, existingProvider, fetchAccountInfo, onProvidersChanged, t]);

  const handleRestore = useCallback(async () => {
    setStatus("writing");
    setStatusMessage(t("codexSetup.restoring", { defaultValue: "正在还原为官方默认设置..." }));

    try {
      for (const p of providerList) {
        await providersApi.delete(p.id, "codex");
      }

      onProvidersChanged();
      setApiKey("");
      setAccountInfo(null);
      setStatus("idle");
      setStatusMessage(t("codexSetup.restored", { defaultValue: "已还原为官方默认设置" }));
      toast.success(t("codexSetup.restoredToast", { defaultValue: "Codex 设置已还原" }));
    } catch (err) {
      setStatus("invalid");
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMessage(t("codexSetup.restoreError", { defaultValue: `还原失败: ${msg}` }));
      toast.error(t("codexSetup.restoreErrorToast", { defaultValue: "还原设置失败" }));
    }
  }, [providerList, onProvidersChanged, t]);

  const statusIcon = () => {
    switch (status) {
      case "checking":
      case "writing":
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case "valid":
      case "done":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "invalid":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const isLoading = status === "checking" || status === "writing";
  const billing = accountInfo?.billing;

  return (
    <div className="px-6 flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-12 px-1">
        <div className="max-w-lg mx-auto mt-12 space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg">
              <Rocket className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {t("codexSetup.title", { defaultValue: "Codex 快速配置" })}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("codexSetup.description", {
                defaultValue: "输入你的 API Key，一键完成配置，即可开始使用 Codex",
              })}
            </p>
          </div>

          {/* API Key Input */}
          <div className="space-y-3">
            <label htmlFor="codex-api-key" className="block text-sm font-medium text-foreground">
              API Key
            </label>
            <div className="relative">
              <Input
                id="codex-api-key"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  if (status === "valid" || status === "invalid") {
                    setStatus("idle");
                    setStatusMessage("");
                  }
                }}
                placeholder={t("codexSetup.keyPlaceholder", { defaultValue: "粘贴你的 API Key" })}
                className="h-12 text-base pr-10"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-muted/50 text-sm">
              {statusIcon()}
              <span
                className={
                  status === "invalid"
                    ? "text-red-500"
                    : status === "valid" || status === "done"
                      ? "text-green-600 dark:text-green-400"
                      : "text-muted-foreground"
                }
              >
                {statusMessage}
              </span>
            </div>
          )}

          {/* Usage / Balance Panel */}
          {billing && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Wallet className="h-4 w-4 text-teal-500" />
                {t("codexSetup.usageTitle", { defaultValue: "账户用量" })}
              </div>

              {/* Balance */}
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">
                  {formatCurrency(billing.balance, billing.currency)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {t("codexSetup.remainingBalance", { defaultValue: "剩余额度" })}
                </span>
              </div>

              {/* Today & Month stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Activity className="h-3 w-3" />
                    {t("codexSetup.today", { defaultValue: "今日用量" })}
                  </div>
                  <div className="text-lg font-semibold text-foreground">
                    {formatCurrency(billing.today.cost, billing.currency)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {billing.today.requests} {t("codexSetup.requests", { defaultValue: "次请求" })}
                    {" · "}
                    {formatTokens(billing.today.input_tokens + billing.today.output_tokens)} tokens
                  </div>
                </div>

                <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    {t("codexSetup.thisMonth", { defaultValue: "本月用量" })}
                  </div>
                  <div className="text-lg font-semibold text-foreground">
                    {formatCurrency(billing.this_month.cost, billing.currency)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {billing.this_month.requests} {t("codexSetup.requests", { defaultValue: "次请求" })}
                    {" · "}
                    {formatTokens(billing.this_month.input_tokens + billing.this_month.output_tokens)} tokens
                  </div>
                </div>
              </div>
            </div>
          )}

          {loadingAccount && !billing && (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("codexSetup.loadingUsage", { defaultValue: "加载用量信息..." })}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleOneClickSetup}
              disabled={isLoading || !apiKey.trim()}
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white shadow-md"
              size="lg"
            >
              {status === "writing" ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Rocket className="mr-2 h-5 w-5" />
              )}
              {t("codexSetup.oneClickStart", { defaultValue: "一键启动 Codex" })}
            </Button>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={testApiKey}
                disabled={isLoading || !apiKey.trim()}
                className="h-11 text-sm font-medium"
              >
                {status === "checking" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="mr-2 h-4 w-4" />
                )}
                {t("codexSetup.verifyKey", { defaultValue: "验证 Key" })}
              </Button>

              <Button
                variant="outline"
                onClick={handleRestore}
                disabled={isLoading || providerList.length === 0}
                className="h-11 text-sm font-medium text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-950"
              >
                {status === "writing" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="mr-2 h-4 w-4" />
                )}
                {t("codexSetup.restore", { defaultValue: "还原官方设置" })}
              </Button>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            {t("codexSetup.helpText", {
              defaultValue: "「一键启动」会自动配置 Codex，无需手动编辑任何文件",
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
