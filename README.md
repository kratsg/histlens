Now included as part of [histserv](https://github.com/pfackeldey/histserv/pull/3).

# histlens

A real-time observability dashboard for [histserv](https://github.com/pfackeldey/histserv) — a distributed histogram-filling gRPC server in the Scikit-HEP ecosystem.

The dashboard is a Vite + Svelte + TypeScript single-page app with D3.js charts, embedded inside the histserv process as a read-only FastAPI observability interface.  It shares the live histogram store in memory, so it never issues gRPC round-trips to read data.

![CI](https://github.com/kratsg/histlens/actions/workflows/ci.yml/badge.svg)

---

## Quickstart

### 1. Install prerequisites

[pixi](https://pixi.sh) manages all tooling (Node.js, bun, pre-commit).

```shell
curl -fsSL https://pixi.sh/install.sh | bash
```

### 2. Install frontend dependencies

```shell
pixi run dashboard-install
```

### 3. Install histserv with the dashboard extra

```shell
cd histserv
pip install -e ".[dashboard,dev]"
```

### 4. Start histserv

```shell
histserv --port 50051 --dashboard-port 8050
```

### 5. Start the Vite dev server

```shell
pixi run dashboard-dev
```

Open [http://localhost:5173](http://localhost:5173).  The dev server proxies `/api` and `/ws` to `http://localhost:8050`.

### 6. Send some fills

```shell
cd histserv && python run.py
```

---

## Repository layout

```
histlens/
├── .github/
│   └── workflows/
│       └── ci.yml          # Frontend CI (test, lint, check, build)
├── dashboard/              # Vite + Svelte + TypeScript SPA
│   └── src/
│       ├── lib/
│       │   ├── components/ # Svelte UI components
│       │   ├── stores/     # Svelte stores (WebSocket, stats, histograms)
│       │   ├── types/      # TypeScript types for the WS protocol
│       │   └── d3-histogram.ts  # D3 rendering (1D bar chart, 2D heatmap)
│       └── __tests__/      # Vitest + @testing-library/svelte
├── histserv/               # Python gRPC histogram server
│   └── src/histserv/
│       └── dashboard/      # Embedded FastAPI observability interface
│           ├── bridge.py          # WebSocket handler + subscription registry
│           └── histogram_json.py  # hist.Hist → plot JSON serialization
├── pixi.toml               # All tooling and tasks
└── README.md
```

---

## Development

### Running the frontend in dev mode

```shell
pixi run dashboard-install   # install node_modules (once, or after bun.lock changes)
pixi run dashboard-dev       # start Vite HMR server on :5173
```

The dev server proxies `/api` and `/ws` to the histserv dashboard port (default `:8050`), so you need histserv running first.

### Running tests

**Frontend (Vitest + @testing-library/svelte):**

```shell
pixi run dashboard-test
```

**Python (histserv dashboard module):**

```shell
cd histserv && ./venv/bin/python -m pytest tests/test_dashboard/ -v
```

### Linting and formatting

```shell
pixi run dashboard-lint      # ESLint
pixi run dashboard-format    # Prettier (writes files)
pixi run dashboard-check     # svelte-check + tsc
```

To run all pre-commit hooks at once:

```shell
pixi run lint                # pre-commit run --all-files
```

### Production build

```shell
pixi run dashboard-build     # outputs to dashboard/dist/
```

The `dashboard/dist/` directory can then be passed to `create_app()` as `static_dir` so histserv serves the built frontend directly (see [Porting guide](#porting-guide-integrating-into-histserv) below).

---

## pixi task reference

| Task | Command | Description |
|------|---------|-------------|
| `dashboard-install` | `bun install` | Install frontend node_modules |
| `dashboard-dev` | `bun run dev` | Start Vite HMR dev server on :5173 |
| `dashboard-build` | `bun run build` | Production bundle → `dashboard/dist/` |
| `dashboard-test` | `bun run test` | Vitest unit tests |
| `dashboard-lint` | `bun run lint` | ESLint |
| `dashboard-format` | `bun run format` | Prettier (writes files) |
| `dashboard-check` | `bun run check` | svelte-check + tsc |
| `lint` | `pre-commit run --all-files` | All pre-commit hooks |

---

## WebSocket protocol

All messages share an envelope:

```json
{ "type": "string", "ts": 1712500000.123, "payload": { ... } }
```

**Client → server**

| `type` | payload | description |
|--------|---------|-------------|
| `subscribe` | `{ "streams": ["stats", "hist_list"] }` | Subscribe to periodic pushes |
| `subscribe_hist` | `{ "hist_id": "…", "rate_limit_hz": 1 }` | Stream a specific histogram |
| `unsubscribe_hist` | `{ "hist_id": "…" }` | Stop streaming a histogram |
| `get_hist` | `{ "hist_id": "…" }` | One-shot fetch |

**Server → client**

| `type` | interval | description |
|--------|----------|-------------|
| `stats` | ~1 s | Server health (uptime, RPC counts by method, CPU, memory) |
| `hist_list` | ~2 s | All histogram summaries |
| `hist_data` | rate-limited | Full histogram payload (axes, values, optional variances) |
| `error` | on demand | `{ "message": "…", "code": "NOT_FOUND" \| "INTERNAL" }` |

---

## CI

GitHub Actions runs four parallel jobs on every push and PR:

| Job | What it checks |
|-----|---------------|
| `Frontend (test)` | Vitest unit tests |
| `Frontend (lint)` | ESLint |
| `Frontend (check)` | svelte-check + tsc |
| `Frontend (build)` | Vite production build |

The workflow uses [prefix-dev/setup-pixi](https://github.com/prefix-dev/setup-pixi) to install the pixi environment (with caching), then runs the corresponding `pixi run dashboard-*` task.

---

## Porting guide: integrating into histserv

histlens is a standalone development repository.  Once the dashboard is stable, it can be folded directly into the histserv package so that `pip install histserv[dashboard]` ships the UI with no separate build step required.

### Step 1 — Copy the frontend source

Copy `dashboard/` into the histserv repo.  The suggested location is alongside the Python dashboard module:

```
histserv/
└── src/histserv/
    ├── dashboard/          # existing Python FastAPI module
    └── dashboard-ui/       # ← paste dashboard/ contents here
        ├── src/
        ├── package.json
        ├── vite.config.ts
        └── ...
```

### Step 2 — Build the frontend

```shell
cd src/histserv/dashboard-ui
bun install
bun run build               # produces dist/
```

Commit `dist/` into the repo so the built assets ship with the Python package.  (The `src/` tree does not need to be included in the wheel — only `dist/`.)

### Step 3 — Include the built assets in the wheel

Add to `pyproject.toml`:

```toml
[tool.hatch.build.targets.wheel]
packages = ["src/histserv"]
include = ["src/histserv/dashboard-ui/dist/**"]
```

### Step 4 — Wire `static_dir` in server.py

Update `_start_dashboard` to locate the bundled assets relative to the installed package:

```python
from pathlib import Path

# Resolved at import time; works both in development (editable install) and
# from a wheel where dist/ is packaged alongside the Python source.
_DASHBOARD_DIST = Path(__file__).parent / "dashboard-ui" / "dist"

async def _start_dashboard(self, port: int) -> None:
    import uvicorn
    from histserv.dashboard import create_app

    static_dir = _DASHBOARD_DIST if _DASHBOARD_DIST.is_dir() else None
    app = create_app(self.histogrammer, static_dir=static_dir)
    config = uvicorn.Config(app=app, host="0.0.0.0", port=port, log_level="warning")
    await uvicorn.Server(config).serve()
```

When `static_dir` is `None` (e.g. in a dev environment without a built dist), the server still starts and serves the API/WebSocket endpoints — the Vite dev server handles the UI separately.

### Step 5 — (Optional) Automate the build in CI

If you want the wheel to always contain a freshly-built frontend, add a hatch build hook (`hatch_build.py` at the repo root):

```python
from hatchling.builders.hooks.plugin.interface import BuildHookInterface
import subprocess, sys

class CustomBuildHook(BuildHookInterface):
    def initialize(self, version, build_data):
        ui = self.root + "/src/histserv/dashboard-ui"
        subprocess.run(["bun", "install"], cwd=ui, check=True)
        subprocess.run(["bun", "run", "build"], cwd=ui, check=True)
```

And register it in `pyproject.toml`:

```toml
[tool.hatch.build.hooks.custom]
path = "hatch_build.py"
```

This runs automatically during `hatch build` so PyPI releases always bundle the latest frontend.
