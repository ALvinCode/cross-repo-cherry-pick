import { execSync } from "child_process";
import inquirer from "inquirer";
import chalk from "chalk";
import { normalizeUrl } from "../common/index.js";

/**
 * Get the project name from the repository URL
 * @param {string} url
 * @returns {string} - Project name
 */
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
      "Error to resolve project name, using default name: source-repo"
    );
    return "source-repo";
  }
}

/**
 * Custom repositories by users
 * @returns sourceRepoUrl string
 */
async function getUserCustomRepositories() {
  try {
    let sourceRepoUrl = "";
    const { inputRepoUrl } = await inquirer.prompt([
      {
        type: "input",
        name: "inputRepoUrl",
        message: "Enter the source repository URL:",
        validate: (input) =>
          input ? true : "Source repository URL is required.",
      },
    ]);

    if (checkRemoteExists(inputRepoUrl)) {
      // The library entered by the user already exists
      const { useRemote } = await inquirer.prompt([
        {
          type: "confirm",
          name: "useRemote",
          message: `Remote repository "${inputRepoUrl}" already exists, do you want to use it?`,
          default: true,
        },
      ]);
      if (useRemote) {
        sourceRepoUrl = inputRepoUrl;
      } else {
        // If you do not use an existing remote repository, re-enter
        return await getUserCustomRepositories();
      }
    } else {
      try {
        const repoName = getRepoNameFromUrl(inputRepoUrl);
        execSync(`git remote add ${repoName} ${inputRepoUrl}`, {
          stdio: "ignore",
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

/**
 * Get the specified remote repository
 * Contains the most recently used remote repository quick selection and specifying a new repository
 * @param {string} lastRemoteName
 * @param {string} lastRemoteUrl
 * @returns {remoteUrl, remoteName}
 */
async function getRepositories(lastRemoteName, lastRemoteUrl) {
  try {
    let remoteUrl;
    let remoteName;
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
        remoteUrl = lastRemoteUrl;
      } else {
        remoteUrl = await getUserCustomRepositories();
      }
    } else {
      remoteUrl = await getUserCustomRepositories();
    }
    remoteName = getRepoNameFromUrl(remoteUrl);
    return { remoteUrl, remoteName };
  } catch (error) {
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}

/**
 * Get the last remote repository added
 * @returns {lastRemoteName, lastRemoteUrl}
 */
function getLastRemote() {
  const defaultRemoteInfo = { lastRemoteName: null, lastRemoteUrl: null };
  try {
    const remotes = getRemoteList();

    // Print the associated remote repositories;
    if (Array.isArray(remotes) && remotes.length) {
      console.log("Connected warehouse", remotes);
    }

    // Check if there is a remote repository
    if (remotes.length === 0) return defaultRemoteInfo;

    if (remotes) {
      const [remoteName, remoteUrl] = remotes[0].split(": ");
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

/**
 * Check whether the remote repository to be associated already exists
 * @param {string} remoteRepo
 * @returns {boolean} - Whether the remote repository exists
 */
function checkRemoteExists(remoteRepo) {
  try {
    // Get a list of all connected remote repositories
    const remotes = getRemoteList()
      .map((line) => line.split(": ")[1]) // Get URL Part
      .filter(Boolean) // Filter out empty lines
      .map((line) => line.split(" ")[0]) // Filter out the fetch/push part
      .filter(Boolean) // Filter out empty lines
      .map(normalizeUrl); // Standardized URLs

    // Standardize input repository URLs
    const normalizedInputUrl = normalizeUrl(remoteRepo);
    return remotes.includes(normalizedInputUrl);
  } catch (error) {
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}

/**
 * Get a list of all connected remote repositories
 * @returns {string} - List of all connected remote repositories
 * Note: The returned results exclude push type, undefined, and the user's own remote repository
 * @example retirn ['xxx-xxx-xxx: git@repo.xxx.net:xxx/xxx.git (fetch)']
 */
function getRemoteList() {
  try {
    const remoteList = execSync("git remote -v", { encoding: "utf-8" })
      .toString()
      .trim()
      .split("\n")
      .map((r) => r.replace("\t", ": "))
      .filter(
        (i) =>
          i.includes("(fetch)") &&
          !i.includes("undefined") &&
          !i.includes("origin:")
      );
    return remoteList;
  } catch (error) {
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}

export { getRepositories, getLastRemote, getRepoNameFromUrl };
