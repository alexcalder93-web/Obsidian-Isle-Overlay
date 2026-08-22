@echo off
title The Isle: Evrima Server

REM Start TheIsleServer with the specified parameters

set SERVER_EXECUTABLE=TheIsleServer.exe
set LOG_FLAG=-log

set EOS_CLIENT_ID=xyza7891gk5PRo3J7G9puCJGFJjmEguW
set EOS_CLIENT_SECRET=pKWl6t5i9NJK8gTpVlAxzENZ65P8hYzodV8Dqe5Rlc8

set INI_PARAMETERS=-ini:Engine:[EpicOnlineServices]:DedicatedServerClientId=%EOS_CLIENT_ID% -ini:Engine:[EpicOnlineServices]:DedicatedServerClientSecret=%EOS_CLIENT_SECRET%

set PORT_PARAMETER=-Port=7777

echo.
echo ==========================================
echo       THE ISLE: EVRIMA SERVER
echo ==========================================
echo.
echo Starting server...
echo Port: 7777
echo.

%SERVER_EXECUTABLE% %LOG_FLAG% %INI_PARAMETERS% %PORT_PARAMETER%

echo.
echo ==========================================
echo Server process has stopped.
echo ==========================================
pause