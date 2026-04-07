# histlens

A real-time observability dashboard for [histserv](./histserv/) — a distributed
histogram-filling gRPC server in the Scikit-HEP ecosystem.

The dashboard is a Vite + Svelte + TypeScript single-page app with D3.js for
histogram rendering.  It is embedded inside the histserv process as a read-only
FastAPI observability interface, giving it direct in-memory access to the
histogram store with no gRPC round-trips.

## Repository layout

```
histlens/
├── histserv/          # Python gRPC histogram server (git submodule)
│   └── src/histserv/
│       └── dashboard/ # Embedded FastAPI observability interface
│           ├── __init__.py        # create_app() factory
│           ├── bridge.py          # WebSocket handler + subscription registry
│           └── histogram_json.py  # hist.Hist → plot JSON serialization
└── dashboard/         # Vite + Svelte + TypeScript frontend
    └── src/
        ├── lib/
        │   ├── components/  # Svelte UI components
        │   ├── stores/      # Svelte writable stores (WS + data)
        │   ├── types/       # TypeScript types for the WS protocol
        │   └── d3-histogram.ts  # D3 rendering (1D bar, 2D heatmap)
        └── __tests__/       # Vitest + @testing-library/svelte
```

## Prerequisites

[pixi](https://prefix.dev/docs/pixi) manages all tooling — Python, Node.js,
bun, and pre-commit are installed automatically into the pixi environment.

```shell
curl -fsSL https://pixi.sh/install.sh | bash
```

## Getting started

### 1. Install Python dependencies

```shell
cd histserv
pip install -e ".[dashboard,dev]"
```

### 2. Install frontend dependencies

```shell
pixi run bun install   # from histlens root, runs inside dashboard/
```

Or equivalently:

```shell
cd dashboard && bun install
```

### 3. Start histserv with the dashboard port

```shell
histserv --port 50051 --dashboard-port 8050
```

### 4. Start the Vite dev server

```shell
pixi run dashboard-dev
```

Open [http://localhost:5173](http://localhost:5173).  The dev server proxies
`/api` and `/ws` to `http://localhost:8050` so the frontend talks directly to
the running histserv process.

## pixi tasks

All tasks run from the `histlens/` root:

| task | description |
|------|-------------|
| `pixi run dashboard-dev` | Start Vite HMR dev server on :5173 |
| `pixi run dashboard-build` | Production bundle → `dashboard/dist/` |
| `pixi run dashboard-test` | Vitest unit tests |
| `pixi run dashboard-lint` | ESLint |
| `pixi run dashboard-format` | Prettier (write) |
| `pixi run dashboard-check` | svelte-check + tsc |
| `pixi run lint` | pre-commit on all files |

## Running tests

**Python (histserv dashboard)**

```shell
cd histserv
./venv/bin/python -m pytest tests/test_dashboard/ -v
```

**Frontend**

```shell
pixi run dashboard-test
```

## Production build

Build the Svelte app and serve it from histserv directly:

```shell
pixi run dashboard-build       # outputs to dashboard/dist/
histserv --port 50051 --dashboard-port 8050
```

Then pass the built `dashboard/dist/` as `static_dir` to `create_app()`, or
point histserv at it — the `StaticFiles` mount in `bridge.py` serves it at `/`.

## Pre-commit hooks

```shell
pixi run lint           # runs all hooks on all files
pre-commit install      # install git hooks for automatic checks on commit
```

Hooks: ESLint, Prettier format-check, svelte-check.
