import type { ProviderCategory, OpenCodeProviderConfig } from "../types";
import type { PresetTheme, TemplateValueConfig } from "./claudeProviderPresets";
import {
  MOHUAN_DEFAULT_CHAT_MODEL,
  MOHUAN_DEFAULT_FLASH_MODEL,
  MOHUAN_GATEWAY_V1,
  MOHUAN_WEB_URL,
} from "./mohuanGateway";

export interface OpenCodeProviderPreset {
  name: string;
  nameKey?: string;
  websiteUrl: string;
  apiKeyUrl?: string;
  settingsConfig: OpenCodeProviderConfig;
  isOfficial?: boolean;
  isPartner?: boolean;
  partnerPromotionKey?: string;
  category?: ProviderCategory;
  templateValues?: Record<string, TemplateValueConfig>;
  theme?: PresetTheme;
  icon?: string;
  iconColor?: string;
  isCustomTemplate?: boolean;
}

export const opencodeNpmPackages = [
  { value: "@ai-sdk/openai-compatible", label: "OpenAI Compatible" },
] as const;

export interface PresetModelVariant {
  id: string;
  name?: string;
  contextLimit?: number;
  outputLimit?: number;
  modalities?: { input: string[]; output: string[] };
  options?: Record<string, unknown>;
  variants?: Record<string, Record<string, unknown>>;
}

export const OPENCODE_PRESET_MODEL_VARIANTS: Record<
  string,
  PresetModelVariant[]
> = {
  "@ai-sdk/openai-compatible": [
    {
      id: MOHUAN_DEFAULT_CHAT_MODEL,
      name: MOHUAN_DEFAULT_CHAT_MODEL,
      contextLimit: 128000,
      outputLimit: 8192,
      modalities: { input: ["text"], output: ["text"] },
    },
    {
      id: MOHUAN_DEFAULT_FLASH_MODEL,
      name: MOHUAN_DEFAULT_FLASH_MODEL,
      contextLimit: 128000,
      outputLimit: 8192,
      modalities: { input: ["text"], output: ["text"] },
    },
  ],
};

export function getPresetModelDefaults(
  npm: string,
  modelId: string,
): PresetModelVariant | undefined {
  const models = OPENCODE_PRESET_MODEL_VARIANTS[npm];
  if (!models) return undefined;
  return models.find((m) => m.id === modelId);
}

export const opencodeProviderPresets: OpenCodeProviderPreset[] = [
  {
    name: "硅基链路（模幻网关）",
    websiteUrl: MOHUAN_WEB_URL,
    apiKeyUrl: MOHUAN_WEB_URL,
    settingsConfig: {
      npm: "@ai-sdk/openai-compatible",
      name: "硅基链路",
      options: {
        baseURL: MOHUAN_GATEWAY_V1,
        apiKey: "",
        setCacheKey: true,
      },
      models: {
        [MOHUAN_DEFAULT_CHAT_MODEL]: { name: MOHUAN_DEFAULT_CHAT_MODEL },
        [MOHUAN_DEFAULT_FLASH_MODEL]: { name: MOHUAN_DEFAULT_FLASH_MODEL },
      },
    },
    category: "third_party",
    icon: "generic",
    iconColor: "#0D9488",
    templateValues: {
      apiKey: {
        label: "API Key",
        placeholder: "",
        editorValue: "",
      },
    },
  },
];
