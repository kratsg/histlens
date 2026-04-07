import * as d3 from 'd3'
import type { HistDataPayload, AxisFull } from './types/protocol'

// Flatten nested arrays to 1D (for 2D+ histograms, used by heatmap)
function flatten(values: number | number[] | number[][]): number[] {
  if (typeof values === 'number') return [values]
  if (typeof values[0] === 'number') return values as number[]
  return (values as number[][]).flat()
}

// --- 1D bar chart ---

export function render1D(
  container: SVGSVGElement,
  data: HistDataPayload,
  axis: AxisFull & { edges?: number[]; labels?: string[] },
) {
  const values = data.values as number[]
  const margin = { top: 16, right: 16, bottom: 40, left: 56 }
  const width = container.clientWidth || 400
  const height = container.clientHeight || 240
  const w = width - margin.left - margin.right
  const h = height - margin.top - margin.bottom

  d3.select(container).selectAll('*').remove()

  const svg = d3
    .select(container)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)

  let xScale: d3.ScaleBand<string> | d3.ScaleLinear<number, number>
  let xAxis: d3.Axis<string> | d3.Axis<d3.NumberValue>
  let bars: { x: number | string; width: number; value: number }[]

  if ('labels' in axis && axis.labels) {
    // Categorical axis: band scale
    const scale = d3.scaleBand().domain(axis.labels).range([0, w]).padding(0.1)
    xScale = scale
    xAxis = d3.axisBottom(scale)
    bars = axis.labels.map((lbl, i) => ({
      x: lbl,
      width: scale.bandwidth(),
      value: values[i] ?? 0,
    }))
  } else {
    // Continuous axis: linear scale on edges
    const edges = axis.edges!
    const scale = d3.scaleLinear().domain([edges[0], edges[edges.length - 1]]).range([0, w])
    xScale = scale
    xAxis = d3.axisBottom(scale)
    bars = values.map((v, i) => ({
      x: edges[i],
      width: scale(edges[i + 1]) - scale(edges[i]),
      value: v,
    }))
  }

  const maxVal = d3.max(values) ?? 0
  const yScale = d3.scaleLinear().domain([0, maxVal * 1.05 || 1]).range([h, 0])

  // Bars
  if ('labels' in axis && axis.labels) {
    const bScale = xScale as d3.ScaleBand<string>
    svg
      .selectAll('rect')
      .data(bars)
      .join('rect')
      .attr('x', (d) => bScale(d.x as string)!)
      .attr('y', (d) => yScale(d.value))
      .attr('width', (d) => d.width)
      .attr('height', (d) => h - yScale(d.value))
      .attr('fill', 'steelblue')
  } else {
    const lScale = xScale as d3.ScaleLinear<number, number>
    svg
      .selectAll('rect')
      .data(bars)
      .join('rect')
      .attr('x', (d) => lScale(d.x as number))
      .attr('y', (d) => yScale(d.value))
      .attr('width', (d) => d.width)
      .attr('height', (d) => h - yScale(d.value))
      .attr('fill', 'steelblue')
  }

  // Axes
  svg.append('g').attr('transform', `translate(0,${h})`).call(xAxis as d3.Axis<d3.NumberValue>)
  svg.append('g').call(d3.axisLeft(yScale).ticks(5))

  // Axis labels
  const xLabel = axis.label || axis.name
  svg
    .append('text')
    .attr('x', w / 2)
    .attr('y', h + margin.bottom - 4)
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')
    .text(xLabel)

  svg
    .append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -h / 2)
    .attr('y', -margin.left + 14)
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')
    .text('counts')
}

// --- 2D heatmap ---

export function render2D(container: SVGSVGElement, data: HistDataPayload) {
  const values = data.values as number[][]
  const [xAxis, yAxis] = data.axes

  const margin = { top: 16, right: 60, bottom: 48, left: 56 }
  const width = container.clientWidth || 400
  const height = container.clientHeight || 320
  const w = width - margin.left - margin.right
  const h = height - margin.top - margin.bottom

  d3.select(container).selectAll('*').remove()

  const svg = d3
    .select(container)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)

  const nx = values.length
  const ny = values[0]?.length ?? 0

  const xScale = d3.scaleLinear().domain([0, nx]).range([0, w])
  const yScale = d3.scaleLinear().domain([0, ny]).range([h, 0])

  const allVals = flatten(values)
  const colorScale = d3.scaleSequential(d3.interpolateViridis).domain([0, d3.max(allVals) ?? 1])

  // Cells
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      svg
        .append('rect')
        .attr('x', xScale(i))
        .attr('y', yScale(j + 1))
        .attr('width', xScale(1) - xScale(0))
        .attr('height', yScale(0) - yScale(1))
        .attr('fill', colorScale(values[i][j]))
    }
  }

  // X axis labels
  const xEdges = 'edges' in xAxis ? xAxis.edges! : null
  const xTickScale = xEdges
    ? d3.scaleLinear().domain([xEdges[0], xEdges[nx]]).range([0, w])
    : d3.scaleBand().domain((xAxis as { labels: string[] }).labels ?? []).range([0, w])

  svg.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(xTickScale as d3.AxisScale<d3.AxisDomain>).ticks(5))

  const yEdges = 'edges' in yAxis ? yAxis.edges! : null
  const yTickScale = yEdges
    ? d3.scaleLinear().domain([yEdges[0], yEdges[ny]]).range([h, 0])
    : d3.scaleBand().domain((yAxis as { labels: string[] }).labels ?? []).range([h, 0])

  svg.append('g').call(d3.axisLeft(yTickScale as d3.AxisScale<d3.AxisDomain>).ticks(5))

  // Axis labels
  svg
    .append('text')
    .attr('x', w / 2)
    .attr('y', h + margin.bottom - 4)
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')
    .text(xAxis.label || xAxis.name)

  svg
    .append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -h / 2)
    .attr('y', -margin.left + 14)
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')
    .text(yAxis.label || yAxis.name)

  // Color bar
  const cbHeight = h
  const cbWidth = 12
  const cbX = w + 10
  const defs = svg.append('defs')
  const gradId = 'colorbar-gradient'
  const grad = defs
    .append('linearGradient')
    .attr('id', gradId)
    .attr('x1', '0%')
    .attr('x2', '0%')
    .attr('y1', '100%')
    .attr('y2', '0%')

  const nStops = 10
  d3.range(nStops + 1).forEach((i) => {
    const t = i / nStops
    grad
      .append('stop')
      .attr('offset', `${t * 100}%`)
      .attr('stop-color', colorScale(t * (d3.max(allVals) ?? 1)))
  })

  svg
    .append('rect')
    .attr('x', cbX)
    .attr('y', 0)
    .attr('width', cbWidth)
    .attr('height', cbHeight)
    .style('fill', `url(#${gradId})`)

  const cbScale = d3.scaleLinear().domain([0, d3.max(allVals) ?? 1]).range([cbHeight, 0])
  svg
    .append('g')
    .attr('transform', `translate(${cbX + cbWidth},0)`)
    .call(d3.axisRight(cbScale).ticks(4))
}

// Entry point: picks 1D or 2D based on axis count
export function renderHistogram(container: SVGSVGElement, data: HistDataPayload) {
  if (data.axes.length === 1) {
    render1D(container, data, data.axes[0])
  } else {
    render2D(container, data)
  }
}
