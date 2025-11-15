#!/usr/bin/env bash
set -euo pipefail

if command -v node >/dev/null 2>&1; then
  exit 0
fi

echo "[setup] Node.js 未检测到，正在通过 Debian 包管理器安装..."
if ! command -v curl >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y curl
fi

curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs
