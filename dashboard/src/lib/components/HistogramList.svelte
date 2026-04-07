<script lang="ts">
  import { histogramList } from '../stores/histogramList'
  import type { HistListItem } from '../types/protocol'

  export let selectedId: string | null = null

  function select(item: HistListItem) {
    selectedId = item.hist_id
  }

  function axisDesc(item: HistListItem): string {
    return item.axes
      .map((ax) => {
        if ('bins' in ax) return `${ax.name}[${ax.bins}]`
        return `${ax.name}[${ax.categories}]`
      })
      .join(' × ')
  }

  function formatBytes(n: number): string {
    if (n < 1024) return `${n} B`
    if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`
    return `${(n / 1024 ** 2).toFixed(1)} MB`
  }

  function formatTime(ts: number): string {
    return new Date(ts * 1000).toLocaleTimeString()
  }
</script>

<section>
  <h2>Histograms <span class="count">({$histogramList.length})</span></h2>
  {#if $histogramList.length === 0}
    <p class="empty">No histograms yet.</p>
  {:else}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Axes</th>
            <th>Storage</th>
            <th>Memory</th>
            <th>Last Update</th>
          </tr>
        </thead>
        <tbody>
          {#each $histogramList as item (item.hist_id)}
            <tr
              class:selected={item.hist_id === selectedId}
              onclick={() => select(item)}
              role="button"
              tabindex="0"
              onkeydown={(e) => e.key === 'Enter' && select(item)}
            >
              <td class="name">{item.name || item.hist_id.slice(0, 8)}</td>
              <td class="axes">{axisDesc(item)}</td>
              <td>{item.storage_type}</td>
              <td>{formatBytes(item.bytes)}</td>
              <td>{formatTime(item.last_access)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>

<style>
  section {
    padding: 1rem;
  }
  h2 {
    margin: 0 0 0.75rem;
    font-size: 1rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-muted, #888);
  }
  .count {
    font-weight: 400;
  }
  .table-wrap {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }
  th {
    text-align: left;
    padding: 0.4rem 0.75rem;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-muted, #888);
    border-bottom: 1px solid var(--color-border, #333);
  }
  td {
    padding: 0.45rem 0.75rem;
    border-bottom: 1px solid var(--color-border, #2a2a3a);
    white-space: nowrap;
  }
  tr:hover td {
    background: var(--color-hover, #1e1e2e);
    cursor: pointer;
  }
  tr.selected td {
    background: var(--color-selected, #2a2a4e);
  }
  .name {
    font-weight: 600;
  }
  .axes {
    font-family: monospace;
    font-size: 0.8rem;
  }
  .empty {
    color: var(--color-muted, #888);
    font-style: italic;
  }
</style>
