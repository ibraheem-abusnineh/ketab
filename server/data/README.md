# Data seed files

This directory holds JSON files that the running server reads/writes. They are
gitignored except for the `seeds/` subdirectory, which is also gitignored.

## Why?

When you re-clone the repo from GitHub, the JSON data files do not come with
it. To avoid losing your live data when you push + re-clone, run the export
script before pushing and the import script after re-cloning.

## Workflow

1. **Before pushing:** `npm run data:export` — writes SQL files to
   `server/data/seeds/`.
2. **Copy** the `server/data/seeds/*.sql` files to a safe place (cloud backup,
   USB, separate private repo, etc.) — they are NOT in git.
3. **After re-cloning:** copy the `server/data/seeds/*.sql` files back into
   `server/data/seeds/`, then `npm run data:import` — restores the JSON files.

## Files

- `users.json` — user accounts (nationalNumber, name, role, etc.)
- `visits.json` — anonymous page-view events
- `notifications.json` — admin inbox
- `admin.json` — admin credentials
- `courses.json` — course availability (locked/unlocked per course)
- `seeds/<entity>.sql` — exported INSERT statements (gitignored)

## Scripts

- `npm run data:export` — JSON → SQL
- `npm run data:import` — SQL → JSON (refuses non-empty files unless --force)
- `npm run data:roundtrip` — export, delete, import, diff (CI-style test)