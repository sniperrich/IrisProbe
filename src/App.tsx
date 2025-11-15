import { useEffect, useState } from 'react'
import './App.css'
import { useNodeFeed } from './hooks/useNodeFeed'
import type { AlertItem, ServerNode, TimelineItem } from './types/server'
import DebugPanel from './components/DebugPanel'

const serverHealth: ServerNode[] = [
  {
    name: 'Sample-Node',
    region: '示例集群 · Offline',
    status: 'online',
    load: 40,
    latency: 24,
    traffic: '0.8 Gbps',
    role: '示例节点（未连接）',
    uptime: '12h',
    capacity: '8 vCPU / 32 GB',
    maintenance: '等待连接至 IrisProbe 控制面',
  },
]

const trafficTrend = [
  { label: '02:00', value: 35 },
  { label: '04:00', value: 28 },
  { label: '06:00', value: 48 },
  { label: '08:00', value: 52 },
  { label: '10:00', value: 41 },
  { label: '12:00', value: 58 },
  { label: '14:00', value: 33 },
  { label: '16:00', value: 38 },
]

const timeline: TimelineItem[] = [
  { time: '12:00', event: 'IrisProbe', detail: '等待与远程控制面的 WebSocket 建立连接' },
]

const alerts: AlertItem[] = [
  {
    title: '尚未连接远程节点',
    level: 'info',
    metric: '—',
    action: '填写 .env.local 中的 VITE_NODE_API / VITE_NODE_WS 并重新启动前端',
  },
]

const fallbackPayload = {
  nodes: serverHealth,
  alerts,
  timeline,
}

