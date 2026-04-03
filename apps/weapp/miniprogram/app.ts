const { hydrateSession } = require("./store/session");

App({
  globalData: {
    systemName: "学栖",
  },
  onLaunch() {
    hydrateSession();
  },
});
