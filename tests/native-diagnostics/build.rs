fn main() {
    let source = "../../src-tauri/src/commands/diagnostics.rs";
    println!("cargo:rerun-if-changed={source}");
    // Compile the production command logic without requiring a GUI/WebKit SDK.
    let text = std::fs::read_to_string(source)
        .unwrap()
        .replace("#[tauri::command]", "");
    std::fs::write(
        std::path::PathBuf::from(std::env::var_os("OUT_DIR").unwrap()).join("diagnostics.rs"),
        text,
    )
    .unwrap();
}
