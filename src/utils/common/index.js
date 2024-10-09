import { exec, spawn } from "child_process";
import chalk from "chalk";
import fs from "fs";

/**
 * Standardize Git repository URLs to a unified HTTPS format
 * @param {string} url - Enter the repository URL
 * @returns {string} - Standardized URLs
 */
function normalizeUrl(url) {
  try {
    const sshPattern = /^git@([^:]+):([^/]+)\/(.+)\.git$/;
    const httpsPattern = /^https?:\/\/([^/]+)\/([^/]+)\/(.+)\.git$/;

    let matchResult;
    if ((matchResult = url.match(sshPattern))) {
      // If it is an SSH format URL (such as git@gitlab.com:user/repo.git)
      const [, host, user, repo] = matchResult;
      return `https://${host}/${user}/${repo}.git`;
    } else if ((matchResult = url.match(httpsPattern))) {
      // If it is an HTTPS URL (such as https://gitlab.com/user/repo.git)
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

/**
 * Get the commit record of the remote branch
 * @param {string} remoteName
 * @param {string} branch
 * @returns {Promise} - Promise object represents the commit record
 */
function getCommits(remoteName, branch) {
  return new Promise((resolve, reject) => {
    const gitProcess = spawn("git", [
      "fetch",
      remoteName,
      branch,
      "&&",
      "git",
      "log",
      `${remoteName}/${branch}`,
      "--pretty=format:%ad %an > %s - %h",
      "--date=format:%Y-%m-%d %H:%M:%S",
    ]);
    console.log("哈哈哈哈哈哈");
    let stdout = "";
    let stderr = "";
    gitProcess.stdout.on("data", (data) => {
      console.log("stdout data", data);
      stdout += data.toString();
    });
    gitProcess.stderr.on("data", (data) => {
      console.log("stderr data", data);
      stderr += data.toString();
    });
    gitProcess.on("close", (code) => {
      console.log("close code", code);
      if (code !== 0) {
        reject(
          new Error(
            `Pulling commits from branch "${branch}" failed. Please check the branch.`
          )
        );
        return;
      }
      try {
        const commits = stdout.split("\n").map((line, index) => {
          const [message, ...rest] = line.split(" - ");
          const hash = rest.join(" - ");
          const formattedMessage = index === 0 ? chalk.green(message) : message;
          return {
            name: `${formattedMessage} (${hash})`,
            value: hash.trim(),
          };
        });
        resolve(commits);
      } catch (error) {
        reject(new Error("An error occurred while parsing the commit record."));
      }
    });
    gitProcess.on("error", (error) => {
      reject(
        new Error(`An error occurred while fetching commits: ${error.message}`)
      );
    });
  });
  // return new Promise((resolve, reject) => {
  //   exec(
  //     `git fetch ${remoteName} ${branch} && git log ${remoteName}/${branch} --pretty=format:"%ad %an > %s - %h" --date=format:'%Y-%m-%d %H:%M:%S'`,
  //     (error, stdout) => {
  //       console.log("执行命令");
  //       if (error) {
  //         console.log("进入error");
  //         reject(
  //           new Error(
  //             `Pulling commits from branch "${branch}" failed. Please check the branch.`
  //           )
  //         );
  //       }
  //       try {
  //         // Parse git log output and decompose it into an array of commit record objects
  //         const commits = stdout.split("\n").map((line, index) => {
  //           const [message, ...rest] = line.split(" - ");
  //           const hash = rest.join(" - ");
  //           const formattedMessage =
  //             index === 0 ? chalk.green(message) : message;
  //           return {
  //             name: `${formattedMessage} (${hash})`,
  //             value: hash.trim(),
  //           };
  //         });
  //         resolve(commits);
  //       } catch (error) {
  //         reject(
  //           new Error("An error occurred while parsing the commit record.")
  //         );
  //       }
  //       // resolve(commits);
  //     }
  //   );
  // });
}

/**
 * Print confirmation information
 * @param {string} repoName
 * @param {string} sourceRepo
 * @param {string} sourceBranch
 * @param {string} commitHash
 * @param {string} targetBranch
 */
function printConfirmationInfo(
  repoName,
  sourceRepo,
  sourceBranch,
  commitHash,
  targetBranch
) {
  // Confirmation Information list
  const confirmInfo = [
    {
      "Confirmation Item": "Source project    ",
      Value: chalk.yellow(repoName),
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
    console.log(`${confirmInfo["Confirmation Item"]}  |  ${confirmInfo.Value}`);
  });
  console.log();
}

/**
 * Load configuration file
 * @param {*} configFilePath
 * @returns
 */
function loadConfigFile(configFilePath) {
  try {
    // Check if the configuration file exists
    if (!fs.existsSync(configFilePath)) {
      return null;
    }

    // Read the configuration file contents
    const configContent = fs.readFileSync(configFilePath, "utf-8");

    // Parsing configuration file contents
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

export { normalizeUrl, getCommits, printConfirmationInfo, loadConfigFile };
