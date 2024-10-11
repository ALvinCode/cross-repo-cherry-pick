import { getRepoNameFromUrl } from "../utils/repo/index.js";
import chalk from "chalk";

export function argsCheck(state, isInitialized) {
  const args = process.argv.slice(2);
  const errors = [
    "Source repository URL is required.",
    "Source branch name is required.",
    "Commit hash is required.",
    "Target branch name is required.",
  ];

  if (args.length > 0) {
    errors.forEach((error, index) => {
      if (!args[index]) {
        console.error(chalk.red(`Insufficient command parameters: ${error}`));
        process.exit(1);
      }
    });
    const sourceRepoUrl = args[0];
    const sourceBranch = args[1];
    const commitHash = args[2];
    const targetBranch = args[3];
    state.usingRemoteName = getRepoNameFromUrl(sourceRepoUrl);
    state.usingRemoteUrl = sourceRepoUrl;
    state.sourceBranch = sourceBranch;
    state.commitHash = commitHash;
    state.targetBranch = targetBranch;
    console.log("设置了isInitialized为true");
    state.isInitialized = true;
  }
}
