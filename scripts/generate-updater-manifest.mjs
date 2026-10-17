import { readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";

export function createManifest(directory, repository, tag) {
  if (
    !/^[A-Za-z0-9][\w.-]*\/[A-Za-z0-9][\w.-]*$/.test(repository) ||
    !/^v\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(tag)
  ) {
    throw new Error("Invalid release repository or tag");
  }
  const platforms = {};
  for (const [suffix, keys] of [
    ["macOS.tar.gz", ["darwin-aarch64", "darwin-x86_64"]],
    ["Windows-Setup.exe", ["windows-x86_64"]],
    ["Linux-x86_64.AppImage", ["linux-x86_64"]],
    ["Linux-arm64.AppImage", ["linux-aarch64"]],
  ]) {
    const name = `modelswitch-tools-${tag}-${suffix}`;
    const artifact = readFileSync(join(directory, name));
    const signature = readFileSync(
      join(directory, `${name}.sig`),
      "utf8",
    ).trim();
    if (!artifact.length || !signature)
      throw new Error(`Missing signed artifact: ${name}`);
    for (const key of keys)
      platforms[key] = {
        signature,
        url: `https://github.com/${repository}/releases/download/${tag}/${name}`,
      };
  }
  return {
    version: tag.slice(1),
    notes: `Release ${tag}`,
    pub_date: new Date().toISOString(),
    platforms,
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const manifest = createManifest(
    process.argv[2] || "dl",
    process.env.REPO,
    process.env.TAG,
  );
  writeFileSync("latest.json", JSON.stringify(manifest, null, 2) + "\n");
  console.log(
    `Signed update manifest ready: ${manifest.version}, ${Object.keys(manifest.platforms).length} targets`,
  );
}
