const { release } = require("../../config/release");

Page({
  data: {
    version: release.version || "",
  },
});
