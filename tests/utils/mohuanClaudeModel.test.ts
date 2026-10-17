import { describe, expect, it } from "vitest";
import { selectMohuanClaudeModels } from "@/utils/mohuanClaudeModel";
import { buildMohuanClaudeSettings } from "@/config/claudeProviderPresets";
import { claudeDesktopProviderPresets } from "@/config/claudeDesktopProviderPresets";

describe("Claude gateway models", () => {
  it("defaults to Opus 5.5 without model discovery", () => {
    const settings = buildMohuanClaudeSettings("test-key");
    expect(settings.env.ANTHROPIC_MODEL).toBe("claude-opus-5-5");
    expect(settings.env.ANTHROPIC_DEFAULT_OPUS_MODEL).toBe("claude-opus-5-5");
    expect(settings.env.ANTHROPIC_DEFAULT_SONNET_MODEL).toBe(
      "claude-sonnet-5-5",
    );
    expect(settings.env.ANTHROPIC_DEFAULT_HAIKU_MODEL).toBe(
      "claude-sonnet-5-5",
    );
  });

  it("advertises only the two supported desktop routes", () => {
    const routes = claudeDesktopProviderPresets[0].modelRoutes!;
    expect(routes.map((r) => r.routeId)).toEqual([
      "claude-sonnet-5-5",
      "claude-opus-5-5",
    ]);
    expect(routes.every((r) => r.routeId === r.upstreamModel)).toBe(true);
  });

  it("keeps the configured default when newer models are advertised", () => {
    const models = selectMohuanClaudeModels([
      "claude-opus-4-8",
      "claude-opus-5-5",
      "claude-opus-6-0",
    ]);
    expect(models.model).toBe("claude-opus-5-5");
    expect(models.opus).toBe("claude-opus-5-5");
  });
  it("ignores other Claude models and uses Sonnet 5.5 for background tasks", () => {
    const models = selectMohuanClaudeModels([
      "claude-opus-4-8",
      "claude-opus-5-5",
      "claude-sonnet-4-6",
      "claude-sonnet-5-5",
      "claude-haiku-4-5-20251001",
      "gpt-6",
      "claude-opus-5-5[1m]",
    ]);
    expect(models).toEqual({
      model: "claude-opus-5-5",
      opus: "claude-opus-5-5",
      sonnet: "claude-sonnet-5-5",
      haiku: "claude-sonnet-5-5",
    });
    const settings = buildMohuanClaudeSettings(" test-key ", models);
    expect(settings.env.ANTHROPIC_AUTH_TOKEN).toBe("test-key");
    expect(settings.env.ANTHROPIC_BASE_URL).toBe("https://api.modelswitch.org");
    expect(settings.env.ANTHROPIC_MODEL).toBe(models.model);
  });

  it("never configures an unavailable fallback family", () => {
    expect(selectMohuanClaudeModels(["claude-sonnet-5-5"])).toEqual({
      model: "claude-sonnet-5-5",
      opus: "claude-sonnet-5-5",
      sonnet: "claude-sonnet-5-5",
      haiku: "claude-sonnet-5-5",
    });
  });

  it("rejects keys without a Claude model", () => {
    expect(() =>
      selectMohuanClaudeModels([
        "gpt-6",
        "claude-opus-5-5[1m]",
        "claude-opus-4-8",
        "claude-sonnet-4-6",
        "claude-haiku-4-5-20251001",
      ]),
    ).toThrow("没有可用");
  });
});
