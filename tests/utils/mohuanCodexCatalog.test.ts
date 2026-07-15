import { describe, expect, it } from "vitest";
import { buildMohuanCodexCatalog } from "../../src/utils/mohuanCodexCatalog";

describe("mohuanCodexCatalog", () => {
  it("builds Codex-compatible catalog entries for GPT text models", () => {
    const catalog = buildMohuanCodexCatalog([
      "gpt-5.6-terra",
      "gpt-5.6-sol",
      "gpt-image-2",
      "claude-opus-4-8",
    ]);

    expect(catalog.models.map((m) => m.slug)).toEqual([
      "gpt-5.6-sol",
      "gpt-5.6-terra",
    ]);
    expect(catalog.models[0].visibility).toBe("list");
    expect(catalog.models[0].display_name).toBe("GPT-5.6 Sol");
    expect(catalog.models[0].base_instructions).toContain("gpt-5.6-sol");
    expect(catalog.models[0].base_instructions).toContain("GPT-5.6 Sol");
    expect(catalog.models[0].truncation_policy).toEqual({
      mode: "bytes",
      limit: 10000,
    });
  });
});
