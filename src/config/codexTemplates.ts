/**
 * Codex 配置模板（模幻 — 硅基链路网关）
 */
import {
  MOHUAN_DEFAULT_CODEX_MODEL,
  MOHUAN_GATEWAY_V1,
} from "./mohuanGateway";

export interface CodexTemplate {
  auth: Record<string, any>;
  config: string;
}

export function getCodexCustomTemplate(): CodexTemplate {
  const config = `model_provider = "custom"
model = "${MOHUAN_DEFAULT_CODEX_MODEL}"
model_reasoning_effort = "high"
disable_response_storage = true

[model_providers.custom]
name = "custom"
wire_api = "responses"
requires_openai_auth = true
base_url = "${MOHUAN_GATEWAY_V1}"`;

  return {
    auth: { OPENAI_API_KEY: "" },
    config,
  };
}
