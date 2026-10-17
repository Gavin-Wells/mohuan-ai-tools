use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

pub(super) fn is_desktop_path(path: &Path) -> bool {
    let path = path.to_string_lossy().replace('\\', "/").to_lowercase();
    path.contains("/windowsapps/")
        || path.contains("/programs/claude/")
        || path.contains("/appdata/local/claude/")
        || path.contains("/claude.app/")
}

fn cli_version(output: &str) -> Option<String> {
    for line in output.lines() {
        let Some(version) = line.trim().strip_suffix(" (Claude Code)") else {
            continue;
        };
        let core = version.split('-').next()?;
        let parts: Vec<_> = core.split('.').collect();
        if parts.len() == 3
            && parts
                .iter()
                .all(|part| !part.is_empty() && part.bytes().all(|c| c.is_ascii_digit()))
        {
            return Some(version.to_string());
        }
    }
    None
}

fn probe(path: &Path) -> Option<String> {
    if !path.is_file() || is_desktop_path(path) {
        return None;
    }
    #[cfg(target_os = "windows")]
    let mut command = {
        use std::os::windows::process::CommandExt;
        let mut command = if path
            .extension()
            .and_then(|ext| ext.to_str())
            .is_some_and(|ext| ext.eq_ignore_ascii_case("cmd"))
        {
            let mut command = Command::new("cmd.exe");
            command.args([
                "/D",
                "/C",
                &format!("call \"{}\" --version", path.display()),
            ]);
            command
        } else {
            let mut command = Command::new(path);
            command.arg("--version");
            command
        };
        command.creation_flags(0x08000000);
        command
    };
    #[cfg(not(target_os = "windows"))]
    let mut command = {
        let mut command = Command::new(path);
        command.arg("--version");
        command
    };

    // A file avoids pipe backpressure or inherited pipes hanging the version check.
    let output = tempfile::tempfile().ok()?;
    command
        .stdin(Stdio::null())
        .stdout(output.try_clone().ok()?)
        .stderr(Stdio::null());
    let mut paths = vec![path.parent()?.to_path_buf()];
    paths.extend(std::env::split_paths(
        &std::env::var_os("PATH").unwrap_or_default(),
    ));
    command.env("PATH", std::env::join_paths(paths).ok()?);
    let mut child = command.spawn().ok()?;
    let start = Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(status)) => {
                if !status.success() {
                    return None;
                }
                use std::io::{Read, Seek, SeekFrom};
                let mut output = output;
                output.seek(SeekFrom::Start(0)).ok()?;
                let mut text = String::new();
                output.take(8192).read_to_string(&mut text).ok()?;
                return cli_version(&text);
            }
            Ok(None) if start.elapsed() < Duration::from_secs(5) => {
                std::thread::sleep(Duration::from_millis(50));
            }
            _ => {
                let _ = child.kill();
                let _ = child.wait();
                return None;
            }
        }
    }
}

pub(super) fn find() -> Option<(PathBuf, String)> {
    let mut dirs = Vec::new();
    if let Some(home) = dirs::home_dir() {
        for suffix in [".local/bin", ".npm-global/bin", ".volta/bin", "n/bin"] {
            dirs.push(home.join(suffix));
        }
    }
    #[cfg(target_os = "windows")]
    {
        if let Some(appdata) = std::env::var_os("APPDATA") {
            dirs.push(PathBuf::from(appdata).join("npm"));
        }
        if let Some(local) = std::env::var_os("LOCALAPPDATA") {
            dirs.push(PathBuf::from(local).join("Microsoft/WinGet/Links"));
        }
    }
    #[cfg(not(target_os = "windows"))]
    for dir in ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin"] {
        dirs.push(PathBuf::from(dir));
    }
    dirs.extend(std::env::split_paths(
        &std::env::var_os("PATH").unwrap_or_default(),
    ));
    let mut seen = std::collections::HashSet::new();
    for dir in dirs {
        #[cfg(target_os = "windows")]
        let names = ["claude.exe", "claude.cmd"];
        #[cfg(not(target_os = "windows"))]
        let names = ["claude"];
        for name in names {
            let path = dir.join(name);
            if seen.insert(path.clone()) {
                if let Some(version) = probe(&path) {
                    return Some((path, version));
                }
            }
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_desktop_and_store_aliases() {
        for path in [
            r"C:\Users\a\AppData\Local\Microsoft\WindowsApps\claude.exe",
            r"C:\Users\a\AppData\Local\Programs\Claude\Claude.exe",
            r"C:\Users\a\AppData\Local\Claude\app-1.0\claude.exe",
            "/Applications/Claude.app/Contents/MacOS/Claude",
        ] {
            assert!(is_desktop_path(Path::new(path)));
        }
        assert!(!is_desktop_path(Path::new(
            r"C:\Users\a\.local\bin\claude.exe"
        )));
        assert!(!is_desktop_path(Path::new(
            r"C:\Users\a\AppData\Roaming\npm\claude.cmd"
        )));
    }

    #[test]
    fn accepts_only_actual_claude_code_version_output() {
        assert_eq!(
            cli_version("2.1.302 (Claude Code)\n"),
            Some("2.1.302".into())
        );
        assert_eq!(
            cli_version("2.1.302-beta.1 (Claude Code)"),
            Some("2.1.302-beta.1".into())
        );
        for text in [
            "1.0.0",
            "Claude for Windows",
            "<html>2.1.302</html>",
            "error",
            "",
        ] {
            assert_eq!(cli_version(text), None);
        }
    }

    #[cfg(unix)]
    #[test]
    fn probes_real_binary_and_rejects_invalid_output() {
        use std::os::unix::fs::PermissionsExt;
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("claude");
        std::fs::write(&path, "#!/bin/sh\nprintf '2.1.302 (Claude Code)\\n'\n").unwrap();
        std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o700)).unwrap();
        assert_eq!(probe(&path), Some("2.1.302".into()));
        std::fs::write(&path, "#!/bin/sh\nprintf 'Desktop 1.0.0\\n'\n").unwrap();
        assert_eq!(probe(&path), None);
    }

    #[cfg(unix)]
    #[test]
    fn does_not_execute_desktop_alias_and_times_out_stalled_cli() {
        use std::os::unix::fs::PermissionsExt;
        let dir = tempfile::tempdir().unwrap();
        let desktop_dir = dir.path().join("WindowsApps");
        std::fs::create_dir(&desktop_dir).unwrap();
        let desktop = desktop_dir.join("claude");
        let marker = dir.path().join("launched");
        std::fs::write(
            &desktop,
            format!("#!/bin/sh\ntouch '{}'\n", marker.display()),
        )
        .unwrap();
        std::fs::set_permissions(&desktop, std::fs::Permissions::from_mode(0o700)).unwrap();
        assert_eq!(probe(&desktop), None);
        assert!(!marker.exists());
        let stalled = dir.path().join("claude");
        std::fs::write(&stalled, "#!/bin/sh\nexec sleep 30\n").unwrap();
        std::fs::set_permissions(&stalled, std::fs::Permissions::from_mode(0o700)).unwrap();
        let start = Instant::now();
        assert_eq!(probe(&stalled), None);
        assert!(start.elapsed() < Duration::from_secs(8));
    }
}
