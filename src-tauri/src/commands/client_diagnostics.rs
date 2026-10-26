use serde::Serialize;
use serde_json::Value;
use std::io::Read;
use std::path::Path;

#[derive(Debug, Serialize)]
pub(crate) struct DiagnosticCheck {
    pub id: &'static str,
    pub label: &'static str,
    pub status: &'static str,
    pub detail: &'static str,
}

pub(crate) fn check(
    id: &'static str,
    label: &'static str,
    status: &'static str,
    detail: &'static str,
) -> DiagnosticCheck {
    DiagnosticCheck {
        id,
        label,
        status,
        detail,
    }
}

pub(crate) struct ConfigInspection {
    pub checks: Vec<DiagnosticCheck>,
    pub model: Option<String>,
}

fn read_config(path: &Path) -> Option<String> {
    let file = std::fs::File::open(path).ok()?;
    if !file.metadata().ok()?.is_file() {
        return None;
    }
    let mut text = String::new();
    file.take(2 * 1024 * 1024 + 1)
        .read_to_string(&mut text)
        .ok()?;
    if text.len() > 2 * 1024 * 1024 {
        return None;
    }
    Some(text)
}

fn unreadable() -> ConfigInspection {
    ConfigInspection {
        checks: vec![check(
            "config",
            "配置文件",
            "fail",
            "配置不存在、无法读取或超过大小限制",
        )],
        model: None,
    }
}

pub(crate) fn inspect_config(tool: &str, path: &Path, auth_path: &Path) -> ConfigInspection {
    let Some(text) = read_config(path) else {
        return unreadable();
    };
    if tool == "claude" {
        inspect_claude(&text)
    } else {
        let auth =
            read_config(auth_path).and_then(|text| serde_json::from_str::<Value>(&text).ok());
        inspect_codex(&text, auth.as_ref())
    }
}

fn inspect_claude(text: &str) -> ConfigInspection {
    let Ok(config) = serde_json::from_str::<Value>(text) else {
        return ConfigInspection {
            checks: vec![check(
                "config",
                "配置文件",
                "fail",
                "JSON 格式无效，请先修复配置文件",
            )],
            model: None,
        };
    };
    if !config.is_object() {
        return ConfigInspection {
            checks: vec![check("config", "配置文件", "fail", "配置必须是 JSON 对象")],
            model: None,
        };
    }
    let env = config.get("env");
    let base = env
        .and_then(|e| e.get("ANTHROPIC_BASE_URL"))
        .and_then(Value::as_str)
        .unwrap_or("");
    let token = env
        .and_then(|e| e.get("ANTHROPIC_AUTH_TOKEN"))
        .and_then(Value::as_str)
        .is_some_and(|v| !v.trim().is_empty());
    let key = env
        .and_then(|e| e.get("ANTHROPIC_API_KEY"))
        .and_then(Value::as_str)
        .is_some_and(|v| !v.trim().is_empty());
    let gateway_ok = base.trim_end_matches('/') == "https://api.modelswitch.org";
    let mut checks = vec![
        check("config", "配置文件", "pass", "JSON 配置可读取"),
        check(
            "routing",
            "网关地址",
            if gateway_ok { "pass" } else { "fail" },
            if gateway_ok {
                "已配置 ModelSwitch Messages 网关"
            } else {
                "当前不是预期网关地址；Claude 地址不应带 /v1"
            },
        ),
        check(
            "credential",
            "配置凭据",
            if token || key { "pass" } else { "warn" },
            if token || key {
                "配置中存在凭据，未收集其内容"
            } else {
                "配置未包含网关凭据，需核对环境变量或重新配置"
            },
        ),
    ];
    if token && key {
        checks.push(check(
            "auth-conflict",
            "认证冲突",
            "warn",
            "同时设置了 Auth Token 和 API Key，请确认使用的认证方式",
        ));
    }
    let model = env
        .and_then(|e| e.get("ANTHROPIC_MODEL"))
        .or_else(|| config.get("model"))
        .and_then(Value::as_str)
        .map(str::to_owned);
    ConfigInspection { checks, model }
}

