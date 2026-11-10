@echo off
chcp 65001 >nul
cd /d "%~dp0"
title DGReader - 天穹读取验证
if not exist "node.exe" (
  echo [错误] 缺少 node.exe，请确认压缩包完整解压。
  pause
  exit /b 1
)
echo 正在启动读取器…
echo 浏览器会自动打开 http://127.0.0.1:17872
echo 关闭本窗口或按 Ctrl+C 停止。
echo.
node.exe app\server.js --profile profiles\celesphonia.json --port 17870 --http-port 17872 --web web --open
echo.
echo 服务已退出。
pause
