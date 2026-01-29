---
name: sync
description: "Sync prd.json progress back to the original PRD markdown. Use after Ralph completes user stories to update the PRD with completion status and learnings. Triggers on: sync prd, update prd from ralph, sync progress, prd sync."
---

# PRD Sync

Synchronizes the `prd.json` execution state back to the original PRD markdown file, updating completion status and incorporating learnings from Ralph's implementation.

---

## The Job

1. Read `scripts/ralph/prd.json` to get current story status
2. Identify the source PRD markdown (from project name or user input)
3. Update the PRD markdown with:
   - Checkbox completion status for acceptance criteria
   - Notes and learnings from Ralph's implementation
   - Any priority/ordering changes
4. Save the updated PRD

---

## When to Use

- After Ralph completes one or more user stories
- Before sharing PRD progress with stakeholders
- To keep the human-readable PRD as the source of truth
- To capture implementation insights in the canonical document

---

## Sync Rules

### 1. Completion Status

For each story in `prd.json` where `passes: true`:
- Find the matching story in the PRD markdown (by story ID)
- Mark ALL acceptance criteria checkboxes as checked: `- [x]`

For stories where `passes: false`:
- Leave checkboxes unchecked: `- [ ]`

### 2. Story Notes

If a story has content in its `notes` field:
- Add or update a "**Notes:**" section after acceptance criteria
- Preserve existing notes, append new ones if different

Example:
```markdown
### US-004: Implement auth backend
**Description:** As a developer...

**Acceptance Criteria:**
- [x] Better-Auth installed
- [x] Email/password enabled
- [x] Typecheck passes

**Notes:** Migrated from @convex-dev/auth to @convex-dev/better-auth. Uses triggers.user.onCreate for subscription creation.
```

### 3. New Stories

If `prd.json` contains stories not in the markdown PRD:
- Add them to the appropriate phase section
- Format using standard PRD story structure
- Mark with "(Added during implementation)" in the description

### 4. Modified Stories

If acceptance criteria differ between JSON and markdown:
- Prefer the JSON version (Ralph may have refined criteria)
- Note the change in the story's notes

### 5. Priority Changes

If story priorities were reordered significantly:
- Update the order in the markdown to match
- Note in the document header if major restructuring occurred

---

## Input Format

The skill reads from `scripts/ralph/prd.json`:

```json
{
  "project": "PicSpot",
  "description": "...",
  "userStories": [
    {
      "id": "US-001",
      "title": "Story title",
      "passes": true,
      "notes": "Implementation learnings..."
    }
  ]
}
```

---

## Output Format

Updates the markdown PRD in `tasks/prd-[project-name].md`:

```markdown
### US-001: Story title
**Description:** As a user...

**Acceptance Criteria:**
- [x] First criterion (checked if passes: true)
- [x] Second criterion
- [x] Typecheck passes

**Notes:** Implementation learnings from Ralph...
```

---

## Step-by-Step Process

### Step 1: Load Sources

```bash
# Read the JSON
cat scripts/ralph/prd.json

# Identify the PRD file (usually in tasks/)
ls tasks/prd-*.md
```

### Step 2: Compare Stories

For each story in `prd.json`:
1. Find matching story ID in markdown
2. Compare acceptance criteria
3. Check completion status
4. Note any differences

### Step 3: Update Markdown

1. **Update checkboxes**: `- [ ]` → `- [x]` for completed stories
2. **Add notes**: Append implementation notes after acceptance criteria
3. **Add new stories**: Insert any stories added during implementation
4. **Preserve formatting**: Keep the original structure and style

### Step 4: Save and Verify

1. Write the updated markdown
2. Verify the file parses correctly
3. Show a summary of changes

---

## Summary Output

After syncing, output a summary:

```
## PRD Sync Summary

**Source:** scripts/ralph/prd.json
**Target:** tasks/prd-picspot-photo-app.md

### Completed Stories (passes: true)
- US-001: Initialize project structure
- US-002: Define Convex schema
- US-004: Auth backend

### Pending Stories (passes: false)
- US-038: Pricing page
- US-039: Checkout flow

### Stories with Notes
- US-004: "Migrated from @convex-dev/auth..."
- US-006: "Uses Better-Auth's built-in Google OAuth..."

### Changes Made
- Updated 15 stories to checked status
- Added notes to 12 stories
- No new stories added
```

---

## Handling Edge Cases

### Story ID Mismatch
If a story ID in JSON doesn't exist in markdown:
- Create a new story section with that ID
- Place it in the appropriate phase based on priority
- Mark as "(New story added during implementation)"

### Duplicate Story IDs
If the same ID appears multiple times:
- Warn the user
- Update only the first occurrence
- Note the duplicate in summary

### Missing PRD File
If the target PRD file doesn't exist:
- Ask the user for the correct path
- Create a new PRD from the JSON if requested

### Conflicting Acceptance Criteria
If criteria text differs significantly:
- Preserve both versions
- Mark the difference with a comment
- Let the user reconcile manually

---

## Checklist Before Saving

- [ ] All completed stories have checked boxes
- [ ] All notes are incorporated
- [ ] Story order matches priority order
- [ ] Markdown formatting is valid
- [ ] Summary shows accurate counts
- [ ] No duplicate stories created

---

## Example Session

**User:** sync prd

**Claude:**
1. Reading `scripts/ralph/prd.json`...
2. Found 43 user stories (37 passed, 6 pending)
3. Target PRD: `tasks/prd-picspot-photo-app.md`
4. Updating completion status...
5. Adding implementation notes...

## PRD Sync Summary

**Completed:** 37 stories marked as done
**Pending:** 6 stories remaining
**Notes Added:** 25 stories with implementation insights

Changes saved to `tasks/prd-picspot-photo-app.md`
