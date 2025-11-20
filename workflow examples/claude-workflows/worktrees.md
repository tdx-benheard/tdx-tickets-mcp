# Git Worktrees

**IMPORTANT:** Always create worktrees in `.claude/worktrees/` (gitignored)

## Naming Conventions

**IMPORTANT:** Worktree directory names use the branch name suffix (the part after `feature/{USERNAME}/`).

- **Variables**:
  - `{BRANCH_NAME}` = Full branch name (e.g., `feature/bheard/28056844_Description`)
  - `{branch-name}` = Branch name suffix without prefix (e.g., `28056844_Description`)

- **Ticket work**: `.claude/worktrees/{branch-name}`
- **Cherry-pick**: `.claude/worktrees/cherry-pick-{branch-name}`

## Ticket Worktree

Create worktree from develop branch for regular ticket work:

```bash
git fetch origin develop
git worktree add .claude/worktrees/{branch-name} -b {BRANCH_NAME} origin/develop
cd .claude/worktrees/{branch-name}/enterprise
```

**Example:**
```bash
git worktree add .claude/worktrees/28056844_ReportSaveNavigatorScroll -b feature/bheard/28056844_ReportSaveNavigatorScroll origin/develop
cd .claude/worktrees/28056844_ReportSaveNavigatorScroll/enterprise
```

## Cherry-Pick Worktree

Create worktree from release branch for cherry-picking:

```bash
git fetch origin release/{RELEASE_VERSION}
git worktree add .claude/worktrees/cherry-pick-{branch-name} -b {BRANCH_NAME} origin/release/{RELEASE_VERSION}
cd .claude/worktrees/cherry-pick-{branch-name}/enterprise
```

**Example:**
```bash
git worktree add .claude/worktrees/cherry-pick-28056844_Fix_12.1 -b feature/bheard/28056844_Fix_12.1 origin/release/12.1
cd .claude/worktrees/cherry-pick-28056844_Fix_12.1/enterprise
```

## Navigation

Worktrees create a full repo checkout. Navigate to `enterprise/` subdirectory (standard working directory):

```bash
cd .claude/worktrees/{branch-name}/enterprise
```

## Cleanup Commands

```bash
git worktree list                                                  # List all worktrees
git worktree remove .claude/worktrees/{branch-name}                # Remove ticket worktree
git worktree remove .claude/worktrees/cherry-pick-{branch-name}    # Remove cherry-pick worktree
git worktree prune                                                 # Clean up deleted directories
git worktree remove --force .claude/worktrees/{branch-name}        # Force remove
```

## Notes
- Each worktree is fully isolated
- Remove after PR merge
- Follow branch naming conventions from branches.md
