import { useEffect, useRef, useState } from 'react'
import type { AlertItem, ServerNode, TimelineItem } from '../types/server'

type Payload = {
  nodes: ServerNode[]
  alerts: AlertItem[]
  timeline: TimelineItem[]
}

const API_BASE = import.meta.env.VITE_NODE_API?.replace(/\/$/, '')
const WS_URL =
  import.meta.env.VITE_NODE_WS ??
  (API_BASE
    ? API_BASE.replace(/^http/i, (match: string) => (match.toLowerCase() === 'https' ? 'wss' : 'ws')) + '/ws'
    : undefined)
const RECONNECT_DELAY = Number(import.meta.env.VITE_NODE_WS_RETRY_MS ?? 7000)

const fallbackNode = (defaults: ServerNode[]) =>
  defaults[0] ?? {
    name: 'undefined',
    region: 'unknown',
    status: 'online',
    load: 0,
    latency: 0,
    traffic: '0 Gbps',
    role: 'unspecified',
    uptime: '0h',
    capacity: '-',
    maintenance: '-',
  }

const normalizeNodes = (nodes: ServerNode[] | undefined, defaults: ServerNode[]) => {
  if (!nodes) return defaults
  if (nodes.length === 0) return []
  const base = fallbackNode(defaults)
  return nodes.map((node) => ({
    ...base,
    ...node,
    status: (node.status ?? base.status) as ServerNode['status'],
  }))
}

const normalizeList = <T,>(list: T[] | undefined, fallback: T[]) => {
  if (!Array.isArray(list)) return fallback
  return list
}

export function useNodeFeed(defaultPayload: Payload) {
  const [payload, setPayload] = useState<Payload>(defaultPayload)
  const [status, setStatus] = useState<'idle' | 'connecting' | 'live' | 'offline'>('idle')
  const [lastSync, setLastSync] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!WS_URL) {
      setStatus('offline')
      return undefined
    }

    const connect = () => {
      setStatus('connecting')
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        setError(null)
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          if (message?.type !== 'snapshot') return
          const { nodes, alerts, timeline } = message.payload ?? {}
          setPayload({
            nodes: normalizeNodes(nodes, defaultPayload.nodes),
            alerts: normalizeList<AlertItem>(alerts, defaultPayload.alerts),
            timeline: normalizeList<TimelineItem>(timeline, defaultPayload.timeline),
          })
          setStatus('live')
          setLastSync(Date.now())
        } catch (err) {
          setError((err as Error).message)
        }
      }

      const scheduleReconnect = (err?: string) => {
        setStatus('offline')
        setError(err ?? null)
        setPayload(defaultPayload)
        reconnectRef.current = setTimeout(() => {
          connect()
        }, Math.max(RECONNECT_DELAY, 3000))
      }

      ws.onerror = () => {
        scheduleReconnect('WebSocket error')
      }

      ws.onclose = () => {
        scheduleReconnect()
      }
    }

    connect()

    return () => {
      wsRef.current?.close()
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current)
      }
    }
  }, [defaultPayload])

  return {
    ...payload,
    status,
    lastSync,
    error,
  }
}
