# PicSpot Development Guide

## Project Overview
Darts is a SaaS family photo sharing app with subscription billing, manual face tagging, EXIF metadata extraction, and album sharing.

## Tech Stack
- **Frontend**: Vite + React + TypeScript + Tailwind CSS
- **Backend**: Convex (serverless database and functions)
- **File Upload**: UploadThing
- **Payments**: Stripe

## Development Workflow

### Running Ralph (Autonomous Agent)
Ralph implements user stories from the PRD:
```bash
./scripts/ralph/ralph.sh --tool claude 5  # Run 5 iterations
```

### Branch Strategy (PR-per-Story)
- Ralph creates a **feature branch for each user story**
- After implementing, creates a PR to merge into `master`
- Uses **agent-browser** to verify the app works
- **Auto-merges** if all checks pass:
  - `npm run check` (typecheck + tests)
  - Browser loads without errors
  - Story functionality works
  - No console errors

### Workflow
```bash
git checkout master && git pull
git checkout -b us-XXX-description
# ... implement story ...
npm run check
git add . && git commit -m "feat: US-XXX - Title"
git push -u origin us-XXX-description
gh pr create --fill
# ... browser verification with agent-browser ...
gh pr merge --squash --delete-branch
git checkout master && git pull
```

### Quality Checks
```bash
npm run typecheck  # TypeScript validation
npm run dev        # Start dev server at localhost:5173
npx convex dev     # Start Convex backend (required for full functionality)
```

### Browser Testing
Use these standard test credentials for browser verification:
- **Email**: `test@picspot.dev`
- **Password**: `testpass123`

If the account doesn't exist, create it via the signup form. This ensures consistent testing across sessions.

## Key Files
- `scripts/ralph/prd.json` - Product requirements (user stories, plan tiers)
- `scripts/ralph/progress.txt` - Implementation log with learnings
- `scripts/ralph/CLAUDE.md` - Ralph agent instructions
- `convex/schema.ts` - Database schema
- `tasks/prd-picspot-photo-app.md` - Human-readable PRD

## Codebase Patterns
- ABOUTME comments at the start of each file explain its purpose
- Convex schema uses `v.id("tableName")` for foreign key references
- Union types for enums: `v.union(v.literal("a"), v.literal("b"))`
- Environment variables prefixed with VITE_ are exposed to client-side code
- **Storage URLs**: Use `ctx.storage.getUrl(storageId)` in queries to generate CDN-backed URLs. Don't construct URLs manually. Store only the `storageId`, generate URLs on-the-fly.

## Design Standards
See @DESIGN.md for CSS styling details and best practices.  Use /frontend-design skill to create great designs that are WCAG 2.1 compliant.

## Human_Overview
Maintain a detailed HUMAN.md file that explains the whole project in plain language. 

Explain the technical architecture, the structure of the codebase and how the various parts are connected, the technologies used, why we made these technical decisions, and lessons I can learn from it (this should include the bugs we ran into and how we fixed them, potential pitfalls and how to avoid them in the future, new technologies used, how good engineers think and work, best practices, etc). 

It should be very engaging to read; don't make it sound like boring technical documentation/textbook. Where appropriate, use analogies and anecdotes to make it more understandable and memorable.
