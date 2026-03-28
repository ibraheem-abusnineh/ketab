# Admin Visitor Tracker & User Management Setup

## Overview
This application includes a backend server to track visitor logins, user management capabilities, and an admin dashboard to view statistics and manage users.

## Quick Start

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Setup Admin Credentials
```bash
npm run server:setup
```

### 3. Start Both Servers
```bash
npm run dev:full
```

Or use the batch file:
```bash
start.bat
```

## Access Points

- **Main Site**: http://localhost:3000
- **Admin Login**: http://localhost:3000/admin
- **Admin Dashboard**: http://localhost:3000/admin/dashboard
- **Backend API**: http://localhost:5000

## User Authentication

Users now log in using their **national number** instead of passcodes:
- Parents and teachers can access the site using their national number
- National numbers are imported from `parents.csv` and `teachers.csv` files
- The system automatically tracks visits when users log in successfully

## Default Admin Credentials

- **Username**: `admin`
- **Password**: `admin123`

## How It Works

### User Management
- Users are stored in `server/data/users.json`
- Import users from CSV files (parents.csv, teachers.csv)
- Add/delete users manually through admin interface
- Users authenticate with national number instead of passcodes

### Visitor Tracking
- Every time a user successfully logs in with a valid national number, the visit counter increments
- The counter is stored server-side in `server/data/visits.json`
- Tracking happens automatically in the background (won't block user login if it fails)

### Admin Dashboard
- Access via `/admin` route
- Requires username/password authentication
- **Statistics Tab**: Shows real-time visit count with auto-refresh every 5 seconds
- **User Management Tab**: Add/delete users, import from CSV, search and filter users

### Backend API Endpoints
- `POST /api/track-visit` - Increment visit counter
- `GET /api/visit-count` - Get current visit count
- `POST /api/admin/login` - Admin authentication
- `POST /api/login` - User login with national number
- `GET /api/users` - List all users
- `POST /api/users/add` - Add single user
- `DELETE /api/users/:nationalNumber` - Delete user
- `POST /api/users/import-csv` - Import users from CSV
- `GET /api/health` - Health check

## File Structure

```
server/
├── index.js              # Main Express server
├── package.json          # Server dependencies
├── setup.js              # Admin setup script
├── migrate-users.js      # User migration script
├── utils/
│   └── csvParser.js      # CSV parsing utilities
└── data/
    ├── visits.json       # Visit counter storage
    ├── admin.json        # Admin credentials (hashed)
    └── users.json        # User database

src/components/
├── AdminLogin.tsx         # Admin login form
├── AdminLogin.css         # Admin login styling
├── AdminDashboard.tsx     # Admin dashboard with tabs
├── AdminDashboard.css     # Dashboard styling
├── UserManagement.tsx     # User management interface
└── UserManagement.css     # User management styling
```

## User Management Features

### CSV Import
- Import users from `parents.csv` and `teachers.csv`
- Three import strategies:
  - **Add new only**: Skip existing users
  - **Update + add**: Update existing, add new
  - **Replace all**: Clear database and import all
- Real-time feedback on import results

### Manual User Management
- Add users manually with form validation
- Delete users with confirmation dialog
- Search and filter users by name, national number, role
- View user details: national number, name, role, school, phone

## Development

### Running Individual Servers
```bash
# React app only
npm start

# Backend server only
npm run server
```

### User Migration
```bash
# Migrate users from CSV files
npm run server:migrate
```

### Changing Admin Credentials
1. Edit `server/setup.js` to change username/password
2. Run `npm run server:setup` to update credentials
3. Restart the server

### Production Deployment
For production, you'll need to:
1. Build the React app: `npm run build`
2. Serve the built files with the backend server
3. Configure proper environment variables
4. Set up a proper database instead of JSON files

## Troubleshooting

### Server Not Starting
- Make sure port 5000 is available
- Check if Node.js is installed
- Run `npm run install:all` to install all dependencies

### Admin Login Not Working
- Verify admin credentials are set up: `npm run server:setup`
- Check browser console for errors
- Ensure backend server is running on port 5000

### Visit Counter Not Updating
- Check if backend server is running
- Verify API calls in browser network tab
- Check server console for errors
