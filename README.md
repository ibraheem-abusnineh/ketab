# Ketab - Sign Language Learning Platform

An interactive educational web application for learning Arabic and English sign language alphabets. The platform provides comprehensive worksheets, vocabulary exercises, and interactive learning activities for students, parents, and teachers.

## 🎯 Project Overview

**Ketab** (كتاب - meaning "book" in Arabic) is a bilingual sign language learning platform developed for Jordanian Arabic and English sign language education. The application features:

- **Interactive Worksheets**: Comprehensive learning materials for each letter of both alphabets
- **Multi-language Support**: Arabic and English sign language courses
- **User Management**: Role-based access for parents, teachers, and administrators
- **Progress Tracking**: Visit statistics and user activity monitoring
- **Profile Management**: User profiles with edit request functionality
- **Admin Dashboard**: Comprehensive administrative tools for user and content management

## ✨ Key Features

### Educational Features
- **Letter Index**: Browseable index of Arabic and English sign language letters
- **Interactive Worksheets**: Multiple page types for each letter:
  - Introduction page with letter information
  - Vocabulary page with images and videos
  - Writing practice exercises
  - Letter recognition activities
  - Syllable writing exercises
  - Vowel writing practice
  - Matching exercises
- **Video Integration**: Sign language demonstration videos for vocabulary words
- **Drag and Drop**: Interactive exercises using React DnD
- **Course Selection**: Switch between Arabic, English, and Numbers courses

### User Management
- **National Number Authentication**: Secure login using national identification numbers
- **Role-Based Access**: Support for parents and teachers
- **User Profiles**: Detailed profiles with login history and statistics
- **Profile Edit Requests**: Users can request profile updates that require admin approval
- **Session Management**: Secure authentication with session tokens

### Admin Features
- **Statistics Dashboard**: 
  - Total visit counts
  - School-based statistics
  - Time-based analytics (hourly/daily)
  - User login history
- **User Management**:
  - Add/delete users manually
  - Import users from CSV files (parents.csv, teachers.csv)
  - Search and filter users
  - Update user information
- **Notification System**: Track profile updates and edit requests
- **Visit Tracking**: Automatic tracking of user logins and visits

## 🛠️ Technology Stack

### Frontend
- **React 19.1.1** - UI framework
- **TypeScript 4.9.5** - Type safety
- **React Router DOM 7.9.2** - Navigation
- **React DnD 16.0.1** - Drag and drop functionality
- **Framer Motion 12.23.22** - Animations
- **React Scripts 5.0.1** - Build tooling

### Backend
- **Node.js** - Runtime environment
- **Express 4.18.2** - Web framework
- **bcryptjs 2.4.3** - Password hashing
- **Multer 1.4.5** - File upload handling
- **csv-parser 3.0.0** - CSV file processing
- **CORS 2.8.5** - Cross-origin resource sharing

### Data Storage
- **JSON Files**: File-based data storage for users, visits, admin credentials, and notifications

## 📁 Project Structure

```
new_development/
├── public/                 # Static assets
│   ├── images/            # Vocabulary images
│   ├── letters/           # Letter-specific media (images, videos)
│   └── index.html         # HTML template
├── src/
│   ├── components/        # React components
│   │   ├── worksheet/     # Worksheet page components
│   │   ├── Cover.tsx      # Landing page
│   │   ├── LettersIndex.tsx  # Letter index page
│   │   ├── Profile.tsx    # User profile
│   │   ├── AdminLogin.tsx # Admin authentication
│   │   ├── AdminDashboard.tsx  # Admin interface
│   │   └── ...
│   ├── data/              # Letter data and vocabulary
│   │   ├── lettersData.ts # Arabic letter data
│   │   ├── englishLettersData.ts  # English letter data
│   │   └── englishLetterInfo.ts   # English letter info
│   ├── utils/             # Utility functions
│   │   ├── auth.ts       # Authentication logic
│   │   ├── api.ts        # API client
│   │   ├── courseState.ts # Course selection state
│   │   └── videoUtils.ts  # Video utilities
│   ├── types/             # TypeScript type definitions
│   ├── App.tsx            # Main app component
│   └── index.tsx          # Entry point
├── server/                # Backend server
│   ├── data/              # JSON data files
│   │   ├── users.json     # User database
│   │   ├── visits.json    # Visit statistics
│   │   ├── admin.json     # Admin credentials
│   │   └── notifications.json  # Notifications
│   ├── utils/             # Server utilities
│   │   └── csvParser.js   # CSV parsing
│   ├── index.js           # Express server
│   ├── setup.js           # Admin setup script
│   └── migrate-users.js   # User migration script
├── package.json           # Frontend dependencies
├── server/package.json    # Backend dependencies
└── README.md              # This file
```

