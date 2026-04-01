const { hydrateSession } = require("./store/session");

App({
  globalData: {
    systemName: "学栖 · EduNexa",
  },
  onLaunch() {
    hydrateSession();
  },
});