fn inspect_codex(text: &str, auth: Option<&Value>) -> ConfigInspection {
    let Ok(config) = toml::from_str::<toml::Value>(text) else {
        return ConfigInspection {
            checks: vec![check(
                "config",
                "配置文件",
                "fail",
                "TOML 格式无效，请先修复配置文件",
            )],
            model: None,
        };
    };
    let provider_id = config
        .get("model_provider")
        .and_then(toml::Value::as_str)
        .unwrap_or("openai");
    let provider = config
        .get("model_providers")
        .and_then(|v| v.get(provider_id));
    let base = provider
        .and_then(|v| v.get("base_url"))
        .and_then(toml::Value::as_str)
        .unwrap_or("");
    let gateway_ok = base.trim_end_matches('/') == "https://api.modelswitch.org/v1";
    let responses = provider
        .and_then(|v| v.get("wire_api"))
        .and_then(toml::Value::as_str)
        == Some("responses");
    let mut checks = vec![
        check("config", "配置文件", "pass", "TOML 配置可读取"),
        check(
            "routing",
            "网关地址",
            if gateway_ok { "pass" } else { "fail" },
            if gateway_ok {
                "已配置 ModelSwitch Responses 网关"
            } else {
                "当前提供方未指向预期的 ModelSwitch /v1 网关"
            },
        ),
        check(
            "protocol",
            "请求协议",
            if responses { "pass" } else { "fail" },
            if responses {
                "已设置 Responses 协议"
            } else {
                "需要 wire_api = responses，不能仅使用 Chat Completions"
            },
        ),
    ];
    let openai_auth = provider
        .and_then(|v| v.get("requires_openai_auth"))
        .and_then(toml::Value::as_bool)
        .unwrap_or(false);
    let has_auth = auth
        .and_then(|v| v.get("OPENAI_API_KEY"))
        .and_then(Value::as_str)
        .is_some_and(|v| !v.trim().is_empty());
    let env_key = provider
        .and_then(|v| v.get("env_key"))
        .and_then(toml::Value::as_str);
    let helper = provider
        .and_then(|v| v.get("auth"))
        .and_then(|v| v.get("command"))
        .and_then(toml::Value::as_str)
        .is_some();
    if openai_auth {
        checks.push(check(
            "credential",
            "配置凭据",
            if has_auth { "pass" } else { "warn" },
            if has_auth {
                "认证文件中存在 API Key，未收集其内容"
            } else {
                "使用 OpenAI 认证路径，需确认认证缓存或系统凭据可用"
            },
        ));
    } else {
        checks.push(check(
            "credential",
            "配置凭据",
            if env_key.is_some() || helper {
                "warn"
            } else {
                "fail"
            },
            if env_key.is_some() {
                "使用环境变量凭据，需确认启动的客户端进程能读取它"
            } else if helper {
                "使用凭据助手，本次只读检查不执行外部助手命令"
            } else {
                "没有检测到 env_key，需确认凭据助手或提供方认证配置"
            },
        ));
    }
    if openai_auth && env_key.is_some() {
        checks.push(check(
            "auth-conflict",
            "认证冲突",
            "warn",
            "requires_openai_auth 启用时会忽略 env_key，请确认预期的凭据来源",
        ));
    }
    if config.get("profile").is_some() {
        checks.push(check(
            "profile",
            "配置优先级",
            "warn",
            "设置了配置档案；本次检查用户配置，实际会话可能被档案或组织策略覆盖",
        ));
    }
    let model = config
        .get("model")
        .and_then(toml::Value::as_str)
        .map(str::to_owned);
    ConfigInspection { checks, model }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn claude_validates_gateway_and_conflicts_without_exporting_secrets() {
        let result = inspect_claude(
            r#"{"env":{"ANTHROPIC_BASE_URL":"https://api.modelswitch.org/","ANTHROPIC_AUTH_TOKEN":"sk-private-one","ANTHROPIC_API_KEY":"sk-private-two","ANTHROPIC_MODEL":"claude-opus-5-5"}}"#,
        );
        let exported = serde_json::to_string(&result.checks).unwrap();
        assert!(!exported.contains("sk-private"));
        assert!(result
            .checks
            .iter()
            .any(|c| c.id == "routing" && c.status == "pass"));
        assert!(result
            .checks
            .iter()
            .any(|c| c.id == "auth-conflict" && c.status == "warn"));
        assert_eq!(result.model.as_deref(), Some("claude-opus-5-5"));
    }

    #[test]
    fn malformed_configs_never_export_parser_source_or_paths() {
        let result = inspect_claude("{secret=sk-private}");
        assert_eq!(result.checks[0].status, "fail");
        assert!(!serde_json::to_string(&result.checks)
            .unwrap()
            .contains("private"));
        assert_eq!(
            inspect_codex("secret=sk-private", None).checks[0].status,
            "fail"
        );
        assert_eq!(inspect_claude("[]").checks[0].status, "fail");
    }

    #[test]
    fn codex_requires_responses_and_the_selected_gateway() {
        let config = "model = 'gateway-model'\nmodel_provider = 'gateway'\n[model_providers.gateway]\nbase_url = 'https://api.modelswitch.org/v1'\nwire_api = 'responses'\nrequires_openai_auth = true";
        let result = inspect_codex(
            config,
            Some(&serde_json::json!({"OPENAI_API_KEY":"sk-private"})),
        );
        assert!(result.checks.iter().all(|c| c.status == "pass"));
        assert!(!serde_json::to_string(&result.checks)
            .unwrap()
            .contains("sk-private"));
        let invalid = inspect_codex(
            &config
                .replace("'responses'", "'chat'")
                .replace("api.modelswitch.org/v1", "other.example/v1"),
            None,
        );
        assert!(invalid
            .checks
            .iter()
            .any(|c| c.id == "routing" && c.status == "fail"));
        assert!(invalid
            .checks
            .iter()
            .any(|c| c.id == "protocol" && c.status == "fail"));
    }
}
