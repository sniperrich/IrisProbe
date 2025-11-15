#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ ! -x "$ROOT_DIR/scripts/setup-node-if-needed.sh" ]]; then
  chmod +x "$ROOT_DIR/scripts/setup-node-if-needed.sh"
fi

"$ROOT_DIR/scripts/setup-node-if-needed.sh"

DEFAULT_ENDPOINT="http://127.0.0.1:5050/api/telemetry"
read -rp "控制面接口 (默认: ${DEFAULT_ENDPOINT}): " INPUT_ENDPOINT
PROBE_ENDPOINT="${INPUT_ENDPOINT:-$DEFAULT_ENDPOINT}"

read -rp "节点 ID (默认: $(hostname)): " INPUT_NODE
PROBE_NODE_ID="${INPUT_NODE:-$(hostname)}"

read -rp "所属区域/集群 (默认: default-cluster): " INPUT_REGION
PROBE_REGION="${INPUT_REGION:-default-cluster}"

read -rp "节点角色 (默认: generic): " INPUT_ROLE
PROBE_ROLE="${INPUT_ROLE:-generic}"

echo ""
echo "========== 配置 =========="
echo "PROBE_ENDPOINT = $PROBE_ENDPOINT"
echo "PROBE_NODE_ID  = $PROBE_NODE_ID"
echo "PROBE_REGION   = $PROBE_REGION"
echo "PROBE_ROLE     = $PROBE_ROLE"
echo "========================="
echo ""

cd "$ROOT_DIR"
PROBE_ENDPOINT="$PROBE_ENDPOINT" \
  PROBE_NODE_ID="$PROBE_NODE_ID" \
  PROBE_REGION="$PROBE_REGION" \
  PROBE_ROLE="$PROBE_ROLE" \
  node probe/agent.js
