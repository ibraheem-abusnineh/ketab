@echo off
echo Starting Ketab Application with Backend Server...
echo.
echo Installing dependencies if needed...
call npm run install:all
echo.
echo Setting up admin credentials...
call npm run server:setup
echo.
echo Migrating users from CSV files...
call npm run server:migrate
echo.
echo Starting both React app and backend server...
echo React app will be available at: http://localhost:3000
echo Backend server will be available at: http://localhost:5000
echo Admin dashboard will be available at: http://localhost:3000/admin
echo.
call npm run dev:full
