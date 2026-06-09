@echo off
cd /d %~dp0

:: ブラウザを先に開く
start "" http://localhost:3000

:: CMD を最小化して server.js を実行
start /min "" cmd /c "node server.js"

