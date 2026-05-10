/**
 * OpenClaw 预设（模幻AI工具 — 仅硅基链路网关）
 */
import type {
  ProviderCategory,
  OpenClawProviderConfig,
  OpenClawDefaultModel,
} from "../types";
import type { PresetTheme, TemplateValueConfig } from "./claudeProviderPresets";
import {
  MOHUAN_DEFAULT_CHAT_MODEL,
  MOHUAN_DEFAULT_FLASH_MODEL,
  MOHUAN_GATEWAY_V1,
  MOHUAN_WEB_URL,
} from "./mohuanGateway";

export interface OpenClawSuggestedDefaults {
  model?: OpenClawDefaultModel;
  modelCatalog?: Record<string, { alias?: string }>;
}

export interface OpenClawProviderPreset {
  name: string;
  nameKey?: string;
  websiteUrl: string;
  apiKeyUrl?: string;
  settingsConfig: OpenClawProviderConfig;
  isOfficial?: boolean;
  isPartner?: boolean;
  partnerPromotionKey?: string;
  category?: ProviderCategory;
  templateValues?: Record<string, TemplateValueConfig>;
  theme?: PresetTheme;
  icon?: string;
  iconColor?: string;
  isCustomTemplate?: boolean;
  suggestedDefaults?: OpenClawSuggestedDefaults;
}

export const openclawApiProtocols = [
  { value: "openai-completions", label: "OpenAI Completions" },
  { value: "openai-responses", label: "OpenAI Responses" },
  { value: "anthropic-messages", label: "Anthropic Messages" },
  { value: "google-generative-ai", label: "Google Generative AI" },
  { value: "bedrock-converse-stream", label: "AWS Bedrock" },
] as const;

const primaryId = MOHUAN_DEFAULT_CHAT_MODEL;
const fallbackId = MOHUAN_DEFAULT_FLASH_MODEL;
const providerSlug = "modelswitch";

export const openclawProviderPresets: OpenClawProviderPreset[] = [
  {
    name: "硅基链路（模幻网关）",
    websiteUrl: MOHUAN_WEB_URL,
    apiKeyUrl: MOHUAN_WEB_URL,
    settingsConfig: {
      baseUrl: MOHUAN_GATEWAY_V1,
      apiKey: "",
      api: "openai-completions",
      models: [
        {
          id: primaryId,
          name: primaryId,
          contextWindow: 128000,
          cost: { input: 0, output: 0 },
        },
        {
          id: fallbackId,
          name: fallbackId,
          contextWindow: 128000,
          cost: { input: 0, output: 0 },
        },
      ],
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
    suggestedDefaults: {
      model: {
        primary: `${providerSlug}/${primaryId}`,
        fallbacks: [`${providerSlug}/${fallbackId}`],
      },
      modelCatalog: {
        [`${providerSlug}/${primaryId}`]: { alias: "Primary" },
        [`${providerSlug}/${fallbackId}`]: { alias: "Flash" },
      },
    },
  },
];
