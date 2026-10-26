use std::path::Path;
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

fn shell_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\"'\"'"))
}

pub(crate) fn terminal_script(path: &Path) -> String {
    let command = format!("bash {}", shell_quote(&path.to_string_lossy()));
    let escaped = command.replace('\\', "\\\\").replace('"', "\\\"");
    format!("tell application \"Terminal\"\n    activate\n    do script \"{escaped}\"\nend tell")
}

pub(crate) fn run_bounded(command: &mut Command, timeout: Duration) -> Result<(), String> {
    let mut child = command
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("无法提交终端启动请求: {e}"))?;
    let started = Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(status)) if status.success() => return Ok(()),
            Ok(Some(status)) => return Err(format!("终端启动请求失败: {status}")),
            Ok(None) if started.elapsed() < timeout => {
                std::thread::sleep(Duration::from_millis(25));
            }
            result => {
                let _ = child.kill();
                let _ = child.wait();
                return Err(match result {
                    Err(e) => format!("读取终端启动结果失败: {e}"),
                    _ => "终端启动请求超时，请检查 macOS 自动化权限".into(),
                });
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn quotes_shell_and_applescript_independently() {
        let script = terminal_script(Path::new("/tmp/user's \"folder\"/launch.command"));
        assert!(script.contains("user'\\\"'\\\"'s"));
        assert!(script.contains("\\\"folder\\\""));
        assert!(script.contains("activate"));
    }

    #[cfg(unix)]
    #[test]
    fn success_failure_and_hung_launcher_are_distinct() {
        assert!(run_bounded(
            Command::new("sh").args(["-c", "exit 0"]),
            Duration::from_secs(1)
        )
        .is_ok());
        assert!(run_bounded(
            Command::new("sh").args(["-c", "exit 7"]),
            Duration::from_secs(1)
        )
        .unwrap_err()
        .contains("失败"));
        let started = Instant::now();
        assert!(
            run_bounded(Command::new("sleep").arg("10"), Duration::from_millis(80))
                .unwrap_err()
                .contains("超时")
        );
        assert!(started.elapsed() < Duration::from_secs(2));
    }
}
