use super::client_diagnostics::{check, inspect_config, DiagnosticCheck};
use serde_json::Value;
use std::path::PathBuf;
use std::time::Duration;

const GATEWAY: &str = "https://api.modelswitch.org/v1";

// Only fixed first-party URLs are probed. Never return upstream bodies or errors.
async fn gateway_json(
    client: &reqwest::Client,
    endpoint: &str,
    key: &str,
) -> Result<Value, &'static str> {
    let mut response = client
        .get(format!("{GATEWAY}/{endpoint}"))
        .bearer_auth(key)
        .send()
        .await
        .map_err(|error| {
            if error.is_timeout() {
                "网关连接超时"
            } else {
                "网关连接失败，请检查网络、代理或证书"
            }
        })?;
    match response.status().as_u16() {
        200 => {}
        401 | 403 => return Err("网关拒绝凭据，请检查 Key 是否有效或已撤销"),
        429 => return Err("网关请求受限，请稍后重试"),
        300..=399 => return Err("网关返回重定向，已阻止发送凭据到其他地址"),
        500..=599 => return Err("网关服务暂不可用"),
        _ => return Err("网关返回非预期状态"),
    }
    let mut body = Vec::new();
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|_| "网关响应读取失败或超时")?
    {
        if body.len() + chunk.len() > 1024 * 1024 {
            return Err("网关响应超过自检大小限制");
        }
        body.extend_from_slice(&chunk);
    }
    serde_json::from_slice(&body).map_err(|_| "网关响应不是有效 JSON")
}

async fn network_checks(key: &str, model: Option<&str>) -> Vec<DiagnosticCheck> {
    if key.trim().is_empty() {
        return vec![check(
            "gateway-auth",
            "网关与 Key",
            "skipped",
            "尚未输入 Key，未发起鉴权检查",
        )];
    }
    let Ok(client) = reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(5))
        .timeout(Duration::from_secs(10))
        .redirect(reqwest::redirect::Policy::none())
        .build()
    else {
        return vec![check(
            "gateway-auth",
            "网关与 Key",
            "fail",
            "无法初始化安全网络连接",
        )];
    };
    let mut checks = match gateway_json(&client, "me", key.trim()).await {
        Ok(body) if body.get("billing").is_some_and(Value::is_object) => vec![check(
            "gateway-auth",
            "网关与 Key",
            "pass",
            "网关已响应，当前 Key 鉴权通过",
        )],
        Ok(_) => {
            return vec![check(
                "gateway-auth",
                "网关与 Key",
                "fail",
                "账户接口响应格式不符合预期",
            )]
        }
        Err(detail) => return vec![check("gateway-auth", "网关与 Key", "fail", detail)],
    };
    match gateway_json(&client, "models", key.trim()).await {
        Ok(body) => {
            if let Some(models) = body.get("data").and_then(Value::as_array) {
                checks.push(check(
                    "model-list",
                    "模型列表",
                    "pass",
                    "已读取模型列表；不代表实际推理可用",
                ));
                if let Some(model) = model.filter(|v| !v.trim().is_empty()) {
                    let listed = models
                        .iter()
                        .any(|v| v.get("id").and_then(Value::as_str) == Some(model));
                    checks.push(check(
                        "selected-model",
                        "配置模型",
                        if listed { "pass" } else { "warn" },
                        if listed {
                            "配置的模型在当前 Key 的模型列表中"
                        } else {
                            "配置的模型不在当前 Key 的模型列表中，请重新配置或核对权限"
                        },
                    ));
                } else {
                    checks.push(check(
                        "selected-model",
                        "配置模型",
                        "warn",
                        "未找到显式默认模型，实际模型需在会话中确认",
                    ));
                }
            } else {
                checks.push(check(
                    "model-list",
                    "模型列表",
                    "fail",
                    "模型列表格式不符合预期",
                ));
            }
        }
        Err(detail) => checks.push(check("model-list", "模型列表", "fail", detail)),
    }
    checks
}

#[tauri::command]
pub async fn run_client_self_check(tool: String, apiKey: Option<String>) -> Result<Value, String> {
    if !matches!(tool.as_str(), "claude" | "codex") {
        return Err("不支持的客户端类型".into());
    }
    let task = async move {
        let local_tool = tool.clone();
        let (mut checks, model, runtime, runtime_version) =
            tokio::task::spawn_blocking(move || {
                let written = if local_tool == "claude" {
                    crate::config::get_claude_settings_path()
                } else {
                    crate::codex_config::get_codex_config_path()
                };
                let override_dir = std::env::var_os(if local_tool == "claude" {
                    "CLAUDE_CONFIG_DIR"
                } else {
                    "CODEX_HOME"
                })
                .map(PathBuf::from);
                let path = override_dir
                    .as_ref()
                    .filter(|p| p.is_absolute())
                    .map(|dir| {
                        dir.join(if local_tool == "claude" {
                            "settings.json"
                        } else {
                            "config.toml"
                        })
                    })
                    .unwrap_or_else(|| written.clone());
                let auth_path = path
                    .parent()
                    .unwrap_or(std::path::Path::new("."))
                    .join("auth.json");
                let inspection = inspect_config(&local_tool, &path, &auth_path);
                let mut checks = inspection.checks;
                if override_dir.is_some() && path != written {
                    checks.push(check(
                        "config-directory",
                        "配置目录",
                        "warn",
                        "客户端环境变量指定的目录与工具写入目录不同，请核对生效配置",
                    ));
                }
                let detected = super::misc::diagnostic_runtime(&local_tool);
                checks.insert(
                    0,
                    check(
                        "installation",
                        "客户端安装",
                        if detected.is_some() { "pass" } else { "fail" },
                        if detected.is_some() {
                            "已找到客户端运行环境"
                        } else {
                            "未找到有效客户端，或 CLI 版本检测失败"
                        },
                    ),
                );
                let (runtime, version) = detected
                    .map(|(kind, version)| (Some(kind), version))
                    .unwrap_or((None, None));
                (checks, inspection.model, runtime, version)
            })
            .await
            .map_err(|_| "本地自检任务失败".to_string())?;
        checks.extend(network_checks(apiKey.as_deref().unwrap_or(""), model.as_deref()).await);
        checks.push(check(
            "launch",
            "启动状态",
            "skipped",
            "只读自检不启动终端，未验证客户端进程是否运行",
        ));
        checks.push(check(
            "inference",
            "生成与工具调用",
            "skipped",
            "未执行付费推理，流式输出、图片和工具调用仍需单独验证",
        ));
        Ok(serde_json::json!({
            "schema_version": 1,
            "tool": tool,
            "client_version": env!("CARGO_PKG_VERSION"),
            "platform": std::env::consts::OS,
            "arch": std::env::consts::ARCH,
            "captured_at": chrono::Utc::now().to_rfc3339(),
            "runtime": runtime,
            "runtime_version": runtime_version,
            "checks": checks,
        }))
    };
    tokio::time::timeout(Duration::from_secs(45), task)
        .await
        .map_err(|_| "自检超时，可能卡在客户端检测或网络连接，请稍后重试".to_string())?
}
