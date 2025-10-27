#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import readline from "node:readline";
import { styleText } from "node:util";

/**
 * @param {string} question
 * @returns {Promise<boolean>}
 */
async function promptBoolean(question) {
  const questionText = `${styleText("green", "?")} ${question} ${styleText("gray", "[y/N] · ")}`;

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  return new Promise((resolve) => {
    rl.question(questionText, (answer) => {
      rl.close();

      // Moves the cursor one line up and erases that line.
      process.stdout.write("\u001B[1A\u001B[0K");
      process.stdout.write(questionText);

      if (["y", "yes"].includes(answer.trim().toLowerCase())) {
        process.stdout.write("yes\n");
        resolve(true);
      } else {
        process.stdout.write("no\n");
        resolve(false);
      }
    });
  });
}

function resolvePackageManager() {
  const userAgent = process.env["npm_config_user_agent"];

  if (userAgent?.includes("yarn")) {
    return "yarn";
  }

  if (userAgent?.includes("pnpm")) {
    return "pnpm";
  }

  if (userAgent?.includes("npm")) {
    return "npm";
  }
}

async function generate() {
  const currentDirectory = path.resolve(".");

  const packageConfigFile = path.resolve("package.json");
  const packageManager = resolvePackageManager();

  if (!existsSync(packageConfigFile)) {
    console.error(
      `${styleText("red", "Error:")} Cannot not find 'package.json' in ${styleText("grey", currentDirectory)}`,
    );

    if (packageManager != null) {
      const initCommand = `${packageManager} init`;

      console.error(`To create one, run ${styleText("blue", initCommand)}.`);
    }

    console.error("");

    return;
  }

  if (packageManager != null) {
    const tstychePackage = `tstyche@${process.argv.includes("--next") ? "next" : "latest"}`;
    const addCommand = `${packageManager} add -D`;

    execSync(`${addCommand} ${tstychePackage}`, { stdio: "ignore" });

    // TODO Report errors, perhaps?

    console.info(`${styleText("green", "+")} The ${styleText("grey", tstychePackage)} package was installed.`);
  } else {
    console.error(`${styleText("red", "× fail")} Failed to install the 'tstyche' package.`);
    console.error("");
    console.error(`${styleText("red", "Error:")} Unknown package manager. Try installing manually.`);
  }

  console.error("");

  const configFile = path.resolve("tstyche.config.json");
  const configFileText = `// For documentation, see: https://tstyche.org/reference/config-file
{
  "$schema": "https://tstyche.org/schemas/config.json",
  "testFileMatch": ["**/*.tst.*"]
}
`;

  if (existsSync(configFile)) {
    console.info(
      `${styleText("yellow", "- skip")} Config file already exists in ${styleText("grey", currentDirectory)}.`,
    );
  } else {
    await fs.writeFile(configFile, configFileText);

    console.info(`${styleText("green", "+")} Config file was written to ${styleText("grey", configFile)}.`);
  }

  console.info("");

  const shouldAddExamples = await promptBoolean("Add example test files?");

  console.info("");

  if (!shouldAddExamples) {
    return;
  }

  const sourceDirectory = new URL("examples/", import.meta.url);
  const examplesDirectory = path.resolve("tstyche-examples");

  await fs.cp(sourceDirectory, examplesDirectory, { recursive: true });

  console.info(
    `${styleText("green", "+")} Example test files were written to ${styleText("grey", examplesDirectory)}.`,
  );

  console.info("");

  if (packageManager != null) {
    const execCommand = `${packageManager === "npm" ? "npx" : packageManager}`;

    console.info(`${styleText("blue", "i")} Try out the following commands:`);
    console.info("");

    console.info(`  ${styleText("blue", `${execCommand} tstyche`)}`);
    console.info("  Run all tests.");
    console.info("");

    console.info(`  ${styleText("blue", `${execCommand} tstyche examples/overload`)}`);
    console.info("  Only run the matching test file.");
    console.info("");

    console.info(`  ${styleText("blue", `${execCommand} tstyche --target '5.3,5.5.2,>=5.7'`)}`);
    console.info("  Test against specific versions of TypeScript.");
    console.info("");

    console.info(`  ${styleText("blue", `${execCommand} tstyche --watch`)}`);
    console.info("  Run all tests in watch mode.");
    console.info("");
  }
}

await generate();
