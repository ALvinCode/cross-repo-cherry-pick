import chalk from "chalk";
import path from "path";
import { loadConfigFile } from "../utils/common/index.js";
import { getRepoNameFromUrl } from "../utils/repo/index.js";

export function configCheck(state, isInitialized) {
  const configFilePath = path.resolve(process.cwd(), ".crcpconfig.json");
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

    const {
      sourceRepoUrl,
      sourceBranch: srBranch,
      commitHash: srCommitHash,
      targetBranch: trBranch,
    } = config;

    state.usingRemoteName = getRepoNameFromUrl(sourceRepoUrl);
    state.usingRemoteUrl = sourceRepoUrl;
    state.sourceBranch = srBranch;
    state.commitHash = srCommitHash;
    state.targetBranch = trBranch;
    state.isInitialized = true;
  }
}
