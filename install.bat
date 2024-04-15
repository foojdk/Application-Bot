@echo off
echo Installere dependencies.
cd /d "%~dp0"
npm install
if %ERRORLEVEL% neq 0 (
    echo Der opstod en fejl, tag et screenshot og send den til .fooj på Discord.
) else (
    echo Dependencies Alt er installeret, vinduet lukker automatisk
)
pause
