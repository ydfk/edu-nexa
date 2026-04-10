/*
 * 本地私有覆盖示例：
 * 1) 复制本文件为 env.local.js
 * 2) 按需修改本地地址
 * 3) env.local.js 已加入 .gitignore，不会提交到仓库
 */

module.exports = {
  // 方式一：按环境版本覆盖
  API_BASE_URL_BY_ENV: {
    develop: "http://127.0.0.1:33001/api",
    trial: "https://trial-api.example.com/api",
    release: "https://api.example.com/api",
  },

  // 方式二：强制覆盖当前运行环境地址（优先级更高）
  // baseURL: "http://192.168.1.10:33001/api",
};
