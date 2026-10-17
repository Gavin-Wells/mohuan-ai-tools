import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createManifest } from "./generate-updater-manifest.mjs";

test("requires all signed platform bundles and preserves signature contents", () => {
  const dir = mkdtempSync(join(tmpdir(), "modelswitch-updater-"));
  try {
    assert.throws(() =>
      createManifest(dir, "Gavin-Wells/mohuan-ai-tools", "v1.0.15"),
    );
    for (const suffix of [
      "macOS.tar.gz",
      "Windows-Setup.exe",
      "Linux-x86_64.AppImage",
      "Linux-arm64.AppImage",
    ]) {
      const path = join(dir, `modelswitch-tools-v1.0.15-${suffix}`);
      writeFileSync(path, "test artifact");
      writeFileSync(`${path}.sig`, 'signature with "quotes"\nand newline\n');
    }
    const manifest = createManifest(
      dir,
      "Gavin-Wells/mohuan-ai-tools",
      "v1.0.15",
    );
    assert.equal(manifest.version, "1.0.15");
    assert.equal(Object.keys(manifest.platforms).length, 5);
    assert.match(
      manifest.platforms["windows-x86_64"].url,
      /Windows-Setup\.exe$/,
    );
    assert.equal(
      JSON.parse(JSON.stringify(manifest)).platforms["linux-aarch64"].signature,
      'signature with "quotes"\nand newline',
    );
    writeFileSync(
      join(dir, "modelswitch-tools-v1.0.15-Windows-Setup.exe.sig"),
      "",
    );
    assert.throws(
      () => createManifest(dir, "Gavin-Wells/mohuan-ai-tools", "v1.0.15"),
      /Missing signed artifact/,
    );
    assert.throws(
      () => createManifest(dir, "../invalid", "v1.0.15"),
      /Invalid release/,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
