import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/svelte'
import { histogramData } from '../lib/stores/histogramData'
import type { HistDataPayload } from '../lib/types/protocol'

// Mock the websocket store so subscribeHist/unsubscribeHist are no-ops in tests
vi.mock('../lib/stores/websocket', () => ({
  wsStatus: { subscribe: vi.fn(() => () => {}) },
  send: vi.fn(),
  onMessage: vi.fn(() => () => {}),
}))

// Import component after mocking
const { default: HistogramView } = await import('../lib/components/HistogramView.svelte')

const mockHist: HistDataPayload = {
  hist_id: 'test123',
  name: 'my_hist',
  label: 'My Histogram',
  axes: [{ name: 'x', label: 'x-axis', type: 'Regular', edges: [0, 1, 2, 3, 4] }],
  values: [1, 2, 3, 4],
  storage_type: 'Double',
  version: 1712500000000,
}

describe('HistogramView', () => {
  beforeEach(() => {
    histogramData.set(new Map())
  })

  it('shows loading state when no data', () => {
    const { getByText } = render(HistogramView, { props: { hist_id: 'test123' } })
    expect(getByText(/loading/i)).toBeInTheDocument()
  })

  it('renders histogram name when data available', () => {
    histogramData.set(new Map([['test123', mockHist]]))
    const { getByText } = render(HistogramView, { props: { hist_id: 'test123' } })
    expect(getByText('my_hist')).toBeInTheDocument()
  })

  it('renders histogram label', () => {
    histogramData.set(new Map([['test123', mockHist]]))
    const { getByText } = render(HistogramView, { props: { hist_id: 'test123' } })
    expect(getByText('My Histogram')).toBeInTheDocument()
  })

  it('renders dimension description', () => {
    histogramData.set(new Map([['test123', mockHist]]))
    const { getByText } = render(HistogramView, { props: { hist_id: 'test123' } })
    // Should show "1D · x"
    expect(getByText(/1D/)).toBeInTheDocument()
  })

  it('renders svg chart element when data available', () => {
    histogramData.set(new Map([['test123', mockHist]]))
    const { container } = render(HistogramView, { props: { hist_id: 'test123' } })
    expect(container.querySelector('svg')).toBeTruthy()
  })
})
