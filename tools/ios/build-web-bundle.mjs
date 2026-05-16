#!/usr/bin/env node

import { cp, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const mappings = {
  nucleum: { app: "nucleus", iosTarget: "nucleum" },
  memotron: { app: "memotron", iosTarget: "memotron" },
  pointron: { app: "pointron", iosTarget: "pointron" }
};

const [mappingName, ...restArgs] = process.argv.slice(2);

function usage() {
  console.error(
    [
      "Usage:",
      "  node tools/ios/build-web-bundle.mjs <nucleum|memotron|pointron> [-- <extra build args>]",
      "",
      "Examples:",
      "  node tools/ios/build-web-bundle.mjs nucleum",
      "  node tools/ios/build-web-bundle.mjs memotron -- --mode live"
    ].join("\n")
  );
}

if (!mappingName || !mappings[mappingName]) {
  usage();
  process.exit(1);
}

const passthroughIndex = restArgs.indexOf("--");
const buildArgs = passthroughIndex === -1 ? [] : restArgs.slice(passthroughIndex + 1);
const { app, iosTarget } = mappings[mappingName];
const appDir = path.join(repoRoot, "apps", app);
const buildDir = path.join(appDir, "build");
const outputDir = path.join(repoRoot, "ios", iosTarget, "www");

async function assertDirectory(dir, label) {
  try {
    const dirStat = await stat(dir);
    if (!dirStat.isDirectory()) {
      throw new Error(`${label} is not a directory: ${dir}`);
    }
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(`${label} does not exist: ${dir}`);
    }
    throw error;
  }
}

function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false,
      ...options
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

await assertDirectory(appDir, "App directory");
await assertDirectory(path.join(repoRoot, "ios", iosTarget), "iOS target directory");

console.log(`Building apps/${app} for ios/${iosTarget}/www...`);
await run("npm", ["run", "build", "--", ...buildArgs], {
  cwd: appDir,
  env: {
    ...process.env,
    VITE_NATIVE_EMBED: "true"
  }
});

await assertDirectory(buildDir, "Web build output");
await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await cp(buildDir, outputDir, {
  recursive: true,
  force: true,
  errorOnExist: false
});

console.log(`Copied apps/${app}/build to ios/${iosTarget}/www`);
