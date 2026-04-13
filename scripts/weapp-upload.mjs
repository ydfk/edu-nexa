import path from "node:path";
import {
  loadLocalReleaseConfig,
  loadProjectConfig,
  loadReleaseConfig,
  parseArgs,
  printKeyValue,
  projectConfigPath,
  releaseConfigPath,
  repoRoot,
  resolveUploadDescription,
  runNodeScript,
  saveReleaseConfig,
  weappRoot,
  writeEnvBaseURL,
} from "./weapp-release-utils.mjs";

async function main() {
  const { named } = parseArgs(process.argv.slice(2));
  const releaseConfig = await loadReleaseConfig();
  const localConfig = await loadLocalReleaseConfig();
  const projectConfig = await loadProjectConfig();

  const nextVersion = String(named.version || "").trim();
  const nextDesc = String(named.desc || "").trim();
  const releaseState = nextVersion
    ? {
        ...releaseConfig,
        version: nextVersion,
      }
    : releaseConfig;

  if (nextVersion) {
    await saveReleaseConfig(releaseState);
  }

  const uploadDesc = resolveUploadDescription(releaseState, nextDesc);
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

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
