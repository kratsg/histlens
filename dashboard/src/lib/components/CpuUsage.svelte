<script lang="ts">
  import * as d3 from 'd3'
  import { statsHistory } from '../stores/stats'

  let container: SVGSVGElement

  function cpuDeltas(history: typeof $statsHistory): { t: number; user: number; sys: number }[] {
    const result: { t: number; user: number; sys: number }[] = []
    for (let i = 1; i < history.length; i++) {
      const dt = history[i].observed_at - history[i - 1].observed_at
      if (dt <= 0) continue
      result.push({
        t: history[i].observed_at,
        user: (history[i].cpu_user - history[i - 1].cpu_user) / dt,
        sys: (history[i].cpu_system - history[i - 1].cpu_system) / dt,
      })
    }
    return result
  }

  $: pts = cpuDeltas($statsHistory)
  $: if (container && pts.length > 1) draw(pts)

  function draw(pts: { t: number; user: number; sys: number }[]) {
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

    const maxVal = Math.max(d3.max(pts, (d) => d.user + d.sys) ?? 0, 0.01)
    const yScale = d3.scaleLinear().domain([0, maxVal * 1.1]).range([h, 0])

    const lineUser = d3
      .line<{ t: number; user: number; sys: number }>()
      .x((d) => xScale(d.t))
      .y((d) => yScale(d.user))
      .curve(d3.curveMonotoneX)

    const lineSys = d3
      .line<{ t: number; user: number; sys: number }>()
      .x((d) => xScale(d.t))
      .y((d) => yScale(d.sys))
      .curve(d3.curveMonotoneX)

    svg.append('path').datum(pts).attr('fill', 'none').attr('stroke', '#4e9af1').attr('stroke-width', 1.5).attr('d', lineUser)
    svg.append('path').datum(pts).attr('fill', 'none').attr('stroke', '#e07b54').attr('stroke-width', 1.5).attr('d', lineSys)

    svg.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(xScale).ticks(5).tickFormat((d) => {
      const date = new Date((d as number) * 1000)
      return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
    }))
    svg.append('g').call(d3.axisLeft(yScale).ticks(4))

    // Legend
    svg.append('circle').attr('cx', w - 80).attr('cy', 8).attr('r', 4).attr('fill', '#4e9af1')
    svg.append('text').attr('x', w - 72).attr('y', 12).attr('font-size', '10px').text('user')
    svg.append('circle').attr('cx', w - 40).attr('cy', 8).attr('r', 4).attr('fill', '#e07b54')
    svg.append('text').attr('x', w - 32).attr('y', 12).attr('font-size', '10px').text('sys')

    svg
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -h / 2)
      .attr('y', -margin.left + 12)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .text('CPU (s/s)')
  }
</script>

<section>
  <h3>CPU Usage</h3>
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
