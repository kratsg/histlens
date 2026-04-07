import { writable } from 'svelte/store'
import type { HistListItem } from '../types/protocol'
import { onMessage } from './websocket'

export const histogramList = writable<HistListItem[]>([])

onMessage('hist_list', (msg) => {
  if (msg.type !== 'hist_list') return
  histogramList.set(msg.payload.items)
})
