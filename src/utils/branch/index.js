import { execSync } from "child_process";
import chalk from "chalk";

/**
 * Check branch exists
 * @param {string} branchName
 * @returns {boolean} - Whether the branch exists
 */
function handleBranchExists(branchName) {
  console.log(
    chalk.yellowBright(`Checking if target branch "${branchName}" exists...`)
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

/**
 * Delete branch
 * @param {string} branchName
 */
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

/**
 * Check and work on existing branches before creating new ones
 * @param {string} branchName
 * @param {string} sourceBranch
 */
function createTemporaryBranch(branchName, sourceBranch) {
  try {
    if (handleBranchExists(branchName)) {
      handleDeleteBranch(branchName);
      console.log();
    }

    // Create a new branch
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

/**
 * Switch to the target branch.
 * Check whether the target branch already exists in the current project.
 * If so, switch to the target branch and execute cherry - pick.Otherwise, create a new branch and execute cherry - pick.
 * @param {string} targetBranch
 */
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
    // Create a target branch and associate it with a remote branch
    execSync(`git checkout -b ${targetBranch}`);
    execSync(`git push -u origin ${targetBranch}`);
    console.log();
  }
}

export { createTemporaryBranch, switchTargetBranch };
