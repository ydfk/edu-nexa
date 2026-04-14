import path from "node:path";
import {
  bumpVersion,
  ensureMiniprogramCICompatibility,
  loadLocalReleaseConfig,
  loadProjectConfig,
  loadReleaseConfig,
  normalizeVersion,
  parseArgs,
  printKeyValue,
  projectConfigPath,
  releaseConfigPath,
  repoRoot,
  resolveUploadDescription,
  runNodeScript,
  saveReleaseConfig,
  syncRuntimeReleaseConfig,
  weappRoot,
  writeEnvBaseURL,
} from "./weapp-release-utils.mjs";

async function main() {
  const { named } = parseArgs(process.argv.slice(2));
  await ensureMiniprogramCICompatibility();
  const releaseConfig = await loadReleaseConfig();
  const localConfig = await loadLocalReleaseConfig();
  const projectConfig = await loadProjectConfig();

  const releaseState = resolveUploadReleaseState(releaseConfig, named);
  const uploadDesc = resolveUploadDescription(releaseState, releaseState.desc);
  await syncRuntimeReleaseConfig(releaseState);
  const ci = await loadMiniprogramCI();
  const project = new ci.Project({
    appid: projectConfig.appid,
    ignores: ["node_modules/**/*"],
    privateKeyPath: localConfig.privateKeyPath,
    projectPath: weappRoot,
    type: "miniProgram",
  });

  await writeEnvBaseURL(localConfig.prodBaseURL);

  try {
    await runNodeScript(path.join(repoRoot, "scripts", "verify-weapp.mjs"));

    console.log("开始上传微信小程序代码...");
    printKeyValue("project", projectConfig.projectname || path.basename(weappRoot));
    printKeyValue("previousVersion", releaseConfig.version);
    printKeyValue("version", releaseState.version);
    printKeyValue("desc", uploadDesc);
    printKeyValue("env.js", localConfig.prodBaseURL);
    printKeyValue("project.config", projectConfigPath);
    printKeyValue("release", releaseConfigPath);

    await ci.upload({
      desc: uploadDesc,
      onProgressUpdate(progress) {
        if (!progress) {
          return;
        }

        const message = [progress.message, progress.status]
          .filter(Boolean)
          .join(" | ")
          .trim();
        if (message) {
          console.log(message);
        }
      },
      project,
      robot: localConfig.robot,
      setting: {
        ...(projectConfig.setting || {}),
      },
      version: releaseState.version,
    });

    await saveReleaseConfig(releaseState);
    console.log("微信小程序上传完成。");
  } finally {
    await writeEnvBaseURL(localConfig.devBaseURL);
  }
}

async function loadMiniprogramCI() {
  try {
    const module = await import("miniprogram-ci");
    return module.default || module;
  } catch (error) {
    throw new Error("未安装 miniprogram-ci，请先执行 pnpm install");
  }
}

function resolveUploadReleaseState(releaseConfig, named) {
  const requestedVersion = normalizeVersion(named.version);
  const requestedDesc = resolveOverrideDesc(named);

  if (named.version && !requestedVersion) {
    throw new Error("请通过 --version 传入合法版本号，例如：pnpm weapp:upload -- --version 1.0.1");
  }

  return {
    ...releaseConfig,
    desc: requestedDesc || releaseConfig.desc || "",
    version: requestedVersion || bumpVersion(releaseConfig.version, "patch"),
  };
}

function resolveOverrideDesc(named) {
  return String(named.desc || named.remark || "").trim();
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
