#!/usr/bin/env node

import { access, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const vendorRoot = path.join(repoRoot, "ios", "vendor");
const whisperDir = path.join(vendorRoot, "whisper.cpp");
const xcframeworkPath = path.join(whisperDir, "build-apple", "whisper.xcframework");
const repoUrl = "https://github.com/21nOrg/whisper.cpp";
const defaultRef = "032697b9a850dc2615555e2a93a683cc3dd58559";
const ref = process.env.WHISPER_CPP_REF || defaultRef;

function run(command, args, options = {}) {
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

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function assertDirectory(filePath, label) {
  const fileStat = await stat(filePath);
  if (!fileStat.isDirectory()) {
    throw new Error(`${label} is not a directory: ${filePath}`);
  }
}

if (!(await exists(whisperDir))) {
  await run("git", ["clone", repoUrl, whisperDir]);
}

await run("git", ["fetch", "--tags", "origin"], { cwd: whisperDir });
await run("git", ["checkout", ref], { cwd: whisperDir });

if (!(await exists(xcframeworkPath))) {
  await run("./build-xcframework.sh", [], { cwd: whisperDir });
}

await assertDirectory(xcframeworkPath, "Whisper XCFramework");
console.log(`Whisper XCFramework is ready at ${path.relative(repoRoot, xcframeworkPath)}`);
