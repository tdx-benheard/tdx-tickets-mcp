# Cherry-Pick Release Process

Cherry-pick commits from feature branch to `release/{RELEASE_VERSION}` (current release version defined in CLAUDE.local.md).

## Workflow
1. Find feature branch
2. Identify commits (already merged to develop)
3. **Confirm commits with user**
4. **Ask: Direct checkout or worktree?**
5. Create branch, cherry-pick, push
6. Output PR description

## Step 1: Find & Identify Commits
```bash
# Find branch
git branch -a | grep "{TICKET_ID}"

# Verify merged to develop (should be empty)
git log --format="%ai | %h | %s" --no-merges origin/develop..origin/feature/{USERNAME}/{BRANCH_NAME} | sort

# List all feature commits (ignore merge commits)
git log --format="%ai | %h | %s" --no-merges origin/feature/{USERNAME}/{BRANCH_NAME} | head -20
```
**IMPORTANT:** Show user commits list, get confirmation before proceeding

## Step 2: Ask Checkout Method
**"Do you want to create a worktree for the cherry pick?"**
1. Create worktree
2. Use current directory

## Step 3: Create Branch & Cherry-Pick
Branch naming: `feature/{USERNAME}/{NAME}_{RELEASE_VERSION}` (remove `#` chars)

**Option 1: Direct Checkout**
```bash
git checkout -b feature/{USERNAME}/{NAME}_{RELEASE_VERSION} origin/release/{RELEASE_VERSION}
git cherry-pick [hash-1] [hash-2] ...
git push -u origin feature/{USERNAME}/{NAME}_{RELEASE_VERSION}
git checkout -  # Return to previous branch
```

**Option 2: Worktree**
- See `worktrees.md` for cherry-pick worktree creation
- Navigate to worktree enterprise directory
- Cherry-pick commits, push, and cleanup:
```bash
git cherry-pick [hash-1] [hash-2] ...
git push -u origin feature/{USERNAME}/{NAME}_{RELEASE_VERSION}
cd - # Return to original directory
git worktree remove .claude/worktrees/cherry-pick-{TICKET_ID}-{RELEASE_VERSION}
```

## Conflict Resolution
```bash
# View conflicts
git status

# Resolve options
git checkout --theirs <file>  # Accept incoming
git checkout --ours <file>    # Keep release version
git rm <file>                 # Remove missing files

# Continue
git add <resolved-files>
git cherry-pick --continue

# Skip empty commits
git cherry-pick --skip  # Document in PR
```

## PR Description Template
```
[Type] #[ID] - [Title]

Cherry pick commits for [Type] #[ID] to merge with release/{RELEASE_VERSION}.

[hash] - [message without ticket type/number]
[hash] - [message without ticket type/number]

Merge conflicts:
[File] - [resolution explanation]

Skipped commits:
[hash] - [message] - Reason: [why]
```
**Output as copyable text. Ask if user wants saved to `.claude/temp/CP_PR_Message-{BRANCH_NAME}.txt`**
