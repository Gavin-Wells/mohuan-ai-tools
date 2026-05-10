/**
 * 模幻AI工具 — 硅基链路网关 API 客户端
 * 通过 JWT token 或 API key 查询用户余额 / 用量统计
 */
import { MOHUAN_GATEWAY_ORIGIN } from "@/config/mohuanGateway";

const BASE = MOHUAN_GATEWAY_ORIGIN;

export interface MohuanUser {
  id: string;
  username: string;
  email: string;
  balance: number;
  is_active: boolean;
  created_at: string;
}

export interface MohuanUsageStats {
  total_requests: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost: number;
  avg_latency_ms: number;
}

export interface MohuanDailyUsage {
  date: string;
  requests: number;
  tokens: number;
  cost: number;
}

export interface MohuanLoginResult {
  access_token: string;
  token_type: string;
  user: MohuanUser;
}

function headers(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

export const mohuanApi = {
  async login(
    username: string,
    password: string,
  ): Promise<MohuanLoginResult> {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    return handleResponse<MohuanLoginResult>(res);
  },

  async getMe(token: string): Promise<MohuanUser> {
    const res = await fetch(`${BASE}/api/auth/me`, {
      headers: headers(token),
    });
    return handleResponse<MohuanUser>(res);
  },

  async getUsageStats(
    token: string,
    days = 30,
  ): Promise<MohuanUsageStats> {
    const res = await fetch(`${BASE}/api/logs/stats?days=${days}`, {
      headers: headers(token),
    });
    return handleResponse<MohuanUsageStats>(res);
  },

  async getDailyUsage(
    token: string,
    days = 30,
  ): Promise<MohuanDailyUsage[]> {
    const res = await fetch(`${BASE}/api/logs/daily?days=${days}`, {
      headers: headers(token),
    });
    return handleResponse<MohuanDailyUsage[]>(res);
  },
};
