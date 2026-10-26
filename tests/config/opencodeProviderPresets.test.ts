import { describe, expect, it } from "vitest";
import {
  opencodeProviderPresets,
  opencodeNpmPackages,
  OPENCODE_PRESET_MODEL_VARIANTS,
  getPresetModelDefaults,
} from "@/config/opencodeProviderPresets";
import {
  MOHUAN_DEFAULT_CHAT_MODEL,
  MOHUAN_DEFAULT_FLASH_MODEL,
  MOHUAN_GATEWAY_V1,
} from "@/config/mohuanGateway";

describe("ModelSwitch OpenCode presets", () => {
  it("offers only the configured OpenAI-compatible package", () => {
    expect(opencodeNpmPackages).toEqual([
      { value: "@ai-sdk/openai-compatible", label: "OpenAI Compatible" },
    ]);
  });
  it("keeps the curated gateway and empty credential template", () => {
    expect(opencodeProviderPresets).toHaveLength(1);
    const preset = opencodeProviderPresets[0];
    expect(preset.settingsConfig.npm).toBe("@ai-sdk/openai-compatible");
    expect(preset.settingsConfig.options?.baseURL).toBe(MOHUAN_GATEWAY_V1);
    expect(preset.settingsConfig.options?.apiKey).toBe("");
    expect(preset.templateValues?.apiKey).toBeDefined();
  });
  it("uses the gateway's configured model variants without retired provider presets", () => {
    const ids = [MOHUAN_DEFAULT_CHAT_MODEL, MOHUAN_DEFAULT_FLASH_MODEL];
    const variants =
      OPENCODE_PRESET_MODEL_VARIANTS["@ai-sdk/openai-compatible"];
    expect(variants.map((model) => model.id)).toEqual(ids);
    expect(
      Object.keys(opencodeProviderPresets[0].settingsConfig.models ?? {}),
    ).toEqual(ids);
    for (const id of ids)
      expect(getPresetModelDefaults("@ai-sdk/openai-compatible", id)?.id).toBe(
        id,
      );
    expect(getPresetModelDefaults("unknown", "missing")).toBeUndefined();
  });
});
