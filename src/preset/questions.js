import inquirer from "inquirer";
import chalk from "chalk";
import { getCommits } from "../utils/common/index.js";

/**
 * Interaction Question Mapping
 * @type {Object}
 */
const questions = {
  question1: async () => {
    const { sourceBranch } = await inquirer.prompt([
      {
        type: "input",
        name: "sourceBranch",
        message: "Enter the source branch name:",
        validate: (input) => (input ? true : "Source branch name is required."),
      },
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
          pageSize: 10,
        },
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
        validate: (input) => (input ? true : "Target branch name is required."),
      },
    ]);
    return targetBranch ? targetBranch.trim() : "";
  },
};

export { questions };
