import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const scriptsDir = path.dirname(currentFilePath);
export const repoRoot = path.resolve(scriptsDir, "..");
export const weappRoot = path.join(repoRoot, "apps", "weapp");
export const envFilePath = path.join(weappRoot, "miniprogram", "config", "env.js");
export const localConfigPath = path.join(weappRoot, ".release.local.json");
export const localConfigExamplePath = path.join(weappRoot, "release.local.example.json");
export const projectConfigPath = path.join(weappRoot, "project.config.json");
export const releaseConfigPath = path.join(weappRoot, "release.json");

export async function readJSON(filePath, label) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      throw new Error(`${label}不存在：${filePath}`);
    }

    throw new Error(`${label}解析失败：${filePath}`);
  }
}

export async function writeJSON(filePath, value) {
  const content = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(filePath, content, "utf8");
}

export async function loadReleaseConfig() {
  const config = await readJSON(releaseConfigPath, "小程序版本配置");
  const version = normalizeVersion(config.version);
  if (!version) {
    throw new Error("release.json 中的 version 必须为 x.y.z 格式");
  }

  return {
    desc: String(config.desc || "").trim(),
    version,
  };
}

export async function saveReleaseConfig(config) {
  await writeJSON(releaseConfigPath, {
    desc: String(config.desc || "").trim(),
    version: normalizeVersion(config.version),
  });
}

export async function loadLocalReleaseConfig() {
  const config = await readJSON(localConfigPath, "小程序本地发布配置");
  const privateKeyPath = resolveLocalPath(String(config.privateKeyPath || "").trim());
  const devBaseURL = String(config.devBaseURL || "").trim();
  const prodBaseURL = String(config.prodBaseURL || "").trim();
  const robot = Number(config.robot || 1);

  if (!privateKeyPath) {
    throw new Error("`.release.local.json` 中缺少 privateKeyPath");
  }
  if (!devBaseURL) {
    throw new Error("`.release.local.json` 中缺少 devBaseURL");
  }
  if (!prodBaseURL) {
    throw new Error("`.release.local.json` 中缺少 prodBaseURL");
  }

  await assertFileExists(privateKeyPath, "小程序上传密钥");

  return {
    devBaseURL,
    privateKeyPath,
    prodBaseURL,
    robot: Number.isFinite(robot) && robot > 0 ? Math.floor(robot) : 1,
  };
}

export async function loadProjectConfig() {
  const config = await readJSON(projectConfigPath, "小程序工程配置");
  const appid = String(config.appid || "").trim();
  if (!appid) {
    throw new Error("project.config.json 中缺少 appid");
  }

  return config;
}

export async function readEnvBaseURL() {
  const content = await fs.readFile(envFilePath, "utf8");
  const match = content.match(/baseURL:\s*"([^"]*)"/);
  if (!match) {
    throw new Error("env.js 中未找到 baseURL 配置");
  }

  return match[1];
}

export async function writeEnvBaseURL(nextBaseURL) {
  const content = await fs.readFile(envFilePath, "utf8");
  const nextContent = content.replace(
    /baseURL:\s*"([^"]*)"/,
    `baseURL: "${escapeForDoubleQuotedString(nextBaseURL)}"`,
  );

  if (content === nextContent) {
    if (!/baseURL:\s*"([^"]*)"/.test(content)) {
      throw new Error("env.js 中未找到可替换的 baseURL");
    }
    return;
  }

  await fs.writeFile(envFilePath, nextContent, "utf8");
}

export function parseArgs(argv) {
  const positional = [];
  const named = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith("--")) {
      positional.push(current);
      continue;
    }

    const [rawKey, inlineValue] = current.slice(2).split("=", 2);
    if (!rawKey) {
      continue;
    }

    if (inlineValue !== undefined) {
      named[rawKey] = inlineValue;
      continue;
    }

    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      named[rawKey] = next;
      index += 1;
      continue;
    }

    named[rawKey] = "true";
  }

  return { named, positional };
}

export function normalizeVersion(value) {
  const version = String(value || "").trim();
  return /^\d+\.\d+\.\d+$/.test(version) ? version : "";
}

export function bumpVersion(version, releaseType) {
  const normalizedVersion = normalizeVersion(version);
  if (!normalizedVersion) {
    throw new Error("当前版本号不是合法的 x.y.z 格式");
  }

  const [major, minor, patch] = normalizedVersion.split(".").map((item) => Number(item));
  switch (releaseType) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error("仅支持 bump patch|minor|major");
  }
}

export function resolveUploadDescription(releaseConfig, overrideDesc) {
  const desc = String(overrideDesc || releaseConfig.desc || "").trim();
  return desc || `上传版本 ${releaseConfig.version}`;
}

export async function runNodeScript(scriptPath, args = []) {
  const { spawn } = await import("node:child_process");

  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: repoRoot,
      stdio: "inherit",
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`脚本执行失败：${path.basename(scriptPath)}（退出码 ${code}）`));
    });
    child.on("error", reject);
  });
}

export function printKeyValue(label, value) {
  console.log(`${label}: ${value}`);
}

async function assertFileExists(filePath, label) {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`${label}不存在：${filePath}`);
  }
}

function resolveLocalPath(targetPath) {
  if (!targetPath) {
    return "";
  }
  if (path.isAbsolute(targetPath)) {
    return targetPath;
  }

  return path.resolve(weappRoot, targetPath);
}

function escapeForDoubleQuotedString(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
