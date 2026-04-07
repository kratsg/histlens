<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { histogramData, subscribeHist, unsubscribeHist } from '../stores/histogramData'
  import { renderHistogram } from '../d3-histogram'
  import type { HistDataPayload } from '../types/protocol'

  export let hist_id: string

  let container: SVGSVGElement
  let lastVersion: number | null = null

  // Subscribe on mount, unsubscribe on destroy
  onMount(() => {
    subscribeHist(hist_id)
  })

  onDestroy(() => {
    unsubscribeHist(hist_id)
  })

  $: data = $histogramData.get(hist_id) ?? null

  // Re-render only when version changes (new data arrived)
  $: if (container && data && data.version !== lastVersion) {
    lastVersion = data.version
    renderHistogram(container, data)
  }

  function dimDesc(data: HistDataPayload): string {
    return `${data.axes.length}D · ${data.axes.map((a) => a.name).join(' × ')}`
  }
</script>

<div class="hist-view">
  {#if data}
    <div class="header">
      <span class="name">{data.name || hist_id.slice(0, 12)}</span>
      {#if data.label}
        <span class="label">{data.label}</span>
      {/if}
      <span class="dim">{dimDesc(data)}</span>
    </div>
    <svg bind:this={container} class="chart"></svg>
  {:else}
    <div class="loading">Loading {hist_id.slice(0, 12)}…</div>
  {/if}
</div>

<style>
  .hist-view {
    background: var(--color-card, #1e1e2e);
    border-radius: 8px;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .header {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .name {
    font-weight: 700;
    font-size: 1rem;
  }
  .label {
    color: var(--color-muted, #888);
    font-size: 0.85rem;
  }
  .dim {
    margin-left: auto;
    font-size: 0.75rem;
    font-family: monospace;
    color: var(--color-muted, #888);
  }
  .chart {
    width: 100%;
    height: 240px;
    display: block;
  }
  .loading {
    color: var(--color-muted, #888);
    font-style: italic;
    padding: 2rem;
    text-align: center;
  }
</style>
