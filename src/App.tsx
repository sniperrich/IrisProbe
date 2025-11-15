import { useEffect, useState } from 'react'
import './App.css'
import { useNodeFeed } from './hooks/useNodeFeed'
import type { AlertItem, ServerNode, TimelineItem } from './types/server'

const serverHealth: ServerNode[] = [
  {
    name: 'Edge-01',
    region: '华南集群 · Guangzhou',
    status: 'online',
    load: 67,
    latency: 24,
    traffic: '1.2 Gbps',
    role: '边缘缓存池',
    uptime: '218h',
    capacity: '12-node pod',
    maintenance: '风冷回路换新完成',
  },
  {
    name: 'Core-Alpha',
    region: '亚太核心 · Singapore',
    status: 'online',
    load: 41,
    latency: 18,
    traffic: '980 Mbps',
    role: '交易路由主枢',
    uptime: '512h',
    capacity: '32 vCPU / 256 GB',
    maintenance: '周四 02:00 将窗口式升级',
  },
  {
    name: 'Edge-07',
    region: '北美边缘 · Seattle',
    status: 'degraded',
    load: 82,
    latency: 39,
    traffic: '1.5 Gbps',
    role: '实时渲染出站',
    uptime: '146h',
    capacity: 'GPU pod x8',
    maintenance: '待更换液冷组件',
  },
  {
    name: 'GPU-Vault',
    region: '渲染农场 · Tokyo',
    status: 'online',
    load: 54,
    latency: 28,
    traffic: '2.1 Gbps',
    role: 'AI 预训练备舱',
    uptime: '342h',
    capacity: 'A100 x16',
    maintenance: '功耗策略调优中',
  },
]

const trafficTrend = [
  { label: '02:00', value: 64 },
  { label: '04:00', value: 52 },
  { label: '06:00', value: 75 },
  { label: '08:00', value: 88 },
  { label: '10:00', value: 69 },
  { label: '12:00', value: 90 },
  { label: '14:00', value: 72 },
  { label: '16:00', value: 60 },
]

const timeline: TimelineItem[] = [
  { time: '16:20', event: 'Traffic Surge', detail: 'CN 集群自动扩容 6 个节点完成' },
  { time: '15:45', event: 'Latency Alert', detail: 'Edge-07 改走 JP 主干以压低 RTT' },
  { time: '14:02', event: 'Config Sync', detail: '零停机发布 rev 5.11 已完成' },
  { time: '12:37', event: 'AI Optimizer', detail: '预测缓存使出口流量减 32%' },
]

const alerts: AlertItem[] = [
  { title: 'Edge-07 冷却速率偏高', level: 'warning', metric: '45°C', action: '切换至液冷通道' },
  { title: 'Core-Alpha IOPS 峰值', level: 'info', metric: '410k', action: '流量削峰策略已开启' },
]

const fallbackPayload = {
  nodes: serverHealth,
  alerts,
  timeline,
}

function App() {
  const {
    nodes: liveNodes,
    alerts: liveAlerts,
    timeline: liveTimeline,
    status: feedStatus,
    lastSync,
    error: feedError,
  } = useNodeFeed(fallbackPayload)

  const [selectedServer, setSelectedServer] = useState<ServerNode | null>(liveNodes[0] ?? null)
  const connectionBadgeClass =
    feedStatus === 'live' ? 'online' : feedStatus === 'connecting' ? 'connecting' : 'offline'
  const connectionLabel = (() => {
    if (feedStatus === 'live') {
      return lastSync ? `实时 · ${new Date(lastSync).toLocaleTimeString()}` : '实时'
    }
    if (feedStatus === 'connecting') return '正在连接 WebSocket'
    if (feedStatus === 'offline') return '离线 · 使用本地样本'
    return '待命'
  })()

  useEffect(() => {
    if (!liveNodes.length) return
    if (!selectedServer) {
      setSelectedServer(liveNodes[0])
      return
    }
    const match = liveNodes.find((node) => node.name === selectedServer.name)
    if (match) {
      setSelectedServer(match)
    } else {
      setSelectedServer(liveNodes[0])
    }
  }, [liveNodes, selectedServer?.name])

  const handleSelectServer = (server: ServerNode) => {
    setSelectedServer(server)
  }

  return (
    <div className="dashboard-shell">
      <header className="hero glass">
        <div>
          <p className="eyebrow">Nebula Fabric / 控制塔</p>
          <h1>全球算力视图</h1>
          <p className="hero-copy">
            汇总实时 SLA、热度与容量窗口，用更克制的界面呈现核心指标。下方节点列表可点选以查看精细运行数据。
          </p>
          <div className="hero-actions">
            <button className="primary">打开调度计划</button>
            <button className="ghost">导出日报</button>
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
              <div className="pill online">AI 审核通过</div>
              <div className={`data-status ${connectionBadgeClass}`}>
                <span className="dot" />
                {connectionLabel}
              </div>
              {feedError ? <span className="status-hint">{feedError}</span> : null}
            </div>
          </header>
          <div className="server-grid">
            {liveNodes.map((server) => (
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
              {liveAlerts.map((alert) => (
                <div key={alert.title} className={`alert ${alert.level}`}>
                  <div>
                    <strong>{alert.title}</strong>
                    <p>{alert.action}</p>
                  </div>
                  <span>{alert.metric}</span>
                </div>
              ))}
            </div>
            <button className="primary ghosted">推送至指挥链</button>
          </article>
        </div>
      </section>
    </div>
  )
}

export default App
