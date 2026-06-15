/**
 * 预设供应商配置模板（模幻AI工具 — 仅硅基链路网关）
 */
import { ProviderCategory } from "../types";
import {
  MOHUAN_DEFAULT_CHAT_MODEL,
  MOHUAN_DEFAULT_FLASH_MODEL,
  MOHUAN_GATEWAY_V1,
  MOHUAN_WEB_URL,
} from "./mohuanGateway";

export interface TemplateValueConfig {
  label: string;
  placeholder: string;
  defaultValue?: string;
  editorValue: string;
}

export interface PresetTheme {
  icon?: "claude" | "codex" | "gemini" | "generic";
  backgroundColor?: string;
  textColor?: string;
}

export interface ProviderPreset {
  name: string;
  nameKey?: string;
  websiteUrl: string;
  apiKeyUrl?: string;
  settingsConfig: object;
  isOfficial?: boolean;
  isPartner?: boolean;
  partnerPromotionKey?: string;
  category?: ProviderCategory;
  apiKeyField?: "ANTHROPIC_AUTH_TOKEN" | "ANTHROPIC_API_KEY";
  templateValues?: Record<string, TemplateValueConfig>;
  endpointCandidates?: string[];
  theme?: PresetTheme;
  icon?: string;
  iconColor?: string;
  apiFormat?:
    | "anthropic"
    | "openai_chat"
    | "openai_responses"
    | "gemini_native";
  providerType?: "github_copilot" | "codex_oauth";
  requiresOAuth?: boolean;
  hidden?: boolean;
  modelsUrl?: string;
}

export const providerPresets: ProviderPreset[] = [
  {
    name: "硅基链路（模幻网关）",
    websiteUrl: MOHUAN_WEB_URL,
    apiKeyUrl: MOHUAN_WEB_URL,
    settingsConfig: {
      env: {
        ANTHROPIC_BASE_URL: MOHUAN_GATEWAY_V1,
        ANTHROPIC_AUTH_TOKEN: "",
        ANTHROPIC_MODEL: MOHUAN_DEFAULT_CHAT_MODEL,
        ANTHROPIC_DEFAULT_HAIKU_MODEL: MOHUAN_DEFAULT_FLASH_MODEL,
        ANTHROPIC_DEFAULT_SONNET_MODEL: MOHUAN_DEFAULT_CHAT_MODEL,
        ANTHROPIC_DEFAULT_OPUS_MODEL: MOHUAN_DEFAULT_CHAT_MODEL,
      },
    },
    category: "third_party",
    apiFormat: "openai_chat",
    endpointCandidates: [MOHUAN_GATEWAY_V1],
    modelsUrl: `${MOHUAN_GATEWAY_V1}/models`,
    theme: {
      icon: "claude",
      backgroundColor: "#0F766E",
      textColor: "#FFFFFF",
    },
    icon: "generic",
    iconColor: "#0D9488",
  },
];

/** 硅基链路 Claude Code live 配置（写入 ~/.claude/settings.json） */
export function buildMohuanClaudeSettings(apiKey: string): { env: Record<string, string> } {
  const preset = providerPresets[0];
  const baseEnv =
    (preset.settingsConfig as { env?: Record<string, string> }).env ?? {};
  return {
    env: {
      ...baseEnv,
      ANTHROPIC_AUTH_TOKEN: apiKey.trim(),
    },
  };
}
