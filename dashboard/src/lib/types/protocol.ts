// WebSocket message envelope and discriminated union types

export interface Envelope<T extends string, P> {
  type: T
  ts: number
  payload: P
}

// --- Server → Client ---

export interface StatsPayload {
  histogram_count: number
  histogram_bytes: number
  active_rpcs: number
  version: string
  uptime_seconds: number
  cpu_user: number
  cpu_system: number
  // Per-RPC-method call counts, e.g. { "Init": 2, "Fill": 40, "Snapshot": 1 }
  rpc_calls_total: Record<string, number>
  observed_at: number
}

export interface HistListItem {
  hist_id: string
  name: string
  label: string
  axes: AxisSummary[]
  storage_type: string
  bytes: number
  last_access: number
  token: string | null
}

export type AxisSummary =
  | { name: string; type: 'Regular' | 'Variable' | 'Integer'; bins: number; range: [number, number] }
  | { name: string; type: 'StrCategory' | 'IntCategory' | 'Boolean'; categories: number }

export interface HistListPayload {
  items: HistListItem[]
}

export type AxisFull =
  | { name: string; label: string; type: 'Regular' | 'Variable' | 'Integer'; edges: number[] }
  | { name: string; label: string; type: 'StrCategory' | 'IntCategory' | 'Boolean'; labels: string[] }

export interface HistDataPayload {
  hist_id: string
  name: string
  label: string
  axes: AxisFull[]
  // Flat or nested array of bin values (no flow bins)
  values: number | number[] | number[][]
  variances?: number | number[] | number[][]
  storage_type: string
  version: number
}

export interface ErrorPayload {
  message: string
  code: string
}

export type ServerMessage =
  | Envelope<'stats', StatsPayload>
  | Envelope<'hist_list', HistListPayload>
  | Envelope<'hist_data', HistDataPayload>
  | Envelope<'error', ErrorPayload>

// --- Client → Server ---

export interface SubscribeMsg {
  type: 'subscribe'
  payload: { streams: ('stats' | 'hist_list')[] }
}

export interface UnsubscribeMsg {
  type: 'unsubscribe'
  payload: { streams: ('stats' | 'hist_list')[] }
}

export interface SubscribeHistMsg {
  type: 'subscribe_hist'
  payload: { hist_id: string; rate_limit_hz?: number }
}

export interface UnsubscribeHistMsg {
  type: 'unsubscribe_hist'
  payload: { hist_id: string }
}

export interface GetHistMsg {
  type: 'get_hist'
  payload: { hist_id: string }
}

export type ClientMessage =
  | SubscribeMsg
  | UnsubscribeMsg
  | SubscribeHistMsg
  | UnsubscribeHistMsg
  | GetHistMsg
