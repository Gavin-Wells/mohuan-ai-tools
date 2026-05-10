/**
 * Hermes Agent provider presets（模幻AI工具 — 仅硅基链路网关）
 */
import type { ProviderCategory } from "../types";
import type { PresetTheme, TemplateValueConfig } from "./claudeProviderPresets";
import {
  MOHUAN_DEFAULT_CHAT_MODEL,
  MOHUAN_GATEWAY_V1,
  MOHUAN_WEB_URL,
} from "./mohuanGateway";

export const HERMES_PROVIDER_SOURCE_FIELD = "_cc_source";
export const HERMES_PROVIDER_SOURCE_CUSTOM_LIST = "custom_providers";
export const HERMES_PROVIDER_SOURCE_DICT = "providers_dict";

export function isHermesReadOnlyProvider(settingsConfig: unknown): boolean {
  if (!settingsConfig || typeof settingsConfig !== "object") {
    return false;
  }
  const marker = (settingsConfig as Record<string, unknown>)[
    HERMES_PROVIDER_SOURCE_FIELD
  ];
  return marker === HERMES_PROVIDER_SOURCE_DICT;
}

export interface HermesModel {
  id: string;
  name?: string;
  context_length?: number;
}

export interface HermesSuggestedDefaults {
  model: {
    default: string;
    provider?: string;
  };
}

export type HermesApiMode =
  | "chat_completions"
  | "anthropic_messages"
  | "codex_responses"
  | "bedrock_converse";

export const HERMES_DEFAULT_API_MODE: HermesApiMode = "chat_completions";

export const hermesApiModes: Array<{
  value: HermesApiMode;
  labelKey: string;
}> = [
  { value: "chat_completions", labelKey: "hermes.form.apiModeChatCompletions" },
  {
    value: "anthropic_messages",
    labelKey: "hermes.form.apiModeAnthropicMessages",
  },
  { value: "codex_responses", labelKey: "hermes.form.apiModeCodexResponses" },
  {
    value: "bedrock_converse",
    labelKey: "hermes.form.apiModeBedrockConverse",
  },
];

export interface HermesProviderPreset {
  name: string;
  nameKey?: string;
  websiteUrl: string;
  apiKeyUrl?: string;
  settingsConfig: HermesProviderSettingsConfig;
  isOfficial?: boolean;
  isPartner?: boolean;
  partnerPromotionKey?: string;
  category?: ProviderCategory;
  templateValues?: Record<string, TemplateValueConfig>;
  theme?: PresetTheme;
  icon?: string;
  iconColor?: string;
  isCustomTemplate?: boolean;
  suggestedDefaults?: HermesSuggestedDefaults;
}

export interface HermesProviderSettingsConfig {
  name: string;
  base_url?: string;
  api_key?: string;
  api_mode?: HermesApiMode;
  models?: HermesModel[];
  rate_limit_delay?: number;
  [key: string]: unknown;
}

const hermesProviderName = "modelswitch";

export const hermesProviderPresets: HermesProviderPreset[] = [
  {
    name: "硅基链路（模幻网关）",
    websiteUrl: MOHUAN_WEB_URL,
    apiKeyUrl: MOHUAN_WEB_URL,
    settingsConfig: {
      name: hermesProviderName,
      base_url: MOHUAN_GATEWAY_V1,
      api_key: "",
      api_mode: "chat_completions",
      models: [{ id: MOHUAN_DEFAULT_CHAT_MODEL, name: MOHUAN_DEFAULT_CHAT_MODEL }],
    },
    category: "third_party",
    icon: "generic",
    iconColor: "#0D9488",
    suggestedDefaults: {
      model: {
        default: `openai/${MOHUAN_DEFAULT_CHAT_MODEL}`,
        provider: hermesProviderName,
      },
    },
  },
];
