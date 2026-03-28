# GEMINI.md - Project Context: Ketab

## Project Overview
**Ketab** (كتاب) is an interactive, bilingual (Arabic and English) sign language learning platform. It is designed as an educational tool for students, parents, and teachers to learn sign language alphabets through worksheets, vocabulary exercises, and interactive activities.

- **Primary Technologies**: React 19 (TypeScript), Node.js (Express), Framer Motion (Animations), React DnD (Drag and Drop).
- **Architecture**:
    - **Frontend**: A React SPA with TypeScript. Uses React Router for navigation and custom context (`CourseAvailabilityContext`) for state.
    - **Backend**: An Express server that handles user authentication, visit tracking, and admin operations.
    - **Data Storage**: Local JSON files located in `server/data/` (e.g., `users.json`, `visits.json`, `admin.json`). This makes it lightweight and portable without requiring a formal database setup.
- **Key Features**: Interactive worksheets for letters, role-based access control, admin dashboard for statistics and user management, and CSV-based user imports.

## Building and Running

### Prerequisites
- **Node.js**: v14 or higher.
- **npm**: v6 or higher.

### Setup
1. **Install All Dependencies**:
   ```bash
   npm run install:all
   ```
   *This installs dependencies for both the root (frontend) and the `server/` directory.*

2. **Initialize Admin Credentials**:
   ```bash
   npm run server:setup
   ```
   *Default: admin / admin123 (hashes stored in server/data/admin.json).*

### Running the Project
- **Full Development (Frontend + Backend)**:
  ```bash
  npm run dev:full
  ```
  *Frontend runs on `http://localhost:3000`, Backend on `http://localhost:5000`.*

- **Frontend Only**: `npm start`
- **Backend Only**: `npm run server`

### Building for Production
- **Frontend Build**: `npm run build` (outputs to `build/`).
- **Deployment**: Configured for GitHub Pages via `gh-pages`.

## Development Conventions

### Frontend (src/)
- **State Management**: Uses React Hooks and Context API (`src/context/`).
- **API Interaction**: All backend calls should use the `apiFetch` utility in `src/utils/api.ts`.
- **Typing**: TypeScript interfaces/types are maintained in `src/types/`.
- **Educational Data**: Content for letters and vocabulary is stored in `src/data/lettersData.ts` and `src/data/englishLettersData.ts`.
- **Styling**: Component-specific CSS files are located alongside their components or in `src/styles/`.

### Backend (server/)
- **Storage**: Do NOT assume a database. Read/Write directly to JSON files in `server/data/` using the helper functions (`readUsersData`, `writeUsersData`, etc.).
- **Authentication**: 
    - Users login via National Number.
    - Admins use username/password (bcrypt hashing).
- **File Handling**: `multer` is used for CSV uploads during user imports.

### Assets (public/)
- **Media**: Images for vocabulary are in `public/images/`. Letter-specific demonstration videos and images are in `public/letters/`.

## Key Files
- `src/App.tsx`: Main routing and authentication state logic.
- `server/index.js`: Main Express server with all API endpoints.
- `src/data/lettersData.ts`: Core educational content for Arabic.
- `src/utils/api.ts`: API base configuration and fetch wrapper.
- `ADMIN_SETUP.md`: Detailed instructions for administrative tasks.
