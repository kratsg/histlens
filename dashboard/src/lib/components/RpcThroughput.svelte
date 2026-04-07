<script lang="ts">
  import * as d3 from 'd3'
  import { statsHistory } from '../stores/stats'

  let container: SVGSVGElement

  // Compute per-second deltas between consecutive history points
  function deltas(history: typeof $statsHistory): { t: number; rate: number }[] {
    const result: { t: number; rate: number }[] = []
    for (let i = 1; i < history.length; i++) {
      const dt = history[i].observed_at - history[i - 1].observed_at
      if (dt <= 0) continue
      const dCalls = history[i].rpc_calls_total - history[i - 1].rpc_calls_total
      result.push({ t: history[i].observed_at, rate: dCalls / dt })
    }
    return result
  }

  $: pts = deltas($statsHistory)

  $: if (container && pts.length > 1) draw(pts)

  function draw(pts: { t: number; rate: number }[]) {
    const margin = { top: 8, right: 16, bottom: 32, left: 48 }
    const width = container.clientWidth || 320
    const height = container.clientHeight || 160
    const w = width - margin.left - margin.right
    const h = height - margin.top - margin.bottom

    d3.select(container).selectAll('*').remove()

    const svg = d3
      .select(container)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    const xScale = d3
      .scaleLinear()
      .domain(d3.extent(pts, (d) => d.t) as [number, number])
      .range([0, w])

    const yScale = d3
      .scaleLinear()
      .domain([0, (d3.max(pts, (d) => d.rate) ?? 1) * 1.1])
      .range([h, 0])

    const line = d3
      .line<{ t: number; rate: number }>()
      .x((d) => xScale(d.t))
      .y((d) => yScale(d.rate))
      .curve(d3.curveMonotoneX)

    svg.append('path').datum(pts).attr('fill', 'none').attr('stroke', 'steelblue').attr('stroke-width', 1.5).attr('d', line)

    svg.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(xScale).ticks(5).tickFormat((d) => {
      const date = new Date((d as number) * 1000)
      return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
    }))

    svg.append('g').call(d3.axisLeft(yScale).ticks(4))

    svg
      .append('text')
      .attr('x', w / 2)
      .attr('y', h + margin.bottom - 4)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .text('time')

    svg
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -h / 2)
      .attr('y', -margin.left + 12)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .text('RPCs/s')
  }
</script>

<section>
  <h3>RPC Throughput</h3>
  <svg bind:this={container} style="width:100%;height:160px"></svg>
</section>

<style>
  section {
    padding: 0.5rem 1rem;
  }
  h3 {
    margin: 0 0 0.5rem;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-muted, #888);
  }
</style>
