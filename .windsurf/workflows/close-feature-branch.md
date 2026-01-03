---
auto_execution_mode: 1
description: Closes a feature branch by updating docs, merging to main, and cleaning up
---

# Close Feature Branch

## Step 1: Verify Current Branch
Check current branch and confirm with user this is the branch to close.

## Step 2: Update Documentation
// turbo
Trigger the `update-docs` workflow to sync documentation with latest changes.

## Step 3: Commit Documentation Updates
// turbo
If docs were updated, commit them:
```bash
git add migration/
git commit -m "docs: update documentation for feature"
```

## Step 4: Sync with Main
// turbo
Fetch and check if main has new commits:
```bash
git fetch origin main
git log HEAD..origin/main --oneline
```

If main has updates, ask user: "Rebase onto main? (yes/no)"
- If yes: `git rebase origin/main`

## Step 5: Review Commits
Show commits to be merged:
```bash
git log origin/main..HEAD --oneline --no-merges
```

Ask user: "Proceed with merge? (yes/no)"

## Step 6: Merge to Main
// turbo
```bash
git checkout main
git pull origin main
git merge --no-ff [feature-branch] -m "feat: [description]"
git push origin main
```

## Step 7: Cleanup
// turbo
Ask user: "Delete feature branch? (yes/no)"

If yes:
```bash
git branch -d [feature-branch]
git push origin --delete [feature-branch]
```

## Step 8: Confirm
Message: "✅ Feature merged to main and branch deleted. Verify deployment if needed."

## Rollback (if needed)
```bash
git revert -m 1 [merge-commit-hash]
git push origin main
```
