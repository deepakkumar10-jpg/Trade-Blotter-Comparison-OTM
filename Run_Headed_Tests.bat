@echo off
title OSTTRA Trade Blotter - Visually Running Parity Tests
color 0A
cls

echo ======================================================================
echo          OSTTRA TRADE BLOTTER COMPARATIVE PARITY SUITE
echo ======================================================================
echo.
echo  * Environment       : DemoB (mtmb2.demo.markit.partners)
echo  * Mode              : HEADED (Visible Browser)
echo  * Dynamic Pool      : data/harvested_test_pool.json
echo.
echo  This batch file executes the official Playwright Test suite headfully,
echo  allowing you to visually watch the browser login, clear criteria,
echo  populate inputs, apply filters, and scrape data for comparison.
echo.
echo ======================================================================
echo.
echo  Press any key to launch the browser and begin the visual demo...
pause > null

npx playwright test --headed

echo.
echo ======================================================================
echo  Parity Suite execution completed.
echo ======================================================================
pause
