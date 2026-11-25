@echo off
echo Stopping any old server on port 3000...
call npx -y kill-port 3000

echo Starting FastAPI Backend (MySQL Connection)...
start "FastAPI Backend" cmd /k "cd /d "%~dp0backend" && uvicorn main:app --reload"

echo Starting React Frontend...
start "React Frontend" cmd /k "cd /d "%~dp0" && npm run dev"

timeout /t 3 /nobreak >nul
start http://localhost:3000