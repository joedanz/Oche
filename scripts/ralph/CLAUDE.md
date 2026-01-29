# Ralph Agent Instructions

You are an autonomous coding agent working on a software project.

## Your Task

1. Read the PRD at `prd.json` (in the same directory as this file)
2. Read the progress log at `progress.txt` (check Codebase Patterns section first)
3. Ensure you're on `master` branch and it's up to date: `git checkout master && git pull`
4. Pick the user story with the **lowest priority number** where `passes: false` (priority 1 is most important, work on lowest numbers first)
5. Create a feature branch for this story: `git checkout -b <story-id>-<short-description>`
6. **Write tests first** (see Test-Driven Development section) - tests should fail initially
7. Implement the feature to make tests pass
8. Run quality checks: `npm run check` (runs typecheck + tests)
9. Update CLAUDE.md files if you discover reusable patterns (see below)
10. If checks pass, commit ALL changes (code + tests) with message: `feat: [Story ID] - [Story Title]`
11. Push the branch and create a PR: `git push -u origin <branch> && gh pr create --fill`
12. Run browser verification using agent-browser (see Browser Verification section)
13. If browser verification passes, merge the PR: `gh pr merge --squash --delete-branch`
14. Update the PRD to set `passes: true` for the completed story
15. Append your progress to `progress.txt` (include test count added)
16. Return to master: `git checkout master && git pull`

## Progress Report Format

APPEND to progress.txt (never replace, always append):
```
## [Date/Time] - [Story ID]
- What was implemented
- Files changed
- **Tests added:** [number] new tests in [test files]
- **Learnings for future iterations:**
  - Patterns discovered (e.g., "this codebase uses X for Y")
  - Gotchas encountered (e.g., "don't forget to update Z when changing W")
  - Useful context (e.g., "the evaluation panel is in component X")
---
```

The learnings section is critical - it helps future iterations avoid repeating mistakes and understand the codebase better.

## Consolidate Patterns

