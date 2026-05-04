@echo off
echo ========================================
echo  AEO Diagnostic Engine - Starting...
echo ========================================

cd /d "%~dp0"

:: Create venv if not exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

:: Activate venv
call venv\Scripts\activate.bat

:: Install dependencies
echo Installing dependencies...
pip install -r backend\requirements.txt -q

:: Start server
echo.
echo Starting server at http://127.0.0.1:8000
echo Press Ctrl+C to stop.
echo.
start http://127.0.0.1:8000
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
