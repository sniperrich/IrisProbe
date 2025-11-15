#!/usr/bin/env node

/**
 * Nebula Fabric Probe
 * -------------------
 * 轻量级守护脚本，用于在各节点采集系统指标后
 * 以 JSON 批次的方式推送到集中控制面。
 *
 * 默认依赖 Node.js 18+ (本项目使用 24)，无需额外依赖。
 */

import os from 'node:os'
import process from 'node:process'
import { randomUUID } from 'node:crypto'
import { setTimeout as sleep } from 'node:timers/promises'

const endpoint = process.env.PROBE_ENDPOINT ?? 'http://localhost:5050/api/telemetry'
const nodeId = process.env.PROBE_NODE_ID ?? os.hostname()
const region = process.env.PROBE_REGION ?? 'unassigned'
const role = process.env.PROBE_ROLE ?? 'edge-cache'
const batchSize = Number(process.env.PROBE_BATCH_SIZE ?? 10)
const pushInterval = Number(process.env.PROBE_PUSH_INTERVAL_MS ?? 5000)
const maxBuffer = Number(process.env.PROBE_BUFFER_LIMIT ?? 100)

const buffer = []
let isFlushing = false

function collectSnapshot() {
  const [load1m] = os.loadavg()
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMem = totalMem - freeMem

  return {
    id: randomUUID(),
    nodeId,
    region,
    role,
    timestamp: new Date().toISOString(),
    metrics: {
      load1m: Number(load1m.toFixed(2)),
      cpuCount: os.cpus().length,
      memoryPercent: Number(((usedMem / totalMem) * 100).toFixed(2)),
      totalMem,
      freeMem,
      uptime: os.uptime(),
      platform: `${os.platform()}-${os.arch()}`,
    },
  }
}

async function flushBuffer(force = false) {
  if (isFlushing || buffer.length === 0) return
  if (!force && buffer.length < batchSize) return

  isFlushing = true
  const batch = buffer.splice(0, Math.min(buffer.length, batchSize))

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodeId, region, role, batch }),
    })

    if (!res.ok) {
      throw new Error(`probe push failed: ${res.status} ${res.statusText}`)
    }
    console.log(`[probe] pushed ${batch.length} samples -> ${endpoint}`)
  } catch (error) {
    console.error('[probe] push failed, buffering for retry:', error.message)
    buffer.unshift(...batch)
    if (buffer.length > maxBuffer) {
      buffer.splice(maxBuffer)
    }
  } finally {
    isFlushing = false
  }
}

async function main() {
  const sampleOnce = process.argv.includes('--once')

  if (sampleOnce) {
    const payload = collectSnapshot()
    console.log(JSON.stringify(payload, null, 2))
    if (process.argv.includes('--push')) {
      buffer.push(payload)
      await flushBuffer(true)
    }
    return
  }

  console.log(`[probe] starting for ${nodeId} (${region}/${role}), endpoint: ${endpoint}`)

  const sampler = setInterval(() => {
    buffer.push(collectSnapshot())
    if (buffer.length >= batchSize) {
      void flushBuffer()
    }
  }, pushInterval)

  const keepAlive = setInterval(() => {
    void flushBuffer()
  }, Math.max(pushInterval * 2, 15000))

  const shutdown = async () => {
    console.log('[probe] shutting down, flushing buffer...')
    clearInterval(sampler)
    clearInterval(keepAlive)
    await flushBuffer(true)
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  // 避免进程异常退出导致指标丢失
  process.on('uncaughtException', async (err) => {
    console.error('[probe] uncaught exception', err)
    await flushBuffer(true)
    process.exit(1)
  })
}

await main()
