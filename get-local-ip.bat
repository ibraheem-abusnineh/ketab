@echo off
setlocal enabledelayedexpansion
echo Finding your local IP address...
echo.
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set ip=%%a
    set ip=!ip:~1!
    echo Your local IP address is: !ip!
    echo.
    echo Your site will be accessible at:
    echo Frontend: http://!ip!:3000
    echo Backend: http://!ip!:5000
    echo.
    pause
    exit /b
)
echo Could not find IP address. Make sure you are connected to a network.
pause

