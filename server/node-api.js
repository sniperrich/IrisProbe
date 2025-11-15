#!/usr/bin/env node

import http from 'node:http'
import crypto from 'node:crypto'

const PORT = Number(process.env.NODE_API_PORT ?? 5050)
const HOST = process.env.NODE_API_HOST ?? '0.0.0.0'
const state = {
  nodes: new Map(),
  timeline: [],
  alerts: [],
}
const wsClients = new Set()

const toHours = (seconds) => `${Math.floor(seconds / 3600)}h`

const shapeNode = (sample, meta) => {
  const loadPct = Math.min(99, Math.round((sample.metrics.load1m / Math.max(sample.metrics.cpuCount, 1)) * 100))
  const status = loadPct > 80 || sample.metrics.memoryPercent > 80 ? 'degraded' : 'online'
  const latency = Math.max(10, Math.round((1 + sample.metrics.memoryPercent / 100) * 20))
  return {
    name: meta.nodeId,
    region: meta.region,
    status,
    load: loadPct,
    latency,
    traffic: `${(sample.metrics.memoryPercent / 100 * 2).toFixed(1)} Gbps`,
    role: meta.role,
    uptime: toHours(sample.metrics.uptime),
    capacity: `${sample.metrics.cpuCount} vCPU`,
    maintenance: status === 'degraded' ? '待观察 · 自动开票' : '巡检完毕',
  }
}

const refreshAlerts = () => {
  const alerts = []
  for (const node of state.nodes.values()) {
    if (node.load > 85) {
      alerts.push({
        title: `${node.name} 负载逼近上限`,
        level: 'warning',
        metric: `${node.load}%`,
        action: '建议扩容或调度冷节点接管',
      })
    } else if (node.status === 'degraded') {
      alerts.push({
        title: `${node.name} 处于降级模式`,
        level: 'info',
        metric: node.traffic,
        action: '已触发自动观测',
      })
    }
  }
  state.alerts = alerts.slice(0, 5)
}

const pushTimeline = (meta) => {
  const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  state.timeline.unshift({
    time,
    event: `${meta.nodeId} 数据更新`,
    detail: `${meta.region} · ${meta.role}`,
  })
  state.timeline = state.timeline.slice(0, 6)
}

const snapshot = () => ({
  nodes: Array.from(state.nodes.values()),
  alerts: state.alerts,
  timeline: state.timeline,
})

const respond = (res, status, data) => {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

const getBody = (req) =>
  new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
      if (raw.length > 2e6) {
        reject(new Error('Payload too large'))
        req.destroy()
      }
    })
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {})
      } catch (err) {
        reject(err)
      }
    })
    req.on('error', reject)
  })

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const url = new URL(req.url, `http://${req.headers.host}`)

  if (req.method === 'GET' && url.pathname === '/api/nodes') {
    respond(res, 200, snapshot())
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/telemetry') {
    try {
      const body = await getBody(req)
      if (!Array.isArray(body.batch)) {
        respond(res, 422, { message: 'batch is required' })
        return
      }
      const meta = {
        nodeId: body.nodeId ?? `node-${state.nodes.size + 1}`,
        region: body.region ?? 'unknown',
        role: body.role ?? 'edge',
      }
      for (const sample of body.batch) {
        const nodeShape = shapeNode(sample, {
          nodeId: sample.nodeId ?? meta.nodeId,
          region: sample.region ?? meta.region,
          role: sample.role ?? meta.role,
        })
        state.nodes.set(nodeShape.name, nodeShape)
        pushTimeline(nodeShape)
      }
      refreshAlerts()
      broadcastSnapshot()
      respond(res, 202, { received: body.batch.length })
    } catch (error) {
      respond(res, 400, { message: error.message })
    }
    return
  }

  respond(res, 404, { message: 'Not found' })
})

const WS_PATH = '/api/ws'
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'

const createFrame = (data, opcode = 0x1) => {
  const payload = Buffer.isBuffer(data) ? data : Buffer.from(data)
  const length = payload.length
  let header
  if (length < 126) {
    header = Buffer.from([0x80 | opcode, length])
  } else if (length < 65536) {
    header = Buffer.alloc(4)
    header[0] = 0x80 | opcode
    header[1] = 126
    header.writeUInt16BE(length, 2)
  } else {
    header = Buffer.alloc(10)
    header[0] = 0x80 | opcode
    header[1] = 127
    header.writeBigUInt64BE(BigInt(length), 2)
  }
  return Buffer.concat([header, payload])
}

const sendWs = (socket, message) => {
  if (socket.destroyed) return
  try {
    socket.write(createFrame(message))
  } catch {
    socket.destroy()
    wsClients.delete(socket)
  }
}

const broadcastSnapshot = () => {
  if (!wsClients.size) return
  const payload = JSON.stringify({ type: 'snapshot', payload: snapshot() })
  for (const socket of wsClients) {
    sendWs(socket, payload)
  }
}

const handleUpgrade = (req, socket) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`)
  if (pathname !== WS_PATH) {
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n')
    socket.destroy()
    return
  }
  const key = req.headers['sec-websocket-key']
  if (!key) {
    socket.write('HTTP/1.1 400 Bad Request\r\n\r\n')
    socket.destroy()
    return
  }
  const acceptKey = crypto.createHash('sha1').update(key + WS_GUID).digest('base64')
  const headers = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${acceptKey}`,
    '\r\n',
  ]
  socket.write(headers.join('\r\n'))
  wsClients.add(socket)
  sendWs(socket, JSON.stringify({ type: 'snapshot', payload: snapshot() }))

  socket.on('data', (buffer) => {
    const opcode = buffer[0] & 0x0f
    if (opcode === 0x8) {
      socket.end(createFrame(Buffer.alloc(0), 0x8))
      wsClients.delete(socket)
    } else if (opcode === 0x9) {
      socket.write(createFrame(Buffer.alloc(0), 0xa))
    }
  })

  socket.on('close', () => wsClients.delete(socket))
  socket.on('error', () => wsClients.delete(socket))
}

server.on('upgrade', (req, socket) => {
  handleUpgrade(req, socket)
})

server.listen(PORT, HOST, () => {
  console.log(`[node-api] listening on http://${HOST}:${PORT}`)
  console.log(`[node-api] websocket endpoint ws://${HOST}:${PORT}${WS_PATH}`)
})
