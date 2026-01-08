---
auto_execution_mode: 1
description: Creates a new development branch from main and loads project documentation
---

# Create Development Branch

## Objective
Start a new feature branch from latest main with full architectural context. Do not start working on the feature yet.

## Branch Creation

**Expected input:** Feature description provided with workflow trigger (e.g., `/create-dev-branch user authentication refactor`)

If no feature description provided, ask: "What feature are you developing?"

Create branch with format: `feature/[descriptive-name]`
- Ensure clean state from latest main
- Use kebab-case, be concise but descriptive

## Context Loading

Automatically trigger `/read-docs` to load architectural knowledge before starting work.

## Output
New feature branch created and checked out, with full project context loaded. Do not start working on the feature yet.