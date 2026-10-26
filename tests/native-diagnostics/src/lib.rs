#![allow(non_snake_case, dead_code)]

fn fixture_root() -> &'static std::path::Path {
    static ROOT: std::sync::OnceLock<tempfile::TempDir> = std::sync::OnceLock::new();
    ROOT.get_or_init(|| tempfile::tempdir().unwrap()).path()
}
mod config {
    pub fn get_claude_settings_path() -> std::path::PathBuf {
        crate::fixture_root().join("settings.json")
    }
}
mod codex_config {
    pub fn get_codex_config_path() -> std::path::PathBuf {
        crate::fixture_root().join("config.toml")
    }
}
mod commands {
    pub mod client_diagnostics {
        include!(concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../../src-tauri/src/commands/client_diagnostics.rs"
        ));
    }
    pub mod misc {
        pub fn diagnostic_runtime(_: &str) -> Option<(&'static str, Option<String>)> {
            Some(("claude-cli", Some("2.1.310".into())))
        }
    }
    pub mod diagnostics {
        include!(concat!(env!("OUT_DIR"), "/diagnostics.rs"));
    }
}

#[cfg(test)]
mod tests {
    #[tokio::test]
    async fn command_is_read_only_and_skips_network_without_a_key() {
        let path = crate::config::get_claude_settings_path();
        let text = r#"{"env":{"ANTHROPIC_AUTH_TOKEN":"sk-private-config","ANTHROPIC_BASE_URL":"https://api.modelswitch.org"}}"#;
        std::fs::write(&path, text).unwrap();
        let result = crate::commands::diagnostics::run_client_self_check("claude".into(), None)
            .await
            .unwrap();
        assert_eq!(result["schema_version"], 1);
        let exported = result.to_string();
        assert!(!exported.contains("sk-private-config"));
        assert!(!exported.contains(crate::fixture_root().to_str().unwrap()));
        assert!(result["checks"]
            .as_array()
            .unwrap()
            .iter()
            .any(|check| check["id"] == "gateway-auth" && check["status"] == "skipped"));
        assert_eq!(std::fs::read_to_string(path).unwrap(), text);
    }

    #[tokio::test]
    async fn rejects_unknown_clients_before_inspection() {
        assert!(crate::commands::diagnostics::run_client_self_check(
            "untrusted-client".into(),
            None
        )
        .await
        .is_err());
    }
}
