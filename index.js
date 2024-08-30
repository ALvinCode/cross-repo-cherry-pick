#!/usr/bin/env node

import { execSync, exec, spawn } from "child_process";
import util from "util";
import inquirer from "inquirer";
import chalk from "chalk";

const execAsync = util.promisify(exec);

// Handle Ctrl + C (SIGINT) gracefully
process.on("SIGINT", () => {
  console.log("\nOperation aborted by user.");
  process.exit(1);
});

/**
 * List of all connected repositories
 * Only the repository represented by fetch is retained to prompt the user and simplify the display
 * '!i.includes("origin:")' is used to filter out the local repository
 * */
function formatConnectedWarehouse(remoteArray) {
  try {
    let connectedWaarehouse = [];
    try {
      connectedWaarehouse = remoteArray
        .map((line) => line.replace("\t", ": "))
        .filter((i) => i.includes("(fetch)") && !i.includes("origin:"));
    } catch (error) {
      connectedWaarehouse = remoteArray;
    }
    console.log("Connected warehouse", connectedWaarehouse);
  } catch (error) {
    console.log("Connected warehouse", []);
  }
}

// Get the last remote repository added
function getLastRemote() {
  const defaultRemoteInfo = { lastRemoteName: null, lastRemoteUrl: null };
  try {
    const remotes = execSync("git remote -v").toString().trim();
    const remoteArray = remotes.split("\n");
    // 打印已关联的远程仓库;
    formatConnectedWarehouse(remoteArray);

    // 检查是否有远程仓库
    if (remoteArray.length === 0) return defaultRemoteInfo;

    // 获取第一个包含 `(fetch)` 的远程仓库
    const firstFetchRemote = remoteArray.find((line) =>
      line.includes("(fetch)")
    );

    if (firstFetchRemote) {
      const [remoteName, remoteUrl] = firstFetchRemote.split("\t");
      const name = remoteName.split("/").pop();
      const url = remoteUrl.split(" ")[0];
      return { lastRemoteName: name, lastRemoteUrl: url };
    }
    return defaultRemoteInfo;
  } catch (error) {
    console.error("Failed to retrieve git remotes:", error);
    return defaultRemoteInfo;
  }
}

// Get the project name from the repository URL
function getRepoNameFromUrl(url) {
  try {
    const regex =
      /^(?:https?:\/\/|git@)(?:[^/:]+)[/:]([^/]+\/[^/.]+)(?:\.git)?$/i;
    const match = url.match(regex);
    if (match) {
      // Extract the last path segment as the project name
      const repoPath = match[1];
      const repoName = repoPath.split("/").pop();
      return repoName;
    } else {
      console.log(
        "Failed to resolve project name, using default name: source-repo"
      );
      return "source-repo";
    }
  } catch (error) {
    console.log(
      "An error occurred while parsing the project name, so the default name is used: source-repo"
    );
    return "source-repo";
  }
}

// Check branch exists
function branchExists(branchName) {
  console.log(
    chalk.yellowBright(`Checking if target branch "${targetBranch}" exists...`)
  );
  try {
    const branches = execSync(`git branch --list ${branchName}`, {
      encoding: "utf-8",
    });
    return branches.trim() !== "";
  } catch (error) {
    console.error("Failed to check if branch exists.");
    process.exit(1);
  }
}

// Delete branch
function deleteBranch(branchName) {
  try {
    execSync(`git branch -D ${branchName}`, { stdio: "ignore" });
    console.log(
      chalk.gray(
        `Clean up temporary branches with duplicate names "${branchName}".`
      )
    );
  } catch (error) {
    console.error(
      chalk.red(`Cleaning up temporary branch - "${branchName}" failed .`)
    );
    process.exit(1);
  }
}

// Check and work on existing branches before creating new ones
function createBranch(branchName, sourceBranch) {
  if (branchExists(branchName)) {
    deleteBranch(branchName);
    console.log();
  }

  // Create a new branch
  execSync(`git checkout -b ${branchName} ${sourceBranch}`);
  console.log(
    chalk.greenBright(
      `Create and switch to a new temporary branch - "${branchName}".`
    )
  );
  console.log();
}

