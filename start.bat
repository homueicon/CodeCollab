@echo off
echo =====================================
echo   Starting CodeCollab
echo =====================================
echo.

echo Starting server...
start /B node server/server.js

echo Waiting for server to start...
timeout /t 5 /nobreak > nul

echo Starting Electron...
npx electron .

echo.
echo To stop the server, close this window
pause
