import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import {
  RefreshCw,
  Wallet,
  Activity,
  Clock,
  Terminal,
  LogIn,
  LogOut,
  Loader2,
  BarChart3,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  mohuanApi,
  type MohuanUser,
  type MohuanUsageStats,
} from "@/lib/api/mohuan";
import { MOHUAN_WEB_URL } from "@/config/mohuanGateway";

const TOKEN_KEY = "mohuan:jwt";
const USER_KEY = "mohuan:user";

function loadSaved(): { token: string | null; user: MohuanUser | null } {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const raw = localStorage.getItem(USER_KEY);
    const user = raw ? (JSON.parse(raw) as MohuanUser) : null;
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

export function MohuanDashboard() {
  const { t } = useTranslation();

  const [token, setToken] = useState<string | null>(
    () => loadSaved().token,
  );
  const [user, setUser] = useState<MohuanUser | null>(
    () => loadSaved().user,
  );
  const [stats, setStats] = useState<MohuanUsageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });

  const persist = useCallback((t: string, u: MohuanUser) => {
    localStorage.setItem(TOKEN_KEY, t);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setToken(t);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    setStats(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [me, st] = await Promise.all([
        mohuanApi.getMe(token),
        mohuanApi.getUsageStats(token, 30),
      ]);
      setUser(me);
      setStats(st);
      localStorage.setItem(USER_KEY, JSON.stringify(me));
    } catch (err: any) {
      if (err?.message?.includes("401")) {
        logout();
        toast.error("登录已过期，请重新登录");
      } else {
        toast.error(`刷新失败: ${err?.message ?? err}`);
      }
    } finally {
      setLoading(false);
    }
  }, [token, logout]);

  useEffect(() => {
    if (token) refresh();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = async () => {
    if (!loginForm.username || !loginForm.password) return;
    setLoading(true);
    try {
      const result = await mohuanApi.login(
        loginForm.username,
        loginForm.password,
      );
      persist(result.access_token, result.user);
      toast.success("登录成功");
      setLoginForm({ username: "", password: "" });
    } catch (err: any) {
      toast.error(`登录失败: ${err?.message ?? err}`);
    } finally {
      setLoading(false);
    }
  };

  const launchCli = async (cmd: string) => {
    try {
      await invoke("plugin:shell|spawn", {
        program: cmd,
        args: [],
      });
      toast.success(`已启动 ${cmd}`);
    } catch {
      try {
        await invoke("open_terminal_with_command", { command: cmd });
        toast.success(`已启动 ${cmd}`);
      } catch (e: any) {
        toast.error(`启动失败: ${e?.message ?? e}`);
      }
    }
  };

  // --- Not logged in: show login form ---
  if (!token || !user) {
    return (
      <div className="space-y-6 p-4 max-w-md mx-auto">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold">硅基链路控制台</h2>
          <p className="text-sm text-muted-foreground">
            登录{" "}
            <a
              href={MOHUAN_WEB_URL}
              target="_blank"
              rel="noreferrer"
              className="text-blue-500 hover:underline"
            >
              modelswitch.org
            </a>{" "}
            账号查看余额与用量
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>用户名</Label>
            <Input
              value={loginForm.username}
              onChange={(e) =>
                setLoginForm((f) => ({ ...f, username: e.target.value }))
              }
              placeholder="用户名"
              autoComplete="username"
            />
          </div>
          <div className="space-y-2">
            <Label>密码</Label>
            <Input
              type="password"
              value={loginForm.password}
              onChange={(e) =>
                setLoginForm((f) => ({ ...f, password: e.target.value }))
              }
              placeholder="密码"
              autoComplete="current-password"
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>
          <Button
            className="w-full"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4 mr-2" />
            )}
            登录
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            没有账号？前往{" "}
            <a
              href={MOHUAN_WEB_URL}
              target="_blank"
              rel="noreferrer"
              className="text-blue-500 hover:underline"
            >
              modelswitch.org
            </a>{" "}
            注册
          </p>
        </div>
      </div>
    );
  }

  // --- Logged in: show dashboard ---
  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold">硅基链路控制台</h2>
          <Badge variant="outline">{user.username}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={refresh}
            disabled={loading}
            title="刷新"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
          </Button>
          <Button variant="ghost" size="icon" onClick={logout} title="登出">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Balance & Stats cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              余额
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${user.balance.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              30天请求
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.total_requests?.toLocaleString() ?? "—"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              30天消费
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats?.total_cost?.toFixed(4) ?? "—"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              平均延迟
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.avg_latency_ms
                ? `${Math.round(stats.avg_latency_ms)}ms`
                : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Token usage */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Token 用量（近30天）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-8">
              <div>
                <p className="text-xs text-muted-foreground">输入 Tokens</p>
                <p className="text-lg font-semibold">
                  {stats.total_input_tokens.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">输出 Tokens</p>
                <p className="text-lg font-semibold">
                  {stats.total_output_tokens.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">合计</p>
                <p className="text-lg font-semibold">
                  {(
                    stats.total_input_tokens + stats.total_output_tokens
                  ).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick launch */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Zap className="h-4 w-4" />
            快速启动
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => launchCli("claude")}
              className="gap-2"
            >
              <Terminal className="h-4 w-4" />
              Claude Code
            </Button>
            <Button
              variant="outline"
              onClick={() => launchCli("codex")}
              className="gap-2"
            >
              <Terminal className="h-4 w-4" />
              Codex
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(MOHUAN_WEB_URL, "_blank")}
              className="gap-2"
            >
              <Activity className="h-4 w-4" />
              打开控制台
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