// Execute cherry pick
function cherryPickAndHandleConflicts(commitHash) {
  console.log(chalk.greenBright(`Cherry-picking commit ${commitHash}...`));
  return new Promise(async (resolve, reject) => {
    try {
      const gitProcess = spawn("git", ["cherry-pick", commitHash]);

      gitProcess.stdout.on("data", (data) => {
        console.log(`[stdout] ${data}`);
      });

      // Capture data from the standard error stream
      gitProcess.stderr.on("data", (data) => {
        console.error(`[stderr] ${data}`);
      });

      // Listen for command execution completion events
      gitProcess.on("close", (code) => {
        if (code === 0) {
          console.log(chalk.greenBright("Cherry-pick successful"));
          resolve();
        } else {
          reject(false);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Standardize Git repository URLs to a unified HTTPS format
 * @param {string} url - Enter the repository URL
 * @returns {string} - Standardized URLs
 */
function normalizeUrl(url) {
  const sshPattern = /^git@([^:]+):([^/]+)\/(.+)\.git$/;
  const httpsPattern = /^https?:\/\/([^/]+)\/([^/]+)\/(.+)\.git$/;

  if (sshPattern.test(url)) {
    // If it is an SSH format URL (such as git@gitlab.com:user/repo.git)
    const [, host, user, repo] = url.match(sshPattern);
    return `https://${host}/${user}/${repo}.git`;
  } else if (httpsPattern.test(url)) {
    // If it is an HTTPS URL (such as https://gitlab.com/user/repo.git)
    const [, host, user, repo] = url.match(httpsPattern);
    return `https://${host}/${user}/${repo}.git`;
  } else {
    throw new Error("Invalid URL format");
  }
}

// Check whether the remote repository to be associated already exists
function checkRemoteExists(remoteRepo) {
  try {
    // Get a list of all connected remote repositories
    const remotes = execSync("git remote -v", { encoding: "utf-8" })
      .split("\n")
      .map((line) => line.split("\t")[1]) // Get URL Part
      .filter(Boolean) // Filter out empty lines
      .map((line) => line.split(" ")[0]) // Filter out the fetch/push part
      .filter(Boolean) // Filter out empty lines
      .map(normalizeUrl); // Standardized URLs

    // Standardize input repository URLs
    const normalizedInputUrl = normalizeUrl(remoteRepo);
    return remotes.includes(normalizedInputUrl);
  } catch (error) {
    console.error("Error:", error.message);
    return false;
  }
}

// Prompt user for input
async function main() {
  try {
    // Confirm the associated warehouse information
    const { lastRemoteName, lastRemoteUrl } = getLastRemote();

    let sourceRepo;
    let useExixtingRemote = false;

    if (
      typeof lastRemoteName === "string" &&
      lastRemoteName !== "undefined" &&
      lastRemoteName !== "null" &&
      lastRemoteName
    ) {
      const { useExistingRemote } = await inquirer.prompt([
        {
          type: "confirm",
          name: "useExistingRemote",
          message: `Use the most recently added remote repository "${lastRemoteName}"?`,
          default: true,
        },
      ]);

      if (useExistingRemote) {
        sourceRepo = lastRemoteUrl;
        useExixtingRemote = true;
      } else {
        const { newSourceRepo } = await inquirer.prompt([
          {
            type: "input",
            name: "newSourceRepo",
            message: "Enter the source repository URL:",
            validate: (input) =>
              input ? true : "Source repository URL is required.",
          },
        ]);
        sourceRepo = newSourceRepo;
      }
    } else {
      const { newSourceRepo } = await inquirer.prompt([
        {
          type: "input",
          name: "newSourceRepo",
          message: "Enter the source repository URL:",
          validate: (input) =>
            input ? true : "Source repository URL is required.",
        },
      ]);
      sourceRepo = newSourceRepo;
    }

    // Confirm branch and picking record information
    const questions = [
      {
        type: "input",
        name: "sourceBranch",
        message: "Enter the source branch name:",
        validate: (input) => (input ? true : "Source branch name is required."),
      },
      {
        type: "input",
        name: "commitHash",
        message: "Enter the commit hash to cherry-pick:",
        validate: (input) => (input ? true : "Commit hash is required."),
      },
      {
        type: "input",
        name: "targetBranch",
        message: "Enter the target branch name:",
        validate: (input) => (input ? true : "Target branch name is required."),
      },
    ];

    try {
      const answers = await inquirer.prompt(questions);
      const { sourceBranch, commitHash, targetBranch } = answers;
      const projectName = getRepoNameFromUrl(sourceRepo);
      console.log();
      // Confirmation Information list
      const confirmInfo = [
        {
          "Confirmation Item": "Source project    ",
          Value: chalk.yellow(projectName),
        },
        {
          "Confirmation Item": "Source repo       ",
          Value: chalk.yellow(sourceRepo),
        },
        {
          "Confirmation Item": "Source branch     ",
          Value: chalk.yellow(sourceBranch),
        },
        {
          "Confirmation Item": "Source commit hash",
          Value: chalk.yellow(commitHash),
        },
        {
          "Confirmation Item": "Target branch     ",
          Value: chalk.yellow(targetBranch),
        },
      ];

      console.log(chalk.bold("Confirmation Item   |  Value"));
      console.log("----------------------------");
      confirmInfo.forEach((confirmInfo) => {
        console.log(
          `${confirmInfo["Confirmation Item"]}  |  ${confirmInfo.Value}`
        );
      });
      console.log();

      // Link remote warehouse
      if (!useExixtingRemote) {
        try {
          // Check if the remote repository exists:
          // If it does, ask the user whether to use this repository.
          // If it does not exist, add a remote repository.
          if (checkRemoteExists(sourceRepo)) {
            const { useRemote } = await inquirer.prompt([
              {
                type: "confirm",
                name: "useRemote",
                message: `Remote repository "${sourceRepo}" already exists, do you want to use it?`,
                default: true,
              },
            ]);
            if (useRemote) {
              // Skip current logic and continue with the rest of the logic
              console.log(chalk.blue("Using existing remote repository..."));
            } else {
              // User opted not to use the existing repository, terminate the program
              console.log(
                "You have opted not to use the existing remote repository."
              );
              process.exit(1);
            }
          } else {
            console.log(chalk.greenBright("Adding from source repository..."));
            execSync(`git remote add ${projectName} ${sourceRepo}`, {
              stdio: "ignore",
            });
          }
        } catch (error) {
          console.error(chalk.red(error.message));
          process.exit(1);
        }
      }

      // pull remote warehouse
      console.log(chalk.greenBright("Fetching from source repository..."));
      execSync(`git fetch ${projectName} ${sourceBranch}`);
      console.log();

      // Create a temporary branch - 'temp-${sourceBranch}'
      createBranch(`temp-${sourceBranch}`, `${projectName}/${sourceBranch}`);

      // Check whether the target branch already exists in the current project.
      // If so, switch to the target branch and execute cherry - pick.Otherwise, create a new branch and execute cherry - pick.
      if (branchExists(targetBranch)) {
        console.log(
          `The target branch already exists, switch to the target branch - "${targetBranch}"...`
        );
        execSync(`git checkout ${targetBranch}`);
        console.log();
      } else {
        console.log(
          `Target branch does not exist, create and switch to the target branch - "${targetBranch}"...`
        );
        // Create a target branch and associate it with a remote branch
        execSync(`git checkout -b ${targetBranch}`);
        execSync(`git push -u origin ${targetBranch}`);
        console.log();
      }

      // Execute cherry pick
      cherryPickAndHandleConflicts(commitHash)
        .then(() => {
          // If there is no conflict, prompt the user whether to push
          const confirm = inquirer.prompt([
            {
              type: "confirm",
              name: "pushChanges",
              message:
                "Do you want to push the changes to the remote repository?",
            },
          ]);

          if (confirm.pushChanges) {
            console.log("confirm pushChanges");
            execSync(
              `git push -f origin temp-${sourceBranch}:${targetBranch}`,
              {
                stdio: "inherit",
              }
            );
            console.log(chalk.green("Changes successfully pushed."));
          } else {
            console.log(chalk.yellow("Merge completed but not pushed."));
          }
        })
        .catch((error) => {});

      // Clean up
      console.log(chalk.gray("Cleaning up..."));
      execSync(`git branch -D temp-${sourceBranch}`);
    } catch (error) {
      return;
    }
  } catch (error) {
    if (error.isTtyError) {
      console.error(
        chalk.red("Prompt couldn’t be rendered in the current environment.")
      );
    } else {
      console.error(chalk.red("An error occurred:", error.message));
    }
    process.exit(1);
  }
}

// Run the main function
main();
