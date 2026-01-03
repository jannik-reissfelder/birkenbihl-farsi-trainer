---
auto_execution_mode: 1
description: Creates a new development branch from main and triggers documentation reading
---

# Create New Development Branch

## Step 1: Get Feature Description
Prompt the user: "What feature are you developing? This will be used to name the branch."

## Step 2: Create Branch
Based on the user's input, create a new branch with format: `feature/[feature-name]`
- Ensure we're on main branch first
- Pull latest changes
- Create and checkout new branch

## Step 3: Trigger Documentation Review
Automatically trigger the read-docs workflow to ensure all documentation is reviewed before starting development.
