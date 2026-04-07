import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const repoRoot = process.cwd();
const weappRoot = path.join(repoRoot, "apps", "weapp");
const filesToCheck = [
  path.join(weappRoot, "project.config.json"),
  path.join(weappRoot, "project.private.config.json"),
  path.join(weappRoot, "sitemap.json"),
  path.join(weappRoot, "miniprogram", "app.json"),
];

for (const filePath of filesToCheck) {
  JSON.parse(fs.readFileSync(filePath, "utf8"));
}

verifyDirectory(path.join(weappRoot, "miniprogram"));

function verifyDirectory(currentDir) {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      if (shouldIgnoreDirectory(entry.name)) {
        continue;
      }

      verifyDirectory(fullPath);
      continue;
    }

    if (!entry.isFile() || !fullPath.endsWith(".js")) {
      continue;
    }

    verifyJavaScriptFile(fullPath);
  }
}

function shouldIgnoreDirectory(dirName) {
  return dirName === "dist" || dirName === "node_modules" || dirName === "miniprogram_npm";
}

function verifyJavaScriptFile(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  new vm.Script(source, { filename: filePath });
}
