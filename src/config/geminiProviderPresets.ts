import type { ProviderCategory } from "@/types";
import {
  MOHUAN_DEFAULT_GEMINI_MODEL,
  MOHUAN_GATEWAY_V1,
  MOHUAN_WEB_URL,
} from "./mohuanGateway";

export interface GeminiPresetTheme {
  icon?: "gemini" | "generic";
  backgroundColor?: string;
  textColor?: string;
}

export interface GeminiProviderPreset {
  name: string;
  nameKey?: string;
  websiteUrl: string;
  apiKeyUrl?: string;
  settingsConfig: object;
  baseURL?: string;
  model?: string;
  description?: string;
  category?: ProviderCategory;
  isPartner?: boolean;
  partnerPromotionKey?: string;
  endpointCandidates?: string[];
  theme?: GeminiPresetTheme;
  icon?: string;
  iconColor?: string;
}

export const geminiProviderPresets: GeminiProviderPreset[] = [
  {
    name: "硅基链路（模幻网关）",
    websiteUrl: MOHUAN_WEB_URL,
    apiKeyUrl: MOHUAN_WEB_URL,
    settingsConfig: {
      env: {
        GOOGLE_GEMINI_BASE_URL: MOHUAN_GATEWAY_V1,
        GEMINI_API_KEY: "",
        GEMINI_MODEL: MOHUAN_DEFAULT_GEMINI_MODEL,
      },
    },
    baseURL: MOHUAN_GATEWAY_V1,
    model: MOHUAN_DEFAULT_GEMINI_MODEL,
    description: "通过硅基链路网关调用（OpenAI 兼容路径，模型以后台配置为准）",
    category: "third_party",
    endpointCandidates: [MOHUAN_GATEWAY_V1],
    theme: {
      icon: "generic",
      backgroundColor: "#0F766E",
      textColor: "#FFFFFF",
    },
    icon: "generic",
    iconColor: "#0D9488",
  },
];

export function getGeminiPresetByName(
  name: string,
): GeminiProviderPreset | undefined {
  return geminiProviderPresets.find((preset) => preset.name === name);
}

export function getGeminiPresetByUrl(
  url: string,
): GeminiProviderPreset | undefined {
  if (!url) return undefined;
  return geminiProviderPresets.find(
    (preset) =>
      preset.baseURL &&
      url.toLowerCase().includes(preset.baseURL.toLowerCase()),
  );
}
