@echo off
echo =====================================
echo   Calling App Startup Script
echo =====================================
echo.

echo [1/4] Starting Server...
start "Calling App - Server" cmd /k "cd app\server && npm run dev"
echo      ✓ Server terminal opened
echo.

echo [2/4] Waiting 3 seconds...
timeout /t 3 /nobreak > nul
echo      ✓ Ready
echo.

echo [3/4] Starting Client...
start "Calling App - Client" cmd /k "cd app\client && npm run dev"
echo      ✓ Client terminal opened
echo.

echo [4/4] Initialization complete
echo.
echo =====================================
echo   Setup Complete
echo =====================================
echo.
echo 📡 Server Terminal: Running on http://localhost:3000
echo 🌐 Client Terminal: Running on http://localhost:5173
echo.
echo ⏱️  Please wait 10-15 seconds for both to fully start
echo 🌐 Then open: http://localhost:5173 in your browser
echo.
echo 💡 Tip: Keep both terminal windows open while using the app
echo.
pause
