# Repository Guidelines

## Structure
React frontend (TypeScript) + Express backend (CommonJS). Frontend in `src/`, backend in `server/`. Worksheet pages in `src/components/worksheet/`, course data in `src/data/`, static media in `public/`. Backend runtime data in `server/data/` (users, visits, courses, notifications, admin).

## Commands
- `npm run install:all` — install root + backend deps
- `npm run dev:full` — start frontend (port 3000) + backend (port 5000) via concurrently
- `npm start` / `npm run server` — start one side only
- `npm run build` — production build
- `npm run server:setup` — create admin credentials (default: admin/admin123)
- `cd server && npm run migrate` — one-off user migration
- `npm test -- --watchAll=false` — CI-style test run

## Style
- 2-space indent, semicolons, single quotes
- `PascalCase` for component files, `camelCase` for helpers
- CSS adjacent to component; linting via `react-scripts` ESLint; no Prettier

## Testing
- React Testing Library + Jest via `npm test`; tests co-located as `*.test.tsx`
- No backend test suite; validate API changes manually
- Coverage is minimal; add tests for new flows

## Commits
- Conventional prefixes: `fix:`, `feat:`
- PRs: describe user-visible change, note affected areas, include screenshots for UI

## Git Push Policy
- NEVER push to GitHub without first asking for explicit permission
- Even if the user says "push one last time", ask again on subsequent pushes

## Data & Config
- `server/data/` and `public/auth/` contain sensitive local state; never commit real user data
- `server/data/courses.json` controls which courses (arabic/english/numbers) are locked
- Frontend proxies API to backend via `src/setupProxy.ts` (no CORS issues in dev)
- Server binds to `0.0.0.0` (accessible from network); backend port defaults to 5000
- Copy `.env.example` if env vars needed; backend reads `PORT` env var
