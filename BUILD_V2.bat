@echo off
title NGPB Launcher Enterprise - BUILD V2 BANNER
echo ==========================================================
echo NGPB LAUNCHER ENTERPRISE V2 - BANNER EDITION
echo Build Script - Portable Node Version
echo ==========================================================
set PATH=%PATH%;%USERPROFILE%\Desktop\node-v20.11.0-win-x64
set PATH=%PATH%;%USERPROFILE%\Desktop\node-v20.11.0-win-x64\node_modules\npm\bin
node -v
npm -v
echo Building...
npm install
npm run build:dir
echo.
echo Hasilnya di: dist/win-unpacked/NGPB Launcher Enterprise.exe
pause
