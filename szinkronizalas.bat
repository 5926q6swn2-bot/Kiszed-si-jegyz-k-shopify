@echo off
chcp 65001 >nul
title Kiszedesi Jegyzek - Git Szinkronizacio
echo ========================================================
echo   Kiszedesi Jegyzek - Automatikus Szinkronizacio
echo ========================================================
echo.
echo 1. Frissitesek lekerese a GitHubrol...
git fetch origin
if errorlevel 1 goto error

echo 2. Helyi fajlok pontos igazitasa az online allapothoz...
git reset --hard origin/main
if errorlevel 1 goto error

echo.
echo ========================================================
echo   SIKER! A projekt teljesen naprakesz a legfrissebb koddal.
echo ========================================================
goto end

:error
echo.
echo HIBA tortent! Ellenorizd az internetkapcsolatot vagy a Git allapotat.

:end
echo.
echo A kilepeshez nyomj meg egy billentyut...
pause >nul