## 🚀 Installation & Setup

### Prerequisites
- **Node.js** (v14 or higher recommended)
- **npm** (v6 or higher)
- **Git** (optional, for cloning)

### Installation Steps

1. **Clone or download the project**
   ```bash
   cd new_development
   ```

2. **Install all dependencies**
   ```bash
   npm run install:all
   ```
   This will install dependencies for both the frontend and backend.

3. **Set up admin credentials**
   ```bash
   npm run server:setup
   ```
   This creates the admin account with default credentials:
   - Username: `admin`
   - Password: `admin123`

4. **Import users (optional)**
   If you have CSV files (`parents.csv`, `teachers.csv`) with user data, you can import them through the admin dashboard after starting the server.

## 🎮 Usage

### Starting the Application

#### Option 1: Start both servers together
```bash
npm run dev:full
```
This starts both the React development server (port 3000) and the backend API server (port 5000).

#### Option 2: Use the batch file (Windows)
```bash
start.bat
```

#### Option 3: Start servers separately
```bash
# Frontend only (port 3000)
npm start

# Backend only (port 5000)
npm run server
```

### Access Points

- **Main Application**: http://localhost:3000
- **Admin Login**: http://localhost:3000/admin
- **Admin Dashboard**: http://localhost:3000/admin/dashboard
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/api/health

### User Workflow

1. **Login**: Users enter their national number on the cover page
2. **Browse Letters**: Access the letter index page to see available letters
3. **Select Course**: Choose between Arabic, English, or Numbers
4. **Learn**: Click on a letter to open its interactive worksheet
5. **Complete Exercises**: Work through various learning activities
6. **View Profile**: Access profile page to see statistics and request edits

### Admin Workflow

1. **Login**: Access `/admin` and enter admin credentials
2. **View Statistics**: Monitor visit counts and user activity
3. **Manage Users**: Add, delete, or import users from CSV
4. **Review Requests**: Approve or reject profile edit requests
5. **View Notifications**: Monitor system activity and updates

## 📚 API Documentation

### Authentication Endpoints

#### `POST /api/login`
User login with national number
```json
Request: { "nationalNumber": "1234567890" }
Response: { 
  "success": true, 
  "user": { "nationalNumber": "...", "name": "...", "role": "...", "school": "..." }
}
```

#### `POST /api/admin/login`
Admin authentication
```json
Request: { "username": "admin", "password": "admin123" }
Response: { "success": true, "sessionToken": "..." }
```

### User Management Endpoints

#### `GET /api/users`
Get all users
```json
Response: { "success": true, "users": [...] }
```

#### `POST /api/users/add`
Add a new user
```json
Request: {
  "nationalNumber": "1234567890",
  "name": "John Doe",
  "role": "parent",
  "school": "School Name",
  "phone": "123456789",
  "directorate": "Directorate Name"
}
```

#### `DELETE /api/users/:nationalNumber`
Delete a user

#### `PUT /api/users/:nationalNumber`
Update user information (admin only)

#### `POST /api/users/import-csv`
Import users from CSV file
```json
Request: FormData with:
  - csvFile: CSV file
  - strategy: "add" | "upsert" | "replace"
  - role: "parent" | "teacher"
```

### User Profile Endpoints

#### `GET /api/user/profile/:nationalNumber`
Get user profile with statistics

#### `POST /api/user/profile/:nationalNumber/request-edit`
Submit profile edit request (user)

#### `PUT /api/user/profile/:nationalNumber`
Update profile (admin only)

### Statistics Endpoints

#### `GET /api/visit-count`
Get total visit count

#### `GET /api/stats/by-school`
Get statistics grouped by school

#### `GET /api/stats/by-time`
Get statistics grouped by time (hourly/daily)

#### `GET /api/stats/user-history`
Get user login history and statistics

