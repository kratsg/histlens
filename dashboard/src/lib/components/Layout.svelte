<script lang="ts">
  import ServerOverview from './ServerOverview.svelte'
  import RpcThroughput from './RpcThroughput.svelte'
  import CpuUsage from './CpuUsage.svelte'
  import HistogramList from './HistogramList.svelte'
  import HistogramView from './HistogramView.svelte'
  import { wsStatus } from '../stores/websocket'

  let selectedId: string | null = null
</script>

<div class="layout">
  <header>
    <span class="title">histserv dashboard</span>
    <span class="status status--{$wsStatus}">{$wsStatus}</span>
  </header>

  <aside class="sidebar">
    <ServerOverview />
    <hr />
    <RpcThroughput />
    <CpuUsage />
  </aside>

  <main class="content">
    <HistogramList bind:selectedId />
    {#if selectedId}
      {#key selectedId}
        <div class="detail">
          <HistogramView hist_id={selectedId} />
        </div>
      {/key}
    {:else}
      <p class="hint">Click a histogram above to inspect it.</p>
    {/if}
  </main>
</div>

<style>
  :global(*, *::before, *::after) {
    box-sizing: border-box;
  }
  :global(body) {
    margin: 0;
    background: var(--color-bg, #13131f);
    color: var(--color-fg, #e0e0f0);
    font-family: system-ui, sans-serif;
    font-size: 14px;
    --color-bg: #13131f;
    --color-fg: #e0e0f0;
    --color-card: #1e1e2e;
    --color-muted: #888;
    --color-border: #333;
    --color-hover: #1e1e2e;
    --color-selected: #2a2a4e;
  }
  .layout {
    display: grid;
    grid-template-rows: 40px 1fr;
    grid-template-columns: 280px 1fr;
    grid-template-areas:
      'header header'
      'sidebar content';
    height: 100dvh;
  }
  header {
    grid-area: header;
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0 1rem;
    background: var(--color-card, #1e1e2e);
    border-bottom: 1px solid var(--color-border, #333);
  }
  .title {
    font-weight: 700;
    letter-spacing: 0.03em;
  }
  .status {
    font-size: 0.7rem;
    padding: 2px 6px;
    border-radius: 4px;
    text-transform: uppercase;
  }
  .status--open {
    background: #1a3a1a;
    color: #6fdf6f;
  }
  .status--connecting {
    background: #3a3a1a;
    color: #dfdf6f;
  }
  .status--closed {
    background: #3a1a1a;
    color: #df6f6f;
  }
  .sidebar {
    grid-area: sidebar;
    overflow-y: auto;
    border-right: 1px solid var(--color-border, #333);
  }
  hr {
    border: none;
    border-top: 1px solid var(--color-border, #333);
    margin: 0;
  }
  .content {
    grid-area: content;
    overflow-y: auto;
    padding: 0;
  }
  .detail {
    padding: 1rem;
  }
  .hint {
    padding: 1rem;
    color: var(--color-muted, #888);
    font-style: italic;
  }
</style>
