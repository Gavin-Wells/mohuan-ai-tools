import { fetchModelsForConfig } from "@/lib/api/model-fetch";
import {
  MOHUAN_DEFAULT_CODEX_MODEL,
  MOHUAN_GATEWAY_V1,
} from "@/config/mohuanGateway";

/** 同版本 GPT 型号优先级（越靠前越优先，用于 Codex 编码场景） */
const GPT_TIER_PRIORITY = [
  "sol",
  "codex",
  "terra",
  "luna",
  "pro",
  "high",
  "medium",
  "low",
  "mini",
  "nano",
] as const;

const GPT_MODEL_ID_RE = /^gpt-/i;
const GPT_VERSION_RE = /^gpt-(\d+)(?:\.(\d+))?(?:-(.+))?$/i;

const EXCLUDED_GPT_HINTS = [
  "image",
  "embed",
  "audio",
  "realtime",
  "tts",
  "whisper",
  "transcribe",
  "dall-e",
  "vision",
  "instruct",
] as const;

export function isMohuanGptTextModel(modelId: string): boolean {
  const id = modelId.trim().toLowerCase();
  if (!GPT_MODEL_ID_RE.test(id)) return false;
  return !EXCLUDED_GPT_HINTS.some((hint) => id.includes(hint));
}

function parseGptVersion(modelId: string): {
  major: number;
  minor: number;
  suffix: string;
} | null {
  const match = modelId.trim().toLowerCase().match(GPT_VERSION_RE);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2] ?? 0),
    suffix: (match[3] ?? "").trim().toLowerCase(),
  };
}

function tierRank(suffix: string): number {
  if (!suffix) return GPT_TIER_PRIORITY.length;
  const exact = GPT_TIER_PRIORITY.indexOf(
    suffix as (typeof GPT_TIER_PRIORITY)[number],
  );
  if (exact >= 0) return exact;

  const partial = GPT_TIER_PRIORITY.findIndex((tier) => suffix.includes(tier));
  return partial >= 0 ? partial : GPT_TIER_PRIORITY.length;
}

/** 在模型 ID 列表中选出最适合 Codex 的 GPT 文本模型（支持未来 gpt-x.y-* 新型号） */
export function pickBestMohuanGptModel(modelIds: string[]): string | null {
  const candidates = [...new Set(modelIds.map((id) => id.trim()).filter(Boolean))]
    .filter(isMohuanGptTextModel)
    .sort((a, b) => compareMohuanGptModels(a, b));

  return candidates[0] ?? null;
}

export function compareMohuanGptModels(a: string, b: string): number {
  const pa = parseGptVersion(a);
  const pb = parseGptVersion(b);

  if (pa && pb) {
    if (pa.major !== pb.major) return pb.major - pa.major;
    if (pa.minor !== pb.minor) return pb.minor - pa.minor;
    const tierDiff = tierRank(pa.suffix) - tierRank(pb.suffix);
    if (tierDiff !== 0) return tierDiff;
  } else if (pa && !pb) {
    return -1;
  } else if (!pa && pb) {
    return 1;
  }

  return b.localeCompare(a, undefined, { numeric: true, sensitivity: "base" });
}

/** 从模幻网关拉取模型列表并自动选择最新 GPT 文本模型；失败时回退到静态默认 */
export async function resolveMohuanCodexModel(apiKey: string): Promise<string> {
  const key = apiKey.trim();
  if (!key) return MOHUAN_DEFAULT_CODEX_MODEL;

  try {
    const models = await fetchModelsForConfig(MOHUAN_GATEWAY_V1, key);
    const picked = pickBestMohuanGptModel(models.map((m) => m.id));
    if (picked) return picked;
  } catch {
    // 使用离线默认
  }

  return MOHUAN_DEFAULT_CODEX_MODEL;
}
