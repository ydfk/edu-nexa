const { hydrateSession } = require("./store/session");

App({
  globalData: {
    systemName: "壹一小屋 学栖·EduNexa",
  },
  onLaunch() {
    hydrateSession();
  },
});
