/**
 * 统一供应商预设（模幻AI工具 — 仅硅基链路网关）
 */

import type {
  UniversalProvider,
  UniversalProviderApps,
  UniversalProviderModels,
} from "@/types";
import {
  MOHUAN_DEFAULT_CHAT_MODEL,
  MOHUAN_DEFAULT_FLASH_MODEL,
  MOHUAN_GATEWAY_V1,
  MOHUAN_WEB_URL,
} from "./mohuanGateway";

export interface UniversalProviderPreset {
  name: string;
  providerType: string;
  defaultApps: UniversalProviderApps;
  defaultModels: UniversalProviderModels;
  websiteUrl?: string;
  icon?: string;
  iconColor?: string;
  description?: string;
  isCustomTemplate?: boolean;
}

const MOHUAN_DEFAULT_MODELS: UniversalProviderModels = {
  claude: {
    model: MOHUAN_DEFAULT_CHAT_MODEL,
    haikuModel: MOHUAN_DEFAULT_FLASH_MODEL,
    sonnetModel: MOHUAN_DEFAULT_CHAT_MODEL,
    opusModel: MOHUAN_DEFAULT_CHAT_MODEL,
  },
  codex: {
    model: MOHUAN_DEFAULT_CHAT_MODEL,
    reasoningEffort: "high",
  },
  gemini: {
    model: MOHUAN_DEFAULT_CHAT_MODEL,
  },
};

export const universalProviderPresets: UniversalProviderPreset[] = [
  {
    name: "硅基链路（模幻网关）",
    providerType: "modelswitch",
    defaultApps: {
      claude: true,
      codex: true,
      gemini: true,
    },
    defaultModels: MOHUAN_DEFAULT_MODELS,
    websiteUrl: MOHUAN_WEB_URL,
    icon: "generic",
    iconColor: "#0D9488",
    description:
      "硅基链路 API 网关（ploy-api），统一地址 " + MOHUAN_GATEWAY_V1,
  },
];

export function createUniversalProviderFromPreset(
  preset: UniversalProviderPreset,
  id: string,
  baseUrl: string,
  apiKey: string,
  customName?: string,
): UniversalProvider {
  return {
    id,
    name: customName || preset.name,
    providerType: preset.providerType,
    apps: { ...preset.defaultApps },
    baseUrl,
    apiKey,
    models: JSON.parse(JSON.stringify(preset.defaultModels)),
    websiteUrl: preset.websiteUrl,
    icon: preset.icon,
    iconColor: preset.iconColor,
    createdAt: Date.now(),
  };
}

export function getPresetDisplayName(preset: UniversalProviderPreset): string {
  return preset.name;
}

export function findPresetByType(
  providerType: string,
): UniversalProviderPreset | undefined {
  return universalProviderPresets.find((p) => p.providerType === providerType);
}
