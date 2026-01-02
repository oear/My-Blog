#!/bin/bash
# 开发辅助脚本 - 快速启动开发环境

set -e

echo "🎵 My Blog - 开发环境启动脚本"
echo "================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js 未安装${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js 已安装${NC} ($(node --version))"

# 检查 pnpm
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}⚠️  pnpm 未安装，使用 npm${NC}"
    PKG_MANAGER="npm"
else
    PKG_MANAGER="pnpm"
    echo -e "${GREEN}✓ pnpm 已安装${NC} ($(pnpm --version))"
fi

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 安装依赖...${NC}"
    $PKG_MANAGER install
else
    echo -e "${GREEN}✓ 依赖已安装${NC}"
fi

# 启动开发服务器
echo -e "${YELLOW}🚀 启动开发服务器...${NC}"
echo -e "${GREEN}访问 http://localhost:5173${NC}"
echo ""

$PKG_MANAGER run docs:dev
