#!/usr/bin/env node
import { exec, execSync, spawn } from "child_process";
import inquirer from "inquirer";
import chalk from "chalk";
function normalizeUrl(url) {
  try {
    const sshPattern = /^git@([^:]+):([^/]+)\/(.+)\.git$/;
    const httpsPattern = /^https?:\/\/([^/]+)\/([^/]+)\/(.+)\.git$/;
    let matchResult;
    if (matchResult = url.match(sshPattern)) {
      const [, host, user, repo] = matchResult;
      return `https://${host}/${user}/${repo}.git`;
    } else if (matchResult = url.match(httpsPattern)) {
      const [, host, user, repo] = matchResult;
      return `https://${host}/${user}/${repo}.git`;
    } else {
      throw new Error(
        "The URL does not conform to the specified format. Please check and try again."
      );
    }
  } catch (error) {
    console.error(chalk.red(`Error standardizing URL: ${error.message}`));
    process.exit(1);
  }
}
function getCommits(remoteName, branch) {
  return new Promise((resolve, reject) => {
    exec(
      `git fetch ${remoteName} ${branch} && git log ${remoteName}/${branch} --pretty=format:"%ad %an > %s - %h" --date=format:'%Y-%m-%d %H:%M:%S'`,
      (error, stdout) => {
        if (error) {
          reject(
            new Error(
              `Pulling commits from branch "${branch}" failed. Please check the branch.`
            )
          );
        }
        const commits = stdout.split("\n").map((line, index) => {
          const [message, ...rest] = line.split(" - ");
          const hash = rest.join(" - ");
          const formattedMessage = index === 0 ? chalk.green(message) : message;
          return {
            name: `${formattedMessage} (${hash})`,
            value: hash.trim()
          };
        });
        resolve(commits);
      }
    );
  });
}
function printConfirmationInfo(repoName, sourceRepo, sourceBranch, commitHash, targetBranch) {
  const confirmInfo = [
    {
      "Confirmation Item": "Source project    ",
      Value: chalk.yellow(repoName)
    },
    {
      "Confirmation Item": "Source repo       ",
      Value: chalk.yellow(sourceRepo)
    },
    {
      "Confirmation Item": "Source branch     ",
      Value: chalk.yellow(sourceBranch)
    },
    {
      "Confirmation Item": "Source commit hash",
      Value: chalk.yellow(commitHash)
    },
    {
      "Confirmation Item": "Target branch     ",
      Value: chalk.yellow(targetBranch)
    }
  ];
  console.log(chalk.bold("Confirmation Item   |  Value"));
  console.log("----------------------------");
  confirmInfo.forEach((confirmInfo2) => {
    console.log(`${confirmInfo2["Confirmation Item"]}  |  ${confirmInfo2.Value}`);
  });
  console.log();
}
function loadConfigFile(configFilePath) {
  try {
    if (!fs.existsSync(configFilePath)) {
      console.log(
        chalk.red(`Configuration file ${configFilePath} does not exist.`)
      );
      return null;
    }
    const configContent = fs.readFileSync(configFilePath, "utf-8");
    const config = JSON.parse(configContent);
    console.log(chalk.green("Successfully loaded the configuration file: "));
    console.log(config);
    return config;
  } catch (error) {
    console.error(
      chalk.red(
        "An error occurred while reading or parsing the configuration file: "
      ),
      error
    );
    return null;
  }
}
const questions = {
  question1: async () => {
    const { sourceBranch } = await inquirer.prompt([
      {
        type: "input",
        name: "sourceBranch",
        message: "Enter the source branch name:",
        validate: (input) => input ? true : "Source branch name is required."
      }
    ]);
    return sourceBranch ? sourceBranch.trim() : "";
  },
  question2: async (repoName, sourceBranch) => {
    try {
      const commits = await getCommits(repoName, sourceBranch);
      const { selectedCommit } = await inquirer.prompt([
        {
          type: "list",
          name: "selectedCommit",
          message: `Please select a commit record to perform cherry-pick (branch: ${sourceBranch}):`,
          choices: commits,
          loop: false,
          pageSize: 10
        }
      ]);
      return selectedCommit;
    } catch (error) {
      console.error(chalk.red(error));
      process.exit(1);
    }
  },
  questions3: async () => {
    const { targetBranch } = await inquirer.prompt([
      {
        type: "input",
        name: "targetBranch",
        message: "Enter the target branch name:",
        validate: (input) => input ? true : "Target branch name is required."
      }
    ]);
    return targetBranch ? targetBranch.trim() : "";
  }
};
function getRepoNameFromUrl$1(url) {
  try {
    const regex = /^(?:https?:\/\/|git@)(?:[^/:]+)[/:]([^/]+\/[^/.]+)(?:\.git)?$/i;
    const match = url.match(regex);
    if (match) {
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
      "Error to resolve project name, using default name: source-repo"
    );
    return "source-repo";
  }
}
async function getUserCustomRepositories() {
  try {
    let sourceRepoUrl = "";
    const { inputRepoUrl } = await inquirer.prompt([
      {
        type: "input",
        name: "inputRepoUrl",
        message: "Enter the source repository URL:",
        validate: (input) => input ? true : "Source repository URL is required."
      }
    ]);
    if (checkRemoteExists(inputRepoUrl)) {
      const { useRemote } = await inquirer.prompt([
        {
          type: "confirm",
          name: "useRemote",
          message: `Remote repository "${inputRepoUrl}" already exists, do you want to use it?`,
          default: true
        }
      ]);
      if (useRemote) {
        sourceRepoUrl = inputRepoUrl;
      } else {
        return await getUserCustomRepositories();
      }
    } else {
      try {
        console.log(chalk.greenBright("Adding from source repository..."));
        const repoName = getRepoNameFromUrl$1(inputRepoUrl);
        execSync(`git remote add ${repoName} ${inputRepoUrl}`, {
          stdio: "ignore"
        });
        sourceRepoUrl = inputRepoUrl;
      } catch (error) {
        console.error(chalk.red(error.message));
        process.exit(1);
      }
    }
    return sourceRepoUrl;
  } catch (error) {
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}
async function getRepositories(lastRemoteName, lastRemoteUrl) {
  try {
    let remoteUrl;
    let remoteName;
    if (typeof lastRemoteName === "string" && lastRemoteName !== "undefined" && lastRemoteName !== "null" && lastRemoteName) {
      const { useExistingRemote } = await inquirer.prompt([
        {
          type: "confirm",
          name: "useExistingRemote",
          message: `Use the most recently added remote repository "${lastRemoteName}"?`,
          default: true
        }
      ]);
      if (useExistingRemote) {
        remoteUrl = lastRemoteUrl;
      } else {
        remoteUrl = await getUserCustomRepositories();
      }
    } else {
      remoteUrl = await getUserCustomRepositories();
    }
    remoteName = getRepoNameFromUrl$1(remoteUrl);
    return { remoteUrl, remoteName };
  } catch (error) {
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}
function getLastRemote() {
  const defaultRemoteInfo = { lastRemoteName: null, lastRemoteUrl: null };
  try {
    const remotes = getRemoteList();
    console.log("Connected warehouse", remotes);
    if (remotes.length === 0) return defaultRemoteInfo;
    if (remotes) {
      const [remoteName, remoteUrl] = remotes[0].split(" : ");
      const name = remoteName.split("/").slice(-1)[0];
      const url = remoteUrl.split(" ")[0];
      return { lastRemoteName: name, lastRemoteUrl: url };
    }
    return defaultRemoteInfo;
  } catch (error) {
    console.error("Failed to retrieve git remotes:", error);
    return defaultRemoteInfo;
  }
}
function checkRemoteExists(remoteRepo) {
  try {
    const remotes = getRemoteList().map((line) => line.split(" : ")[1]).filter(Boolean).map((line) => line.split(" ")[0]).filter(Boolean).map(normalizeUrl);
    const normalizedInputUrl = normalizeUrl(remoteRepo);
    return remotes.includes(normalizedInputUrl);
  } catch (error) {
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}
function getRemoteList() {
  try {
    const remoteList = execSync("git remote -v", { encoding: "utf-8" }).toString().trim().split("\n").map((r) => r.replace("	", " : ")).filter(
      (i) => i.includes("(fetch)") && !i.includes("undefined") && !i.includes("origin:")
    );
    return remoteList;
  } catch (error) {
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}
function handleBranchExists(branchName) {
  console.log(
    chalk.yellowBright(`Checking if target branch "${branchName}" exists...`)
  );
  try {
    const branches = execSync(`git branch --list ${branchName}`, {
      encoding: "utf-8"
    });
    return branches.trim() !== "";
  } catch (error) {
    console.error("Failed to check if branch exists.");
    process.exit(1);
  }
}
function handleDeleteBranch(branchName) {
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
function createTemporaryBranch(branchName, sourceBranch) {
  try {
    if (handleBranchExists(branchName)) {
      handleDeleteBranch(branchName);
      console.log();
    }
    execSync(`git checkout -b ${branchName} ${sourceBranch}`);
    console.log(
      `Create and switch to a new temporary branch - "${branchName}".`
    );
    console.log();
  } catch (error) {
    console.error(
      chalk.red(
        `Failed to create and switch to a new temporary branch - "${branchName}". ${error.message}`
      )
    );
    process.exit(1);
  }
}
function switchTargetBranch(targetBranch) {
  if (handleBranchExists(targetBranch)) {
    console.log(
      `The target branch already exists, switch to the target branch - "${targetBranch}"...`
    );
    execSync(`git checkout ${targetBranch}`);
    console.log();
  } else {
    console.log(
      `Target branch does not exist, create and switch to the target branch - "${targetBranch}"...`
    );
    execSync(`git checkout -b ${targetBranch}`);
    execSync(`git push -u origin ${targetBranch}`);
    console.log();
  }
}
process.on("SIGINT", () => {
  console.log("\nOperation aborted by user.");
  process.exit(1);
});
function cherryPickAndHandleConflicts(commitHash) {
  console.log(chalk.greenBright(`Cherry-picking commit ${commitHash}...`));
  return new Promise((resolve, reject) => {
    try {
      const gitProcess = spawn("git", ["cherry-pick", commitHash]);
      let statusDisplay = true;
      gitProcess.stdout.on("data", (data) => {
        console.log(`[stdout] ${data}`);
      });
      gitProcess.stderr.on("data", (data) => {
        console.error(`[stderr] ${data}`);
        if (statusDisplay) {
          execSync("git status", { stdio: "inherit" });
          statusDisplay = false;
        }
      });
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
async function main() {
  try {
    let usingRemoteName, usingRemoteUrl, sourceBranch, commitHash, targetBranch;
    const configFilePath = path.resolve(process.cwd(), ".crcpconfig.json");
    const config = loadConfigFile(configFilePath);
    if (config) {
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
      const {
        sourceRepoUrl,
        sourceBranch: srBranch,
        commitHash: srCommitHash,
        targetBranch: trBranch
      } = config;
      usingRemoteName = getRepoNameFromUrl(sourceRepoUrl);
      usingRemoteUrl = sourceRepoUrl;
      sourceBranch = srBranch;
      commitHash = srCommitHash;
      targetBranch = trBranch;
    } else {
      const { lastRemoteName, lastRemoteUrl } = getLastRemote();
      const { remoteUrl, remoteName } = await getRepositories(
        lastRemoteName,
        lastRemoteUrl
      );
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
    printConfirmationInfo(
      usingRemoteName,
      usingRemoteUrl,
      sourceBranch,
      commitHash,
      targetBranch
    );
    console.log(chalk.greenBright("Fetching from source repository..."));
    execSync(`git fetch ${usingRemoteName} ${sourceBranch}`);
    console.log();
    createTemporaryBranch(
      `temp-${sourceBranch}`,
      `${usingRemoteName}/${sourceBranch}`
    );
    switchTargetBranch(targetBranch);
    cherryPickAndHandleConflicts(commitHash).then(async () => {
      const confirm = await inquirer.prompt([
        {
          type: "confirm",
          name: "pushChanges",
          message: "Do you want to push the changes to the remote repository?"
        }
      ]);
      console.log("Waiting push...");
      if (confirm.pushChanges) {
        execSync(`git push -f origin temp-${sourceBranch}:${targetBranch}`, {
          stdio: "inherit"
        });
        console.log(chalk.green("Changes successfully pushed."));
      } else {
        console.log(chalk.yellow("Merge completed but not pushed."));
      }
    }).catch((error) => {
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
