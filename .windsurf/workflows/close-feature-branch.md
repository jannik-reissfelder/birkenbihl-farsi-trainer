---
auto_execution_mode: 1
description: Closes a feature branch by updating docs, merging to main, and cleaning up
---

# Close Feature Branch

## Objective
Safely merge the current feature branch into main with updated documentation and clean branch management. This workflow is designed to ensure a smooth transition of feature changes into the main codebase while maintaining documentation accuracy and proper branch management.

## Pre-Merge Tasks

1. **Update Documentation**
   Call `/update-docs` to ensure docs reflect current changes.
   Commit any doc updates with message: `docs: update documentation for feature`
   Note, only call `/update-docs` if the feature or fix is significant enough to warrant documentation updates. 

2. **Sync with Main**
   Rebase onto latest main if there are upstream changes. Resolve conflicts if needed.

## Merge Process

3. **Merge to Main**
   Switch to main, merge feature branch with `--no-ff` and descriptive commit message.
   Format: `feat: [clear description of what this feature adds]`

4. **Push and Cleanup**
   Push to remote main.
   Delete local and remote feature branches unless user specifies to keep them.

## Completion
Confirm merge success and remind about deployment verification if applicable.

## Safety Note
If merge fails or needs rollback: `git revert -m 1 [merge-commit-hash]`