### Admin Endpoints

#### `GET /api/admin/notifications`
Get all notifications

#### `POST /api/admin/profile-requests/:id/approve`
Approve a profile edit request

#### `POST /api/admin/profile-requests/:id/reject`
Reject a profile edit request

#### `POST /api/admin/notifications/:id/read`
Mark notification as read

### Utility Endpoints

#### `GET /api/health`
Health check endpoint

## 🧪 Development

### Available Scripts

```bash
# Frontend scripts
npm start              # Start React dev server
npm run build          # Build for production
npm test              # Run tests
npm run eject         # Eject from Create React App (irreversible)

# Backend scripts
npm run server        # Start backend server
npm run server:setup  # Setup admin credentials
npm run server:migrate # Migrate users from CSV

# Combined scripts
npm run dev:full      # Start both frontend and backend
npm run install:all  # Install all dependencies
```

### Development Guidelines

1. **TypeScript**: The project uses TypeScript for type safety. Maintain type definitions in `src/types/`.
2. **Component Structure**: Keep components modular and reusable.
3. **API Calls**: Use the `apiFetch` utility from `src/utils/api.ts` for API requests.
4. **State Management**: Use React hooks for local state and localStorage for persistence.
5. **Styling**: Each component has its own CSS file for styling.

### Environment Variables

Create a `.env` file in the root directory for environment-specific configuration:

```env
REACT_APP_FEEDBACK_EMAIL=your-email@example.com
PORT=3000  # Frontend port (default)
```

Backend port can be set via `PORT` environment variable (default: 5000).

### CSV Import Format

When importing users from CSV, ensure the following columns are present:

**For Parents (`parents.csv`):**
- National Number
- Name
- School
- Phone (optional)
- Directorate (optional)

**For Teachers (`teachers.csv`):**
- National Number
- Name
- School
- Phone (optional)
- Directorate (optional)

## 🔒 Security Considerations

1. **Password Hashing**: Admin passwords are hashed using bcryptjs
2. **Session Tokens**: Basic session token implementation (consider JWT for production)
3. **CORS**: Configured for development; update for production
4. **Input Validation**: User input is validated on both client and server
5. **File Uploads**: CSV uploads are validated and sanitized

**Note**: For production deployment, consider:
- Implementing JWT for authentication
- Using a proper database instead of JSON files
- Adding rate limiting
- Implementing HTTPS
- Adding request validation middleware
- Securing admin endpoints

## 📦 Building for Production

1. **Build the React app**
   ```bash
   npm run build
   ```
   This creates an optimized production build in the `build/` directory.

2. **Serve the application**
   - The `build/` folder contains static files that can be served by any static file server
   - For Express integration, modify `server/index.js` to serve static files from the build directory

3. **Environment setup**
   - Set production environment variables
   - Configure proper CORS settings
   - Set up proper database connection
   - Configure HTTPS

## 🐛 Troubleshooting

### Server Not Starting
- Ensure port 5000 (backend) and 3000 (frontend) are available
- Check Node.js installation: `node --version`
- Verify dependencies are installed: `npm run install:all`

### Admin Login Issues
- Verify admin credentials are set up: `npm run server:setup`
- Check `server/data/admin.json` exists and is valid
- Review server console for error messages

### API Connection Errors
- Ensure backend server is running on port 5000
- Check CORS configuration in `server/index.js`
- Verify proxy settings in `src/setupProxy.js` or `src/setupProxy.ts`

### Build Errors
- Clear node_modules and reinstall: `rm -rf node_modules && npm run install:all`
- Check for TypeScript errors: Review console output
- Verify all dependencies are compatible

### Import Errors
- Verify CSV file format matches expected structure
- Check file encoding (should be UTF-8)
- Review column headers match expected format

## 📝 License

This project appears to be a free educational resource. See the notice displayed on the cover page regarding usage rights.

## 👥 Contributing

When contributing to this project:
1. Maintain code style and TypeScript types
2. Test changes thoroughly
3. Update documentation as needed
4. Follow the existing component structure

## 📧 Support

For feedback or issues, use the feedback button in the application or contact the development team.

---

**Note**: This application is designed for educational purposes. The content is free and any attempt to sell or charge for access is illegal as stated in the application's terms.
