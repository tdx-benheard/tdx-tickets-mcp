# Commit Standards

## Workflow
1. **Pre-commit code review:** MANDATORY - Ask user "Would you like me to perform a code review of the staged changes for **errors, risks, redundancies, and inefficiencies** before committing?"
   - If yes: Perform comprehensive review, fix issues if requested, then continue
   - If no: Skip review and continue
2. **Draft:** Create commit message following format below
3. **🚨 MUST GET USER APPROVAL 🚨** - Show message, ask "Would you like me to proceed with this commit?", wait for confirmation
4. **Execute:** Only after approval, run git commit

## Code Review Standards (when requested)
Always review for:
- **Errors** - Bugs, logic errors, runtime issues, null reference exceptions
- **Risks** - Security vulnerabilities, data loss potential, breaking changes
- **Redundancies** - Duplicate code, unnecessary repetition
- **Inefficiencies** - Performance issues, suboptimal algorithms, resource waste

## Ticket Number Extraction
Ticket is in branch name: `feature/{USERNAME}/{TICKET_ID}_{Description}`
Extract with: `git branch --show-current`

## Required Format
```
Brief description of what was done

Optional: Additional details explaining why/how.

Type #Number
```
- Item type + number at **very end** (not first line)
- NO square brackets around type
- Item types: Problem, Feature, Enhancement, Task

## Example
```
Fix accessibility in filter dropdown

Update keyboard navigation and screen reader support.

Problem #29221965
```
