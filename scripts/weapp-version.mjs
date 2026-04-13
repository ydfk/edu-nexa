import {
  bumpVersion,
  loadReleaseConfig,
  parseArgs,
  printKeyValue,
  saveReleaseConfig,
} from "./weapp-release-utils.mjs";

async function main() {
  const { named, positional } = parseArgs(process.argv.slice(2));
  const action = positional[0] || "show";
  const releaseConfig = await loadReleaseConfig();

  switch (action) {
    case "show":
      printReleaseConfig(releaseConfig);
      return;
    case "set": {
      const nextVersion = positional[1];
      if (!nextVersion) {
        throw new Error("请提供要设置的版本号，例如：pnpm weapp:version -- set 1.2.3");
      }

      const nextConfig = {
        ...releaseConfig,
        desc: resolveNextDesc(releaseConfig.desc, named.desc),
        version: nextVersion,
      };
      await saveReleaseConfig(nextConfig);
      printReleaseConfig(nextConfig);
      return;
    }
    case "bump": {
      const releaseType = positional[1] || "patch";
      const nextConfig = {
        ...releaseConfig,
        desc: resolveNextDesc(releaseConfig.desc, named.desc),
        version: bumpVersion(releaseConfig.version, releaseType),
      };
      await saveReleaseConfig(nextConfig);
      printReleaseConfig(nextConfig);
      return;
    }
    case "desc": {
      const nextDesc = positional.slice(1).join(" ").trim() || String(named.value || "").trim();
      if (!nextDesc) {
        throw new Error("请提供版本说明，例如：pnpm weapp:version -- desc 修复附件预览");
      }

      const nextConfig = {
        ...releaseConfig,
        desc: nextDesc,
      };
      await saveReleaseConfig(nextConfig);
      printReleaseConfig(nextConfig);
      return;
    }
    default:
      throw new Error("仅支持 show、set、bump、desc 四种命令");
  }
}

function printReleaseConfig(config) {
  printKeyValue("version", config.version);
  printKeyValue("desc", config.desc || "-");
}

function resolveNextDesc(currentDesc, overrideDesc) {
  const trimmed = String(overrideDesc || "").trim();
  return trimmed || currentDesc || "";
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
