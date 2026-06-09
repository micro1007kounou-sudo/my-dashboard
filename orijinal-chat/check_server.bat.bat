@echo off
chcp 65001 >nul

echo サーバー状態を確認しています...

netstat -ano | find ":3000" >nul
if %errorlevel%==0 (
    echo サーバーは稼働中です。
) else (
    echo サーバーは停止しています。
)

pause
