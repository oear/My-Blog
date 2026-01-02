@echo off
REM 开发辅助脚本 - 快速启动开发环境（Windows）

setlocal enabledelayedexpansion
title My Blog - Development Server

echo.
echo 🎵 My Blog - 开发环境启动脚本
echo ================================
echo.

REM 检查 Node.js
where node >nul 2>nul
if errorlevel 1 (
    color 4
    echo ❌ Node.js 未安装
    echo 请从 https://nodejs.org 下载并安装 Node.js
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✓ Node.js 已安装 %NODE_VERSION%

REM 检查 pnpm
where pnpm >nul 2>nul
if errorlevel 1 (
    echo ⚠️  pnpm 未安装，使用 npm
    set PKG_MANAGER=npm
) else (
    for /f "tokens=*" %%i in ('pnpm --version') do set PNPM_VERSION=%%i
    echo ✓ pnpm 已安装 %PNPM_VERSION%
    set PKG_MANAGER=pnpm
)

echo.

REM 检查依赖
if not exist "node_modules" (
    echo 📦 安装依赖...
    call %PKG_MANAGER% install
    if errorlevel 1 (
        color 4
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
) else (
    echo ✓ 依赖已安装
)

REM 启动开发服务器
echo.
echo 🚀 启动开发服务器...
echo.
echo 访问 http://localhost:5173
echo.
echo 按 Ctrl+C 停止服务器
echo.

call %PKG_MANAGER% run docs:dev

pause
