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
import { configCheck } from "./services/config.js";
import { argsCheck } from "./services/args.js";

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
  try {
    let cherryConfig = {
      usingRemoteName: "",
      usingRemoteUrl: "",
      sourceBranch: "",
      commitHash: "",
      targetBranch: "",
      isInitialized: false,
    };
    let isInitialized = false;

    // check crcpconfig file
    configCheck(cherryConfig);
    // check command line arguments
    argsCheck(cherryConfig);

    console.table(cherryConfig);
    console.log("isInitialized", cherryConfig.isInitialized);

    // Using interactive commands
    if (!cherryConfig.isInitialized) {
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
      console.log("selectedCommit", selectedCommit);
      commitHash = selectedCommit;
      targetBranch = await questions.questions3();

      cherryConfig.usingRemoteName = usingRemoteName;
      cherryConfig.usingRemoteUrl = usingRemoteUrl;
      cherryConfig.sourceBranch = sourceBranch;
      cherryConfig.commitHash = commitHash;
      cherryConfig.targetBranch = targetBranch;
    }

    const {
      usingRemoteName,
      usingRemoteUrl,
      sourceBranch,
      commitHash,
      targetBranch,
    } = cherryConfig;

    // Print confirmation information
    printConfirmationInfo(
      usingRemoteName,
      usingRemoteUrl,
      sourceBranch,
      commitHash,
      targetBranch
    );

    // [Interaction process]

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
