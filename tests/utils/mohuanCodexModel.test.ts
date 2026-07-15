import { describe, expect, it } from "vitest";
import {
  compareMohuanGptModels,
  isMohuanGptTextModel,
  pickBestMohuanGptModel,
} from "../../src/utils/mohuanCodexModel";

describe("mohuanCodexModel", () => {
  it("filters non-gpt and non-text models", () => {
    expect(isMohuanGptTextModel("gpt-5.6-sol")).toBe(true);
    expect(isMohuanGptTextModel("claude-opus-4-8")).toBe(false);
    expect(isMohuanGptTextModel("gpt-image-2")).toBe(false);
    expect(isMohuanGptTextModel("text-embedding-3-large")).toBe(false);
  });

  it("prefers newer gpt major.minor versions", () => {
    const ids = ["gpt-5.5", "gpt-5.6-luna", "gpt-5.6-sol", "gpt-4o"];
    expect(pickBestMohuanGptModel(ids)).toBe("gpt-5.6-sol");
  });

  it("prefers sol over terra and luna within same version", () => {
    const ids = ["gpt-5.6-terra", "gpt-5.6-luna", "gpt-5.6-sol"];
    expect(pickBestMohuanGptModel(ids)).toBe("gpt-5.6-sol");
  });

  it("supports future gpt series without code changes", () => {
    const ids = ["gpt-5.6-sol", "gpt-5.7-luna", "gpt-5.7-codex"];
    expect(pickBestMohuanGptModel(ids)).toBe("gpt-5.7-codex");
  });

  it("orders unknown suffixes deterministically after known tiers", () => {
    expect(compareMohuanGptModels("gpt-6.0-alpha", "gpt-5.9-sol")).toBeLessThan(0);
    expect(compareMohuanGptModels("gpt-5.6-sol", "gpt-5.6-zz-new")).toBeLessThan(0);
  });
});
