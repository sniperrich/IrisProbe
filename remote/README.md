# 远程部署（Docker）

`remote/` 目录提供了将控制面 API 与探针一起部署到远程服务器的最小化 Docker 方案，方便家用网络通过公网服务器转发实时数据。

## 文件说明

- `Dockerfile`：构建包含 `server/node-api.js` 与 `probe/agent.js` 的轻量 Node 20 Alpine 镜像。
- `docker-compose.yml`：提供两个服务
  - `control-plane`：开放 `5050` 端口，提供 `POST /api/telemetry` 与 `WS /api/ws`。
  - `probe-local`：示例探针，持续采集容器主机状态并上报到 `control-plane`。

## 部署步骤

1. 在远程服务器上克隆本仓库。
2. 进入仓库根目录，执行：
   ```bash
   docker compose -f remote/docker-compose.yml up -d control-plane
   ```
   仅需要控制面时可只启动该服务；如需让服务器自身作为一个监控节点，加上 `probe-local`：
   ```bash
   docker compose -f remote/docker-compose.yml up -d control-plane probe-local
   ```
3. 如果你在其他服务器也想运行探针，可拷贝 `probe/agent.js`，设置 `PROBE_ENDPOINT=http://<远程服务器IP>:5050/api/telemetry` 后运行即可（可使用 systemd/PM2）。如果沿用 `docker-compose.yml` 中的 `probe-local` 服务，支持通过环境变量覆盖：
   ```bash
   PROBE_ENDPOINT=http://96.126.191.17:5050/api/telemetry \
   PROBE_NODE_ID=edge-01 \
   docker compose -f remote/docker-compose.yml up -d probe-local
   ```

## 配置说明

- 控制面
  - `NODE_API_HOST`：监听地址，默认 `0.0.0.0`。
  - `NODE_API_PORT`：默认 `5050`。
  - Docker 默认已将 5050 暴露为宿主端口，如需走 HTTPS，可在宿主机的 Nginx/Traefik 中做反向代理。
- 探针容器示例
  - 可在 `docker-compose.yml` 中调整 `PROBE_*` 变量来区分节点身份及采样参数。
  - 对于真实多节点部署，推荐在各个节点上单独运行探针容器/脚本。

## 本地前端与远程通信

1. 在本地项目根目录创建 `.env.local`：
   ```
   VITE_NODE_API=http://<远程服务器IP>:5050/api
   VITE_NODE_WS=ws://<远程服务器IP>:5050/api/ws
   ```
2. 运行 `npm run dev`。前端会直接通过 WebSocket 连接远程控制面，拦截不到公网的家庭网络也能实时看到服务器状态。
3. 如果使用 HTTPS，请将上述变量改为 `https://...` 与 `wss://...`。
