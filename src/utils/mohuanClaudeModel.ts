import {
  MOHUAN_DEFAULT_CLAUDE_MODEL,
  MOHUAN_DEFAULT_CLAUDE_SONNET_MODEL,
} from "@/config/mohuanGateway";

export interface ClaudeModels {
  model: string;
  opus: string;
  sonnet: string;
  haiku: string;
}

export function selectMohuanClaudeModels(ids: string[]): ClaudeModels {
  const opus = ids.includes(MOHUAN_DEFAULT_CLAUDE_MODEL)
    ? MOHUAN_DEFAULT_CLAUDE_MODEL
    : undefined;
  const sonnet = ids.includes(MOHUAN_DEFAULT_CLAUDE_SONNET_MODEL)
    ? MOHUAN_DEFAULT_CLAUDE_SONNET_MODEL
    : undefined;
  const model = opus ?? sonnet;
  if (!model) throw new Error("当前 Key 没有可用的 Claude 5.5 模型");
  return {
    model,
    opus: opus ?? model,
    sonnet: sonnet ?? model,
    haiku: sonnet ?? model,
  };
}
