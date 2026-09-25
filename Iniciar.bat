@echo off
title appmi Launcher
echo ===========================================
echo         INICIANDO SISTEMA APPMI
echo ===========================================
echo.

cd /d "%~dp0"

echo [1/2] Compilando frontend...
call npm run build

echo [2/2] Iniciando Servidor Unificado (Puerto 4005)...
start /min "appmi - Server" cmd /k "npm run server"

echo.
echo Esperando que el servidor responda...
timeout /t 4 /nobreak >nul

echo.
echo ===========================================
echo  appmi iniciado correctamente (Puerto 4005)
echo ===========================================
timeout /t 4 >nul
exit