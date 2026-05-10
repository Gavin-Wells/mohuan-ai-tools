/**
 * Claude Desktop 预设（模幻AI工具 — 仅硅基链路网关）
 */
import { ProviderCategory } from "../types";
import type { PresetTheme } from "./claudeProviderPresets";
import {
  MOHUAN_DEFAULT_CHAT_MODEL,
  MOHUAN_DEFAULT_FLASH_MODEL,
  MOHUAN_GATEWAY_V1,
  MOHUAN_WEB_URL,
} from "./mohuanGateway";

export type ClaudeDesktopApiFormat =
  | "anthropic"
  | "openai_chat"
  | "openai_responses"
  | "gemini_native";

export interface ClaudeDesktopRoutePreset {
  routeId: string;
  upstreamModel: string;
  displayName: string;
  supports1m: boolean;
}

export interface ClaudeDesktopProviderPreset {
  name: string;
  nameKey?: string;
  websiteUrl: string;
  apiKeyUrl?: string;
  category?: ProviderCategory;
  isPartner?: boolean;
  partnerPromotionKey?: string;
  baseUrl: string;
  apiKeyField?: "ANTHROPIC_AUTH_TOKEN" | "ANTHROPIC_API_KEY";
  mode: "direct" | "proxy";
  apiFormat?: ClaudeDesktopApiFormat;
  modelRoutes?: ClaudeDesktopRoutePreset[];
  endpointCandidates?: string[];
  theme?: PresetTheme;
  icon?: string;
  iconColor?: string;
}

const brandedRoutes = (
  sonnet: string,
  opus: string,
  haiku: string,
  supports1m = false,
): ClaudeDesktopRoutePreset[] => [
  {
    routeId: "claude-sonnet-4-6",
    upstreamModel: sonnet,
    displayName: sonnet,
    supports1m,
  },
  {
    routeId: "claude-opus-4-7",
    upstreamModel: opus,
    displayName: opus,
    supports1m,
  },
  {
    routeId: "claude-haiku-4-5",
    upstreamModel: haiku,
    displayName: haiku,
    supports1m,
  },
];

export const claudeDesktopProviderPresets: ClaudeDesktopProviderPreset[] = [
  {
    name: "硅基链路（模幻网关）",
    websiteUrl: MOHUAN_WEB_URL,
    apiKeyUrl: MOHUAN_WEB_URL,
    category: "third_party",
    baseUrl: MOHUAN_GATEWAY_V1,
    mode: "proxy",
    apiFormat: "openai_chat",
    modelRoutes: brandedRoutes(
      MOHUAN_DEFAULT_CHAT_MODEL,
      MOHUAN_DEFAULT_CHAT_MODEL,
      MOHUAN_DEFAULT_FLASH_MODEL,
    ),
    endpointCandidates: [MOHUAN_GATEWAY_V1],
    icon: "generic",
    iconColor: "#0D9488",
  },
];
