const { request } = require("./request");

function getRuntimeSettings() {
  return request({ method: "GET", url: "/runtime-settings" });
}

function getHomeConfig() {
  return request({ method: "GET", url: "/home-config" });
}

function getOverview() {
  return request({ method: "GET", url: "/overview" });
}

module.exports = { getRuntimeSettings, getHomeConfig, getOverview };
