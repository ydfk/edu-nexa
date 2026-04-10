/*
 * 小程序不支持像 Vite 一样直接读取 .env 文件。
 * 这里按小程序环境版本（develop/trial/release）选择接口地址。
 */

const API_BASE_URL_BY_ENV = {
  develop: "http://127.0.0.1:33001/api",
  trial: "https://api.example.com/api",
  release: "https://api.example.com/api",
};

const localOverride = loadLocalOverride();
const mergedAPIBaseURLByEnv = {
  ...API_BASE_URL_BY_ENV,
  ...(localOverride.API_BASE_URL_BY_ENV || {}),
};

function getMiniProgramEnvVersion() {
  try {
    const info = wx.getAccountInfoSync();
    const envVersion = info && info.miniProgram && info.miniProgram.envVersion;
    return envVersion || "develop";
  } catch (error) {
    return "develop";
  }
}

function getBaseURLByEnvVersion(envVersion) {
  return mergedAPIBaseURLByEnv[envVersion] || mergedAPIBaseURLByEnv.develop;
}

function loadLocalOverride() {
  try {
    // 本地私有覆盖文件（已在 .gitignore 忽略）
    return require("./env.local");
  } catch (error) {
    return {};
  }
}

const envVersion = getMiniProgramEnvVersion();

const env = {
  envVersion,
  baseURL: localOverride.baseURL || getBaseURLByEnvVersion(envVersion),
};

module.exports = {
  API_BASE_URL_BY_ENV: mergedAPIBaseURLByEnv,
  env,
};
