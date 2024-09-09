#!/usr/bin/env node

import { execSync, spawn } from "child_process";
import inquirer from "inquirer";
import chalk from "chalk";

import { questions } from "./preset/questions.js";
import { getRepositories, getLastRemote } from "./utils/repo/index.js";
import {
  createTemporaryBranch,
  switchTargetBranch,
} from "./utils/branch/index.js";

import { printConfirmationInfo } from "./utils/common/index.js";

// Handle Ctrl + C (SIGINT) gracefully
process.on("SIGINT", () => {
  console.log("\nOperation aborted by user.");
  process.exit(1);
});

/**
 * Execute cherry pick
 * @param {string} commitHash
 * @returns
 */
function cherryPickAndHandleConflicts(commitHash) {
  console.log(chalk.greenBright(`Cherry-picking commit ${commitHash}...`));
  return new Promise((resolve, reject) => {
    try {
      const gitProcess = spawn("git", ["cherry-pick", commitHash]);
      let statusDisplay = true;
      gitProcess.stdout.on("data", (data) => {
        console.log(`[stdout] ${data}`);
      });

      // Capture data from the standard error stream
      gitProcess.stderr.on("data", (data) => {
        console.error(`[stderr] ${data}`);

        if (statusDisplay) {
          execSync("git status", { stdio: "inherit" });
          statusDisplay = false;
        }
      });

      // Listen for command execution completion events
      gitProcess.on("close", (code) => {
        if (code === 0) {
          console.log(chalk.greenBright("Cherry-pick successful"));
          resolve();
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

// Main Process
async function main() {
  let usingRemoteName, usingRemoteUrl, sourceBranch, commitHash, targetBranch;
  // Configuration file mode judgment
  // 假设配置文件存放在项目的根目录
  const configFilePath = path.resolve(process.cwd(), ".crcpconfig.json");

  // 读取配置文件
  const config = loadConfigFile(configFilePath);

  if (config) {
    // 检查配置文件中的字段是否正确和完整
    if (!config.sourceRepoUrl) {
      console.error(
        chalk.red(
          "The source repository URL is missing in the configuration file."
        )
      );
      process.exit(1);
    }

    if (!config.targetBranch) {
      console.error(
        chalk.red("The target branch is missing in the configuration file.")
      );
      process.exit(1);
    }

    if (!config.sourceBranch) {
      console.error(
        chalk.red("The source branch is missing in the configuration file.")
      );
      process.exit(1);
    }

    if (!config.commitHash) {
      console.error(
        chalk.red("The commit hash is missing in the configuration file.")
      );
      process.exit(1);
    }

    const { sourceRepoUrl, sourceBranch, commitHash, targetBranch } = config;
    usingRemoteName = getRepoNameFromUrl(sourceRepoUrl);
    usingRemoteUrl = sourceRepoUrl;
    sourceBranch = sourceBranch;
    commitHash = commitHash;
    targetBranch = targetBranch;
  } else {
    // [Preparation]
    // Confirm the associated warehouse information
    const { lastRemoteName, lastRemoteUrl } = getLastRemote();

    // Confirm the source repository and whether to use the most recently added remote repository
    const { remoteUrl, remoteName } = await getRepositories(
      lastRemoteName,
      lastRemoteUrl
    );
    // Update global variables
    usingRemoteName = remoteName;
    usingRemoteUrl = remoteUrl;
    sourceBranch = await questions.question1();
    const selectedCommit = await questions.question2(
      usingRemoteName,
      sourceBranch
    );
    commitHash = selectedCommit;
    targetBranch = await questions.questions3();
  }

  // Print confirmation information
  printConfirmationInfo(
    usingRemoteName,
    usingRemoteUrl,
    sourceBranch,
    commitHash,
    targetBranch
  );

  // [Interaction process]
  try {
    // Pull the remote warehouse information specified by the user
    console.log(chalk.greenBright("Fetching from source repository..."));
    execSync(`git fetch ${usingRemoteName} ${sourceBranch}`);
    console.log();

    // Create a temporary branch - 'temp-${sourceBranch}'
    createTemporaryBranch(
      `temp-${sourceBranch}`,
      `${usingRemoteName}/${sourceBranch}`
    );

    // Create/switch to a user-specified target branch
    switchTargetBranch(targetBranch);

    // Execute 'cherry-pick' and handle conflicts
    cherryPickAndHandleConflicts(commitHash)
      .then(async () => {
        // If there is no conflict, prompt the user whether to push
        const confirm = await inquirer.prompt([
          {
            type: "confirm",
            name: "pushChanges",
            message:
              "Do you want to push the changes to the remote repository?",
          },
        ]);

        console.log("Waiting push...");
        if (confirm.pushChanges) {
          execSync(`git push -f origin temp-${sourceBranch}:${targetBranch}`, {
            stdio: "inherit",
          });
          console.log(chalk.green("Changes successfully pushed."));
        } else {
          console.log(chalk.yellow("Merge completed but not pushed."));
        }
      })
      .catch((error) => {
        console.error(
          chalk.red(
            `Cherry-pick failed. Resolve the conflicts and perform the merge manually. ${error}`
          )
        );
      });
  } catch (error) {
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}

main();
