@echo off
title BDD Tagged Parity Test Suite Runner
color 0E
cls

:: ======================================================================
:: ⚙️ CONFIGURATION: SET BDD FILTER TAG AND TARGET ENVIRONMENT
:: ======================================================================
:: Available Tags:
::   - @scenario-1.1  (Run exact Trade ID)
::   - @scenario-1.3  (Run exact Deal ID)
::   - @id            (Run all 35 alphanumeric trade/deal ID fields)
::   - @date          (Run all 9 date range fields)
::   - @dropdown      (Run all 17 workflow, status, and dropdown tree fields)
::   - @entity        (Run all 13 counterparties, brokers, and LEI fields)
::   - @product       (Run all 3 product asset class checkboxes & trees)
::   - @economics     (Run all 28 monetary amounts, ranges, and currencies)
::   - @all-bdd       (Run all 112 BDD scenarios together)
::
set TARGET_TAG=@date
::
:: Target Environments: DemoC, DemoB, UAT
::
set TARGET_ENV=DemoB
:: ======================================================================

echo ======================================================================
echo          OSTTRA TRADE BLOTTER: COMPARATIVE BDD TEST RUNNER
echo ======================================================================
echo.
echo   * Selected Filter Tag : %TARGET_TAG%
echo   * Selected Environment: %TARGET_ENV%
echo   * Execution Mode      : HEADED (Visible Browser)
echo.
echo   [Pipeline Sync] Harvesting latest GWT export data and updating BDD specs...
echo.
call node src/harvest_test_data.js
if %errorlevel% neq 0 (
    echo.
    color 0C
    echo ❌ ERROR: Harvesting GWT export CSV failed! Please review the error log above.
    pause
    exit /b %errorlevel%
)

call node src/update_bdd_examples.js
if %errorlevel% neq 0 (
    echo.
    color 0C
    echo ❌ ERROR: Updating BDD examples failed! Please review the error log above.
    pause
    exit /b %errorlevel%
)

echo.
echo ======================================================================
echo.

set BLOTTER_ENV=%TARGET_ENV%
npx playwright test --grep "%TARGET_TAG%" --headed

echo.
echo ======================================================================
echo   BDD tagged run complete.
echo ======================================================================
pause
