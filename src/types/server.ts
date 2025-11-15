export type ServerNodeStatus = 'online' | 'degraded' | 'offline'

export type ServerNode = {
  name: string
  region: string
  status: ServerNodeStatus
  load: number
  latency: number
  traffic: string
  role: string
  uptime: string
  capacity: string
  maintenance: string
}

export type AlertItem = {
  title: string
  level: 'warning' | 'info'
  metric: string
  action: string
}

export type TimelineItem = {
  time: string
  event: string
  detail: string
}
