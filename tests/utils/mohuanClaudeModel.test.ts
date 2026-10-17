import { describe, expect, it } from "vitest";
import { selectMohuanClaudeModels } from "@/utils/mohuanClaudeModel";
import { buildMohuanClaudeSettings } from "@/config/claudeProviderPresets";

describe("Claude gateway models", () => {
  it("selects the latest available version of each family numerically", () => {
    const models = selectMohuanClaudeModels([
      "claude-opus-4-8",
      "claude-opus-5-5",
      "claude-sonnet-4-6",
      "claude-haiku-4-5-20251001",
      "gpt-6",
      "claude-opus-5-5[1m]",
    ]);
    expect(models).toEqual({
      model: "claude-opus-5-5",
      opus: "claude-opus-5-5",
      sonnet: "claude-sonnet-4-6",
      haiku: "claude-haiku-4-5-20251001",
    });
    const settings = buildMohuanClaudeSettings(" test-key ", models);
    expect(settings.env.ANTHROPIC_AUTH_TOKEN).toBe("test-key");
    expect(settings.env.ANTHROPIC_BASE_URL).toBe("https://api.modelswitch.org");
    expect(settings.env.ANTHROPIC_MODEL).toBe(models.model);
  });

  it("never configures an unavailable fallback family", () => {
    expect(selectMohuanClaudeModels(["claude-sonnet-4-6"])).toEqual({
      model: "claude-sonnet-4-6",
      opus: "claude-sonnet-4-6",
      sonnet: "claude-sonnet-4-6",
      haiku: "claude-sonnet-4-6",
    });
  });

  it("rejects keys without a Claude model", () => {
    expect(() =>
      selectMohuanClaudeModels(["gpt-6", "claude-opus-5-5[1m]"]),
    ).toThrow("没有可用");
  });
});
