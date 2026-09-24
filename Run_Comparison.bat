@echo off
title Trade Blotter Comparison Control Center
color 0B
cls

echo ======================================================================
echo          TRADE BLOTTER AUTOMATED COMPARISON CONTROL CENTER
echo ======================================================================
echo   Select the section you want to compare on the application's UI:
echo.
echo   [1] Dates (Automates Trade Dates, Last Activity Dates, etc.)
echo   [2] Trade Details and Economics (Automates Trade ID, Workflow Clearing, etc.)
echo   [3] Instrument Details (Automates Product, Rate, Strike, etc.)
echo.
echo ======================================================================
set /p sectionChoice="Enter choice number (1-3): "

set sectionName=Dates
if "%sectionChoice%"=="1" set sectionName=Dates
if "%sectionChoice%"=="2" set sectionName=TradeDetails
if "%sectionChoice%"=="3" set sectionName=Instrument

echo.
echo ======================================================================
echo   Select Target Environment:
echo.
echo   [1] DemoC (mtmc2.demo.markit.partners)
echo   [2] DemoB (mtmb2.demo.markit.partners)
echo   [3] UAT   (mtmuat2.demo.markit.partners)
echo.
echo ======================================================================
set /p envChoice="Enter choice number (1-3): "

set envName=DemoB
if "%envChoice%"=="1" set envName=DemoC
if "%envChoice%"=="2" set envName=DemoB
if "%envChoice%"=="3" set envName=UAT

echo.
echo ======================================================================
echo   Starting comparison for section [%sectionName%] in environment [%envName%]
echo   Running in Non-headless Mode (Visible Browser)...
echo ======================================================================
echo.

node src/compare_blotters.js --section %sectionName% --env %envName%

if %errorlevel% neq 0 (
    echo.
    color 0C
    echo ❌ ERROR: Comparison failed! Please review the error log above.
    pause
    exit /b %errorlevel%
)

echo.
color 0A
echo 🎉 SUCCESS! Comparison completed successfully!
echo Opening interactive visual HTML dashboard...
echo.

start reports\trade_comparison_report.html

pause