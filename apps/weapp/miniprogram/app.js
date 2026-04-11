const { hydrateSession } = require("./store/session");

App({
  globalData: {
    systemName: "作业用餐小记",
  },
  onLaunch() {
    hydrateSession();
  },
});
