# Nebula Fabric 探针

`probe/agent.js` 是一个零依赖的 Node.js 探针脚本，用于在节点上采集基础运行指标并推送到控制面。默认每 5 秒采集一次，累计到批量后通过 HTTP POST 上报。

## 运行方式

```bash
# 安装依赖（项目已自带）
npm install

# 单次采样（仅输出，不推送）
node probe/agent.js --once

# 常驻采集，并推送到默认 endpoint
PROBE_ENDPOINT="https://fabric.example.com/api/telemetry" \
PROBE_NODE_ID="edge-07" \
PROBE_REGION="na-west" \
PROBE_ROLE="gpu-render" \
node probe/agent.js
```

环境变量说明：

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `PROBE_ENDPOINT` | 控制面接口，例如 `https://.../api/telemetry` | `http://localhost:5050/api/telemetry` |
| `PROBE_NODE_ID` | 节点唯一 ID | 主机名 |
| `PROBE_REGION` | 逻辑区域/集群 | `unassigned` |
| `PROBE_ROLE` | 节点角色 | `edge-cache` |
| `PROBE_PUSH_INTERVAL_MS` | 采样/推送周期（毫秒） | `5000` |
| `PROBE_BATCH_SIZE` | 每批上报的样本数量 | `10` |
| `PROBE_BUFFER_LIMIT` | 本地缓冲上限，防止网络波动丢数据 | `100` |

## API 契约示例

探针向 `PROBE_ENDPOINT` 发送如下 JSON：

```json
{
  "nodeId": "edge-07",
  "region": "na-west",
  "role": "gpu-render",
  "batch": [
    {
      "id": "4f31c3e0-87b7-4cc7-8c92-03a9a7a4c6b2",
      "nodeId": "edge-07",
      "region": "na-west",
      "role": "gpu-render",
      "timestamp": "2025-01-09T12:00:00.000Z",
      "metrics": {
        "load1m": 0.78,
        "cpuCount": 16,
        "memoryPercent": 63.12,
        "totalMem": 137438953472,
        "freeMem": 50680619008,
        "uptime": 284400,
        "platform": "linux-x64"
      }
    }
  ]
}
```

控制面可将批次写入时序数据库，再由前端轮询/订阅 `nodes` 与 `alerts` 数据即可与本仓库 UI 对接。
