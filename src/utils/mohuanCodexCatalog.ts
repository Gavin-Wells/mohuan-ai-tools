import {
  compareMohuanGptModels,
  isMohuanGptTextModel,
} from "./mohuanCodexModel";
import { buildMohuanCodexBaseInstructions } from "./mohuanCodexInstructions";

export interface MohuanCodexCatalogModel {
  slug: string;
  display_name: string;
  description: null;
  supported_reasoning_levels: Array<{ effort: string; description: string }>;
  shell_type: "shell_command";
  visibility: "list";
  supported_in_api: true;
  priority: number;
  additional_speed_tiers: [];
  service_tiers: [];
  availability_nux: null;
  upgrade: null;
  base_instructions: string;
  model_messages: null;
  supports_reasoning_summaries: false;
  default_reasoning_summary: "auto";
  support_verbosity: false;
  default_verbosity: null;
  apply_patch_tool_type: null;
  web_search_tool_type: "text";
  truncation_policy: { mode: "bytes"; limit: number };
  supports_parallel_tool_calls: true;
  supports_image_detail_original: false;
  context_window: null;
  auto_compact_token_limit: null;
  effective_context_window_percent: number;
  experimental_supported_tools: [];
  input_modalities: Array<"text" | "image">;
  supports_search_tool: false;
  use_responses_lite: false;
}

const REASONING_LEVELS = [
  { effort: "low", description: "Fast responses with lighter reasoning" },
  {
    effort: "medium",
    description: "Balances speed and reasoning depth for everyday tasks",
  },
  {
    effort: "high",
    description: "Greater reasoning depth for complex problems",
  },
  {
    effort: "xhigh",
    description: "Extra high reasoning depth for complex problems",
  },
] as const;

function formatDisplayName(slug: string): string {
  const parts = slug.split("-");
  if (parts.length >= 2 && parts[0] === "gpt") {
    const head = `GPT-${parts[1]}`;
    const tail = parts
      .slice(2)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
    return `${head} ${tail}`.trim();
  }
  return slug;
}

function buildCatalogEntry(
  slug: string,
  priority: number,
): MohuanCodexCatalogModel {
  const displayName = formatDisplayName(slug);
  return {
    slug,
    display_name: displayName,
    description: null,
    supported_reasoning_levels: [...REASONING_LEVELS],
    shell_type: "shell_command",
    visibility: "list",
    supported_in_api: true,
    priority,
    additional_speed_tiers: [],
    service_tiers: [],
    availability_nux: null,
    upgrade: null,
    base_instructions: buildMohuanCodexBaseInstructions(slug, displayName),
    model_messages: null,
    supports_reasoning_summaries: false,
    default_reasoning_summary: "auto",
    support_verbosity: false,
    default_verbosity: null,
    apply_patch_tool_type: null,
    web_search_tool_type: "text",
    truncation_policy: { mode: "bytes", limit: 10000 },
    supports_parallel_tool_calls: true,
    supports_image_detail_original: false,
    context_window: null,
    auto_compact_token_limit: null,
    effective_context_window_percent: 95,
    experimental_supported_tools: [],
    input_modalities: ["text", "image"],
    supports_search_tool: false,
    use_responses_lite: false,
  };
}

/** Build Codex model_catalog_json payload from gateway model IDs. */
export function buildMohuanCodexCatalog(modelIds: string[]): {
  models: MohuanCodexCatalogModel[];
} {
  const slugs = [...new Set(modelIds.map((id) => id.trim()).filter(Boolean))]
    .filter(isMohuanGptTextModel)
    .sort(compareMohuanGptModels);

  return {
    models: slugs.map((slug, idx) => buildCatalogEntry(slug, idx)),
  };
}
