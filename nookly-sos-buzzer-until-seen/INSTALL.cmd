@echo off
setlocal
title Nookly SOS Buzzer Until Seen
cd /d "%~dp0"

echo.
echo ==========================================
echo   Nookly SOS Buzzer Until Seen
echo ==========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js was not found in PATH.
  echo.
  pause
  exit /b 1
)

node ".\install-sos-buzzer-until-seen.cjs"
set EXIT_CODE=%ERRORLEVEL%

echo.
if not "%EXIT_CODE%"=="0" (
  echo Installation did not complete.
) else (
  echo NEXT:
  echo   1. Stop npm run dev with Ctrl+C.
  echo   2. Run npm run dev again.
  echo   3. Test with an unseen SOS.
)
echo.
pause
exit /b %EXIT_CODE%
