import { useEffect, useMemo, useState } from 'react'
import type { AlertItem, ServerNode, TimelineItem } from '../types/server'

type DebugPanelProps = {
  nodes: ServerNode[]
  fallbackNodes: ServerNode[]
  alerts: AlertItem[]
  timeline: TimelineItem[]
  status: 'idle' | 'connecting' | 'live' | 'offline'
  lastSync: number | null
  error: string | null
  apiBase: string
  wsEndpoint: string
}

const statusText: Record<DebugPanelProps['status'], string> = {
  idle: '待命',
  connecting: '正在连接',
  live: '实时',
  offline: '离线，使用示例数据',
}

function formatTime(timestamp: number | null) {
  if (!timestamp) return '尚无同步'
  return new Date(timestamp).toLocaleString()
}

export default function DebugPanel({
  nodes,
  fallbackNodes,
  alerts,
  timeline,
  status,
  lastSync,
  error,
  apiBase,
  wsEndpoint,
}: DebugPanelProps) {
  const sourceNodes = nodes.length ? nodes : fallbackNodes
  const [selected, setSelected] = useState<ServerNode | null>(sourceNodes[0] ?? null)

  useEffect(() => {
    if (!sourceNodes.length) {
      setSelected(null)
      return
    }
    if (!selected) {
      setSelected(sourceNodes[0])
      return
    }
    const match = sourceNodes.find((node) => node.name === selected.name)
    if (match) {
      setSelected(match)
    } else {
      setSelected(sourceNodes[0])
    }
  }, [sourceNodes, selected?.name])

  const nodeCount = nodes.length

  const rawPayload = useMemo(
    () =>
      JSON.stringify(
        {
          status,
          lastSync,
          nodes,
          alerts,
          timeline,
        },
        null,
        2,
      ),
    [status, lastSync, nodes, alerts, timeline],
  )

  return (
    <section className="debug-panel">
      <article className="glass debug-card">
        <header>
          <div>
            <p>连接状态</p>
            <h2>IrisProbe 调试总览</h2>
          </div>
          <span className={`pill ${status === 'live' ? 'online' : status === 'connecting' ? 'degraded' : 'offline'}`}>
            {statusText[status]}
          </span>
        </header>
        <div className="debug-meta">
          <div>
            <span>REST API</span>
            <strong>{apiBase}</strong>
          </div>
          <div>
            <span>WebSocket</span>
            <strong>{wsEndpoint}</strong>
          </div>
          <div>
            <span>节点数量</span>
            <strong>{nodeCount}</strong>
          </div>
          <div>
            <span>最后同步</span>
            <strong>{formatTime(lastSync)}</strong>
          </div>
        </div>
        {error ? <p className="server-hint">WebSocket 错误：{error}</p> : null}
        {!nodes.length ? (
          <p className="server-hint">
            当前无真实节点推送。请确认远程服务器上的探针容器/进程已启动，并能访问 {apiBase}。示例节点仍会显示在下方，便于验证 UI。
          </p>
        ) : null}
      </article>

      <article className="glass debug-card">
        <header>
          <div>
            <p>节点探针</p>
            <h2>实时节点列表</h2>
          </div>
          <span>{nodes.length ? '实时数据' : '示例数据'}</span>
        </header>
        <div className="debug-grid">
          {sourceNodes.map((node) => (
            <button
              type="button"
              key={node.name}
              className={`debug-node ${selected?.name === node.name ? 'active' : ''}`}
              onClick={() => setSelected(node)}
            >
              <div className="debug-node-head">
                <strong>{node.name}</strong>
                <span className={`pill ${node.status}`}>{node.status === 'online' ? '在线' : '降级'}</span>
              </div>
              <p>{node.region}</p>
              <dl>
                <div>
                  <dt>负载</dt>
                  <dd>{node.load}%</dd>
                </div>
                <div>
                  <dt>延迟</dt>
                  <dd>{node.latency} ms</dd>
                </div>
                <div>
                  <dt>吞吐</dt>
                  <dd>{node.traffic}</dd>
                </div>
              </dl>
            </button>
          ))}
        </div>
        {!sourceNodes.length ? <p className="server-hint">暂无节点可选，等待控制面推送。</p> : null}
      </article>

      <article className="glass debug-card">
        <header>
          <div>
            <p>Raw Payload</p>
            <h2>实时 JSON 数据</h2>
          </div>
          <button
            className="ghost"
            type="button"
            onClick={() => navigator.clipboard?.writeText(rawPayload).catch(() => {})}
          >
            复制
          </button>
        </header>
        <pre className="debug-json">{rawPayload}</pre>
      </article>
    </section>
  )
}
