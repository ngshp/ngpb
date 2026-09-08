@echo off
title NGPB Launcher Enterprise - BUILD V2 BANNER
color 0A
cls

echo =====================================================
echo NGPB LAUNCHER ENTERPRISE V2 - BANNER EDITION
echo Build Script - No PC? Use GitHub Actions!
echo =====================================================
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
  echo [ERROR] Node.js not found! Install from nodejs.org
  pause
  exit /b
)

echo [1/5] Checking dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
  echo [ERROR] npm install failed!
  pause
  exit /b
)

echo.
echo [2/5] Cleaning dist...
if exist dist rmdir /s /q dist

echo.
echo [3/5] Building EXE Enterprise (NSIS + Portable)...
call npm run build
if %ERRORLEVEL% neq 0 (
  echo [ERROR] Build failed!
  pause
  exit /b
)

echo.
echo [4/5] Generating SHA-256 + SHA-512...
for %%f in (dist\*.exe) do (
  echo File: %%f
  certutil -hashfile "%%f" SHA256
  certutil -hashfile "%%f" SHA512
  echo %%f >> dist\hashes.txt
  certutil -hashfile "%%f" SHA256 >> dist\hashes.txt
  certutil -hashfile "%%f" SHA512 >> dist\hashes.txt
  echo. >> dist\hashes.txt
)

echo.
echo [5/5] Updating version.json...
powershell -Command ^
  "$exe = Get-ChildItem -Path dist -Filter *.exe | Select-Object -First 1; " ^
  "if ($exe) { " ^
  " $sha256 = (Get-FileHash $exe.FullName -Algorithm SHA256).Hash.ToLower(); " ^
  " $sha512 = (Get-FileHash $exe.FullName -Algorithm SHA512).Hash.ToLower(); " ^
  " $size = [math]::Round($exe.Length / 1MB, 2); " ^
  " Write-Host \"Size: $size MB\"; " ^
  " $ver = Get-Content version.json | ConvertFrom-Json; " ^
  " $ver.checksum = $sha256; " ^
  " $ver.checksum_sha256 = $sha256; " ^
  " $ver.checksum_sha512 = $sha512; " ^
  " $ver.size = \"$size MB\"; " ^
  " $ver | ConvertTo-Json -Depth 10 | Set-Content version.json; " ^
  " Write-Host \"version.json updated!\" " ^
  "}"

echo.
echo =====================================================
echo BUILD SUCCESS! Enterprise Security Active
echo =====================================================
echo.
echo Output files:
dir dist\*.exe
echo.
echo Next steps:
echo 1. Upload dist/*.exe to GitHub Releases
echo 2. Upload version.json to https://ngpb.id/
echo 3. SHA hashes saved in dist/hashes.txt
echo.
echo Press any key to open dist folder...
pause >nul
start explorer dist