If you discover a **reusable pattern** that future iterations should know, add it to the `## Codebase Patterns` section at the TOP of progress.txt (create it if it doesn't exist). This section should consolidate the most important learnings:

```
## Codebase Patterns
- Example: Use `sql<number>` template for aggregations
- Example: Always use `IF NOT EXISTS` for migrations
- Example: Export types from actions.ts for UI components
```

Only add patterns that are **general and reusable**, not story-specific details.

## Update CLAUDE.md Files

Before committing, check if any edited files have learnings worth preserving in nearby CLAUDE.md files:

1. **Identify directories with edited files** - Look at which directories you modified
2. **Check for existing CLAUDE.md** - Look for CLAUDE.md in those directories or parent directories
3. **Add valuable learnings** - If you discovered something future developers/agents should know:
   - API patterns or conventions specific to that module
   - Gotchas or non-obvious requirements
   - Dependencies between files
   - Testing approaches for that area
   - Configuration or environment requirements

**Examples of good CLAUDE.md additions:**
- "When modifying X, also update Y to keep them in sync"
- "This module uses pattern Z for all API calls"
- "Tests require the dev server running on PORT 3000"
- "Field names must match the template exactly"

**Do NOT add:**
- Story-specific implementation details
- Temporary debugging notes
- Information already in progress.txt

Only update CLAUDE.md if you have **genuinely reusable knowledge** that would help future work in that directory.

## Quality Requirements

- ALL commits must pass your project's quality checks (typecheck, lint, test)
- Do NOT commit broken code
- Keep changes focused and minimal
- Follow existing code patterns

## Test-Driven Development (TDD) - REQUIRED

**Every story MUST include tests.** No PR should be merged without new tests covering the functionality.

### TDD Workflow (Step 6 in Your Task)

1. **Identify what to test** - Based on acceptance criteria, determine key behaviors
2. **Write failing tests first** - Create test file with tests that fail (feature doesn't exist yet)
3. **Run `npm run test`** - Confirm tests fail as expected
4. **Implement the feature** - Write only enough code to make tests pass
5. **Run `npm run test`** - Confirm all tests pass
6. **Refactor** if needed while keeping tests green

### Test File Conventions

Place tests next to the code they test (co-location pattern):
```
src/components/AlbumCard.tsx
src/components/AlbumCard.test.tsx     # Component test

convex/albums.ts
convex/albums.test.ts                  # Convex function test
```

### REQUIRED Tests per Story Type

| Story Type | Minimum Tests Required |
|------------|------------------------|
| New Convex mutation | 2 tests: happy path + permission/validation check |
| New Convex query | 1-2 tests: returns expected data, handles edge cases |
| New React component | 2 tests: renders correctly, handles user interaction |
| New form | 3 tests: validation errors, successful submission, error handling |
| New page/route | 2 tests: renders, handles loading/error states |
| Bug fix | 1 regression test proving the fix |

### Test Patterns

**React Component Test Example:**
```typescript
// src/components/MyComponent.test.tsx
import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { MyComponent } from "./MyComponent";

// Mock convex hooks
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

describe("MyComponent", () => {
  beforeEach(() => {
    vi.resetAllMocks();  // IMPORTANT: use resetAllMocks, not clearAllMocks
  });

  it("renders correctly", () => {
    render(<MyComponent />);
    expect(screen.getByText(/expected text/i)).toBeInTheDocument();
  });
});
```

**Key Testing Tips:**
- Use `vi.resetAllMocks()` in `beforeEach` (not `clearAllMocks`) for proper isolation
- Use `getByRole()` over `getByText()` when possible for better accessibility
- For forms with `type="email"`, add `novalidate` to test JS validation
- Mock Convex hooks at the module level with `vi.mock("convex/react", ...)`

### Running Tests

```bash
npm run test        # Run all tests once
npm run test:watch  # Run tests in watch mode
npm run check       # Typecheck + tests (used before merge)
```

### Verification Before Merge

Before merging, verify:
1. `npm run test` shows NEW tests were added (compare test count)
2. Tests cover the acceptance criteria behaviors
3. Tests use proper isolation (`vi.resetAllMocks()`)

## Browser Verification (Required Before Merge)

Before merging any PR, you MUST verify the app works using the `/dev-browser` skill.

**IMPORTANT:** Always use `/dev-browser` for browser automation. Do NOT use raw Playwright MCP tools directly (e.g., `mcp__plugin_testing-suite_playwright-server__*`).

Steps:
1. Start the dev server if not running: `npm run dev`
2. Use `/dev-browser` to navigate to `http://localhost:5173`
3. Verify the app loads without errors
4. For UI stories: test the specific UI changes (click buttons, fill forms, etc.)
5. Take a screenshot as evidence
6. Check the browser console for errors (the skill provides this capability)
7. **Close the browser** when done — leaving it open breaks the next iteration

**Auto-merge criteria - ALL must pass:**
- [ ] `npm run check` passes (typecheck + tests)
- [ ] **New tests were added** for the story (verify test count increased)
- [ ] App loads in browser without errors
- [ ] Story-specific functionality works as expected
- [ ] No console errors related to the changes

If ANY check fails, do NOT merge. Fix the issues first.

**Test count verification:** Run `npm run test` before and after implementation to confirm new tests were added.

If browser tools are unavailable, note in progress.txt that manual verification is needed and do NOT auto-merge.

## Branch Strategy

Ralph uses a **PR-per-story** workflow:
1. Start from `master` branch (always pull latest first)
2. Create a feature branch for each story (e.g., `us-004-auth-backend`)
3. Implement, test, commit, and push
4. Create a PR with `gh pr create --fill`
5. Verify with browser testing
6. Auto-merge if all checks pass: `gh pr merge --squash --delete-branch`
7. Return to master for the next story

This ensures each story is independently reviewable and traceable.

## Merging to Master

Ralph works on a feature branch (specified by `branchName` in PRD), but completed work should be merged to master regularly. **After every 3-5 completed user stories**, or when a logical milestone is reached:

1. Create a PR to merge the feature branch to master:
   ```bash
   gh pr create --base master --head <branchName> --title "feat: <summary of stories>" --body "<list completed stories>"
   ```
2. The PR should list all completed user stories since the last merge
3. After PR is merged, continue working on the feature branch (it will be rebased automatically by GitHub)

**Do NOT let the feature branch diverge too far from master.** Regular merges prevent:
- Large, hard-to-review PRs
- Merge conflicts
- Loss of work if something goes wrong

## Stop Condition

After completing a user story, check if ALL stories have `passes: true`.

If ALL stories are complete and passing, reply with:
<promise>COMPLETE</promise>

If there are still stories with `passes: false`, end your response normally (another iteration will pick up the next story).

## Important

- Work on ONE story per iteration
- Commit frequently
- Keep CI green
- Read the Codebase Patterns section in progress.txt before starting
- **Merge to master every 3-5 stories** (see "Merging to Master" section)