function App() {
  const apiBase = import.meta.env.VITE_NODE_API ?? '未配置'
  const wsEndpoint = import.meta.env.VITE_NODE_WS ?? '未配置'
  const {
    nodes: liveNodes,
    alerts: liveAlerts,
    timeline: liveTimeline,
    status: feedStatus,
    lastSync,
    error: feedError,
  } = useNodeFeed(fallbackPayload)

  const [selectedServer, setSelectedServer] = useState<ServerNode | null>(serverHealth[0] ?? null)
  const [view, setView] = useState<'overview' | 'debug'>('overview')
  const connectionBadgeClass =
    feedStatus === 'live' ? 'online' : feedStatus === 'connecting' ? 'connecting' : 'offline'
  const hasLiveNodes = liveNodes.length > 0
  const displayNodes = hasLiveNodes ? liveNodes : serverHealth
  const connectionLabel = (() => {
    if (feedStatus === 'live') {
      if (!liveNodes.length) return '实时 · 当前无节点返回数据'
      return lastSync ? `实时 · ${new Date(lastSync).toLocaleTimeString()}` : '实时'
    }
    if (feedStatus === 'connecting') return '正在连接 IrisProbe WebSocket'
    if (feedStatus === 'offline') return '离线 · 使用本地样本'
    return '待命'
  })()

  useEffect(() => {
    if (!displayNodes.length) {
      setSelectedServer(null)
      return
    }
    if (!selectedServer) {
      setSelectedServer(displayNodes[0])
      return
    }
    const match = displayNodes.find((node) => node.name === selectedServer.name)
    if (match) {
      setSelectedServer(match)
    } else {
      setSelectedServer(displayNodes[0])
    }
  }, [displayNodes, selectedServer?.name])

  const handleSelectServer = (server: ServerNode) => {
    setSelectedServer(server)
  }

  return (
    <div className="dashboard-shell">
      <header className="hero glass">
        <div>
          <p className="eyebrow">IrisProbe / 实时探针</p>
          <h1>IrisProbe 控制视图</h1>
          <p className="hero-copy">
            将各服务器部署的探针数据统一回传，直接在本地浏览器查看实时健康度。默认仅保留一个示例节点，其余会根据控制面广播的真实节点自动填充。
          </p>
          <div className="hero-actions">
            <button className="primary">查看调度计划</button>
            <button className="ghost">导出探针报表</button>
          </div>
          <div className="view-toggle">
            <button className={view === 'overview' ? 'active' : ''} onClick={() => setView('overview')}>
              运行概览
            </button>
            <button className={view === 'debug' ? 'active' : ''} onClick={() => setView('debug')}>
              调试面板
            </button>
          </div>
        </div>
        <div className="hero-metrics">
          <div>
            <span>Global SLA</span>
            <strong>99.997%</strong>
            <p className="trend positive">+0.012%</p>
          </div>
          <div>
            <span>Edge Traffic</span>
            <strong>6.2 Tbps</strong>
            <p className="trend">实时均值</p>
          </div>
          <div>
            <span>AI 预测窗口</span>
            <strong>16 min</strong>
            <p className="trend">可用容量缓冲</p>
          </div>
        </div>
      </header>

      {view === 'overview' ? (
        <>
          <section className="core-metrics">
        <article className="metric-card glass">
          <header>
            <p>零故障倒计时</p>
            <span>+4.6h</span>
          </header>
          <strong>218h</strong>
          <p>维护窗口以后的连续稳定时长</p>
        </article>
        <article className="metric-card glass">
          <header>
            <p>自愈任务</p>
            <span>72%</span>
          </header>
          <strong>38</strong>
          <p>今日完成的自动化修复动作</p>
        </article>
        <article className="metric-card glass">
          <header>
            <p>边缘缓存命中率</p>
            <span>+12%</span>
          </header>
          <strong>93%</strong>
          <p>AI 驱动的热度预取模型</p>
        </article>
          </section>
        </>
      ) : (
        <DebugPanel
          nodes={liveNodes}
          alerts={liveAlerts}
          timeline={liveTimeline}
          status={feedStatus}
          lastSync={lastSync}
          error={feedError}
          apiBase={apiBase}
          wsEndpoint={wsEndpoint}
          fallbackNodes={serverHealth}
        />
      )}

      <section className="main-grid">
        <article className="traffic-panel glass">
          <header>
            <div>
              <p>实时流量曲线</p>
              <h2>平滑带宽河道</h2>
            </div>
            <div className="control-group">
              <button>12h</button>
              <button className="active">24h</button>
              <button>48h</button>
            </div>
          </header>
          <div className="traffic-bars">
            {trafficTrend.map((point) => (
              <div key={point.label} className="traffic-bar">
                <span style={{ height: `${point.value}%` }} />
                <p>{point.label}</p>
              </div>
            ))}
          </div>
          <div className="legend">
            <p>
              峰值 <strong>8.9 Tbps</strong>
            </p>
            <p>
              平均 <strong>6.4 Tbps</strong>
            </p>
          </div>
        </article>

        <article className="server-panel glass">
          <header>
            <div>
              <p>节点健康</p>
              <h2>四象限拓扑</h2>
            </div>
            <div className="panel-meta">
              <div className="pill online">IrisProbe 在线</div>
              <div className={`data-status ${connectionBadgeClass}`}>
                <span className="dot" />
                {connectionLabel}
              </div>
              {feedError ? <span className="status-hint">{feedError}</span> : null}
              {!feedError && feedStatus === 'live' && !liveNodes.length ? (
                <span className="status-hint">控制面在线，但尚未收到任何节点推送</span>
              ) : null}
            </div>
          </header>
          <div className="server-grid">
            {displayNodes.map((server) => (
              <button
                key={server.name}
                className={`server-card ${selectedServer?.name === server.name ? 'active' : ''}`}
                onClick={() => handleSelectServer(server)}
                onKeyDown={(evt) => evt.key === 'Enter' && handleSelectServer(server)}
                type="button"
              >
                <div className="server-head">
                  <div>
                    <h3>{server.name}</h3>
                    <p>{server.region}</p>
                  </div>
                  <span className={`status-dot ${server.status}`} />
                </div>
                <dl>
                  <div>
                    <dt>负载</dt>
                    <dd>{server.load}%</dd>
                  </div>
                  <div>
                    <dt>延迟</dt>
                    <dd>{server.latency} ms</dd>
                  </div>
                  <div>
                    <dt>吞吐</dt>
                    <dd>{server.traffic}</dd>
                  </div>
                </dl>
              </button>
            ))}
          </div>
          {feedStatus === 'live' && !liveNodes.length ? (
            <p className="server-hint">
              IrisProbe 已成功连接 {apiBase} ，但控制面尚未收到任何探针上报。请检查远程服务器的探针配置（`PROBE_ENDPOINT`、`PROBE_NODE_ID` 等）并确认容器日志是否有
              push 记录。
            </p>
          ) : null}
          {feedStatus !== 'live' ? (
            <p className="server-hint">
              当前使用示例节点 `Sample-Node`。请确保项目根目录的 `.env.local` 中写入远程 `VITE_NODE_API` 与 `VITE_NODE_WS`，然后重新启动前端。
            </p>
          ) : null}
        </article>
      </section>

      <section className="detail-grid">
        <article className="glass timeline">
          <header>
            <p>事件轨迹</p>
            <h2>时序脉冲</h2>
          </header>
          <ul>
            {liveTimeline.map((item) => (
              <li key={item.time}>
                <span>{item.time}</span>
                <div>
                  <strong>{item.event}</strong>
                  <p>{item.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </article>

        <div className="insight-stack">
          <article className="glass node-detail">
            <header>
              <div>
                <p>节点详情</p>
                <h2>{selectedServer?.name ?? '未选择'}</h2>
              </div>
              <div className={`pill ${selectedServer?.status ?? 'online'}`}>
                {selectedServer?.status === 'degraded' ? '受控降级' : '运行正常'}
              </div>
            </header>
            {selectedServer ? (
              <>
                <p className="node-role">{selectedServer.role}</p>
                <dl className="node-meta">
                  <div>
                    <dt>区域 / 集群</dt>
                    <dd>{selectedServer.region}</dd>
                  </div>
                  <div>
                    <dt>在线时长</dt>
                    <dd>{selectedServer.uptime}</dd>
                  </div>
                  <div>
                    <dt>算力配置</dt>
                    <dd>{selectedServer.capacity}</dd>
                  </div>
                  <div>
                    <dt>状态备注</dt>
                    <dd>{selectedServer.maintenance}</dd>
                  </div>
                </dl>
                <div className="node-stats">
                  <div>
                    <span>负载</span>
                    <strong>{selectedServer.load}%</strong>
                  </div>
                  <div>
                    <span>延迟</span>
                    <strong>{selectedServer.latency} ms</strong>
                  </div>
                  <div>
                    <span>当前吞吐</span>
                    <strong>{selectedServer.traffic}</strong>
                  </div>
                </div>
                <div className="node-actions">
                  <button className="primary">调度该节点</button>
                  <button className="ghost">导出健康数据</button>
                </div>
              </>
            ) : (
              <p className="node-role">请选择左侧列表中的节点以查看运行详情。</p>
            )}
          </article>

          <article className="glass alerts">
            <header>
              <p>异常处理</p>
              <h2>智能巡检</h2>
            </header>
            <div className="alert-list">
              {liveAlerts.length ? (
                liveAlerts.map((alert) => (
                  <div key={alert.title} className={`alert ${alert.level}`}>
                    <div>
                      <strong>{alert.title}</strong>
                      <p>{alert.action}</p>
                    </div>
                    <span>{alert.metric}</span>
                  </div>
                ))
              ) : (
                <div className="alert info">
                  <div>
                    <strong>控制面在线</strong>
                    <p>暂无异常告警，从 IrisProbe 控制面未收集到 Warning/Info。</p>
                  </div>
                  <span>OK</span>
                </div>
              )}
            </div>
            {feedStatus !== 'live' ? (
              <p className="status-hint">当前展示为示例告警，连接上控制面后将实时刷新。</p>
            ) : null}
          </article>
        </div>
      </section>
    </div>
  )
}

export default App
