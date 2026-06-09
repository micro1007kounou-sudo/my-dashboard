@echo off
chcp 65001 >nul
taskkill /IM node.exe /F
echo サーバーを停止しました。
pause
