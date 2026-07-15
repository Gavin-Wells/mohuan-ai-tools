/**
 * 模幻AI工具 — 硅基链路（ploy-api）网关常量
 * @see https://modelswitch.org/
 */
export const MOHUAN_GATEWAY_ORIGIN = "https://modelswitch.org";
export const MOHUAN_API_ORIGIN = "https://api.modelswitch.org";
/** OpenAI 兼容端点（Codex 等），需带 /v1 */
export const MOHUAN_GATEWAY_V1 = "https://api.modelswitch.org/v1";
/** Claude Code ANTHROPIC_BASE_URL：勿带 /v1（SDK 会自动追加 /v1/messages） */
export const MOHUAN_ANTHROPIC_BASE_URL = "https://api.modelswitch.org";
export const MOHUAN_WEB_URL = "https://modelswitch.org/";

/** Claude Code 默认模型（与 ploy-api 官方定价目录对齐） */
export const MOHUAN_DEFAULT_CLAUDE_MODEL = "claude-opus-4-8";
export const MOHUAN_DEFAULT_CLAUDE_SONNET_MODEL = "claude-sonnet-4-6";
export const MOHUAN_DEFAULT_CLAUDE_OPUS_MODEL = "claude-opus-4-8";
export const MOHUAN_DEFAULT_CLAUDE_HAIKU_MODEL = "claude-haiku-4-5-20251001";

/** Codex 离线回退默认（网关 /v1/models 不可用时使用） */
export const MOHUAN_DEFAULT_CODEX_MODEL = "gpt-5.6-sol";

/** Gemini 默认模型 */
export const MOHUAN_DEFAULT_GEMINI_MODEL = "gemini-3.1-pro-preview";

/** @deprecated 使用 MOHUAN_DEFAULT_CLAUDE_* */
export const MOHUAN_DEFAULT_CHAT_MODEL = MOHUAN_DEFAULT_CLAUDE_MODEL;

/** @deprecated 使用 MOHUAN_DEFAULT_CLAUDE_HAIKU_MODEL */
export const MOHUAN_DEFAULT_FLASH_MODEL = MOHUAN_DEFAULT_CLAUDE_HAIKU_MODEL;
