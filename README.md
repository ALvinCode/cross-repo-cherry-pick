# cross-repo-cherry-pick

Perform cherry-pick operations between projects to reduce duplication of work when developing the same module for projects with only partial differences. This allows multiple projects to be maintained independently and synchronized.

# Usage

```
  # Add the source repository URL as a remote repository. Note: If Project A expects to extract the branch of Project B and submit it to Project A, add the URL of the B repository as the remote repository of Project A. Fill in the URL of the B repository here.
  ? Enter the source repository URL:

  # Get the specified source branch from the source repository. Note: Fill in the source branch of cherry-pick here
  ? Enter the source branch name:

  # Fill in the source branch and the commit hash that needs to be cherry-picked
  ? Enter the commit hash to cherry-pick:

  # Fill in the target branch for cherry-pick
  ? Enter the target branch name:

```

- If an error (such as a conflict) occurs during the cherry-pick process, catch the exception and prompt the user to resolve the conflict.
- Display Git status to help the user resolve the conflict.
- Prompt the user to press Enter to continue after resolving the conflict.
- Use git add -A and git cherry-pick --continue to complete the conflict resolution and commit.
- Prompt the user whether to push the changes to the remote repository.
- If the user chooses to push, execute the git push command to push the changes to the remote target branch.
- If not, output the corresponding message.
- Remove the previously added source repository.
