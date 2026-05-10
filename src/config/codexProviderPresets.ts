/**
 * Codex 预设（模幻AI工具 — 仅硅基链路网关）
 */
import { ProviderCategory } from "../types";
import type { PresetTheme } from "./claudeProviderPresets";
import {
  MOHUAN_DEFAULT_CHAT_MODEL,
  MOHUAN_GATEWAY_V1,
  MOHUAN_WEB_URL,
} from "./mohuanGateway";

export interface CodexProviderPreset {
  name: string;
  nameKey?: string;
  websiteUrl: string;
  apiKeyUrl?: string;
  auth: Record<string, any>;
  config: string;
  isOfficial?: boolean;
  isPartner?: boolean;
  partnerPromotionKey?: string;
  category?: ProviderCategory;
  isCustomTemplate?: boolean;
  endpointCandidates?: string[];
  theme?: PresetTheme;
  icon?: string;
  iconColor?: string;
}

export function generateThirdPartyAuth(apiKey: string): Record<string, any> {
  return {
    OPENAI_API_KEY: apiKey || "",
  };
}

export function generateThirdPartyConfig(
  providerName: string,
  baseUrl: string,
  modelName = MOHUAN_DEFAULT_CHAT_MODEL,
): string {
  const cleanProviderName =
    providerName
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/^_+|_+$/g, "") || "custom";

  return `model_provider = "${cleanProviderName}"
model = "${modelName}"
model_reasoning_effort = "high"
disable_response_storage = true

[model_providers.${cleanProviderName}]
name = "${cleanProviderName}"
base_url = "${baseUrl}"
wire_api = "responses"
requires_openai_auth = true`;
}

export const codexProviderPresets: CodexProviderPreset[] = [
  {
    name: "硅基链路（模幻网关）",
    websiteUrl: MOHUAN_WEB_URL,
    apiKeyUrl: MOHUAN_WEB_URL,
    auth: generateThirdPartyAuth(""),
    config: generateThirdPartyConfig(
      "modelswitch",
      MOHUAN_GATEWAY_V1,
      MOHUAN_DEFAULT_CHAT_MODEL,
    ),
    category: "third_party",
    endpointCandidates: [MOHUAN_GATEWAY_V1],
    theme: {
      icon: "codex",
      backgroundColor: "#0F766E",
      textColor: "#FFFFFF",
    },
    icon: "generic",
    iconColor: "#0D9488",
  },
];
