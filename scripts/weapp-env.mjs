import {
  loadLocalReleaseConfig,
  parseArgs,
  printKeyValue,
  readEnvBaseURL,
  writeEnvBaseURL,
} from "./weapp-release-utils.mjs";

async function main() {
  const { positional } = parseArgs(process.argv.slice(2));
  const action = positional[0] || "show";

  if (action === "show") {
    printKeyValue("baseURL", await readEnvBaseURL());
    return;
  }

  const localConfig = await loadLocalReleaseConfig();
  if (action === "dev") {
    await writeEnvBaseURL(localConfig.devBaseURL);
    printKeyValue("baseURL", localConfig.devBaseURL);
    return;
  }
  if (action === "prod") {
    await writeEnvBaseURL(localConfig.prodBaseURL);
    printKeyValue("baseURL", localConfig.prodBaseURL);
    return;
  }

  throw new Error("仅支持 show、dev、prod 三种命令");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
